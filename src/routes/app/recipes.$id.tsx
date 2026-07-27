import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Flame, Users, Plus, ChefHat, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { POPULAR_RECIPES } from "./recipes.index";

export const Route = createFileRoute("/app/recipes/$id")({
  head: () => ({
    meta: [
      { title: "Recipe — NutriFit" },
      { name: "description", content: "Recipe details with ingredients, instructions and one-click logging." },
    ],
  }),
  component: RecipeDetail,
});

// Detailed ingredient & step fallbacks for all local SA recipes
const LOCAL_RECIPE_DETAILS: Record<string, { ingredients: { item: string; amount: string }[]; instructions: string[] }> = {
  "chakalaka-chicken-breast": {
    ingredients: [
      { item: "Chicken Breast", amount: "200g" },
      { item: "Grated Carrots & Chopped Peppers", amount: "1 cup" },
      { item: "Baked Beans in Tomato Sauce", amount: "1/2 cup" },
      { item: "Cooked Brown Rice", amount: "3/4 cup" },
      { item: "Chili Powder & Garlic", amount: "1 tsp" },
    ],
    instructions: [
      "Pan-fry grated carrots, peppers, and chili powder in 1 tsp oil for 5 mins; stir in baked beans to make chakalaka.",
      "Season chicken breast with salt and black pepper.",
      "Grill chicken breast in a skillet on medium heat for 6-7 mins per side.",
      "Serve hot chicken over brown rice topped generously with warm chakalaka.",
    ],
  },
  "pilchards-fish-cakes": {
    ingredients: [
      { item: "Canned Pilchards in Tomato Sauce", amount: "1 can (400g)" },
      { item: "Mashed Boiled Potatoes", amount: "1.5 cups" },
      { item: "Finely Diced Onion", amount: "1/2 cup" },
      { item: "Egg (beaten)", amount: "1" },
      { item: "Cake Flour or Oat Flour", amount: "2 tbsp" },
    ],
    instructions: [
      "Drain excess sauce from canned pilchards and remove large central bones.",
      "In a large bowl, mash pilchards together with boiled potatoes, onion, egg, and flour.",
      "Shape mixture into 4 flat round fish cakes.",
      "Pan-fry in a light spray of oil over medium heat for 4 minutes per side until golden brown.",
    ],
  },
  "boerewors-sweet-potato-skillet": {
    ingredients: [
      { item: "Lean Beef Boerewors (sliced)", amount: "180g" },
      { item: "Diced Sweet Potato", amount: "1.5 cups" },
      { item: "Sliced Green Bell Pepper", amount: "1/2 cup" },
      { item: "Sliced Red Onion", amount: "1/2 cup" },
      { item: "Braai Seasoning", amount: "1 tsp" },
    ],
    instructions: [
      "Cover and steam diced sweet potatoes in a pan with 2 tbsp water for 8 mins until tender.",
      "Add sliced boerewors, onions, and bell peppers to the skillet.",
      "Sauté everything over medium-high heat until boerewors is browned and cooked through.",
      "Season with braai spice and serve warm.",
    ],
  },
  "amahewu-banana-protein-shake": {
    ingredients: [
      { item: "Traditional Mageu / Amahewu (Banana or Cream flavor)", amount: "1 cup (250ml)" },
      { item: "Vanilla Whey Protein Powder", amount: "1 scoop (30g)" },
      { item: "Ripe Banana", amount: "1" },
      { item: "Ice Cubes", amount: "1/2 cup" },
    ],
    instructions: [
      "Pour Mageu/Amahewu and cold water into a blender.",
      "Add vanilla protein powder, sliced banana, and ice cubes.",
      "Blend on high speed for 45 seconds until smooth and creamy.",
      "Pour into a tall glass and enjoy as an energetic post-workout breakfast.",
    ],
  },
  "spinach-mealie-pap-egg-bake": {
    ingredients: [
      { item: "Cooked Stiff Mealie Pap", amount: "1.5 cups" },
      { item: "Chopped Fresh Spinach (Morogo)", amount: "2 cups" },
      { item: "Liquid Egg Whites", amount: "1 cup" },
      { item: "Crumbled Feta Cheese", amount: "30g" },
      { item: "Garlic & Onion Powder", amount: "1/2 tsp" },
    ],
    instructions: [
      "Sauté spinach with garlic powder until wilted; drain off excess liquid.",
      "Spread cooked stiff pap across the bottom of a greased baking dish.",
      "Layer wilted spinach on top, pour over liquid egg whites, and sprinkle feta cheese.",
      "Bake at 180°C for 20 minutes until egg is set and cheese is slightly browned.",
    ],
  },
  "chicken-livers-wholewheat-toast": {
    ingredients: [
      { item: "Fresh Cleaned Chicken Livers", amount: "200g" },
      { item: "Chopped Onion & Tomato Paste", amount: "2 tbsp each" },
      { item: "Nando's / Peri-Peri Sauce", amount: "2 tbsp" },
      { item: "Brown Bread (Toasted)", amount: "2 slices" },
    ],
    instructions: [
      "Sauté chopped onions in a non-stick pan with cooking spray until soft.",
      "Add chicken livers and cook for 4-5 minutes until browned on the outside but still tender inside.",
      "Stir in tomato paste and peri-peri sauce; simmer for 2 minutes.",
      "Spoon hot peri-peri chicken livers over warm wholewheat toast.",
    ],
  },
  "cape-malay-lean-beef-bobotie": {
    ingredients: [
      { item: "Lean Beef Mince (90/10)", amount: "200g" },
      { item: "Slice Brown Bread (soaked in milk)", amount: "1" },
      { item: "Cape Malay Mild Curry Powder", amount: "1 tbsp" },
      { item: "Raisins or Sultanas", amount: "1 tbsp" },
      { item: "Egg + 3 tbsp Milk", amount: "1 egg mix" },
      { item: "Bay Leaves", amount: "2" },
    ],
    instructions: [
      "Sauté mince with onions and Cape Malay curry powder until browned; mix in soaked bread and raisins.",
      "Spoon seasoned mince into a small oven dish and press flat.",
      "Beat egg with milk and pour over mince; place bay leaves on top.",
      "Bake at 180°C for 20-25 minutes until custard top is firm and golden.",
    ],
  },
  "snoek-sweet-potato-mash": {
    ingredients: [
      { item: "Fresh Snoek Fillet", amount: "200g" },
      { item: "Smooth Apricot Jam (Low Sugar)", amount: "1 tbsp" },
      { item: "Melted Butter & Lemon Juice", amount: "1 tsp each" },
      { item: "Mashed Orange Sweet Potato", amount: "1 cup" },
    ],
    instructions: [
      "Melt butter and mix with apricot jam and lemon juice to form glaze.",
      "Brush glaze over snoek fillet and grill/braai skin-side down for 8 mins.",
      "Flip carefully and grill for 4 more minutes until flaky.",
      "Serve with warm mashed sweet potatoes.",
    ],
  },
  "masala-chicken-cottage-cheese-wrap": {
    ingredients: [
      { item: "Chicken Breast Strips", amount: "180g" },
      { item: "Tikka Masala Spice", amount: "1 tbsp" },
      { item: "Low-Fat Cottage Cheese", amount: "1/4 cup" },
      { item: "Wholewheat Roti or Wrap", amount: "1" },
      { item: "Shredded Lettuce & Cucumber", amount: "1/2 cup" },
    ],
    instructions: [
      "Toss chicken strips in tikka masala spice and pan-sear for 6 minutes until cooked.",
      "Spread low-fat cottage cheese over wholewheat roti.",
      "Add shredded lettuce, cucumber, and hot tikka chicken strips.",
      "Roll up tightly and cut in half.",
    ],
  },
  "shisa-nyama-pork-chops-chakalaka": {
    ingredients: [
      { item: "Lean Pork Chop (fat trimmed)", amount: "200g" },
      { item: "Braai Salt & Black Pepper", amount: "1 tsp" },
      { item: "Cooked Stiff Pap", amount: "1 cup" },
      { item: "Mild Vegetable Chakalaka", amount: "1/2 cup" },
    ],
    instructions: [
      "Season pork chop with braai salt.",
      "Grill over medium-high heat on the stove or braai for 5-6 mins per side.",
      "Plate stiff pap alongside warm chakalaka.",
      "Slice pork chop and serve hot.",
    ],
  },
  "butternut-lentil-curry-stew": {
    ingredients: [
      { item: "Brown Lentils (cooked/canned)", amount: "1.5 cups" },
      { item: "Cubed Butternut Squash", amount: "1.5 cups" },
      { item: "Medium Rajah Curry Powder", amount: "1 tbsp" },
      { item: "Chopped Tomatoes & Garlic", amount: "1/2 cup" },
    ],
    instructions: [
      "Steam cubed butternut until fork-tender.",
      "Sauté garlic, onion, and Rajah curry powder in a pot.",
      "Add chopped tomatoes, cooked brown lentils, and steamed butternut.",
      "Simmer for 15 minutes to allow flavors to meld together.",
    ],
  },
  "braai-chicken-drumsticks-pap": {
    ingredients: [
      { item: "Skinless Chicken Drumsticks", amount: "3 (approx 220g)" },
      { item: "Nando's / Steers Peri-Peri Sauce", amount: "2 tbsp" },
      { item: "Cooked Stiff Pap", amount: "1 cup" },
      { item: "Chicken Braai Salt", amount: "1 tsp" },
    ],
    instructions: [
      "Season chicken drumsticks with braai salt and brush generously with peri-peri sauce.",
      "Pan-roast or braai drumsticks over medium heat for 20-25 minutes, turning frequently until cooked to the bone.",
      "Prepare stiff pap in a pot with boiling water and salt; stir until smooth.",
      "Serve hot drumsticks over warm pap.",
    ],
  },
  "savory-mince-wholewheat-vetkoek": {
    ingredients: [
      { item: "Lean Beef Mince (90/10)", amount: "180g" },
      { item: "Wholewheat Dough / Air-Fryer Dough", amount: "1 ball (80g)" },
      { item: "Rajah Mild Curry Powder", amount: "1 tsp" },
      { item: "Diced Onion & Tomato Paste", amount: "2 tbsp each" },
    ],
    instructions: [
      "Shape dough into a ball and air-fry at 180°C for 12 minutes (or oven bake until golden and hollow).",
      "Sauté lean beef mince with onions, curry powder, and tomato paste for 8-10 mins until fully cooked.",
      "Slice warm vetkoek open and fill with savory mince.",
    ],
  },
  "creamy-peanut-butter-oat-porridge": {
    ingredients: [
      { item: "Jungle Oats", amount: "1/2 cup (40g)" },
      { item: "Water or Milk", amount: "1 cup" },
      { item: "Liquid Egg Whites", amount: "1/3 cup" },
      { item: "Black Cat Peanut Butter", amount: "1 tbsp" },
      { item: "Honey & Cinnamon", amount: "1 tsp" },
    ],
    instructions: [
      "Simmer Jungle Oats in water/milk on low heat for 3 minutes.",
      "Whisk in liquid egg whites rapidly to prevent clumping and create a super creamy texture.",
      "Cook for another 2 minutes until thick.",
      "Stir in peanut butter, drizzle honey, and sprinkle cinnamon.",
    ],
  },
  "spicy-beef-kota-fitness-style": {
    ingredients: [
      { item: "Wholewheat Loaf (Quarter section)", amount: "1/4 loaf" },
      { item: "Rump / Sirloin Steak Strips", amount: "150g" },
      { item: "Fried Egg (cooked with light spray)", amount: "1" },
      { item: "Chakalaka", amount: "2 tbsp" },
    ],
    instructions: [
      "Hollow out the middle crumb of the quarter bread loaf.",
      "Flash-fry steak strips in a hot pan with steak & chops spice for 4 minutes.",
      "Layer warm chakalaka inside the bread hollow, add steak strips, and top with a fried egg.",
      "Place bread top back on and press gently before eating.",
    ],
  },
  "tinned-sardine-tomato-pasta": {
    ingredients: [
      { item: "Tinned Sardines in Tomato Sauce", amount: "1 can (120g)" },
      { item: "Wholewheat Spaghetti", amount: "70g (dry)" },
      { item: "Chopped Tomatoes & Minced Garlic", amount: "1/2 cup" },
      { item: "Dried Oregano & Chili Flakes", amount: "1/2 tsp" },
    ],
    instructions: [
      "Boil wholewheat spaghetti in salted water until al dente.",
      "In a small pan, sauté garlic, chopped tomatoes, and sardines in tomato sauce for 5 mins.",
      "Flake sardines gently with a fork and season with oregano.",
      "Toss cooked spaghetti directly into sardine sauce and serve hot.",
    ],
  },
  "curried-egg-salad-toast": {
    ingredients: [
      { item: "Hard-Boiled Eggs", amount: "2 large" },
      { item: "Plain Greek Yogurt", amount: "2 tbsp" },
      { item: "Mild Curry Powder", amount: "1/2 tsp" },
      { item: "Wholewheat Toast", amount: "2 slices" },
    ],
    instructions: [
      "Peel hard-boiled eggs and mash in a bowl with a fork.",
      "Mix in Greek yogurt, mild curry powder, salt, and black pepper.",
      "Spread egg salad generously over toasted wholewheat bread slices.",
    ],
  },
  "durban-mutton-curry-cauli-rice": {
    ingredients: [
      { item: "Lean Beef or Lamb Stew Cubes", amount: "180g" },
      { item: "Durban Hot Curry Powder", amount: "1 tbsp" },
      { item: "Grated Cauliflower (Cauli-rice)", amount: "1.5 cups" },
      { item: "Diced Potato & Tomato", amount: "1/2 cup" },
    ],
    instructions: [
      "Brown beef cubes with onions and Durban curry spice in a pot.",
      "Add diced tomatoes, a splash of water, and potato cubes; simmer covered for 30 minutes.",
      "Steam riced cauliflower in a microwave or skillet for 3 minutes.",
      "Serve rich curry over fluffy cauli-rice.",
    ],
  },
  "cheesy-sweet-corn-egg-muffins": {
    ingredients: [
      { item: "Whole Eggs", amount: "3" },
      { item: "Liquid Egg Whites", amount: "1/2 cup" },
      { item: "Canned Sweet Corn (drained)", amount: "1/2 cup" },
      { item: "Shredded Cheddar Cheese", amount: "1/4 cup" },
    ],
    instructions: [
      "Whisk eggs and egg whites together in a bowl with salt and pepper.",
      "Stir in sweet corn and half of the shredded cheddar.",
      "Divide mixture into 6 greased muffin tin cups and top with remaining cheese.",
      "Bake at 180°C for 15-18 minutes until puffed and set.",
    ],
  },
};

function RecipeDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [r, setR] = useState<any>(null);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. First try fetching from Supabase database
    supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setR(data);
          setLoading(false);
        } else {
          // 2. Fall back to local SA recipe catalog
          const localMatch = POPULAR_RECIPES.find((item) => item.id === id);
          if (localMatch) {
            const extraDetails = LOCAL_RECIPE_DETAILS[id] || {
              ingredients: localMatch.ingredients || [
                { item: "Main Protein / Grain", amount: "Standard Portion" },
                { item: "Traditional Spices & Seasoning", amount: "To taste" },
              ],
              instructions: localMatch.instructions || [
                "Prepare all fresh ingredients.",
                "Cook according to traditional South African stovetop methods.",
                "Serve warm and enjoy!",
              ],
            };

            setR({
              ...localMatch,
              ingredients: extraDetails.ingredients,
              instructions: extraDetails.instructions,
            });
          } else {
            setR(null);
          }
          setLoading(false);
        }
      });
  }, [id]);

  const addToLog = async () => {
    if (!user || !r) return;

    // Direct insertion into user's food_logs table in Supabase
    await supabase.from("food_logs").insert({
      user_id: user.id,
      meal_name: r.title,
      calories: r.calories_per_serving ?? 0,
      protein_g: r.protein_g ?? 0,
      carbs_g: r.carbs_g ?? 0,
      fat_g: r.fat_g ?? 0,
      log_date: new Date().toISOString().slice(0, 10),
    } as any);

    setAdded(true);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading recipe details...
      </div>
    );
  }

  if (!r) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Link to="/app/recipes" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to recipes
        </Link>
      </div>
    );
  }

  const totalTime = (r.prep_minutes || 0) + (r.cook_minutes || 0);

  return (
    <div className="space-y-6">
      <Link
        to="/app/recipes"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" /> All recipes
      </Link>

      {/* Main Recipe Banner */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid h-48 place-items-center bg-primary/10">
          <ChefHat className="h-16 w-16 text-primary" />
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-foreground">{r.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.description}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-y border-border py-3">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-4 w-4 text-primary" /> {totalTime} min total
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="h-4 w-4 text-blue-500" /> {r.servings || 1} serving(s)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Flame className="h-4 w-4 text-orange-500" /> {r.calories_per_serving ?? 0} cal / serving
            </span>
          </div>

          {/* Macro Breakdown Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-muted/50 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Protein</p>
              <p className="font-display text-base font-bold text-emerald-600 dark:text-emerald-400">{r.protein_g ?? 0}g</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Carbs</p>
              <p className="font-display text-base font-bold text-foreground">{r.carbs_g ?? 0}g</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fat</p>
              <p className="font-display text-base font-bold text-foreground">{r.fat_g ?? 0}g</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fiber</p>
              <p className="font-display text-base font-bold text-foreground">{r.fiber_g ?? 0}g</p>
            </div>
          </div>

          {/* One-Tap Nutrition Log Button */}
          <button
            onClick={addToLog}
            disabled={added}
            className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
          >
            {added ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" /> Added to Nutrition Log ✓
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add to Nutrition Log
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ingredients and Instructions Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ingredients List */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-foreground">Ingredients</h2>
          <ul className="space-y-2.5 text-sm">
            {(r.ingredients ?? []).map((ing: any, i: number) => (
              <li key={i} className="flex items-center justify-between border-b border-border/60 pb-2.5 last:border-0">
                <span className="font-medium text-foreground">{typeof ing === "string" ? ing : ing.item}</span>
                {ing.amount && <span className="text-xs font-semibold text-muted-foreground">{ing.amount}</span>}
              </li>
            ))}
            {(!r.ingredients || r.ingredients.length === 0) && (
              <li className="text-xs text-muted-foreground">No ingredients listed for this recipe.</li>
            )}
          </ul>
        </section>

        {/* Instructions Steps */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-foreground">Instructions</h2>
          <ol className="space-y-3.5 text-sm">
            {(r.instructions ?? []).map((step: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-foreground leading-relaxed">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
            {(!r.instructions || r.instructions.length === 0) && (
              <li className="text-xs text-muted-foreground">No instructions provided.</li>
            )}
          </ol>
        </section>
      </div>
    </div>
  );
}

export default RecipeDetail;