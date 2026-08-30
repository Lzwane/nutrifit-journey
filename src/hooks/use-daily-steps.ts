import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getLocalTodayDate } from "@/lib/date-utils";

export function useDailySteps() {
  const { user } = useAuth();
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Fetch steps for current local day (00:00 - 23:59)
  const fetchTodaySteps = useCallback(async () => {
    if (!user) return;
    const localToday = getLocalTodayDate();

    try {
      const { data, error } = await supabase
        .from("daily_step_logs")
        .select("step_count")
        .eq("user_id", user.id)
        .eq("log_date", localToday)
        .maybeSingle();

      if (!error) {
        setTodaySteps(data?.step_count || 0);
      }
    } catch (err) {
      console.error("Failed to load daily steps:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 2. Increment steps safely
  const addSteps = useCallback(
    async (count: number) => {
      if (!user || count <= 0) return;
      const localToday = getLocalTodayDate();

      // Optimistic update on frontend
      setTodaySteps((prev) => prev + count);

      try {
        const { data, error } = await (supabase.rpc as any)("increment_daily_steps", {
          step_increment: count,
          target_date: localToday,
        });

        if (!error && typeof data === "number") {
          setTodaySteps(data);
        }
      } catch (err) {
        console.error("Failed to increment steps:", err);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchTodaySteps();

    // 3. Midnight auto-reset timer: Detect when day changes from 23:59 to 00:00
    const checkMidnightInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 10) {
        fetchTodaySteps();
      }
    }, 10000);

    return () => clearInterval(checkMidnightInterval);
  }, [fetchTodaySteps]);

  return {
    todaySteps,
    addSteps,
    refreshSteps: fetchTodaySteps,
    loading,
    currentDate: getLocalTodayDate(),
  };
}