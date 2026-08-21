import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Dumbbell,
  ChefHat,
  Sparkles,
  Users,
  User,
  Shield,
  UtensilsCrossed,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";
import { NutriFitLogo } from "@/components/app/logo";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, isAdmin } = useAuth();
  const sub = useSubscription();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    {
      to: "/app",
      label: "Home",
      icon: Home,
      exact: true,
    },
    {
      to: "/app/nutrition",
      label: "Nutrition",
      icon: UtensilsCrossed,
      exact: false,
    },
    {
      to: "/app/workouts",
      label: "Workouts",
      icon: Dumbbell,
      exact: false,
    },
    {
      to: "/app/recipes",
      label: "Recipes",
      icon: ChefHat,
      exact: false,
    },
    {
      to: "/app/coach",
      label: "AI Coach",
      icon: Sparkles,
      exact: false,
      isPro: sub.isExpired,
    },
    {
      to: "/app/community",
      label: "Community",
      icon: Users,
      exact: false,
    },
    {
      to: "/app/profile",
      label: "Profile",
      icon: User,
      exact: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground font-sans antialiased selection:bg-primary/20">
      
      {/* 1. DESKTOP / TABLET FIXED LEFT SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/60 backdrop-blur-md flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto p-6">
        <div className="space-y-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted p-1.5 shadow-inner border border-border">
              <NutriFitLogo className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight block">
                <span className="text-emerald-500">Nutri</span>
                <span className="text-amber-500">Fit</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Health &amp; Wellness
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.to || pathname === "/app/"
                : pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>

                  {item.isPro && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-500">
                      PRO
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition mt-4"
              >
                <Shield className="h-4 w-4" />
                <span>Admin Portal</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User Card on Desktop Bottom */}
        <div className="pt-4 border-t border-border flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
            {user?.email?.[0].toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate">
              {user?.email?.split("@")[0]}
            </p>
            <p className="text-[10px] text-muted-foreground truncate font-mono">
              {isAdmin ? "Administrator" : sub.isPremium ? "Premium" : "Trial Member"}
            </p>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 w-full pt-6 md:pt-8 pb-32 md:pb-10 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
        {children}
      </main>

      {/* 3. ELEVATED, SWIPE-OPTIMIZED MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] pt-1.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div 
          className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain snap-x snap-mandatory h-14 px-3"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.to || pathname === "/app/"
              : pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center min-w-[72px] h-full py-1 px-1 transition-all cursor-pointer shrink-0 snap-center rounded-xl ${
                  isActive
                    ? "text-primary font-bold bg-primary/10"
                    : "text-muted-foreground/80 hover:text-foreground font-medium active:scale-95"
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
                )}

                {/* Standard Sized Icon */}
                <div className="relative flex items-center justify-center">
                  <Icon className={`h-5 w-5 transition-transform ${isActive ? "scale-105" : ""}`} />

                  {item.isPro && (
                    <span className="absolute -top-1 -right-2.5 flex h-3 px-1 items-center justify-center rounded-full bg-amber-500 text-[7px] font-extrabold text-white shadow-xs">
                      PRO
                    </span>
                  )}
                </div>

                {/* Text Label */}
                <span className="text-[10px] tracking-tight mt-1 leading-none font-semibold">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

export default AppShell;