import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Clock,
  Flame,
  ChefHat,
  Search,
  Plus,
  Loader2,
  Star,
  Camera,
  Lock,
  Check,
  ArrowRight,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/app/recipes/")({
  head: () => ({
    meta: [
      { title: "Recipes & Meal Ideas — NutriFit" },
      { name: "description", content: "Explore official and community South African recipes." },
    ],
  }),
  component: RecipesPage,
});

export function RecipesPage() {
  const { user } = useAuth();
  const sub = useSubscription();

  const isPremium = sub.isPremium || (sub as any).tier === "premium";
  const isTrialActive = sub.isTrialActive ?? (sub.daysLeft > 0 && !isPremium);
  const hasAccess = isPremium || isTrialActive;
  const subscriptionLoading = sub.loading;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Recipe Datasets
  const [officialRecipes, setOfficialRecipes] = useState<any[]>([]);
  const [approvedCommunityRecipes, setApprovedCommunityRecipes] = useState<any[]>([]);
  const [ratingsMap, setRatingsMap] = useState<{ [key: string]: { avg: number; count: number; userRating?: number } }>({});
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  // Submit Community Recipe Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Community Recipe Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("High Protein");
  const [prepTime, setPrepTime] = useState("20 mins");
  const [calories, setCalories] = useState("450");
  const [protein, setProtein] = useState("35g");
  const [carbs, setCarbs] = useState("40g");
  const [fat, setFat] = useState("12g");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const categories = [
    "All",
    "High Protein",
    "Traditional",
    "Budget Friendly",
    "Breakfast",
    "Dinner",
    "Community",
  ];

  useEffect(() => {
    if (hasAccess) {
      fetchAllPublishedRecipes();
      fetchRatings();
    }
  }, [user, hasAccess]);

  const fetchAllPublishedRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const { data: official } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: community } = await supabase
        .from("community_recipes")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      setOfficialRecipes(official || []);
      setApprovedCommunityRecipes(community || []);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const fetchRatings = async () => {
    try {
      const { data } = await supabase.from("recipe_ratings").select("*");
      if (!data) return;

      const acc: { [key: string]: { total: number; count: number; userRating?: number } } = {};

      data.forEach((r) => {
        if (!acc[r.recipe_id]) acc[r.recipe_id] = { total: 0, count: 0 };
        acc[r.recipe_id].total += r.rating;
        acc[r.recipe_id].count += 1;
        if (user && r.user_id === user.id) {
          acc[r.recipe_id].userRating = r.rating;
        }
      });

      const formatted: { [key: string]: { avg: number; count: number; userRating?: number } } = {};
      Object.keys(acc).forEach((id) => {
        formatted[id] = {
          avg: Math.round((acc[id].total / acc[id].count) * 10) / 10,
          count: acc[id].count,
          userRating: acc[id].userRating,
        };
      });

      setRatingsMap(formatted);
    } catch (err) {
      console.error("Error fetching ratings:", err);
    }
  };

  const handleRateRecipe = async (recipeId: string, ratingValue: number) => {
    if (!user) return alert("Please sign in to rate recipes!");

    try {
      const { error } = await supabase.from("recipe_ratings").upsert(
        { recipe_id: recipeId, user_id: user.id, rating: ratingValue },
        { onConflict: "recipe_id,user_id" }
      );

      if (error) throw error;
      fetchRatings();
    } catch (err: any) {
      console.error("Rating error:", err.message);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitCommunityRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!imageFile) {
      setSubmitError("A photo of the recipe is strictly required!");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `recipes/${fileName}`;

      let imageUrl = "";
      const { error: uploadError } = await supabase.storage
        .from("recipe-photos")
        .upload(filePath, imageFile);

      if (uploadError) {
        imageUrl = imagePreview || "";
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("recipe-photos")
          .getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }

      const ingredientsArr = ingredients.split("\n").map((i) => i.trim()).filter(Boolean);
      const instructionsArr = instructions.split("\n").map((i) => i.trim()).filter(Boolean);

      const authorName =
        user.user_metadata?.full_name || user.email?.split("@")[0] || "NutriFit Member";

      const { error: dbError } = await supabase.from("community_recipes").insert([
        {
          user_id: user.id,
          title,
          description,
          category,
          prep_time: prepTime,
          calories: parseInt(calories) || 0,
          protein,
          carbs,
          fat,
          ingredients: ingredientsArr,
          instructions: instructionsArr,
          image_url: imageUrl,
          author: authorName,
          status: "pending",
        },
      ]);

      if (dbError) throw dbError;

      setSubmitSuccess("Recipe submitted! It will appear on the app once approved by an admin.");
      setTitle("");
      setDescription("");
      setIngredients("");
      setInstructions("");
      setImageFile(null);
      setImagePreview(null);
      setTimeout(() => setIsSubmitModalOpen(false), 2500);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit recipe.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground font-sans">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mr-2 shrink-0" /> Checking access...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 font-sans min-h-[70vh]">
        <div className="max-w-md w-full text-center space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl animate-in fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 shadow-inner">
            <Lock className="h-8 w-8 shrink-0" />
          </div>

          <div className="space-y-2">
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 inline-block">
              Premium Feature
            </span>
            <h2 className="text-2xl font-extrabold text-foreground">
              Nutritionist Recipes &amp; Meal Plans
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your 60-day free trial has concluded and your account is on the Free Tier. Workouts and basic logs remain free forever. Unlock verified recipes, calorie breakdowns, and custom meal ideas for R49.00/month.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-left text-xs space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Full access to verified South African recipes catalog</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Accurate protein, carb, fat &amp; calorie breakdowns</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Community submissions &amp; nutritionist review</span>
            </div>
          </div>

          <Link
            to="/app/profile"
            search={{ subscribe: "true" }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 py-3.5 text-xs font-bold text-white shadow-md transition uppercase tracking-wider cursor-pointer"
          >
            <Lock className="h-4 w-4 shrink-0" />
            <span>Unlock Premium (R49.00 / mo)</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>
      </div>
    );
  }

  const allRecipes = [
    ...officialRecipes.map((r) => ({ ...r, isOfficial: true })),
    ...approvedCommunityRecipes.map((r) => ({ ...r, isCommunity: true })),
  ];

  const filteredRecipes = allRecipes.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      r.category === selectedCategory ||
      (selectedCategory === "Community" && r.isCommunity);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 w-full">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Recipes &amp; Nutrition Catalog
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse nutritionist-verified official meals and community member creations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSubmitModalOpen(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4 shrink-0" /> Submit Recipe for Review
        </button>
      </div>

      {/* SEARCH & CATEGORY FILTERS */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search recipes, ingredients, or meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-input bg-card pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* RECIPES CATALOG GRID */}
      {loadingRecipes ? (
        <div className="flex h-48 items-center justify-center text-xs sm:text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mr-2 shrink-0" /> Loading recipes...
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
          <ChefHat className="h-10 w-10 mx-auto opacity-50 text-emerald-500 shrink-0" />
          <p className="font-bold text-sm text-foreground">No recipes found</p>
          <p>Try adjusting your search query or category filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((r) => {
            const ratingData = ratingsMap[r.id] || { avg: 0, count: 0 };

            return (
              <div
                key={r.id}
                className="group overflow-hidden rounded-3xl border border-border bg-card transition-all duration-200 hover:shadow-md flex flex-col justify-between"
              >
                {/* IMAGE / HEADER */}
                <div className="relative h-44 bg-muted overflow-hidden shrink-0">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-500/10">
                      <ChefHat className="h-12 w-12 text-emerald-500/80 shrink-0" />
                    </div>
                  )}

                  <span className={`absolute top-3 left-3 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-xs ${
                    r.isOfficial ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {r.isOfficial ? "Verified Official" : `By ${r.author}`}
                  </span>
                </div>

                {/* DETAILS */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-base font-extrabold text-foreground line-clamp-1 group-hover:text-emerald-500 transition">
                      {r.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {/* STAR RATINGS */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRateRecipe(r.id, star)}
                          className="cursor-pointer text-amber-400 hover:scale-125 transition shrink-0"
                        >
                          <Star
                            className={`h-4 w-4 shrink-0 ${
                              star <= (ratingData.userRating || Math.round(ratingData.avg))
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-bold text-muted-foreground ml-1 font-mono">
                        {ratingData.avg > 0 ? `${ratingData.avg} (${ratingData.count})` : "New"}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {r.protein || (r.protein_g ? `${r.protein_g}g Protein` : "")}
                    </span>
                  </div>

                  {/* MACRO FOOTER */}
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {r.prep_time || `${r.prep_minutes || 15}m`}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-orange-500">
                      <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" /> {r.calories || r.calories_per_serving} kcal
                    </span>
                  </div>

                  <Link
                    to="/app/recipes/$id"
                    params={{ id: r.id }}
                    className="w-full text-center rounded-xl bg-muted/60 hover:bg-emerald-500 hover:text-white py-2 text-xs font-extrabold transition text-foreground"
                  >
                    View Ingredients &amp; Prep
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBMIT COMMUNITY RECIPE MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-lg font-extrabold text-foreground">Submit Recipe for Approval</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted shrink-0"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            {submitSuccess && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {submitSuccess}
              </div>
            )}

            {submitError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitCommunityRecipe} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Recipe Photo * (Strictly Required)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-border rounded-2xl p-4 text-center hover:border-emerald-500 transition bg-muted/20"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-32 w-full object-cover rounded-xl mx-auto" />
                  ) : (
                    <div className="space-y-1 text-muted-foreground">
                      <Camera className="h-8 w-8 mx-auto text-emerald-500 shrink-0" />
                      <p className="text-xs font-semibold">Click to upload a clear photo of your dish</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Recipe Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Protein Banana Pancakes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Short Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delicious fluffy 3-ingredient morning meal."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Prep Time</label>
                  <input
                    type="text"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Calories</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Protein</label>
                  <input
                    type="text"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Carbs</label>
                  <input
                    type="text"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Ingredients (One per line) *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder={`2 Eggs\n1 Banana\n1 scoop Protein`}
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Instructions (One step per line) *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder={`1. Mash banana.\n2. Mix with eggs.\n3. Fry in skillet.`}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full cursor-pointer rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-white shadow-md transition hover:bg-emerald-600 disabled:opacity-50 mt-2"
              >
                {submitLoading ? "Submitting Recipe..." : "Submit to Admin for Review"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipesPage;