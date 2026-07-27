import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Flame, ChefHat, Search, Utensils } from "lucide-react";

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

  // Add these to POPULAR_RECIPES inside src/routes/app/recipes.index.tsx

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

function RecipesPage() {
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = [
    "All",
    "Traditional",
    "High Protein",
    "Budget Friendly",
    "Breakfast",
    "Dinner",
    "Quick & Easy",
  ];

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
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          South African Fitness Recipes
        </h1>
        <p className="text-sm text-muted-foreground">
          Affordable, local, high-protein meals designed for everyday Mzansi cooking.
        </p>
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
    </div>
  );
}

export default RecipesPage;