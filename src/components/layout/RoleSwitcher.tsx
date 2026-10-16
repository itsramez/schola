import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useRole } from "../../store/RoleContext";
import { useAuth } from "../../store/AuthContext";
import { useCurrentPersona } from "../../hooks/useCurrentPersona";
import { ROLE_PERSONAS } from "../../rolePersonas";
import type { UserRole } from "../../types";

export default function RoleSwitcher() {
  const { role, setRole, isDemoMode } = useRole();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const persona = useCurrentPersona();
  const Icon = persona.icon;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-slate-200 pl-1.5 pr-2.5 py-1 hover:bg-slate-50"
        title={isDemoMode ? "Switch role (demo)" : "Account"}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue/10 text-blue">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="hidden sm:block text-xs font-semibold text-slate-700">{persona.subtitle}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {isDemoMode ? (
            <>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Preview as
              </p>
              {(Object.keys(ROLE_PERSONAS) as UserRole[]).map((r) => {
                const m = ROLE_PERSONAS[r];
                const RIcon = m.icon;
                const active = r === role;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                      active ? "bg-blue/10 text-blue" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <RIcon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium truncate">{m.name}</span>
                      <span className="block text-xs text-slate-400">{m.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <div className="px-2.5 pt-1.5 pb-2">
                <p className="text-sm font-semibold text-slate-800 truncate">{persona.name}</p>
                <p className="text-xs text-slate-400">{persona.subtitle}</p>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-500 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
