import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, Flame, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/workouts/")({
  head: () => ({ meta: [{ title: "Workouts — NutriFit" }, { name: "description", content: "Browse guided workouts by category, difficulty and equipment." }] }),
  component: WorkoutsPage,
});

type Workout = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  equipment: string;
  duration_minutes: number;
  estimated_calories: number | null;
  muscle_groups: string[] | null;
};

function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cat, setCat] = useState<string>("all");
  const [diff, setDiff] = useState<string>("all");

  useEffect(() => {
    supabase.from("workouts").select("*").order("title").then(({ data }) => setWorkouts((data as Workout[]) ?? []));
  }, []);

  const filtered = useMemo(
    () => workouts.filter((w) => (cat === "all" || w.category === cat) && (diff === "all" || w.difficulty === diff)),
    [workouts, cat, diff]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Workouts</h1>
        <p className="text-sm text-muted-foreground">Pick a routine and start moving.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterGroup label="Category" value={cat} onChange={setCat} options={["all", "full_body", "strength", "cardio", "hiit", "yoga", "mobility"]} />
        <FilterGroup label="Level" value={diff} onChange={setDiff} options={["all", "beginner", "intermediate", "advanced"]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((w) => (
          <Link
            key={w.id}
            to="/app/workouts/$id"
            params={{ id: w.id }}
            className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-soft"
          >
            <div className="relative h-32 gradient-brand">
              <Dumbbell className="absolute right-4 top-4 h-8 w-8 text-white/80" />
              <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--brand-green)" }}>
                {w.difficulty}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg font-bold">{w.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{w.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {w.duration_minutes} min</span>
                <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {w.estimated_calories} cal</span>
                <span className="capitalize">{w.equipment}</span>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No workouts match those filters.</p>}
      </div>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
            value === o ? "gradient-brand text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}
