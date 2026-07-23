import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NutriFitWordmark } from "@/components/app/logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NutriFit" },
      { name: "description", content: "Sign in or create your NutriFit account." },
      { property: "og:title", content: "Sign in — NutriFit" },
      { property: "og:description", content: "Sign in or create your NutriFit account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { full_name: name },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:p-12 gradient-brand text-white">
        <Link to="/"><NutriFitWordmark compact /></Link>
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-tight">Your health is your best partner.</h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Join thousands using NutriFit to train smarter, eat better and stay accountable.
          </p>
        </div>
        <p className="text-sm text-white/70">© {new Date().getFullYear()} NutriFit</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Link to="/"><NutriFitWordmark /></Link></div>
          <h2 className="font-display text-3xl font-extrabold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Log in to continue your journey." : "Start your NutriFit journey today."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </Field>
            )}
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="Password">
              <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </Field>

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl gradient-brand py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to NutriFit?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-primary"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
