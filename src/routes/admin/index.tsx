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

const ADMIN_EXCLUDE_ID = "4b30f655-97e2-40d9-a437-eedab7aad214";
const ADMIN_EXCLUDE_EMAIL = "admin@nutrifit.co.za";

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

  // Real Database Metrics State
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

  // 1. FETCH REAL DATABASE METRICS (EXCLUDES ADMIN ACCOUNT)
  const fetchRealDatabaseMetrics = async () => {
    setMetricsLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    try {
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("*");

      if (!pError && profiles) {
        // Exclude system admin from normal user statistics
        const regularUsers = profiles.filter(
          (p: any) => p.id !== ADMIN_EXCLUDE_ID && p.email !== ADMIN_EXCLUDE_EMAIL
        );

        setTotalUsersCount(regularUsers.length);

        let freeCount = 0;
        let premCount = 0;
        const subs: SubscriberInfo[] = [];

        regularUsers.forEach((p: any) => {
          const isPrem =
            p.subscription_tier?.toLowerCase() === "premium" ||
            p.subscription_status?.toLowerCase() === "active";

          if (isPrem) {
            premCount++;
            const billingDate = p.next_billing_date ? new Date(p.next_billing_date) : new Date();
            const resolvedName =
              p.full_name?.trim() ||
              [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
              p.email?.split("@")[0] ||
              "Registered Member";

            subs.push({
              id: p.id,
              full_name: resolvedName,
              email: p.email || p.phone_number || "User Account",
              tier: "NutriFit Premium",
              amount_rands: 49.0,
              billing_day: billingDate.getDate(),
              next_billing_date: p.next_billing_date,
              card_last_four: p.card_last_four || "••••",
              card_brand: p.card_brand || "Visa / Mastercard",
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

  // 2. FETCH CHAT GROUPS & ACCURATE LIVE MEMBER COUNTS
  const fetchChatGroups = async () => {
    setFetchingGroups(true);
    try {
      const [{ data: groupsData }, { data: membersData }] = await Promise.all([
        supabase.from("chat_groups").select("*").order("created_at", { ascending: false }),
        supabase.from("chat_group_members").select("group_id"),
      ]);

      if (groupsData) {
        const countMap: { [key: string]: number } = {};
        (membersData || []).forEach((m: any) => {
          countMap[m.group_id] = (countMap[m.group_id] || 0) + 1;
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

  // 3. RELIABLE GROUP MEMBER ROSTER RESOLVER (Fixes "NutriFit Member" bug)
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

      const userIds = memberRows.map((r: any) => r.user_id).filter(Boolean);

      // Fetch all profile records for these user IDs
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap: { [key: string]: any } = {};
      (profileRows || []).forEach((p: any) => {
        profileMap[p.id] = p;
      });

      const formatted: GroupMember[] = userIds.map((uid: string) => {
        const prof = profileMap[uid];
        const resolvedName =
          prof?.full_name?.trim() ||
          [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim() ||
          prof?.email?.split("@")[0] ||
          `User (${uid.slice(0, 6)})`;

        return {
          user_id: uid,
          full_name: resolvedName,
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

  return (
    <div
      className={`min-h-screen flex font-sans ${
        adminTheme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* SIDEBAR */}
      <aside
        className={`w-64 border-r p-6 flex flex-col justify-between shrink-0 ${
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
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "overview"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : adminTheme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>App Oversight</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("subscribers")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "subscribers"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : adminTheme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="h-4 w-4" />
                <span>Subscribers &amp; Pay</span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">
                {premiumUsersCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("recipes")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "recipes"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : adminTheme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <ChefHat className="h-4 w-4" />
              <span>Official Recipes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("community")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "community"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : adminTheme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileCheck className="h-4 w-4" />
                <span>Review Recipes</span>
              </div>
              {pendingRecipes.length > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-500 font-bold border border-amber-500/30">
                  {pendingRecipes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "groups"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : adminTheme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Manage Groups</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "profile"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : adminTheme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Admin Settings</span>
            </button>
          </nav>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs font-semibold text-rose-500 hover:text-rose-400 transition pt-4 border-t border-slate-800 cursor-pointer"
        >
          <LogOut className="h-4 w-4" /> Sign Out Admin
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === "overview" && (
          <div className="space-y-8 max-w-5xl">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">App Oversight &amp; Real Data</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Live metrics synced directly from your Supabase production database.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchRealDatabaseMetrics}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" /> Refresh Data
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`rounded-2xl border p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-3">
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

              <div className={`rounded-2xl border p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-medium">Today's Real Activity Logs</span>
                  <Activity className="h-4 w-4 text-sky-500" />
                </div>
                <div className="text-2xl font-extrabold">
                  {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : dailyLogsCount}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Meals + Water + Workouts Today
                </span>
              </div>

              <div className={`rounded-2xl border p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-medium">Free Tier / In Trial</span>
                  <Users className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-amber-500">
                  {metricsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-500" /> : freeUsersCount}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Free / 60-Day Trial Users
                </span>
              </div>

              <div className={`rounded-2xl border p-5 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-medium">Paid Premium Subscribers</span>
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

            <div className={`rounded-3xl border p-6 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" /> Database Summary
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 text-xs">
                  <span className="font-semibold">Published Official Recipes</span>
                  <span className="font-mono text-emerald-400 font-bold">{publishedRecipes.length} live</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 text-xs">
                  <span className="font-semibold">Community Submissions Awaiting Approval</span>
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

        {/* TAB 2: DETAILED SUBSCRIBERS & REVENUE CALCULATOR */}
        {activeTab === "subscribers" && (
          <div className="space-y-8 max-w-5xl">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-emerald-500" /> Premium Subscribers &amp; Revenue Details
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Accurate details of all paying members, their payment day, and total recurring income.
                </p>
              </div>
            </header>

            {/* REVENUE & MEMBERSHIP BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl border ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Free / Trial Members</span>
                <span className="text-2xl font-extrabold text-amber-400">{freeUsersCount}</span>
                <p className="text-[11px] text-slate-500 mt-1">Free features or active 60-day trial</p>
              </div>

              <div className={`p-5 rounded-2xl border ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Paid Premium Subscribers</span>
                <span className="text-2xl font-extrabold text-emerald-400">{premiumUsersCount}</span>
                <p className="text-[11px] text-slate-500 mt-1">Full AI &amp; Recipe access</p>
              </div>

              <div className={`p-5 rounded-2xl border ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Total Monthly Revenue</span>
                <span className="text-2xl font-extrabold text-emerald-400">R{totalMonthlyRevenue.toFixed(2)}</span>
                <p className="text-[11px] text-slate-500 mt-1">Calculated from R49.00 / user</p>
              </div>
            </div>

            {/* SUBSCRIBERS DETAILED LIST */}
            <div className={`rounded-3xl border p-6 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h2 className="text-base font-bold mb-4 flex items-center justify-between">
                <span>Paying Member Details ({subscribersList.length})</span>
              </h2>

              {subscribersList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                  No active paying members in the database yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="pb-3 font-semibold">Member</th>
                        <th className="pb-3 font-semibold">Tier &amp; Price</th>
                        <th className="pb-3 font-semibold">Payment Day of Month</th>
                        <th className="pb-3 font-semibold">Next Deduction</th>
                        <th className="pb-3 font-semibold">Payment Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {subscribersList.map((sub) => (
                        <tr key={sub.id} className="text-slate-200">
                          <td className="py-3.5 font-bold">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                                {sub.full_name[0] || "U"}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-100">{sub.full_name}</p>
                                <p className="text-[10px] text-slate-500">{sub.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                              R49.00 / month
                            </span>
                          </td>
                          <td className="py-3.5 font-bold text-emerald-400 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Day {sub.billing_day} of every month
                          </td>
                          <td className="py-3.5 font-mono text-slate-400">
                            {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : "Active"}
                          </td>
                          <td className="py-3.5 font-mono text-slate-400">
                            {sub.card_brand} (•••• {sub.card_last_four})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: OFFICIAL RECIPES */}
        {activeTab === "recipes" && (
          <div className="space-y-8 max-w-5xl">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <ChefHat className="h-6 w-6 text-emerald-500" /> Official NutriFit Recipes
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Nutritionist-approved recipes published directly to the main app catalog.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create Recipe
              </button>
            </header>

            {successMsg && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400">
                {successMsg}
              </div>
            )}

            <div className={`rounded-3xl border p-6 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h2 className="text-base font-bold mb-4 flex items-center justify-between">
                <span>Published Official Catalog ({publishedRecipes.length})</span>
                {fetchingRecipes && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </h2>

              {publishedRecipes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                  No official recipes published yet. Click the <strong>+ Create Recipe</strong> button to upload your first recipe!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publishedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className={`group relative rounded-2xl border p-4 flex flex-col justify-between shadow-xs transition hover:border-slate-700 ${
                        adminTheme === "dark" ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 mb-1 border border-emerald-500/20">
                              {recipe.category || "Official Recipe"}
                            </span>
                            <h3 className="text-sm font-bold text-slate-100">{recipe.title}</h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
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
                          <Flame className="h-3 w-3 text-amber-500" /> {recipe.calories || 0} kcal
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
          <div className="space-y-8 max-w-5xl">
            <header>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-emerald-500" /> Review Community Submissions
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Inspect pending recipes submitted by NutriFit members before publishing them to the main catalog.
              </p>
            </header>

            {pendingRecipes.length === 0 ? (
              <div className={`rounded-3xl border p-12 text-center text-xs text-slate-400 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3 opacity-80" />
                <h3 className="text-sm font-bold text-slate-200">All caught up!</h3>
                <p className="mt-1">There are no pending community recipe submissions to review right now.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className={`rounded-3xl border p-6 shadow-sm flex flex-col md:flex-row gap-6 ${
                      adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="w-full md:w-48 h-48 rounded-2xl bg-slate-800 overflow-hidden shrink-0 relative border border-slate-700/50">
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

                    <div className="flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-100">{recipe.title}</h3>
                          <span className="text-xs text-slate-400">
                            Submitted by <span className="font-semibold text-emerald-400">{recipe.author}</span>
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-slate-300">
                          <span className="flex items-center gap-1 rounded-lg bg-slate-800/60 px-2.5 py-1 border border-slate-700/40">
                            <Clock className="h-3.5 w-3.5 text-emerald-400" /> {recipe.prep_time}
                          </span>
                          <span className="flex items-center gap-1 rounded-lg bg-slate-800/60 px-2.5 py-1 border border-slate-700/40">
                            <Flame className="h-3.5 w-3.5 text-amber-400" /> {recipe.calories} kcal
                          </span>
                          <span className="rounded-lg bg-slate-800/60 px-2.5 py-1 font-mono text-emerald-400 border border-slate-700/40">
                            P: {recipe.protein}
                          </span>
                        </div>

                        <div className="mt-4 text-xs text-slate-400">
                          <strong className="text-slate-300 block mb-1">Ingredients:</strong>
                          <p className="line-clamp-2">{recipe.ingredients?.join(", ")}</p>
                        </div>
                      </div>

                      {activeRejectId === recipe.id && (
                        <div className="space-y-2 rounded-xl bg-slate-950 p-3 border border-rose-500/30">
                          <label className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Provide Feedback to User:
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

                      <div className="flex items-center justify-end gap-3 border-t border-slate-800/60 pt-3">
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
                              className="flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition border border-rose-500/20 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" /> Reject with Feedback
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveRecipe(recipe.id)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve &amp; Publish
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

        {/* TAB 5: CHAT GROUPS WITH LIVE ACCURATE ROSTER */}
        {activeTab === "groups" && (
          <div className="space-y-8 max-w-5xl">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Users className="h-6 w-6 text-emerald-500" /> Community Group Management
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Create, edit group details, inspect live members roster, and delete chat rooms.
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
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create Chat Group
              </button>
            </header>

            <div className={`rounded-3xl border p-6 shadow-sm ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <h2 className="text-base font-bold mb-4 flex items-center justify-between">
                <span>Active Chat Groups ({chatGroups.length})</span>
                {fetchingGroups && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </h2>

              {chatGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                  No active chat groups found. Click <strong>+ Create Chat Group</strong> to set up your first community chat room.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chatGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between shadow-xs ${
                        adminTheme === "dark" ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                              {group.category}
                            </span>
                            <h3 className="text-base font-bold text-slate-100 mt-1">{group.name}</h3>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditGroupModal(group)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                              title="Edit Group Details"
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

                        <p className="text-xs text-slate-400 leading-relaxed">
                          {group.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Users className="h-3.5 w-3.5" /> {group.member_count || 0} / {group.max_members || 100} members
                        </span>

                        <button
                          type="button"
                          onClick={() => openMembersModal(group)}
                          className="flex items-center gap-1 text-xs font-bold text-sky-400 hover:underline cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Members ({group.member_count || 0})
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
          <div className="space-y-8 max-w-3xl">
            <header>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Settings className="h-6 w-6 text-emerald-500" /> Admin Settings &amp; Profile
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage your system administrator identity and custom dashboard theme preference.
              </p>
            </header>

            <div className={`rounded-3xl border p-6 shadow-sm space-y-6 ${adminTheme === "dark" ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
              <div className="flex items-center gap-4 border-b border-slate-800/60 pb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-xl shrink-0">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
                    NutriFit System Administrator <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">admin@nutrifit.co.za</p>
                  <span className="mt-2 inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                    Full Executive Access
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  Dashboard Appearance Preference
                </h3>
                <p className="text-xs text-slate-400">
                  Switch the visual theme for your Admin Portal view without altering user app themes.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdminTheme("dark")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer border ${
                      adminTheme === "dark"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    <Moon className="h-4 w-4" /> Dark Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminTheme("light")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer border ${
                      adminTheme === "light"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    <Sun className="h-4 w-4" /> Light Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE / EDIT CHAT GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-3xl border p-6 shadow-xl ${adminTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />{" "}
                {editingGroup ? "Edit Chat Group" : "Create Community Chat Group"}
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

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pretoria Running Squad"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={groupForm.category}
                    onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                  >
                    <option value="Beginner & Mindful">Beginner &amp; Mindful</option>
                    <option value="High-Energy Group">High-Energy Group</option>
                    <option value="Strength & Gym">Strength &amp; Gym</option>
                    <option value="Running & Outdoor">Running &amp; Outdoor</option>
                    <option value="Nutrition & Lifestyle">Nutrition &amp; Lifestyle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Maximum Members *</label>
                  <input
                    type="number"
                    required
                    placeholder="100"
                    value={groupForm.max_members}
                    onChange={(e) => setGroupForm({ ...groupForm, max_members: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Group Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the focus and goals of this chat group..."
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs focus:border-emerald-500 focus:outline-none text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsGroupModalOpen(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  {editingGroup ? "Save Changes" : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW & REMOVE GROUP MEMBERS MODAL */}
      {managingMembersGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-xl max-h-[85vh] overflow-y-auto ${adminTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" /> Group Members Roster
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{managingMembersGroup.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setManagingMembersGroup(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingMembers ? (
              <div className="flex h-32 items-center justify-center text-xs text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mr-2" /> Loading roster...
              </div>
            ) : groupMembersList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-300">No members in this group yet</p>
                <p>When users join this chat room from the app, they will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Members ({groupMembersList.length})
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {groupMembersList.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                          {m.full_name?.[0] || "U"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{m.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {m.email}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold transition border border-rose-500/20 cursor-pointer"
                        title="Remove member from group"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Remove
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-2xl rounded-3xl border p-6 shadow-xl max-h-[90vh] overflow-y-auto ${adminTheme === "dark" ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-500" /> Create &amp; Publish Official Recipe
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
              <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateRecipe} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Recipe Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High-Protein Grilled Chicken Bowl"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none"
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
                <label className="block text-xs font-semibold text-slate-400 mb-1">Short Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A balanced meal crafted by our dietitians for lean muscle gains."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Prep Time</label>
                  <input
                    type="text"
                    value={form.prep_time}
                    onChange={(e) => setForm({ ...form, prep_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Calories</label>
                  <input
                    type="number"
                    value={form.calories}
                    onChange={(e) => setForm({ ...form, calories: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Protein</label>
                  <input
                    type="text"
                    value={form.protein}
                    onChange={(e) => setForm({ ...form, protein: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Carbs</label>
                  <input
                    type="text"
                    value={form.carbs}
                    onChange={(e) => setForm({ ...form, carbs: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fats</label>
                  <input
                    type="text"
                    value={form.fat}
                    onChange={(e) => setForm({ ...form, fat: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Ingredients (One per line) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={`200g Chicken Breast\n1 cup Brown Rice\n1 tbsp Olive Oil`}
                    value={form.ingredients}
                    onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Instructions (One step per line) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={`1. Season chicken.\n2. Boil rice.\n3. Assemble & serve.`}
                    value={form.instructions}
                    onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Utensils className="h-4 w-4" />}
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