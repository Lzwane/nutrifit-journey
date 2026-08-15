import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Smartphone, Sparkles, Check } from "lucide-react";
import { NutriFitLogo } from "@/components/app/logo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (already installed & opened as app)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user already dismissed the prompt in this session
    const hasDismissed = sessionStorage.getItem("nutrifit_install_dismissed");

    // 3. Detect iOS device (iPhone/iPad/iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice && !hasDismissed) {
      // Delay popup slightly for a smooth entrance
      const timer = setTimeout(() => setShowModal(true), 1200);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chrome / Desktop PWA prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (!hasDismissed) {
        setTimeout(() => setShowModal(true), 1200);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowModal(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    sessionStorage.setItem("nutrifit_install_dismissed", "true");
  };

  // If already installed or popup is closed, render nothing
  if (isInstalled || !showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 shadow-2xl space-y-5 text-center">
        
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 p-1.5 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* BIG APP ICON & BADGE */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-muted p-2 shadow-inner border border-border">
          <NutriFitLogo className="h-full w-full object-contain" />
          <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-4 w-4" />
          </span>
        </div>

        {/* TITLE & DESCRIPTION */}
        <div className="space-y-1.5">
          <h2 className="font-display text-xl font-extrabold text-foreground tracking-tight">
            Install NutriFit App
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Install the app on your home screen for instant fullscreen access, faster workouts, and seamless food tracking.
          </p>
        </div>

        {/* APP ADVANTAGES LIST */}
        <div className="rounded-2xl bg-muted/40 border border-border p-3 text-left text-xs space-y-1.5 text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Fullscreen native app experience
          </p>
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> No browser address bars or tabs
          </p>
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Works faster with offline support
          </p>
        </div>

        {/* CONDITIONAL INSTALL ACTION (ANDROID/CHROME vs IOS/SAFARI) */}
        {isIOS ? (
          /* iOS STEP-BY-STEP INSTALL GUIDE */
          <div className="space-y-3 pt-1">
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3.5 text-left text-xs space-y-2 text-foreground font-medium">
              <p className="flex items-center gap-2 font-bold text-primary">
                <Smartphone className="h-4 w-4" /> How to install on iPhone / iPad:
              </p>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                <span>Tap the <strong className="text-primary inline-flex items-center gap-1">Share button <Share className="h-3.5 w-3.5 inline" /></strong> in Safari.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
                <span>Scroll down &amp; select <strong className="text-primary inline-flex items-center gap-1">"Add to Home Screen" <PlusSquare className="h-3.5 w-3.5 inline" /></strong>.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full cursor-pointer rounded-2xl border border-border bg-card py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted transition"
            >
              Got it, I'll do that
            </button>
          </div>
        ) : (
          /* ANDROID / CHROME 1-CLICK NATIVE INSTALL BUTTON */
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition"
            >
              <Download className="h-4 w-4" /> Install App to Home Screen
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full cursor-pointer py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Maybe Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}