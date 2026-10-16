import { NavLink } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { navItemsForRole } from "../../navItems";
import { useRole } from "../../store/RoleContext";
import { useCurrentPersona } from "../../hooks/useCurrentPersona";
import { useAppData } from "../../store/AppDataContext";

export default function Sidebar() {
  const { role } = useRole();
  const { feesFeatureEnabled } = useAppData();
  const items = navItemsForRole(role).filter((i) => i.requiresFeature !== "fees" || feesFeatureEnabled);
  const persona = useCurrentPersona();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-navy text-white shrink-0 sticky top-0 h-screen">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">Schola</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-navy font-bold text-sm">
            {persona.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{persona.name}</p>
            <p className="text-xs text-slate-400">{persona.subtitle}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
