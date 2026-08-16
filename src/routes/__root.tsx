import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import nutrifitLogo from "@/assets/Nutrifit logo.jpeg";
import { FullAppInstallGate } from "@/components/full-app-install-gate";

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
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { title: "NutriFit — Your Health is Your Best Partner" },
      { name: "description", content: "NutriFit is your all-in-one health & fitness companion." },
      { name: "theme-color", content: "#10b981" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "NutriFit" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
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

  // Register Service Worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("PWA Service Worker registered"))
        .catch((err) => console.error("Service worker registration error:", err));
    }
  }, []);

  // Theme Sync on Client
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

  // Route Authentication Guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (pathname === "/" || pathname === "/auth") {
          navigate({ to: "/app" });
        }
      } else {
        if (pathname === "/" || pathname.startsWith("/app") || pathname === "/onboarding") {
          navigate({ to: "/auth" });
        }
      }
      setCheckingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const currentPath = window.location.pathname;
        if (currentPath === "/auth" || currentPath === "/") {
          navigate({ to: "/app" });
        }
      } else if (event === "SIGNED_OUT") {
        navigate({ to: "/auth" });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, pathname]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <FullAppInstallGate>
        <Outlet />
      </FullAppInstallGate>
    </QueryClientProvider>
  );
}

export default RootComponent;