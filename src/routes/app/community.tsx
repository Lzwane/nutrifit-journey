import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  MapPin,
  Calendar,
  Search,
  MessageCircle,
  ExternalLink,
  Sparkles,
  HeartHandshake,
  Flame,
  Dumbbell,
  Compass,
  Utensils,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/community")({
  head: () => ({
    meta: [
      { title: "Fitness Communities — NutriFit" },
      { name: "description", content: "Discover local and virtual fitness groups, find workout partners, and join WhatsApp community chats." },
    ],
  }),
  component: CommunityPage,
});

export interface Community {
  id: string;
  name: string;
  category: "Beginner & Mindful" | "High-Energy Group" | "Strength & Gym" | "Running & Outdoor" | "Nutrition & Lifestyle";
  description: string;
  meeting_location: string;
  meeting_schedule: string;
  whatsapp_group_link: string;
  member_count: number;
  image_url?: string;
}

// Fallback seed communities to guarantee rich content before database sync
const FALLBACK_COMMUNITIES: Community[] = [
  {
    id: "1",
    name: "Couch to 5K Beginners Club",
    category: "Beginner & Mindful",
    description: "Gentle walking-to-jogging progressions in a zero-pressure, encouraging environment.",
    meeting_location: "Local Park / Campus Track",
    meeting_schedule: "Saturdays @ 07:30 AM",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-couch-to-5k",
    member_count: 142,
  },
  {
    id: "2",
    name: "Sunrise Gentle Yoga & Breathwork",
    category: "Beginner & Mindful",
    description: "Morning mobility, stretching, and mindful breathwork to start your day with focus.",
    meeting_location: "Community Lawn / Online Zoom",
    meeting_schedule: "Tues & Thurs @ 06:15 AM",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-yoga",
    member_count: 88,
  },
  {
    id: "3",
    name: "Weekend Warriors HIIT & Circuit",
    category: "High-Energy Group",
    description: "Bodyweight circuits, team workout challenges, and calorie-burning group fun.",
    meeting_location: "Outdoor Sports Grounds",
    meeting_schedule: "Saturdays @ 08:30 AM",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-hiit",
    member_count: 215,
  },
  {
    id: "4",
    name: "AfroBeats & Zumba Sweat Crew",
    category: "High-Energy Group",
    description: "High-energy dance workout routines set to popular African and global rhythms.",
    meeting_location: "Student Activity Hall",
    meeting_schedule: "Mon & Wed @ 17:45 PM",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-afrobeats",
    member_count: 176,
  },
  {
    id: "5",
    name: "Campus & Local Gym Spotters Club",
    category: "Strength & Gym",
    description: "Find workout lifting partners, request form checks, and share weight routines.",
    meeting_location: "University Main Gym",
    meeting_schedule: "Mon - Fri Flexible Hours",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-gym-spotters",
    member_count: 310,
  },
  {
    id: "6",
    name: "Women Who Lift (Strength & Power)",
    category: "Strength & Gym",
    description: "Empowering female weightlifting squad focused on progressive overload and compound lifts.",
    meeting_location: "Main Weight Room",
    meeting_schedule: "Tues & Thurs @ 17:00 PM",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-women-lift",
    member_count: 129,
  },
  {
    id: "7",
    name: "Early Bird Social Run Club (5k/10k)",
    category: "Running & Outdoor",
    description: "Paced weekend runs finishing with a post-workout coffee or smoothie meetup.",
    meeting_location: "Central Campus Gate / Cafe",
    meeting_schedule: "Saturday Mornings @ 06:30 AM",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-run-club",
    member_count: 264,
  },
  {
    id: "8",
    name: "Weekend Trail Striders & Hikers",
    category: "Running & Outdoor",
    description: "Scenic nature walks, mountain trail climbs, and weekend outdoor adventure trips.",
    meeting_location: "Nearby Nature Reserve",
    meeting_schedule: "Bi-weekly Sundays @ 07:00 AM",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-hiking",
    member_count: 195,
  },
  {
    id: "9",
    name: "Meal Prep & Budget Recipe Exchange",
    category: "Nutrition & Lifestyle",
    description: "Sharing affordable weekly meal prep ideas, grocery deals, and high-protein SA recipes.",
    meeting_location: "Virtual / WhatsApp Group",
    meeting_schedule: "Daily Recipe Shares & Weekly Prep",
    whatsapp_group_link: "https://chat.whatsapp.com/sample-meal-prep",
    member_count: 412,
  },
];

const CATEGORIES = [
  { label: "All Communities", value: "All", icon: Users },
  { label: "Beginner & Mindful", value: "Beginner & Mindful", icon: HeartHandshake },
  { label: "High-Energy Group", value: "High-Energy Group", icon: Flame },
  { label: "Strength & Gym", value: "Strength & Gym", icon: Dumbbell },
  { label: "Running & Outdoor", value: "Running & Outdoor", icon: Compass },
  { label: "Nutrition & Lifestyle", value: "Nutrition & Lifestyle", icon: Utensils },
];

function CommunityPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [joinedGroups, setJoinedGroups] = useState<{ [key: string]: boolean }>({});

  // Fetch communities from Supabase or fallback
  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("communities").select("*").order("member_count", { ascending: false });

      if (error || !data || data.length === 0) {
        setCommunities(FALLBACK_COMMUNITIES);
      } else {
        setCommunities(data as Community[]);
      }
    } catch (err) {
      console.warn("Using fallback communities catalog:", err);
      setCommunities(FALLBACK_COMMUNITIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleJoinWhatsApp = (community: Community) => {
    // Record joined state locally
    setJoinedGroups((prev) => ({ ...prev, [community.id]: true }));

    // Redirect user directly to WhatsApp group invite link
    if (community.whatsapp_group_link) {
      window.open(community.whatsapp_group_link, "_blank", "noopener,noreferrer");
    }
  };

  // Filter logic based on search input and active category pill
  const filteredCommunities = communities.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.meeting_location.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>NutriFit Social Circles</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Connect &amp; Move Together
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Find your tribe, discover local workout groups, and coordinate schedules. Tap any community to join its official <span className="font-semibold text-emerald-600 dark:text-emerald-400">WhatsApp Group</span>.
            </p>
          </div>

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
            <MessageCircle className="h-8 w-8" />
          </div>
        </div>
      </section>

      {/* Search & Category Filtering Bar */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities by name, location, or focus (e.g. 'Yoga', 'Campus', '5k')..."
            className="w-full rounded-2xl border border-input bg-card pl-11 pr-4 py-3 text-xs sm:text-sm text-foreground outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Horizontal Category Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedCategory(cat.value)}
                className={`cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Community Cards Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-3xl border border-border bg-card p-6 animate-pulse" />
          ))}
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-3">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-sm font-bold text-foreground">No communities found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No active groups matched "{searchQuery}". Try searching with a different term or category.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.map((group) => {
            const hasJoined = joinedGroups[group.id];

            return (
              <div
                key={group.id}
                className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-border/80"
              >
                <div className="space-y-3">
                  {/* Category Pill & Member Counter */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {group.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                      <Users className="h-3 w-3" /> {group.member_count} members
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground leading-snug">
                      {group.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {group.description}
                    </p>
                  </div>

                  {/* Location & Time details */}
                  <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate font-medium">{group.meeting_location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate font-medium">{group.meeting_schedule}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Join Button */}
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => handleJoinWhatsApp(group)}
                    className={`w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs font-bold transition shadow-sm ${
                      hasJoined
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.99]"
                    }`}
                  >
                    {hasJoined ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Joined Group · Open Chat <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 fill-current" /> Join WhatsApp Group <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}