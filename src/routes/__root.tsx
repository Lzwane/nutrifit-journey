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

  useEffect(() => {
    // 1. Check initial session when app opens
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is logged in -> redirect to dashboard if on landing or auth
        if (pathname === "/" || pathname === "/auth") {
          navigate({ to: "/app" });
        }
      } else {
        // User is NOT logged in -> redirect to auth if trying to access protected pages
        if (pathname === "/" || pathname.startsWith("/app")) {
          navigate({ to: "/auth" });
        }
      }
      setCheckingAuth(false);
    });

    // 2. Listen for auth changes (sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/app" });
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