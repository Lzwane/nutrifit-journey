import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Home, 
  Utensils, 
  Dumbbell, 
  Users, 
  Bot, 
  User,
  ChefHat,
  LogOut
} from "lucide-react";
import { NutriFitLogo } from "@/components/app/logo";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // State to hold dynamically remembered last visited URLs per section
  const [savedPaths, setSavedPaths] = useState<{ [key: string]: string }>({});

  // 1. On route change, record the exact current sub-path for the active section
  useEffect(() => {
    const path = location.pathname;

    const sections = ["recipes", "nutrition", "workouts", "coach", "community", "profile"];
    for (const section of sections) {
      if (path.startsWith(`/app/${section}`)) {
        sessionStorage.setItem(`nutrifit_last_path_${section}`, path);
        setSavedPaths((prev) => ({ ...prev, [section]: path }));
        break;
      }
    }
  }, [location.pathname]);

  // Helper to retrieve the latest remembered path or fallback to base
  const getSectionPath = (section: string, defaultPath: string) => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`nutrifit_last_path_${section}`);
      if (stored) return stored;
    }
    return savedPaths[section] || defaultPath;
  };

  const navItems = [
    { label: "Home", href: "/app", icon: Home, exact: true },
    { 
      label: "Recipes", 
      href: getSectionPath("recipes", "/app/recipes"), 
      icon: ChefHat,
      section: "recipes"
    },
    { 
      label: "Nutrition", 
      href: getSectionPath("nutrition", "/app/nutrition"), 
      icon: Utensils,
      section: "nutrition"
    },
    { 
      label: "Workouts", 
      href: getSectionPath("workouts", "/app/workouts"), 
      icon: Dumbbell,
      section: "workouts"
    },
    { 
      label: "NutriGuide AI", 
      href: getSectionPath("coach", "/app/coach"), 
      icon: Bot,
      section: "coach"
    },
    { 
      label: "Community", 
      href: getSectionPath("community", "/app/community"), 
      icon: Users,
      section: "community"
    },
    { 
      label: "Profile", 
      href: getSectionPath("profile", "/app/profile"), 
      icon: User,
      section: "profile"
    },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location.pathname === "/app" || location.pathname === "/app/";
    }
    if (item.section) {
      return location.pathname.startsWith(`/app/${item.section}`);
    }
    return location.pathname.startsWith(item.href);
  };

  const handleSignOut = async () => {
    // Clear navigation history memory on logout
    if (typeof window !== "undefined") {
      const sections = ["recipes", "nutrition", "workouts", "coach", "community", "profile"];
      sections.forEach((s) => sessionStorage.removeItem(`nutrifit_last_path_${s}`));
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* ================= DESKTOP & TABLET SIDEBAR ================= */}
      <aside className="hidden md:flex w-60 lg:w-64 border-r border-border bg-card p-4 lg:p-6 flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="space-y-6 lg:space-y-8">
          {/* LOGO */}
          <Link to="/app" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted p-1.5 shadow-inner transition group-hover:scale-105">
              <NutriFitLogo className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-extrabold tracking-tight">
                <span style={{ color: "var(--brand-green)" }}>Nutri</span>
                <span style={{ color: "var(--brand-orange)" }}>Fit</span>
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                Fitness &amp; Health
              </span>
            </div>
          </Link>

          {/* NAVIGATION LINKS */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 lg:px-4 lg:py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* USER BRIEF FOOTER & SIGN OUT */}
        {user && (
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user.email?.[0].toUpperCase() || "U"}
              </div>
              <div className="truncate text-xs">
                <p className="font-semibold truncate text-foreground">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>

            {/* DESKTOP SIGN OUT BUTTON */}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 md:pl-60 lg:pl-64 pb-20 md:pb-8 w-full min-h-screen flex flex-col">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 w-full flex-1 flex flex-col">
          {children}
        </div>
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION (SINGLE LINE) ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border px-1 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer min-w-0 ${
                active
                  ? "text-primary font-bold scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${active ? "text-primary" : ""}`} />
              <span className="text-[8px] sm:text-[9.5px] truncate max-w-full mt-0.5 leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* MOBILE SIGN OUT BUTTON */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex flex-1 flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer min-w-0 text-destructive hover:text-destructive/80"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-[8px] sm:text-[9.5px] truncate max-w-full mt-0.5 leading-tight">
            Sign Out
          </span>
        </button>
      </nav>
    </div>
  );
}