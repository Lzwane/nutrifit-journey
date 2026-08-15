import { useEffect, useState } from "react";
import { Download, X, Smartphone, CheckCircle2 } from "lucide-react";
import nutrifitLogo from "@/assets/Nutrifit logo.jpeg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function BetwayInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running in standalone app mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user dismissed the banner during this session
    const hasDismissed = sessionStorage.getItem("nutrifit_banner_dismissed");
    if (hasDismissed) return;

    // 3. Listen for browser's native install readiness
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Fallback: Show banner on mobile devices
    const isMobile = /iphone|ipad|ipod|android/.test(navigator.userAgent.toLowerCase());
    if (isMobile && !hasDismissed) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // 1-Click Install Action
  const handleDownloadClick = async () => {
    if (deferredPrompt) {
      setDownloading(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDownloading(false);
      setDeferredPrompt(null);
    } else {
      // iOS / Safari direct share sheet trigger fallback
      alert("Tap the Share icon at the bottom of Safari and choose 'Add to Home Screen' to download the NutriFit app!");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("nutrifit_banner_dismissed", "true");
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 border-b border-emerald-500/30 p-3 shadow-xl backdrop-blur-md animate-in slide-in-from-top duration-300 font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* LOGO & APP INFO */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>

          <img
            src={nutrifitLogo}
            alt="NutriFit Logo"
            className="h-10 w-10 rounded-2xl object-cover border border-emerald-500/20 shadow-xs shrink-0"
          />

          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
              NutriFit App
            </h4>
            <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 truncate">
              <CheckCircle2 className="h-3 w-3 inline shrink-0" /> Faster • Data-Free • Standalone
            </p>
          </div>
        </div>

        {/* BETWAY-STYLE DOWNLOAD / INSTALL BUTTON */}
        <button
          type="button"
          onClick={handleDownloadClick}
          className="cursor-pointer flex items-center gap-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg transition shrink-0 uppercase tracking-wider"
        >
          <Download className={`h-4 w-4 ${downloading ? "animate-bounce" : ""}`} />
          <span>{downloading ? "Downloading..." : "Download App"}</span>
        </button>
      </div>
    </div>
  );
}