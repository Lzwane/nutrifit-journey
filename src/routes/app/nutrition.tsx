import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Loader2,
  Droplet,
  Bell,
  CheckCircle2,
  Plus,
  PenTool,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/nutrition")({
  head: () => ({
    meta: [
      { title: "Nutrition & Water Tracker — NutriFit" },
      { name: "description", content: "Log meals using AI Gemini Food Camera or manual entry, and track daily hydration." },
    ],
  }),
  component: NutritionPage,
});

function NutritionPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [waterAmount, setWaterAmount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isManualOpen, setIsManualOpen] = useState(false);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [savingMeal, setSavingMeal] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;

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

    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, [user, today]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mealName.trim()) return;

    setSavingMeal(true);
    try {
      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        meal_name: mealName.trim(),
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

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve({ base64, mimeType: file.type || "image/jpeg" });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Direct Google Gemini Multimodal Vision API (Strict JSON mode)
  const analyzeFoodWithGemini = async (base64: string, mimeType: string) => {
    const geminiKey =
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (import.meta as any).env?.GEMINI_API_KEY;

    if (!geminiKey) {
      throw new Error("Missing VITE_GEMINI_API_KEY in your .env or Render environment.");
    }

    const candidateModels = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    let lastError = "";

    const promptText =
      "Analyze this meal photo carefully. Identify the food item or dish and estimate portion macros accurately. " +
      "Return ONLY a raw JSON object with this exact structure without markdown or explanation: " +
      '{"food_name": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}';

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey.trim(),
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType || "image/jpeg",
                      data: base64,
                    },
                  },
                  {
                    text: promptText,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              maxOutputTokens: 300,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return JSON.parse(rawText.trim());
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error?.message || `HTTP ${res.status}`;
          console.warn(`[${model}] vision analysis failed:`, lastError);
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    throw new Error(lastError || "Could not complete image analysis with Gemini.");
  };

  const handleFoodScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAnalyzing(true);

    try {
      const { base64, mimeType } = await fileToBase64(file);
      const nutritionData = await analyzeFoodWithGemini(base64, mimeType);

      if (!nutritionData || !nutritionData.food_name) {
        throw new Error("Could not detect nutritional contents from this picture.");
      }

      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        meal_name: nutritionData.food_name || "Scanned Meal",
        calories: Math.round(nutritionData.calories || 0),
        protein_g: Math.round(nutritionData.protein_g || 0),
        carbs_g: Math.round(nutritionData.carbs_g || 0),
        fat_g: Math.round(nutritionData.fat_g || 0),
        log_date: today,
      } as any);

      if (error) throw error;

      showToast(`AI Logged: ${nutritionData.food_name} (${Math.round(nutritionData.calories || 0)} kcal)! ✨`);
    } catch (err: any) {
      console.error("Food scan error:", err);
      alert("Failed to analyze food: " + (err.message || "Invalid image or server response"));
    } finally {
      setAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 relative max-w-7xl mx-auto font-sans pb-12">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-xs sm:text-sm font-semibold text-background shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Nutrition &amp; Water
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Gemini Vision
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Log meals using Gemini AI camera or manual entry, and track your daily hydration goals.
          </p>
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFoodScan}
        className="hidden"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 text-center shadow-xs flex flex-col items-center justify-between">
          <div>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
              <Camera className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">AI Food Camera</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Snap a meal photo for automatic calorie &amp; macro breakdown powered by Gemini Vision.
            </p>
          </div>

          <button
            type="button"
            disabled={analyzing}
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing Photo with Gemini...
              </>
            ) : (
              <>
                Snap Meal Photo <Sparkles className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-xs flex flex-col items-center justify-between">
          <div>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground">
              <PenTool className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">Manual Food Entry</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Already know your macros? Type in your meal details directly.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            className="mt-5 w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl border border-input bg-background py-3.5 text-xs sm:text-sm font-bold text-foreground transition hover:bg-accent"
          >
            Enter Food Details <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Droplet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Water Hydration</h3>
              <p className="text-xs text-muted-foreground">
                Logged today: <span className="font-bold text-foreground">{(waterAmount / 1000).toFixed(2)} L</span>
              </p>
            </div>
          </div>

          {notificationsEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Reminders Active
            </span>
          ) : (
            <button
              type="button"
              onClick={enableWaterReminders}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-accent"
            >
              <Bell className="h-3.5 w-3.5 text-primary" /> Enable Water Reminders
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => logWater(250)}
            className="flex cursor-pointer items-center justify-center gap-1 rounded-2xl border border-blue-500/20 bg-blue-500/5 py-3 text-xs font-bold text-blue-600 transition hover:bg-blue-500/10 active:scale-95 dark:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> 250 ml
          </button>
          <button
            type="button"
            onClick={() => logWater(500)}
            className="flex cursor-pointer items-center justify-center gap-1 rounded-2xl border border-blue-500/20 bg-blue-500/5 py-3 text-xs font-bold text-blue-600 transition hover:bg-blue-500/10 active:scale-95 dark:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> 500 ml
          </button>
          <button
            type="button"
            onClick={() => logWater(750)}
            className="flex cursor-pointer items-center justify-center gap-1 rounded-2xl border border-blue-500/20 bg-blue-500/5 py-3 text-xs font-bold text-blue-600 transition hover:bg-blue-500/10 active:scale-95 dark:text-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> 750 ml
          </button>
        </div>
      </div>

      {isManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-foreground">Add Food Manually</h3>
              <button
                type="button"
                onClick={() => setIsManualOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Meal / Food Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grilled Chicken &amp; Rice"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Calories (kcal) *</label>
                  <input
                    type="number"
                    required
                    placeholder="450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="35"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="40"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Fat (g)</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingMeal}
                className="mt-2 w-full cursor-pointer rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-50"
              >
                {savingMeal ? "Saving Meal..." : "Save Meal to Daily Log"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}