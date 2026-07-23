import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Droplet, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — NutriFit" }, { name: "description", content: "Track your daily calories, macros and water intake." }] }),
  component: NutritionPage,
});

type FoodLog = { id: string; name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; meal_type: string };

function NutritionPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const refresh = async () => {
    if (!user) return;
    const [{ data: f }, { data: w }, { data: p }] = await Promise.all([
      supabase.from("food_logs").select("*").eq("user_id", user.id).eq("log_date", today).order("logged_at", { ascending: false }),
      supabase.from("water_logs").select("amount_ml").eq("user_id", user.id).eq("log_date", today),
      supabase.from("profiles").select("daily_calorie_goal,daily_water_goal_l").eq("id", user.id).maybeSingle(),
    ]);
    setLogs((f as FoodLog[]) ?? []);
    setWaterMl((w ?? []).reduce((s, r: any) => s + (r.amount_ml ?? 0), 0));
    setProfile(p);
  };

  useEffect(() => { refresh(); }, [user]);

  const addFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) return;
    await supabase.from("food_logs").insert({
      user_id: user.id, name,
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
    });
    setName(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
    refresh();
  };

  const addWater = async (ml: number) => {
    if (!user) return;
    await supabase.from("water_logs").insert({ user_id: user.id, amount_ml: ml });
    refresh();
  };

  const totals = logs.reduce(
    (a, l) => ({ cal: a.cal + (l.calories ?? 0), p: a.p + (l.protein_g ?? 0), c: a.c + (l.carbs_g ?? 0), f: a.f + (l.fat_g ?? 0), fi: a.fi + (l.fiber_g ?? 0) }),
    { cal: 0, p: 0, c: 0, f: 0, fi: 0 }
  );
  const calGoal = profile?.daily_calorie_goal ?? 2000;
  const waterGoal = (profile?.daily_water_goal_l ?? 2.5) * 1000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Nutrition</h1>
        <p className="text-sm text-muted-foreground">Log meals and water to hit your daily goals.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calories</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{totals.cal} <span className="text-base font-medium text-muted-foreground">/ {calGoal}</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full gradient-brand" style={{ width: `${Math.min(100, (totals.cal / calGoal) * 100)}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            <MacroPill label="Protein" value={`${totals.p.toFixed(0)}g`} />
            <MacroPill label="Carbs" value={`${totals.c.toFixed(0)}g`} />
            <MacroPill label="Fat" value={`${totals.f.toFixed(0)}g`} />
            <MacroPill label="Fiber" value={`${totals.fi.toFixed(0)}g`} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Water</p>
          <p className="mt-2 font-display text-3xl font-extrabold">{(waterMl / 1000).toFixed(2)}L <span className="text-base font-medium text-muted-foreground">/ {(waterGoal / 1000).toFixed(1)}L</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (waterMl / waterGoal) * 100)}%` }} />
          </div>
          <div className="mt-4 flex gap-2">
            {[250, 500, 750].map((ml) => (
              <button key={ml} onClick={() => addWater(ml)} className="flex-1 rounded-xl border border-border bg-background py-2 text-sm font-semibold hover:bg-brand-green-soft">
                <Droplet className="mx-auto h-4 w-4" style={{ color: "var(--brand-green)" }} /> +{ml}ml
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Log a meal</h2>
        <form onSubmit={addFood} className="grid gap-3 md:grid-cols-6">
          <input required placeholder="Food name" value={name} onChange={(e) => setName(e.target.value)} className="md:col-span-2 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Cal" value={calories} onChange={(e) => setCalories(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="P (g)" value={protein} onChange={(e) => setProtein(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="C (g)" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="F (g)" value={fat} onChange={(e) => setFat(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <button className="md:col-span-6 inline-flex items-center justify-center gap-1 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Today's meals</h2>
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-orange-soft">
                  <Utensils className="h-4 w-4" style={{ color: "var(--brand-orange)" }} />
                </div>
                <div>
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">P {l.protein_g}g · C {l.carbs_g}g · F {l.fat_g}g</p>
                </div>
              </div>
              <p className="font-display font-bold">{l.calories} cal</p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No meals logged yet today.</p>}
        </div>
      </section>
    </div>
  );
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
