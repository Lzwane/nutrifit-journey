import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Flame, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/recipes/")({
  head: () => ({ meta: [{ title: "Recipes — NutriFit" }, { name: "description", content: "Healthy, macro-friendly recipes you can log in one tap." }] }),
  component: RecipesPage,
});

function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.from("recipes").select("*").order("title").then(({ data }) => setRecipes(data ?? []));
  }, []);

  const filtered = recipes.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Recipes</h1>
        <p className="text-sm text-muted-foreground">Discover meals and add them straight to your nutrition log.</p>
      </div>
      <input
        placeholder="Search recipes…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full max-w-md rounded-xl border border-input bg-card px-4 py-2.5 text-sm"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <Link key={r.id} to="/app/recipes/$id" params={{ id: r.id }} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-soft">
            <div className="grid h-40 place-items-center gradient-brand">
              <ChefHat className="h-12 w-12 text-white/90" />
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg font-bold">{r.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.prep_minutes + r.cook_minutes} min</span>
                <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {r.calories_per_serving} cal</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
