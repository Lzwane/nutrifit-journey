import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Flame, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/workouts/$id")({
  head: () => ({ meta: [{ title: "Workout — NutriFit" }, { name: "description", content: "Workout detail with exercises and guided video." }] }),
  component: WorkoutDetail,
});

function WorkoutDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [starting, setStarting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: w }, { data: ex }] = await Promise.all([
        supabase.from("workouts").select("*").eq("id", id).maybeSingle(),
        supabase.from("exercises").select("*").eq("workout_id", id).order("order_index"),
      ]);
      setWorkout(w);
      setExercises(ex ?? []);
    })();
  }, [id]);

  const start = async () => {
    if (!user) return;
    setStarting(true);
    const { data } = await supabase.from("workout_sessions").insert({ user_id: user.id, workout_id: id }).select("id").maybeSingle();
    setSessionId(data?.id ?? null);
    setStarting(false);
  };

  const complete = async () => {
    if (!sessionId) return;
    await supabase.from("workout_sessions").update({ completed_at: new Date().toISOString(), calories_burned: workout.estimated_calories }).eq("id", sessionId);
    navigate({ to: "/app" });
  };

  if (!workout) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Link to="/app/workouts" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> All workouts
      </Link>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {workout.video_url ? (
          <video src={workout.video_url} controls className="aspect-video w-full bg-black" />
        ) : (
          <div className="aspect-video gradient-brand" />
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-green-soft px-3 py-1 text-xs font-bold uppercase text-primary">{workout.difficulty}</span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">{workout.category.replace("_", " ")}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold">{workout.title}</h1>
          <p className="mt-2 text-muted-foreground">{workout.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {workout.duration_minutes} min</span>
            <span className="flex items-center gap-1"><Flame className="h-4 w-4" /> {workout.estimated_calories} cal</span>
            <span className="capitalize">Equipment: {workout.equipment}</span>
          </div>
          <div className="mt-6 flex gap-3">
            {!sessionId ? (
              <button onClick={start} disabled={starting} className="rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-60">
                {starting ? "Starting…" : "Start workout"}
              </button>
            ) : (
              <button onClick={complete} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft">
                <CheckCircle className="h-4 w-4" /> Mark complete
              </button>
            )}
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Exercises</h2>
        <div className="space-y-2">
          {exercises.map((e, i) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green-soft font-bold text-primary">{i + 1}</div>
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.sets} × {e.reps} · rest {e.rest_seconds}s</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
