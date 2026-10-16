import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../store/AuthContext";

/** Gatekeeps the app's real routes once Supabase auth is wired up. In demo mode (no Supabase
 * configured) this is a pass-through, so the existing role-switcher demo keeps working. */
export default function AuthGate() {
  const { isConfigured, loading, session, profile, ownerProfile } = useAuth();

  if (!isConfigured) return <Outlet />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-blue" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile && !ownerProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-sm text-center">
          <p className="font-semibold text-navy">Account not set up yet</p>
          <p className="text-sm text-slate-500 mt-2">
            You're signed in, but there's no profile linked to this account yet. Ask your school
            admin to finish setting it up.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
