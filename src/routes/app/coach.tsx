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
  ShieldCheck,
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

function speakText(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google"))
  );
  if (naturalVoice) utterance.voice = naturalVoice;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
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
      text: "Hello! I am NutriGuide AI, your personal nutrition & fitness assistant. Ask me anything about your meals, workouts, or calories!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  // Live Hands-Free Voice States (ChatGPT/Gemini Style)
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef<boolean>(false);
  const voiceStateRef = useRef<string>("idle");
  const transcriptBufferRef = useRef<string>("");

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Web Speech Recognition Setup
  useEffect(() => {
    if (!hasAccess) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        if (isVoiceActiveRef.current) {
          setVoiceState("listening");
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          transcriptBufferRef.current = transcript;
        }
      };

      recognition.onend = () => {
        if (!isVoiceActiveRef.current) {
          setVoiceState("idle");
          return;
        }

        const capturedPrompt = transcriptBufferRef.current.trim();
        transcriptBufferRef.current = "";

        if (capturedPrompt) {
          handleHandsFreeQuery(capturedPrompt);
        } else if (
          isVoiceActiveRef.current &&
          voiceStateRef.current !== "speaking" &&
          voiceStateRef.current !== "thinking"
        ) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.onerror = () => {
        if (isVoiceActiveRef.current && voiceStateRef.current === "listening") {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {}
          }, 800);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [hasAccess]);

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API Key missing in .env (VITE_GEMINI_API_KEY)");
    }

    const systemInstruction =
      "You are NutriGuide AI, an encouraging personal nutrition & fitness coach. " +
      "Provide practical, concise answers (1 to 2 short sentences max). " +
      "STRICT RULE: Do NOT use markdown formatting, bold text (**), asterisks (*), or bullet points. " +
      "Write purely plain text suitable for direct speech.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstruction}\n\nUser Question: ${prompt}` }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Failed to fetch response from Gemini API");
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't process that question. Try asking again!"
    );
  };

  const handleHandsFreeQuery = async (userPrompt: string) => {
    setVoiceState("thinking");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await callGeminiAPI(userPrompt);
      const cleanReply = cleanTextForSpeech(reply);

      const coachMsg: Message = { id: (Date.now() + 1).toString(), sender: "coach", text: cleanReply };
      setMessages((prev) => [...prev, coachMsg]);

      setVoiceState("speaking");
      speakText(cleanReply, () => {
        if (isVoiceActiveRef.current) {
          setVoiceState("listening");
          try {
            recognitionRef.current?.start();
          } catch (e) {}
        } else {
          setVoiceState("idle");
        }
      });
    } catch (err) {
      setVoiceState("idle");
    } finally {
      setLoading(false);
    }
  };

  const toggleLiveVoiceMode = () => {
    if (!recognitionRef.current) {
      alert("Voice features are supported in Chrome, Edge, or Safari.");
      return;
    }

    if (isVoiceActive) {
      isVoiceActiveRef.current = false;
      setIsVoiceActive(false);
      setVoiceState("idle");
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else {
      isVoiceActiveRef.current = true;
      setIsVoiceActive(true);
      setVoiceState("listening");
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userPrompt = inputText.trim();
    setInputText("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: userPrompt };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const reply = await callGeminiAPI(userPrompt);
      const cleanReply = cleanTextForSpeech(reply);

      const coachMsg: Message = { id: (Date.now() + 1).toString(), sender: "coach", text: cleanReply };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "coach", text: "Sorry, I couldn't process that right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 1. Loading State while checking subscription
  if (subscriptionLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground font-sans">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" /> Checking access...
      </div>
    );
  }

  // 2. Paywall Guard: Block features on Free Tier (when trial has expired and user is not on Premium)
  if (!hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 font-sans min-h-[70vh]">
        <div className="max-w-md w-full text-center space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl animate-in fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-inner">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Premium Feature
            </span>
            <h2 className="font-display text-2xl font-extrabold text-foreground">
              NutriGuide AI Voice Coach
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your 60-day free trial has concluded and your account is on the Free Tier. Workouts and manual tracking remain free forever. Unlock unlimited real-time AI voice and nutrition guidance for R49.00/month.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-left text-xs space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Unlimited live hands-free conversational AI</span>
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
            <Sparkles className="h-4 w-4" />
            <span>Unlock Premium (R49.00 / mo)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[82vh] justify-between relative overflow-hidden font-sans">
      {/* RESPONSIVE HEADER */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border/60">
        <h1 className="font-display text-lg font-extrabold text-foreground tracking-tight md:hidden">
          NutriGuide AI
        </h1>

        <div className="hidden md:flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-inner border border-emerald-500/20 shrink-0"
            style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
          >
            <Bot className="h-5 w-5" style={{ color: "var(--brand-green, #10b981)" }} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-foreground leading-none">NutriGuide AI</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Live Conversational Intelligence</p>
          </div>
        </div>

        {/* RESPONSIVE TOGGLE SWITCH */}
        <div className="flex items-center gap-1 rounded-2xl bg-card p-1 border border-border shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={`cursor-pointer flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold transition ${
              activeTab === "voice"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
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
            className={`cursor-pointer flex items-center gap-1 sm:gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold transition ${
              activeTab === "chat"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>
              <span className="hidden sm:inline">Text </span>Chat
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE VOICE MODE */}
      {activeTab === "voice" ? (
        <div className="flex-1 flex flex-col items-center justify-between py-6 sm:py-8 px-4 text-center relative overflow-hidden my-auto w-full">
          {/* AMBIENT BACKGROUND GLOW */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[24rem] w-[24rem] sm:h-[36rem] sm:w-[36rem] rounded-full blur-3xl transition-opacity duration-1000 pointer-events-none ${
              voiceState === "listening"
                ? "opacity-40 animate-pulse"
                : voiceState === "speaking"
                ? "opacity-50"
                : "opacity-15"
            }`}
            style={{
              background:
                voiceState === "speaking"
                  ? "radial-gradient(circle, var(--brand-orange, #f97316) 0%, transparent 70%)"
                  : "radial-gradient(circle, var(--brand-green, #10b981) 0%, transparent 70%)",
            }}
          />

          {/* MAIN CENTER ORB GRAPHIC */}
          <div className="relative my-auto flex flex-col items-center justify-center z-10 py-4">
            <div
              className={`relative flex h-48 w-48 sm:h-64 sm:w-64 items-center justify-center rounded-full transition-all duration-700 shadow-2xl ${
                voiceState === "listening"
                  ? "scale-105 sm:scale-110 shadow-emerald-500/30"
                  : voiceState === "thinking"
                  ? "scale-100 sm:scale-105 shadow-amber-500/30"
                  : voiceState === "speaking"
                  ? "scale-105 sm:scale-110 shadow-orange-500/30"
                  : "scale-100 shadow-none"
              }`}
              style={{
                background:
                  voiceState === "listening"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : voiceState === "thinking"
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : voiceState === "speaking"
                    ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                    : "var(--muted)",
              }}
            >
              {/* DYNAMIC AUDIO WAVE RIPPLES */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <span
                    key={bar}
                    className={`w-2.5 rounded-full bg-white transition-all duration-300 ${
                      voiceState === "listening"
                        ? "h-12 sm:h-20 animate-pulse"
                        : voiceState === "speaking"
                        ? "h-14 sm:h-24 animate-bounce"
                        : voiceState === "thinking"
                        ? "h-5 animate-ping"
                        : "h-4 opacity-50"
                    }`}
                    style={{ animationDelay: `${bar * 150}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* LIVE STATE STATUS INDICATOR */}
            <div className="mt-6 sm:mt-8 font-extrabold text-xs sm:text-base tracking-wide">
              {voiceState === "listening" && (
                <span className="text-emerald-500 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" /> Listening... Speak naturally
                </span>
              )}
              {voiceState === "thinking" && (
                <span className="text-amber-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                </span>
              )}
              {voiceState === "speaking" && (
                <span className="text-orange-500 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 animate-pulse" /> NutriGuide is speaking...
                </span>
              )}
              {voiceState === "idle" && (
                <span className="text-muted-foreground text-xs font-semibold">
                  Tap below to start live hands-free conversation
                </span>
              )}
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="relative z-10 w-full max-w-xs pt-2">
            <button
              type="button"
              onClick={toggleLiveVoiceMode}
              className={`w-full cursor-pointer flex items-center justify-center gap-2.5 rounded-full py-3.5 sm:py-4 px-6 text-xs sm:text-base font-extrabold text-white shadow-xl transition active:scale-95 ${
                isVoiceActive
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30"
              }`}
            >
              {isVoiceActive ? (
                <>
                  <Square className="h-4 w-4 sm:h-5 sm:w-5 fill-current" /> End Live Session
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> Start Live Voice Session
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* VIEW 2: TEXT CHAT FEED */
        <div className="flex-1 flex flex-col justify-between w-full mx-auto pt-4 space-y-4">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${
                  m.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}
                >
                  {m.sender === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>

                <div
                  className={`group relative max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <p>{m.text}</p>

                  {m.sender === "coach" && (
                    <button
                      type="button"
                      onClick={() => speakText(m.text)}
                      className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      <Volume2 className="h-3 w-3" /> Replay
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>NutriGuide AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendText} className="flex items-center gap-2 pt-2">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message for NutriGuide AI..."
              className="flex-1 rounded-2xl border border-input bg-card px-4 py-3 sm:py-3.5 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="cursor-pointer flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default AICoachPage;