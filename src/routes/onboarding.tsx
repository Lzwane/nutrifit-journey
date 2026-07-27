import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NutriFitLogo } from "@/components/app/logo";
import { ArrowRight, ArrowLeft, Check, Sparkles, Scale, Target, Flame, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Question Inputs
  const [heightCm, setHeightCm] = useState("");
  const [startingWeightKg, setStartingWeightKg] = useState("");
  const [goalWeightKg, setGoalWeightKg] = useState("");
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(2000);
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [fitnessGoal, setFitnessGoal] = useState("maintain");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      } else {
        // Fallback to auth if no user session found
        navigate({ to: "/auth" });
      }
    });
  }, [navigate]);

  const getSuggestedGoalWeights = () => {
    const sw = Number(startingWeightKg) || 70;
    return [
      { label: "Fat Loss (-5kg)", value: Math.max(40, Math.round((sw - 5) * 10) / 10) },
      { label: "Moderate Target (-10kg)", value: Math.max(40, Math.round((sw - 10) * 10) / 10) },
      { label: "Lean Muscle Gain (+5kg)", value: Math.round((sw + 5) * 10) / 10 },
    ];
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);

    try {
      const activeUser = userId || (await supabase.auth.getUser()).data.user?.id;

      if (activeUser) {
        const sw = Number(startingWeightKg) || 70;
        const gw = Number(goalWeightKg) || sw;
        const h = Number(heightCm) || 170;

        await supabase.from("profiles").upsert({
          id: activeUser,
          height_cm: h,
          starting_weight_kg: sw,
          current_weight_kg: sw,
          goal_weight_kg: gw,
          daily_calorie_goal: dailyCalorieGoal,
          activity_level: activityLevel,
          fitness_goal: fitnessGoal,
        } as any);

        await supabase.from("weight_logs").insert({
          user_id: activeUser,
          weight_kg: sw,
        } as any);
      }
    } catch (err) {
      console.error("Onboarding profile save notice:", err);
    } finally {
      setLoading(false);
      // Navigates directly to the dashboard when button is clicked
      navigate({ to: "/app" });
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between bg-background px-4 py-10 sm:py-16">
      <div className="hidden sm:block" />

      <div className="my-auto w-full max-w-md space-y-7 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted p-2 shadow-inner">
              <NutriFitLogo className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                <span style={{ color: "var(--brand-green)" }}>Nutri</span>
                <span style={{ color: "var(--brand-orange)" }}>Fit</span>
              </span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">
                Nutrition &amp; Fitness
              </span>
            </div>
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Setup Your Goals
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            Step {step} of 5 — Personalizing your fitness journey
          </p>
        </div>

        {/* STEP 1: Height & Weight */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Scale className="h-4 w-4" /> Height &amp; Estimated Weight
            </div>

            <div className="relative">
              <input
                type="number"
                id="heightCm"
                required
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder=" "
                className="peer w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <label
                htmlFor="heightCm"
                className="pointer-events-none absolute left-3 top-3.5 origin-left text-sm font-medium text-muted-foreground transition-all duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:-translate-y-0 peer-focus:bg-card peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-primary"
              >
                Height in cm (e.g. 175)
              </label>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.1"
                id="startingWeight"
                required
                value={startingWeightKg}
                onChange={(e) => setStartingWeightKg(e.target.value)}
                placeholder=" "
                className="peer w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <label
                htmlFor="startingWeight"
                className="pointer-events-none absolute left-3 top-3.5 origin-left text-sm font-medium text-muted-foreground transition-all duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:-translate-y-0 peer-focus:bg-card peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-primary"
              >
                Estimated / Starting Weight in kg (e.g. 75.5)
              </label>
            </div>

            <button
              type="button"
              disabled={!heightCm || !startingWeightKg}
              onClick={() => setStep(2)}
              className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Goal Weight Suggestions */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Target className="h-4 w-4" /> Goal Weight Suggestions
            </div>

            <p className="text-xs text-muted-foreground">
              Based on your starting weight ({startingWeightKg || "70"} kg), choose a recommended target:
            </p>

            <div className="grid gap-2">
              {getSuggestedGoalWeights().map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setGoalWeightKg(sug.value.toString())}
                  className={`cursor-pointer flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold transition ${
                    goalWeightKg === sug.value.toString()
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{sug.label}</span>
                  <span className="font-extrabold">{sug.value} kg</span>
                </button>
              ))}
            </div>

            <div className="relative pt-1">
              <input
                type="number"
                step="0.1"
                id="goalWeight"
                value={goalWeightKg}
                onChange={(e) => setGoalWeightKg(e.target.value)}
                placeholder=" "
                className="peer w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <label
                htmlFor="goalWeight"
                className="pointer-events-none absolute left-3 top-3.5 origin-left text-sm font-medium text-muted-foreground transition-all duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:-translate-y-0 peer-focus:bg-card peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-primary"
              >
                Or Enter Custom Goal Weight (kg)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="cursor-pointer rounded-xl border border-border bg-card px-4 py-3.5 text-xs font-bold text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!goalWeightKg}
                onClick={() => setStep(3)}
                className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Daily Calorie Goal */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Flame className="h-4 w-4" /> Daily Calorie Goal (kcal)
            </div>

            <div className="grid gap-2">
              {[
                { kcal: 1600, label: "Weight Loss Deficit", sub: "1600 kcal / day" },
                { kcal: 2000, label: "Balanced Maintenance", sub: "2000 kcal / day" },
                { kcal: 2400, label: "Active Athletic Target", sub: "2400 kcal / day" },
                { kcal: 2800, label: "Muscle Growth Surplus", sub: "2800 kcal / day" },
              ].map((opt) => (
                <button
                  key={opt.kcal}
                  type="button"
                  onClick={() => setDailyCalorieGoal(opt.kcal)}
                  className={`cursor-pointer flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                    dailyCalorieGoal === opt.kcal
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.sub}</p>
                  </div>
                  {dailyCalorieGoal === opt.kcal && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="cursor-pointer rounded-xl border border-border bg-card px-4 py-3.5 text-xs font-bold text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Activity Level */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Dumbbell className="h-4 w-4" /> Activity Level
            </div>

            <div className="grid gap-2">
              {[
                { id: "sedentary", label: "Sedentary", sub: "Little or no exercise" },
                { id: "light", label: "Lightly Active", sub: "Exercise 1-3 days/week" },
                { id: "moderate", label: "Moderately Active", sub: "Exercise 3-5 days/week" },
                { id: "active", label: "Very Active", sub: "Exercise 6-7 days/week" },
                { id: "very_active", label: "Extremely Active", sub: "Physical job or 2x training" },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setActivityLevel(act.id)}
                  className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 text-left transition ${
                    activityLevel === act.id
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold">{act.label}</p>
                    <p className="text-[10px] text-muted-foreground">{act.sub}</p>
                  </div>
                  {activityLevel === act.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="cursor-pointer rounded-xl border border-border bg-card px-4 py-3.5 text-xs font-bold text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Primary Fitness Goal */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Sparkles className="h-4 w-4" /> Primary Fitness Goal
            </div>

            <div className="grid gap-2">
              {[
                { id: "lose_weight", label: "Weight Loss & Fat Reduction" },
                { id: "maintain", label: "Maintain Weight & Improve Energy" },
                { id: "gain_muscle", label: "Muscle Gain & Hypertrophy" },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setFitnessGoal(g.id)}
                  className={`cursor-pointer flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                    fitnessGoal === g.id
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-xs font-bold">{g.label}</span>
                  {fitnessGoal === g.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="cursor-pointer rounded-xl border border-border bg-card px-4 py-3.5 text-xs font-bold text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCompleteOnboarding}
                className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Finishing..." : "Start NutriFit Journey 🎉"}
              </button>
            </div>
          </div>
        )}

      </div>

      <footer className="mt-8 text-center text-[11px] text-muted-foreground/50 sm:text-xs">
        © 2026 NutriFit · Your Health is Your Best Partner
      </footer>
    </div>
  );
}