import { GraduationCap, Mail, School, UserCog, Users } from "lucide-react";
import { teacherProfile, teacherSections } from "../data/mockData";
import { useAppData } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { useCurrentPersona } from "../hooks/useCurrentPersona";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export default function TeacherProfile() {
  const { getSubject, realStudents } = useAppData();
  const { profile, schoolName } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "teacher";
  const persona = useCurrentPersona();
  const subject = isReal ? undefined : getSubject(teacherProfile.subjectId);
  const totalStudents = isReal ? realStudents.length : teacherSections.reduce((sum, s) => sum + s.studentCount, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <UserCog className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>

      <div className="rounded-2xl bg-navy text-white p-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint text-navy font-bold text-xl shrink-0">
          {persona.initials}
        </div>
        <div>
          <h2 className="text-xl font-bold">{persona.name}</h2>
          <p className="text-slate-300 text-sm">{persona.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!isReal && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold text-navy">{teacherSections.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Sections taught</p>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-navy">{totalStudents}</p>
          <p className="text-xs text-slate-500 mt-0.5">Students total</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        <InfoRow icon={School} label="School" value={isReal ? schoolName ?? "—" : "Schola Academy"} />
        <InfoRow icon={Mail} label="Email" value={isReal ? profile?.email ?? "—" : teacherProfile.email} />
        <InfoRow
          icon={GraduationCap}
          label="Subject"
          value={isReal ? profile?.subject_name ?? "—" : subject?.name ?? ""}
        />
      </div>

      {!isReal && (
        <section>
          <div className="flex items-center gap-2 text-navy mb-3">
            <Users className="h-5 w-5" />
            <h2 className="font-bold text-lg">My Sections</h2>
          </div>
          <div className="space-y-2">
            {teacherSections.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div>
                  <p className="font-medium text-slate-800">{s.sectionName}</p>
                  <p className="text-xs text-slate-400">{s.studentCount} students</p>
                </div>
                <span className="text-sm font-semibold text-slate-500">{s.averageGrade}% avg</span>
              </div>
            ))}
          </div>
        </section>
      )}
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
