import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
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
  Check,
  Target,
  UserCheck,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Scale,
  Loader2,
  LogOut,
} from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — NutriFit" },
      { name: "description", content: "Manage your profile, fitness targets, and monthly subscription." },
    ],
  }),
  component: ProfilePage,
});

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID = "BAAxTcLqIVHVERsaIBE05lJcQiNGux3xmiuizGZiBZpXnlQBt8LGnJW9ei9gVhtwzObCQmwZzt0VJ1Mw4I";
const PAYPAL_PLAN_ID = "P-7V56155591696325CNKDKF2Q";

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchParams: any = useSearch({ strict: false });
  const [profile, setProfile] = useState<any>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // 60-Day Trial State
  const [daysLeft, setDaysLeft] = useState<number>(60);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);

  // Bio Editing
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioFlash, setBioFlash] = useState(false);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);

  // Folders
  const [openFolders, setOpenFolders] = useState<{ [key: string]: boolean }>({
    personal: true,
    fitness: false,
    theme: false,
    subscription: false,
  });

  // Theme
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    () => (localStorage.getItem("nutrifit-theme") as any) || "system"
  );

  // Payment Modal & PayPal Loading State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingPayPal, setLoadingPayPal] = useState(true);
  const paypalRenderedRef = useRef(false);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const refresh = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

    if (p) {
      const now = new Date();
      const startDate = new Date(p.created_at || now);
      const calculatedEnd = new Date(startDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      setTrialEndDate(calculatedEnd);

      const diffTime = calculatedEnd.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      setDaysLeft(diffDays);

      // Auto-downgrade on expired monthly billing
      const nextBilling = p.next_billing_date ? new Date(p.next_billing_date) : null;
      if (p.subscription_tier === "premium" && nextBilling && nextBilling < now) {
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "expired",
          } as any)
          .eq("id", user.id);

        p.subscription_tier = "free";
        p.subscription_status = "expired";
      }

      let extractedCode = "+27";
      let extractedRaw = "";

      if (p.phone_number) {
        let cleaned = p.phone_number.trim();
        if (cleaned.startsWith("+27")) {
          extractedCode = "+27";
          extractedRaw = cleaned.slice(3).replace(/\D/g, "");
        } else if (cleaned.startsWith("0")) {
          extractedRaw = cleaned.slice(1).replace(/\D/g, "");
        } else {
          extractedRaw = cleaned.replace(/\D/g, "");
        }

        if (extractedCode === "+27" && extractedRaw.length > 9) {
          extractedRaw = extractedRaw.slice(-9);
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

  // PayPal Button Dynamic Loader
  useEffect(() => {
    if (!showUpgradeModal) {
      paypalRenderedRef.current = false;
      return;
    }

    setLoadingPayPal(true);
    const containerId = `paypal-button-container-${PAYPAL_PLAN_ID}`;

    const renderPayPalButtons = () => {
      const container = document.getElementById(containerId);
      if (!window.paypal || !container || paypalRenderedRef.current) return;

      container.innerHTML = "";

      try {
        window.paypal
          .Buttons({
            style: {
              shape: "rect",
              color: "silver",
              layout: "vertical",
              label: "subscribe",
            },
            createSubscription: function (_data: any, actions: any) {
              return actions.subscription.create({
                plan_id: PAYPAL_PLAN_ID,
                custom_id: user?.id,
              });
            },
            onApprove: async function (data: any) {
              const nextBilling = new Date();
              nextBilling.setDate(nextBilling.getDate() + 30);

              await supabase
                .from("profiles")
                .update({
                  subscription_tier: "premium",
                  subscription_status: "active",
                  next_billing_date: nextBilling.toISOString(),
                  card_brand: "PayPal Subscription",
                  card_last_four: (data.subscriptionID || "PAYPAL").slice(-4),
                } as any)
                .eq("id", user?.id);

              setShowUpgradeModal(false);
              await refresh();
              alert("Subscription activated successfully! NutriFit Premium is now active.");
            },
            onError: function (err: any) {
              console.error("PayPal Error:", err);
              alert("PayPal encountered an error. Please try again.");
            },
          })
          .render(`#${containerId}`);

        paypalRenderedRef.current = true;
      } catch (err) {
        console.error("Failed rendering PayPal:", err);
      } finally {
        setLoadingPayPal(false);
      }
    };

    if (window.paypal) {
      renderPayPalButtons();
      return;
    }

    const scriptId = "paypal-sdk-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
      script.setAttribute("data-sdk-integration-source", "button-factory");
      script.async = true;

      script.onload = () => {
        renderPayPalButtons();
      };

      document.body.appendChild(script);
    } else {
      script.addEventListener("load", renderPayPalButtons);
    }
  }, [showUpgradeModal, user]);

  const handleEditBioClick = () => {
    setIsEditingBio(true);
    setTimeout(() => bioInputRef.current?.focus(), 50);
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
    let raw = (profile.raw_phone ?? "").replace(/\D/g, "");

    if (raw.startsWith("0")) raw = raw.substring(1);
    if (country === "+27" && raw.length > 9) raw = raw.slice(0, 9);

    const fullPhone = raw ? `${country}${raw}` : null;

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

  const handleCancelSubscription = async () => {
    if (!user || !confirm("Are you sure you want to cancel your Premium plan?")) return;

    await supabase
      .from("profiles")
      .update({
        subscription_tier: "free",
        subscription_status: "cancelled",
        next_billing_date: null,
      } as any)
      .eq("id", user.id);

    await refresh();
  };

  if (!profile) return <p className="p-6 text-muted-foreground">Loading profile...</p>;

  const displayName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || user?.email?.split("@")[0] || "User";
  const isPremium = profile.subscription_tier === "premium" && profile.subscription_status === "active";
  const isTrialActive = !isPremium && daysLeft > 0;
  const trialProgress = Math.min(100, Math.max(0, Math.round(((60 - daysLeft) / 60) * 100)));

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      
      {/* 1. TOP PROFILE HEADER */}
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
                  <ShieldCheck className="h-3 w-3" /> Premium Unlocked
                </span>
              ) : isTrialActive ? (
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> 60-Day Trial Active
                </span>
              ) : (
                <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Plan Due
                </span>
              )}
            </div>

            {/* Bio */}
            <div className="relative max-w-lg space-y-2">
              <div className="relative">
                <textarea
                  ref={bioInputRef}
                  disabled={!isEditingBio}
                  value={profile.bio ?? ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder={isEditingBio ? "Type your bio here..." : "No bio added yet."}
                  className={`w-full rounded-2xl border px-3.5 py-2 pr-9 text-xs transition min-h-[55px] resize-none outline-none ${
                    isEditingBio
                      ? "border-primary bg-background text-foreground ring-2 ring-primary/20"
                      : "border-border/80 bg-background/50 text-muted-foreground cursor-default"
                  }`}
                />
                <button
                  type="button"
                  onClick={isEditingBio ? saveBio : handleEditBioClick}
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
            </div>
          </div>
        </div>

        {/* 2. PROGRESS BAR & TRIAL COUNTDOWN BANNER */}
        <div className="rounded-2xl border border-border bg-gradient-to-r from-emerald-500/10 via-card to-amber-500/10 p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                Membership Cycle
              </span>
              <h3 className="font-display text-base font-extrabold text-foreground">
                {isPremium
                  ? `Active • Auto-renews on ${profile.next_billing_date ? new Date(profile.next_billing_date).toLocaleDateString() : "Next Month"}`
                  : isTrialActive
                  ? `${daysLeft} Days Remaining in Free Trial`
                  : "Trial Expired • Activate R49 Monthly Plan"}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-primary">
                {isPremium ? "Premium" : `${daysLeft}d`}
              </span>
            </div>
          </div>

          {!isPremium && (
            <div className="space-y-1.5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted border border-border">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                <span>Day {60 - daysLeft} of 60</span>
                <span>{60 - trialProgress}% Trial Left</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
            <p>
              {isPremium
                ? `Paying via ${profile.card_brand || "PayPal Subscription"}.`
                : "Workouts & Tracking stay free forever. NutriGuide AI & Verified Recipes unlock with Premium."}
            </p>
            {!isPremium && (
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" /> Unlock R49 / Month
              </button>
            )}
          </div>
        </div>

        {/* 3. STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">Daily Calories</span>
              <Flame className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <span className="text-lg font-extrabold font-mono text-foreground">
              {profile.daily_calorie_goal || 2000} <span className="text-xs font-normal text-muted-foreground">kcal</span>
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">Current Weight</span>
              <Scale className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-lg font-extrabold font-mono text-foreground">
              {profile.current_weight_kg || "--"} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">Goal Weight</span>
              <Target className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <span className="text-lg font-extrabold font-mono text-foreground">
              {profile.goal_weight_kg || "--"} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-[11px] font-medium">Height</span>
              <UserIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-lg font-extrabold font-mono text-foreground">
              {profile.height_cm || "--"} <span className="text-xs font-normal text-muted-foreground">cm</span>
            </span>
          </div>
        </div>
      </section>

      {/* 4. ACCORDION FOLDERS */}
      <div className="space-y-3">
        {/* Personal Info */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
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
                <p className="text-[11px] font-normal text-muted-foreground">Names, email &amp; mobile contact</p>
              </div>
            </div>
            {openFolders.personal ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>

          {openFolders.personal && (
            <div className="border-t border-border p-6 space-y-4 animate-in fade-in">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email (Read Only)">
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
                  <div className="flex rounded-xl border border-input bg-background overflow-hidden">
                    <select
                      value={profile.country_code ?? "+27"}
                      onChange={(e) => setProfile({ ...profile, country_code: e.target.value })}
                      className="bg-muted/40 px-3 py-2.5 text-xs font-bold text-foreground outline-none border-r border-border"
                    >
                      <option value="+27">🇿🇦 +27</option>
                      <option value="+268">🇸🇿 +268</option>
                      <option value="+266">🇱🇸 +266</option>
                      <option value="+264">🇳🇦 +264</option>
                      <option value="+267">🇧🇼 +267</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>

                    <input
                      type="tel"
                      maxLength={9}
                      value={profile.raw_phone ?? ""}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.startsWith("0")) val = val.substring(1);
                        if (val.length > 9) val = val.slice(0, 9);
                        setProfile({ ...profile, raw_phone: val });
                      }}
                      className="w-full bg-transparent px-3 py-2.5 text-sm outline-none text-foreground font-medium"
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

        {/* Fitness Targets */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
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
                <h3 className="text-sm font-bold">Fitness Targets</h3>
                <p className="text-[11px] font-normal text-muted-foreground">Height, current weight &amp; daily calorie target</p>
              </div>
            </div>
            {openFolders.fitness ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>

          {openFolders.fitness && (
            <div className="border-t border-border p-6 space-y-4 animate-in fade-in">
              <div className="grid gap-4 md:grid-cols-2">
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

        {/* Display Appearance */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => toggleFolder("theme")}
            className="flex w-full items-center justify-between p-5 text-left font-bold text-foreground hover:bg-muted/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Theme &amp; Appearance</h3>
                <p className="text-[11px] font-normal text-muted-foreground">Light, dark, or follow device settings</p>
              </div>
            </div>
            {openFolders.theme ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </button>

          {openFolders.theme && (
            <div className="border-t border-border p-6 animate-in fade-in flex gap-3">
              <button
                type="button"
                onClick={() => applyTheme("dark")}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  theme === "dark" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Moon className="h-4 w-4" /> Dark Mode
              </button>
              <button
                type="button"
                onClick={() => applyTheme("light")}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  theme === "light" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Sun className="h-4 w-4" /> Light Mode
              </button>
              <button
                type="button"
                onClick={() => applyTheme("system")}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  theme === "system" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Laptop className="h-4 w-4" /> System
              </button>
            </div>
          )}
        </div>

        {/* Subscription & Billing */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
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
                <h3 className="text-sm font-bold">Monthly Billing &amp; Subscriptions</h3>
                <p className="text-[11px] font-normal text-muted-foreground">Manage recurring deductions &amp; cancel anytime</p>
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
                    ? `Your subscription is active. Recurring monthly deduction occurs on ${profile.next_billing_date ? new Date(profile.next_billing_date).toLocaleDateString() : "the scheduled date"} via ${profile.card_brand || "PayPal"}.`
                    : "Unlock NutriGuide AI Voice Coach and Exclusive Recipes for R49.00/month. Cancelling your subscription immediately restricts Premium features while keeping Workouts and Tracking free forever."}
                </p>
              </div>

              <div>
                {isPremium ? (
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    className="cursor-pointer rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  >
                    Cancel Monthly Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition"
                  >
                    <Sparkles className="h-4 w-4" /> Subscribe with PayPal (R49.00 / mo)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. ACCOUNT ACTIONS & SIGN OUT */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <LogOut className="h-4 w-4 text-rose-500" /> Account Authentication
            </h3>
            <p className="text-xs text-muted-foreground">
              Sign out of your active NutriFit session across this browser.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-5 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sign Out of App
          </button>
        </div>
      </div>

      {/* PAYPAL SUBSCRIPTION MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="font-display text-base font-bold text-foreground">
                  Activate Monthly Plan
                </h3>
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
                R49.00 / month (Automated Recurring Deduction)
              </p>
              <ul className="space-y-1 text-muted-foreground text-[11px]">
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Unlimited NutriGuide AI voice coaching</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Full access to verified recipes catalog</li>
                <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 1-click cancellation anytime</li>
              </ul>
            </div>

            {/* EMBEDDED PAYPAL BUTTON CONTAINER */}
            <div className="pt-2 min-h-[50px] flex flex-col items-center justify-center">
              {loadingPayPal && (
                <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Loading PayPal buttons...</span>
                </div>
              )}
              <div id={`paypal-button-container-${PAYPAL_PLAN_ID}`} className="w-full" />
            </div>
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