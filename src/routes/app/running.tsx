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
  Compass,
  Navigation2,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  LocateFixed,
  Gauge,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/running")({
  head: () => ({
    meta: [
      { title: "Outdoor GPS Running — NutriFit" },
      { name: "description", content: "High-precision outdoor GPS tracker with background tracking, auto-pause, directional compass, and live voice splits." },
    ],
  }),
  component: RunningTrackerPage,
});

interface Coordinate {
  lat: number;
  lng: number;
  speed: number;
  heading: number | null;
  accuracy: number;
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
  maxSpeedKmh: number;
  best5kTime: string;
  totalDistanceKm: number;
  totalRunsCount: number;
}

// Calculate geodesic distance between two points in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371008.8; // Mean Earth radius in meters
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

// Calculate real direction of travel heading (0° - 360°) between two coordinates
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (theta * 180 / Math.PI + 360) % 360;
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

function speedToPaceString(speedKmh: number): string {
  if (speedKmh < 1.8) return "--'--\"";
  const paceSecondsPerKm = 3600 / speedKmh;
  const m = Math.floor(paceSecondsPerKm / 60);
  const s = Math.round(paceSecondsPerKm % 60);
  if (m > 25) return "--'--\"";
  return `${m}'${s.toString().padStart(2, "0")}"`;
}

function speakVoice(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const natural = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Siri"))
    );
    if (natural) utterance.voice = natural;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}

function RunningTrackerPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"hub" | "history">("hub");

  // Running Flow States
  const [sessionStage, setSessionStage] = useState<
    "idle" | "goal-select" | "warmup" | "countdown" | "running" | "paused"
  >("idle");
  const [targetGoalKm, setTargetGoalKm] = useState<number | null>(5);
  const [countdownNum, setCountdownNum] = useState(3);
  const [warmupSecondsLeft, setWarmupSecondsLeft] = useState(600);

  // High Precision Metrics
  const [activeMovingSeconds, setActiveMovingSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [stepsCount, setStepsCount] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [currentPace, setCurrentPace] = useState("--'--\"");
  const [avgPace, setAvgPace] = useState("0'00\"");
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [movementBearing, setMovementBearing] = useState<number>(0);
  const [isOffline, setIsOffline] = useState(false);

  // Map View Mode (Focus on Map vs Expanded HUD)
  const [isMapFocused, setIsMapFocused] = useState(false);

  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [completedSummary, setCompletedSummary] = useState<RunSummary | null>(null);
  const [voiceMuted, setVoiceMuted] = useState(false);

  // Daily Run Reminders
  const [reminderTime, setReminderTime] = useState("06:00");
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    return localStorage.getItem("nutrifit_run_reminder_enabled") === "true";
  });
  const [showReminderModal, setShowReminderModal] = useState(false);

  // History & Bests
  const [historyRuns, setHistoryRuns] = useState<RunSummary[]>(() => {
    const saved = localStorage.getItem("nutrifit_running_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [personalBests, setPersonalBests] = useState<PersonalBests>({
    longestDistanceKm: 0,
    maxSpeedKmh: 0,
    best5kTime: "--:--",
    totalDistanceKm: 0,
    totalRunsCount: 0,
  });

  const watchIdRef = useRef<number | null>(null);
  const runTimerRef = useRef<any>(null);
  const warmupTimerRef = useRef<any>(null);
  const lastFilteredCoordRef = useRef<Coordinate | null>(null);
  const recentSpeedsRef = useRef<number[]>([]);
  const lastSpokenKmRef = useRef<number>(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const polylineLayerGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);
  const lastActiveTimestampRef = useRef<number>(Date.now());

  // Offline / Online Status Detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Screen Wake Lock (Keeps CPU & GPS active in pocket)
  useEffect(() => {
    const acquireWakeLock = async () => {
      if ("wakeLock" in navigator && sessionStage === "running") {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        } catch (_) {}
      }
    };

    if (sessionStage === "running") {
      acquireWakeLock();
    } else {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (_) {}
        wakeLockRef.current = null;
      }
    }

    return () => {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (_) {}
      }
    };
  }, [sessionStage]);

  // Page Visibility Recovery: Fixes time skew when switching back from another app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (sessionStage === "running" && !isAutoPaused) {
          const now = Date.now();
          const deltaSeconds = Math.round((now - lastActiveTimestampRef.current) / 1000);
          if (deltaSeconds > 1 && deltaSeconds < 3600) {
            setActiveMovingSeconds((prev) => prev + deltaSeconds);
          }
        }
      }
      lastActiveTimestampRef.current = Date.now();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sessionStage, isAutoPaused]);

  // Calculate Personal Bests from History
  useEffect(() => {
    if (historyRuns.length === 0) return;

    let longest = 0;
    let totalDist = 0;
    let maxOverallSpeed = 0;
    let best5k = 999999;

    historyRuns.forEach((r) => {
      totalDist += r.distanceKm;
      if (r.distanceKm > longest) longest = r.distanceKm;
      if (r.maxSpeedKmh > maxOverallSpeed) maxOverallSpeed = r.maxSpeedKmh;

      if (r.distanceKm >= 5 && r.durationSeconds < best5k) {
        best5k = r.durationSeconds;
      }
    });

    setPersonalBests({
      longestDistanceKm: Math.round(longest * 100) / 100,
      totalDistanceKm: Math.round(totalDist * 100) / 100,
      maxSpeedKmh: Math.round(maxOverallSpeed * 10) / 10,
      best5kTime: best5k < 999999 ? formatTime(best5k) : "--:--",
      totalRunsCount: historyRuns.length,
    });
  }, [historyRuns]);

  // Load Leaflet Styles & Scripts
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

  // Phone Orientation & Compass Heading
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const heading = (e as any).webkitCompassHeading ?? (e.alpha ? 360 - e.alpha : null);
      if (heading !== null && heading !== undefined) {
        setDeviceHeading(Math.round(heading));
      }
    };

    if (sessionStage === "running" || sessionStage === "paused") {
      if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, [sessionStage]);

  // Immediate Initial Location Lock & Map Setup
  useEffect(() => {
    if (sessionStage !== "running" && sessionStage !== "paused") return;

    const initMap = (initialCenter: [number, number]) => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        const mapInstance = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: true,
        }).setView(initialCenter, 18);

        // Standard OpenStreetMap Tiles (100% Free, Works through cached offline tiles)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapInstance);

        const group = L.layerGroup().addTo(mapInstance);
        polylineLayerGroupRef.current = group;
        leafletMapRef.current = mapInstance;
      }
    };

    // Grab true GPS coordinate immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const center: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          initMap(center);
        },
        () => {
          initMap([-25.746, 28.188]);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      initMap([-25.746, 28.188]);
    }
  }, [sessionStage]);

  // Live Location Marker, Direction Cone & Polyline Path Drawing
  useEffect(() => {
    if (!leafletMapRef.current || !(window as any).L || coordinates.length === 0) return;
    const L = (window as any).L;
    const map = leafletMapRef.current;
    const group = polylineLayerGroupRef.current;
    const latest = coordinates[coordinates.length - 1];

    const activeHeading = latest.heading ?? (movementBearing > 0 ? movementBearing : deviceHeading);

    const directionalIcon = L.divIcon({
      className: "custom-runner-compass",
      html: `
        <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
          <!-- Real direction of travel light beam -->
          <div style="position:absolute;top:0;width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:30px solid rgba(16,185,129,0.55);transform:translateY(-8px) rotate(${activeHeading}deg);transform-origin:bottom center;"></div>
          <!-- Pulse center pin -->
          <div style="background-color:#10b981;width:18px;height:18px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 14px #10b981;z-index:10;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([latest.lat, latest.lng], { icon: directionalIcon }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([latest.lat, latest.lng]);
      userMarkerRef.current.setIcon(directionalIcon);
    }

    map.panTo([latest.lat, latest.lng], { animate: true, duration: 0.5 });

    // Draw lines between recorded points
    if (coordinates.length >= 2 && group) {
      const p1 = coordinates[coordinates.length - 2];
      const p2 = coordinates[coordinates.length - 1];
      const speedColor =
        p2.speed < 6.5 ? "#3b82f6" : p2.speed < 12.5 ? "#10b981" : "#f97316";

      L.polyline(
        [
          [p1.lat, p1.lng],
          [p2.lat, p2.lng],
        ],
        {
          color: speedColor,
          weight: 6,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }
      ).addTo(group);
    }
  }, [coordinates, deviceHeading, movementBearing]);

  // Zoom & Recenter Handlers
  const handleZoomIn = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (leafletMapRef.current && coordinates.length > 0) {
      const latest = coordinates[coordinates.length - 1];
      leafletMapRef.current.setView([latest.lat, latest.lng], 19, { animate: true });
    }
  };

  // Warmup Countdown
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
            speakVoice("Five minutes of warmup remaining. Prepare your pace.");
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(warmupTimerRef.current);
    }
    return () => clearInterval(warmupTimerRef.current);
  }, [sessionStage, voiceMuted]);

  // Moving Timer with Auto-Pause Lock
  useEffect(() => {
    if (sessionStage === "running" && !isAutoPaused) {
      lastActiveTimestampRef.current = Date.now();
      runTimerRef.current = setInterval(() => {
        setActiveMovingSeconds((prev) => prev + 1);
        lastActiveTimestampRef.current = Date.now();
      }, 1000);
    } else {
      clearInterval(runTimerRef.current);
    }
    return () => clearInterval(runTimerRef.current);
  }, [sessionStage, isAutoPaused]);

  // High Precision Real-Time GPS Engine (Zero-Drift Auto Pause & Movement Bearing)
  useEffect(() => {
    if (sessionStage === "running") {
      if (!("geolocation" in navigator)) {
        alert("GPS location tracking is not supported on this browser.");
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, accuracy, heading } = position.coords;

          // Reject inaccurate GPS bounces (> 25m)
          if (accuracy > 25) return;

          const rawSpeedKmh = speed !== null && speed >= 0 ? speed * 3.6 : 0;

          // ZERO-DRIFT AUTO-PAUSE: If runner stopped (speed < 1.8 km/h), completely freeze distance and pace
          if (rawSpeedKmh < 1.8) {
            setIsAutoPaused(true);
            setCurrentSpeedKmh(0);
            setCurrentPace("--'--\"");
            return;
          }

          setIsAutoPaused(false);
          setCurrentSpeedKmh(Math.round(rawSpeedKmh * 10) / 10);

          // Rolling 5-point smoothed pace window
          recentSpeedsRef.current.push(rawSpeedKmh);
          if (recentSpeedsRef.current.length > 5) recentSpeedsRef.current.shift();
          const smoothSpeed =
            recentSpeedsRef.current.reduce((a, b) => a + b, 0) /
            recentSpeedsRef.current.length;
          setCurrentPace(speedToPaceString(smoothSpeed));

          const newCoord: Coordinate = {
            lat: latitude,
            lng: longitude,
            speed: rawSpeedKmh,
            heading: heading !== null && !isNaN(heading) ? heading : null,
            accuracy,
            timestamp: position.timestamp,
          };

          if (lastFilteredCoordRef.current) {
            const deltaMeters = calculateDistance(
              lastFilteredCoordRef.current.lat,
              lastFilteredCoordRef.current.lng,
              newCoord.lat,
              newCoord.lng
            );

            const timeDeltaSec = (newCoord.timestamp - lastFilteredCoordRef.current.timestamp) / 1000;
            const computedSpeed = timeDeltaSec > 0 ? (deltaMeters / timeDeltaSec) * 3.6 : 0;

            // Strict anti-drift: Only count distance if displacement >= 1.0m and speed is under 45 km/h
            if (deltaMeters >= 1.0 && computedSpeed < 45) {
              const computedHeading = calculateBearing(
                lastFilteredCoordRef.current.lat,
                lastFilteredCoordRef.current.lng,
                newCoord.lat,
                newCoord.lng
              );
              setMovementBearing(Math.round(computedHeading));

              setDistanceMeters((prev) => {
                const totalM = prev + deltaMeters;
                setStepsCount(Math.round(totalM * 1.32));

                const currentKm = totalM / 1000;
                const roundedKm = Math.floor(currentKm);

                if (roundedKm > lastSpokenKmRef.current && roundedKm > 0) {
                  lastSpokenKmRef.current = roundedKm;
                  if (!voiceMuted) {
                    const avgSecsPerKm = activeMovingSeconds / currentKm;
                    const pM = Math.floor(avgSecsPerKm / 60);
                    const pS = Math.round(avgSecsPerKm % 60);
                    speakVoice(
                      `Kilometer ${roundedKm} complete. Average pace ${pM} minutes and ${pS} seconds per kilometer.`
                    );

                    if (targetGoalKm && roundedKm >= targetGoalKm) {
                      speakVoice(`Target reached! Fantastic job completing ${targetGoalKm} kilometers!`);
                    }
                  }
                }

                if (currentKm > 0.05 && activeMovingSeconds > 0) {
                  const avgPaceSecs = activeMovingSeconds / currentKm;
                  const pM = Math.floor(avgPaceSecs / 60);
                  const pS = Math.round(avgPaceSecs % 60);
                  setAvgPace(`${pM}'${pS.toString().padStart(2, "0")}"`);
                }

                return totalM;
              });

              lastFilteredCoordRef.current = newCoord;
              setCoordinates((prev) => [...prev, newCoord]);
            }
          } else {
            lastFilteredCoordRef.current = newCoord;
            setCoordinates([newCoord]);
          }
        },
        (err) => console.warn("GPS status:", err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
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
  }, [sessionStage, activeMovingSeconds, voiceMuted, targetGoalKm]);

  const handleInitiateRunFlow = () => {
    setSessionStage("goal-select");
  };

  const handleConfirmGoalAndStartWarmup = () => {
    setSessionStage("warmup");
    setWarmupSecondsLeft(600);
    if (!voiceMuted) {
      speakVoice("Starting ten minute dynamic warmup. Walk briskly and warm up your joints.");
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
        if (!voiceMuted) speakVoice("Workout started. Enjoy your run!");
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
    const calories = Math.round(km * 64);
    const maxSpeed = coordinates.reduce((max, c) => Math.max(max, c.speed), 0);

    let walkCount = 0;
    let jogCount = 0;
    let sprintCount = 0;

    coordinates.forEach((c) => {
      if (c.speed < 6.5) walkCount++;
      else if (c.speed < 12.5) jogCount++;
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
      durationSeconds: activeMovingSeconds,
      avgPace: avgPace === "0'00\"" ? "5'30\"" : avgPace,
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

    // Save to database when network is present
    if (user && km > 0.05) {
      try {
        await supabase.from("workout_sessions").insert({
          user_id: user.id,
          workout_id: "outdoor-running-session",
          started_at: new Date(Date.now() - activeMovingSeconds * 1000).toISOString(),
          completed_at: new Date().toISOString(),
        } as any);

        await (supabase.rpc as any)("increment_profile_steps", {
          step_increment: stepsCount,
          log_date: new Date().toISOString().slice(0, 10),
        });
      } catch (e) {
        console.warn("Run cached locally (offline). Will synchronize later.");
      }
    }

    if (!voiceMuted) {
      speakVoice(`Run completed. You ran ${km} kilometers in ${Math.floor(activeMovingSeconds / 60)} minutes.`);
    }

    setCompletedSummary(summary);
    handleResetAll();
  };

  const handleResetAll = () => {
    setSessionStage("idle");
    setActiveMovingSeconds(0);
    setDistanceMeters(0);
    setStepsCount(0);
    setCurrentSpeedKmh(0);
    setCurrentPace("--'--\"");
    setAvgPace("0'00\"");
    setIsAutoPaused(false);
    setIsMapFocused(false);
    setCoordinates([]);
    setMovementBearing(0);
    lastFilteredCoordRef.current = null;
    recentSpeedsRef.current = [];
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
      new Notification("🏃 Running Reminder Scheduled", {
        body: `NutriFit will remind you daily at ${reminderTime} for your run!`,
      });
      setShowReminderModal(false);
    }
  };

  const currentDistKm = (distanceMeters / 1000).toFixed(2);
  const goalProgressPct = targetGoalKm
    ? Math.min(100, Math.round(((distanceMeters / 1000) / targetGoalKm) * 100))
    : 0;

  return (
    <div className="space-y-5 max-w-5xl mx-auto font-sans pb-16 w-full">
      {/* 1. FULL-SCREEN RUNNING EXPERIENCE */}
      {(sessionStage === "warmup" ||
        sessionStage === "countdown" ||
        sessionStage === "running" ||
        sessionStage === "paused") && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white animate-in fade-in select-none">
          {/* TOP OVERLAY BAR */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 z-30 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isAutoPaused ? "bg-amber-400" : "bg-emerald-500 animate-ping"
                } shrink-0`}
              />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 font-mono truncate">
                {sessionStage === "warmup"
                  ? "WARM-UP PHASE"
                  : sessionStage === "countdown"
                  ? "GET READY"
                  : isAutoPaused
                  ? "AUTO-PAUSED (STOPPED)"
                  : sessionStage === "paused"
                  ? "WORKOUT PAUSED"
                  : "LIVE GPS TRACKING"}
              </span>

              {isOffline && (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold">
                  <WifiOff className="h-3 w-3" /> Offline Buffered
                </span>
              )}
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

          {/* WARMUP STAGE */}
          {sessionStage === "warmup" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5 max-w-md mx-auto z-20">
              <div className="relative flex h-48 w-48 sm:h-56 sm:w-56 items-center justify-center rounded-full bg-emerald-500/10 border-4 border-emerald-500 shadow-2xl shadow-emerald-500/20">
                <div className="space-y-1">
                  <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                    {formatTime(warmupSecondsLeft)}
                  </span>
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Warm-up Time
                  </p>
                </div>
              </div>

              <div className="space-y-1 px-2">
                <h2 className="text-xl font-extrabold">Dynamic Warm-up</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Brisk walking, high knees, and leg swings to activate muscles and prevent injury.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSkipWarmup}
                className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-xl active:scale-95 transition"
              >
                <span>Skip Warm-up &amp; Start Run</span>
                <SkipForward className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}

          {/* COUNTDOWN 3-2-1 */}
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

          {/* ACTIVE RUNNING MAP & HUD */}
          {(sessionStage === "running" || sessionStage === "paused") && (
            <div className="flex-1 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 w-full h-full z-0">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>

              {/* FLOATING ACTION TOOLBAR */}
              <div className="absolute right-4 top-16 z-30 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-3 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-white/20 text-white shadow-xl backdrop-blur-md transition active:scale-90 cursor-pointer"
                  title="Zoom In"
                >
                  <Plus className="h-4 w-4 text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-3 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-white/20 text-white shadow-xl backdrop-blur-md transition active:scale-90 cursor-pointer"
                  title="Zoom Out"
                >
                  <Minus className="h-4 w-4 text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={handleRecenter}
                  className="p-3 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-white/20 text-white shadow-xl backdrop-blur-md transition active:scale-90 cursor-pointer"
                  title="Recenter Location"
                >
                  <LocateFixed className="h-4 w-4 text-sky-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMapFocused(!isMapFocused)}
                  className={`p-3 rounded-2xl border shadow-xl backdrop-blur-md transition active:scale-90 cursor-pointer ${
                    isMapFocused
                      ? "bg-emerald-500 text-white border-emerald-400"
                      : "bg-slate-950/85 hover:bg-slate-900 border-white/20 text-white"
                  }`}
                  title={isMapFocused ? "Restore Dashboard" : "Focus on Map"}
                >
                  {isMapFocused ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>

              {/* TARGET GOAL PILL & LIVE HEADING */}
              <div className="relative z-20 self-center mt-2 flex items-center gap-2">
                {targetGoalKm && (
                  <div className="rounded-full bg-slate-950/85 backdrop-blur-md border border-white/10 px-3.5 py-1.5 flex items-center gap-2.5 shadow-xl">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-300">
                      <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>Target: {targetGoalKm} km</span>
                    </div>
                    <div className="w-16 sm:w-20 h-1.5 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${goalProgressPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400">
                      {goalProgressPct}%
                    </span>
                  </div>
                )}

                <div className="rounded-full bg-slate-950/85 backdrop-blur-md border border-white/10 px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-mono text-slate-300 shadow-xl">
                  <Compass className="h-3.5 w-3.5 text-sky-400" />
                  <span>{movementBearing > 0 ? movementBearing : deviceHeading}&deg;</span>
                </div>
              </div>

              {/* DYNAMIC METRICS HUD */}
              <div
                className={`relative z-20 mt-auto transition-all duration-300 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pb-[max(1.75rem,env(safe-area-inset-bottom))] ${
                  isMapFocused ? "p-3 pt-4" : "p-4 sm:p-6 pt-8 space-y-4"
                }`}
              >
                {/* Minimized Bar for Map Focus Mode */}
                {isMapFocused ? (
                  <div className="flex items-center justify-between max-w-md mx-auto bg-slate-950/90 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/20 shadow-2xl">
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-2xl font-black text-white">{currentDistKm}</span>
                      <span className="text-xs text-slate-400 font-sans">km</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono font-bold">
                      <span className="text-emerald-400">{currentPace}</span>
                      <span className="text-white">{formatTime(activeMovingSeconds)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {sessionStage === "running" ? (
                        <button
                          type="button"
                          onClick={() => setSessionStage("paused")}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSessionStage("running")}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Primary Distance Readout */}
                    <div className="text-center space-y-0">
                      <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        Kilometers
                      </span>
                      <div className="text-7xl sm:text-8xl font-black tracking-tight text-white font-mono drop-shadow-md">
                        {currentDistKm}
                      </div>
                    </div>

                    {/* 4-Metric Grid */}
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-w-lg mx-auto bg-white/5 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 text-center">
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Time</span>
                        <span className="text-sm sm:text-lg font-black text-white font-mono">
                          {formatTime(activeMovingSeconds)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Current Pace</span>
                        <span className="text-sm sm:text-lg font-black text-emerald-400 font-mono">
                          {currentPace}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Speed</span>
                        <span className="text-sm sm:text-lg font-black text-sky-400 font-mono">
                          {currentSpeedKmh} <span className="text-[9px] font-sans">km/h</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase block">Calories</span>
                        <span className="text-sm sm:text-lg font-black text-orange-400 font-mono">
                          {Math.round((distanceMeters / 1000) * 64)}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
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
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. IN-APP DASHBOARD */}
      <div className="space-y-4">
        {/* TITLE HEADER */}
        <div className="flex flex-col gap-1 pb-1 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Outdoor Running
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                <Navigation2 className="h-3 w-3 shrink-0" /> Dynamic Compass GPS
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
                {reminderEnabled ? "Reminder Set" : "Daily Reminder"}
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Zero-drift accurate distance tracker, background tracking, and kilometer split announcements.
          </p>
        </div>

        {/* TAB SWITCHER */}
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
          {/* HERO BANNER */}
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-card to-card p-5 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-lg">
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider inline-block">
                  High-Precision GPS Engine
                </span>
                <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight leading-snug">
                  Crush your next target miles
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Real-time pace calculation, intelligent auto-pause, dynamic hardware compass, and voice audio splits.
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

          {/* ALL-TIME RECORDS (Replaced Best Avg Pace with Max Speed) */}
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max Running Speed</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {personalBests.maxSpeedKmh} <span className="text-xs text-muted-foreground font-sans font-bold">km/h</span>
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
              <p>Start a workout to record accurate distance, real pace, and route history!</p>
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
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Avg Pace</span>
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

      {/* TARGET SELECTION MODAL */}
      {sessionStage === "goal-select" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">Select Target Distance</h3>
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
              Choose your distance target. The voice coach will alert you on split times and celebrate when your goal is completed.
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
              <span>Start Warm-up Session</span>
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
              Select your scheduled running hour. NutriFit will prompt you directly on your device.
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
              Save Schedule
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED WORKOUT SUMMARY */}
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
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Moving Time</span>
                <span className="text-base font-extrabold text-foreground font-mono">
                  {formatTime(completedSummary.durationSeconds)}
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Avg Pace</span>
                <span className="text-base font-extrabold text-emerald-500 font-mono">
                  {completedSummary.avgPace} /km
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Calories</span>
                <span className="text-base font-extrabold text-orange-500 font-mono">
                  {completedSummary.calories} kcal
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Steps</span>
                <span className="text-base font-extrabold text-sky-500 font-mono">
                  {completedSummary.steps.toLocaleString()}
                </span>
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