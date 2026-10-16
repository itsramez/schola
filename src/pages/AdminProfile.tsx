import { useState } from "react";
import { Lock, Mail, School, ShieldCheck, ToggleLeft, ToggleRight, UserCog } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { adminProfile, schoolStats } from "../data/mockData";
import { useAppData } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { useCurrentPersona } from "../hooks/useCurrentPersona";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import Modal from "../components/Modal";

export default function AdminProfile() {
  const { realStudents, subjects } = useAppData();
  const { profile, schoolName } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "admin";
  const persona = useCurrentPersona();
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-navy">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
        <button
          onClick={() => setPermissionsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue/40 hover:text-blue"
        >
          <Lock className="h-3.5 w-3.5" />
          Permissions
        </button>
      </header>

      <div className="rounded-2xl bg-navy text-white p-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint text-navy font-bold text-xl shrink-0">
          {persona.initials}
        </div>
        <div>
          <h2 className="text-xl font-bold">{persona.name}</h2>
          <p className="text-slate-300 text-sm">School Admin</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-navy">
            {isReal ? realStudents.length : schoolStats.studentCount.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Students enrolled</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-navy">
            {isReal ? subjects.length : schoolStats.teacherCount}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Teaching staff</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        <InfoRow icon={School} label="School" value={isReal ? schoolName ?? "—" : "Schola Academy"} />
        <InfoRow icon={Mail} label="Email" value={isReal ? profile?.email ?? "—" : adminProfile.email} />
        <InfoRow icon={UserCog} label="Role" value="Principal / School Admin" />
      </div>

      <PermissionsModal open={permissionsOpen} onClose={() => setPermissionsOpen(false)} />
    </div>
  );
}

const PERMISSIONS_KEY = "schola.permissions.v1";

interface PermissionRow {
  key: string;
  label: string;
  teacher: boolean;
  parent: boolean;
}

const DEFAULT_PERMISSIONS: PermissionRow[] = [
  { key: "create_assignments", label: "Create assignments", teacher: true, parent: false },
  { key: "send_announcements", label: "Send school-wide announcements", teacher: false, parent: false },
  { key: "view_attendance", label: "View attendance records", teacher: true, parent: true },
  { key: "message_students", label: "Message students directly", teacher: false, parent: false },
  { key: "manage_users", label: "Add/remove users", teacher: false, parent: false },
];

function loadPermissions(): PermissionRow[] {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PERMISSIONS;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

function PermissionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<PermissionRow[]>(() => loadPermissions());

  const toggle = (key: string, role: "teacher" | "parent") => {
    setRows((prev) => {
      const next = prev.map((r) => (r.key === key ? { ...r, [role]: !r[role] } : r));
      try {
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Permissions">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          These toggles are illustrative for now — nothing else in the app reads or enforces them yet.
        </p>
      </div>
      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Permission</span>
          <span className="text-center w-16">Teacher</span>
          <span className="text-center w-16">Parent</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-1 py-2 hover:bg-slate-50">
            <span className="text-sm text-slate-700">{r.label}</span>
            <button onClick={() => toggle(r.key, "teacher")} className="w-16 flex justify-center text-blue">
              {r.teacher ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-slate-300" />}
            </button>
            <button onClick={() => toggle(r.key, "parent")} className="w-16 flex justify-center text-blue">
              {r.parent ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6 text-slate-300" />}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof School;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/10 text-blue shrink-0">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
