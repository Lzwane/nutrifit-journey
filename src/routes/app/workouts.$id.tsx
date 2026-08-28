import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Flame, Sparkles, RotateCcw } from "lucide-react";
import { FEATURED_YOUTUBE_WORKOUTS } from "@/data/workouts";

export const Route = createFileRoute("/app/workouts/$id")({
  head: () => ({
    meta: [
      { title: "Workout Routine — NutriFit" },
      { name: "description", content: "Interactive video workout with real-time segment tracking." },
    ],
  }),
  component: WorkoutDetailPage,
});

export interface WorkoutSegment {
  id: string;
  name: string;
  timestampSeconds: number;
  duration: string;
}

const WORKOUT_SEGMENTS: Record<string, WorkoutSegment[]> = {
  // 1. BullyJuice 20 Min
  "20-min-beginner-full-body-bullyjuice": [
    { id: "bj1", name: "Jumping Jacks & In-Place Skips", timestampSeconds: 24, duration: "1 min" },
    { id: "bj2", name: "Air Squats & Push-Ups", timestampSeconds: 85, duration: "1 min" },
    { id: "bj3", name: "Elbow Planks & Supermans", timestampSeconds: 145, duration: "1 min" },
    { id: "bj4", name: "Roof Raises & Squat Calf Raises", timestampSeconds: 235, duration: "1.5 min" },
    { id: "bj5", name: "Side Lunges & Pike Presses", timestampSeconds: 325, duration: "1.5 min" },
    { id: "bj6", name: "Jump Rope & Upright Planks", timestampSeconds: 415, duration: "2 min" },
    { id: "bj7", name: "Fire Hydrants & Plank Ups", timestampSeconds: 595, duration: "2 min" },
    { id: "bj8", name: "Knee Strikes & Burpee Finisher", timestampSeconds: 805, duration: "2 min" },
  ],

  // 2. Growingannanas 25 Min HIIT
  "25-min-full-body-hiit-growingannanas": [
    { id: "ga1", name: "Dynamic Warm-Up & Joint Mobility", timestampSeconds: 0, duration: "3 min" },
    { id: "ga2", name: "Low-Impact Cardio & Air Squats", timestampSeconds: 180, duration: "4 min" },
    { id: "ga3", name: "Standing Core & Obliques", timestampSeconds: 420, duration: "5 min" },
    { id: "ga4", name: "Upper Body Mat Flow & Planks", timestampSeconds: 720, duration: "5 min" },
    { id: "ga5", name: "Full Body Calorie Burner", timestampSeconds: 1020, duration: "5 min" },
    { id: "ga6", name: "Cool-Down Stretch & Recovery", timestampSeconds: 1440, duration: "3 min" },
  ],

  // 3. Roberta's Gym 30 Min
  "30-min-beginner-full-body-robertas-gym": [
    { id: "rg1", name: "Arm Crossovers & Arm Circles", timestampSeconds: 0, duration: "2 min" },
    { id: "rg2", name: "Lateral Steps & Side Bends", timestampSeconds: 105, duration: "3 min" },
    { id: "rg3", name: "Hip Swirls & Knee Drives", timestampSeconds: 240, duration: "2 min" },
    { id: "rg4", name: "Step Back Jacks & Lateral Circles", timestampSeconds: 365, duration: "3 min" },
    { id: "rg5", name: "Diagonal Abs & Tiny Jacks", timestampSeconds: 535, duration: "3.5 min" },
    { id: "rg6", name: "Leg Kicks, Windmills & Glute Bridges", timestampSeconds: 740, duration: "5 min" },
    { id: "rg7", name: "Squats, Punches & Cool Down", timestampSeconds: 1060, duration: "5 min" },
  ],

  // 4. Rowan Row 30 Min
  "30-min-full-body-with-warmup-rowan-row": [
    { id: "rr1", name: "Section 1: Full Body Mobility Warm-Up", timestampSeconds: 0, duration: "6 min" },
    { id: "rr2", name: "Section 2: Upper Body Strength Flow", timestampSeconds: 360, duration: "6 min" },
    { id: "rr3", name: "Section 3: Lower Body & Glute Burn", timestampSeconds: 720, duration: "6 min" },
    { id: "rr4", name: "Section 4: Core & Abdominals", timestampSeconds: 1080, duration: "6 min" },
    { id: "rr5", name: "Section 5: High Intensity HIIT Finisher", timestampSeconds: 1440, duration: "5 min" },
    { id: "rr6", name: "Section 6: Post-Workout Stretch", timestampSeconds: 1740, duration: "3 min" },
  ],

  // 5. Move With Nicole 30 Min Pilates
  "30-min-full-body-pilates-nicole": [
    { id: "mn1", name: "Seated Spine & Lateral Stretches", timestampSeconds: 0, duration: "3 min" },
    { id: "mn2", name: "Imprint Spine & Tabletop Toe Taps", timestampSeconds: 165, duration: "2 min" },
    { id: "mn3", name: "The Pilates Hundreds", timestampSeconds: 280, duration: "1 min" },
    { id: "mn4", name: "Roll-Ups & Single Leg Glute Bridges", timestampSeconds: 335, duration: "3.5 min" },
    { id: "mn5", name: "Double Leg Stretch & Criss-Cross", timestampSeconds: 545, duration: "4 min" },
    { id: "mn6", name: "Side Plank Leg Lifts & Glute Burn", timestampSeconds: 790, duration: "9.5 min" },
    { id: "mn7", name: "Squats, Push-Ups & Pigeon Stretches", timestampSeconds: 1365, duration: "8 min" },
  ],

  // 6. Juice & Toya 30 Min Bodyweight Strength
  "30-min-bodyweight-strength-juice-toya": [
    { id: "jt1", name: "Dynamic Full Body Warm-Up", timestampSeconds: 0, duration: "2 min" },
    { id: "jt2", name: "Lower Body Strength & Isometric Holds", timestampSeconds: 120, duration: "8 min" },
    { id: "jt3", name: "Push-Up & Upper Body Endurance", timestampSeconds: 600, duration: "8 min" },
    { id: "jt4", name: "Core Stability & Isometric Planks", timestampSeconds: 1080, duration: "8 min" },
    { id: "jt5", name: "Dynamic Full Body Burner", timestampSeconds: 1560, duration: "6 min" },
    { id: "jt6", name: "Post-Workout Cool Down & Stretch", timestampSeconds: 1920, duration: "3 min" },
  ],

  // 7. TIFF x DAN 25 Min Extreme HIIT
  "25-min-extreme-full-body-tiff-dan": [
    { id: "td1", name: "Air Squats & Jump Squats", timestampSeconds: 0, duration: "1.5 min" },
    { id: "td2", name: "Shoulder Taps & Push-Up Taps", timestampSeconds: 85, duration: "1.5 min" },
    { id: "td3", name: "Static Lunges & Lunge Hops", timestampSeconds: 165, duration: "1.5 min" },
    { id: "td4", name: "Plank Toe Taps & Blast Off Push Ups", timestampSeconds: 245, duration: "1.5 min" },
    { id: "td5", name: "Prayer Crunches & Lean Back Pulses", timestampSeconds: 325, duration: "6.5 min" },
    { id: "td6", name: "Scissor Kicks & Rear Lunge Knee Drives", timestampSeconds: 725, duration: "8 min" },
    { id: "td7", name: "In & Out Squats & Burpee Finishers", timestampSeconds: 1205, duration: "7 min" },
    { id: "td8", name: "Full Body Cool Down & Stretch", timestampSeconds: 1620, duration: "4 min" },
  ],

  // 8. Growingannanas 30 Min Killer HIIT
  "30-min-killer-hiit-growingannanas": [
    { id: "gk1", name: "Warm-Up (Butt Kicks & Overhead Squats)", timestampSeconds: 0, duration: "6 min" },
    { id: "gk2", name: "Round 1: Squat Jumps & Mountain Climbers", timestampSeconds: 365, duration: "8 min" },
    { id: "gk3", name: "Round 2: Push Up Variations & Plyo Lunges", timestampSeconds: 855, duration: "1 min" },
    { id: "gk4", name: "Round 3: Jackknives & Core Isolation", timestampSeconds: 910, duration: "8.5 min" },
    { id: "gk5", name: "Advanced HIIT Finisher & High Heart-Rate", timestampSeconds: 1415, duration: "7 min" },
    { id: "gk6", name: "Deep Recovery & Full Body Cool Down", timestampSeconds: 1850, duration: "4.5 min" },
  ],

  // 9. Rowan Row 45 Min Ultimate
  "45-min-ultimate-full-body-rowan-row": [
    { id: "ru1", name: "Section 1: Joint Mobility & Dynamic Warm Up", timestampSeconds: 0, duration: "6 min" },
    { id: "ru2", name: "Section 2: Lower Body (Sumo Squats & Lunges)", timestampSeconds: 365, duration: "8.5 min" },
    { id: "ru3", name: "Section 3: Upper Body (Pikes & Supermans)", timestampSeconds: 870, duration: "8.5 min" },
    { id: "ru4", name: "Section 4: Core & Obliques (V-Ups & Bicycles)", timestampSeconds: 1365, duration: "8.5 min" },
    { id: "ru5", name: "Section 5: High Intensity HIIT Finisher", timestampSeconds: 1870, duration: "8.5 min" },
    { id: "ru6", name: "Section 6: Post-Workout Stretch & Recovery", timestampSeconds: 2385, duration: "7 min" },
  ],

  // 10. Juice & Toya 30 Min Dumbbell Advanced
  "30-min-advanced-dumbbell-juice-toya": [
    { id: "jd1", name: "Warm-Up & Dynamic Stretching", timestampSeconds: 0, duration: "2.5 min" },
    { id: "jd2", name: "Group 1: Upper Body Strength Compounds", timestampSeconds: 165, duration: "8.5 min" },
    { id: "jd3", name: "Group 2: Lower Body Dumbbell Complexes", timestampSeconds: 685, duration: "8.5 min" },
    { id: "jd4", name: "Group 3: Full Body Dynamic Conditioning", timestampSeconds: 1175, duration: "8.5 min" },
    { id: "jd5", name: "Group 4: Weighted Core & Abdominals", timestampSeconds: 1665, duration: "4.5 min" },
    { id: "jd6", name: "Full Body Cool Down & Recovery", timestampSeconds: 1920, duration: "3 min" },
  ],

  // 11. Juice & Toya 25 Min Muscular Endurance
  "25-min-muscular-endurance-juice-toya": [
    { id: "je1", name: "Dynamic Warm Up", timestampSeconds: 0, duration: "2 min" },
    { id: "je2", name: "Circuit Group 1: High-Density Compounds", timestampSeconds: 120, duration: "6.5 min" },
    { id: "je3", name: "Circuit Group 2: Posterior Chain & Pull Strength", timestampSeconds: 510, duration: "6.5 min" },
    { id: "je4", name: "Circuit Group 3: Core & Shoulder Endurance", timestampSeconds: 900, duration: "7 min" },
    { id: "je5", name: "Circuit Group 4: Full Body Power Repeater", timestampSeconds: 1320, duration: "8 min" },
    { id: "je6", name: "Complete Cool-Down Stretch", timestampSeconds: 1800, duration: "3.5 min" },
  ],

  // 12. fitness__kaykay 45 Min Power Workout
  "45-min-power-db-workout-kaykay": [
    { id: "kk1", name: "Dynamic Mobility Warm-Up", timestampSeconds: 0, duration: "3 min" },
    { id: "kk2", name: "Power Block 1: Heavy DB Squats & Presses", timestampSeconds: 195, duration: "12 min" },
    { id: "kk3", name: "Power Block 2: Deadlifts, Rows & Back Strength", timestampSeconds: 930, duration: "11.5 min" },
    { id: "kk4", name: "Power Block 3: Unilateral Lunges & Chest Flyes", timestampSeconds: 1620, duration: "11.5 min" },
    { id: "kk5", name: "Power Block 4: Core Conditioning & Carries", timestampSeconds: 2295, duration: "9 min" },
    { id: "kk6", name: "Full Body Decompression & Stretch", timestampSeconds: 2820, duration: "5.5 min" },
  ],

  // 13. Sunny Health & Fitness 15 Min Bodyweight
  "15-min-beginner-bodyweight-strength-sunny": [
    { id: "sh1", name: "Warm-Up (Toy Soldiers & Hip Openers)", timestampSeconds: 0, duration: "4.5 min" },
    { id: "sh2", name: "Triplex Complex 1: Squat + Dead Reach + Lunge", timestampSeconds: 265, duration: "4 min" },
    { id: "sh3", name: "Triplex Complex 2: Single-Leg B-Stance Squat", timestampSeconds: 505, duration: "1.5 min" },
    { id: "sh4", name: "Split Squats & Quad Burner", timestampSeconds: 600, duration: "2.5 min" },
    { id: "sh5", name: "Scapular Squeeze & Push-Up Shoulder Taps", timestampSeconds: 765, duration: "3 min" },
    { id: "sh6", name: "Cool-Down Stretch & Hip Flexor Mobility", timestampSeconds: 950, duration: "2 min" },
  ],

  // 14. SeniorShape Fitness 25 Min Isometric Strength
  "25-min-isometric-strength-seniorshape": [
    { id: "ss1", name: "Low-Impact Gentle Warm-Up", timestampSeconds: 0, duration: "6.5 min" },
    { id: "ss2", name: "Overhead Shoulder Press & Isometric Holds", timestampSeconds: 400, duration: "2 min" },
    { id: "ss3", name: "Balance Lunges & Supported Squat Holds", timestampSeconds: 505, duration: "2 min" },
    { id: "ss4", name: "Bicep Curls & Halfway Isometric Burn", timestampSeconds: 635, duration: "3 min" },
    { id: "ss5", name: "Hinged Back Rows & Side Lunges", timestampSeconds: 825, duration: "4.5 min" },
    { id: "ss6", name: "Front & Lateral Shoulder Sculpting", timestampSeconds: 1105, duration: "2 min" },
    { id: "ss7", name: "Standing Quad Extensions & Stretch", timestampSeconds: 1200, duration: "8.5 min" },
  ],

  // 15. PILATES BY IZZY 45 Min Full Body Strength
  "45-min-full-body-strength-izzy": [
    { id: "iz1", name: "Cat-Cow Spine Waves & Downward Dog Warm-Up", timestampSeconds: 0, duration: "4.5 min" },
    { id: "iz2", name: "Abdominal Imprint Series & Rainbow Weights", timestampSeconds: 275, duration: "9 min" },
    { id: "iz3", name: "4-Point Glute Extensions & Thread the Needle", timestampSeconds: 810, duration: "5 min" },
    { id: "iz4", name: "Tricep Push-Ups to Pike Ankle Taps", timestampSeconds: 1110, duration: "2 min" },
    { id: "iz5", name: "Side Plank Arm Rows & Leg Crunch", timestampSeconds: 1225, duration: "3 min" },
    { id: "iz6", name: "Standing 90/90 Lunges & Hinge Sweeps", timestampSeconds: 1395, duration: "20 min" },
    { id: "iz7", name: "Full Body Pigeon Stretches & Recovery", timestampSeconds: 2605, duration: "4.5 min" },
  ],
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function WorkoutDetailPage() {
  const { id } = Route.useParams();
  const workout = FEATURED_YOUTUBE_WORKOUTS.find((w) => w.id === id) || FEATURED_YOUTUBE_WORKOUTS[0];
  const segments = WORKOUT_SEGMENTS[id] || WORKOUT_SEGMENTS[FEATURED_YOUTUBE_WORKOUTS[0].id];

  const playerRef = useRef<any>(null);
  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);

  const savedSessionKey = `nutrifit_workout_${id}`;
  const [savedTime] = useState<number>(() => {
    const saved = localStorage.getItem(savedSessionKey);
    return saved ? JSON.parse(saved).time || 0 : 0;
  });

  const [currentTime, setCurrentTime] = useState(savedTime);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSegmentIds, setCompletedSegmentIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(savedSessionKey);
    return saved ? JSON.parse(saved).completed || [] : [];
  });

  useEffect(() => {
    localStorage.setItem("nutrifit_active_workout_id", id);
  }, [id]);

  const extractYouTubeId = (url?: string) => {
    if (!url) return "cbKkB3POqaY";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : "cbKkB3POqaY";
  };

  const videoId = extractYouTubeId(workout.video_url);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      playerRef.current = new window.YT.Player(containerId.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          start: Math.floor(savedTime),
        },
        events: {
          onReady: (event: any) => {
            if (savedTime > 0) {
              event.target.seekTo(savedTime, true);
            }
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === 1);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, savedTime]);

  useEffect(() => {
    let interval: any;

    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const secs = playerRef.current.getCurrentTime();
          setCurrentTime(secs);

          let updatedCompleted = [...completedSegmentIds];

          segments.forEach((seg, index) => {
            const nextSeg = segments[index + 1];
            if (nextSeg && secs >= nextSeg.timestampSeconds) {
              if (!updatedCompleted.includes(seg.id)) {
                updatedCompleted.push(seg.id);
              }
            } else if (!nextSeg && secs >= seg.timestampSeconds + 30) {
              if (!updatedCompleted.includes(seg.id)) {
                updatedCompleted.push(seg.id);
              }
            }
          });

          setCompletedSegmentIds(updatedCompleted);

          localStorage.setItem(
            savedSessionKey,
            JSON.stringify({ time: secs, completed: updatedCompleted })
          );
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, segments, completedSegmentIds, savedSessionKey]);

  const seekToSegment = (seg: WorkoutSegment) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seg.timestampSeconds, true);
      playerRef.current.playVideo();
    }
  };

  const handleResetWorkout = () => {
    localStorage.removeItem(savedSessionKey);
    setCompletedSegmentIds([]);
    setCurrentTime(0);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(0, true);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12 w-full">
      <div className="flex items-center justify-between">
        <Link
          to="/app/workouts"
          onClick={() => localStorage.removeItem("nutrifit_active_workout_id")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" /> Back to All Workouts
        </Link>

        {currentTime > 5 && (
          <button
            type="button"
            onClick={handleResetWorkout}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-rose-500 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" /> Restart Routine
          </button>
        )}
      </div>

      {/* EMBEDDED PLAYER */}
      <div className="overflow-hidden rounded-3xl border border-border bg-black shadow-lg">
        <div className="aspect-video w-full">
          <div id={containerId.current} className="w-full h-full" />
        </div>
      </div>

      {/* WORKOUT INFO */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            {workout.difficulty} • {workout.category.replace("_", " ")}
          </span>

          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-emerald-500 shrink-0" /> {workout.duration_minutes} mins
            </span>
            <span className="flex items-center gap-1 font-bold text-orange-500">
              <Flame className="h-4 w-4 text-orange-500 shrink-0" /> {workout.estimated_calories} cal
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">{workout.title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{workout.description}</p>
        </div>
      </div>

      {/* AUTOMATIC LIVE SEGMENTS CHECKLIST */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" /> Workout Segments
          </h3>
          <span className="text-xs font-bold text-muted-foreground font-mono">
            {completedSegmentIds.length} / {segments.length} Completed
          </span>
        </div>

        <div className="space-y-2.5">
          {segments.map((seg, index) => {
            const isCompleted = completedSegmentIds.includes(seg.id);
            const isCurrent =
              currentTime >= seg.timestampSeconds &&
              (!segments[index + 1] || currentTime < segments[index + 1].timestampSeconds);

            return (
              <div
                key={seg.id}
                onClick={() => seekToSegment(seg)}
                className={`cursor-pointer flex items-center justify-between p-3.5 rounded-2xl border transition ${
                  isCurrent
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-xs"
                    : isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/20 opacity-80"
                    : "bg-background border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-emerald-500 text-white animate-pulse"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : index + 1}
                  </div>

                  <div>
                    <p
                      className={`text-xs sm:text-sm font-bold ${
                        isCompleted
                          ? "line-through text-muted-foreground"
                          : isCurrent
                          ? "text-emerald-500"
                          : "text-foreground"
                      }`}
                    >
                      {seg.name}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Starts at {Math.floor(seg.timestampSeconds / 60)}:{seg.timestampSeconds % 60 < 10 ? "0" : ""}{seg.timestampSeconds % 60}
                    </span>
                  </div>
                </div>

                <span className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground shrink-0">
                  {seg.duration}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WorkoutDetailPage;