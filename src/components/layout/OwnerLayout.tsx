import { Outlet, Link } from "react-router-dom";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "../../store/AuthContext";

export default function OwnerLayout() {
  const { ownerProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-navy">Schola — Owner</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:inline">{ownerProfile?.name}</span>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-200 hover:text-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
