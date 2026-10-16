import { BookOpen } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { getSubjectIcon } from "../subjectIcons";
import WeeklyScheduleGrid, { colorForLabel } from "../components/WeeklyScheduleGrid";

export default function Classes() {
  const { subjects, myEnrolledClasses, classSchedule, getSubject } = useAppData();

  // Real mode: the classes this student is actually enrolled in — separate entries even if two
  // classes share a teacher or subject name. Mock/demo mode has no class_enrollments, so it falls
  // back to the legacy one-subject-per-teacher list.
  const mySubjects = isSupabaseConfigured
    ? myEnrolledClasses.map((c) => {
        const matched = subjects.find((s) => s.name.toLowerCase() === c.subjectName.toLowerCase());
        return {
          id: c.id,
          name: c.subjectName,
          teacher: c.teacherName,
          icon: matched?.icon ?? "BookOpen",
          color: matched?.color ?? "#2563EB",
        };
      })
    : subjects;

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-2 text-navy">
        <BookOpen className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Classes</h1>
      </header>

      <section>
        <h2 className="font-bold text-slate-800 mb-3">My Subjects</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mySubjects.map((subject) => {
            const Icon = getSubjectIcon(subject.icon);
            return (
              <div key={subject.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${subject.color}1A`, color: subject.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{subject.name}</p>
                    <p className="text-xs text-slate-400 truncate">{subject.teacher}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-slate-800 mb-3">Weekly Timetable</h2>
        <WeeklyScheduleGrid
          periods={classSchedule.map((p) => {
            const subject = getSubject(p.subjectId);
            return {
              id: p.id,
              day: p.day,
              startTime: p.startTime,
              endTime: p.endTime,
              title: subject?.name ?? "Class",
              subtitle: subject?.teacher,
              color: subject?.color ?? colorForLabel(p.subjectId),
            };
          })}
        />
      </section>
    </div>
  );
}
