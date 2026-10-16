import { CheckSquare } from "lucide-react";
import { getSectionAttendanceRate, teacherSections } from "../data/mockData";
import { useAppData } from "../store/AppDataContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { DirectoryNote } from "./admin/adminShared";

export default function AdminAttendance() {
  const { attendanceRecords, riskSnapshots } = useAppData();

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <CheckSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Attendance</h1>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {isSupabaseConfigured ? <RealAttendance riskSnapshots={riskSnapshots} /> : <MockAttendance attendanceRecords={attendanceRecords} />}
      </div>
    </div>
  );
}

function rateFor(records: { status: string }[]) {
  return records.length === 0 ? 100 : Math.round((records.filter((r) => r.status !== "absent").length / records.length) * 1000) / 10;
}

function RealAttendance({
  riskSnapshots,
}: {
  riskSnapshots: { studentId: string; studentName: string; attendanceRecords: { status: string }[] }[];
}) {
  return (
    <>
      <DirectoryNote>Live attendance rate per real student.</DirectoryNote>
      <div className="space-y-2">
        {riskSnapshots.length === 0 && <p className="text-sm text-slate-400 px-1">No student accounts yet.</p>}
        {riskSnapshots.map((s) => {
          const rate = rateFor(s.attendanceRecords);
          return (
            <div key={s.studentId} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-slate-700">{s.studentName}</p>
                <span className="text-sm font-semibold text-mint">{rate}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-mint rounded-full" style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function MockAttendance({ attendanceRecords }: { attendanceRecords: { status: string }[] }) {
  const amaraRate =
    attendanceRecords.length === 0
      ? 100
      : Math.round((attendanceRecords.filter((r) => r.status !== "absent").length / attendanceRecords.length) * 1000) / 10;

  return (
    <>
      <DirectoryNote>
        Section rates below are illustrative — full day-by-day attendance is tracked live for Amara Silva only
        right now (see People → Students).
      </DirectoryNote>
      <div className="space-y-2 mb-3">
        {teacherSections.map((s) => {
          const rate = getSectionAttendanceRate(s.id);
          return (
            <div key={s.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-slate-700">Science — {s.sectionName}</p>
                <span className="text-sm font-semibold text-mint">{rate}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-mint rounded-full" style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-mint/30 bg-mint/5 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Amara Silva (live data)</p>
          <span className="text-sm font-bold text-mint">{amaraRate}%</span>
        </div>
      </div>
    </>
  );
}
