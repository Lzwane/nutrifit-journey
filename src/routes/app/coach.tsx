import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  Send,
  Volume2,
  Sparkles,
  Mic,
  MicOff,
  Bot,
  User,
  Loader2,
  Square,
} from "lucide-react";

export const Route = createFileRoute("/app/coach")({
  head: () => ({
    meta: [{ title: "AI Voice & Chat Coach — NutriFit" }],
  }),
  component: AICoachPage,
});

interface Message {
  id: string;
  sender: "user" | "coach";
  text: string;
  isVoice?: boolean;
}

// Strip markdown symbols for clean voice notes
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1")     // italics
    .replace(/__(.*?)__/g, "$1")     // underline
    .replace(/#+\s?/g, "")           // headers
    .replace(/[`~]/g, "")            // code blocks
    .trim();
}

// Native Text-To-Speech
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "coach",
      text: "Hey! I am your NutriFit AI Coach. Ask me anything about your meals, workouts, or calories!",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>(""); // Buffers full long audio
  const wantRecordingRef = useRef<boolean>(false);     // Tracks if user is still talking

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup Continuous Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;     // Keep recording through pauses!
      recognition.interimResults = true;  // Track real-time speech updates
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentSessionText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentSessionText += event.results[i][0].transcript + " ";
        }
        accumulatedTranscriptRef.current = currentSessionText.trim();
        setInputText(currentSessionText.trim()); // Show speech live in input field
      };

      // Auto-reconnect if browser drops connection before user clicks Stop
      recognition.onend = () => {
        if (wantRecordingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            setIsRecording(false);
          }
        } else {
          setIsRecording(false);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition notice:", err.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Toggle Voice Note Recording ON / OFF
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please use Chrome, Safari, or Edge.");
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (isRecording) {
      // STOP TALKING -> Send recorded message
      wantRecordingRef.current = false;
      recognitionRef.current.stop();
      setIsRecording(false);

      const finalVoicePrompt = accumulatedTranscriptRef.current || inputText;
      if (finalVoicePrompt.trim()) {
        handleSendMessage(finalVoicePrompt.trim(), true);
      }
    } else {
      // START TALKING -> Clear previous buffers & listen continuously
      accumulatedTranscriptRef.current = "";
      setInputText("");
      wantRecordingRef.current = true;
      recognitionRef.current.start();
    }
  };

  // Direct fetch call to Gemini 2.5 Flash API
  const callGeminiAPI = async (prompt: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API Key missing in .env (VITE_GEMINI_API_KEY)");
    }

    const systemInstruction =
      "You are an encouraging, friendly personal nutrition & fitness coach named NutriFit Coach. " +
      "Provide practical, concise answers (1 to 3 short sentences max). " +
      "STRICT RULE: Do NOT use markdown formatting, bold text (**), asterisks (*), or bullet points under any circumstances. " +
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that question. Try asking again!";
  };

  const handleSendMessage = async (textToSend?: string, isVoiceInput = false) => {
    const finalPrompt = textToSend || inputText;
    if (!finalPrompt.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: finalPrompt.trim(),
      isVoice: isVoiceInput,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    accumulatedTranscriptRef.current = "";
    setLoading(true);

    try {
      const reply = await callGeminiAPI(finalPrompt);
      const cleanReply = cleanTextForSpeech(reply);

      const coachMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "coach",
        text: cleanReply,
        isVoice: isVoiceInput,
      };

      setMessages((prev) => [...prev, coachMsg]);

      // If originated as a voice note, respond with spoken audio automatically
      if (isVoiceInput) {
        setIsSpeaking(true);
        speakText(cleanReply, () => setIsSpeaking(false));
      }
    } catch (err: any) {
      console.error("Gemini Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "coach",
          text: `Error: ${err.message || "Failed to reach AI Coach."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[82vh] max-w-3xl mx-auto rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">NutriFit AI Coach</h2>
            <p className="text-[11px] text-muted-foreground">Unlimited Recording · Hands-free Voice &amp; Text</p>
          </div>
        </div>

        {isSpeaking && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary animate-pulse">
            <Volume2 className="h-3.5 w-3.5" /> Speaking voice note...
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${
              m.sender === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                m.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }`}
            >
              {m.sender === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            <div
              className={`group relative max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                m.sender === "user"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-background border border-border text-foreground"
              }`}
            >
              <p>{m.text}</p>

              {/* Replay voice note button */}
              {m.sender === "coach" && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSpeaking(true);
                    speakText(m.text, () => setIsSpeaking(false));
                  }}
                  className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  <Volume2 className="h-3 w-3" /> Replay Voice Note
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Coach is analyzing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & Mic Action Bar */}
      <div className="border-t border-border p-3 bg-background flex flex-col gap-2">
        {isRecording && (
          <div className="flex items-center justify-between rounded-xl bg-destructive/10 p-2.5 px-4 text-xs font-bold text-destructive animate-pulse">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-ping" />
              <span>Recording... Speak as long as you want, then click Stop!</span>
            </div>
            <button
              type="button"
              onClick={toggleRecording}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1 text-[11px] text-white shadow-sm hover:bg-destructive/90"
            >
              <Square className="h-3 w-3 fill-current" /> Stop &amp; Send
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(undefined, false); // Manual text send
          }}
          className="flex items-center gap-2"
        >
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? "Listening to your voice..." : "Type a message or press mic to speak..."}
            disabled={isRecording}
            className="flex-1 rounded-2xl border border-input bg-card px-4 py-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary disabled:opacity-80"
          />

          {/* Continuous Mic Toggle */}
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? "Click to Stop & Send" : "Click to Start Speaking"}
            className={`cursor-pointer flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition shadow-sm ${
              isRecording
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || loading || isRecording}
            className="cursor-pointer flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}