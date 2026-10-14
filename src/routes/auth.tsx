import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NutriFitLogo } from "@/components/app/logo";
import { Download, Loader2, MailCheck } from "lucide-react";
import { InstallGuideModal } from "@/components/install-guide-modal";

const ADMIN_EMAILS = [
  "officialnutrifit01@gmail.com",
  "admin@nutrifit.co.za",
  "admin@nutrifit-app.co.za",
  "thobejanetheo803@gmail.com",
];

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type AuthMode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Install Modal & Standalone Detection
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(true);

  // Route user to /admin, /app (if completed), or /onboarding (if new)
  const routeUserAfterAuth = async (user: any) => {
    if (!user) return;

    const userEmail = (user.email || "").toLowerCase().trim();
    const isEmailAdmin = ADMIN_EMAILS.includes(userEmail);
    const isRoleAdmin = user.app_metadata?.role === "admin";

    if (isEmailAdmin || isRoleAdmin) {
      navigate({ to: "/admin" });
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, starting_weight_kg, goal_weight_kg")
        .eq("id", user.id)
        .maybeSingle();

      const hasCompletedOnboarding =
        profile?.onboarding_completed === true ||
        (profile?.starting_weight_kg !== null &&
          profile?.starting_weight_kg !== undefined &&
          profile?.goal_weight_kg !== null &&
          profile?.goal_weight_kg !== undefined);

      if (hasCompletedOnboarding) {
        navigate({ to: "/app" });
      } else {
        navigate({ to: "/onboarding" });
      }
    } catch {
      navigate({ to: "/onboarding" });
    }
  };

  useEffect(() => {
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://"));

    setIsStandaloneApp(isStandalone);

    if (!isStandalone) {
      const hasSeen = localStorage.getItem("nutrifit_install_seen");
      if (!hasSeen) {
        setShowInstallGuide(true);
      }
    }

    // Handle OAuth redirects (Google sign-in)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await routeUserAfterAuth(session.user);
        }
      }
    );

    // Check existing active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        routeUserAfterAuth(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleCloseGuide = () => {
    localStorage.setItem("nutrifit_install_seen", "true");
    setShowInstallGuide(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        setSuccessMsg("Password reset email sent! Please check your inbox.");
      } else if (mode === "signup") {
        if (ADMIN_EMAILS.includes(cleanEmail)) {
          setErrorMsg("This email is reserved for system administration. Please sign in instead.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            },
          },
        });

        if (error) throw error;

        // If email confirmation is required by Supabase
        if (data.user && !data.session) {
          setSuccessMsg(
            `A confirmation link has been sent to ${cleanEmail}. Please verify your email before continuing!`
          );
        } else if (data.user && data.session) {
          await routeUserAfterAuth(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        if (data.user) {
          await routeUserAfterAuth(data.user);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setOauthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect to Google.");
      setOauthLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-between bg-background px-4 py-10 sm:py-16 font-sans">
      {!isStandaloneApp && (
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={() => setShowInstallGuide(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary shadow-xs transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install App</span>
          </button>
        </div>
      )}

      <InstallGuideModal isOpen={showInstallGuide} onClose={handleCloseGuide} />

      <div className="hidden sm:block" />

      <div className="my-auto w-full max-w-md space-y-7 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
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
            {mode === "signup"
              ? "Create an account"
              : mode === "forgot"
              ? "Reset password"
              : "Welcome back"}
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            {mode === "signup"
              ? "Enter your details below to get started"
              : mode === "forgot"
              ? "Enter your email address to receive a recovery link"
              : "Enter your credentials to access your account"}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-center text-xs font-medium text-destructive animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 space-y-1 animate-in fade-in">
            <MailCheck className="h-5 w-5 mx-auto text-emerald-500" />
            <p>{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="text"
                  id="firstName"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder=" "
                  className="peer w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <label
                  htmlFor="firstName"
                  className="pointer-events-none absolute left-3 top-3 origin-left text-xs font-medium text-muted-foreground transition-all duration-200 peer-placeholder-shown:translate-y-0.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-card peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-primary"
                >
                  First Name
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="lastName"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder=" "
                  className="peer w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <label
                  htmlFor="lastName"
                  className="pointer-events-none absolute left-3 top-3 origin-left text-xs font-medium text-muted-foreground transition-all duration-200 peer-placeholder-shown:translate-y-0.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-card peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-primary"
                >
                  Last Name
                </label>
              </div>
            </div>
          )}

          <div className="relative">
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              className="peer w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <label
              htmlFor="email"
              className="pointer-events-none absolute left-3 top-3 origin-left text-xs font-medium text-muted-foreground transition-all duration-200 peer-placeholder-shown:translate-y-0.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-card peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-primary"
            >
              Email Address
            </label>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <label
                  htmlFor="password"
                  className="pointer-events-none absolute left-3 top-3 origin-left text-xs font-medium text-muted-foreground transition-all duration-200 peer-placeholder-shown:translate-y-0.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:left-3 peer-focus:bg-card peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-primary peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:bg-card peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-primary"
                >
                  Password
                </label>
              </div>

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="cursor-pointer text-xs text-muted-foreground transition hover:text-primary"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || oauthLoading}
            className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>
              {loading
                ? "Processing..."
                : mode === "forgot"
                ? "Send Reset Link"
                : mode === "signup"
                ? "Create Account"
                : "Sign In"}
            </span>
          </button>
        </form>

        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-border" />
          <span className="absolute bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            or continue with
          </span>
        </div>

        <div>
          <button
            type="button"
            disabled={oauthLoading || loading}
            onClick={handleGoogleLogin}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-input bg-background py-3 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground active:scale-[0.99] disabled:opacity-50"
          >
            {oauthLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>{oauthLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>
        </div>

        <div className="pt-2 text-center text-xs text-muted-foreground sm:text-sm">
          {mode === "signup" ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="cursor-pointer font-semibold text-primary underline-offset-4 hover:underline"
              >
                Create account
              </button>
            </p>
          )}
        </div>
      </div>

      <footer className="mt-8 text-center text-[11px] text-muted-foreground/50 sm:text-xs">
        © 2026 NutriFit · Your Health is Your Best Partner
      </footer>
    </div>
  );
}

export default AuthPage;