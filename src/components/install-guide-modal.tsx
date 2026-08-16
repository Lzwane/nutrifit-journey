import { useEffect, useState } from "react";
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  Laptop,
  Smartphone,
  Tablet,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Menu,
  X,
  CheckCircle2,
} from "lucide-react";
import nutrifitLogo from "@/assets/Nutrifit logo.jpeg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type DeviceCategory = "chrome" | "ios" | "samsung_android";

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstallGuideModal({ isOpen, onClose }: InstallGuideModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [activeDevice, setActiveDevice] = useState<DeviceCategory>("chrome");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod|macintosh/.test(ua) && !ua.includes("chrome");
    const isSamsung = ua.includes("samsungbrowser");

    if (isApple) {
      setActiveDevice("ios");
    } else if (isSamsung) {
      setActiveDevice("samsung_android");
    } else {
      setActiveDevice("chrome");
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setDownloading(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          onClose();
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      } finally {
        setDownloading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 text-white p-5 sm:p-8 overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR */}
      <div className="w-full max-w-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <img
            src={nutrifitLogo}
            alt="NutriFit Logo"
            className="h-8 w-8 rounded-xl object-cover border border-emerald-500/30 shadow-xs"
          />
          <span className="font-display font-extrabold text-sm tracking-tight text-white">
            NutriFit Official
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
            Native Web App
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CENTER APP HERO */}
      <div className="w-full max-w-md my-auto text-center space-y-4 z-10 py-4">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 border-2 border-emerald-500/30 p-1.5 shadow-2xl">
          <img
            src={nutrifitLogo}
            alt="NutriFit App"
            className="h-full w-full rounded-2xl object-cover shadow-inner"
          />
          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="space-y-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
            Install NutriFit App
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Follow the quick steps below for your device to install the app and start using NutriFit.
          </p>
        </div>

        {/* DEVICE SELECTOR TABS */}
        <div className="flex rounded-2xl bg-slate-900 border border-slate-800 p-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveDevice("chrome")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              activeDevice === "chrome"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Chrome / PC
          </button>
          <button
            type="button"
            onClick={() => setActiveDevice("ios")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              activeDevice === "ios"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            iPhone / iPad
          </button>
          <button
            type="button"
            onClick={() => setActiveDevice("samsung_android")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              activeDevice === "samsung_android"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Android
          </button>
        </div>

        {/* 1. GOOGLE CHROME STEPS */}
        {activeDevice === "chrome" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4 text-left text-xs space-y-3 shadow-lg">
            <p className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Laptop className="h-4 w-4 shrink-0" /> Google Chrome (Laptops, Tablets &amp; Phones)
            </p>

            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  1
                </span>
                <span className="leading-snug">
                  Click the <strong className="text-white inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Three Dots <MoreVertical className="h-3 w-3 inline text-emerald-400" /></strong> in the top right corner of Chrome.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  2
                </span>
                <span className="leading-snug">
                  Select <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Cast, save, and share</strong> (or <em>Save and share</em>).
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  3
                </span>
                <span className="leading-snug">
                  Click <strong className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 inline-flex items-center gap-1">Install page as app... <Download className="h-3 w-3 inline" /></strong> (or <em>Install NutriFit</em>).
                </span>
              </div>
            </div>

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full mt-2 cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 py-2.5 text-xs font-extrabold text-white shadow-md transition uppercase tracking-wider"
              >
                <Download className={`h-4 w-4 ${downloading ? "animate-bounce" : ""}`} />
                <span>{downloading ? "Installing..." : "Click Here to Install Directly"}</span>
              </button>
            )}
          </div>
        )}

        {/* 2. APPLE IOS STEPS */}
        {activeDevice === "ios" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4 text-left text-xs space-y-3 shadow-lg">
            <p className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Smartphone className="h-4 w-4 shrink-0" /> Apple Safari (iPhone &amp; iPad)
            </p>

            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  1
                </span>
                <span className="leading-snug">
                  Tap the <strong className="text-white inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Share button <Share className="h-3 w-3 inline text-emerald-400" /></strong> at the bottom of Safari.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  2
                </span>
                <span className="leading-snug">
                  Scroll down and tap <strong className="text-white inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Add to Home Screen <PlusSquare className="h-3 w-3 inline text-emerald-400" /></strong>.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  3
                </span>
                <span className="leading-snug">
                  Tap <strong className="text-emerald-400">Add</strong> in the top-right corner to complete.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. ANDROID / SAMSUNG INTERNET */}
        {activeDevice === "samsung_android" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4 text-left text-xs space-y-3 shadow-lg">
            <p className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Tablet className="h-4 w-4 shrink-0" /> Samsung Internet &amp; Android Browsers
            </p>

            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  1
                </span>
                <span className="leading-snug">
                  Tap the <strong className="text-white inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Menu icon <Menu className="h-3 w-3 inline text-emerald-400" /></strong> (three lines or dots at bottom/top).
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  2
                </span>
                <span className="leading-snug">
                  Tap <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">+ Add page to</strong> (or <em>Install app</em>).
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  3
                </span>
                <span className="leading-snug">
                  Select <strong className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Home screen</strong>.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* WEB BROWSER BYPASS */}
        <button
          type="button"
          onClick={onClose}
          className="w-full cursor-pointer py-2 text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center gap-1"
        >
          <span>Continue in Web Browser</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* FOOTER */}
      <div className="w-full max-w-md text-center text-[10px] text-slate-500 z-10">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Full Standalone App • Zero Storage Overhead
        </p>
      </div>
    </div>
  );
}