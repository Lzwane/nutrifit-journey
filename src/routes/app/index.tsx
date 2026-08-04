import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Dumbbell,
  Droplet,
  Flame,
  Utensils,
  Play,
  Sparkles,
  TrendingUp,
  Flame as FireIcon,
  X,
  Sparkle,
  Zap,
  Target,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NutriFit" },
      { name: "description", content: "Your dynamic fitness & nutrition progress dashboard." },
    ],
  }),
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

  // Nutrition Log Totals State
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayCarbs, setTodayCarbs] = useState(0);
  const [todayFat, setTodayFat] = useState(0);
  const [todayWaterMl, setTodayWaterMl] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState(0);

  const [bannerState, setBannerState] = useState<"visible" | "exiting" | "hidden">("hidden");

  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome) {
      setBannerState("visible");
      sessionStorage.setItem("hasSeenWelcome", "true");

      const exitTimer = setTimeout(() => setBannerState("exiting"), 4000);
      const removeTimer = setTimeout(() => setBannerState("hidden"), 4700);

      return () => {
        clearTimeout(exitTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  const handleManualDismiss = () => {
    setBannerState("exiting");
    setTimeout(() => setBannerState("hidden"), 700);
  };

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      const [
        { data: p },
        { data: q },
        { data: t },
        { data: foods },
        { data: waters },
        { data: sessions },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name,current_weight_kg,starting_weight_kg,goal_weight_kg,streak_count,daily_calorie_goal,daily_water_goal_l"
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("daily_quotes").select("text,author"),
        supabase.from("tips").select("text"),
        supabase.from("food_logs").select("calories, protein_g, carbs_g, fat_g").eq("user_id", user.id).eq("log_date", today),
        supabase.from("water_logs").select("amount_ml").eq("user_id", user.id).eq("log_date", today),
        supabase
          .from("workout_sessions")
          .select("id")
          .eq("user_id", user.id)
          .gte("started_at", today + "T00:00:00")
          .not("completed_at", "is", null),
      ]);

      setProfile(p as Profile | null);

      if (q?.length) {
        setQuote(q[getDailyIndex(today, q.length)]);
      }

      if (t?.length) {
        setTip(t[getDailyIndex(today, t.length)].text);
      }

      // Calculate Macro & Nutrition Aggregates
      const foodList = foods ?? [];
      setTodayCalories(foodList.reduce((sum, r: any) => sum + (r.calories ?? 0), 0));
      setTodayProtein(foodList.reduce((sum, r: any) => sum + (r.protein_g ?? 0), 0));
      setTodayCarbs(foodList.reduce((sum, r: any) => sum + (r.carbs_g ?? 0), 0));
      setTodayFat(foodList.reduce((sum, r: any) => sum + (r.fat_g ?? 0), 0));

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

  // Targets & Goals
  const calGoal = profile?.daily_calorie_goal ?? 2000;
  const calRemaining = calGoal - todayCalories;
  const isCalExceeded = calRemaining < 0;

  const waterL = todayWaterMl / 1000;
  const waterGoal = profile?.daily_water_goal_l ?? 2.5;

  // Estimated Macro Goals (Customizable or based on standard 30P / 45C / 25F macro split)
  const proteinGoal = Math.round((calGoal * 0.3) / 4); // 1g Protein = 4 kcal
  const carbsGoal = Math.round((calGoal * 0.45) / 4);   // 1g Carb = 4 kcal
  const fatGoal = Math.round((calGoal * 0.25) / 9);     // 1g Fat = 9 kcal

  const lost =
    profile?.starting_weight_kg && profile?.current_weight_kg
      ? profile.starting_weight_kg - profile.current_weight_kg
      : 0;

  return (
    <div className="space-y-8">
      {/* CELEBRATION POP-IN BANNER */}
      {bannerState !== "hidden" && (
        <div
          className={`relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-xl ${
            bannerState === "visible"
              ? "animate-in fade-in slide-in-from-top-4 duration-500"
              : "animate-out fade-out slide-out-to-top-4 fill-mode-forwards duration-700"
          }`}
        >
          <span className="absolute -top-2 left-10 text-2xl animate-bounce">🎉</span>
          <span className="absolute bottom-1 right-16 text-xl animate-pulse">✨</span>
          <span className="absolute top-2 right-28 text-xl animate-bounce delay-150">🏋️‍♂️</span>

          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/10 text-primary-foreground shadow-inner">
                <Sparkle className="h-6 w-6 animate-spin" />
              </div>
              <div>
                <h3 className="font-display text-base font-extrabold">Welcome back, {displayName}!</h3>
                <p className="text-xs text-primary-foreground/80">Ready to crush your daily targets?</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleManualDismiss}
            className="absolute right-3 top-3 cursor-pointer rounded-xl p-1.5 text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition"
            aria-label="Dismiss welcome"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* HEADER GREETING */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{greeting()},</p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mt-0.5">
            {displayName} <span className="inline-block animate-bounce">👋</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-orange-600 dark:text-orange-400 shadow-sm transition hover:scale-105">
          <FireIcon className="h-4 w-4 fill-orange-500 text-orange-500" />
          <span>{profile?.streak_count ?? 0} Day Streak</span>
        </div>
      </div>

      {/* COOL REAL-TIME CALORIE & MACRO PROGRESS DASHBOARD */}
      <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-foreground">Daily Energy &amp; Macros</h2>
              <p className="text-xs text-muted-foreground">Real-time target tracking and macro breakdown</p>
            </div>
          </div>

          {/* DYNAMIC REMAINING / EXCEEDED BADGE */}
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold border shadow-sm ${
              isCalExceeded
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            }`}
          >
            {isCalExceeded ? (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>{Math.abs(calRemaining)} kcal exceeded</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{calRemaining} kcal remaining</span>
              </>
            )}
          </div>
        </div>

        {/* CALORIE OVERVIEW MAIN BAR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-foreground">
              <Flame className="h-4 w-4 text-orange-500" /> Daily Calories ({todayCalories} / {calGoal} kcal)
            </span>
            <span className="font-mono text-muted-foreground">
              {Math.round((todayCalories / calGoal) * 100)}%
            </span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-muted overflow-hidden p-0.5 border border-border">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isCalExceeded ? "bg-rose-500" : "bg-gradient-to-r from-amber-500 to-orange-500"
              }`}
              style={{ width: `${Math.min(100, (todayCalories / calGoal) * 100)}%` }}
            />
          </div>
        </div>

        {/* 4-COLUMN MACRO BREAKDOWN BARS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* PROTEIN */}
          <MacroBar
            label="Protein"
            current={`${todayProtein}g`}
            target={`${proteinGoal}g`}
            progress={todayProtein / proteinGoal}
            barColor="bg-emerald-500"
            badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />

          {/* CARBS */}
          <MacroBar
            label="Carbs"
            current={`${todayCarbs}g`}
            target={`${carbsGoal}g`}
            progress={todayCarbs / carbsGoal}
            barColor="bg-sky-500"
            badgeColor="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          />

          {/* FATS */}
          <MacroBar
            label="Fats"
            current={`${todayFat}g`}
            target={`${fatGoal}g`}
            progress={todayFat / fatGoal}
            barColor="bg-amber-500"
            badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />

          {/* WATER */}
          <MacroBar
            label="Water"
            current={`${waterL.toFixed(1)}L`}
            target={`${waterGoal}L`}
            progress={waterL / waterGoal}
            barColor="bg-blue-500"
            badgeColor="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
        </div>
      </section>

      {/* QUICK ACTIONS GRID */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <QuickAction
          to="/app/workouts"
          icon={Play}
          label="Start Workout"
          colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        />
        <QuickAction
          to="/app/profile"
          icon={TrendingUp}
          label="Log Weight"
          colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
        />
        <QuickAction
          to="/app/nutrition"
          icon={Droplet}
          label="Log Water & Meals"
          colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        />
        <QuickAction
          to="/app/coach"
          icon={Sparkles}
          label="Ask AI Coach"
          colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        />
      </div>

      {/* WEIGHT PROGRESS SECTION */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4 text-emerald-500" /> Weight Progress
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : "— kg"}
            </p>
          </div>
          <div className="text-right text-xs sm:text-sm space-y-1">
            <p className="text-muted-foreground">
              Start: <span className="font-bold text-foreground">{profile?.starting_weight_kg ?? "—"} kg</span>
            </p>
            <p className="text-muted-foreground">
              Goal: <span className="font-bold text-foreground">{profile?.goal_weight_kg ?? "—"} kg</span>
            </p>
            <div className="mt-1.5 inline-block rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {lost > 0
                ? `-${lost.toFixed(1)} kg lost`
                : lost < 0
                ? `+${Math.abs(lost).toFixed(1)} kg gained`
                : "0 kg change"}
            </div>
          </div>
        </div>
      </section>

      {/* MOTIVATION & TIP SECTION */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-md transition hover:scale-[1.01]">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/80">Daily motivation</p>
          <p className="mt-2 font-display text-xl font-extrabold leading-snug">
            "{quote?.text ?? "Your health is your best partner."}"
          </p>
          <p className="mt-3 text-xs font-semibold text-primary-foreground/80">— {quote?.author ?? "NutriFit"}</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tip of the day</p>
          <p className="mt-2 text-sm sm:text-base font-semibold text-foreground leading-relaxed">
            {tip ?? "Stay hydrated and keep moving throughout your day."}
          </p>
        </div>
      </div>
    </div>
  );
}

// MACRO PROGRESS COMPONENT
function MacroBar({
  label,
  current,
  target,
  progress,
  barColor,
  badgeColor,
}: {
  label: string;
  current: string;
  target: string;
  progress: number;
  barColor: string;
  badgeColor: string;
}) {
  const pct = Math.min(100, Math.round((progress || 0) * 100));

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase ${badgeColor}`}>
          {label}
        </span>
        <span className="text-[11px] font-bold text-muted-foreground font-mono">{pct}%</span>
      </div>

      <div className="flex items-baseline justify-between text-xs">
        <span className="font-extrabold text-foreground text-sm">{current}</span>
        <span className="text-muted-foreground text-[11px]">/ {target}</span>
      </div>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// QUICK ACTION BUTTON COMPONENT
function QuickAction({
  to,
  icon: Icon,
  label,
  colorClass,
}: {
  to: string;
  icon: any;
  label: string;
  colorClass: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-3xl border border-border bg-card p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] cursor-pointer"
    >
      <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${colorClass} transition-transform group-hover:scale-110 shadow-xs`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs sm:text-sm font-extrabold text-foreground">{label}</span>
    </Link>
  );
}

export default HomePage;