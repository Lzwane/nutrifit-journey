import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface SubscriptionStatus {
  tier: "trial" | "premium" | "expired";
  daysLeft: number;
  isTrialActive: boolean;
  hasAccess: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();
  const [tier, setTier] = useState<"trial" | "premium" | "expired">("trial");
  const [daysLeft, setDaysLeft] = useState<number>(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchSubscription() {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("created_at, subscription_tier, subscription_expires_at, trial_start_date")
          .eq("id", user?.id)
          .maybeSingle();

        if (data) {
          const now = new Date();
          const startDate = new Date(data.trial_start_date || data.created_at || now);
          const trialEnd = new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days in ms

          const diffTime = trialEnd.getTime() - now.getTime();
          const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          setDaysLeft(diffDays);

          if (data.subscription_tier === "premium") {
            setTier("premium");
          } else if (diffDays > 0) {
            setTier("trial");
          } else {
            setTier("expired");
          }
        }
      } catch (err) {
        console.error("Failed to calculate subscription:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [user]);

  const isTrialActive = tier === "trial" && daysLeft > 0;
  const hasAccess = tier === "premium" || isTrialActive;

  return {
    tier,
    daysLeft,
    isTrialActive,
    hasAccess,
    loading,
  };
}