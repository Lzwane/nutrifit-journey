import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";
import {
  Send,
  Volume2,
  Sparkles,
  Bot,
  User,
  Loader2,
  Square,
  MessageSquare,
  Radio,
  Mic,
  Lock,
  Check,
  ArrowRight,
  AlertCircle,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/app/coach")({
  head: () => ({
    meta: [{ title: "NutriGuide AI — NutriFit" }],
  }),
  component: AICoachPage,
});

interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[\d+\]/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/#+\s?/g, "")
    .replace(/[`~]/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

function AICoachPage() {
  const { user } = useAuth();
  const sub = useSubscription();

  const isPremium = sub.isPremium || (sub as any).tier === "premium";
  const isTrialActive = sub.isTrialActive ?? (sub.daysLeft > 0 && !isPremium);
  const hasAccess = isPremium || isTrialActive;
  const subscriptionLoading = sub.loading;

  const [activeTab, setActiveTab] = useState<"voice" | "chat">("voice");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "coach",
      text: "Hey! I'm NutriGuide AI, your real-time running and fitness coach. Tap the circle button whenever you want to ask me anything!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("NutriGuide AI is thinking...");

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [speechSupported, setSpeechSupported] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef<boolean>(false);
  const voiceStateRef = useRef<string>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  const speechAccumulatorRef = useRef<string>("");
  const silenceTimerRef = useRef<any>(null);
  const mobileAudioUnlockedRef = useRef<boolean>(false);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Unlock iOS Safari / Mobile PWA AudioContext on user touch
  const unlockMobileAudio = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.resume();
      if (!mobileAudioUnlockedRef.current) {
        const dummy = new SpeechSynthesisUtterance(" ");
        dummy.volume = 0.01;
        dummy.rate = 10;
        window.speechSynthesis.speak(dummy);
        mobileAudioUnlockedRef.current = true;
      }
    } catch (_) {}
  };

  const speakText = (text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Arthur") ||
          v.name.includes("Karen") ||
          v.name.includes("Siri"))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
      // After speaking finishes, DO NOT auto-listen. Wait for user tap.
      setVoiceState("idle");
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn("Speech playback notice:", e);
      setVoiceState("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  const interruptCoach = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setLoading(false);
  };

  const terminateEntireSession = () => {
    isVoiceActiveRef.current = false;
    setIsVoiceActive(false);
    setVoiceState("idle");
    interruptCoach();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (_) {}
    }
  };

  useEffect(() => {
    return () => {
      terminateEntireSession();
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!hasAccess) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-ZA";

    recognition.onstart = () => {
      if (isVoiceActiveRef.current) {
        setVoiceState("listening");
      }
    };

    recognition.onresult = (event: any) => {
      // Ignore microphone input while speaking or thinking — NO accidental interruptions
      if (!isVoiceActiveRef.current || voiceStateRef.current !== "listening") return;

      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          speechAccumulatorRef.current += " " + event.results[i][0].transcript;
        } else {
          interimText += event.results[i][0].transcript;
        }
      }

      const currentCaptured = (speechAccumulatorRef.current + " " + interimText).trim();

      if (currentCaptured) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(() => {
          const finalPrompt = speechAccumulatorRef.current.trim() || currentCaptured;
          speechAccumulatorRef.current = "";
          silenceTimerRef.current = null;

          if (finalPrompt.trim().length >= 3 && isVoiceActiveRef.current) {
            try {
              recognition.stop();
            } catch (_) {}
            handleHandsFreeQuery(finalPrompt);
          }
        }, 1400);
      }
    };

    recognition.onend = () => {
      // Only keep listening if explicitly in the listening state
      if (isVoiceActiveRef.current && voiceStateRef.current === "listening") {
        try {
          recognition.start();
        } catch (_) {}
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        terminateEntireSession();
        alert("Microphone permission was denied. Please allow microphone access in your browser or device settings.");
        return;
      }

      if (e.error !== "no-speech" && isVoiceActiveRef.current && voiceStateRef.current === "listening") {
        setTimeout(() => {
          try {
            if (isVoiceActiveRef.current && voiceStateRef.current === "listening") {
              recognition.start();
            }
          } catch (_) {}
        }, 400);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_) {}
    };
  }, [hasAccess]);

  // Perplexity Agent API Integration (/v1/responses)
  const callAIService = async (prompt: string, callerSignal?: AbortSignal): Promise<string> => {
    const apiKey =
      (import.meta as any).env?.VITE_PERPLEXITY_API_KEY ||
      (import.meta as any).env?.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error("Missing VITE_PERPLEXITY_API_KEY in your .env or Render environment.");
    }

    const todayDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const instructions =
      `You are NutriGuide AI, an encouraging and highly knowledgeable personal nutrition, running, and athletic coach on the NutriFit app. ` +
      `Today's date is ${todayDate}. ` +
      `Maintain a friendly, authentic, and direct conversational tone like an expert personal trainer. ` +
      `You have real-time live internet search to research upcoming marathons, race dates, locations, Olympic results, current weather, and nutritional macros. ` +
      `For everyday training or meal questions, give clear, practical instructions. ` +
      `CRITICAL: Do NOT output markdown symbols, asterisks (*), hashtags (#), bullet dashes, or citation brackets [1]. Deliver clean, natural spoken prose with smooth sentences that read aloud effortlessly.`;

    const res = await fetch("https://api.perplexity.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      signal: callerSignal,
      body: JSON.stringify({
        preset: "fast",
        instructions,
        input: prompt,
        max_output_tokens: 350,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Perplexity Agent API error (${res.status})`);
    }

    const data = await res.json();

    let reply = data.output_text;
    if (!reply && Array.isArray(data.output)) {
      reply = data.output
        .flatMap((item: any) => item.content || [])
        .filter((c: any) => c.type === "output_text" || c.text)
        .map((c: any) => c.text || "")
        .join(" ");
    }

    if (!reply) {
      throw new Error("No response received from NutriGuide AI.");
    }

    return cleanTextForSpeech(reply);
  };

  const handleHandsFreeQuery = async (userPrompt: string) => {
    interruptCoach();
    unlockMobileAudio();

    setLoadingText("NutriGuide AI is thinking...");
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setVoiceState("thinking");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await callAIService(userPrompt, controller.signal);

      const coachMsg: Message = { id: (Date.now() + 1).toString(), sender: "coach", text: reply };
      setMessages((prev) => [...prev, coachMsg]);

      // Speak back out loud
      setVoiceState("speaking");
      speakText(reply);
    } catch (err: any) {
      if (err.name === "AbortError") return;

      console.error("Voice query error:", err);
      setVoiceState("idle");
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "coach", text: `Sorry, I ran into an issue: ${err.message || "Failed to connect."}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Button Tap Controls: explicitly start listening or tap to interrupt
  const handleOrbClick = () => {
    unlockMobileAudio();

    if (!recognitionRef.current) {
      alert("Microphone recognition is not supported in this browser. Chrome or Safari is recommended.");
      return;
    }

    speechAccumulatorRef.current = "";
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // 1. If currently speaking, tapping the circle interrupts the AI and readies for user input
    if (voiceState === "speaking") {
      interruptCoach();
      isVoiceActiveRef.current = true;
      setIsVoiceActive(true);
      setVoiceState("listening");
      try {
        recognitionRef.current.start();
      } catch (_) {}
      return;
    }

    // 2. If already listening, tap to stop listening
    if (voiceState === "listening") {
      setVoiceState("idle");
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      return;
    }

    // 3. If idle, tap to START listening
    isVoiceActiveRef.current = true;
    setIsVoiceActive(true);
    interruptCoach();
    setVoiceState("listening");
    try {
      recognitionRef.current.start();
    } catch (_) {}
  };

  const toggleLiveVoiceMode = () => {
    unlockMobileAudio();

    if (!recognitionRef.current) {
      alert("Voice input is supported in Chrome, Edge, and Safari.");
      return;
    }

    if (isVoiceActive) {
      terminateEntireSession();
    } else {
      isVoiceActiveRef.current = true;
      setIsVoiceActive(true);
      handleOrbClick();
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    unlockMobileAudio();
    interruptCoach();

    const userPrompt = inputText.trim();
    setLoadingText("NutriGuide AI is thinking...");
    setInputText("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await callAIService(userPrompt);

      const coachMsg: Message = { id: (Date.now() + 1).toString(), sender: "coach", text: reply };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (err: any) {
      console.error("Text chat failed:", err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "coach", text: `Error: ${err.message || "Failed to reach AI Coach."}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground font-sans">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500 shrink-0 mr-2" /> Checking access...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 font-sans min-h-[70vh]">
        <div className="max-w-md w-full text-center space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
            <Lock className="h-8 w-8 shrink-0" />
          </div>

          <div className="space-y-2">
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 inline-block">
              Premium Feature
            </span>
            <h2 className="text-2xl font-extrabold text-foreground">
              NutriGuide AI Voice Coach
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unlock unlimited live conversational AI coaching, race search, Olympic standings, and custom macro analysis for R49.00/month.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-left text-xs space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Ultra-fast real-time voice conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Live web search for marathons, weather &amp; sports</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Detailed macro splits &amp; workout coaching</span>
            </div>
          </div>

          <Link
            to="/app/profile"
            search={{ subscribe: "true" }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 py-3.5 text-xs font-bold text-white shadow-md transition uppercase tracking-wider cursor-pointer"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Unlock Premium (R49.00 / mo)</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full min-h-[75vh] sm:min-h-[82vh] justify-between relative overflow-hidden font-sans">
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border/60 shrink-0">
        <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight md:hidden">
          NutriGuide AI
        </h1>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shrink-0">
            <Bot className="h-5 w-5 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-foreground leading-none">NutriGuide AI</h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-500">
                <Globe className="h-2.5 w-2.5" /> Agent API Grounded
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Tap Circle to Speak</p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-muted/60 p-1 border border-border shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={`cursor-pointer flex items-center gap-1 sm:gap-1.5 rounded-xl px-3 py-1.5 text-[11px] sm:text-xs font-extrabold transition-all duration-200 ${
              activeTab === "voice"
                ? "bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="hidden sm:inline">Live </span>Voice
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              if (isVoiceActive) terminateEntireSession();
            }}
            className={`cursor-pointer flex items-center gap-1 sm:gap-1.5 rounded-xl px-3 py-1.5 text-[11px] sm:text-xs font-extrabold transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-600/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="hidden sm:inline">Text </span>Chat
            </span>
          </button>
        </div>
      </div>

      {!speechSupported && activeTab === "voice" && (
        <div className="my-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Speech Recognition is limited on this browser. Chrome or Safari is recommended.</span>
        </div>
      )}

      {activeTab === "voice" ? (
        <div className="flex-1 flex flex-col items-center justify-between py-6 px-4 text-center relative overflow-hidden w-full my-auto">
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 sm:h-96 sm:w-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000 ${
              voiceState === "listening"
                ? "opacity-35 bg-emerald-500/40"
                : voiceState === "speaking"
                ? "opacity-40 bg-orange-500/40"
                : "opacity-10 bg-emerald-500/20"
            }`}
          />

          <div className="relative my-auto flex flex-col items-center justify-center z-10 py-2">
            <button
              type="button"
              onClick={handleOrbClick}
              aria-label={
                voiceState === "speaking"
                  ? "Tap to interrupt"
                  : voiceState === "listening"
                  ? "Listening... Tap to cancel"
                  : "Tap circle to speak"
              }
              className={`relative flex h-44 w-44 sm:h-56 sm:w-56 items-center justify-center rounded-full transition-all duration-300 shadow-2xl cursor-pointer active:scale-95 shrink-0 border border-white/10 ${
                voiceState === "listening"
                  ? "bg-emerald-500 ring-8 ring-emerald-500/20 shadow-emerald-500/40 scale-105"
                  : voiceState === "thinking"
                  ? "bg-amber-500 ring-8 ring-amber-500/20 shadow-amber-500/40"
                  : voiceState === "speaking"
                  ? "bg-orange-500 ring-8 ring-orange-500/20 shadow-orange-500/40 scale-105"
                  : "bg-muted text-muted-foreground border-border shadow-none hover:border-emerald-500/50"
              }`}
            >
              <div className="flex items-center gap-1.5 pointer-events-none">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <span
                    key={bar}
                    className={`w-2 rounded-full bg-white transition-all duration-200 ${
                      voiceState === "listening"
                        ? "h-10 sm:h-16 animate-pulse"
                        : voiceState === "speaking"
                        ? "h-12 sm:h-20 animate-bounce"
                        : voiceState === "thinking"
                        ? "h-4 animate-ping"
                        : "h-3 opacity-40 bg-foreground"
                    }`}
                    style={{ animationDelay: `${bar * 120}ms` }}
                  />
                ))}
              </div>
            </button>

            <div className="mt-5 sm:mt-7 font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center min-h-6">
              {voiceState === "listening" && (
                <span className="text-emerald-500 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  Listening... Tap circle to stop
                </span>
              )}
              {voiceState === "thinking" && (
                <span className="text-amber-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" /> {loadingText}
                </span>
              )}
              {voiceState === "speaking" && (
                <span className="text-orange-500 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 animate-pulse shrink-0" /> Speaking (Tap circle to interrupt)
                </span>
              )}
              {voiceState === "idle" && (
                <span className="text-muted-foreground text-xs font-semibold">
                  Tap circle to speak
                </span>
              )}
            </div>
          </div>

          <div className="relative z-10 w-full max-w-xs pt-3">
            <button
              type="button"
              onClick={toggleLiveVoiceMode}
              className={`w-full cursor-pointer flex items-center justify-center gap-2 rounded-full py-3.5 px-6 text-xs sm:text-sm font-extrabold text-white shadow-lg transition active:scale-95 shrink-0 ${
                voiceState === "listening"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
              }`}
            >
              {voiceState === "listening" ? (
                <>
                  <Square className="h-4 w-4 fill-current shrink-0" /> Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 shrink-0" /> Tap to Speak
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between w-full mx-auto pt-3 space-y-3 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${
                  m.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    m.sender === "user"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}
                >
                  {m.sender === "user" ? <User className="h-4 w-4 shrink-0" /> : <Sparkles className="h-4 w-4 shrink-0" />}
                </div>

                <div
                  className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    m.sender === "user"
                      ? "bg-emerald-500 text-white font-medium"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.sender === "coach" && (
                    <button
                      type="button"
                      onClick={() => {
                        unlockMobileAudio();
                        speakText(m.text);
                      }}
                      className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
                    >
                      <Volume2 className="h-3 w-3 shrink-0" /> Replay Audio
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
                <span>{loadingText}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendText} className="flex items-center gap-2 pt-2 border-t border-border/40 shrink-0">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about calories, training, marathons, or workouts..."
              className="flex-1 rounded-2xl border border-input bg-card px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="cursor-pointer flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xs transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4 shrink-0" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}