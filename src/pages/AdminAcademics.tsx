import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Lock, Plus, Search, Trash2 } from "lucide-react";
import { schoolStats, teacherSections } from "../data/mockData";
import { useAppData, type NewSectionPeriodInput } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { getSubjectIcon } from "../subjectIcons";
import { weekdayIndexToName } from "../dateUtils";
import { ClassRosterEditor, DirectoryNote } from "./admin/adminShared";
import WeeklyScheduleGrid, { colorForLabel } from "../components/WeeklyScheduleGrid";
import type { ClassSection, SchoolClass, SectionStudentRosterEntry } from "../types";

type Tab = "classes" | "subjects" | "timetables";

export default function AdminAcademics() {
  const [tab, setTab] = useState<Tab>("classes");

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <BookOpen className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Academics</h1>
      </header>

      <div className="flex gap-2">
        {(
          [
            { key: "classes", label: "Classes" },
            { key: "subjects", label: "Subjects" },
            { key: "timetables", label: "Timetables" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-navy text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {tab === "classes" && <ClassesSection />}
        {tab === "subjects" && <SubjectsSection />}
        {tab === "timetables" && <TimetablesSection />}
      </div>
    </div>
  );
}

function ClassesSection() {
  const { subjects, realStudents } = useAppData();

  if (isSupabaseConfigured) {
    return (
      <>
        <DirectoryNote>
          Every real teacher's class — {realStudents.length} student{realStudents.length === 1 ? "" : "s"} total,
          all enrolled in each.
        </DirectoryNote>
        <div className="space-y-2">
          {subjects.length === 0 && <p className="text-sm text-slate-400 px-1">No teacher accounts yet.</p>}
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5">
              <div>
                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">{s.teacher}</p>
              </div>
              <span className="text-sm font-semibold text-slate-500">{realStudents.length} students</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <DirectoryNote>
        Showing Ms. Ortega's {teacherSections.length} Science sections — full {schoolStats.classCount}-class
        catalog is coming soon.
      </DirectoryNote>
      <div className="space-y-2">
        {teacherSections.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5">
            <div>
              <p className="text-sm font-medium text-slate-800">Science — {c.sectionName}</p>
              <p className="text-xs text-slate-400">{c.studentCount} students</p>
            </div>
            <span className="text-sm font-semibold text-slate-500">{c.averageGrade}% avg</span>
          </div>
        ))}
      </div>
    </>
  );
}

function SubjectsSection() {
  const { subjects, subjectCatalog, addSubjectCatalogEntry, removeSubjectCatalogEntry, classes } = useAppData();
  const { schoolName } = useAuth();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const classesBySubjectId = new Map<string, SchoolClass[]>();
  for (const c of classes) {
    const arr = classesBySubjectId.get(c.subjectId) ?? [];
    arr.push(c);
    classesBySubjectId.set(c.subjectId, arr);
  }
  const allTeachers = subjects.map((s) => ({ id: s.id, name: s.teacher }));

  const addCatalogEntry = async () => {
    if (!newName.trim() || adding) return;
    setAdding(true);
    setError(null);
    try {
      await addSubjectCatalogEntry(newName.trim());
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this subject — try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <DirectoryNote>
        The core subject catalog offered at {isSupabaseConfigured ? schoolName ?? "your school" : "Schola Academy"}.
      </DirectoryNote>

      {isSupabaseConfigured && (
        <div className="rounded-lg border border-blue/20 bg-blue/5 p-3 mb-3 flex items-end gap-2">
          <div className="flex-1">
            <span className="block text-xs font-medium text-slate-500 mb-1">Add a subject</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCatalogEntry()}
              placeholder="e.g. Physics"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </div>
          <button
            onClick={addCatalogEntry}
            disabled={!newName.trim() || adding}
            className="shrink-0 flex items-center gap-1 rounded-lg bg-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="space-y-2">
        {isSupabaseConfigured && subjectCatalog.length === 0 && (
          <p className="text-sm text-slate-400 px-1">No subjects yet — add one above.</p>
        )}
        {!isSupabaseConfigured && subjects.length === 0 && (
          <p className="text-sm text-slate-400 px-1">No teacher accounts yet.</p>
        )}
        {subjectCatalog.map((c) => {
          const classesHere = classesBySubjectId.get(c.id) ?? [];
          const Icon = getSubjectIcon(
            subjects.find((s) => s.name.toLowerCase() === c.name.toLowerCase())?.icon ?? "BookOpen",
          );
          const expanded = expandedId === c.id;
          return (
            <div key={c.id} className="rounded-lg border border-slate-100 overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : c.id)}
                className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    {classesHere.length > 0
                      ? `Taught by ${classesHere.map((cl) => cl.teacherName).join(", ")}`
                      : "No teacher assigned yet"}
                  </p>
                </div>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Remove "${c.name}" from the subject catalog?`)) removeSubjectCatalogEntry(c.id);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                )}
              </button>
              {expanded && (
                <SubjectClassesEditor subjectId={c.id} subjectName={c.name} classesHere={classesHere} allTeachers={allTeachers} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function SubjectClassesEditor({
  subjectId,
  subjectName,
  classesHere,
  allTeachers,
}: {
  subjectId: string;
  subjectName: string;
  classesHere: SchoolClass[];
  allTeachers: { id: string; name: string }[];
}) {
  const { sections, createClass, deleteClass } = useAppData();
  const [query, setQuery] = useState("");
  const [pendingTeacherId, setPendingTeacherId] = useState<string | null>(null);
  const [rosterMode, setRosterMode] = useState<"section" | "manual">("manual");
  const [sectionId, setSectionId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const trimmed = query.trim().toLowerCase();
  const matches = trimmed ? allTeachers.filter((t) => t.name.toLowerCase().includes(trimmed)) : [];

  const startAdd = (teacherId: string) => {
    setPendingTeacherId(teacherId);
    setRosterMode("manual");
    setSectionId("");
    setQuery("");
    setError(null);
  };

  const confirmAdd = async () => {
    if (!pendingTeacherId) return;
    if (rosterMode === "section" && !sectionId) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createClass({
        teacherId: pendingTeacherId,
        subjectId,
        rosterMode,
        sectionId: rosterMode === "section" ? sectionId : undefined,
      });
      setPendingTeacherId(null);
      setExpandedClassId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this class — try again.");
    } finally {
      setCreating(false);
    }
  };

  const removeClass = (classId: string) => {
    if (window.confirm("Remove this class? Its roster and any content scoped to it lose that connection.")) {
      deleteClass(classId);
    }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 space-y-2.5">
      {error && <p className="text-xs text-red-500">{error}</p>}

      {classesHere.length === 0 ? (
        <p className="text-xs text-slate-400">No class teaches this subject yet.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {classesHere.map((c) => {
            const expanded = expandedClassId === c.id;
            return (
              <div key={c.id}>
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <button onClick={() => setExpandedClassId(expanded ? null : c.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-slate-700 truncate">{c.teacherName}</span>
                    <span className="block text-xs text-slate-400">
                      {c.rosterMode === "section" ? `Section: ${c.sectionName ?? "—"}` : "Manual roster"} ·{" "}
                      {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
                    </span>
                  </button>
                  <button
                    onClick={() => removeClass(c.id)}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                {expanded && c.rosterMode === "manual" && <ClassRosterEditor classId={c.id} />}
                {expanded && c.rosterMode === "section" && (
                  <p className="px-3 pb-2.5 text-xs text-slate-400">
                    Roster follows the Section's students — manage it from the Timetables tab.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pendingTeacherId ? (
        <div className="rounded-lg border border-blue/20 bg-blue/5 p-2.5 space-y-2">
          <p className="text-xs text-slate-600">
            Add <span className="font-semibold">{allTeachers.find((t) => t.id === pendingTeacherId)?.name}</span>{" "}
            teaching {subjectName} to:
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRosterMode("section")}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                rosterMode === "section" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
              }`}
            >
              A section
            </button>
            <button
              type="button"
              onClick={() => setRosterMode("manual")}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                rosterMode === "manual" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
              }`}
            >
              Manual roster
            </button>
          </div>
          {rosterMode === "section" && (
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="" disabled>
                Choose a section…
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={confirmAdd}
              disabled={creating || (rosterMode === "section" && !sectionId)}
              className="flex-1 rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Adding…" : "Create class"}
            </button>
            <button
              onClick={() => setPendingTeacherId(null)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teachers to add…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue"
            />
          </div>
          {trimmed && (
            <div className="rounded-lg border border-slate-200 bg-white max-h-40 overflow-y-auto divide-y divide-slate-100">
              {matches.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">No teachers match "{query.trim()}".</p>
              )}
              {matches.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => startAdd(t.id)}
                  className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-slate-50"
                >
                  <span className="text-slate-700 truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const WEEKDAYS_1_TO_5 = [1, 2, 3, 4, 5];
const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0];

function TimetablesSection() {
  const { classSchedule, getSubject, sectionsFeatureEnabled } = useAppData();

  if (isSupabaseConfigured) {
    if (!sectionsFeatureEnabled) {
      return (
        <div className="flex flex-col items-center text-center py-8 gap-2">
          <Lock className="h-6 w-6 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">Class Sections isn't turned on for your school</p>
          <p className="text-xs text-slate-400 max-w-sm">
            This lets you build homeroom sections with a weekly schedule and assign new students to one. Ask the
            Schola team to enable it for your school.
          </p>
        </div>
      );
    }
    return <SectionsBuilder />;
  }

  return (
    <>
      <DirectoryNote>
        Combined view of Grade 9's core timetable and Ms. Ortega's Science sections — the full
        {` ${schoolStats.classCount}`}-class master schedule builder is coming soon.
      </DirectoryNote>
      <div className="space-y-4">
        {WEEKDAYS_1_TO_5.map((day) => {
          const corePeriods = classSchedule
            .filter((c) => c.day === day)
            .map((c) => ({ ...c, label: getSubject(c.subjectId)?.name ?? "Class" }));
          const demoSectionPeriods = teacherSections.flatMap((s) =>
            s.schedule.filter((p) => p.day === day).map((p) => ({ ...p, label: `Science — ${s.sectionName}` })),
          );
          const periods = [...corePeriods, ...demoSectionPeriods].sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (periods.length === 0) return null;
          return (
            <div key={day}>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">{weekdayIndexToName(day)}</p>
              <div className="space-y-1.5">
                {periods.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="text-slate-700">{p.label}</span>
                    <span className="text-xs text-slate-400">
                      {p.startTime}–{p.endTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SectionsBuilder() {
  const { sections, sectionPeriods, addSection, removeSection } = useAppData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGrade, setNewGrade] = useState("9");
  const [submitting, setSubmitting] = useState(false);

  const createNewSection = async () => {
    if (!newName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await addSection(newName.trim(), Number(newGrade) || undefined);
      setExpandedId(created.id);
      setNewName("");
      setCreating(false);
    } catch {
      // leave the form open so the admin can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <DirectoryNote>
          {sections.length} section{sections.length === 1 ? "" : "s"} — each has its own weekly schedule.
        </DirectoryNote>
        <button
          onClick={() => setCreating((v) => !v)}
          className="shrink-0 flex items-center gap-1 rounded-lg bg-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-95"
        >
          <Plus className="h-3.5 w-3.5" />
          New Section
        </button>
      </div>

      {creating && (
        <div className="rounded-lg border border-blue/20 bg-blue/5 p-3 flex items-end gap-2">
          <div className="flex-1">
            <span className="block text-xs font-medium text-slate-500 mb-1">Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Grade 9 - A"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </div>
          <div className="w-20">
            <span className="block text-xs font-medium text-slate-500 mb-1">Grade</span>
            <input
              type="number"
              min={1}
              max={12}
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </div>
          <button
            onClick={createNewSection}
            disabled={!newName.trim() || submitting}
            className="shrink-0 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400 text-sm">
          No sections yet — create one to start building a schedule.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {sections.map((s, i) => {
            const expanded = expandedId === s.id;
            const periods = sectionPeriods
              .filter((p) => p.sectionId === s.id)
              .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
            return (
              <div key={s.id} className={i > 0 ? "border-t border-slate-100" : ""}>
                <button
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">
                      {s.grade ? `Grade ${s.grade} · ` : ""}
                      {periods.length} period{periods.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete section "${s.name}"? Students stay but lose this schedule.`)) {
                          removeSection(s.id);
                        }
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>
                {expanded && (
                  <>
                    <SectionStudentsEditor sectionId={s.id} sectionName={s.name} sections={sections} />
                    <SectionScheduleEditor sectionId={s.id} periods={periods} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionStudentsEditor({
  sectionId,
  sectionName,
  sections,
}: {
  sectionId: string;
  sectionName: string;
  sections: ClassSection[];
}) {
  const { sectionStudentRoster, assignStudentToSection } = useAppData();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sectionNameById = new Map(sections.map((sec) => [sec.id, sec.name]));
  const enrolled = sectionStudentRoster.filter((s) => s.sectionId === sectionId);
  const trimmed = query.trim().toLowerCase();
  const available = sectionStudentRoster
    .filter((s) => s.sectionId !== sectionId)
    .filter((s) => !trimmed || s.name.toLowerCase().includes(trimmed));

  const addStudent = async (student: SectionStudentRosterEntry) => {
    setError(null);
    if (student.sectionId) {
      const currentName = sectionNameById.get(student.sectionId) ?? "another section";
      if (!window.confirm(`${student.name} is already in "${currentName}". Move them to "${sectionName}"?`)) return;
    }
    setSavingId(student.id);
    try {
      await assignStudentToSection(student.id, sectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add this student — try again.");
    } finally {
      setSavingId(null);
    }
  };

  const removeStudent = async (student: SectionStudentRosterEntry) => {
    setError(null);
    setSavingId(student.id);
    try {
      await assignStudentToSection(student.id, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove this student — try again.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-4 space-y-3">
      <p className="text-xs font-semibold text-slate-500">Students ({enrolled.length})</p>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {enrolled.length === 0 ? (
        <p className="text-xs text-slate-400">No students in this section yet.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          {enrolled.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-slate-700 truncate">{s.name}</span>
              <button
                onClick={() => removeStudent(s)}
                disabled={savingId === s.id}
                className="shrink-0 text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students to add…"
          className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue"
        />
      </div>
      {trimmed && (
        <div className="rounded-lg border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
          {available.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">No students match "{query.trim()}".</p>
          )}
          {available.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => addStudent(s)}
              disabled={savingId === s.id}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="text-slate-700 truncate">{s.name}</span>
              <span className="shrink-0 text-xs text-slate-400">
                {s.sectionId ? `In ${sectionNameById.get(s.sectionId) ?? "another section"}` : "Unassigned"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionScheduleEditor({
  sectionId,
  periods,
}: {
  sectionId: string;
  periods: ReturnType<typeof useAppData>["sectionPeriods"];
}) {
  const { classes, addSectionPeriod, removeSectionPeriod } = useAppData();
  const [day, setDay] = useState("1");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [classId, setClassId] = useState("");
  const [room, setRoom] = useState("");

  const addPeriod = () => {
    if (!classId) return;
    const input: NewSectionPeriodInput = {
      sectionId,
      day: Number(day),
      startTime,
      endTime,
      classId,
      room: room.trim() || undefined,
    };
    addSectionPeriod(input);
    setClassId("");
    setRoom("");
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
      <p className="text-xs text-slate-400">Tap a period on the grid to remove it.</p>
      <WeeklyScheduleGrid
        periods={periods.map((p) => ({
          id: p.id,
          day: p.day,
          startTime: p.startTime,
          endTime: p.endTime,
          title: p.subjectLabel,
          subtitle: p.teacherName ?? (p.room && p.room !== "—" ? p.room : undefined),
          color: colorForLabel(p.teacherName ?? p.subjectLabel),
          onClick: () => {
            if (window.confirm(`Remove "${p.subjectLabel}" on ${weekdayIndexToName(p.day)}?`)) {
              removeSectionPeriod(p.id);
            }
          },
        }))}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
        <p className="text-xs font-semibold text-slate-500">Add a period</p>
        <div className="grid grid-cols-3 gap-2">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue"
          >
            {WEEKDAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {weekdayIndexToName(d)}
              </option>
            ))}
          </select>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue"
          >
            <option value="" disabled>
              Choose a class…
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subjectName} — {c.teacherName}
              </option>
            ))}
          </select>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Room (optional)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </div>
        {classes.length === 0 && (
          <p className="text-xs text-slate-400">No classes yet — add one in the Subjects tab first.</p>
        )}
        <button
          onClick={addPeriod}
          disabled={!classId}
          className="w-full rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add Period
        </button>
      </div>
    </div>
  );
}
