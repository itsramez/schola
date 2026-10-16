import { GraduationCap, Heart, Mail, Phone, School } from "lucide-react";
import { parentProfile } from "../data/mockData";
import { useAppData } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { useCurrentPersona } from "../hooks/useCurrentPersona";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import FeesSummarySection from "../components/FeesSummary";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ParentProfile() {
  const { riskSnapshots, feesFeatureEnabled, myFeePlans } = useAppData();
  const { profile, schoolName } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "parent";
  const persona = useCurrentPersona();
  const child = riskSnapshots[0];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <Heart className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>

      <div className="rounded-2xl bg-navy text-white p-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint text-navy font-bold text-xl shrink-0">
          {persona.initials}
        </div>
        <div>
          <h2 className="text-xl font-bold">{persona.name}</h2>
          <p className="text-slate-300 text-sm">{isReal ? "Parent" : parentProfile.relationship}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-navy font-bold text-sm">
          {isReal ? (child ? initials(child.studentName) : "—") : "AS"}
        </div>
        <div>
          <p className="text-xs text-slate-400">Linked student</p>
          <p className="text-sm font-semibold text-slate-800">
            {isReal ? child?.studentName ?? "No student linked yet" : parentProfile.studentName}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        <InfoRow icon={School} label="School" value={isReal ? schoolName ?? "—" : "Schola Academy"} />
        <InfoRow icon={Mail} label="Email" value={isReal ? profile?.email ?? "—" : parentProfile.email} />
        {!isReal && <InfoRow icon={Phone} label="Phone" value={parentProfile.phone} />}
        {!isReal && <InfoRow icon={GraduationCap} label="Student's grade" value="Grade 9 · Section 9A" />}
      </div>

      {feesFeatureEnabled && <FeesSummarySection plans={myFeePlans} />}
    </div>
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
