import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Clock,
  Flame,
  ChefHat,
  Search,
  Utensils,
  Sparkles,
  X,
  Plus,
  ShoppingCart,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/recipes/")({
  head: () => ({
    meta: [
      { title: "Recipes — NutriFit" },
      { name: "description", content: "Explore affordable, high-protein South African recipes for your fitness journey." },
    ],
  }),
  component: RecipesPage,
});

export const POPULAR_RECIPES = [
  {
    id: "samp-and-beans-beef",
    title: "High-Protein Umngqusho (Samp & Beans) with Beef",
    description: "Traditional slow-cooked Xhosa samp and sugar beans served with tender braised lean beef stew.",
    prep_minutes: 15,
    cook_minutes: 45,
    servings: 1,
    calories_per_serving: 540,
    protein_g: 45,
    carbs_g: 58,
    fat_g: 10,
    fiber_g: 12,
    category: "Traditional",
    ingredients: [
      { item: "Dried Samp & Sugar Beans Mix", amount: "1 cup (cooked)" },
      { item: "Lean Beef Stewing Steak (cubed)", amount: "180g" },
      { item: "Onion & Chopped Tomatoes", amount: "1/2 cup" },
      { item: "Rajah Curry Powder", amount: "1 tbsp" },
      { item: "Beef Stock Cube", amount: "1" },
    ],
    instructions: [
      "Boil soaked samp and sugar beans until soft and creamy; season with salt.",
      "In a separate pot, brown cubed beef steak with diced onion and Rajah curry powder.",
      "Add chopped tomatoes, stock cube, and a splash of water; simmer for 35 mins until tender.",
      "Serve warm beef gravy over a heap of umngqusho.",
    ],
  },
  {
    id: "chakalaka-chicken-breast",
    title: "Chakalaka Pan-Seared Chicken & Brown Rice",
    description: "Juicy chicken breast topped with spicy homemade vegetable chakalaka over brown rice.",
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 1,
    calories_per_serving: 480,
    protein_g: 46,
    carbs_g: 44,
    fat_g: 11,
    fiber_g: 6,
    category: "High Protein",
  },
  {
    id: "pilchards-fish-cakes",
    title: "Crispy Pilchard & Potato Fish Cakes",
    description: "Budget-friendly, high-protein fish cakes made with canned pilchards in tomato sauce and potato.",
    prep_minutes: 10,
    cook_minutes: 12,
    servings: 2,
    calories_per_serving: 360,
    protein_g: 35,
    carbs_g: 28,
    fat_g: 12,
    fiber_g: 4,
    category: "Budget Friendly",
  },
  {
    id: "boerewors-sweet-potato-skillet",
    title: "Lean Boerewors & Sweet Potato Skillet",
    description: "Sizzling lean beef boerewors grilled with roasted sweet potato cubes, onions, and green peppers.",
    prep_minutes: 10,
    cook_minutes: 18,
    servings: 1,
    calories_per_serving: 510,
    protein_g: 38,
    carbs_g: 42,
    fat_g: 18,
    fiber_g: 5,
    category: "Dinner",
  },
  {
    id: "amahewu-banana-protein-shake",
    title: "Mageu (Amahewu) Banana Protein Smoothie",
    description: "Refreshing traditional fermented mealie drink blended with banana and vanilla protein powder.",
    prep_minutes: 5,
    cook_minutes: 0,
    servings: 1,
    calories_per_serving: 350,
    protein_g: 28,
    carbs_g: 52,
    fat_g: 3,
    fiber_g: 4,
    category: "Breakfast",
  },
  {
    id: "spinach-mealie-pap-egg-bake",
    title: "Spinach, Feta & Pap Breakfast Bake",
    description: "Layered stiff mealie meal (pap) baked with braised spinach, egg whites, and crumbled feta cheese.",
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 2,
    calories_per_serving: 310,
    protein_g: 24,
    carbs_g: 36,
    fat_g: 8,
    fiber_g: 4,
    category: "Breakfast",
  },
  {
    id: "chicken-livers-wholewheat-toast",
    title: "Spicy Peri-Peri Chicken Livers on Toast",
    description: "Rich, iron-packed chicken livers cooked in spicy tomato peri-peri sauce over toasted brown bread.",
    prep_minutes: 5,
    cook_minutes: 10,
    servings: 1,
    calories_per_serving: 390,
    protein_g: 42,
    carbs_g: 26,
    fat_g: 11,
    fiber_g: 4,
    category: "Budget Friendly",
  },
  {
    id: "cape-malay-lean-beef-bobotie",
    title: "Lean Cape Malay Beef Bobotie & Turmeric Rice",
    description: "Traditional baked minced beef spiced with curry and raisins, topped with egg custard.",
    prep_minutes: 15,
    cook_minutes: 25,
    servings: 1,
    calories_per_serving: 490,
    protein_g: 40,
    carbs_g: 42,
    fat_g: 15,
    fiber_g: 3,
    category: "Traditional",
  },
  {
    id: "snoek-sweet-potato-mash",
    title: "Braaied Snoek Fillet with Sweet Potato Mash",
    description: "Flaky apricot-brushed grilled snoek served alongside warm mashed sweet potatoes.",
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 1,
    calories_per_serving: 440,
    protein_g: 44,
    carbs_g: 32,
    fat_g: 12,
    fiber_g: 5,
    category: "High Protein",
  },
  {
    id: "masala-chicken-cottage-cheese-wrap",
    title: "Chicken Tikka Masala Roti Wrap",
    description: "Spiced chicken breast strips mixed with cottage cheese and salad inside a brown roti wrap.",
    prep_minutes: 10,
    cook_minutes: 10,
    servings: 1,
    calories_per_serving: 420,
    protein_g: 38,
    carbs_g: 38,
    fat_g: 10,
    fiber_g: 4,
    category: "Quick & Easy",
  },
  {
    id: "shisa-nyama-pork-chops-chakalaka",
    title: "Shisa Nyama Grilled Pork Chop & Pap",
    description: "Lean braaied pork chop seasoned with braai salt, served with stiff pap and spicy chakalaka.",
    prep_minutes: 10,
    cook_minutes: 15,
    servings: 1,
    calories_per_serving: 530,
    protein_g: 46,
    carbs_g: 40,
    fat_g: 16,
    fiber_g: 4,
    category: "Traditional",
  },
  {
    id: "butternut-lentil-curry-stew",
    title: "High-Protein Butternut & Brown Lentil Curry",
    description: "Hearty, low-cost plant-based curry cooked with brown lentils, butternut squash, and mild Rajah curry.",
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 2,
    calories_per_serving: 340,
    protein_g: 22,
    carbs_g: 52,
    fat_g: 5,
    fiber_g: 11,
    category: "Budget Friendly",
  },
  {
    id: "braai-chicken-drumsticks-pap",
    title: "Braaied Peri-Peri Chicken Drumsticks & Pap",
    description: "Budget-friendly, juicy chicken drumsticks glazed in tangy peri-peri braai sauce served with stiff pap.",
    prep_minutes: 10,
    cook_minutes: 25,
    servings: 1,
    calories_per_serving: 490,
    protein_g: 44,
    carbs_g: 38,
    fat_g: 14,
    fiber_g: 3,
    category: "Traditional",
  },
  {
    id: "savory-mince-wholewheat-vetkoek",
    title: "Lean Savory Mince & Air-Fryer Vetkoek",
    description: "South African comfort classic featuring curry-seasoned lean beef mince inside a light, low-oil vetkoek.",
    prep_minutes: 15,
    cook_minutes: 15,
    servings: 1,
    calories_per_serving: 450,
    protein_g: 38,
    carbs_g: 42,
    fat_g: 12,
    fiber_g: 4,
    category: "Traditional",
  },
  {
    id: "creamy-peanut-butter-oat-porridge",
    title: "High-Protein Jungle Oats & Peanut Butter Porridge",
    description: "Warm, rich bowl of Jungle Oats cooked with egg whites, peanut butter, cinnamon, and honey.",
    prep_minutes: 5,
    cook_minutes: 5,
    servings: 1,
    calories_per_serving: 380,
    protein_g: 26,
    carbs_g: 45,
    fat_g: 11,
    fiber_g: 6,
    category: "Breakfast",
  },
  {
    id: "spicy-beef-kota-fitness-style",
    title: "Fitness-Style Lean Beef & Egg Kota",
    description: "Healthy township-style quarter loaf hollowed out and stuffed with lean steak strips, fried egg, and chakalaka.",
    prep_minutes: 10,
    cook_minutes: 12,
    servings: 1,
    calories_per_serving: 520,
    protein_g: 46,
    carbs_g: 48,
    fat_g: 13,
    fiber_g: 5,
    category: "High Protein",
  },
  {
    id: "tinned-sardine-tomato-pasta",
    title: "High-Protein Sardine & Tomato Pasta",
    description: "Super affordable, nutrient-dense meal using tinned sardines cooked in a rich garlic tomato sauce over wholewheat spaghetti.",
    prep_minutes: 5,
    cook_minutes: 12,
    servings: 1,
    calories_per_serving: 420,
    protein_g: 36,
    carbs_g: 46,
    fat_g: 10,
    fiber_g: 6,
    category: "Budget Friendly",
  },
  {
    id: "curried-egg-salad-toast",
    title: "Curried Cape-Malay Egg Salad on Toast",
    description: "Hard-boiled eggs mashed with mild curry powder, Greek yogurt, and green onions over toasted seed loaf.",
    prep_minutes: 8,
    cook_minutes: 0,
    servings: 1,
    calories_per_serving: 330,
    protein_g: 24,
    carbs_g: 22,
    fat_g: 14,
    fiber_g: 4,
    category: "Quick & Easy",
  },
  {
    id: "durban-mutton-curry-cauli-rice",
    title: "Lean Durban Beef Curry with Cauliflower Rice",
    description: "A fiery Durban-style beef curry simmered with potatoes and traditional spices, served with low-carb cauliflower rice.",
    prep_minutes: 15,
    cook_minutes: 35,
    servings: 1,
    calories_per_serving: 410,
    protein_g: 42,
    carbs_g: 18,
    fat_g: 16,
    fiber_g: 6,
    category: "Low Carb",
  },
  {
    id: "cheesy-sweet-corn-egg-muffins",
    title: "Sweet Corn, Cheese & Bacon Egg Muffins",
    description: "Grab-and-go meal prep breakfast cups baked with canned sweet corn, cheddar, and turkey bacon bits.",
    prep_minutes: 10,
    cook_minutes: 18,
    servings: 2,
    calories_per_serving: 270,
    protein_g: 22,
    carbs_g: 16,
    fat_g: 12,
    fiber_g: 2,
    category: "Meal Prep",
  },
];

interface AIRecipeResult {
  recipe_name: string;
  description: string;
  prep_time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  instructions: string[];
  suggested_extras_to_buy: string[];
}

function RecipesPage() {
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // AI Pantry Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<AIRecipeResult | null>(null);

  const categories = [
    "All",
    "Traditional",
    "High Protein",
    "Budget Friendly",
    "Breakfast",
    "Dinner",
    "Quick & Easy",
  ];

  // Quick Preset Tags for Pantry Input
  const COMMON_TAGS = ["Eggs", "Chicken Breast", "Pap / Mealie Meal", "Canned Tomatoes", "Spinach", "Brown Rice", "Lentils", "Potatoes", "Onions"];

  const addTag = (tag: string) => {
    if (ingredientsInput.includes(tag)) return;
    setIngredientsInput((prev) => (prev ? `${prev}, ${tag}` : tag));
  };

  // Generate Recipe using Gemini API
  const handleGenerateRecipe = async () => {
    if (!ingredientsInput.trim()) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert("VITE_GEMINI_API_KEY is not configured in your .env file.");
      return;
    }

    setGenerating(true);
    setAiRecipe(null);

    try {
      const promptText = `I have these ingredients available at home: "${ingredientsInput}".
Create a healthy, delicious, South African style fitness recipe using these ingredients.
Also suggest 2-3 extra optional ingredients to buy/add that would make the meal taste amazing.
Respond ONLY with a valid raw JSON object matching strictly this structure:
{
  "recipe_name": "string",
  "description": "string",
  "prep_time": "e.g. 20 mins",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "instructions": ["step 1", "step 2", "step 3"],
  "suggested_extras_to_buy": ["extra ingredient 1", "extra ingredient 2"]
}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error?.message || "Failed to reach Gemini API");
      }

      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      setAiRecipe(parsed);
    } catch (err: any) {
      console.error("AI Recipe Generation Error:", err);
      alert("Failed to generate recipe: " + (err.message || "Please try again."));
    } finally {
      setGenerating(false);
    }
  };

  const filtered = POPULAR_RECIPES.filter((r) => {
    const matchesQuery =
      r.title.toLowerCase().includes(q.toLowerCase()) ||
      r.description.toLowerCase().includes(q.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || r.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner & AI Pantry Generator Callout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            South African Fitness Recipes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Affordable, local, high-protein meals designed for everyday Mzansi cooking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-[0.98] shrink-0"
        >
          <Sparkles className="h-4 w-4" /> AI Pantry Recipe Generator
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search pap, chakalaka, pilchards, chicken..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <Link
            key={r.id}
            to="/app/recipes/$id"
            params={{ id: r.id }}
            className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between"
          >
            <div className="grid h-36 place-items-center bg-primary/10 transition-colors group-hover:bg-primary/20">
              <ChefHat className="h-12 w-12 text-primary/80 transition-transform group-hover:scale-110" />
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {r.category}
                </span>
                <h3 className="font-display text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {r.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted-foreground border-t border-border pt-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {r.prep_minutes + r.cook_minutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" /> {r.calories_per_serving} cal
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {r.protein_g}g protein
                </span>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <Utensils className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold text-foreground">No local recipes found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search terms or category filter.</p>
          </div>
        )}
      </div>

      {/* AI Pantry Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">What's in Your Pantry?</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAiModalOpen(false);
                  setAiRecipe(null);
                }}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Enter ingredients you currently have at home:
              </label>

              <textarea
                value={ingredientsInput}
                onChange={(e) => setIngredientsInput(e.target.value)}
                placeholder="e.g. Eggs, spinach, canned pilchards, sweet potato, garlic..."
                className="w-full rounded-2xl border border-input bg-background p-3.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary min-h-[75px] resize-none"
              />

              {/* Quick Tag Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase mr-1">Quick Add:</span>
                {COMMON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="cursor-pointer rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/20 hover:text-primary transition"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerateRecipe}
                disabled={generating || !ingredientsInput.trim()}
                className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-50 mt-3"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Chef AI is creating recipe...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate Recipe &amp; Macros
                  </>
                )}
              </button>
            </div>

            {/* AI Generated Recipe Result */}
            {aiRecipe && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4 animate-in fade-in pt-4">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                      AI Generated Recipe
                    </span>
                    <h4 className="font-display text-lg font-bold text-foreground mt-1">
                      {aiRecipe.recipe_name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{aiRecipe.description}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0 bg-card px-2.5 py-1 rounded-xl border border-border">
                    <Clock className="h-3.5 w-3.5 text-primary" /> {aiRecipe.prep_time}
                  </span>
                </div>

                {/* Macro Cards */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-card p-2 border border-border">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Calories</p>
                    <p className="font-display text-xs font-extrabold text-orange-500">{aiRecipe.calories} cal</p>
                  </div>
                  <div className="rounded-xl bg-card p-2 border border-border">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Protein</p>
                    <p className="font-display text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{aiRecipe.protein_g}g</p>
                  </div>
                  <div className="rounded-xl bg-card p-2 border border-border">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Carbs</p>
                    <p className="font-display text-xs font-extrabold text-foreground">{aiRecipe.carbs_g}g</p>
                  </div>
                  <div className="rounded-xl bg-card p-2 border border-border">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Fat</p>
                    <p className="font-display text-xs font-extrabold text-foreground">{aiRecipe.fat_g}g</p>
                  </div>
                </div>

                {/* Cooking Instructions */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">How to Cook:</h5>
                  <ol className="space-y-2 text-xs text-foreground">
                    {aiRecipe.instructions?.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {idx + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Shopping Extras Suggestion */}
                {aiRecipe.suggested_extras_to_buy?.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <ShoppingCart className="h-3.5 w-3.5" /> Suggested Extras to Buy / Add:
                    </div>
                    <ul className="flex flex-wrap gap-1.5">
                      {aiRecipe.suggested_extras_to_buy.map((item, i) => (
                        <li key={i} className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border">
                          <Plus className="h-3 w-3 text-emerald-500" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipesPage;