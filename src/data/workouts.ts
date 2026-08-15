export type Workout = {
  id: string;
  title: string;
  channel_name: string;
  description: string | null;
  category: string;
  difficulty: string;
  equipment: string;
  duration_minutes: number;
  estimated_calories: number;
  video_url: string;
};

export const FEATURED_YOUTUBE_WORKOUTS: Workout[] = [
  {
    id: "25-min-full-body-hiit",
    title: "25 MIN FULL BODY HIIT for Beginners - No Equipment",
    channel_name: "growingannanas",
    description: "Full body HIIT home workout with no equipment required. Designed to burn calories and build cardiovascular endurance.",
    category: "hiit",
    difficulty: "beginner",
    equipment: "No Equipment",
    duration_minutes: 28,
    estimated_calories: 220,
    video_url: "https://www.youtube.com/watch?v=cbKkB3POqaY",
  },
  {
    id: "30-min-fat-burn-abs-intermediate",
    title: "30 MIN FAT BURN & ABS WORKOUT - Intermediate Sweat Session",
    channel_name: "growingannanas",
    description: "Intermediate full body cardio and core routine. Higher intensity intervals to burn belly fat and strengthen the core.",
    category: "hiit",
    difficulty: "intermediate",
    equipment: "No Equipment",
    duration_minutes: 32,
    estimated_calories: 310,
    video_url: "https://www.youtube.com/watch?v=2MoGxae-zyo",
  },
// 1. Growingannanas - 45 MIN EXTREME FULL BODY HIIT
{
  id: "45-min-extreme-hiit-advanced",
  title: "45 MIN EXTREME FULL BODY HIIT - Advanced Fat Burn",
  channel_name: "growingannanas",
  description: "A high-intensity 45-minute advanced session designed to push cardiovascular limits and maximize total-body calorie burn with zero equipment.",
  category: "hiit",
  difficulty: "advanced",
  equipment: "No Equipment",
  duration_minutes: 48,
  estimated_calories: 450,
  video_url: "https://www.youtube.com/watch?v=M0uO8X3_tEA",
},
// 2. Juice & Toya - 30 MIN ADVANCED FULL BODY WORKOUT
{
  id: "30-min-advanced-full-body-juice-toya",
  title: "30 MIN ADVANCED FULL BODY WORKOUT (Dumbbell or Bodyweight)",
  channel_name: "Juice & Toya",
  description: "Explosive, advanced compound movements targeting full-body strength, power, and metabolic fat loss.",
  category: "strength",
  difficulty: "advanced",
  equipment: "Dumbbells / Bodyweight",
  duration_minutes: 32,
  estimated_calories: 380,
  video_url: "https://www.youtube.com/watch?v=eMjyvIQBN9M",
},
// 3. BullyJuice - 30 MIN ADVANCED NO EQUIPMENT FAT BURN
{
  id: "30-min-advanced-fat-burn-bullyjuice",
  title: "30 MIN ADVANCED FULL BODY WORKOUT - Intense Calisthenics",
  channel_name: "BullyJuice",
  description: "Fast-paced advanced calisthenics and plyometrics routine focused on high heart-rate intervals and core conditioning.",
  category: "cardio",
  difficulty: "advanced",
  equipment: "No Equipment",
  duration_minutes: 31,
  estimated_calories: 360,
  video_url: "https://www.youtube.com/watch?v=gC_L9qAHVJ8",
}
];