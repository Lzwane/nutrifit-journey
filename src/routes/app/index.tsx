import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dumbbell, Droplet, Flame, Utensils, Play, Sparkles, TrendingUp, Flame as FireIcon, X, Sparkle } from "lucide-react";
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

function formatName(rawName: string): string {
  if (!rawName) return "there";
  return rawName
    .replace(/[._-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// STEP 1: Date-Based Index Helper
// Converts a date string (e.g., "2026-07-25") into a consistent index that changes daily
function getDailyIndex(dateStr: string, totalItems: number): number {
  if (totalItems <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % totalItems;
}

function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quote, setQuote] = useState<{ text: string; author: string | null } | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayWaterMl, setTodayWaterMl] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState(0);

  // Animation states: 'visible' | 'exiting' | 'hidden'
  const [bannerState, setBannerState] = useState<"visible" | "exiting" | "hidden">("hidden");

  useEffect(() => {
    // Check if user just logged in during this browser session
    const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome) {
      setBannerState("visible");
      sessionStorage.setItem("hasSeenWelcome", "true");

      // Trigger smooth exit animation after 4 seconds
      const exitTimer = setTimeout(() => {
        setBannerState("exiting");
      }, 4000);

      // Remove from DOM completely after exit transition finishes (4.7s)
      const removeTimer = setTimeout(() => {
        setBannerState("hidden");
      }, 4700);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  const handleManualDismiss = () => {
    setBannerState("exiting");
    setTimeout(() => {
      setBannerState("hidden");
    }, 700);
  };

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const [{ data: p }, { data: q }, { data: t }, { data: foods }, { data: waters }, { data: sessions }] = await Promise.all([
        supabase.from("profiles").select("full_name,current_weight_kg,starting_weight_kg,goal_weight_kg,streak_count,daily_calorie_goal,daily_water_goal_l").eq("id", user.id).maybeSingle(),
        supabase.from("daily_quotes").select("text,author"),
        supabase.from("tips").select("text"),
        supabase.from("food_logs").select("calories").eq("user_id", user.id).eq("log_date", today),
        supabase.from("water_logs").select("amount_ml").eq("user_id", user.id).eq("log_date", today),
        supabase.from("workout_sessions").select("id").eq("user_id", user.id).gte("started_at", today + "T00:00:00").not("completed_at", "is", null),
      ]);
      setProfile(p as Profile | null);

      // Consistently select quote of the day based on calendar date
      if (q?.length) {
        const quoteIndex = getDailyIndex(today, q.length);
        setQuote(q[quoteIndex]);
      }

      // Consistently select tip of the day based on calendar date
      if (t?.length) {
        const tipIndex = getDailyIndex(today, t.length);
        setTip(t[tipIndex].text);
      }

      setTodayCalories((foods ?? []).reduce((sum, r: any) => sum + (r.calories ?? 0), 0));
      setTodayWaterMl((waters ?? []).reduce((sum, r: any) => sum + (r.amount_ml ?? 0), 0));
      setTodayWorkouts((sessions ?? []).length);
    })();
  }, [user]);

  const rawName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "there";

  const displayName = formatName(rawName);

  const waterL = todayWaterMl / 1000;
  const waterGoal = profile?.daily_water_goal_l ?? 2.5;
  const calGoal = profile?.daily_calorie_goal ?? 2000;
  const lost =
    profile?.starting_weight_kg && profile?.current_weight_kg
      ? profile.starting_weight_kg - profile.current_weight_kg
      : 0;

  return (
    <div className="space-y-6">
      
      {/* Celebration Pop-in Banner with Automatic Exit Transition */}
      {bannerState !== "hidden" && (
        <div
          className={`relative overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg ${
            bannerState === "visible"
              ? "animate-in fade-in slide-in-from-top-4 duration-500"
              : "animate-out fade-out slide-out-to-top-4 fill-mode-forwards duration-700"
          }`}
        >
          {/* Floating particle elements */}
          <span className="absolute -top-2 left-10 text-2xl animate-bounce">🎉</span>
          <span className="absolute bottom-1 right-16 text-xl animate-pulse">✨</span>
          <span className="absolute top-2 right-28 text-xl animate-bounce delay-150">🏋️‍♂️</span>

          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground">
                <Sparkle className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold">Welcome back, {displayName}!</h3>
                <p className="text-xs text-primary-foreground/80">Ready to crush today's fitness goals?</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleManualDismiss}
            className="absolute right-3 top-3 cursor-pointer rounded-lg p-1 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            aria-label="Dismiss welcome"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{greeting()},</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {displayName} <span className="inline-block animate-bounce">👋</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-600 dark:text-orange-400 shadow-sm transition hover:scale-105">
          <FireIcon className="h-4 w-4 fill-orange-500 text-orange-500" /> {profile?.streak_count ?? 0} day streak
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <QuickAction to="/app/workouts" icon={Play} label="Start Workout" colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" />
        <QuickAction to="/app/profile" icon={TrendingUp} label="Log Weight" colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" />
        <QuickAction to="/app/nutrition" icon={Droplet} label="Log Water" colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" />
        <QuickAction to="/app/coach" icon={Sparkles} label="Ask AI Coach" colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" />
      </div>

      {/* Today's Activity Section */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-foreground">Today's activity</h2>
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <StatCard icon={Flame} label="Calories in" value={`${todayCalories}`} sub={`/ ${calGoal} kcal`} progress={Math.min(1, todayCalories / calGoal)} barColor="bg-orange-500" />
          <StatCard icon={Droplet} label="Water" value={`${waterL.toFixed(1)}L`} sub={`/ ${waterGoal}L`} progress={Math.min(1, waterL / waterGoal)} barColor="bg-blue-500" />
          <StatCard icon={Dumbbell} label="Workouts" value={`${todayWorkouts}`} sub="sessions today" progress={Math.min(1, todayWorkouts / 1)} barColor="bg-emerald-500" />
          <StatCard icon={Utensils} label="Meals logged" value={`${todayCalories > 0 ? "✓" : "—"}`} sub="logged today" progress={todayCalories > 0 ? 1 : 0} barColor="bg-purple-500" />
        </div>
      </section>

      {/* Weight Progress Section */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weight progress</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : "— kg"}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Start: <span className="font-semibold text-foreground">{profile?.starting_weight_kg ?? "—"} kg</span></p>
            <p className="text-muted-foreground">Goal: <span className="font-semibold text-foreground">{profile?.goal_weight_kg ?? "—"} kg</span></p>
            <div className="mt-1.5 inline-block rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {lost > 0 ? `-${lost.toFixed(1)} kg lost` : lost < 0 ? `+${Math.abs(lost).toFixed(1)} kg gained` : "0 kg change"}
            </div>
          </div>
        </div>
      </section>

      {/* Motivation & Tip Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-md transition hover:scale-[1.01]">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/80">Daily motivation</p>
          <p className="mt-2 font-display text-xl font-bold leading-snug">"{quote?.text ?? "Your health is your best partner."}"</p>
          <p className="mt-3 text-xs font-medium text-primary-foreground/80">— {quote?.author ?? "NutriFit"}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tip of the day</p>
          <p className="mt-2 text-base font-medium text-foreground leading-relaxed">{tip ?? "Stay hydrated and keep moving throughout your day."}</p>
        </div>
      </div>

    </div>
  );
}

function QuickAction({ to, icon: Icon, label, colorClass }: { to: string; icon: any; label: string; colorClass: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] cursor-pointer"
    >
      <div className={`grid h-10 w-10 place-items-center rounded-xl border ${colorClass} transition-transform group-hover:scale-110`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-bold text-foreground">{label}</span>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, sub, progress, barColor }: { icon: any; label: string; value: string; sub: string; progress: number; barColor: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground font-medium">{sub}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${barColor} transition-all duration-500 rounded-full`} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}