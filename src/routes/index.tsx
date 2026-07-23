import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, Apple, ChefHat, Users, Sparkles, ArrowRight, Check } from "lucide-react";
import { NutriFitWordmark } from "@/components/app/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriFit — Your Health is Your Best Partner" },
      { name: "description", content: "All-in-one workouts, nutrition, recipes, community and AI coaching. R49/month." },
      { property: "og:title", content: "NutriFit — Your Health is Your Best Partner" },
      { property: "og:description", content: "All-in-one workouts, nutrition, recipes, community and AI coaching." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <NutriFitWordmark />
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth" className="rounded-xl gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-soft">
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-green-soft px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> AI-powered fitness coaching
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight lg:text-6xl">
              Your health is your <span className="text-gradient-brand">best partner.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Workouts, nutrition, recipes, community and a personal AI coach — all in one beautifully simple app.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing" className="inline-flex items-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold">
                See pricing
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free forever plan · Premium from R49/month</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl gradient-brand opacity-20 blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4">
              <FeatureCard icon={Dumbbell} title="Workouts" text="HD-guided routines for every level." tone="green" />
              <FeatureCard icon={Apple} title="Nutrition" text="Track calories &amp; macros easily." tone="orange" />
              <FeatureCard icon={ChefHat} title="Recipes" text="Healthy meals, one-click logging." tone="orange" />
              <FeatureCard icon={Users} title="Community" text="Join local fitness groups." tone="green" />
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          <PlanCard
            name="Free"
            price="R0"
            cadence="forever"
            features={["Home dashboard", "Basic progress tracking", "5 AI coach questions/day", "Community browsing"]}
          />
          <PlanCard
            name="Premium"
            price="R49"
            cadence="/month"
            highlighted
            features={[
              "Full workout library + HD videos",
              "Complete recipe library",
              "Unlimited AI coach questions",
              "Advanced progress analytics",
              "All community features",
            ]}
          />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <NutriFitWordmark />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} NutriFit · Your Health is Your Best Partner</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text, tone }: { icon: typeof Dumbbell; title: string; text: string; tone: "green" | "orange" }) {
  const bg = tone === "green" ? "bg-brand-green-soft" : "bg-brand-orange-soft";
  const color = tone === "green" ? "var(--brand-green)" : "var(--brand-orange)";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${bg}`}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PlanCard({ name, price, cadence, features, highlighted }: { name: string; price: string; cadence: string; features: string[]; highlighted?: boolean }) {
  return (
    <div className={`rounded-3xl border p-8 ${highlighted ? "border-transparent gradient-brand text-white shadow-glow" : "border-border bg-card"}`}>
      <h3 className="font-display text-2xl font-extrabold">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-5xl font-extrabold">{price}</span>
        <span className={highlighted ? "text-white/80" : "text-muted-foreground"}>{cadence}</span>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <Link
        to="/auth"
        className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold ${
          highlighted ? "bg-white text-foreground" : "gradient-brand text-white"
        }`}
      >
        {highlighted ? "Go Premium" : "Start free"}
      </Link>
    </div>
  );
}
