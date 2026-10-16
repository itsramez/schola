import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, GraduationCap, Loader2, School2, UserCog } from "lucide-react";
import { fetchAllSchoolsWithCounts, type SchoolSummary } from "../services/ownersService";
import { formatFullDate } from "../dateUtils";

export default function OwnerHome() {
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllSchoolsWithCounts()
      .then((rows) => !cancelled && setSchools(rows))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load schools."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <School2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Schools</h1>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading schools…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : schools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          No schools on the platform yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {schools.map((s) => (
            <Link
              key={s.id}
              to={`/schools/${s.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-blue/40 hover:bg-blue/5 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                <School2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                <p className="text-xs text-slate-400">Created {formatFullDate(s.createdAt.slice(0, 10))}</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {s.studentCount}
                </span>
                <span className="flex items-center gap-1">
                  <UserCog className="h-3.5 w-3.5" />
                  {s.teacherCount} teacher{s.teacherCount === 1 ? "" : "s"}
                </span>
                <span>
                  {s.adminCount} admin{s.adminCount === 1 ? "" : "s"}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
