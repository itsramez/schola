import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Grip, X } from "lucide-react";
import { bottomNavItemsForRole, moreNavItemsForRole } from "../../navItems";
import { useRole } from "../../store/RoleContext";
import { useAppData } from "../../store/AppDataContext";

export default function BottomNav() {
  const { role } = useRole();
  const { feesFeatureEnabled } = useAppData();
  const bottomNavItems = bottomNavItemsForRole(role).filter((i) => i.requiresFeature !== "fees" || feesFeatureEnabled);
  const moreNavItems = moreNavItemsForRole(role).filter((i) => i.requiresFeature !== "fees" || feesFeatureEnabled);
  const hasMore = moreNavItems.length > 0;
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isMoreActive = moreNavItems.some((item) => item.path === location.pathname);

  return (
    <>
      {moreOpen && hasMore && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-navy">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium ${
                      isActive
                        ? "border-blue/40 bg-blue/5 text-blue"
                        : "border-slate-200 text-slate-600"
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-navy border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${bottomNavItems.length + (hasMore ? 1 : 0)}, minmax(0, 1fr))` }}>
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  isActive ? "text-mint" : "text-slate-400"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          {hasMore && (
            <button
              onClick={() => setMoreOpen(true)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                isMoreActive ? "text-mint" : "text-slate-400"
              }`}
            >
              <Grip className="h-5 w-5" />
              More
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
