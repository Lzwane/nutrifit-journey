import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface SubscriptionStatus {
  isPremium: boolean;
  isTrialActive: boolean;
  isExpired: boolean;
  daysLeft: number;
  tierLabel: "Premium" | "Free Tier (Trial)" | "Free Tier";
  loading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    isTrialActive: false,
    isExpired: false,
    daysLeft: 60,
    tierLabel: "Free Tier",
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStatus((s) => ({ ...s, loading: false }));
      return;
    }

    const checkStatus = async () => {
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("created_at, subscription_tier, subscription_status, next_billing_date")
          .eq("id", user.id)
          .maybeSingle();

        if (p) {
          const now = new Date();
          const startDate = new Date(p.created_at || now);
          const trialEnd = new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000);
          const diffDays = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

          const isPrem =
            p.subscription_tier === "premium" &&
            p.subscription_status === "active" &&
            (!p.next_billing_date || new Date(p.next_billing_date) >= now);

          const isTrial = !isPrem && diffDays > 0;
          const isExp = !isPrem && diffDays === 0;

          setStatus({
            isPremium: isPrem,
            isTrialActive: isTrial,
            isExpired: isExp,
            daysLeft: diffDays,
            tierLabel: isPrem ? "Premium" : isTrial ? "Free Tier (Trial)" : "Free Tier",
            loading: false,
          });
        }
      } catch (err) {
        console.error("Subscription check error:", err);
        setStatus((s) => ({ ...s, loading: false }));
      }
    };

    checkStatus();
  }, [user]);

  return status;
}