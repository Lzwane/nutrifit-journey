import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Flame, Users, Plus, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/recipes/$id")({
  head: () => ({ meta: [{ title: "Recipe — NutriFit" }, { name: "description", content: "Recipe details with ingredients, instructions and one-click logging." }] }),
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [r, setR] = useState<any>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    supabase.from("recipes").select("*").eq("id", id).maybeSingle().then(({ data }) => setR(data));
  }, [id]);

  const addToLog = async () => {
    if (!user || !r) return;
    await supabase.from("food_logs").insert({
      user_id: user.id,
      name: r.title,
      calories: r.calories_per_serving ?? 0,
      protein_g: r.protein_g ?? 0,
      carbs_g: r.carbs_g ?? 0,
      fat_g: r.fat_g ?? 0,
      fiber_g: r.fiber_g ?? 0,
    });
    setAdded(true);
  };

  if (!r) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Link to="/app/recipes" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> All recipes
      </Link>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid h-48 place-items-center gradient-brand">
          <ChefHat className="h-16 w-16 text-white/90" />
        </div>
        <div className="p-6">
          <h1 className="font-display text-3xl font-extrabold">{r.title}</h1>
          <p className="mt-2 text-muted-foreground">{r.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {r.prep_minutes + r.cook_minutes} min</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {r.servings} servings</span>
            <span className="flex items-center gap-1"><Flame className="h-4 w-4" /> {r.calories_per_serving} cal / serving</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            {["protein_g", "carbs_g", "fat_g", "fiber_g"].map((k) => (
              <div key={k} className="rounded-lg bg-muted px-2 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.replace("_g", "")}</p>
                <p className="font-bold">{r[k] ?? 0}g</p>
              </div>
            ))}
          </div>
          <button
            onClick={addToLog}
            disabled={added}
            className="mt-6 inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {added ? "Added to log ✓" : "Add to nutrition log"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-3 font-display text-lg font-bold">Ingredients</h2>
          <ul className="space-y-2 text-sm">
            {(r.ingredients ?? []).map((ing: any, i: number) => (
              <li key={i} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                <span>{ing.item}</span>
                <span className="text-muted-foreground">{ing.amount}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-3 font-display text-lg font-bold">Instructions</h2>
          <ol className="space-y-3 text-sm">
            {(r.instructions ?? []).map((step: string, i: number) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-green-soft text-xs font-bold text-primary">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
