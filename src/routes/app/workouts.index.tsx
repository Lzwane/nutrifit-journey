import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Flame, Dumbbell, Youtube, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FEATURED_YOUTUBE_WORKOUTS, Workout } from "@/data/workouts";

export const Route = createFileRoute("/app/workouts/")({
  head: () => ({
    meta: [
      { title: "Workouts — NutriFit" },
      { name: "description", content: "Browse guided workouts with real YouTube creators." },
    ],
  }),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cat, setCat] = useState<string>("all");
  const [diff, setDiff] = useState<string>("all");

  useEffect(() => {
  async function loadWorkouts() {
    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("title");

      if (!error && data && data.length > 0) {
        setWorkouts(data as Workout[]);
      } else {
        setWorkouts(FEATURED_YOUTUBE_WORKOUTS);
      }
    } catch {
      setWorkouts(FEATURED_YOUTUBE_WORKOUTS);
    }
  }

  loadWorkouts();
}, []);

  const filtered = useMemo(
    () =>
      workouts.filter(
        (w) => (cat === "all" || w.category === cat) && (diff === "all" || w.difficulty === diff)
      ),
    [workouts, cat, diff]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER WITH LIFETIME FREE BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Workouts
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Free Feature
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Pick a routine and follow along with real-time segment tracking.
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        <FilterGroup
          label="Category"
          value={cat}
          onChange={setCat}
          options={["all", "hiit", "cardio", "strength", "full_body"]}
        />
        <FilterGroup
          label="Level"
          value={diff}
          onChange={setDiff}
          options={["all", "beginner", "intermediate", "advanced"]}
        />
      </div>

      {/* WORKOUTS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((w) => (
          <Link
            key={w.id}
            to="/app/workouts/$id"
            params={{ id: w.id }}
            className="group overflow-hidden rounded-3xl border border-border bg-card transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="relative h-36 bg-gradient-to-r from-emerald-500/20 to-orange-500/20 p-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card/80 backdrop-blur-md border border-border text-primary shadow-xs">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {w.difficulty}
                </span>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500">
                  <Youtube className="h-3.5 w-3.5 fill-current" />
                  <span>{w.channel_name || "YouTube Creator"}</span>
                </div>

                <h3 className="font-display text-base font-extrabold text-foreground group-hover:text-primary transition line-clamp-2">
                  {w.title}
                </h3>
                <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {w.description}
                </p>
              </div>
            </div>

            <div className="p-5 pt-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {w.duration_minutes} min
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Flame className="h-3.5 w-3.5 text-orange-500" /> {w.estimated_calories} cal
                </span>
                <span className="capitalize font-bold text-foreground text-[11px]">{w.equipment}</span>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground py-8 text-center">
            No workouts match those filters.
          </p>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
      <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
            value === o
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}

export default WorkoutsPage;