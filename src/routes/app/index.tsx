import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, Droplet, Flame, Utensils, Play, Sparkles, TrendingUp, Flame as FireIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Home — NutriFit" }, { name: "description", content: "Your daily fitness & nutrition dashboard." }] }),
  component: HomePage,
});

type Profile = {
  full_name: string | null;
  current_weight_kg: number | null;
  starting_weight_kg: number | null;
  goal_weight_kg: number | null;
  streak_count: number | null;
  daily_calorie_goal: number | null;
  daily_water_goal_l: number | null;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quote, setQuote] = useState<{ text: string; author: string | null } | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayWaterMl, setTodayWaterMl] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const [{ data: p }, { data: q }, { data: t }, { data: foods }, { data: waters }, { data: sessions }] = await Promise.all([
        supabase.from("profiles").select("full_name,current_weight_kg,starting_weight_kg,goal_weight_kg,streak_count,daily_calorie_goal,daily_water_goal_l").eq("id", user.id).maybeSingle(),
        supabase.from("daily_quotes").select("text,author").limit(20),
        supabase.from("tips").select("text").limit(20),
        supabase.from("food_logs").select("calories").eq("user_id", user.id).eq("log_date", today),
        supabase.from("water_logs").select("amount_ml").eq("user_id", user.id).eq("log_date", today),
        supabase.from("workout_sessions").select("id").eq("user_id", user.id).gte("started_at", today + "T00:00:00").not("completed_at", "is", null),
      ]);
      setProfile(p as Profile | null);
      if (q?.length) setQuote(q[Math.floor(Math.random() * q.length)]);
      if (t?.length) setTip(t[Math.floor(Math.random() * t.length)].text);
      setTodayCalories((foods ?? []).reduce((sum, r: any) => sum + (r.calories ?? 0), 0));
      setTodayWaterMl((waters ?? []).reduce((sum, r: any) => sum + (r.amount_ml ?? 0), 0));
      setTodayWorkouts((sessions ?? []).length);
    })();
  }, [user]);

  const name = profile?.full_name ?? user?.email?.split("@")[0] ?? "there";
  const waterL = todayWaterMl / 1000;
  const waterGoal = profile?.daily_water_goal_l ?? 2.5;
  const calGoal = profile?.daily_calorie_goal ?? 2000;
  const lost =
    profile?.starting_weight_kg && profile?.current_weight_kg
      ? profile.starting_weight_kg - profile.current_weight_kg
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="font-display text-3xl font-extrabold">{name} 👋</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-brand-orange-soft px-4 py-2 text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
          <FireIcon className="h-4 w-4" /> {profile?.streak_count ?? 0} day streak
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickAction to="/app/workouts" icon={Play} label="Start Workout" tone="green" />
        <QuickAction to="/app/profile" icon={TrendingUp} label="Log Weight" tone="orange" />
        <QuickAction to="/app/nutrition" icon={Droplet} label="Log Water" tone="green" />
        <QuickAction to="/app/coach" icon={Sparkles} label="Ask AI Coach" tone="orange" />
      </div>

      {/* Today's activity */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Today's activity</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Flame} label="Calories in" value={`${todayCalories}`} sub={`/ ${calGoal}`} progress={Math.min(1, todayCalories / calGoal)} />
          <StatCard icon={Droplet} label="Water" value={`${waterL.toFixed(1)}L`} sub={`/ ${waterGoal}L`} progress={Math.min(1, waterL / waterGoal)} />
          <StatCard icon={Dumbbell} label="Workouts" value={`${todayWorkouts}`} sub="today" progress={Math.min(1, todayWorkouts / 1)} />
          <StatCard icon={Utensils} label="Meals logged" value={`${todayCalories > 0 ? "✓" : "—"}`} sub="log more" progress={todayCalories > 0 ? 1 : 0} />
        </div>
      </section>

      {/* Weight progress */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weight progress</p>
            <p className="mt-1 font-display text-3xl font-extrabold">
              {profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : "— kg"}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Start: {profile?.starting_weight_kg ?? "—"} kg</p>
            <p className="text-muted-foreground">Goal: {profile?.goal_weight_kg ?? "—"} kg</p>
            <p className="mt-1 font-semibold text-primary">
              {lost > 0 ? `-${lost.toFixed(1)}` : lost < 0 ? `+${Math.abs(lost).toFixed(1)}` : "0"} kg
            </p>
          </div>
        </div>
      </section>

      {/* Quote + tip */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl gradient-brand p-6 text-white shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Daily motivation</p>
          <p className="mt-2 font-display text-xl font-bold leading-snug">"{quote?.text ?? "Your health is your best partner."}"</p>
          <p className="mt-2 text-sm text-white/80">— {quote?.author ?? "NutriFit"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tip of the day</p>
          <p className="mt-2 text-base">{tip ?? "Stay hydrated and keep moving."}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, tone }: { to: string; icon: any; label: string; tone: "green" | "orange" }) {
  const bg = tone === "green" ? "bg-brand-green-soft" : "bg-brand-orange-soft";
  const color = tone === "green" ? "var(--brand-green)" : "var(--brand-orange)";
  return (
    <Link to={to} className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:shadow-soft">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${bg}`}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, sub, progress }: { icon: any; label: string; value: string; sub: string; progress: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full gradient-brand" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
