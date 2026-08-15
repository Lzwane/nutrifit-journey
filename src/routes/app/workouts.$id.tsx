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
  "25-min-full-body-hiit": [
    { id: "s1", name: "Warm-Up & Joint Mobility", timestampSeconds: 0, duration: "3 min" },
    { id: "s2", name: "High Knees & Low-Impact Cardio", timestampSeconds: 180, duration: "4 min" },
    { id: "s3", name: "Bodyweight Squats & Leg Toning", timestampSeconds: 420, duration: "5 min" },
    { id: "s4", name: "Standing Ab Crunches & Core", timestampSeconds: 720, duration: "5 min" },
    { id: "s5", name: "Full Body Burner Interval", timestampSeconds: 1020, duration: "5 min" },
    { id: "s6", name: "Cool-Down & Static Recovery", timestampSeconds: 1320, duration: "3 min" },
  ],
  "30-min-fat-burn-abs-intermediate": [
    { id: "i1", name: "Dynamic Cardio Warm-Up", timestampSeconds: 0, duration: "3 min" },
    { id: "i2", name: "Squat Jumps & Speed Skaters", timestampSeconds: 180, duration: "6 min" },
    { id: "i3", name: "Plank Jacks & Mountain Climbers", timestampSeconds: 540, duration: "6 min" },
    { id: "i4", name: "Standing Core & Oblique Crunch", timestampSeconds: 900, duration: "6 min" },
    { id: "i5", name: "Full Body Burner Sprint", timestampSeconds: 1260, duration: "6 min" },
    { id: "i6", name: "Full Body Cool-Down Stretch", timestampSeconds: 1620, duration: "4 min" },
  ],
  "45-min-extreme-hiit-advanced": [
    { id: "a1", name: "Dynamic Warm-Up & Mobility", timestampSeconds: 0, duration: "5 min" },
    { id: "a2", name: "Plyometric Cardio & Jump Intervals", timestampSeconds: 300, duration: "10 min" },
    { id: "a3", name: "Upper Body & Core Burner", timestampSeconds: 900, duration: "10 min" },
    { id: "a4", name: "Lower Body Explosive Power", timestampSeconds: 1500, duration: "10 min" },
    { id: "a5", name: "Final Full Body Finisher", timestampSeconds: 2100, duration: "8 min" },
    { id: "a6", name: "Full Body Recovery Stretch", timestampSeconds: 2580, duration: "5 min" },
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
  const segments = WORKOUT_SEGMENTS[id] || WORKOUT_SEGMENTS["25-min-full-body-hiit"];

  const playerRef = useRef<any>(null);
  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);

  // Restore saved session from localStorage
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

  // Track active workout globally so sidebar knows where to return
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

  // Initialize YouTube Player
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
          start: Math.floor(savedTime), // Resume where you left off
        },
        events: {
          onReady: (event: any) => {
            if (savedTime > 0) {
              event.target.seekTo(savedTime, true);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
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

  // Real-time tracking + localStorage persistence
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

          // Save state to localStorage
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
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      <div className="flex items-center justify-between">
        <Link
          to="/app/workouts"
          onClick={() => localStorage.removeItem("nutrifit_active_workout_id")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to All Workouts
        </Link>

        {currentTime > 5 && (
          <button
            type="button"
            onClick={handleResetWorkout}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-rose-500 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart Routine
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
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {workout.difficulty}
          </span>

          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-primary" /> {workout.duration_minutes} mins
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" /> {workout.estimated_calories} cal
            </span>
          </div>
        </div>

        <div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-foreground">{workout.title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{workout.description}</p>
        </div>
      </div>

      {/* AUTOMATIC LIVE SEGMENTS CHECKLIST */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-display text-base font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Workout Segments
          </h3>
          <span className="text-xs font-bold text-muted-foreground">
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
                    ? "bg-primary/10 border-primary/40 shadow-xs"
                    : isCompleted
                    ? "bg-emerald-500/10 border-emerald-500/20 opacity-80"
                    : "bg-background border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-primary text-primary-foreground animate-pulse"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>

                  <div>
                    <p
                      className={`text-xs sm:text-sm font-bold ${
                        isCompleted
                          ? "line-through text-muted-foreground"
                          : isCurrent
                          ? "text-primary"
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

                <span className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
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