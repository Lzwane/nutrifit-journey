import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app/app-shell";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const ADMIN_EMAILS = [
  "officialnutrifit01@gmail.com",
  "admin@nutrifit.co.za",
  "admin@nutrifit-app.co.za",
];

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
      return;
    }

    if (!loading && user) {
      const userEmail = (user.email || "").toLowerCase().trim();
      const isEmailAdmin = ADMIN_EMAILS.includes(userEmail);
      const isRoleAdmin = user.app_metadata?.role === "admin";

      if (isEmailAdmin || isRoleAdmin) {
        navigate({ to: "/admin" });
      }
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
  const userEmail = (user.email || "").toLowerCase().trim();
  const isEmailAdmin = ADMIN_EMAILS.includes(userEmail);
  const isRoleAdmin = user.app_metadata?.role === "admin";
  if (isEmailAdmin || isRoleAdmin) {
    return null;
  }

  return (
    <AppShell>
      {/* Container with ample bottom clearance (pb-28) so the elevated mobile bottom navigation never obscures page content */}
      <div className="w-full max-w-7xl mx-auto pb-28 md:pb-8 px-3 sm:px-6">
        <Outlet />
      </div>
    </AppShell>
  );
}

export default AppLayout;