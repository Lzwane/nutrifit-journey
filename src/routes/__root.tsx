import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import nutrifitLogo from "@/assets/Nutrifit logo.jpeg";
import { reportLovableError } from "../lib/lovable-error-reporting";

// Inline theme script injected directly into <head> to prevent light-mode flash
const themeScript = `
  (function() {
    try {
      var savedTheme = localStorage.getItem('nutrifit-theme');
      var isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NutriFit — Your Health is Your Best Partner" },
      { name: "description", content: "NutriFit is your all-in-one health & fitness companion." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: nutrifitLogo, type: "image/jpeg" },
      { rel: "shortcut icon", href: nutrifitLogo, type: "image/jpeg" },
      { rel: "apple-touch-icon", href: nutrifitLogo },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Instant Dark Mode Initialization */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sync theme on route changes / React hydration
  useEffect(() => {
    const savedTheme = localStorage.getItem("nutrifit-theme");
    const root = document.documentElement;

    if (
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    // 1. Check initial session when app opens
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect logged-in user to dashboard IF they are on landing or auth (allow /onboarding and /app)
        if (pathname === "/" || pathname === "/auth") {
          navigate({ to: "/app" });
        }
      } else {
        // Redirect unauthenticated user to /auth if trying to access protected routes
        if (pathname === "/" || pathname.startsWith("/app") || pathname === "/onboarding") {
          navigate({ to: "/auth" });
        }
      }
      setCheckingAuth(false);
    });

    // 2. Listen for auth state changes (sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Only auto-redirect to /app if NOT currently completing onboarding
        if (window.location.pathname !== "/onboarding") {
          navigate({ to: "/app" });
        }
      } else if (event === "SIGNED_OUT") {
        navigate({ to: "/auth" });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, pathname]);

  // Loading screen while checking existing session
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}