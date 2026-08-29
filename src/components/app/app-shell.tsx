import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Footprints,
  ShoppingBag,
  Dumbbell,
  ChefHat,
  Sparkles,
  Users,
  User,
  Shield,
  UtensilsCrossed,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/hooks/use-subscription";
import { NutriFitLogo } from "@/components/app/logo";
import { supabase } from "@/integrations/supabase/client";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, isAdmin } = useAuth();
  const sub = useSubscription();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const navItems = [
    {
      to: "/app",
      label: "Home",
      icon: Home,
      exact: true,
    },
    {
      to: "/app/running",
      label: "Running",
      icon: Footprints,
      exact: false,
    },
    {
      to: "/app/store",
      label: "Store",
      icon: ShoppingBag,
      exact: false,
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
      label: "NutriFit Guide",
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
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20">
      {/* 1. DESKTOP / TABLET FIXED LEFT SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/70 backdrop-blur-md flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted p-1.5 shadow-inner border border-border">
              <NutriFitLogo className="h-full w-full object-contain shrink-0" />
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
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-extrabold transition cursor-pointer ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-sm border border-emerald-600/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : ""}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.isPro && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                      isActive ? "bg-white text-emerald-600" : "bg-amber-500/20 text-amber-500"
                    }`}>
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
                <Shield className="h-4 w-4 shrink-0" />
                <span>Admin Portal</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User Profile Card */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
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

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 w-full pt-6 md:pt-8 pb-32 md:pb-10 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto min-h-0">
        {children}
      </main>

      {/* 3. ELEVATED MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] pt-1.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div 
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain snap-x snap-mandatory h-14 px-2.5"
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
                className={`relative flex flex-col items-center justify-center min-w-[68px] h-full py-1 px-1 transition-all duration-200 cursor-pointer shrink-0 snap-center rounded-2xl ${
                  isActive
                    ? "text-emerald-500 font-extrabold bg-emerald-500/10"
                    : "text-muted-foreground/80 hover:text-foreground font-semibold active:scale-95"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-emerald-500 rounded-full shadow-xs" />
                )}

                <div className="relative flex items-center justify-center shrink-0">
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                      isActive ? "scale-110 text-emerald-500 drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]" : "text-muted-foreground"
                    }`}
                  />
                </div>

                <span className={`text-[10px] tracking-tight mt-1 leading-none font-bold ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleSignOut}
            className="relative flex flex-col items-center justify-center min-w-[65px] h-full py-1 px-1 transition-all cursor-pointer shrink-0 snap-center rounded-2xl text-rose-500 hover:bg-rose-500/10 active:scale-95"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <LogOut className="h-5 w-5 shrink-0" />
            </div>
            <span className="text-[10px] tracking-tight mt-1 leading-none font-bold">
              Sign Out
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default AppShell;