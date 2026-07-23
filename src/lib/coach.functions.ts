import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AskSchema = z.object({ question: z.string().min(1).max(2000) });

const SYSTEM_PROMPT = `You are the NutriFit AI Coach, an encouraging and knowledgeable fitness & nutrition assistant.
Give personalized, conversational, practical answers about workouts, nutrition, hydration, recovery, and habits.
Always end every response with this exact disclaimer on a new line:

"This is for informational purposes only and does not replace professional medical advice. Please consult with a physician before starting any new diet or exercise program."`;

export const askCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AskSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load recent conversation for context
    const { data: history } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(30);

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.question },
    ];

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-3.6-flash", messages }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit hit. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please contact support.");
      throw new Error(`AI request failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "Sorry, I couldn't answer that.";

    // Persist both messages
    await supabase.from("coach_messages").insert([
      { user_id: userId, role: "user", content: data.question },
      { user_id: userId, role: "assistant", content: reply },
    ]);

    return { reply };
  });

export const loadCoachHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("coach_messages")
      .select("id, role, content, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(100);
    return { messages: data ?? [] };
  });
