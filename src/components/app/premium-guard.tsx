import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ShieldAlert, ArrowRight } from "lucide-react";

export function PremiumLockedScreen({ featureName }: { featureName: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto min-h-[60vh] space-y-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg">
        <Lock className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20">
          60-Day Free Trial Expired
        </span>
        <h2 className="font-display text-2xl font-extrabold text-foreground">
          {featureName} is a Premium Feature
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your 60-day full-access trial period has ended. Upgrade to <strong>NutriFit Premium</strong> to unlock unlimited access to NutriGuide AI, verified recipes, and dietitian meal plans.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-muted/40 border border-border w-full text-left space-y-1.5 text-xs text-muted-foreground">
        <span className="font-bold text-foreground block">Free Features Still Available to You:</span>
        <p>✓ Access all Workout Video Routines</p>
        <p>✓ Daily Nutrition &amp; Macro Logging</p>
        <p>✓ NutriFit Community Group Chats</p>
      </div>

      <Link
        to="/app/profile"
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition"
      >
        <Sparkles className="h-4 w-4" /> View Premium Upgrade Options <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}