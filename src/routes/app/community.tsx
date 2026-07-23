import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Calendar, Clock, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/community")({
  head: () => ({ meta: [{ title: "Community — NutriFit" }, { name: "description", content: "Join local fitness communities and connect via WhatsApp." }] }),
  component: CommunityPage,
});

function CommunityPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("communities").select("*").order("name"),
      user ? supabase.from("community_members").select("community_id").eq("user_id", user.id) : Promise.resolve({ data: [] as any }),
    ]);
    setCommunities(c ?? []);
    setJoined(new Set((m ?? []).map((r: any) => r.community_id)));
  };

  useEffect(() => { refresh(); }, [user]);

  const toggle = async (id: string) => {
    if (!user) return;
    if (joined.has(id)) {
      await supabase.from("community_members").delete().eq("user_id", user.id).eq("community_id", id);
    } else {
      await supabase.from("community_members").insert({ user_id: user.id, community_id: id });
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Community</h1>
        <p className="text-sm text-muted-foreground">Find your tribe. Train together.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {communities.map((c) => {
          const isJoined = joined.has(c.id);
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="h-24 gradient-brand" />
              <div className="p-5">
                <h3 className="font-display text-xl font-bold">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {c.location}</p>
                  <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {c.meeting_day}</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {c.meeting_time}</p>
                  <p className="flex items-center gap-2"><Users className="h-4 w-4" /> Organizer: {c.organizer}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => toggle(c.id)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                      isJoined ? "bg-muted text-foreground" : "gradient-brand text-white"
                    }`}
                  >
                    {isJoined ? "Joined ✓" : "Join community"}
                  </button>
                  {c.whatsapp_url && (
                    <a
                      href={c.whatsapp_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-brand-green-soft"
                    >
                      <MessageCircle className="h-4 w-4" style={{ color: "var(--brand-green)" }} /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
