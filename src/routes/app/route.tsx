import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const ADMIN_EMAIL = "admin@nutrifit.co.za";

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Admin Guard: Keep admins in the admin dashboard
  const isEmailAdmin = user.email?.toLowerCase().trim() === ADMIN_EMAIL;
  const isRoleAdmin = user.app_metadata?.role === "admin";
  if (isEmailAdmin || isRoleAdmin) {
    navigate({ to: "/admin" });
    return null;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default AppLayout;