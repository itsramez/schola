import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, UserPlus, Users2 } from "lucide-react";
import {
  studentsDirectory,
  initialTeachersDirectory,
  parentsDirectory,
  schoolStats,
  getStudentProfileStats,
} from "../data/mockData";
import { useAppData } from "../store/AppDataContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { listUsers } from "../services/usersService";
import { setStudentSection } from "../services/sectionsService";
import {
  AddUserForm,
  Avatar,
  ClassRosterEditor,
  DeleteAccountButton,
  DirectoryNote,
  initialsOf,
  recordToStudent,
  recordToTeacher,
} from "./admin/adminShared";
import type {
  ClassSection,
  ParentDirectoryEntry,
  SchoolClass,
  StudentDirectoryEntry,
  TeacherDirectoryEntry,
} from "../types";

type Tab = "students" | "teachers" | "parents";

export default function AdminPeople() {
  const [tab, setTab] = useState<Tab>("students");

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <Users2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">People</h1>
      </header>

      <div className="flex gap-2">
        {(
          [
            { key: "students", label: "Students" },
            { key: "teachers", label: "Teachers" },
            { key: "parents", label: "Parents" },
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
        {tab === "students" && <StudentsSection />}
        {tab === "teachers" && <TeachersSection />}
        {tab === "parents" && <ParentsSection />}
      </div>
    </div>
  );
}

type StudentsView = "list" | "detail" | "add";

function StudentsSection() {
  const [view, setView] = useState<StudentsView>("list");
  const [selected, setSelected] = useState<StudentDirectoryEntry | null>(null);
  const [dbStudents, setDbStudents] = useState<StudentDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    listUsers("student")
      .then((rows) => setDbStudents(rows.map(recordToStudent)))
      .catch(() => setDbStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const dbIds = new Set(dbStudents.map((s) => s.id));
  const allStudents = isSupabaseConfigured ? dbStudents : studentsDirectory;

  if (view === "detail" && selected) {
    return (
      <StudentProfileDetail
        student={selected}
        onBack={() => setView("list")}
        onSectionChanged={(sectionId) => {
          setDbStudents((prev) => prev.map((s) => (s.id === selected.id ? { ...s, sectionId } : s)));
          setSelected((prev) => (prev ? { ...prev, sectionId } : prev));
        }}
      />
    );
  }

  if (view === "add") {
    return (
      <AddUserForm
        role="student"
        onCancel={() => setView("list")}
        onCreated={(record) => {
          setDbStudents((prev) => [recordToStudent(record), ...prev]);
          setView("list");
        }}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <DirectoryNote>
          {isSupabaseConfigured
            ? `${allStudents.length} student${allStudents.length === 1 ? "" : "s"}`
            : `Showing ${allStudents.length} of ${schoolStats.studentCount.toLocaleString()} students`}
          {loading ? " · loading…" : ""}
        </DirectoryNote>
        <button
          onClick={() => setView("add")}
          className="shrink-0 flex items-center gap-1 rounded-lg bg-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-95"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {allStudents.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-1 rounded-lg border border-slate-100 pr-1.5 hover:bg-slate-50"
          >
            <button
              onClick={() => {
                setSelected(s);
                setView("detail");
              }}
              className="flex flex-1 min-w-0 items-center gap-3 p-2.5 text-left"
            >
              <Avatar initials={initialsOf(s.name)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                <p className="text-xs text-slate-400">
                  Grade {s.grade} · Section {s.section} · Guardian: {s.guardianName}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
            </button>
            {dbIds.has(s.id) && (
              <DeleteAccountButton
                id={s.id}
                name={s.name}
                onDeleted={() => setDbStudents((prev) => prev.filter((d) => d.id !== s.id))}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function StudentProfileDetail({
  student,
  onBack,
  onSectionChanged,
}: {
  student: StudentDirectoryEntry;
  onBack: () => void;
  onSectionChanged: (sectionId: string | null) => void;
}) {
  const { riskSnapshots, sectionsFeatureEnabled, sections } = useAppData();
  const isReal = isSupabaseConfigured;
  const snapshot = riskSnapshots.find((s) => s.studentId === student.id);

  const stats = isReal
    ? {
        attendanceRate:
          !snapshot || snapshot.attendanceRecords.length === 0
            ? 100
            : Math.round(
                (snapshot.attendanceRecords.filter((r) => r.status !== "absent").length /
                  snapshot.attendanceRecords.length) *
                  1000,
              ) / 10,
        assignmentsCompleted: snapshot?.assignments.filter((a) => a.status === "completed").length ?? 0,
        assignmentsTotal: snapshot?.assignments.length ?? 0,
      }
    : getStudentProfileStats(student.id);

  const completionPct =
    stats.assignmentsTotal === 0 ? 0 : Math.round((stats.assignmentsCompleted / stats.assignmentsTotal) * 100);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-blue mb-3 hover:underline">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Students
      </button>

      <div className="flex items-center gap-3 mb-4">
        <Avatar initials={initialsOf(student.name)} />
        <div>
          <p className="font-semibold text-slate-800">{student.name}</p>
          <p className="text-xs text-slate-400">
            Grade {student.grade} · Section {student.section}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg border border-slate-100 p-3">
          <p className="text-xl font-bold text-mint">{stats.attendanceRate}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Attendance rate</p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <p className="text-xl font-bold text-navy">
            {stats.assignmentsCompleted}/{stats.assignmentsTotal}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Assignments done ({completionPct}%)</p>
        </div>
      </div>

      {isReal && sectionsFeatureEnabled && (
        <SectionReassignField
          studentId={student.id}
          currentSectionId={student.sectionId}
          sections={sections}
          onChanged={onSectionChanged}
        />
      )}

      {isReal ? (
        <p className="text-xs text-mint font-medium mb-3">
          Live data — pulled directly from this student's own attendance and assignment records.
        </p>
      ) : (
        <p className="text-xs text-slate-400 mb-3">
          Illustrative sample data — full per-student tracking for the rest of the roster is coming soon.
        </p>
      )}

      <div className="rounded-lg border border-slate-100 p-3 text-xs text-slate-500">
        Guardian: {student.guardianName}
      </div>
    </div>
  );
}

function SectionReassignField({
  studentId,
  currentSectionId,
  sections,
  onChanged,
}: {
  studentId: string;
  currentSectionId: string | null;
  sections: ClassSection[];
  onChanged: (sectionId: string | null) => void;
}) {
  const [value, setValue] = useState(currentSectionId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = value !== (currentSectionId ?? "");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await setStudentSection(studentId, value || null);
      onChanged(value || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update the section — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-100 p-3 mb-3">
      <span className="block text-xs font-medium text-slate-500 mb-1">Class section</span>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
        >
          <option value="">No section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.grade ? ` (Grade ${s.grade})` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="shrink-0 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

type TeachersView = "list" | "add";

function TeachersSection() {
  const [view, setView] = useState<TeachersView>("list");
  const [dbTeachers, setDbTeachers] = useState<TeacherDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    listUsers("teacher")
      .then((rows) => setDbTeachers(rows.map(recordToTeacher)))
      .catch(() => setDbTeachers([]))
      .finally(() => setLoading(false));
  }, []);

  const { classes } = useAppData();
  const dbIds = new Set(dbTeachers.map((t) => t.id));
  const allTeachers = isSupabaseConfigured ? dbTeachers : initialTeachersDirectory;
  const classesByTeacherId = new Map<string, typeof classes>();
  for (const c of classes) {
    const arr = classesByTeacherId.get(c.teacherId) ?? [];
    arr.push(c);
    classesByTeacherId.set(c.teacherId, arr);
  }

  if (view === "add") {
    return (
      <AddUserForm
        role="teacher"
        onCancel={() => setView("list")}
        onCreated={(record) => {
          setDbTeachers((prev) => [recordToTeacher(record), ...prev]);
          setView("list");
        }}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <DirectoryNote>
          {isSupabaseConfigured
            ? `${allTeachers.length} teacher${allTeachers.length === 1 ? "" : "s"}`
            : `Showing ${allTeachers.length} of ${schoolStats.teacherCount} teachers`}
          {loading ? " · loading…" : ""}
        </DirectoryNote>
        <button
          onClick={() => setView("add")}
          className="shrink-0 flex items-center gap-1 rounded-lg bg-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-95"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {allTeachers.map((t) => {
          const expanded = expandedId === t.id;
          const teacherClasses = classesByTeacherId.get(t.id) ?? [];
          const subjectSummary =
            teacherClasses.length > 0 ? teacherClasses.map((c) => c.subjectName).join(", ") : t.subjectName;
          return (
            <div key={t.id} className="rounded-lg border border-slate-100 overflow-hidden">
              <div
                role={dbIds.has(t.id) ? "button" : undefined}
                tabIndex={dbIds.has(t.id) ? 0 : undefined}
                onClick={dbIds.has(t.id) ? () => setExpandedId(expanded ? null : t.id) : undefined}
                className={`flex items-center gap-3 p-2.5 ${dbIds.has(t.id) ? "cursor-pointer hover:bg-slate-50" : ""}`}
              >
                <Avatar initials={initialsOf(t.name)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.name}</p>
                  <p className="text-xs text-slate-400">
                    {subjectSummary} · {t.email}
                  </p>
                </div>
                {dbIds.has(t.id) && (
                  <DeleteAccountButton
                    id={t.id}
                    name={t.name}
                    onDeleted={() => setDbTeachers((prev) => prev.filter((d) => d.id !== t.id))}
                  />
                )}
              </div>
              {expanded && <TeacherClassesEditor teacherId={t.id} teacherClasses={teacherClasses} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

function TeacherClassesEditor({
  teacherId,
  teacherClasses,
}: {
  teacherId: string;
  teacherClasses: SchoolClass[];
}) {
  const { sections, subjectCatalog, createClass, deleteClass } = useAppData();
  const [adding, setAdding] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [rosterMode, setRosterMode] = useState<"section" | "manual">("manual");
  const [sectionId, setSectionId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const startAdd = () => {
    setAdding(true);
    setSubjectId("");
    setRosterMode("manual");
    setSectionId("");
    setError(null);
  };

  const confirmAdd = async () => {
    if (!subjectId) return;
    if (rosterMode === "section" && !sectionId) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createClass({
        teacherId,
        subjectId,
        rosterMode,
        sectionId: rosterMode === "section" ? sectionId : undefined,
      });
      setAdding(false);
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
    <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 space-y-2.5" onClick={(e) => e.stopPropagation()}>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {teacherClasses.length === 0 ? (
        <p className="text-xs text-slate-400">No classes yet.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {teacherClasses.map((c) => {
            const expanded = expandedClassId === c.id;
            return (
              <div key={c.id}>
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <button onClick={() => setExpandedClassId(expanded ? null : c.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-slate-700 truncate">{c.subjectName}</span>
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
                    Roster follows the Section's students — manage it from Academics → Timetables.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {adding ? (
        <div className="rounded-lg border border-blue/20 bg-blue/5 p-2.5 space-y-2">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
          >
            <option value="" disabled>
              Choose a subject…
            </option>
            {subjectCatalog.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
              disabled={creating || !subjectId || (rosterMode === "section" && !sectionId)}
              className="flex-1 rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Adding…" : "Add class"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : subjectCatalog.length === 0 ? (
        <p className="text-xs text-slate-400">Add a subject in Academics → Subjects first.</p>
      ) : (
        <button onClick={startAdd} className="text-xs font-semibold text-blue hover:underline">
          + Add a class
        </button>
      )}
    </div>
  );
}

function ParentsSection() {
  const [dbParents, setDbParents] = useState<ParentDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    Promise.all([listUsers("parent"), listUsers("student")])
      .then(([parents, students]) => {
        const studentNameById = new Map(students.map((s) => [s.id, s.name]));
        setDbParents(
          parents.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            studentName: (p.linked_student_id && studentNameById.get(p.linked_student_id)) || "—",
          })),
        );
      })
      .catch(() => setDbParents([]))
      .finally(() => setLoading(false));
  }, []);

  const dbIds = new Set(dbParents.map((p) => p.id));
  const allParents = isSupabaseConfigured ? dbParents : parentsDirectory;

  return (
    <>
      <DirectoryNote>
        {allParents.length} parent account{allParents.length === 1 ? "" : "s"}
        {loading ? " · loading…" : ""}
      </DirectoryNote>
      <div className="space-y-2">
        {allParents.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
            <Avatar initials={initialsOf(p.name)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
              <p className="text-xs text-slate-400">
                Parent of {p.studentName} · {p.email}
              </p>
            </div>
            {dbIds.has(p.id) && (
              <DeleteAccountButton
                id={p.id}
                name={p.name}
                onDeleted={() => setDbParents((prev) => prev.filter((d) => d.id !== p.id))}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
