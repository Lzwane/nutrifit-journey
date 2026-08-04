import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const ADMIN_EMAIL = "admin@nutrifit.co.za";

function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Verifying admin session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const userEmail = user.email?.toLowerCase().trim();
  const isEmailAdmin = userEmail === ADMIN_EMAIL.toLowerCase().trim();
  const isRoleAdmin = user.app_metadata?.role === "admin";

  const isAdmin = isEmailAdmin || isRoleAdmin;

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <div className="mb-4 rounded-full bg-destructive/10 p-4 text-destructive border border-destructive/20">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="font-display text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          The email <span className="font-mono text-amber-500">{user.email}</span> does not have administrative access.
        </p>
        <a
          href="/app"
          className="mt-6 rounded-xl bg-secondary px-5 py-2.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
        >
          Return to App
        </a>
      </div>
    );
  }

  return <Outlet />;
}

export default AdminLayout;