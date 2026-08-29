import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Flame,
  Clock,
  Footprints,
  TrendingUp,
  MapPin,
  History,
  Activity,
  Zap,
  CheckCircle2,
  X,
  Trophy,
  Award,
  Bell,
  Volume2,
  VolumeX,
  SkipForward,
  ChevronRight,
  Target,
  Sparkles,
  ArrowLeft,
  Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/running")({
  head: () => ({
    meta: [
      { title: "Outdoor GPS Running — NutriFit" },
      { name: "description", content: "Outdoor GPS running tracker with voice coach, personal bests, and daily notifications." },
    ],
  }),
  component: RunningTrackerPage,
});

interface Coordinate {
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
}

interface RunSummary {
  id: string;
  distanceKm: number;
  durationSeconds: number;
  avgPace: string;
  maxSpeedKmh: number;
  calories: number;
  steps: number;
  date: string;
  goalKm: number | null;
  intensityBreakdown: {
    walkingPct: number;
    joggingPct: number;
    sprintingPct: number;
  };
}

interface PersonalBests {
  longestDistanceKm: number;
  fastestPace: string;
  best5kTime: string;
  totalDistanceKm: number;
  totalRunsCount: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    return `${hrs}:${(mins % 60).toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function speakVoice(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const natural = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
  );
  if (natural) utterance.voice = natural;
  window.speechSynthesis.speak(utterance);
}

function RunningTrackerPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"hub" | "history">("hub");

  // Running Flow States
  const [sessionStage, setSessionStage] = useState<"idle" | "goal-select" | "warmup" | "countdown" | "running" | "paused">("idle");
  const [targetGoalKm, setTargetGoalKm] = useState<number | null>(5);
  const [countdownNum, setCountdownNum] = useState(3);
  const [warmupSecondsLeft, setWarmupSecondsLeft] = useState(600); // 10 mins

  // Run Metrics
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [stepsCount, setStepsCount] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [currentPace, setCurrentPace] = useState("0'00\"");
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [completedSummary, setCompletedSummary] = useState<RunSummary | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(false);

  // Daily Run Reminders
  const [reminderTime, setReminderTime] = useState("06:00");
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    return localStorage.getItem("nutrifit_run_reminder_enabled") === "true";
  });
  const [showReminderModal, setShowReminderModal] = useState(false);

  // History & Personal Bests
  const [historyRuns, setHistoryRuns] = useState<RunSummary[]>(() => {
    const saved = localStorage.getItem("nutrifit_running_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [personalBests, setPersonalBests] = useState<PersonalBests>({
    longestDistanceKm: 0,
    fastestPace: "0'00\"",
    best5kTime: "--:--",
    totalDistanceKm: 0,
    totalRunsCount: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const runTimerRef = useRef<any>(null);
  const warmupTimerRef = useRef<any>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const lastSpokenKmRef = useRef<number>(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const polylineLayerGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  // Calculate Personal Bests from History
  useEffect(() => {
    if (historyRuns.length === 0) return;

    let longest = 0;
    let totalDist = 0;
    let fastestPaceSecs = 999999;
    let best5k = 999999;

    historyRuns.forEach((r) => {
      totalDist += r.distanceKm;
      if (r.distanceKm > longest) longest = r.distanceKm;

      const [m, s] = r.avgPace.replace('"', '').split("'").map(Number);
      const paceSecs = (m || 0) * 60 + (s || 0);
      if (paceSecs > 0 && paceSecs < fastestPaceSecs) {
        fastestPaceSecs = paceSecs;
      }

      if (r.distanceKm >= 5 && r.durationSeconds < best5k) {
        best5k = r.durationSeconds;
      }
    });

    const fM = Math.floor(fastestPaceSecs / 60);
    const fS = Math.round(fastestPaceSecs % 60);

    setPersonalBests({
      longestDistanceKm: Math.round(longest * 100) / 100,
      totalDistanceKm: Math.round(totalDist * 100) / 100,
      fastestPace: fastestPaceSecs < 999999 ? `${fM}'${fS.toString().padStart(2, "0")}"` : "0'00\"",
      best5kTime: best5k < 999999 ? formatTime(best5k) : "--:--",
      totalRunsCount: historyRuns.length,
    });
  }, [historyRuns]);

  // Load Leaflet Scripts
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!(window as any).L && !document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Initialize Zoomed Leaflet Map when Run Stage starts
  useEffect(() => {
    if (sessionStage !== "running" && sessionStage !== "paused") return;

    const initMap = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        const defaultCenter = coordinates.length > 0
          ? [coordinates[coordinates.length - 1].lat, coordinates[coordinates.length - 1].lng]
          : [-25.62, 28.02];

        const mapInstance = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView(defaultCenter, 18);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapInstance);

        const group = L.layerGroup().addTo(mapInstance);
        polylineLayerGroupRef.current = group;
        leafletMapRef.current = mapInstance;
      }
    };

    const timer = setTimeout(initMap, 200);
    return () => clearTimeout(timer);
  }, [sessionStage]);

  // Update Traversed Polyline and Marker with Pulse
  useEffect(() => {
    if (!leafletMapRef.current || !(window as any).L || coordinates.length === 0) return;
    const L = (window as any).L;
    const map = leafletMapRef.current;
    const group = polylineLayerGroupRef.current;
    const latest = coordinates[coordinates.length - 1];

    if (!userMarkerRef.current) {
      const pulseIcon = L.divIcon({
        className: "custom-pulse-marker",
        html: `<div style="background-color:#10b981;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 15px #10b981;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = L.marker([latest.lat, latest.lng], { icon: pulseIcon }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([latest.lat, latest.lng]);
    }

    map.setView([latest.lat, latest.lng], 18, { animate: true });

    if (coordinates.length >= 2 && group) {
      const p1 = coordinates[coordinates.length - 2];
      const p2 = coordinates[coordinates.length - 1];
      const speedColor = p2.speed < 6 ? "#3b82f6" : p2.speed < 12 ? "#10b981" : "#f97316";

      L.polyline(
        [
          [p1.lat, p1.lng],
          [p2.lat, p2.lng],
        ],
        {
          color: speedColor,
          weight: 7,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }
      ).addTo(group);
    }
  }, [coordinates]);

  // Warmup Countdown Timer
  useEffect(() => {
    if (sessionStage === "warmup") {
      warmupTimerRef.current = setInterval(() => {
        setWarmupSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(warmupTimerRef.current);
            startCountdown();
            return 0;
          }
          if (prev === 300 && !voiceMuted) {
            speakVoice("Five minutes of warmup remaining. Prepare for your run.");
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(warmupTimerRef.current);
    }
    return () => clearInterval(warmupTimerRef.current);
  }, [sessionStage, voiceMuted]);

  // Run Timer
  useEffect(() => {
    if (sessionStage === "running") {
      runTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(runTimerRef.current);
    }
    return () => clearInterval(runTimerRef.current);
  }, [sessionStage]);

  // GPS Tracking & Kilometer Voice Announcements
  useEffect(() => {
    if (sessionStage === "running") {
      if (!("geolocation" in navigator)) {
        alert("GPS location tracking is not supported on this browser.");
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, accuracy } = position.coords;
          if (accuracy > 35) return;

          const rawSpeed = speed !== null && speed >= 0 ? speed * 3.6 : 0;
          setCurrentSpeedKmh(Math.round(rawSpeed * 10) / 10);

          const newCoord: Coordinate = {
            lat: latitude,
            lng: longitude,
            speed: rawSpeed,
            timestamp: position.timestamp,
          };

          if (lastCoordRef.current) {
            const deltaDist = calculateDistance(
              lastCoordRef.current.lat,
              lastCoordRef.current.lng,
              newCoord.lat,
              newCoord.lng
            );

            if (deltaDist > 1.5) {
              setDistanceMeters((prev) => {
                const total = prev + deltaDist;
                setStepsCount(Math.round(total * 1.31));

                const currentKm = total / 1000;
                const roundedKm = Math.floor(currentKm);

                // Voice Announcements on every full Kilometer
                if (roundedKm > lastSpokenKmRef.current && roundedKm > 0) {
                  lastSpokenKmRef.current = roundedKm;
                  if (!voiceMuted) {
                    const paceSecs = elapsedSeconds / currentKm;
                    const pM = Math.floor(paceSecs / 60);
                    const pS = Math.round(paceSecs % 60);
                    speakVoice(
                      `Kilometer ${roundedKm} complete. Average pace: ${pM} minutes ${pS} seconds per kilometer.`
                    );

                    if (targetGoalKm && roundedKm >= targetGoalKm) {
                      speakVoice(`Congratulations! You have reached your ${targetGoalKm} kilometer target goal!`);
                    }
                  }
                }

                if (currentKm > 0.05 && elapsedSeconds > 0) {
                  const paceSecs = elapsedSeconds / currentKm;
                  const pM = Math.floor(paceSecs / 60);
                  const pS = Math.round(paceSecs % 60);
                  setCurrentPace(`${pM}'${pS.toString().padStart(2, "0")}"`);
                }

                return total;
              });
            }
          }

          lastCoordRef.current = newCoord;
          setCoordinates((prev) => [...prev, newCoord]);
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [sessionStage, elapsedSeconds, voiceMuted, targetGoalKm]);

  // Start Pre-Run Warmup Flow
  const handleInitiateRunFlow = () => {
    setSessionStage("goal-select");
  };

  const handleConfirmGoalAndStartWarmup = () => {
    setSessionStage("warmup");
    setWarmupSecondsLeft(600);
    if (!voiceMuted) {
      speakVoice("Starting ten minute dynamic warmup. Walk briskly and stretch your legs.");
    }
  };

  const startCountdown = () => {
    setSessionStage("countdown");
    setCountdownNum(3);

    if (!voiceMuted) speakVoice("Three");

    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current === 2) {
        setCountdownNum(2);
        if (!voiceMuted) speakVoice("Two");
      } else if (current === 1) {
        setCountdownNum(1);
        if (!voiceMuted) speakVoice("One");
      } else if (current <= 0) {
        clearInterval(interval);
        if (!voiceMuted) speakVoice("Start Running!");
        setSessionStage("running");
      }
    }, 1000);
  };

  const handleSkipWarmup = () => {
    clearInterval(warmupTimerRef.current);
    startCountdown();
  };

  const handleFinishAndSaveRun = async () => {
    const km = Math.round((distanceMeters / 1000) * 100) / 100;
    const calories = Math.round(km * 65);
    const maxSpeed = coordinates.reduce((max, c) => Math.max(max, c.speed), 0);

    let walkCount = 0;
    let jogCount = 0;
    let sprintCount = 0;

    coordinates.forEach((c) => {
      if (c.speed < 6) walkCount++;
      else if (c.speed < 12) jogCount++;
      else sprintCount++;
    });

    const totalPts = Math.max(coordinates.length, 1);
    const intensity = {
      walkingPct: Math.round((walkCount / totalPts) * 100),
      joggingPct: Math.round((jogCount / totalPts) * 100),
      sprintingPct: Math.round((sprintCount / totalPts) * 100),
    };

    const summary: RunSummary = {
      id: Date.now().toString(),
      distanceKm: km,
      durationSeconds: elapsedSeconds,
      avgPace: currentPace === "0'00\"" ? "5'30\"" : currentPace,
      maxSpeedKmh: Math.round(maxSpeed * 10) / 10,
      calories,
      steps: stepsCount,
      date: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      goalKm: targetGoalKm,
      intensityBreakdown: intensity,
    };

    const updatedHistory = [summary, ...historyRuns];
    setHistoryRuns(updatedHistory);
    localStorage.setItem("nutrifit_running_history", JSON.stringify(updatedHistory));

    if (user && km > 0.05) {
      await supabase.from("workout_sessions").insert({
        user_id: user.id,
        workout_id: "outdoor-running-session",
        started_at: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
        completed_at: new Date().toISOString(),
      } as any);

      try {
        await (supabase.rpc as any)("increment_profile_steps", {
          step_increment: stepsCount,
          log_date: new Date().toISOString().slice(0, 10),
        });
      } catch (e) {}
    }

    if (!voiceMuted) {
      speakVoice(`Run completed. You ran ${km} kilometers in ${Math.floor(elapsedSeconds / 60)} minutes. Great work!`);
    }

    setCompletedSummary(summary);
    handleResetAll();
  };

  const handleResetAll = () => {
    setSessionStage("idle");
    setElapsedSeconds(0);
    setDistanceMeters(0);
    setStepsCount(0);
    setCurrentSpeedKmh(0);
    setCurrentPace("0'00\"");
    setCoordinates([]);
    lastCoordRef.current = null;
    lastSpokenKmRef.current = 0;
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
  };

  const handleSaveDailyReminder = async () => {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setReminderEnabled(true);
      localStorage.setItem("nutrifit_run_reminder_enabled", "true");
      localStorage.setItem("nutrifit_run_reminder_time", reminderTime);
      new Notification("🏃 Running Reminder Active!", {
        body: `We will remind you daily at ${reminderTime} to get your miles in!`,
      });
      setShowReminderModal(false);
    }
  };

  const currentDistKm = (distanceMeters / 1000).toFixed(2);
  const goalProgressPct = targetGoalKm ? Math.min(100, Math.round(((distanceMeters / 1000) / targetGoalKm) * 100)) : 0;

  return (
    <div className="space-y-5 max-w-5xl mx-auto font-sans pb-16 w-full">
      {/* 1. FULL-SCREEN RUNNING / WARMUP EXPERIENCE (NIKE RUN CLUB / STRAVA STYLE) */}
      {(sessionStage === "warmup" || sessionStage === "countdown" || sessionStage === "running" || sessionStage === "paused") && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white animate-in fade-in">
          {/* TOP OVERLAY CONTROLS */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 z-30 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 font-mono truncate">
                {sessionStage === "warmup"
                  ? "WARM-UP PHASE"
                  : sessionStage === "countdown"
                  ? "GET READY"
                  : sessionStage === "paused"
                  ? "RUN PAUSED"
                  : "GPS TRACKING ACTIVE"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setVoiceMuted(!voiceMuted)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition cursor-pointer"
                title={voiceMuted ? "Unmute Voice Coach" : "Mute Voice Coach"}
              >
                {voiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="p-2.5 rounded-full bg-white/10 hover:bg-rose-500/30 text-white backdrop-blur-md transition cursor-pointer"
                title="Cancel Run"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* WARMUP STAGE VIEW */}
          {sessionStage === "warmup" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 max-w-md mx-auto z-20">
              <div className="relative flex h-44 w-44 sm:h-52 sm:w-52 items-center justify-center rounded-full bg-emerald-500/10 border-4 border-emerald-500 shadow-2xl shadow-emerald-500/20">
                <div className="space-y-1">
                  <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">
                    {formatTime(warmupSecondsLeft)}
                  </span>
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Warm-up Time
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 px-2">
                <h2 className="text-lg sm:text-xl font-extrabold">Dynamic Warm-up</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start with a brisk walk, gentle leg swings, and ankle rolls to prep your muscles for high performance.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSkipWarmup}
                className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-xl active:scale-95 transition"
              >
                <span>Skip Warm-up &amp; Run</span>
                <SkipForward className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}

          {/* COUNTDOWN 3-2-1 VIEW */}
          {sessionStage === "countdown" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center z-20">
              <div className="text-8xl sm:text-9xl font-black text-emerald-400 font-mono animate-bounce">
                {countdownNum}
              </div>
              <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-400 mt-4">
                Get Ready...
              </p>
            </div>
          )}

          {/* ACTIVE RUNNING ZOOMED MAP & HUD VIEW */}
          {(sessionStage === "running" || sessionStage === "paused") && (
            <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
              {/* ZOOMED-IN TRAVERSED MAP */}
              <div className="absolute inset-0 w-full h-full z-0 opacity-85">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>

              {/* TARGET GOAL PROGRESS PILL */}
              {targetGoalKm && (
                <div className="relative z-20 self-center mt-2 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/10 px-3.5 py-1.5 flex items-center gap-2.5 shadow-xl">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-300">
                    <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Goal: {targetGoalKm} km</span>
                  </div>
                  <div className="w-16 sm:w-20 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${goalProgressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400">{goalProgressPct}%</span>
                </div>
              )}

              {/* FLOATING METRICS HUD */}
              <div className="relative z-20 mt-auto p-4 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-8 space-y-4 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
                {/* Distance Metric */}
                <div className="text-center space-y-0">
                  <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    Distance (KM)
                  </span>
                  <div className="text-6xl sm:text-8xl font-black tracking-tight text-white font-mono drop-shadow-md">
                    {currentDistKm}
                  </div>
                </div>

                {/* 4-Metric Strava Strip */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-w-lg mx-auto bg-white/5 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Time</span>
                    <span className="text-sm sm:text-lg font-black text-white font-mono">{formatTime(elapsedSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Pace</span>
                    <span className="text-sm sm:text-lg font-black text-emerald-400 font-mono">{currentPace}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Speed</span>
                    <span className="text-sm sm:text-lg font-black text-sky-400 font-mono">{currentSpeedKmh}</span>
                  </div>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Calories</span>
                    <span className="text-sm sm:text-lg font-black text-orange-400 font-mono">{Math.round((distanceMeters / 1000) * 65)}</span>
                  </div>
                </div>

                {/* Main NRC Button Controls */}
                <div className="flex items-center justify-center gap-3 pt-1 max-w-xs mx-auto">
                  {sessionStage === "running" ? (
                    <button
                      type="button"
                      onClick={() => setSessionStage("paused")}
                      className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 py-3.5 text-sm sm:text-base font-extrabold text-slate-950 shadow-2xl shadow-amber-500/30 active:scale-95 transition"
                    >
                      <Pause className="h-5 w-5 fill-current shrink-0" />
                      <span>PAUSE RUN</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSessionStage("running")}
                        className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-xl active:scale-95 transition"
                      >
                        <Play className="h-4 w-4 fill-current shrink-0" />
                        <span>RESUME</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFinishAndSaveRun}
                        className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-xl active:scale-95 transition"
                      >
                        <Square className="h-4 w-4 fill-current shrink-0" />
                        <span>FINISH</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. REGULAR IN-APP RUNNING DASHBOARD (CLEAN & NON-SCATTERED RESPONSIVE TOP) */}
      <div className="space-y-4">
        {/* TOP TITLE SECTION */}
        <div className="flex flex-col gap-1 pb-1 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Outdoor Running
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-3 w-3 shrink-0" /> Nike &amp; Strava Club
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowReminderModal(true)}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-bold transition shadow-xs shrink-0 ${
                reminderEnabled
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bell className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-[11px] sm:text-xs">
                {reminderEnabled ? "Reminder Set" : "Remind Me"}
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Live audio coach split updates, personal records, and GPS route mapping.
          </p>
        </div>

        {/* RESPONSIVE FULL-WIDTH TAB SWITCHER */}
        <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border w-full sm:w-fit gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("hub")}
            className={`flex-1 sm:flex-initial cursor-pointer px-4 py-2 rounded-xl text-xs font-extrabold transition text-center ${
              activeTab === "hub"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Run Hub
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 sm:flex-initial cursor-pointer px-4 py-2 rounded-xl text-xs font-extrabold transition text-center ${
              activeTab === "history"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            History ({historyRuns.length})
          </button>
        </div>
      </div>

      {activeTab === "hub" ? (
        <div className="space-y-6">
          {/* MAIN START RUN ACTION HERO (RESPONSIVE) */}
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-card to-card p-5 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-lg">
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider inline-block">
                  GPS Workout Coach
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight leading-snug">
                  Ready to crush today's miles?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Includes 10-minute dynamic warm-up, interactive voice coach split updates, and personal records tracking.
                </p>
              </div>

              <button
                type="button"
                onClick={handleInitiateRunFlow}
                className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 py-3.5 px-6 sm:py-4 sm:px-8 text-xs sm:text-sm font-extrabold text-white shadow-xl shadow-emerald-500/25 transition shrink-0"
              >
                <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current shrink-0" />
                <span>START WORKOUT</span>
              </button>
            </div>
          </div>

          {/* PERSONAL BESTS & ALL-TIME TROPHIES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
              <h3 className="text-sm sm:text-base font-extrabold text-foreground">Personal Bests &amp; Records</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-3xl border border-border bg-card p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Longest Run</span>
                <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
                  {personalBests.longestDistanceKm} <span className="text-xs text-muted-foreground font-sans font-bold">km</span>
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Best Avg Pace</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {personalBests.fastestPace}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fastest 5K</span>
                <p className="text-xl sm:text-2xl font-black text-sky-500 font-mono">
                  {personalBests.best5kTime}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">All-Time Miles</span>
                <p className="text-xl sm:text-2xl font-black text-orange-500 font-mono">
                  {personalBests.totalDistanceKm} <span className="text-xs text-muted-foreground font-sans font-bold">km</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="space-y-4">
          {historyRuns.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-10 text-center text-xs text-muted-foreground space-y-2">
              <Footprints className="h-8 w-8 mx-auto text-emerald-500 opacity-50 shrink-0" />
              <p className="font-bold text-sm text-foreground">No completed runs recorded yet</p>
              <p>Start a workout to track your pace, kilometers, and route history!</p>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {historyRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {run.date}
                      </span>
                      <span className="text-xs font-extrabold text-orange-500 font-mono">
                        {run.calories} kcal
                      </span>
                    </div>

                    <div>
                      <p className="text-2xl sm:text-3xl font-black text-foreground font-mono">
                        {run.distanceKm} <span className="text-xs font-bold text-muted-foreground">km</span>
                      </p>
                      {run.goalKm && (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          Goal: {run.goalKm} km ({Math.min(100, Math.round((run.distanceKm / run.goalKm) * 100))}% reached)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 border-y border-border/60 py-2.5 text-center text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Time</span>
                        <span className="font-bold text-foreground font-mono">{formatTime(run.durationSeconds)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Pace</span>
                        <span className="font-bold text-foreground font-mono">{run.avgPace}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Steps</span>
                        <span className="font-bold text-foreground font-mono">{run.steps.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TARGET GOAL SELECTION POPUP MODAL */}
      {sessionStage === "goal-select" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">Select Run Target</h3>
              </div>
              <button
                type="button"
                onClick={() => setSessionStage("idle")}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose your target distance. The audio coach will notify you of kilometer splits and cheer you when you reach your goal!
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "3 KM", value: 3 },
                { label: "5 KM", value: 5 },
                { label: "10 KM", value: 10 },
                { label: "Free Run", value: null },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setTargetGoalKm(opt.value)}
                  className={`cursor-pointer rounded-2xl py-3 px-2 text-xs font-black transition border text-center ${
                    targetGoalKm === opt.value
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-md"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleConfirmGoalAndStartWarmup}
              className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition mt-2"
            >
              <span>Begin Warm-up Session</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* DAILY REMINDER MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">Daily Run Reminder</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose your preferred workout time. We will send an encouraging notification directly to your device.
            </p>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Reminder Time</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full rounded-2xl border border-input bg-background p-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveDailyReminder}
              className="w-full cursor-pointer rounded-2xl bg-emerald-500 py-3 text-xs font-extrabold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition"
            >
              Save Reminder Schedule
            </button>
          </div>
        </div>
      )}

      {/* SUMMARY MODAL AFTER RUN */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">Workout Summary</h3>
              </div>
              <button
                type="button"
                onClick={() => setCompletedSummary(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <div className="text-center space-y-0.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Distance</span>
              <p className="text-4xl sm:text-5xl font-black text-foreground font-mono">
                {completedSummary.distanceKm} <span className="text-base">km</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Duration</span>
                <span className="text-base font-extrabold text-foreground font-mono">{formatTime(completedSummary.durationSeconds)}</span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Avg Pace</span>
                <span className="text-base font-extrabold text-emerald-500 font-mono">{completedSummary.avgPace} /km</span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Calories</span>
                <span className="text-base font-extrabold text-orange-500 font-mono">{completedSummary.calories} kcal</span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Steps</span>
                <span className="text-base font-extrabold text-sky-500 font-mono">{completedSummary.steps.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCompletedSummary(null);
                setActiveTab("history");
              }}
              className="w-full cursor-pointer rounded-2xl bg-emerald-500 py-3 text-xs font-extrabold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition"
            >
              View In Run History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunningTrackerPage;