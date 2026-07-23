import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send } from "lucide-react";
import { askCoach, loadCoachHistory } from "@/lib/coach.functions";

export const Route = createFileRoute("/app/coach")({
  head: () => ({ meta: [{ title: "AI Coach — NutriFit" }, { name: "description", content: "Ask the NutriFit AI coach for personalized fitness guidance." }] }),
  component: CoachPage,
});

type Msg = { id?: string; role: "user" | "assistant" | "system"; content: string };

function CoachPage() {
  const ask = useServerFn(askCoach);
  const loadHistory = useServerFn(loadCoachHistory);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory().then((r) => setMessages(r.messages)).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const q = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setSending(true);
    try {
      const { reply } = await ask({ data: { question: q } });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${err.message ?? "Something went wrong."}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl gradient-brand text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold">AI Coach</h1>
          <p className="text-xs text-muted-foreground">Personalized fitness &amp; nutrition guidance</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.length === 0 && (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-sm">
              <p className="font-display text-lg font-bold">Hi! I'm your NutriFit coach.</p>
              <p className="mt-1 text-sm text-muted-foreground">Ask me anything about training, nutrition, or habits.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                {["How do I lose belly fat?", "Best pre-workout meal?", "How much protein do I need?"].map((q) => (
                  <button key={q} onClick={() => setInput(q)} className="rounded-full border border-border bg-background px-3 py-1.5 hover:bg-brand-green-soft">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user" ? "gradient-brand text-white" : "bg-muted text-foreground"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div>
          </div>
        )}
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach…"
          className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> Send
        </button>
      </form>
    </div>
  );
}
