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
  Lock,
  Clock,
  ArrowRight,
  ShieldCheck,
  Footprints,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";

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
  const sub = useSubscription();

  const isPremium = sub.isPremium || (sub as any).tier === "premium";
  const isTrialActive = sub.isTrialActive ?? (sub.daysLeft > 0 && !isPremium);
  const daysLeft = sub.daysLeft ?? 60;
  const hasAccess = isPremium || isTrialActive;

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
  const [todaySteps, setTodaySteps] = useState(3420);

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
        supabase
          .from("food_logs")
          .select("calories, protein_g, carbs_g, fat_g")
          .eq("user_id", user.id)
          .eq("log_date", today),
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

  const calGoal = profile?.daily_calorie_goal ?? 2000;
  const calRemaining = calGoal - todayCalories;
  const isCalExceeded = calRemaining < 0;

  const proteinGoal = Math.round((calGoal * 0.3) / 4);
  const carbsGoal = Math.round((calGoal * 0.45) / 4);
  const fatGoal = Math.round((calGoal * 0.25) / 9);
  const stepsGoal = 5000;

  const lost =
    profile?.starting_weight_kg && profile?.current_weight_kg
      ? profile.starting_weight_kg - profile.current_weight_kg
      : 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto font-sans pb-12 w-full">
      {/* CELEBRATION POP-IN BANNER */}
      {bannerState !== "hidden" && (
        <div
          className={`relative overflow-hidden rounded-3xl bg-emerald-600 p-5 text-white shadow-xl ${
            bannerState === "visible"
              ? "animate-in fade-in slide-in-from-top-4 duration-500"
              : "animate-out fade-out slide-out-to-top-4 fill-mode-forwards duration-700"
          }`}
        >
          <span className="absolute -top-2 left-10 text-2xl select-none">🎉</span>
          <span className="absolute bottom-1 right-16 text-xl select-none">✨</span>
          <span className="absolute top-2 right-28 text-xl select-none">🏋️‍♂️</span>

          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner">
                <Sparkle className="h-6 w-6 shrink-0 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Welcome back, {displayName}!</h3>
                <p className="text-xs text-white/90">Ready to crush your daily targets?</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualDismiss}
            className="absolute right-3 top-3 cursor-pointer rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
            aria-label="Dismiss welcome"
          >
            <X className="h-4 w-4 shrink-0" />
          </button>
        </div>
      )}

      {/* EXPIRED TRIAL PROMO BANNER */}
      {!hasAccess && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <Lock className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                60-Day Free Trial Concluded — Free Tier Active
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Workouts and tracking remain free forever. Unlock NutriGuide AI Voice Coach for R49.00/month.
              </p>
            </div>
          </div>

          <Link
            to="/app/profile"
            search={{ subscribe: "true" }}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition shrink-0 active:scale-95"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Unlock Premium (R49/mo)</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>
      )}

      {/* HEADER GREETING & TIER BADGES */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mt-0.5">
            {displayName} <span className="inline-block">👋</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* MEMBERSHIP STATUS PILL */}
          {isPremium ? (
            <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Premium</span>
            </div>
          ) : isTrialActive ? (
            <div className="flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Free Tier ({daysLeft}d left)</span>
            </div>
          ) : (
            <Link
              to="/app/profile"
              search={{ subscribe: "true" }}
              className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted/60 px-3.5 py-2 text-xs font-extrabold text-muted-foreground hover:border-amber-500/30 hover:text-amber-500 transition cursor-pointer shrink-0"
            >
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Free Tier</span>
            </Link>
          )}

          {/* STREAK BADGE */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-extrabold text-orange-600 dark:text-orange-400 shadow-sm shrink-0">
            <FireIcon className="h-4 w-4 shrink-0 fill-orange-500 text-orange-500" />
            <span>{profile?.streak_count ?? 0} Day Streak</span>
          </div>
        </div>
      </div>

      {/* REAL-TIME CALORIE & MACRO PROGRESS DASHBOARD */}
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground">Daily Energy &amp; Macros</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time target tracking and macro breakdown</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-extrabold border shadow-xs shrink-0 ${
              isCalExceeded
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            }`}
          >
            {isCalExceeded ? (
              <>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{Math.abs(calRemaining)} kcal exceeded</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{calRemaining} kcal remaining</span>
              </>
            )}
          </div>
        </div>

        {/* CALORIE OVERVIEW MAIN BAR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-foreground">
              <Flame className="h-4 w-4 shrink-0 text-orange-500" />
              <span>Daily Calories ({todayCalories} / {calGoal} kcal)</span>
            </span>
            <span className="font-mono text-muted-foreground">
              {Math.round((todayCalories / Math.max(calGoal, 1)) * 100)}%
            </span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-muted/80 overflow-hidden p-0.5 border border-border/80">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isCalExceeded ? "bg-rose-500" : "bg-gradient-to-r from-amber-500 to-orange-500"
              }`}
              style={{ width: `${Math.min(100, (todayCalories / Math.max(calGoal, 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* 4-COLUMN BREAKDOWN BARS WITH 5,000 STEP GOAL REPLACING FAT CARD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* 1. STEPS (GOAL 5,000) */}
          <MacroBar
            label="Steps (Goal 5k)"
            current={`${todaySteps.toLocaleString()}`}
            target={`${stepsGoal.toLocaleString()}`}
            progress={todaySteps / stepsGoal}
            barColor="bg-emerald-500"
            badgeColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          />

          {/* 2. PROTEIN */}
          <MacroBar
            label="Protein"
            current={`${todayProtein}g`}
            target={`${proteinGoal}g`}
            progress={todayProtein / Math.max(proteinGoal, 1)}
            barColor="bg-sky-500"
            badgeColor="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
          />

          {/* 3. CARBS */}
          <MacroBar
            label="Carbs"
            current={`${todayCarbs}g`}
            target={`${carbsGoal}g`}
            progress={todayCarbs / Math.max(carbsGoal, 1)}
            barColor="bg-amber-500"
            badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          />

          {/* 4. FAT */}
          <MacroBar
            label="Fats"
            current={`${todayFat}g`}
            target={`${fatGoal}g`}
            progress={todayFat / Math.max(fatGoal, 1)}
            barColor="bg-rose-500"
            badgeColor="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
          />
        </div>
      </section>

      {/* QUICK ACTIONS GRID: RUNNING TRACKER REPLACES START WORKOUT */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {/* FREE FOREVER: OUTDOOR RUNNING */}
        <QuickAction
          to="/app/running"
          icon={Footprints}
          label="Track Running"
          colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        />

        {/* FREE FOREVER: LOG WEIGHT */}
        <QuickAction
          to="/app/profile"
          icon={TrendingUp}
          label="Log Weight"
          colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
        />

        {/* FREE FOREVER: LOG WATER & MEALS */}
        <QuickAction
          to="/app/nutrition"
          icon={Droplet}
          label="Log Water & Meals"
          colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        />

        {/* PREMIUM ONLY: ASK AI COACH */}
        <QuickAction
          to={hasAccess ? "/app/coach" : "/app/profile"}
          search={hasAccess ? undefined : { subscribe: "true" }}
          icon={hasAccess ? Sparkles : Lock}
          label="Ask NutriGuide AI"
          colorClass={
            hasAccess
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          }
          isLocked={!hasAccess}
        />
      </div>

      {/* WEIGHT PROGRESS SECTION */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Weight Progress</span>
            </p>
            <p className="mt-1 text-3xl sm:text-4xl font-extrabold text-foreground">
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
        <div className="rounded-3xl bg-emerald-600 p-6 text-white shadow-md">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Daily Motivation</p>
          <p className="mt-2 text-lg sm:text-xl font-extrabold leading-snug">
            "{quote?.text ?? "Consistency is what transforms average into excellence."}"
          </p>
          <p className="mt-3 text-xs font-semibold text-white/80">— {quote?.author ?? "NutriFit"}</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tip of the Day</p>
          <p className="mt-2 text-sm sm:text-base font-semibold text-foreground leading-relaxed">
            {tip ?? "Prioritize whole foods with balanced protein to maintain consistent energy throughout the day."}
          </p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="rounded-2xl border border-border bg-muted/30 p-4 shadow-xs space-y-2">
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

function QuickAction({
  to,
  search,
  icon: Icon,
  label,
  colorClass,
  isLocked = false,
}: {
  to: string;
  search?: any;
  icon: any;
  label: string;
  colorClass: string;
  isLocked?: boolean;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group relative flex flex-col items-start gap-3 rounded-3xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md active:scale-95 cursor-pointer"
    >
      {isLocked && (
        <span className="absolute right-3 top-3 rounded-md bg-amber-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-600 dark:text-amber-400 border border-amber-500/30">
          PRO
        </span>
      )}
      <div className={`grid h-10 w-10 place-items-center rounded-2xl border ${colorClass} transition-transform group-hover:scale-105 shrink-0`}>
        <Icon className="h-5 w-5 shrink-0" />
      </div>
      <span className="text-xs sm:text-sm font-extrabold text-foreground">{label}</span>
    </Link>
  );
}

export default HomePage;