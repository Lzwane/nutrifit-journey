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
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/#+\s?/g, "")
    .replace(/[`~]/g, "")
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
      text: "Hello! I am NutriGuide AI, your personal nutrition and fitness coach. Ask me anything about your workout routines, meal plans, macro splits, or calorie targets!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef<boolean>(false);
  const voiceStateRef = useRef<string>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  const speechAccumulatorRef = useRef<string>("");
  const silenceTimerRef = useRef<any>(null);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakText = (text: string, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
      if (isVoiceActiveRef.current) {
        setVoiceState("listening");
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      } else {
        setVoiceState("idle");
      }
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  const interruptCoach = () => {
    if (window.speechSynthesis?.speaking) {
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

  useEffect(() => {
    if (!hasAccess) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        if (isVoiceActiveRef.current && voiceStateRef.current !== "speaking" && voiceStateRef.current !== "thinking") {
          setVoiceState("listening");
        }
      };

      recognition.onresult = (event: any) => {
        if (!isVoiceActiveRef.current) return;
        if (voiceStateRef.current === "speaking" || voiceStateRef.current === "thinking") {
          return;
        }

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

            if (finalPrompt && isVoiceActiveRef.current) {
              handleHandsFreeQuery(finalPrompt);
            }
          }, 1500);
        }
      };

      recognition.onend = () => {
        if (isVoiceActiveRef.current && voiceStateRef.current !== "speaking" && voiceStateRef.current !== "thinking") {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech" && isVoiceActiveRef.current) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (err) {}
          }, 600);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      window.speechSynthesis?.cancel();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [hasAccess]);

  const callClaudeDirect = async (prompt: string, signal?: AbortSignal): Promise<string> => {
    const apiKey = import.meta.env.ANTHROPIC_API_KEY;
    const workspaceId = import.meta.env.ANTHROPIC_WORKSPACE_ID;

    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY in your .env file.");
    }

    const headers: Record<string, string> = {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    };

    if (workspaceId) {
      headers["anthropic-workspace-id"] = workspaceId;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 450,
        system:
          "You are NutriGuide AI, an encouraging and highly knowledgeable personal nutrition & fitness coach. " +
          "Provide detailed, actionable, and encouraging explanations. " +
          "When asked about meals, break down estimated macros (protein, carbs, fats) and calorie counts clearly. " +
          "When asked about workouts, explain proper form, sets, reps, and recovery techniques. " +
          "STRICT RULE: Do NOT use markdown formatting, bold markers (**), bullet asterisks (*), or headers (#). " +
          "Write clean, natural plain text with smooth sentence flow suitable for direct voice reading.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic Error Response:", data);
      throw new Error(data.error?.message || "Anthropic API rejected request.");
    }

    return data.content?.[0]?.text || "I could not generate a response. Please try again.";
  };

  const handleHandsFreeQuery = async (userPrompt: string) => {
    interruptCoach();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setVoiceState("thinking");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await callClaudeDirect(userPrompt, controller.signal);
      const cleanReply = cleanTextForSpeech(reply);

      const coachMsg: Message = { id: (Date.now() + 1).toString(), sender: "coach", text: cleanReply };
      setMessages((prev) => [...prev, coachMsg]);

      setVoiceState("speaking");
      speakText(cleanReply);
    } catch (err: any) {
      if (err.name === "AbortError") return;

      console.error("Voice query failed:", err);
      setVoiceState("listening");
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "coach", text: `Error: ${err.message || "Failed to reach Claude API."}` },
      ]);
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const handleOrbClick = () => {
    if (!recognitionRef.current) return;

    speechAccumulatorRef.current = "";
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (!isVoiceActive) {
      isVoiceActiveRef.current = true;
      setIsVoiceActive(true);
      setVoiceState("listening");
      try {
        recognitionRef.current.start();
      } catch (e) {}
      return;
    }

    interruptCoach();
    setVoiceState("listening");
    try {
      recognitionRef.current.stop();
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }, 150);
    } catch (e) {}
  };

  const toggleLiveVoiceMode = () => {
    if (!recognitionRef.current) {
      alert("Voice input is supported in Chrome, Edge, and Safari.");
      return;
    }

    speechAccumulatorRef.current = "";
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (isVoiceActive) {
      isVoiceActiveRef.current = false;
      setIsVoiceActive(false);
      setVoiceState("idle");
      interruptCoach();
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      isVoiceActiveRef.current = true;
      setIsVoiceActive(true);
      setVoiceState("listening");
      interruptCoach();
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    interruptCoach();
    const userPrompt = inputText.trim();
    setInputText("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await callClaudeDirect(userPrompt);
      const cleanReply = cleanTextForSpeech(reply);

      const coachMsg: Message = { id: (Date.now() + 1).toString(), sender: "coach", text: cleanReply };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (err: any) {
      console.error("Text chat failed:", err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "coach", text: `Error: ${err.message || "Failed to reach Claude API."}` },
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
              Your 60-day free trial has concluded and your account is on the Free Tier. Workouts and manual tracking remain free forever. Unlock unlimited real-time AI voice and nutrition guidance for R49.00/month.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-left text-xs space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Unlimited live conversational AI voice coach</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Verified macro and meal calorie breakdown</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Cancel or pause subscription anytime</span>
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
      {/* TOP HEADER & NAVIGATION TOGGLE */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border/60 shrink-0">
        <h1 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight md:hidden">
          NutriGuide AI
        </h1>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shrink-0">
            <Bot className="h-5 w-5 shrink-0" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-foreground leading-none">NutriGuide AI</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Tap Circle to Interrupt &amp; Speak</p>
          </div>
        </div>

        {/* TOGGLE WITH HIGH-CONTRAST EMERALD ACTIVE PILL */}
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
              if (isVoiceActive) toggleLiveVoiceMode();
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

      {/* VIEW 1: LIVE VOICE MODE */}
      {activeTab === "voice" ? (
        <div className="flex-1 flex flex-col items-center justify-between py-6 px-4 text-center relative overflow-hidden w-full my-auto">
          {/* AMBIENT GLOW */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 sm:h-96 sm:w-96 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000 ${
              voiceState === "listening"
                ? "opacity-35 bg-emerald-500/40"
                : voiceState === "speaking"
                ? "opacity-40 bg-orange-500/40"
                : "opacity-10 bg-emerald-500/20"
            }`}
          />

          {/* MAIN INTERACTIVE ORB */}
          <div className="relative my-auto flex flex-col items-center justify-center z-10 py-2">
            <button
              type="button"
              onClick={handleOrbClick}
              aria-label={voiceState === "speaking" ? "Interrupt AI and speak" : "Start speaking"}
              className={`relative flex h-44 w-44 sm:h-56 sm:w-56 items-center justify-center rounded-full transition-all duration-300 shadow-2xl cursor-pointer active:scale-95 shrink-0 border border-white/10 ${
                voiceState === "listening"
                  ? "bg-emerald-500 ring-8 ring-emerald-500/20 shadow-emerald-500/40 scale-105"
                  : voiceState === "thinking"
                  ? "bg-amber-500 ring-8 ring-amber-500/20 shadow-amber-500/40"
                  : voiceState === "speaking"
                  ? "bg-orange-500 ring-8 ring-orange-500/20 shadow-orange-500/40 scale-105"
                  : "bg-muted text-muted-foreground border-border shadow-none"
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

            {/* STATUS INDICATOR */}
            <div className="mt-5 sm:mt-7 font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center min-h-6">
              {voiceState === "listening" && (
                <span className="text-emerald-500 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  Listening... Speak freely
                </span>
              )}
              {voiceState === "thinking" && (
                <span className="text-amber-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Analyzing response...
                </span>
              )}
              {voiceState === "speaking" && (
                <span className="text-orange-500 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 animate-pulse shrink-0" /> Speaking (Tap circle to interrupt)
                </span>
              )}
              {voiceState === "idle" && (
                <span className="text-muted-foreground text-xs font-semibold">
                  Tap circle to start voice session
                </span>
              )}
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="relative z-10 w-full max-w-xs pt-3">
            <button
              type="button"
              onClick={toggleLiveVoiceMode}
              className={`w-full cursor-pointer flex items-center justify-center gap-2 rounded-full py-3.5 px-6 text-xs sm:text-sm font-extrabold text-white shadow-lg transition active:scale-95 shrink-0 ${
                isVoiceActive
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
              }`}
            >
              {isVoiceActive ? (
                <>
                  <Square className="h-4 w-4 fill-current shrink-0" /> End Voice Session
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 shrink-0" /> Start Live Voice Session
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* VIEW 2: TEXT CHAT FEED */
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
                      onClick={() => speakText(m.text)}
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
                <span>NutriGuide AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendText} className="flex items-center gap-2 pt-2 border-t border-border/40 shrink-0">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about calories, macros, or workouts..."
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

export default AICoachPage;