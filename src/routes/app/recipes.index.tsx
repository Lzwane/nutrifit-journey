import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Clock,
  Flame,
  ChefHat,
  Search,
  Utensils,
  Sparkles,
  X,
  Plus,
  Loader2,
  Star,
  Camera,
  CheckCircle2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/use-subscription";
import { PremiumLockedScreen } from "@/components/app/premium-guard";

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
  const { hasAccess, loading: subscriptionLoading } = useSubscription();

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

  // 1. Loading State while checking subscription
  if (subscriptionLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" /> Checking access...
      </div>
    );
  }

  // 2. Paywall Guard: Block the entire page if trial expired & not premium
  if (!hasAccess) {
    return <PremiumLockedScreen featureName="Nutritionist Recipes & Meal Plans" />;
  }

  // Combine Official & Approved Community Recipes
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
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Recipes &amp; Nutrition Catalog
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse nutritionist-verified official meals and community member creations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSubmitModalOpen(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs sm:text-sm font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4 w-4" /> Submit Recipe for Review
        </button>
      </div>

      {/* SEARCH & CATEGORY FILTERS */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search recipes, ingredients, or meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

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

      {/* RECIPES CATALOG GRID */}
      {loadingRecipes ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading recipes...
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
          <ChefHat className="h-10 w-10 mx-auto opacity-50 text-primary" />
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
                className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:shadow-md flex flex-col justify-between"
              >
                {/* IMAGE / HEADER */}
                <div className="relative h-44 bg-muted overflow-hidden">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <ChefHat className="h-12 w-12 text-primary/80" />
                    </div>
                  )}

                  <span className={`absolute top-3 left-3 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                    r.isOfficial ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {r.isOfficial ? "Verified Official" : `By ${r.author}`}
                  </span>
                </div>

                {/* DETAILS */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground line-clamp-1">
                      {r.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {/* STAR RATINGS */}
                  <div className="flex items-center justify-between border-t border-border pt-2.5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRateRecipe(r.id, star)}
                          className="cursor-pointer text-amber-400 hover:scale-125 transition"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              star <= (ratingData.userRating || Math.round(ratingData.avg))
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-[11px] font-bold text-muted-foreground ml-1">
                        {ratingData.avg > 0 ? `${ratingData.avg} (${ratingData.count})` : "New"}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {r.protein}
                    </span>
                  </div>

                  {/* MACRO FOOTER */}
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" /> {r.prep_time || "15 mins"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" /> {r.calories} kcal
                    </span>
                  </div>
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
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">Submit Recipe for Approval</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitSuccess && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {submitSuccess}
              </div>
            )}

            {submitError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
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
                  className="cursor-pointer border-2 border-dashed border-border rounded-2xl p-4 text-center hover:border-primary transition bg-muted/20"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-32 w-full object-cover rounded-xl mx-auto" />
                  ) : (
                    <div className="space-y-1 text-muted-foreground">
                      <Camera className="h-8 w-8 mx-auto text-primary" />
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
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full cursor-pointer rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 disabled:opacity-50 mt-2"
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