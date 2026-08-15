import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Play, Pause, Flame, Sparkles } from "lucide-react";

export interface WorkoutSegment {
  id: string;
  name: string;
  timestampSeconds: number; // Time in video when this segment starts
  duration: string;
}

export interface InteractiveWorkoutProps {
  videoId: string;
  title: string;
  description: string;
  durationMinutes: number;
  estimatedCalories: number;
  segments: WorkoutSegment[];
  onWorkoutComplete?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function InteractiveWorkoutPlayer({
  videoId,
  title,
  description,
  durationMinutes,
  estimatedCalories,
  segments,
  onWorkoutComplete,
}: InteractiveWorkoutProps) {
  const playerRef = useRef<any>(null);
  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSegmentIds, setCompletedSegmentIds] = useState<string[]>([]);

  // Load YouTube IFrame API
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
        },
        events: {
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING === 1
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
  }, [videoId]);

  // Track playback time in real-time and auto-tick segments
  useEffect(() => {
    let interval: any;

    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const secs = playerRef.current.getCurrentTime();
          setCurrentTime(secs);

          // Auto-tick segments as completed when passed
          segments.forEach((seg, index) => {
            const nextSeg = segments[index + 1];
            // Segment is considered completed if the player has advanced past its end time
            if (nextSeg && secs >= nextSeg.timestampSeconds) {
              setCompletedSegmentIds((prev) =>
                prev.includes(seg.id) ? prev : [...prev, seg.id]
              );
            } else if (!nextSeg && secs >= seg.timestampSeconds + 30) {
              // Final segment
              setCompletedSegmentIds((prev) =>
                prev.includes(seg.id) ? prev : [...prev, seg.id]
              );
              if (onWorkoutComplete) onWorkoutComplete();
            }
          });
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, segments, onWorkoutComplete]);

  // Jump to specific segment timestamp when user clicks a segment
  const seekToSegment = (seg: WorkoutSegment) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seg.timestampSeconds, true);
      playerRef.current.playVideo();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* DIRECT EMBEDDED PLAYER */}
      <div className="overflow-hidden rounded-3xl border border-border bg-black shadow-lg">
        <div className="aspect-video w-full">
          <div id={containerId.current} className="w-full h-full" />
        </div>
      </div>

      {/* WORKOUT INFO */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Beginner Fat Loss
          </span>

          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-primary" /> {durationMinutes} mins
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" /> {estimatedCalories} cal
            </span>
          </div>
        </div>

        <div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-foreground">{title}</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {/* AUTOMATICALLY CHECKED EXERCISE SEGMENTS */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-display text-base font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Live Workout Segments
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
                      Starts at {formatSeconds(seg.timestampSeconds)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                    {seg.duration}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}