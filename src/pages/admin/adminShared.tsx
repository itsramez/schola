import { useEffect, useState } from "react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, Database, Loader2, Search, Trash2, UserPlus } from "lucide-react";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import {
  checkEmailExists,
  createSchoolAccount,
  deleteSchoolAccount,
  type SchoolUserRecord,
} from "../../services/usersService";
import { useAppData } from "../../store/AppDataContext";
import type { StudentDirectoryEntry, TeacherDirectoryEntry } from "../../types";

export function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/10 text-blue mb-2">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

export function DirectoryNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-400 mb-3">{children}</p>;
}

/** A subject field that picks from the admin's subject catalog when there is one, with a fallback to free text. */
export function SubjectPickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { subjectCatalog } = useAppData();
  const [mode, setMode] = useState<"catalog" | "custom">(subjectCatalog.length > 0 ? "catalog" : "custom");

  if (subjectCatalog.length > 0 && mode === "catalog") {
    return (
      <div className="space-y-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
        >
          <option value="" disabled>
            Choose a subject…
          </option>
          {subjectCatalog.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setMode("custom");
            onChange("");
          }}
          className="text-xs font-semibold text-blue hover:underline"
        >
          Not in the list? Type a custom subject
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Physics"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
      />
      {subjectCatalog.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setMode("catalog");
            onChange("");
          }}
          className="text-xs font-semibold text-blue hover:underline"
        >
          Choose from the subject catalog instead
        </button>
      )}
    </div>
  );
}

/** Manages a manual-roster class's enrolled students — search to add, remove individually. */
export function ClassRosterEditor({ classId }: { classId: string }) {
  const { classRoster, realStudents, enrollStudentInClass, unenrollStudentFromClass } = useAppData();
  const [query, setQuery] = useState("");

  const enrolled = classRoster(classId);
  const enrolledIds = new Set(enrolled.map((s) => s.id));
  const trimmed = query.trim().toLowerCase();
  const available = realStudents
    .filter((s) => !enrolledIds.has(s.id))
    .filter((s) => !trimmed || s.name.toLowerCase().includes(trimmed));

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-3 py-2.5 space-y-2">
      {enrolled.length === 0 ? (
        <p className="text-xs text-slate-400">No students enrolled yet.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {enrolled.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
              <span className="text-slate-700 truncate">{s.name}</span>
              <button
                onClick={() => unenrollStudentFromClass(classId, s.id)}
                className="shrink-0 font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students to enroll…"
          className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 py-1.5 text-xs outline-none focus:border-blue"
        />
      </div>
      {trimmed && (
        <div className="rounded-lg border border-slate-200 bg-white max-h-32 overflow-y-auto divide-y divide-slate-100">
          {available.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">No students match "{query.trim()}".</p>
          )}
          {available.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => enrollStudentInClass(classId, s.id)}
              className="w-full flex items-center px-3 py-1.5 text-xs text-left hover:bg-white"
            >
              <span className="text-slate-700 truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy font-semibold text-xs">
      {initials}
    </div>
  );
}

/** Delete button for a real (DB-backed) account — removes cleanly on the mock/illustrative directory rows this can't touch. */
export function DeleteAccountButton({
  id,
  name,
  onDeleted,
}: {
  id: string;
  name: string;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleDelete = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${name}'s account? This deletes their login and cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteSchoolAccount(id);
      onDeleted();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Couldn't remove this account — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      title="Remove account"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function recordToStudent(u: SchoolUserRecord): StudentDirectoryEntry {
  return {
    id: u.id,
    name: u.name,
    grade: u.grade ?? 0,
    section: u.section ?? "—",
    sectionId: u.section_id,
    guardianName: u.guardian_name ?? "—",
  };
}

export function recordToTeacher(u: SchoolUserRecord): TeacherDirectoryEntry {
  return { id: u.id, name: u.name, subjectName: u.subject_name ?? "—", email: u.email };
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function SupabaseSetupNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <p className="font-semibold flex items-center gap-1.5 mb-2">
        <Database className="h-4 w-4" />
        Backend not connected yet
      </p>
      <p className="mb-2">
        Creating real accounts needs a Supabase project wired up. This app ships with everything ready to go
        — you just need to connect it:
      </p>
      <ol className="list-decimal list-inside space-y-1 mb-2">
        <li>
          Create a free project at <span className="font-medium">supabase.com</span>
        </li>
        <li>
          Run the SQL in <code className="bg-amber-100 px-1 rounded">.env.local.example</code> (project root) in
          your Supabase SQL Editor to create the <code className="bg-amber-100 px-1 rounded">users</code> table
        </li>
        <li>
          Copy <code className="bg-amber-100 px-1 rounded">.env.local.example</code> to{" "}
          <code className="bg-amber-100 px-1 rounded">.env.local</code> and fill in your project URL + anon key
        </li>
        <li>Restart the dev server</li>
      </ol>
      <p className="text-xs text-amber-700">
        Note: the included policies allow anyone with the public anon key to read/insert — fine for this demo,
        but this app has no login system yet, so don't use it as-is with real student data.
      </p>
    </div>
  );
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

interface CreatedAccountSummary {
  label: string;
  email: string;
  password: string;
}

type EmailCheckStatus = "idle" | "checking" | "taken" | "available";

function EmailStatusHint({ status }: { status: EmailCheckStatus }) {
  if (status === "checking") {
    return (
      <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking availability…
      </p>
    );
  }
  if (status === "taken") {
    return (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertTriangle className="h-3 w-3" />
        This email is already registered — use a different one.
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="flex items-center gap-1 text-xs text-mint mt-1">
        <CheckCircle2 className="h-3 w-3" />
        Available
      </p>
    );
  }
  return null;
}

export function AddUserForm({
  role,
  onCreated,
  onCancel,
}: {
  role: "student" | "teacher";
  onCreated: (record: SchoolUserRecord) => void;
  onCancel: () => void;
}) {
  const { sectionsFeatureEnabled, sections } = useAppData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [subjectName, setSubjectName] = useState("");
  const [grade, setGrade] = useState("9");
  const [section, setSection] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [includeParent, setIncludeParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState(generatePassword);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ record: SchoolUserRecord; summary: CreatedAccountSummary[] } | null>(
    null,
  );
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>("idle");
  const [parentEmailStatus, setParentEmailStatus] = useState<EmailCheckStatus>("idle");

  useEffect(() => {
    if (!email.trim() || !email.includes("@")) {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    const timer = setTimeout(() => {
      checkEmailExists(email).then((exists) => setEmailStatus(exists ? "taken" : "available"));
    }, 450);
    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (!includeParent || !parentEmail.trim() || !parentEmail.includes("@")) {
      setParentEmailStatus("idle");
      return;
    }
    setParentEmailStatus("checking");
    const timer = setTimeout(() => {
      checkEmailExists(parentEmail).then((exists) => setParentEmailStatus(exists ? "taken" : "available"));
    }, 450);
    return () => clearTimeout(timer);
  }, [parentEmail, includeParent]);

  const backButton = (
    <button
      type="button"
      onClick={onCancel}
      className="flex items-center gap-1 text-xs font-semibold text-blue mb-3 hover:underline"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Back
    </button>
  );

  if (!isSupabaseConfigured) {
    return (
      <div>
        {backButton}
        <SupabaseSetupNotice />
      </div>
    );
  }

  if (created) {
    return (
      <div>
        <div className="flex flex-col items-center text-center py-2 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/10 text-mint mb-3">
            <UserPlus className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800">
            {created.summary.length > 1 ? "Accounts created" : "Account created"}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Share these logins directly — there's no email invite flow yet.
          </p>
        </div>
        <div className="space-y-2 mb-4">
          {created.summary.map((s) => (
            <div key={s.email} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-700">{s.label}</p>
              <p className="text-slate-500">
                {s.email} · <span className="font-mono">{s.password}</span>
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() => onCreated(created.record)}
          className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
        >
          Done
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || submitting) return;
    if (includeParent && (!parentName.trim() || !parentEmail.trim() || !parentPassword)) return;
    if (emailStatus === "taken" || parentEmailStatus === "taken") return;
    setSubmitting(true);
    setError(null);
    try {
      const record = await createSchoolAccount({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        subject_name: role === "teacher" ? subjectName.trim() || null : null,
        grade: role === "student" ? Number(grade) || null : null,
        section: role === "student" ? section.trim() || null : null,
        section_id: role === "student" && sectionsFeatureEnabled ? sectionId || null : null,
        guardian_name: role === "student" ? guardianName.trim() || null : null,
      });

      const summary: CreatedAccountSummary[] = [
        { label: name.trim(), email: email.trim(), password },
      ];

      if (role === "student" && includeParent) {
        await createSchoolAccount({
          name: parentName.trim(),
          email: parentEmail.trim(),
          password: parentPassword,
          role: "parent",
          linked_student_id: record.id,
        });
        summary.push({ label: `${parentName.trim()} (parent)`, email: parentEmail.trim(), password: parentPassword });
      }

      setCreated({ record, summary });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {backButton}
      <Field label="Full name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={role === "teacher" ? "e.g. Mr. Alan Reyes" : "e.g. Jordan Lee"}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="name@schola.edu"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
        />
        <EmailStatusHint status={emailStatus} />
      </Field>
      <Field label="Temporary password">
        <div className="flex gap-2">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue font-mono"
          />
          <button
            type="button"
            onClick={() => setPassword(generatePassword())}
            className="rounded-lg border border-slate-200 px-3 text-xs font-semibold text-blue hover:bg-blue/5"
          >
            Regenerate
          </button>
        </div>
      </Field>
      {role === "teacher" && (
        <Field label="Subject">
          <SubjectPickerField value={subjectName} onChange={setSubjectName} />
        </Field>
      )}
      {role === "student" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade">
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </Field>
            {sectionsFeatureEnabled ? (
              <Field label="Section">
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
                >
                  <option value="">No section — no schedule yet</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.grade ? ` (Grade ${s.grade})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Section">
                <input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. 9C"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
                />
              </Field>
            )}
          </div>
          {sectionsFeatureEnabled && sections.length === 0 && (
            <p className="text-xs text-slate-400">
              No sections yet — create one in Academics → Timetables first.
            </p>
          )}
          <Field label="Guardian name">
            <input
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-600 pt-1">
            <input
              type="checkbox"
              checked={includeParent}
              onChange={(e) => setIncludeParent(e.target.checked)}
              className="rounded border-slate-300"
            />
            Also create a linked parent/guardian account
          </label>

          {includeParent && (
            <div className="rounded-lg border border-blue/20 bg-blue/5 p-3 space-y-3">
              <Field label="Parent full name">
                <input
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required={includeParent}
                  placeholder="e.g. Robert Lee"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
                />
              </Field>
              <Field label="Parent email">
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  required={includeParent}
                  placeholder="parent@example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
                />
                <EmailStatusHint status={parentEmailStatus} />
              </Field>
              <Field label="Parent temporary password">
                <div className="flex gap-2">
                  <input
                    value={parentPassword}
                    onChange={(e) => setParentPassword(e.target.value)}
                    required={includeParent}
                    minLength={6}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setParentPassword(generatePassword())}
                    className="rounded-lg border border-slate-200 px-3 text-xs font-semibold text-blue hover:bg-blue/5"
                  >
                    Regenerate
                  </button>
                </div>
              </Field>
            </div>
          )}
        </>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || emailStatus === "taken" || parentEmailStatus === "taken"}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting
          ? "Creating…"
          : `Create ${role === "teacher" ? "Teacher" : "Student"}${includeParent ? " + Parent" : ""}`}
      </button>
    </form>
  );
}
