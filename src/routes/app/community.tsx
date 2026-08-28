import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Users,
  MessageSquare,
  Send,
  LogOut,
  UserPlus,
  ArrowLeft,
  Bell,
  Search,
  Loader2,
  MoreVertical,
  CheckCircle2,
  X,
  Info,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/app/community")({
  head: () => ({
    meta: [
      { title: "NutriFit Communities" },
      { name: "description", content: "Native WhatsApp-style group chats with real-time messages." },
    ],
  }),
  component: CommunityPage,
});

interface ChatGroup {
  id: string;
  name: string;
  category: string;
  description: string;
  created_at: string;
}

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

interface GroupMember {
  user_id: string;
  full_name: string;
}

export function CommunityPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"my-groups" | "discover">("my-groups");
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [myGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [memberCounts, setMemberCounts] = useState<{ [groupId: string]: number }>({});

  const [joinPromptGroup, setJoinPromptGroup] = useState<ChatGroup | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("Weight Loss");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeGroupRef = useRef<ChatGroup | null>(null);

  useEffect(() => {
    activeGroupRef.current = activeGroup;
  }, [activeGroup]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Browser notifications are not supported on this device.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      new Notification("🔔 NutriFit Community Alerts Active", {
        body: "You will receive real-time notifications for new group messages!",
      });
    }
  };

  const fetchGroupsAndMemberships = async () => {
    setLoadingGroups(true);
    try {
      const [{ data: gData }, { data: mData }, { data: allMembers }] = await Promise.all([
        supabase.from("chat_groups").select("*").order("created_at", { ascending: false }),
        supabase.from("chat_group_members").select("group_id").eq("user_id", user?.id),
        supabase.from("chat_group_members").select("group_id"),
      ]);

      const counts: { [groupId: string]: number } = {};
      (allMembers || []).forEach((m: any) => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });

      setMemberCounts(counts);
      setGroups((gData as ChatGroup[]) || []);
      setJoinedGroupIds((mData || []).map((m: any) => m.group_id));
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchGroupsAndMemberships();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const globalChannel = supabase
      .channel("global_chat_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.user_id === user.id) return;

          const isCurrentActive = activeGroupRef.current?.id === newMsg.group_id;

          if (!isCurrentActive) {
            setUnreadCount((prev) => prev + 1);

            if ("Notification" in window && Notification.permission === "granted") {
              const groupTarget = groups.find((g) => g.id === newMsg.group_id);
              new Notification(`💬 ${groupTarget?.name || "Community Group"}`, {
                body: `${newMsg.sender_name}: ${newMsg.message}`,
                icon: "/favicon.ico",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [user, groups]);

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data } = await supabase
        .from("chat_group_members")
        .select("user_id, profiles(full_name)")
        .eq("group_id", groupId);

      if (data) {
        const formatted = data.map((item: any) => ({
          user_id: item.user_id,
          full_name: item.profiles?.full_name || "NutriFit Member",
        }));
        setGroupMembers(formatted);
        setMemberCounts((prev) => ({ ...prev, [groupId]: formatted.length }));
      }
    } catch (err) {
      console.error("Error fetching group members:", err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim() || creatingGroup) return;

    setCreatingGroup(true);
    try {
      const payload: any = {
        name: newGroupName.trim(),
        category: newGroupCategory,
        description: newGroupDescription.trim() || `${newGroupCategory} discussion and tips.`,
      };

      const { data: newGroup, error: groupErr } = await supabase
        .from("chat_groups")
        .insert(payload)
        .select()
        .single();

      if (groupErr) throw groupErr;

      await supabase.from("chat_group_members").insert({
        group_id: newGroup.id,
        user_id: user.id,
      } as any);

      setGroups((prev) => [newGroup as ChatGroup, ...prev]);
      setJoinedGroupIds((prev) => [...prev, newGroup.id]);
      setMemberCounts((prev) => ({ ...prev, [newGroup.id]: 1 }));
      setActiveGroup(newGroup as ChatGroup);
      await fetchGroupMembers(newGroup.id);

      setIsCreateModalOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
    } catch (err: any) {
      alert("Failed to create group: " + (err.message || "Error occurred"));
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!user || !joinPromptGroup) return;
    try {
      const { error } = await supabase.from("chat_group_members").insert({
        group_id: joinPromptGroup.id,
        user_id: user.id,
      } as any);

      if (!error) {
        const updatedCount = (memberCounts[joinPromptGroup.id] || 0) + 1;
        setJoinedGroupIds((prev) => [...prev, joinPromptGroup.id]);
        setMemberCounts((prev) => ({ ...prev, [joinPromptGroup.id]: updatedCount }));
        setActiveGroup(joinPromptGroup);
        await fetchGroupMembers(joinPromptGroup.id);
        setJoinPromptGroup(null);
      }
    } catch (err: any) {
      console.error("Failed to join group:", err.message);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("chat_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

      if (!error) {
        setJoinedGroupIds((prev) => prev.filter((id) => id !== groupId));
        setMemberCounts((prev) => ({
          ...prev,
          [groupId]: Math.max(0, (prev[groupId] || 1) - 1),
        }));
        if (activeGroup?.id === groupId) {
          setActiveGroup(null);
          setShowGroupDetails(false);
        }
      }
    } catch (err: any) {
      console.error("Failed to leave group:", err.message);
    }
  };

  const handleOpenGroupChat = (group: ChatGroup) => {
    setActiveGroup(group);
    setShowGroupDetails(false);
    setShowThreeDotsMenu(false);
    fetchGroupMembers(group.id);
  };

  useEffect(() => {
    if (!activeGroup || !user) return;

    supabase
      .from("chat_messages")
      .select("*")
      .eq("group_id", activeGroup.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) || []);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });

    const channel = supabase
      .channel(`room:${activeGroup.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `group_id=eq.${activeGroup.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroup, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroup || !user || sendingMsg) return;

    setSendingMsg(true);
    const senderName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "NutriFit Member";

    try {
      const { error } = await supabase.from("chat_messages").insert({
        group_id: activeGroup.id,
        user_id: user.id,
        sender_name: senderName,
        message: newMessage.trim(),
      } as any);

      if (!error) {
        setNewMessage("");
      }
    } catch (err: any) {
      console.error("Failed to send message:", err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const myJoinedGroupsList = groups.filter((g) => myGroupIds.includes(g.id));
  const discoverGroupsList = groups.filter((g) => !myGroupIds.includes(g.id));

  const filterBySearch = (list: ChatGroup[]) =>
    list.filter(
      (g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="w-full font-sans">
      {activeGroup ? (
        /* FULL-SCREEN CHAT VIEW (EXPANDS 100% ON BOTH MOBILE & DESKTOP) */
        <div className="fixed inset-0 z-50 flex flex-col w-full h-[100dvh] justify-between bg-background">
          {/* HEADER TOUCHING TOP WITH SAFE AREA INSET */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-border/70 bg-card/95 backdrop-blur-md shadow-xs z-20 shrink-0 pt-[max(0.65rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveGroup(null);
                  setShowGroupDetails(false);
                  setUnreadCount(0);
                }}
                className="cursor-pointer p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground active:scale-95 transition shrink-0"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" />
              </button>

              <div
                onClick={() => setShowGroupDetails(true)}
                className="flex items-center gap-3 cursor-pointer group min-w-0"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 font-bold shrink-0">
                  <Users className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-emerald-500 transition truncate leading-snug">
                    {activeGroup.name}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold truncate leading-tight">
                    {memberCounts[activeGroup.id] !== undefined
                      ? `${memberCounts[activeGroup.id]} ${memberCounts[activeGroup.id] === 1 ? "member" : "members"}`
                      : activeGroup.category}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
                className="cursor-pointer p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
              >
                <MoreVertical className="h-5 w-5 shrink-0" />
              </button>

              {showThreeDotsMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupDetails(true);
                      setShowThreeDotsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-foreground hover:bg-muted rounded-xl transition cursor-pointer"
                  >
                    <Info className="h-4 w-4 text-emerald-500 shrink-0" /> Group Info
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleLeaveGroup(activeGroup.id);
                      setShowThreeDotsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 shrink-0" /> Leave Group
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CHAT MESSAGES SCROLL VIEW */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-muted/10 min-h-0 max-w-5xl w-full mx-auto">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs sm:text-sm text-muted-foreground space-y-2 py-12">
                <MessageSquare className="h-8 w-8 opacity-40 text-emerald-500 shrink-0" />
                <p className="font-bold text-foreground">No messages in this chat yet</p>
                <p>Say hello to kick off the conversation!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.user_id === user?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] font-bold text-muted-foreground mb-1 px-1">
                      {isMe ? "You" : m.sender_name}
                    </span>
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isMe
                          ? "bg-emerald-500 text-white font-medium rounded-tr-none"
                          : "bg-card border border-border text-foreground rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.message}</p>
                      <span
                        className={`block text-[9px] mt-1 text-right font-mono ${
                          isMe ? "text-white/80" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT BAR WITH SPACED PADDING */}
          <div className="bg-card border-t border-border/70 p-3 sm:p-4 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1.25rem))] z-30 shrink-0">
            <form
              onSubmit={handleSendMessage}
              className="max-w-5xl w-full mx-auto flex items-center gap-2"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${activeGroup.name}...`}
                className="flex-1 rounded-2xl border border-input bg-background px-4 py-3 sm:py-3.5 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sendingMsg}
                className="cursor-pointer flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-xs transition hover:bg-emerald-600 disabled:opacity-50 active:scale-95"
              >
                {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Send className="h-4 w-4 shrink-0" />}
              </button>
            </form>
          </div>

          {/* GROUP INFO MODAL */}
          {showGroupDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-base font-extrabold text-foreground">Group Info</h3>
                  <button
                    type="button"
                    onClick={() => setShowGroupDetails(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0 cursor-pointer"
                  >
                    <X className="h-5 w-5 shrink-0" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-xl shrink-0">
                    <Users className="h-8 w-8 shrink-0" />
                  </div>
                  <h2 className="text-lg font-extrabold text-foreground">{activeGroup.name}</h2>
                  <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {activeGroup.category}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {activeGroup.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Group Members ({groupMembers.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {groupMembers.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-2xl bg-muted/30">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-xs shrink-0">
                          {m.full_name?.[0] || "U"}
                        </div>
                        <span className="text-xs font-bold text-foreground truncate">
                          {m.full_name} {m.user_id === user?.id && "(You)"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLeaveGroup(activeGroup.id)}
                  className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 py-3 text-xs font-extrabold text-rose-500 hover:bg-rose-500/20 transition pt-3"
                >
                  <LogOut className="h-4 w-4 shrink-0" /> Leave Group
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN COMMUNITIES DIRECTORY VIEW */
        <div className="flex-1 flex flex-col space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">
                Communities
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 shrink-0" /> Free Feature
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-600 transition active:scale-95 shrink-0"
              >
                <Plus className="h-4 w-4 shrink-0" /> Create Group
              </button>

              {!notificationsEnabled && (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-2xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition shrink-0"
                >
                  <Bell className="h-4 w-4 shrink-0 text-emerald-500" /> Enable Alerts
                </button>
              )}

              <div className="relative cursor-pointer shrink-0" onClick={() => setUnreadCount(0)}>
                <div className="p-2 rounded-2xl bg-card border border-border shadow-xs text-muted-foreground hover:text-foreground transition">
                  <Bell className="h-5 w-5 shrink-0" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-card animate-pulse shrink-0" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("my-groups")}
              className={`cursor-pointer px-4 py-2 rounded-2xl text-xs font-extrabold transition ${
                activeTab === "my-groups"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              My Groups ({myJoinedGroupsList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("discover")}
              className={`cursor-pointer px-4 py-2 rounded-2xl text-xs font-extrabold transition ${
                activeTab === "discover"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Discover ({discoverGroupsList.length})
            </button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search group chats..."
              className="w-full rounded-2xl border border-input bg-card pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {loadingGroups ? (
            <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500 mr-2 shrink-0" /> Loading communities...
            </div>
          ) : activeTab === "my-groups" ? (
            filterBySearch(myJoinedGroupsList).length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-8 text-center text-xs text-muted-foreground space-y-2">
                <Users className="h-8 w-8 mx-auto text-emerald-500 opacity-50 shrink-0" />
                <p className="font-bold text-foreground">You haven't joined any group chats yet</p>
                <p>Create a group or switch to <strong>Discover</strong> to find fitness communities!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterBySearch(myJoinedGroupsList).map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {group.category}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground font-mono">
                          {memberCounts[group.id] || 1} {memberCounts[group.id] === 1 ? "member" : "members"}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-foreground">
                        {group.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/60 mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenGroupChat(group)}
                        className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-2.5 px-3 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-600 active:scale-95 transition"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" /> Open Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filterBySearch(discoverGroupsList).length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-8 text-center text-xs text-muted-foreground space-y-2">
                <Users className="h-8 w-8 mx-auto text-emerald-500 opacity-50 shrink-0" />
                <p className="font-bold text-foreground">All caught up!</p>
                <p>You have joined all available communities.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterBySearch(discoverGroupsList).map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {group.category}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground font-mono">
                          {memberCounts[group.id] || 1} {memberCounts[group.id] === 1 ? "member" : "members"}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-foreground">
                        {group.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/60 mt-4">
                      <button
                        type="button"
                        onClick={() => setJoinPromptGroup(group)}
                        className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-2.5 px-4 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-600 active:scale-95 transition"
                      >
                        <UserPlus className="h-4 w-4 shrink-0" /> Join Group
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-lg font-extrabold text-foreground">Create Community Group</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-muted shrink-0"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pretoria 5AM Runners"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Category *</label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Weight Loss">Weight Loss &amp; Shred</option>
                  <option value="Muscle Building">Muscle Building &amp; Hypertrophy</option>
                  <option value="Running & Cardio">Running &amp; Cardio</option>
                  <option value="Healthy Recipes">Healthy Recipes &amp; Nutrition</option>
                  <option value="Local Fitness">Local Fitness &amp; Meetups</option>
                  <option value="General Motivation">Daily Motivation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="What is this group about?"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={creatingGroup || !newGroupName.trim()}
                className="w-full cursor-pointer rounded-2xl bg-emerald-500 py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-600 disabled:opacity-50 mt-2 active:scale-95"
              >
                {creatingGroup ? "Creating Group..." : "Create & Enter Group"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JOIN CONFIRMATION MODAL */}
      {joinPromptGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold shrink-0">
              <Users className="h-6 w-6 shrink-0" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-foreground">
                Join {joinPromptGroup.name}?
              </h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {joinPromptGroup.description}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setJoinPromptGroup(null)}
                className="flex-1 cursor-pointer rounded-2xl border border-border bg-card py-2.5 text-xs font-extrabold text-muted-foreground hover:bg-muted transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmJoin}
                className="flex-1 cursor-pointer rounded-2xl bg-emerald-500 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-600 active:scale-95 transition"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunityPage;