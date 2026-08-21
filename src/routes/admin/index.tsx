import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  LogOut,
  Shield,
  Layers,
  ChefHat,
  Plus,
  Trash2,
  Utensils,
  Flame,
  Clock,
  Loader2,
  FileCheck,
  X,
  Check,
  MessageSquare,
  Settings,
  User,
  Moon,
  Sun,
  ShieldCheck,
  UserPlus,
  Edit3,
  UserMinus,
  Eye,
  CreditCard,
  Calendar,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

// KNOWN ADMIN IDS & EMAILS TO COMPLETELY EXCLUDE FROM APP METRICS & SUBSCRIBER LISTS
const ADMIN_EMAILS = [
  "officialnutrifit01@gmail.com",
  "admin@nutrifit.co.za",
  "admin@nutrifit-app.co.za",
];

const ADMIN_EXCLUDE_IDS = [
  "4b30f655-97e2-40d9-a437-eedab7aad214",
];

function isAccountAdmin(p: any): boolean {
  if (!p) return false;
  if (p.id && ADMIN_EXCLUDE_IDS.includes(p.id)) return true;
  
  const email = (p.email || "").toLowerCase().trim();
  if (email && ADMIN_EMAILS.some((adm) => email === adm.toLowerCase().trim())) {
    return true;
  }

  const name = (p.full_name || "").toLowerCase().trim();
  if (name === "nutrifit admin" || name === "admin nutrifit" || name === "system administrator") {
    return true;
  }

  return false;
}

// RESOLVE ACCURATE HUMAN-READABLE FULL NAME FOR DISPLAY
function resolveUserFullName(p: any): string {
  if (!p) return "Valued Member";

  const explicitFullName = p.full_name?.trim();
  if (explicitFullName && explicitFullName.toLowerCase() !== "registered member") {
    return explicitFullName;
  }

  const combined = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  if (combined) {
    return combined;
  }

  if (p.email) {
    const rawPrefix = p.email.split("@")[0].replace(/[._-]/g, " ");
    return rawPrefix
      .split(" ")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
      .trim();
  }

  if (p.phone_number) {
    return `User (${p.phone_number.slice(-4)})`;
  }

  return "Valued Member";
}

interface RecipeForm {
  title: string;
  description: string;
  category: string;
  prep_time: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  ingredients: string;
  instructions: string;
}

interface CommunityRecipe {
  id: string;
  title: string;
  author: string;
  image_url?: string;
  category: string;
  prep_time: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  ingredients: string[];
  instructions: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface ChatGroup {
  id: string;
  name: string;
  category: string;
  description: string;
  max_members?: number;
  created_at: string;
  member_count?: number;
}

interface GroupMember {
  user_id: string;
  full_name: string;
  email?: string;
}

interface SubscriberInfo {
  id: string;
  full_name: string;
  email?: string;
  tier: string;
  amount_rands: number;
  billing_day: number;
  next_billing_date: string | null;
  card_last_four: string | null;
  card_brand: string | null;
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "recipes" | "community" | "groups" | "subscribers" | "profile">("overview");

  // Theme State
  const [adminTheme, setAdminTheme] = useState<"dark" | "light">("dark");

  // Real Database Metrics State (Strictly Non-Admin)
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [dailyLogsCount, setDailyLogsCount] = useState(0);
  const [freeUsersCount, setFreeUsersCount] = useState(0);
  const [premiumUsersCount, setPremiumUsersCount] = useState(0);
  const [subscribersList, setSubscribersList] = useState<SubscriberInfo[]>([]);

  // Recipe Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Group Modal States
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);

  // Group Members Modal State
  const [managingMembersGroup, setManagingMembersGroup] = useState<ChatGroup | null>(null);
  const [groupMembersList, setGroupMembersList] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // State Management
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishedRecipes, setPublishedRecipes] = useState<any[]>([]);
  const [fetchingRecipes, setFetchingRecipes] = useState(false);

  // Community Moderation
  const [pendingRecipes, setPendingRecipes] = useState<CommunityRecipe[]>([]);
  const [rejectFeedback, setRejectFeedback] = useState<{ [key: string]: string }>({});
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);

  // Chat Group Management
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [fetchingGroups, setFetchingGroups] = useState(false);

  // Forms
  const [groupForm, setGroupForm] = useState({
    name: "",
    category: "Beginner & Mindful",
    description: "",
    max_members: "100",
  });

  const [form, setForm] = useState<RecipeForm>({
    title: "",
    description: "",
    category: "High Protein",
    prep_time: "20 mins",
    calories: "450",
    protein: "35g",
    carbs: "40g",
    fat: "12g",
    ingredients: "",
    instructions: "",
  });

  useEffect(() => {
    fetchRealDatabaseMetrics();
    fetchOfficialRecipes();
    fetchPendingCommunityRecipes();
    fetchChatGroups();
  }, []);

  // 1. FETCH METRICS - STRICTLY EXCLUDES ANY ADMIN ACCOUNT
  const fetchRealDatabaseMetrics = async () => {
    setMetricsLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    try {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("*");

      if (!pError && profiles) {
        // Exclude all admin accounts from user metrics and subscriber counts
        const regularUsers = profiles.filter((p: any) => !isAccountAdmin(p));

        setTotalUsersCount(regularUsers.length);

        let freeCount = 0;
        let premCount = 0;
        const subs: SubscriberInfo[] = [];

        regularUsers.forEach((p: any) => {
          const isPrem =
            p.subscription_tier?.toLowerCase() === "premium" &&
            p.subscription_status?.toLowerCase() === "active";

          if (isPrem) {
            premCount++;
            const billingDate = p.next_billing_date ? new Date(p.next_billing_date) : new Date();
            const fullName = resolveUserFullName(p);

            subs.push({
              id: p.id,
              full_name: fullName,
              email: p.email || p.phone_number || "Active Subscriber",
              tier: "NutriFit Premium",
              amount_rands: 49.0,
              billing_day: billingDate.getDate(),
              next_billing_date: p.next_billing_date,
              card_last_four: p.card_last_four || "••••",
              card_brand: p.card_brand || "PayPal Subscription",
            });
          } else {
            freeCount++;
          }
        });

        setFreeUsersCount(freeCount);
        setPremiumUsersCount(premCount);
        setSubscribersList(subs);
      }

      // Fetch Real Activity Logs For Today
      const [{ count: foodCount }, { count: waterCount }, { count: workoutCount }] = await Promise.all([
        supabase.from("food_logs").select("*", { count: "exact", head: true }).eq("log_date", today),
        supabase.from("water_logs").select("*", { count: "exact", head: true }).eq("log_date", today),
        supabase.from("workout_sessions").select("*", { count: "exact", head: true }).gte("started_at", today + "T00:00:00"),
      ]);

      const totalLogs = (foodCount || 0) + (waterCount || 0) + (workoutCount || 0);
      setDailyLogsCount(totalLogs);
    } catch (err) {
      console.error("Failed to load real database metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchOfficialRecipes = async () => {
    setFetchingRecipes(true);
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPublishedRecipes(data);
      }
    } catch (err) {
      console.error("Failed to load official recipes:", err);
    } finally {
      setFetchingRecipes(false);
    }
  };

  const fetchPendingCommunityRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("community_recipes")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPendingRecipes(data);
      }
    } catch (err) {
      console.error("Failed to load community recipes:", err);
    }
  };

  const fetchChatGroups = async () => {
    setFetchingGroups(true);
    try {
      const [{ data: groupsData }, { data: membersData }] = await Promise.all([
        supabase.from("chat_groups").select("*").order("created_at", { ascending: false }),
        supabase.from("chat_group_members").select("group_id, user_id"),
      ]);

      if (groupsData) {
        const countMap: { [key: string]: number } = {};
        (membersData || []).forEach((m: any) => {
          if (!ADMIN_EXCLUDE_IDS.includes(m.user_id)) {
            countMap[m.group_id] = (countMap[m.group_id] || 0) + 1;
          }
        });

        const formatted = groupsData.map((g: any) => ({
          ...g,
          member_count: countMap[g.id] || 0,
        }));

        setChatGroups(formatted);
      }
    } catch (err) {
      console.error("Failed to load chat groups:", err);
    } finally {
      setFetchingGroups(false);
    }
  };

  // FETCH GROUP MEMBERS EXCLUDING ADMINS
  const fetchGroupMembers = async (groupId: string) => {
    setLoadingMembers(true);
    try {
      const { data: memberRows, error: mErr } = await supabase
        .from("chat_group_members")
        .select("*")
        .eq("group_id", groupId);

      if (mErr) throw mErr;

      if (!memberRows || memberRows.length === 0) {
        setGroupMembersList([]);
        return;
      }

      const userIds = memberRows
        .map((r: any) => r.user_id)
        .filter((uid: string) => uid && !ADMIN_EXCLUDE_IDS.includes(uid));

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap: { [key: string]: any } = {};
      (profileRows || []).forEach((p: any) => {
        if (!isAccountAdmin(p)) {
          profileMap[p.id] = p;
        }
      });

      const formatted: GroupMember[] = userIds
        .filter((uid: string) => profileMap[uid])
        .map((uid: string) => {
          const prof = profileMap[uid];
          return {
            user_id: uid,
            full_name: resolveUserFullName(prof),
            email: prof?.email || prof?.phone_number || "Active Member",
          };
        });

      setGroupMembersList(formatted);
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const ingredientsArray = form.ingredients
        .split("\n")
        .map((i) => i.trim())
        .filter(Boolean);

      const instructionsArray = form.instructions
        .split("\n")
        .map((i) => i.trim())
        .filter(Boolean);

      const { error } = await supabase.from("recipes").insert([
        {
          title: form.title,
          description: form.description,
          category: form.category,
          prep_time: form.prep_time,
          calories: parseInt(form.calories) || 0,
          protein: form.protein,
          carbs: form.carbs,
          fat: form.fat,
          ingredients: ingredientsArray,
          instructions: instructionsArray,
          is_official: true,
        },
      ]);

      if (error) throw error;

      setSuccessMsg(`"${form.title}" has been published to the main app!`);
      setForm({
        title: "",
        description: "",
        category: "High Protein",
        prep_time: "20 mins",
        calories: "450",
        protein: "35g",
        carbs: "40g",
        fat: "12g",
        ingredients: "",
        instructions: "",
      });

      setIsModalOpen(false);
      fetchOfficialRecipes();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to publish recipe.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm("Are you sure you want to remove this recipe from the app?")) return;

    try {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
      fetchOfficialRecipes();
    } catch (err: any) {
      alert("Failed to delete recipe: " + err.message);
    }
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("chat_groups")
          .update({
            name: groupForm.name,
            category: groupForm.category,
            description: groupForm.description,
            max_members: parseInt(groupForm.max_members) || 100,
          })
          .eq("id", editingGroup.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("chat_groups").insert([
          {
            name: groupForm.name,
            category: groupForm.category,
            description: groupForm.description,
            max_members: parseInt(groupForm.max_members) || 100,
          },
        ]);

        if (error) throw error;
      }

      setGroupForm({
        name: "",
        category: "Beginner & Mindful",
        description: "",
        max_members: "100",
      });

      setIsGroupModalOpen(false);
      setEditingGroup(null);
      fetchChatGroups();
    } catch (err: any) {
      alert("Failed to save group: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditGroupModal = (group: ChatGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      category: group.category,
      description: group.description,
      max_members: (group.max_members || 100).toString(),
    });
    setIsGroupModalOpen(true);
  };

  const openMembersModal = (group: ChatGroup) => {
    setManagingMembersGroup(group);
    fetchGroupMembers(group.id);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!managingMembersGroup) return;
    if (!confirm("Are you sure you want to remove this user from the group?")) return;

    try {
      const { error } = await supabase
        .from("chat_group_members")
        .delete()
        .eq("group_id", managingMembersGroup.id)
        .eq("user_id", userId);

      if (error) throw error;
      setGroupMembersList((prev) => prev.filter((m) => m.user_id !== userId));
      fetchChatGroups();
    } catch (err: any) {
      alert("Failed to remove member: " + err.message);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chat group? All messages and memberships will be deleted.")) return;

    try {
      const { error } = await supabase.from("chat_groups").delete().eq("id", id);
      if (error) throw error;
      fetchChatGroups();
    } catch (err: any) {
      alert("Failed to delete group: " + err.message);
    }
  };

  const handleApproveRecipe = async (id: string) => {
    try {
      const { error } = await supabase
        .from("community_recipes")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert("Failed to approve recipe: " + err.message);
    }
  };

  const handleRejectRecipe = async (id: string) => {
    const feedback = rejectFeedback[id] || "Does not meet community guidelines.";
    try {
      const { error } = await supabase
        .from("community_recipes")
        .update({ status: "rejected", feedback })
        .eq("id", id);

      if (error) throw error;
      setActiveRejectId(null);
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert("Failed to reject recipe: " + err.message);
    }
  };

  const totalMonthlyRevenue = subscribersList.length * 49;

  const navItems = [
    { id: "overview", label: "Oversight", icon: Activity, badge: null },
    { id: "subscribers", label: "Subscribers", icon: CreditCard, badge: premiumUsersCount },
    { id: "recipes", label: "Recipes", icon: ChefHat, badge: null },
    { id: "community", label: "Review", icon: FileCheck, badge: pendingRecipes.length || null },
    { id: "groups", label: "Groups", icon: Users, badge: null },
    { id: "profile", label: "Settings", icon: Settings, badge: null },
  ] as const;

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors ${
        adminTheme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* MOBILE TOP BAR */}
      <header
        className={`md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30 backdrop-blur-md ${
          adminTheme === "dark" ? "border-slate-800 bg-slate-950/90" : "border-slate-200 bg-white/90"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500/10 p-1.5 rounded-xl text-emerald-500 border border-emerald-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <span className="font-display font-extrabold text-sm tracking-tight">NutriFit Admin</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdminTheme(adminTheme === "dark" ? "light" : "dark")}
            className={`p-2 rounded-xl border transition ${
              adminTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-300" : "border-slate-200 bg-slate-100 text-slate-700"
            }`}
            title="Toggle theme"
          >
            {adminTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* MOBILE SCROLLABLE NAV */}
      <div
        className={`md:hidden flex items-center gap-1.5 overflow-x-auto px-3 py-2.5 border-b sticky top-[53px] z-20 no-scrollbar ${
          adminTheme === "dark" ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-slate-100/80"
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                isActive
                  ? "bg-emerald-500 text-white shadow-xs"
                  : adminTheme === "dark"
                  ? "text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800"
                  : "text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.badge !== null && item.badge > 0 && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white text-emerald-600" : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex w-64 border-r p-6 flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto ${
          adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"
        }`}
      >
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-2xl text-emerald-500 border border-emerald-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="font-display text-base font-extrabold tracking-tight block">
                NutriFit Admin
              </span>
              <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">
                Live Data Oversight
              </span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm"
                      : adminTheme === "dark"
                      ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? "bg-white text-emerald-600"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs font-semibold text-rose-500 hover:text-rose-400 transition pt-4 border-t border-slate-800/80 cursor-pointer"
        >
          <LogOut className="h-4 w-4" /> Sign Out Admin
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
        
        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8 max-w-5xl">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">App Oversight &amp; Real Data</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Live metrics strictly reflecting normal app users (admins excluded).
                </p>
              </div>
              <button
                type="button"
                onClick={fetchRealDatabaseMetrics}
                className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" /> Refresh Data
              </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Total Registered Users</span>
                  <Users className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold">
                  {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : totalUsersCount}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                  Excludes Admin Account
                </span>
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Today's User Activity Logs</span>
                  <Activity className="h-4 w-4 text-sky-500" />
                </div>
                <div className="text-2xl font-extrabold">
                  {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : dailyLogsCount}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Meals + Water + Workouts
                </span>
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Free / Trial Members</span>
                  <Users className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-amber-500">
                  {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : freeUsersCount}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Free / 60-Day Trial Active
                </span>
              </div>

              <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">Paid Subscribers</span>
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : premiumUsersCount}
                </div>
                <span className="text-[10px] font-semibold text-emerald-500 mt-1 block">
                  R49.00 / month recurring
                </span>
              </div>
            </div>

            <div className={`rounded-3xl border p-5 sm:p-6 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h3 className="text-sm sm:text-base font-bold mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" /> Database Summary
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 text-xs">
                  <span className="font-semibold">Published Official Recipes</span>
                  <span className="font-mono text-emerald-400 font-bold">{publishedRecipes.length} live</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 text-xs">
                  <span className="font-semibold">Community Submissions to Review</span>
                  <span className="font-mono text-amber-400 font-bold">{pendingRecipes.length} pending</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Active Community Chat Groups</span>
                  <span className="font-mono text-slate-400">{chatGroups.length} groups created</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DETAILED SUBSCRIBERS */}
        {activeTab === "subscribers" && (
          <div className="space-y-6 md:space-y-8 max-w-5xl">
            <header>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" /> Premium Subscribers
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Paying user accounts with verified full names (admin accounts excluded).
              </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div className={`p-4 sm:p-5 rounded-2xl border ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Free / Trial Members</span>
                <span className="text-2xl font-extrabold text-amber-400">{freeUsersCount}</span>
                <p className="text-[11px] text-slate-500 mt-1">Free features or active trial</p>
              </div>

              <div className={`p-4 sm:p-5 rounded-2xl border ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Paid Subscribers</span>
                <span className="text-2xl font-extrabold text-emerald-400">{premiumUsersCount}</span>
                <p className="text-[11px] text-slate-500 mt-1">Full AI &amp; Recipe access</p>
              </div>

              <div className={`p-4 sm:p-5 rounded-2xl border ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Monthly Revenue</span>
                <span className="text-2xl font-extrabold text-emerald-400">R{totalMonthlyRevenue.toFixed(2)}</span>
                <p className="text-[11px] text-slate-500 mt-1">Calculated from R49.00 / user</p>
              </div>
            </div>

            <div className={`rounded-3xl border p-4 sm:p-6 shadow-sm overflow-hidden ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h2 className="text-sm sm:text-base font-bold mb-4">
                Paying Member Details ({subscribersList.length})
              </h2>

              {subscribersList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                  No active paying members in the database yet.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                          <th className="pb-3 font-semibold pr-4">Full Name</th>
                          <th className="pb-3 font-semibold px-4">Price</th>
                          <th className="pb-3 font-semibold px-4">Billing Day</th>
                          <th className="pb-3 font-semibold px-4">Payment Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {subscribersList.map((sub) => (
                          <tr key={sub.id} className="text-slate-200">
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                                  {sub.full_name[0] || "U"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-100 truncate">{sub.full_name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{sub.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                R49.00 / mo
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-400">
                              Day {sub.billing_day}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400">
                              {sub.card_brand} (•••• {sub.card_last_four})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: OFFICIAL RECIPES */}
        {activeTab === "recipes" && (
          <div className="space-y-6 md:space-y-8 max-w-5xl">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" /> Official Recipes
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Nutritionist-approved recipes published directly to the main app catalog.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create Recipe
              </button>
            </header>

            {successMsg && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400">
                {successMsg}
              </div>
            )}

            <div className={`rounded-3xl border p-4 sm:p-6 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h2 className="text-sm sm:text-base font-bold mb-4 flex items-center justify-between">
                <span>Official Catalog ({publishedRecipes.length})</span>
                {fetchingRecipes && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </h2>

              {publishedRecipes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                  No official recipes published yet. Click <strong>+ Create Recipe</strong> to publish one!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {publishedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between shadow-xs transition hover:border-slate-700 ${
                        adminTheme === "dark" ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 mb-1 border border-emerald-500/20">
                              {recipe.category || "Official"}
                            </span>
                            <h3 className="text-sm font-bold text-slate-100 truncate">{recipe.title}</h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 cursor-pointer"
                            title="Delete this recipe"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {recipe.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-slate-400 border-t border-slate-800/60 pt-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-500" /> {recipe.prep_time || "15 mins"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-amber-500" /> {recipe.calories || 0} cal
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {recipe.protein || "0g"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REVIEW COMMUNITY RECIPES */}
        {activeTab === "community" && (
          <div className="space-y-6 md:space-y-8 max-w-5xl">
            <header>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                <FileCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" /> Review Submissions
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Inspect pending recipes submitted by members before publishing them to the app.
              </p>
            </header>

            {pendingRecipes.length === 0 ? (
              <div className={`rounded-3xl border p-8 sm:p-12 text-center text-xs text-slate-400 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-sm font-bold text-slate-200">All caught up!</h3>
                <p className="mt-1">There are no pending community recipes right now.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {pendingRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className={`rounded-3xl border p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 ${
                      adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="w-full sm:w-40 md:w-48 h-44 sm:h-48 rounded-2xl bg-slate-800 overflow-hidden shrink-0 relative border border-slate-700/50">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                          <ChefHat className="h-8 w-8 mb-1 opacity-50" />
                          <span>No Image</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30 backdrop-blur-xs">
                        {recipe.category || "Community"}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h3 className="text-base font-bold text-slate-100">{recipe.title}</h3>
                          <span className="text-xs text-slate-400">
                            By <span className="font-semibold text-emerald-400">{recipe.author}</span>
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-medium text-slate-300">
                          <span className="flex items-center gap-1 rounded-lg bg-slate-800/60 px-2 py-1 border border-slate-700/40 text-[11px]">
                            <Clock className="h-3 w-3 text-emerald-400" /> {recipe.prep_time}
                          </span>
                          <span className="flex items-center gap-1 rounded-lg bg-slate-800/60 px-2 py-1 border border-slate-700/40 text-[11px]">
                            <Flame className="h-3 w-3 text-amber-400" /> {recipe.calories} kcal
                          </span>
                          <span className="rounded-lg bg-slate-800/60 px-2 py-1 font-mono text-emerald-400 border border-slate-700/40 text-[11px]">
                            P: {recipe.protein}
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-slate-400">
                          <strong className="text-slate-300 block mb-1">Ingredients:</strong>
                          <p className="line-clamp-2">{recipe.ingredients?.join(", ")}</p>
                        </div>
                      </div>

                      {activeRejectId === recipe.id && (
                        <div className="space-y-2 rounded-xl bg-slate-950 p-3 border border-rose-500/30">
                          <label className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Provide Feedback:
                          </label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Please upload a clearer photo of the prepared meal."
                            value={rejectFeedback[recipe.id] || ""}
                            onChange={(e) =>
                              setRejectFeedback({ ...rejectFeedback, [recipe.id]: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
                        {activeRejectId === recipe.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveRejectId(null)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRecipe(recipe.id)}
                              className="flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition cursor-pointer"
                            >
                              Confirm Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveRejectId(recipe.id)}
                              className="flex items-center gap-1 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition border border-rose-500/20 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveRecipe(recipe.id)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CHAT GROUPS */}
        {activeTab === "groups" && (
          <div className="space-y-6 md:space-y-8 max-w-5xl">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" /> Community Groups
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Create, edit details, inspect live members, and manage chat rooms.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingGroup(null);
                  setGroupForm({
                    name: "",
                    category: "Beginner & Mindful",
                    description: "",
                    max_members: "100",
                  });
                  setIsGroupModalOpen(true);
                }}
                className="self-start sm:self-auto flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create Group
              </button>
            </header>

            <div className={`rounded-3xl border p-4 sm:p-6 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h2 className="text-sm sm:text-base font-bold mb-4 flex items-center justify-between">
                <span>Active Groups ({chatGroups.length})</span>
                {fetchingGroups && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </h2>

              {chatGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                  No active chat groups found. Click <strong>+ Create Group</strong> to create one!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {chatGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between shadow-xs ${
                        adminTheme === "dark" ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                              {group.category}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-1 truncate">{group.name}</h3>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditGroupModal(group)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                              title="Edit Group"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete Group"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                          {group.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                          <Users className="h-3.5 w-3.5" /> {group.member_count || 0} / {group.max_members || 100}
                        </span>

                        <button
                          type="button"
                          onClick={() => openMembersModal(group)}
                          className="flex items-center gap-1 text-xs font-bold text-sky-400 hover:underline cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> Members ({group.member_count || 0})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN SETTINGS */}
        {activeTab === "profile" && (
          <div className="space-y-6 md:space-y-8 max-w-2xl">
            <header>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" /> Admin Settings
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage your system administrator profile and dashboard theme preferences.
              </p>
            </header>

            <div className={`rounded-3xl border p-5 sm:p-6 shadow-sm space-y-6 ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-3.5 border-b border-slate-800/60 pb-5">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold shrink-0">
                  <User className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-1.5 truncate">
                    <span>NutriFit Admin</span> <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">officialnutrifit01@gmail.com</p>
                  <span className="mt-1.5 inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    Executive Access
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                  Dashboard Theme
                </h3>
                <p className="text-xs text-slate-400">
                  Customize the appearance of the administrator portal.
                </p>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAdminTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer border ${
                      adminTheme === "dark"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" /> Dark Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminTheme("light")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer border ${
                      adminTheme === "light"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" /> Light Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE / EDIT CHAT GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-lg rounded-3xl border p-5 sm:p-6 shadow-xl my-auto max-h-[90dvh] overflow-y-auto ${adminTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />{" "}
                {editingGroup ? "Edit Group" : "Create Chat Group"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setEditingGroup(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pretoria Running Squad"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={groupForm.category}
                    onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                  >
                    <option value="Beginner & Mindful">Beginner &amp; Mindful</option>
                    <option value="High-Energy Group">High-Energy Group</option>
                    <option value="Strength & Gym">Strength &amp; Gym</option>
                    <option value="Running & Outdoor">Running &amp; Outdoor</option>
                    <option value="Nutrition & Lifestyle">Nutrition &amp; Lifestyle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Max Members *</label>
                  <input
                    type="number"
                    required
                    placeholder="100"
                    value={groupForm.max_members}
                    onChange={(e) => setGroupForm({ ...groupForm, max_members: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the focus and goals of this chat group..."
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsGroupModalOpen(false);
                    setEditingGroup(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                  {editingGroup ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW & REMOVE GROUP MEMBERS MODAL */}
      {managingMembersGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-md rounded-3xl border p-5 sm:p-6 shadow-xl my-auto max-h-[85dvh] overflow-y-auto ${adminTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="min-w-0 pr-2">
                <h2 className="text-sm sm:text-base font-bold flex items-center gap-1.5 truncate">
                  <Users className="h-4 w-4 text-emerald-500 shrink-0" /> Members Roster
                </h2>
                <p className="text-xs text-slate-400 truncate">{managingMembersGroup.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setManagingMembersGroup(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingMembers ? (
              <div className="flex h-32 items-center justify-center text-xs text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mr-2" /> Loading roster...
              </div>
            ) : groupMembersList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-300">No members in this group yet</p>
                <p>When users join this chat room from the app, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Members ({groupMembersList.length})
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {groupMembersList.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                          {m.full_name?.[0] || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{m.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{m.email}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white text-[11px] font-bold transition border border-rose-500/20 cursor-pointer"
                        title="Remove member"
                      >
                        <UserMinus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE OFFICIAL RECIPE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-3xl border p-5 sm:p-6 shadow-xl my-auto max-h-[90dvh] overflow-y-auto ${adminTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-500" /> Create Official Recipe
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateRecipe} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Recipe Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High-Protein Chicken Bowl"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="High Protein">High Protein</option>
                    <option value="Keto & Low Carb">Keto &amp; Low Carb</option>
                    <option value="Balanced Meals">Balanced Meals</option>
                    <option value="Pre/Post Workout">Pre/Post Workout</option>
                    <option value="Vegetarian">Vegetarian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balanced meal crafted for lean muscle gains."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Prep Time</label>
                  <input
                    type="text"
                    value={form.prep_time}
                    onChange={(e) => setForm({ ...form, prep_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Calories</label>
                  <input
                    type="number"
                    value={form.calories}
                    onChange={(e) => setForm({ ...form, calories: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Protein</label>
                  <input
                    type="text"
                    value={form.protein}
                    onChange={(e) => setForm({ ...form, protein: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Carbs</label>
                  <input
                    type="text"
                    value={form.carbs}
                    onChange={(e) => setForm({ ...form, carbs: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Fats</label>
                  <input
                    type="text"
                    value={form.fat}
                    onChange={(e) => setForm({ ...form, fat: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Ingredients (One per line) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={`200g Chicken Breast\n1 cup Brown Rice`}
                    value={form.ingredients}
                    onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Instructions (One per line) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={`1. Season chicken.\n2. Cook & serve.`}
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Utensils className="h-3.5 w-3.5" />}
                  Publish Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;