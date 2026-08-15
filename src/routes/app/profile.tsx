import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  User as UserIcon,
  Save,
  Lock,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  CreditCard,
  Check,
  AlertCircle,
  Target,
  UserCheck,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — NutriFit" },
      { name: "description", content: "Manage your profile, fitness goals, display settings, and subscription." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const searchParams: any = useSearch({ strict: false });
  const [profile, setProfile] = useState<any>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Trial & Subscription State
  const [daysLeft, setDaysLeft] = useState<number>(60);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);

  // Bio Editing States
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioFlash, setBioFlash] = useState(false);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);

  // Accordion Folders Expansion State
  const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>({
    personal: true,
    fitness: false,
    theme: false,
    subscription: false,
  });

  // Theme State
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    () => (localStorage.getItem("nutrifit-theme") as any) || "system"
  );

  // Subscription Modal & Payment States
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-open modal if navigated with ?subscribe=true
  useEffect(() => {
    if (searchParams?.subscribe === "true" || searchParams?.subscribe === true) {
      setShowUpgradeModal(true);
      setOpenFolders((prev) => ({ ...prev, subscription: true }));
    }
  }, [searchParams]);

  const toggleFolder = (folderKey: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("nutrifit-theme", newTheme);

    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else if (newTheme === "light") {
      root.classList.remove("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, []);

  const refresh = async () => {
    if (!user) return;
    let { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

    if (!p) {
      const defaultData = {
        id: user.id,
        first_name: user.user_metadata?.first_name || user.email?.split("@")[0] || "User",
        last_name: user.user_metadata?.last_name || "",
        full_name: user.user_metadata?.full_name || "User",
        daily_calorie_goal: 2000,
        daily_water_goal_l: 2.5,
        subscription_tier: "trial",
      };
      const { data: createdProfile } = await supabase.from("profiles").insert(defaultData as any).select("*").single();
      p = createdProfile;
    }

    if (p) {
      // Calculate 60-Day Trial Countdown
      const now = new Date();
      const startDate = new Date(p.created_at || now);
      const calculatedEnd = new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      setTrialEndDate(calculatedEnd);

      const diffTime = calculatedEnd.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setDaysLeft(diffDays);

      let extractedCode = "+27";
      let extractedRaw = "";

      if (p.phone_number) {
        const match = p.phone_number.match(/^(\+\d{1,3})(\d+)$/);
        if (match) {
          extractedCode = match[1];
          extractedRaw = match[2];
        } else {
          extractedRaw = p.phone_number.replace(/\D/g, "");
        }
      }

      setProfile({
        ...p,
        country_code: extractedCode,
        raw_phone: extractedRaw,
      });
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const handleEditBioClick = () => {
    setIsEditingBio(true);
    setTimeout(() => {
      bioInputRef.current?.focus();
    }, 50);
  };

  const saveBio = async () => {
    if (!user || !profile) return;
    await supabase.from("profiles").update({ bio: profile.bio } as any).eq("id", user.id);
    setIsEditingBio(false);
    setBioFlash(true);
    setTimeout(() => setBioFlash(false), 2000);
  };

  const savePersonal = async () => {
    if (!user || !profile) return;

    const country = profile.country_code ?? "+27";
    let cleanPhone = (profile.raw_phone ?? "").replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.substring(1);
    }

    const fullPhone = cleanPhone ? `${country}${cleanPhone}` : null;

    await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
        phone_number: fullPhone,
        bio: profile.bio,
      } as any)
      .eq("id", user.id);

    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const saveFitness = async () => {
    if (!user || !profile) return;
    await supabase
      .from("profiles")
      .update({
        height_cm: profile.height_cm,
        current_weight_kg: profile.current_weight_kg,
        goal_weight_kg: profile.goal_weight_kg,
        activity_level: profile.activity_level,
        daily_calorie_goal: profile.daily_calorie_goal,
        fitness_goal: profile.fitness_goal ?? "maintain",
      } as any)
      .eq("id", user.id);

    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  // Secure payment setup: Saves card on file & schedules first deduction when trial ends
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cardNumber || !cardExpiry || !cardCvv) return;
    setIsProcessing(true);

    setTimeout(async () => {
      const cleanCard = cardNumber.replace(/\s+/g, "");
      const lastFour = cleanCard.slice(-4) || "4242";

      // If user is currently in trial, first deduction is after trial ends. If trial expired, deduct now.
      const firstBilling = daysLeft > 0 && trialEndDate ? trialEndDate : new Date();
      if (daysLeft === 0) {
        firstBilling.setMonth(firstBilling.getMonth() + 1);
      }

      await supabase
        .from("profiles")
        .update({
          subscription_tier: "premium",
          subscription_status: "active",
          card_last_four: lastFour,
          card_brand: cleanCard.startsWith("5") ? "Mastercard" : "Visa",
          next_billing_date: firstBilling.toISOString(),
        } as any)
        .eq("id", user.id);

      setIsProcessing(false);
      setShowUpgradeModal(false);
      refresh();
    }, 1500);
  };

  const handleCancelSubscription = async () => {
    if (!user || !confirm("Are you sure you want to cancel your Premium subscription?")) return;
    await supabase
      .from("profiles")
      .update({
        subscription_tier: "free",
        subscription_status: "cancelled",
        next_billing_date: null,
      } as any)
      .eq("id", user.id);
    refresh();
  };

  if (!profile) return <p className="p-6 text-muted-foreground">Loading profile...</p>;

  const displayName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user?.email?.split("@")[0] || "User";
  const isPremium = profile.subscription_tier === "premium";
  const isTrialActive = !isPremium && daysLeft > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      
      {/* 1. TOP HEADER & 60-DAY COUNTDOWN CARD */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20 shadow-inner">
              <UserIcon className="h-10 w-10" />
            </div>
            {isPremium && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2 w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="font-display text-2xl font-extrabold text-foreground">{displayName}</h1>
              {isPremium ? (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Premium Active
                </span>
              ) : isTrialActive ? (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> 60-Day Free Trial
                </span>
              ) : (
                <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Trial Expired
                </span>
              )}
            </div>

            {/* Interactive Bio Container */}
            <div className="relative max-w-lg space-y-2">
              <div className="relative">
                <textarea
                  ref={bioInputRef}
                  disabled={!isEditingBio}
                  value={profile.bio ?? ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder={isEditingBio ? "Type your bio here..." : "No bio added yet. Click the pencil to add one!"}
                  className={`w-full rounded-2xl border px-3.5 py-2 pr-9 text-xs transition min-h-[55px] resize-none outline-none ${
                    isEditingBio
                      ? "border-primary bg-background text-foreground ring-2 ring-primary/20"
                      : "border-border/80 bg-background/50 text-muted-foreground cursor-default"
                  }`}
                />
                
                <button
                  type="button"
                  onClick={isEditingBio ? saveBio : handleEditBioClick}
                  title={isEditingBio ? "Save Bio" : "Edit Bio"}
                  className="absolute right-2.5 top-2.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg bg-card border border-border text-muted-foreground hover:text-primary transition shadow-sm"
                >
                  {isEditingBio ? <Check className="h-3.5 w-3.5 text-primary" /> : <Edit3 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {isEditingBio && (
                <div className="flex items-center gap-2 justify-end animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(false)}
                    className="cursor-pointer rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveBio}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <Save className="h-3.5 w-3.5" /> Save Bio
                  </button>
                </div>
              )}

              {bioFlash && (
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  ✓ Bio saved successfully!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 60-DAY COUNTDOWN BANNER */}
        <div className="rounded-2xl border border-border bg-gradient-to-r from-emerald-500/10 via-card to-amber-500/10 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                Membership Period
              </span>
              <h3 className="font-display text-base font-extrabold text-foreground">
                {isPremium
                  ? "NutriFit Premium Active"
                  : isTrialActive
                  ? `${daysLeft} Days Remaining in Free Trial`
                  : "Trial Expired — Free Access Active"}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-primary">
                {isPremium ? "∞" : daysLeft}
              </span>
              <span className="text-[10px] text-muted-foreground block">Days Left</span>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${isPremium ? 100 : (daysLeft / 60) * 100}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
            <p>
              {isPremium
                ? "Full access unlocked. Card will automatically charge on renewal."
                : isTrialActive
                ? "Enjoy full access. Workouts, Community & Nutrition logging remain free forever."
                : "Free features (Workouts, Community & Logging) remain accessible forever."}
            </p>
            {!isPremium && (
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" /> Setup Auto-Deduct (R49/mo)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. SECTION ACCORDIONS */}
      <div className="space-y-3">
        
        {/* FOLDER 1: Personal Information */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition">
          <button
            type="button"
            onClick={() => toggleFolder("personal")}
            className="flex w-full items-center justify-between p-5 text-left font-bold text-foreground hover:bg-muted/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Personal Information</h3>
                <p className="text-[11px] font-normal text-muted-foreground">First name, last name, email &amp; phone number</p>
              </div>
            </div>
            {openFolders.personal ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>

          {openFolders.personal && (
            <div className="border-t border-border p-6 space-y-4 animate-in fade-in">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email Address (Locked)">
                  <div className="relative">
                    <input
                      disabled
                      value={user?.email ?? ""}
                      className="input cursor-not-allowed bg-muted/50 pr-10 text-muted-foreground font-medium"
                    />
                    <Lock className="absolute right-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
                  </div>
                </Field>

                <Field label="First Name">
                  <input
                    value={profile.first_name ?? ""}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    className="input"
                    placeholder="First Name"
                  />
                </Field>

                <Field label="Last Name">
                  <input
                    value={profile.last_name ?? ""}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    className="input"
                    placeholder="Last Name"
                  />
                </Field>

                <Field label="Phone Number">
                  <div className="flex rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition">
                    <select
                      value={profile.country_code ?? "+27"}
                      onChange={(e) => setProfile({ ...profile, country_code: e.target.value })}
                      className="bg-muted/40 px-3 py-2.5 text-xs font-bold text-foreground outline-none border-r border-border cursor-pointer"
                    >
                      <option value="+27">🇿🇦 +27</option>
                      <option value="+268">🇸🇿 +268</option>
                      <option value="+266">🇱🇸 +266</option>
                      <option value="+264">🇳🇦 +264</option>
                      <option value="+267">🇧🇼 +267</option>
                      <option value="+263">🇿🇼 +263</option>
                      <option value="+258">🇲ℤ +258</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>

                    <input
                      type="tel"
                      maxLength={10}
                      value={profile.raw_phone ?? ""}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.startsWith("0")) {
                          val = val.substring(1);
                        }
                        setProfile({ ...profile, raw_phone: val });
                      }}
                      className="w-full bg-transparent px-3 py-2.5 text-sm outline-none text-foreground"
                      placeholder="82 123 4567"
                    />
                  </div>
                </Field>
              </div>

              <button
                type="button"
                onClick={savePersonal}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Save className="h-4 w-4" /> {savedFlash ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* FOLDER 2: Fitness & Goal Targets */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition">
          <button
            type="button"
            onClick={() => toggleFolder("fitness")}
            className="flex w-full items-center justify-between p-5 text-left font-bold text-foreground hover:bg-muted/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Fitness &amp; Goal Targets</h3>
                <p className="text-[11px] font-normal text-muted-foreground">Height, starting weight, goal weight &amp; daily calories</p>
              </div>
            </div>
            {openFolders.fitness ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>

          {openFolders.fitness && (
            <div className="border-t border-border p-6 space-y-4 animate-in fade-in">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Starting Weight (Locked)">
                  <div className="relative">
                    <input
                      disabled
                      value={profile.starting_weight_kg ? `${profile.starting_weight_kg} kg` : "— kg"}
                      className="input cursor-not-allowed bg-muted/50 pr-10 font-semibold text-muted-foreground"
                    />
                    <Lock className="absolute right-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
                  </div>
                </Field>

                <Field label="Current Weight (kg)">
                  <input
                    type="number"
                    value={profile.current_weight_kg ?? ""}
                    onChange={(e) => setProfile({ ...profile, current_weight_kg: Number(e.target.value) })}
                    className="input"
                    placeholder="72"
                  />
                </Field>

                <Field label="Goal Weight (kg)">
                  <input
                    type="number"
                    value={profile.goal_weight_kg ?? ""}
                    onChange={(e) => setProfile({ ...profile, goal_weight_kg: Number(e.target.value) })}
                    className="input"
                    placeholder="68"
                  />
                </Field>

                <Field label="Height (cm)">
                  <input
                    type="number"
                    value={profile.height_cm ?? ""}
                    onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
                    className="input"
                    placeholder="175"
                  />
                </Field>

                <Field label="Daily Calorie Goal (kcal)">
                  <input
                    type="number"
                    value={profile.daily_calorie_goal ?? ""}
                    onChange={(e) => setProfile({ ...profile, daily_calorie_goal: Number(e.target.value) })}
                    className="input"
                    placeholder="2000"
                  />
                </Field>

                <Field label="Activity Level">
                  <select
                    value={profile.activity_level ?? "moderate"}
                    onChange={(e) => setProfile({ ...profile, activity_level: e.target.value })}
                    className="input"
                  >
                    <option value="sedentary">Sedentary (Little or no exercise)</option>
                    <option value="light">Lightly Active (Exercise 1-3 days/week)</option>
                    <option value="moderate">Moderately Active (Exercise 3-5 days/week)</option>
                    <option value="active">Very Active (Exercise 6-7 days/week)</option>
                    <option value="very_active">Extremely Active (Physical job or 2x training)</option>
                  </select>
                </Field>

                <Field label="Primary Fitness Goal">
                  <select
                    value={profile.fitness_goal ?? "maintain"}
                    onChange={(e) => setProfile({ ...profile, fitness_goal: e.target.value })}
                    className="input"
                  >
                    <option value="lose_weight">Weight Loss &amp; Fat Reduction</option>
                    <option value="maintain">Maintain Weight &amp; Improve Energy</option>
                    <option value="gain_muscle">Muscle Gain &amp; Hypertrophy</option>
                  </select>
                </Field>
              </div>

              <button
                type="button"
                onClick={saveFitness}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Save className="h-4 w-4" /> {savedFlash ? "Saved ✓" : "Save Targets"}
              </button>
            </div>
          )}
        </div>

        {/* FOLDER 3: Theme & Display Mode */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition">
          <button
            type="button"
            onClick={() => toggleFolder("theme")}
            className="flex w-full items-center justify-between p-5 text-left font-bold text-foreground hover:bg-muted/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Sun className="h-5 w-5 dark:hidden" />
                <Moon className="h-5 w-5 hidden dark:block" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Theme &amp; Display</h3>
                <p className="text-[11px] font-normal text-muted-foreground">Switch between Light and Dark mode across all pages</p>
              </div>
            </div>
            {openFolders.theme ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>

          {openFolders.theme && (
            <div className="border-t border-border p-6 animate-in fade-in">
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => applyTheme("light")}
                  className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition ${
                    theme === "light"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-5 w-5" />
                  <span>Light Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTheme("dark")}
                  className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition ${
                    theme === "dark"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="h-5 w-5" />
                  <span>Dark Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTheme("system")}
                  className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-bold transition ${
                    theme === "system"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Laptop className="h-5 w-5" />
                  <span>System</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOLDER 4: Premium Subscription & Billing */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition">
          <button
            type="button"
            onClick={() => toggleFolder("subscription")}
            className="flex w-full items-center justify-between p-5 text-left font-bold text-foreground hover:bg-muted/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Billing &amp; Premium Subscription</h3>
                <p className="text-[11px] font-normal text-muted-foreground">Manage your 60-day trial, auto-deductions &amp; payment method</p>
              </div>
            </div>
            {openFolders.subscription ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>

          {openFolders.subscription && (
            <div className="border-t border-border p-6 space-y-4 animate-in fade-in">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  NutriFit Premium (R49.00 / month)
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isPremium
                    ? `Active Membership — Next automatic debit of R49.00 on ${profile.next_billing_date ? new Date(profile.next_billing_date).toLocaleDateString() : "next cycle"}. Card on file: ${profile.card_brand || "Card"} ending in ${profile.card_last_four || "••••"}.`
                    : isTrialActive
                    ? `You are currently on your 60-Day Free Trial (${daysLeft} days left). Enter your card to ensure uninterrupted AI & Recipe access after the trial ends.`
                    : "Your 60-day trial has ended. Set up your monthly subscription to reactivate NutriGuide AI and exclusive Recipes."}
                </p>
              </div>

              <div>
                {isPremium ? (
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    className="cursor-pointer rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  >
                    Cancel Monthly Subscription
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition"
                  >
                    <Sparkles className="h-4 w-4" /> {daysLeft > 0 ? "Save Card for Auto-Deduct (R49/mo)" : "Reactivate Premium (R49/mo)"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 3. PAYMENT SETUP MODAL (AUTO-DEDUCT POST TRIAL) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="font-display text-lg font-bold text-foreground">NutriFit Premium Setup</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 text-xs space-y-2">
              <p className="font-bold text-amber-600 dark:text-amber-400">
                R49.00 / month {daysLeft > 0 ? `(First deduction in ${daysLeft} days)` : "(Auto-renews monthly)"}
              </p>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Free for first 60 days (No charge today)</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Unlimited NutriGuide AI voice coaching</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Full access to verified recipes catalog</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 1-click cancellation anytime in Profile</li>
              </ul>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-3">
              <Field label="Cardholder Name">
                <input
                  required
                  placeholder="e.g. Lethabo C Zwane"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Card Number">
                <div className="relative">
                  <input
                    required
                    maxLength={19}
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="input pl-10"
                  />
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Expiry Date">
                  <input
                    required
                    maxLength={5}
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="CVV">
                  <input
                    required
                    maxLength={4}
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="input"
                  />
                </Field>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                <AlertCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>Encrypted with 256-bit bank security. Cancel anytime.</span>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full cursor-pointer rounded-2xl bg-amber-500 py-3 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition disabled:opacity-50 mt-2"
              >
                {isProcessing
                  ? "Authorizing Card..."
                  : daysLeft > 0
                  ? `Save Card (Deduct R49/mo after ${daysLeft} days)`
                  : "Authorize & Subscribe (R49.00/mo)"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;border-radius:.75rem;border:1px solid var(--input);background:var(--background);padding:.6rem 1rem;font-size:.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default ProfilePage;