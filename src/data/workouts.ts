export type Workout = {
  id: string;
  title: string;
  channel_name: string;
  description: string | null;
  category: "full_body" | "strength" | "hiit" | "cardio";
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string;
  duration_minutes: number;
  estimated_calories: number;
  video_url: string;
};

export const FEATURED_YOUTUBE_WORKOUTS: Workout[] = [
  // ==========================================
  // FULL BODY - BEGINNERS
  // ==========================================
  {
    id: "20-min-beginner-full-body-bullyjuice",
    title: "PERFECT 20 MIN FULL BODY WORKOUT FOR BEGINNERS (No Equipment)",
    channel_name: "BullyJuice",
    description: "Follow along with BullyJuice for a 20-minute, no-repeat beginner full-body routine. Perfect for burning calories and building stamina without weights.",
    category: "full_body",
    difficulty: "beginner",
    equipment: "No Equipment",
    duration_minutes: 20,
    estimated_calories: 200,
    video_url: "https://www.youtube.com/watch?v=iCQ2gC4DqJw",
  },
  {
    id: "25-min-full-body-hiit-growingannanas",
    title: "25 MIN FULL BODY HIIT for Beginners - No Equipment",
    channel_name: "growingannanas",
    description: "A fun and effective full-body HIIT workout designed for beginners by growingannanas. No equipment required.",
    category: "hiit",
    difficulty: "beginner",
    equipment: "No Equipment",
    duration_minutes: 25,
    estimated_calories: 240,
    video_url: "https://www.youtube.com/watch?v=cbKkB3POqaY",
  },
  {
    id: "30-min-beginner-full-body-robertas-gym",
    title: "Half an Hour Full Body Workout For Beginners",
    channel_name: "Roberta's Gym",
    description: "A comprehensive 30-minute full body beginner home session targeting legs, abs, arms, and cardiovascular endurance.",
    category: "full_body",
    difficulty: "beginner",
    equipment: "No Equipment",
    duration_minutes: 30,
    estimated_calories: 220,
    video_url: "https://www.youtube.com/watch?v=UadGwhOBjFA",
  },
  {
    id: "30-min-full-body-with-warmup-rowan-row",
    title: "30 Min FULL BODY WORKOUT with WARM UP (No Equipment & No Repeat)",
    channel_name: "Rowan Row",
    description: "Rowan Row guides you through 5 dedicated sections: warm-up, upper body, lower body, core, and a high-intensity finisher.",
    category: "full_body",
    difficulty: "beginner",
    equipment: "No Equipment",
    duration_minutes: 30,
    estimated_calories: 260,
    video_url: "https://www.youtube.com/watch?v=UIPvIYsjfpo",
  },

  // ==========================================
  // FULL BODY - INTERMEDIATE
  // ==========================================
  {
    id: "30-min-full-body-pilates-nicole",
    title: "30 MIN FULL BODY WORKOUT || At-Home Pilates (Intermediate)",
    channel_name: "Move With Nicole",
    description: "Strengthen and lengthen your entire body with this intermediate at-home Pilates session focusing on core stability, glutes, and posture.",
    category: "full_body",
    difficulty: "intermediate",
    equipment: "Mat",
    duration_minutes: 30,
    estimated_calories: 230,
    video_url: "https://www.youtube.com/watch?v=9zB_3jIYBR4",
  },
  {
    id: "30-min-bodyweight-strength-juice-toya",
    title: "30 Minute Full Body Strength Workout [No Equipment + Modifications]",
    channel_name: "Juice & Toya",
    description: "An intermediate bodyweight strength training session utilizing isometric holds and functional movement patterns to build lean muscle.",
    category: "strength",
    difficulty: "intermediate",
    equipment: "No Equipment",
    duration_minutes: 30,
    estimated_calories: 290,
    video_url: "https://www.youtube.com/watch?v=9FBIaqr7TjQ",
  },

  // ==========================================
  // FULL BODY - ADVANCED
  // ==========================================
  {
    id: "25-min-extreme-full-body-tiff-dan",
    title: "25 Min EXTREME Full Body HIIT Bodyweight Workout At Home + Cool Down",
    channel_name: "TIFF x DAN",
    description: "An advanced, high-calorie-burning bodyweight HIIT session featuring explosive plyometrics, push-up combos, and core burners.",
    category: "hiit",
    difficulty: "advanced",
    equipment: "No Equipment",
    duration_minutes: 25,
    estimated_calories: 340,
    video_url: "https://www.youtube.com/watch?v=npofZutKsfA",
  },
  {
    id: "30-min-killer-hiit-growingannanas",
    title: "30 MIN KILLER HIIT WORKOUT - Full Body Advanced Home Workout",
    channel_name: "growingannanas",
    description: "High-intensity advanced intervals designed to push heart rates to peak levels with no equipment and no repeated exercises.",
    category: "hiit",
    difficulty: "advanced",
    equipment: "No Equipment",
    duration_minutes: 30,
    estimated_calories: 380,
    video_url: "https://www.youtube.com/watch?v=e3-zpBc_hg8",
  },
  {
    id: "45-min-ultimate-full-body-rowan-row",
    title: "The Ultimate 45 Min FULL BODY WORKOUT | Rowan Row",
    channel_name: "Rowan Row",
    description: "A 45-minute masterclass structured into 6 sections: warm-up, lower body, upper body, core, HIIT, and post-workout recovery stretches.",
    category: "full_body",
    difficulty: "advanced",
    equipment: "No Equipment",
    duration_minutes: 45,
    estimated_calories: 480,
    video_url: "https://www.youtube.com/watch?v=cDq-nFmD0rI",
  },
  {
    id: "30-min-advanced-dumbbell-juice-toya",
    title: "30 Minute Full Body Dumbbell Workout NO REPEAT (Advanced)",
    channel_name: "Juice & Toya",
    description: "An advanced 4-group dumbbell routine targeting upper body, lower body, dynamic athletic power, and weighted core conditioning.",
    category: "strength",
    difficulty: "advanced",
    equipment: "Dumbbells",
    duration_minutes: 30,
    estimated_calories: 360,
    video_url: "https://www.youtube.com/watch?v=4sUGg9mcMGU",
  },

  // ==========================================
  // STRENGTH - ADVANCED
  // ==========================================
  {
    id: "25-min-muscular-endurance-juice-toya",
    title: "25 Minute Full Body Dumbbell Muscular-Endurance Workout",
    channel_name: "Juice & Toya",
    description: "Advanced strength and hypertrophy workout utilizing rapid interval density to build muscular endurance across all major muscle groups.",
    category: "strength",
    difficulty: "advanced",
    equipment: "Dumbbells",
    duration_minutes: 25,
    estimated_calories: 310,
    video_url: "https://www.youtube.com/watch?v=2M8bTJj-ouY",
  },
  {
    id: "45-min-power-db-workout-kaykay",
    title: "45 MIN POWER WORKOUT | Strength + Conditioning (Full Body DB Workout)",
    channel_name: "fitness__kaykay",
    description: "Intense 45-minute strength and conditioning session utilizing heavy dumbbell complexes, unilateral strength, and functional core circuits.",
    category: "strength",
    difficulty: "advanced",
    equipment: "Dumbbells",
    duration_minutes: 45,
    estimated_calories: 450,
    video_url: "https://www.youtube.com/watch?v=J2SJAXxTp4M",
  },

  // ==========================================
  // STRENGTH - BEGINNER & INTERMEDIATE
  // ==========================================
  {
    id: "15-min-beginner-bodyweight-strength-sunny",
    title: "15 Min BEGINNER Full Bodyweight Strength Workout",
    channel_name: "Sunny Health & Fitness",
    description: "A fast, beginner-friendly 15-minute bodyweight routine featuring squats, dead reaches, split squats, and push-up complexes.",
    category: "strength",
    difficulty: "beginner",
    equipment: "No Equipment",
    duration_minutes: 15,
    estimated_calories: 140,
    video_url: "https://www.youtube.com/watch?v=dcKwz_C8pkg",
  },
  {
    id: "25-min-isometric-strength-seniorshape",
    title: "Strength Training Workout for Beginners & Seniors // Isometric & Balance",
    channel_name: "SeniorShape Fitness",
    description: "A beginner-friendly strength session focusing on joint-safe isometric holds, bicep curls, squats, and balance training.",
    category: "strength",
    difficulty: "beginner",
    equipment: "Light Dumbbells / Chair",
    duration_minutes: 25,
    estimated_calories: 180,
    video_url: "https://www.youtube.com/watch?v=EZlF5_Je0YE",
  },
  {
    id: "45-min-full-body-strength-izzy",
    title: "45 MIN FULL BODY STRENGTH WORKOUT | Intermediate - Advanced",
    channel_name: "PILATES BY IZZY",
    description: "A balanced full-body strength flow combining mat Pilates, dumbbell rows, tricep push-ups, and lunges with knee drives.",
    category: "strength",
    difficulty: "intermediate",
    equipment: "Dumbbells / Ankle Weights",
    duration_minutes: 45,
    estimated_calories: 390,
    video_url: "https://www.youtube.com/watch?v=apxD2yT5mgQ",
  },
];