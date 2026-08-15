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
  Shield,
  Info,
  Sparkles,
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
  
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<"my-groups" | "discover">("my-groups");
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);

  // Group Datasets
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [myGroupIds, setJoinedGroupIds] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Join Modal State
  const [joinPromptGroup, setJoinPromptGroup] = useState<ChatGroup | null>(null);

  // Chat & Realtime States
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch All Groups & Joined Group IDs
  useEffect(() => {
    if (!user) return;
    fetchGroupsAndMemberships();
  }, [user]);

  const fetchGroupsAndMemberships = async () => {
    setLoadingGroups(true);
    try {
      const [{ data: gData }, { data: mData }] = await Promise.all([
        supabase.from("chat_groups").select("*").order("created_at", { ascending: true }),
        supabase.from("chat_group_members").select("group_id").eq("user_id", user?.id),
      ]);

      setGroups((gData as ChatGroup[]) || []);
      setJoinedGroupIds((mData || []).map((m: any) => m.group_id));
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // 2. Fetch Members for Active Group
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
      }
    } catch (err) {
      console.error("Error fetching group members:", err);
    }
  };

  // 3. Confirm & Join Group
  const handleConfirmJoin = async () => {
    if (!user || !joinPromptGroup) return;
    try {
      const { error } = await supabase.from("chat_group_members").insert({
        group_id: joinPromptGroup.id,
        user_id: user.id,
      });

      if (!error) {
        setJoinedGroupIds((prev) => [...prev, joinPromptGroup.id]);
        setActiveGroup(joinPromptGroup);
        fetchGroupMembers(joinPromptGroup.id);
        setJoinPromptGroup(null);
      }
    } catch (err: any) {
      console.error("Failed to join group:", err.message);
    }
  };

  // 4. Leave Group
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
        if (activeGroup?.id === groupId) {
          setActiveGroup(null);
          setShowGroupDetails(false);
        }
      }
    } catch (err: any) {
      console.error("Failed to leave group:", err.message);
    }
  };

  // 5. Open Active Group Chat Room
  const handleOpenGroupChat = (group: ChatGroup) => {
    setActiveGroup(group);
    setShowGroupDetails(false);
    setShowThreeDotsMenu(false);
    fetchGroupMembers(group.id);
  };

  // 6. Realtime Messages Listener
  useEffect(() => {
    if (!activeGroup || !user) return;

    // Fetch message history
    supabase
      .from("chat_messages")
      .select("*")
      .eq("group_id", activeGroup.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) || []);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      });

    // Realtime channel listener
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

          if (newMsg.user_id !== user.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroup, user]);

  // 7. Send Message
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
      });

      if (!error) {
        setNewMessage("");
      }
    } catch (err: any) {
      console.error("Failed to send message:", err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  // Filter Datasets
  const myJoinedGroupsList = groups.filter((g) => myGroupIds.includes(g.id));
  const discoverGroupsList = groups.filter((g) => !myGroupIds.includes(g.id));

  const filterBySearch = (list: ChatGroup[]) =>
    list.filter(
      (g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[82vh] justify-between relative overflow-hidden font-sans">
      
      {/* 1. FULL-SCREEN WHATSAPP CHAT ROOM VIEW */}
      {activeGroup ? (
        <div className="flex-1 flex flex-col w-full h-full justify-between relative bg-background">
          
          {/* WHATSAPP GROUP HEADER */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card shadow-xs z-20">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveGroup(null);
                  setShowGroupDetails(false);
                  setUnreadCount(0);
                }}
                className="cursor-pointer p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              {/* CLICK NAME FOR GROUP INFO */}
              <div
                onClick={() => setShowGroupDetails(true)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-foreground group-hover:text-primary transition line-clamp-1">
                    {activeGroup.name}
                  </h2>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {groupMembers.length > 0 ? `${groupMembers.length} members` : activeGroup.category}
                  </p>
                </div>
              </div>
            </div>

            {/* THREE DOTS MENU BUTTON */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThreeDotsMenu(!showThreeDotsMenu)}
                className="cursor-pointer p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {/* THREE DOTS DROPDOWN */}
              {showThreeDotsMenu && (
                <div className="absolute right-0 top-10 z-50 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-xl animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupDetails(true);
                      setShowThreeDotsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-foreground hover:bg-muted rounded-xl transition cursor-pointer"
                  >
                    <Info className="h-4 w-4 text-primary" /> Group Info
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleLeaveGroup(activeGroup.id);
                      setShowThreeDotsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" /> Leave Group
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CHAT MESSAGES FEED */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-muted-foreground space-y-2">
                <MessageSquare className="h-8 w-8 opacity-40 text-primary" />
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
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                        isMe
                          ? "bg-primary text-primary-foreground font-semibold rounded-tr-none"
                          : "bg-card border border-border text-foreground rounded-tl-none"
                      }`}
                    >
                      <p>{m.message}</p>
                      <span
                        className={`block text-[9px] mt-1 text-right font-mono ${
                          isMe ? "text-primary-foreground/70" : "text-muted-foreground"
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

          {/* INPUT BAR */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-card border-t border-border flex items-center gap-2"
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${activeGroup.name}...`}
              className="flex-1 rounded-2xl border border-input bg-background px-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMsg}
              className="cursor-pointer flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:opacity-50"
            >
              {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>

          {/* GROUP INFO / DETAILS SCREEN */}
          {showGroupDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-display text-base font-extrabold text-foreground">Group Info</h3>
                  <button
                    type="button"
                    onClick={() => setShowGroupDetails(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-xl">
                    <Users className="h-8 w-8" />
                  </div>
                  <h2 className="text-lg font-extrabold text-foreground">{activeGroup.name}</h2>
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">
                    {activeGroup.category}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {activeGroup.description}
                  </p>
                </div>

                {/* MEMBERS ROSTER */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    Group Members ({groupMembers.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {groupMembers.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-2xl bg-muted/30">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {m.full_name?.[0] || "U"}
                        </div>
                        <span className="text-xs font-bold text-foreground truncate">
                          {m.full_name} {m.user_id === user?.id && "(You)"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LEAVE GROUP BUTTON */}
                <button
                  type="button"
                  onClick={() => handleLeaveGroup(activeGroup.id)}
                  className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-destructive/10 border border-destructive/20 py-3 text-xs font-extrabold text-destructive hover:bg-destructive/20 transition pt-3"
                >
                  <LogOut className="h-4 w-4" /> Leave Group
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. COMMUNITY MAIN SCREEN: TABS & GROUP DISCOVERY */
        <div className="flex-1 flex flex-col space-y-5">
          
          {/* TOP HEADER WITH LIFETIME FREE BADGE & BELL NOTIFICATION */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">
                Communities
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Free Feature
              </span>
            </div>

            {/* BELL WITH UNREAD BADGE */}
            <div className="relative cursor-pointer" onClick={() => setUnreadCount(0)}>
              <div className="p-2 rounded-2xl bg-card border border-border shadow-xs text-muted-foreground hover:text-foreground transition">
                <Bell className="h-5 w-5" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-card animate-pulse" />
              )}
            </div>
          </div>

          {/* TWO MAIN TABS: MY GROUPS vs DISCOVER */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("my-groups")}
              className={`cursor-pointer px-4 py-2 rounded-2xl text-xs font-extrabold transition ${
                activeTab === "my-groups"
                  ? "bg-primary text-primary-foreground shadow-xs"
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
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Discover ({discoverGroupsList.length})
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search group chats..."
              className="w-full rounded-2xl border border-input bg-card pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>

          {/* GROUPS LIST */}
          {loadingGroups ? (
            <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" /> Loading communities...
            </div>
          ) : activeTab === "my-groups" ? (
            /* MY GROUPS TAB */
            filterBySearch(myJoinedGroupsList).length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-8 text-center text-xs text-muted-foreground space-y-2">
                <Users className="h-8 w-8 mx-auto text-primary opacity-50" />
                <p className="font-bold text-foreground">You haven't joined any group chats yet</p>
                <p>Switch to the <strong>Discover</strong> tab to find fitness communities!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filterBySearch(myJoinedGroupsList).map((group) => (
                  <div
                    key={group.id}
                    className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition"
                  >
                    <div className="space-y-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        {group.category}
                      </span>
                      <h3 className="font-display text-base font-extrabold text-foreground">
                        {group.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenGroupChat(group)}
                        className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-2.5 px-3 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-600 transition"
                      >
                        <MessageSquare className="h-4 w-4" /> Open Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* DISCOVER TAB */
            filterBySearch(discoverGroupsList).length === 0 ? (
              <div className="rounded-3xl border border-border bg-card p-8 text-center text-xs text-muted-foreground space-y-2">
                <Users className="h-8 w-8 mx-auto text-primary opacity-50" />
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
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        {group.category}
                      </span>
                      <h3 className="font-display text-base font-extrabold text-foreground">
                        {group.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                      <button
                        type="button"
                        onClick={() => setJoinPromptGroup(group)}
                        className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 px-4 text-xs font-extrabold text-primary-foreground shadow-xs hover:bg-primary/90 transition"
                      >
                        <UserPlus className="h-4 w-4" /> Join Group
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* JOIN CONFIRMATION MODAL */}
      {joinPromptGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 text-center">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
              <Users className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-display text-lg font-extrabold text-foreground">
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
                className="flex-1 cursor-pointer rounded-2xl bg-emerald-500 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-600 transition"
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