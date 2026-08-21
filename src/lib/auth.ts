import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAIL = "officialnutrifit01@gmail.com";

/**
 * Helper utility to check if a given user has Admin privileges.
 */
export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

/**
 * Custom React hook for managing Supabase authentication state.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = isAdminUser(user);

  return { session, user, loading, isAdmin };
}