import { Link, useLocation, useNavigate } from "@tanstack/react-router";
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

  const navItems = [
    { label: "Home", href: "/app", icon: Home, exact: true },
    { label: "Recipes", href: "/app/recipes", icon: ChefHat },
    { label: "Nutrition", href: "/app/nutrition", icon: Utensils },
    { label: "Workouts", href: "/app/workouts", icon: Dumbbell },
    { label: "NutriGuide AI", href: "/app/coach", icon: Bot },
    { label: "Community", href: "/app/community", icon: Users },
    { label: "Profile", href: "/app/profile", icon: User },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href || location.pathname === "/app/";
    return location.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
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
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 lg:px-4 lg:py-3 rounded-xl text-xs font-bold transition ${
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
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
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