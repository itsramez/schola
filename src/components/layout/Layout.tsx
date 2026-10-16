import { Outlet } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";
import RoleSwitcher from "./RoleSwitcher";
import { useRole } from "../../store/RoleContext";

export default function Layout() {
  const { role } = useRole();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-navy">Schola</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <RoleSwitcher />
            {role === "student" && <NotificationBell />}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-10 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
