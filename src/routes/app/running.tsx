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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/running")({
  head: () => ({
    meta: [
      { title: "Outdoor Running & GPS Tracker — NutriFit" },
      { name: "description", content: "Live GPS tracking with speed intensity maps, splits, and workout logs." },
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
  intensityBreakdown: {
    walkingPct: number;
    joggingPct: number;
    sprintingPct: number;
  };
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

function getSpeedColor(speedKmh: number): string {
  if (speedKmh < 6) return "#3b82f6";
  if (speedKmh < 12) return "#10b981";
  return "#f97316";
}

function getIntensityLabel(speedKmh: number): { label: string; color: string; badge: string } {
  if (speedKmh < 6) {
    return {
      label: "Walking / Warmup",
      color: "text-blue-500",
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    };
  }
  if (speedKmh < 12) {
    return {
      label: "Moderate Jogging",
      color: "text-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    };
  }
  return {
    label: "High Intensity Sprint",
    color: "text-orange-500",
    badge: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
}

function RunningTrackerPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"tracker" | "history">("tracker");
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [stepsCount, setStepsCount] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [currentPace, setCurrentPace] = useState("0'00\"");
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [completedSummary, setCompletedSummary] = useState<RunSummary | null>(null);

  const [historyRuns, setHistoryRuns] = useState<RunSummary[]>(() => {
    const saved = localStorage.getItem("nutrifit_running_history");
    return saved ? JSON.parse(saved) : [];
  });

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const polylineLayerGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

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

  useEffect(() => {
    if (activeTab !== "tracker") return;

    const checkLeafletAndInit = () => {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (!leafletMapRef.current) {
        const defaultCenter = coordinates.length > 0
          ? [coordinates[coordinates.length - 1].lat, coordinates[coordinates.length - 1].lng]
          : [-25.62, 28.02];

        const mapInstance = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView(defaultCenter, 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapInstance);

        const group = L.layerGroup().addTo(mapInstance);
        polylineLayerGroupRef.current = group;
        leafletMapRef.current = mapInstance;
      }
    };

    const interval = setInterval(() => {
      if ((window as any).L) {
        checkLeafletAndInit();
        clearInterval(interval);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (!leafletMapRef.current || !(window as any).L || coordinates.length === 0) return;
    const L = (window as any).L;
    const map = leafletMapRef.current;
    const group = polylineLayerGroupRef.current;

    const latest = coordinates[coordinates.length - 1];

    if (!userMarkerRef.current) {
      const pulseIcon = L.divIcon({
        className: "custom-pulse-marker",
        html: `<div style="background-color:#10b981;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px #10b981;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      userMarkerRef.current = L.marker([latest.lat, latest.lng], { icon: pulseIcon }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([latest.lat, latest.lng]);
    }

    map.panTo([latest.lat, latest.lng], { animate: true, duration: 0.5 });

    if (coordinates.length >= 2 && group) {
      const p1 = coordinates[coordinates.length - 2];
      const p2 = coordinates[coordinates.length - 1];
      const speedColor = getSpeedColor(p2.speed);

      L.polyline(
        [
          [p1.lat, p1.lng],
          [p2.lat, p2.lng],
        ],
        {
          color: speedColor,
          weight: 6,
          opacity: 0.85,
          lineJoin: "round",
        }
      ).addTo(group);
    }
  }, [coordinates]);

  useEffect(() => {
    if (status === "running") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  useEffect(() => {
    if (status === "running") {
      if (!("geolocation" in navigator)) {
        alert("GPS is not supported on this browser/device.");
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

                const km = total / 1000;
                if (km > 0.05 && elapsedSeconds > 0) {
                  const paceSecs = elapsedSeconds / km;
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
  }, [status, elapsedSeconds]);

  const handleStartRun = () => {
    setStatus("running");
  };

  const handlePauseRun = () => {
    setStatus("paused");
  };

  const handleFinishRun = async () => {
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

    setCompletedSummary(summary);
    handleResetState();
  };

  const handleResetState = () => {
    setStatus("idle");
    setElapsedSeconds(0);
    setDistanceMeters(0);
    setStepsCount(0);
    setCurrentSpeedKmh(0);
    setCurrentPace("0'00\"");
    setCoordinates([]);
    lastCoordRef.current = null;
    if (polylineLayerGroupRef.current) polylineLayerGroupRef.current.clearLayers();
  };

  const distanceKm = (distanceMeters / 1000).toFixed(2);
  const intensityData = getIntensityLabel(currentSpeedKmh);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12 w-full">
      {/* NAVIGATION TABS */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Outdoor GPS Runner
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Live route tracking, speed heatmaps, cadence, and past run summaries.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-muted/60 p-1 border border-border shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("tracker")}
            className={`cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
              activeTab === "tracker"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4 shrink-0" /> Live Tracker
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
              activeTab === "history"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4 shrink-0" /> Previous Runs ({historyRuns.length})
          </button>
        </div>
      </div>

      {activeTab === "tracker" ? (
        <div className="space-y-5">
          {/* MAP CANVAS CONTAINER */}
          <div className="relative w-full h-72 sm:h-96 rounded-3xl border border-border overflow-hidden shadow-sm bg-muted/30">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* LIVE INTENSITY SPEED OVERLAY PILL */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-2xl bg-card/90 backdrop-blur-md px-3.5 py-2 border border-border shadow-md">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">
                  Speed Intensity
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-extrabold text-foreground font-mono">
                    {currentSpeedKmh} km/h
                  </span>
                  <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase border ${intensityData.badge}`}>
                    {intensityData.label}
                  </span>
                </div>
              </div>
            </div>

            {/* COLOR CODED SPEED LEGEND */}
            <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 rounded-xl bg-card/90 backdrop-blur-md px-3 py-1.5 border border-border text-[10px] font-bold text-muted-foreground shadow-sm">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> &lt;6 km/h (Walk)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> 6-12 km/h (Jog)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> &gt;12 km/h (Sprint)
              </span>
            </div>
          </div>

          {/* MAIN HUD METRICS */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center space-y-5">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Distance (Kilometers)
                </span>
                <div className="text-6xl sm:text-7xl font-black text-foreground font-mono mt-0.5">
                  {distanceKm}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                <div className="rounded-2xl bg-muted/30 border border-border/80 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground uppercase">
                    <Clock className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Time
                  </div>
                  <p className="text-xl font-extrabold text-foreground font-mono mt-1">
                    {formatTime(elapsedSeconds)}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/30 border border-border/80 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground uppercase">
                    <TrendingUp className="h-3.5 w-3.5 text-sky-500 shrink-0" /> Pace (/km)
                  </div>
                  <p className="text-xl font-extrabold text-foreground font-mono mt-1">
                    {currentPace}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/30 border border-border/80 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground uppercase">
                    <Footprints className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Steps
                  </div>
                  <p className="text-xl font-extrabold text-foreground font-mono mt-1">
                    {stepsCount.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/30 border border-border/80 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground uppercase">
                    <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" /> Calories
                  </div>
                  <p className="text-xl font-extrabold text-orange-500 font-mono mt-1">
                    {Math.round((distanceMeters / 1000) * 65)} kcal
                  </p>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="flex items-center justify-center gap-3 pt-2 w-full max-w-sm">
                {status === "idle" && (
                  <button
                    type="button"
                    onClick={handleStartRun}
                    className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 px-8 text-sm font-extrabold text-white shadow-lg hover:bg-emerald-600 active:scale-95 transition"
                  >
                    <Play className="h-4 w-4 fill-current shrink-0" /> Start Outdoor Run
                  </button>
                )}

                {status === "running" && (
                  <button
                    type="button"
                    onClick={handlePauseRun}
                    className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 py-3.5 px-8 text-sm font-extrabold text-white shadow-lg hover:bg-amber-600 active:scale-95 transition"
                  >
                    <Pause className="h-4 w-4 fill-current shrink-0" /> Pause Run
                  </button>
                )}

                {status === "paused" && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartRun}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 py-3.5 px-4 text-xs font-extrabold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition"
                    >
                      <Play className="h-4 w-4 fill-current shrink-0" /> Resume
                    </button>
                    <button
                      type="button"
                      onClick={handleFinishRun}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-full bg-rose-600 py-3.5 px-4 text-xs font-extrabold text-white shadow-md hover:bg-rose-700 active:scale-95 transition"
                    >
                      <Square className="h-4 w-4 fill-current shrink-0" /> Finish &amp; Save
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PREVIOUS RUNS TAB */
        <div className="space-y-4">
          {historyRuns.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
              <Footprints className="h-8 w-8 mx-auto text-emerald-500 opacity-50 shrink-0" />
              <p className="font-bold text-sm text-foreground">No completed runs recorded yet</p>
              <p>Start a live tracking session to automatically log your distance and pace metrics.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {historyRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-3xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {run.date}
                      </span>
                      <span className="text-xs font-extrabold text-orange-500 font-mono">
                        {run.calories} kcal
                      </span>
                    </div>

                    <div className="mt-3">
                      <p className="text-3xl font-black text-foreground font-mono">
                        {run.distanceKm} <span className="text-xs font-bold text-muted-foreground">km</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-y border-border/60 py-3 my-3 text-center text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Time</span>
                        <span className="font-bold text-foreground font-mono">{formatTime(run.durationSeconds)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Pace</span>
                        <span className="font-bold text-foreground font-mono">{run.avgPace}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Steps</span>
                        <span className="font-bold text-foreground font-mono">{run.steps.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* SPEED INTENSITY PERCENTAGE BAR */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Intensity Mix
                      </span>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                        <div style={{ width: `${run.intensityBreakdown.walkingPct}%` }} className="h-full bg-blue-500" title="Walking" />
                        <div style={{ width: `${run.intensityBreakdown.joggingPct}%` }} className="h-full bg-emerald-500" title="Jogging" />
                        <div style={{ width: `${run.intensityBreakdown.sprintingPct}%` }} className="h-full bg-orange-500" title="Sprinting" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED RUN SUMMARY POPUP MODAL */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <h3 className="text-base font-extrabold text-foreground">Workout Complete!</h3>
              </div>
              <button
                type="button"
                onClick={() => setCompletedSummary(null)}
                className="cursor-pointer p-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0"
              >
                <X className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <div className="text-center space-y-1 py-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Total Distance</span>
              <p className="text-5xl font-black text-foreground font-mono">
                {completedSummary.distanceKm} <span className="text-lg">km</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted/40 p-3.5 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Duration</span>
                <span className="text-lg font-extrabold text-foreground font-mono">
                  {formatTime(completedSummary.durationSeconds)}
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3.5 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Avg Pace</span>
                <span className="text-lg font-extrabold text-foreground font-mono">
                  {completedSummary.avgPace} /km
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3.5 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Calories Burned</span>
                <span className="text-lg font-extrabold text-orange-500 font-mono">
                  {completedSummary.calories} kcal
                </span>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3.5 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Steps</span>
                <span className="text-lg font-extrabold text-emerald-500 font-mono">
                  {completedSummary.steps.toLocaleString()}
                </span>
              </div>
            </div>

            {/* INTENSITY BAR */}
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
              <span className="text-xs font-bold text-foreground block">Speed Intensity Distribution</span>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                <div style={{ width: `${completedSummary.intensityBreakdown.walkingPct}%` }} className="h-full bg-blue-500" />
                <div style={{ width: `${completedSummary.intensityBreakdown.joggingPct}%` }} className="h-full bg-emerald-500" />
                <div style={{ width: `${completedSummary.intensityBreakdown.sprintingPct}%` }} className="h-full bg-orange-500" />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground pt-0.5">
                <span className="text-blue-500">{completedSummary.intensityBreakdown.walkingPct}% Walk</span>
                <span className="text-emerald-500">{completedSummary.intensityBreakdown.joggingPct}% Jog</span>
                <span className="text-orange-500">{completedSummary.intensityBreakdown.sprintingPct}% Sprint</span>
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
              View In History Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RunningTrackerPage;