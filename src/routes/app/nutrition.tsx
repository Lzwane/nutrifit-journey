import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Camera, Sparkles, Loader2, Droplet, Bell, CheckCircle, Plus, PenTool, Check, X } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — NutriFit" }] }),
  component: NutritionPage,
});

// Initialize Gemini SDK
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

function NutritionPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State variables
  const [analyzing, setAnalyzing] = useState(false);
  const [waterAmount, setWaterAmount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Food Entry Modal state
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [savingMeal, setSavingMeal] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Fetch logged water from Supabase on load
  useEffect(() => {
    if (!user) return;
    
    // Fetch today's total water
    supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", user.id)
      .eq("log_date", today)
      .then(({ data }) => {
        if (data) {
          const total = data.reduce((sum, item: any) => sum + (item.amount_ml || 0), 0);
          setWaterAmount(total);
        }
      });

    // Check Notification Permission
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, [user, today]);

  // Trigger Toast Notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Water Notification Request
  const enableWaterReminders = async () => {
    if (!("Notification" in window)) {
      alert("Browser notifications are not supported on this device.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      new Notification("💧 Water Reminders Active!", {
        body: "We will remind you periodically to stay hydrated.",
      });
    }
  };

  // Log Water Intake
  const logWater = async (ml: number) => {
    if (!user) return;
    const newTotal = waterAmount + ml;
    setWaterAmount(newTotal);
    showToast(`Added ${ml}ml of water! 💧`);

    await supabase.from("water_logs").insert({
      user_id: user.id,
      amount_ml: ml,
      log_date: today,
    } as any);
  };

  // Handle Manual Food Log Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mealName) return;

    setSavingMeal(true);
    try {
      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        meal_name: mealName,
        calories: parseInt(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        log_date: today,
      } as any);

      if (error) throw error;

      showToast(`Logged ${mealName}! 🥗`);
      setIsManualOpen(false);
      setMealName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
    } catch (err: any) {
      alert("Failed to save meal: " + err.message);
    } finally {
      setSavingMeal(false);
    }
  };

  // Convert File to Base64 for Gemini
  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  // Handle AI Vision Scan
  const handleFoodScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAnalyzing(true);

    try {
      const imagePart = await fileToGenerativePart(file);

      const prompt = `Analyze this food image. Estimate nutritional values and respond ONLY with a raw JSON object formatted strictly as:
{"food_name": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [imagePart, prompt],
      });

      const responseText = response.text || "{}";
      const cleanJsonStr = responseText.replace(/```json|```/g, "").trim();
      const nutritionData = JSON.parse(cleanJsonStr);

      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        meal_name: nutritionData.food_name || "Scanned Meal",
        calories: nutritionData.calories || 0,
        protein_g: nutritionData.protein_g || 0,
        carbs_g: nutritionData.carbs_g || 0,
        fat_g: nutritionData.fat_g || 0,
        log_date: today,
      } as any);

      if (error) throw error;

      showToast(`AI Logged: ${nutritionData.food_name || "Meal"} (${nutritionData.calories || 0} kcal)! ✨`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to analyze food. Ensure VITE_GEMINI_API_KEY is configured.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Quick Pop-up Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Nutrition Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Log meals using AI, enter entries manually, or track your water intake.
        </p>
      </div>

      {/* Hidden File Input for AI Camera Snap */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFoodScan}
        className="hidden"
      />

      {/* Action Buttons: AI Scan & Manual Entry */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* AI Camera Card */}
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 text-center shadow-sm flex flex-col items-center justify-between">
          <div>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Camera className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">AI Food Camera</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Snap a meal photo for automatic calorie & macro detection.
            </p>
          </div>

          <button
            type="button"
            disabled={analyzing}
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Analyzing Photo...
              </>
            ) : (
              <>
                Snap Meal Photo <Sparkles className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Manual Log Card */}
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm flex flex-col items-center justify-between">
          <div>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground">
              <PenTool className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">Manual Food Entry</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Know your macros? Type in your food details manually.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            className="mt-5 w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-input bg-background py-3.5 text-sm font-semibold text-foreground transition hover:bg-accent"
          >
            Enter Food Details <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Manual Food Entry Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-foreground">Add Food Manually</h3>
              <button
                onClick={() => setIsManualOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Meal / Food Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken Salad"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Calories (kcal)</label>
                  <input
                    type="number"
                    placeholder="450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="35"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Fat (g)</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingMeal}
                className="mt-2 w-full cursor-pointer rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
              >
                {savingMeal ? "Saving Meal..." : "Save Meal"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Water Hydration Card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Droplet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Water Hydration</h3>
              <p className="text-xs text-muted-foreground">Logged today: {(waterAmount / 1000).toFixed(2)} L</p>
            </div>
          </div>

          {/* Water Notification Toggle */}
          {notificationsEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" /> Water Reminders On
            </span>
          ) : (
            <button
              type="button"
              onClick={enableWaterReminders}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
            >
              <Bell className="h-4 w-4 text-primary" /> Enable Drink Water Reminders
            </button>
          )}
        </div>

        {/* Quick Water Logging Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => logWater(250)}
            className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-blue-500/20 bg-blue-500/5 py-3 text-xs font-bold text-blue-600 transition hover:bg-blue-500/10 active:scale-95 dark:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> 250 ml
          </button>
          <button
            type="button"
            onClick={() => logWater(500)}
            className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-blue-500/20 bg-blue-500/5 py-3 text-xs font-bold text-blue-600 transition hover:bg-blue-500/10 active:scale-95 dark:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> 500 ml
          </button>
          <button
            type="button"
            onClick={() => logWater(750)}
            className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-blue-500/20 bg-blue-500/5 py-3 text-xs font-bold text-blue-600 transition hover:bg-blue-500/10 active:scale-95 dark:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> 750 ml
          </button>
        </div>
      </div>
    </div>
  );
}

export default NutritionPage;