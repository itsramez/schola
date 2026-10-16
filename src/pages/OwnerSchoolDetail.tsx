import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, School2, ToggleLeft, ToggleRight, UserCog } from "lucide-react";
import { fetchSchoolAdmins, type SchoolAdmin } from "../services/ownersService";
import { fetchSchoolFeatures, setSchoolFeature, type FeatureKey } from "../services/featuresService";

interface FeatureCatalogEntry {
  key: FeatureKey;
  label: string;
  description: string;
  /** When set, this row renders nested/indented under its parent and can only be turned on while the parent is on. */
  parent?: FeatureKey;
}

const FEATURE_CATALOG: FeatureCatalogEntry[] = [
  {
    key: "sections",
    label: "Class Sections & Schedules",
    description:
      "Lets the school's admin build homeroom sections with a weekly schedule, and assign new students to one when creating their account.",
  },
  {
    key: "gradebook",
    label: "Gradebook & Weighted Grades",
    description:
      "Lets teachers put a weight (%) on any quiz or exam, manually grade paper quizzes/exams, and gives teachers and students a weighted overall grade in the Testing page.",
  },
  {
    key: "gradebook_student_overrides",
    label: "Per-Student Weight Overrides",
    parent: "gradebook",
    description:
      "Lets a teacher set a custom weight for one specific student on a quiz/exam (e.g. a student on a modified grading plan) in the Gradebook tab.",
  },
  {
    key: "fees",
    label: "Fees & Payments",
    description:
      "Lets the admin build fee lists and track payments, and shows a payment summary on student/parent profiles.",
  },
  {
    key: "fees_itemized",
    label: "Itemized Billing",
    parent: "fees",
    description: "Admin lists individual fee items (e.g. Tuition, Transport, Books) each with its own price, shown with a total.",
  },
  {
    key: "fees_grade_based",
    label: "Grade-Based Fees",
    parent: "fees",
    description: "Admin sets one amount per grade; it's automatically charged to every student in that grade — no manual assignment.",
  },
  {
    key: "fees_subject_based",
    label: "Subject-Based Fees",
    parent: "fees",
    description:
      "Admin prices subjects (or sets one general fallback price); each student is automatically charged for the subjects in their own schedule. Needs Class Sections & Schedules on, and the student assigned to a section.",
  },
];

function findEntry(key: FeatureKey): FeatureCatalogEntry | undefined {
  return FEATURE_CATALOG.find((f) => f.key === key);
}

/** Whether every ancestor in this entry's parent chain is itself turned on. */
function parentChainEnabled(features: Record<string, boolean>, entry: FeatureCatalogEntry): boolean {
  if (!entry.parent) return true;
  const parentEntry = findEntry(entry.parent);
  if (!parentEntry) return true;
  return (features[parentEntry.key] ?? false) && parentChainEnabled(features, parentEntry);
}

function nestingDepth(entry: FeatureCatalogEntry): number {
  let depth = 0;
  let current = entry;
  while (current.parent) {
    depth += 1;
    const parentEntry = findEntry(current.parent);
    if (!parentEntry) break;
    current = parentEntry;
  }
  return depth;
}

export default function OwnerSchoolDetail() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    Promise.all([fetchSchoolAdmins(schoolId), fetchSchoolFeatures(schoolId)])
      .then(([a, f]) => {
        if (cancelled) return;
        setAdmins(a);
        setFeatures(f);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load this school."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const toggle = async (key: FeatureKey) => {
    if (!schoolId) return;
    const next = !features[key];
    setSavingKey(key);
    setFeatures((prev) => ({ ...prev, [key]: next }));
    try {
      await setSchoolFeature(schoolId, key, next);
    } catch {
      setFeatures((prev) => ({ ...prev, [key]: !next }));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="flex items-center gap-1 text-xs font-semibold text-blue hover:underline">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Schools
      </Link>

      <header className="flex items-center gap-2 text-navy">
        <School2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">School Detail</h1>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <>
          <section>
            <h2 className="font-bold text-lg text-navy mb-3">Admins</h2>
            {admins.length === 0 ? (
              <p className="text-sm text-slate-400">No admin accounts yet.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {admins.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                      <UserCog className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                      <p className="text-xs text-slate-400 truncate">{a.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-bold text-lg text-navy mb-3">Features</h2>
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {FEATURE_CATALOG.map((f) => {
                const enabled = features[f.key] ?? false;
                const parentEnabled = parentChainEnabled(features, f);
                const disabled = savingKey === f.key || !parentEnabled;
                const depth = nestingDepth(f);
                const indentClass = depth === 2 ? "pl-16" : depth === 1 ? "pl-10" : "";
                const parentLabel = f.parent ? findEntry(f.parent)?.label ?? "" : "";
                return (
                  <div
                    key={f.key}
                    className={`flex items-center justify-between gap-3 p-3.5 ${indentClass} ${depth > 0 ? "bg-slate-50/60" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${parentEnabled ? "text-slate-800" : "text-slate-400"}`}>
                        {f.label}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {!parentEnabled && parentLabel ? `Turn on ${parentLabel} above first. ` : ""}
                        {f.description}
                      </p>
                    </div>
                    <button
                      onClick={() => toggle(f.key)}
                      disabled={disabled}
                      className="shrink-0 text-blue disabled:opacity-50"
                    >
                      {enabled && parentEnabled ? (
                        <ToggleRight className="h-7 w-7" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-slate-300" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
