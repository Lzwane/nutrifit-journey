import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Scale, Save } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — NutriFit" }, { name: "description", content: "Manage your NutriFit profile, goals and weight history." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const [{ data: p }, { data: w }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("weight_logs").select("*").eq("user_id", user.id).order("log_date", { ascending: false }).limit(20),
    ]);
    setProfile(p);
    setWeightLogs(w ?? []);
  };

  useEffect(() => { refresh(); }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    await supabase.from("profiles").update({
      full_name: profile.full_name,
      bio: profile.bio,
      height_cm: profile.height_cm,
      current_weight_kg: profile.current_weight_kg,
      starting_weight_kg: profile.starting_weight_kg,
      goal_weight_kg: profile.goal_weight_kg,
      activity_level: profile.activity_level,
      daily_calorie_goal: profile.daily_calorie_goal,
    }).eq("id", user.id);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const logWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newWeight) return;
    const kg = Number(newWeight);
    await supabase.from("weight_logs").insert({ user_id: user.id, weight_kg: kg });
    await supabase.from("profiles").update({ current_weight_kg: kg }).eq("id", user.id);
    setNewWeight("");
    refresh();
  };

  if (!profile) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Profile</h1>
        <p className="text-sm text-muted-foreground">Keep your details up to date to personalize NutriFit.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="input" />
          </Field>
          <Field label="Height (cm)">
            <input type="number" value={profile.height_cm ?? ""} onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Starting weight (kg)">
            <input type="number" value={profile.starting_weight_kg ?? ""} onChange={(e) => setProfile({ ...profile, starting_weight_kg: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Current weight (kg)">
            <input type="number" value={profile.current_weight_kg ?? ""} onChange={(e) => setProfile({ ...profile, current_weight_kg: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Goal weight (kg)">
            <input type="number" value={profile.goal_weight_kg ?? ""} onChange={(e) => setProfile({ ...profile, goal_weight_kg: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Daily calorie goal">
            <input type="number" value={profile.daily_calorie_goal ?? ""} onChange={(e) => setProfile({ ...profile, daily_calorie_goal: Number(e.target.value) })} className="input" />
          </Field>
          <Field label="Activity level">
            <select value={profile.activity_level ?? "moderate"} onChange={(e) => setProfile({ ...profile, activity_level: e.target.value })} className="input">
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very_active">Very active</option>
            </select>
          </Field>
          <Field label="Bio">
            <textarea value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="input min-h-[80px]" />
          </Field>
        </div>
        <button onClick={save} className="mt-4 inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft">
          <Save className="h-4 w-4" /> {savedFlash ? "Saved ✓" : "Save profile"}
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 font-display text-lg font-bold">Log weight</h2>
        <form onSubmit={logWeight} className="flex gap-2">
          <input required type="number" step="0.1" placeholder="Weight in kg" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="input flex-1" />
          <button className="rounded-xl gradient-brand px-5 text-sm font-semibold text-white shadow-soft">Log</button>
        </form>
        <div className="mt-4 space-y-2">
          {weightLogs.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><Scale className="h-4 w-4" /> {new Date(w.log_date).toLocaleDateString()}</span>
              <span className="font-semibold">{w.weight_kg} kg</span>
            </div>
          ))}
          {weightLogs.length === 0 && <p className="text-sm text-muted-foreground">No weight entries yet.</p>}
        </div>
      </section>

      <style>{`.input{width:100%;border-radius:.75rem;border:1px solid var(--input);background:var(--background);padding:.6rem 1rem;font-size:.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
