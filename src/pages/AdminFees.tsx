import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Lock,
  Plus,
  Receipt,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useAppData, type NewFeePlanInput } from "../store/AppDataContext";
import Modal from "../components/Modal";
import { formatFullDate, toIsoDate } from "../dateUtils";
import { Field, StatCard } from "./admin/adminShared";
import { FeePlanCards } from "../components/FeesSummary";
import type { FeeKind, FeePaymentStatus, FeePlanSummary, StudentFeeRosterEntry } from "../types";

function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 pl-7 pr-2.5 py-1.5 text-sm outline-none focus:border-blue"
      />
    </div>
  );
}

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

type Tab = "plans" | "grade" | "subject";

export default function AdminFees() {
  const { feesFeatureEnabled, feesGradeBasedEnabled, feesSubjectBasedEnabled, feePlans } = useAppData();
  const [tab, setTab] = useState<Tab>("plans");
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!feesFeatureEnabled) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-2 text-navy">
          <Receipt className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Fees & Payments</h1>
        </header>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Lock className="h-6 w-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            Fees & Payments isn't turned on for your school yet — ask the owner to enable it.
          </p>
        </div>
      </div>
    );
  }

  const totalPlans = feePlans.length;
  const totalAssignments = feePlans.reduce((sum, p) => sum + p.assignments.length, 0);
  const totalOutstanding = feePlans.reduce((sum, p) => sum + p.assignments.reduce((s, a) => s + a.balance, 0), 0);
  const showTabs = feesGradeBasedEnabled || feesSubjectBasedEnabled;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-navy">
          <Receipt className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Fees & Payments</h1>
        </div>
        {tab === "plans" && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            Create Fee Plan
          </button>
        )}
      </header>

      <StudentFeeSearch />

      {showTabs && (
        <div className="flex gap-2">
          {(
            [
              { key: "plans", label: "Fee Plans" },
              ...(feesGradeBasedEnabled ? [{ key: "grade", label: "Grade Rates" }] : []),
              ...(feesSubjectBasedEnabled ? [{ key: "subject", label: "Subject Rates" }] : []),
            ] as { key: Tab; label: string }[]
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
      )}

      {tab === "grade" && <GradeRatesTab />}
      {tab === "subject" && <SubjectRatesTab />}

      {tab === "plans" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Receipt} value={String(totalPlans)} label="Fee plans" />
            <StatCard icon={UserPlus} value={String(totalAssignments)} label="Assignments" />
            <StatCard icon={Receipt} value={money(totalOutstanding)} label="Outstanding" />
          </div>

          {feePlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
              No fee plans yet — create one to get started.
            </div>
          ) : (
            <div className="space-y-2.5">
              {feePlans.map((plan) => (
                <FeePlanCard
                  key={plan.planId}
                  plan={plan}
                  expanded={expandedId === plan.planId}
                  onToggle={() => setExpandedId(expandedId === plan.planId ? null : plan.planId)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateFeePlanModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function StudentFeeSearch() {
  const { studentFeeOverviews } = useAppData();
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();
  const matches = trimmed ? studentFeeOverviews.filter((s) => s.studentName.toLowerCase().includes(trimmed)) : [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a student to see what they owe and what they've paid…"
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2.5 text-sm outline-none focus:border-blue"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {trimmed && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <p className="text-sm text-slate-400">No student matches "{query.trim()}".</p>
          ) : (
            matches.map((m) => (
              <div key={m.studentId} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-navy mb-2.5">{m.studentName}</p>
                {m.plans.length === 0 ? (
                  <p className="text-sm text-slate-400">No fees assigned to this student yet.</p>
                ) : (
                  <FeePlanCards plans={m.plans} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function GradeRateRow({
  grade,
  amount,
  onSave,
}: {
  grade: number;
  amount?: number;
  onSave: (grade: number, amount: number | null) => void;
}) {
  const [draft, setDraft] = useState(amount !== undefined ? String(amount) : "");

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium text-slate-500">Grade {grade}</span>
      <MoneyInput value={draft} onChange={setDraft} className="flex-1" />
      <button
        onClick={() => onSave(grade, draft.trim() ? Number(draft) : null)}
        className="text-slate-300 hover:text-blue"
        title="Save"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}

function EditGradePaymentModal({
  student,
  amount,
  onSave,
  onClose,
}: {
  student: StudentFeeRosterEntry;
  amount: number;
  onSave: (studentId: string, status: FeePaymentStatus, paidAmount: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={`Grade Fee — ${student.name}`}>
      <div className="space-y-3">
        <PaymentItemRow
          itemId=""
          label={`Grade ${student.grade} Fee`}
          amount={amount}
          studentId={student.id}
          onSave={(_itemId, studentId, status, paidAmount) => onSave(studentId, status, paidAmount)}
        />
      </div>
    </Modal>
  );
}

function GradeRatesTab() {
  const { gradeFeeRates, studentFeeRoster, setGradeFeeRate, setGradeFeePayment } = useAppData();
  const rateByGrade = new Map(gradeFeeRates.map((r) => [r.grade, r.amount]));
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const editingStudent = studentFeeRoster.find((s) => s.id === editingStudentId);
  const editingAmount = editingStudent?.grade != null ? rateByGrade.get(editingStudent.grade) : undefined;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rates by Grade</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <GradeRateRow key={g} grade={g} amount={rateByGrade.get(g)} onSave={setGradeFeeRate} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Students</h3>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
          {studentFeeRoster.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No students yet.</p>}
          {studentFeeRoster.map((s) => {
            const amount = s.grade != null ? rateByGrade.get(s.grade) : undefined;
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.grade != null ? `Grade ${s.grade}` : "No grade set"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-slate-500">{amount !== undefined ? money(amount) : "—"}</span>
                  {amount !== undefined && (
                    <button
                      onClick={() => setEditingStudentId(s.id)}
                      className="rounded-lg border border-blue/30 px-2.5 py-1 font-semibold text-blue hover:bg-blue/5"
                    >
                      Edit Payment
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {editingStudent && editingAmount !== undefined && (
        <EditGradePaymentModal
          student={editingStudent}
          amount={editingAmount}
          onSave={setGradeFeePayment}
          onClose={() => setEditingStudentId(null)}
        />
      )}
    </div>
  );
}

function EditSubjectPaymentsModal({
  student,
  rateFor,
  onSave,
  onClose,
}: {
  student: StudentFeeRosterEntry;
  rateFor: (label: string) => number | undefined;
  onSave: (studentId: string, subjectLabel: string, status: FeePaymentStatus, paidAmount: number) => void;
  onClose: () => void;
}) {
  const priced = student.subjectLabels.filter((label) => rateFor(label) !== undefined);

  return (
    <Modal open onClose={onClose} title={`Subject Fees — ${student.name}`}>
      <div className="space-y-3">
        {priced.map((label) => (
          <div key={label} className="space-y-1.5">
            <PaymentItemRow
              itemId={label}
              label={label}
              amount={rateFor(label) ?? 0}
              studentId={student.id}
              onSave={(subjectLabel, studentId, status, paidAmount) => onSave(studentId, subjectLabel, status, paidAmount)}
            />
            <DropSubjectControl studentId={student.id} subjectLabel={label} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

function DropSubjectControl({ studentId, subjectLabel }: { studentId: string; subjectLabel: string }) {
  const { subjectFeeEnrollmentFor, dropSubjectFee, reactivateSubjectFee, subjectDropGraceDays } = useAppData();
  const [picking, setPicking] = useState(false);
  const [dropDate, setDropDate] = useState(() => toIsoDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrollment = subjectFeeEnrollmentFor(studentId, subjectLabel);

  if (enrollment?.droppedAt) {
    return (
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <span>
          Dropped {formatFullDate(enrollment.droppedAt)}
          {enrollment.feeWaived ? " — fee waived" : " — still owed (past the grace period)"}
        </span>
        <button
          onClick={() => reactivateSubjectFee(studentId, subjectLabel)}
          className="shrink-0 font-semibold text-blue hover:underline"
        >
          Reactivate
        </button>
      </div>
    );
  }

  if (!picking) {
    return (
      <button onClick={() => setPicking(true)} className="px-1 text-xs font-semibold text-red-500 hover:underline">
        Drop this subject…
      </button>
    );
  }

  const confirmDrop = async () => {
    setSaving(true);
    setError(null);
    try {
      await dropSubjectFee(studentId, subjectLabel, new Date(dropDate).toISOString());
      setPicking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record the drop — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-1">
      <input
        type="date"
        value={dropDate}
        onChange={(e) => setDropDate(e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue"
      />
      <button
        onClick={confirmDrop}
        disabled={saving}
        className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
      >
        Confirm drop
      </button>
      <button onClick={() => setPicking(false)} className="text-xs font-semibold text-slate-400 hover:underline">
        Cancel
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
      <span className="text-xs text-slate-400">({subjectDropGraceDays}-day grace period)</span>
    </div>
  );
}

function SubjectRatesTab() {
  const {
    subjectFeeRates,
    studentFeeRoster,
    setSubjectFeeRate,
    removeSubjectFeeRate,
    setSubjectFeePayment,
    subjectDropGraceDays,
    setSubjectDropGraceDays,
    ensureSubjectFeeEnrollment,
  } = useAppData();
  const general = subjectFeeRates.find((r) => r.isGeneral);
  const specific = subjectFeeRates.filter((r) => !r.isGeneral);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [generalDraft, setGeneralDraft] = useState(general ? String(general.amount) : "");
  const [graceDraft, setGraceDraft] = useState(String(subjectDropGraceDays));
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const editingStudent = studentFeeRoster.find((s) => s.id === editingStudentId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const rateForLazy = (label: string) => specific.find((r) => r.subjectLabel === label)?.amount ?? general?.amount;
  useEffect(() => {
    for (const s of studentFeeRoster) {
      for (const label of s.subjectLabels) {
        if (rateForLazy(label) !== undefined) ensureSubjectFeeEnrollment(s.id, label);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentFeeRoster, specific, general]);

  const rateFor = (label: string) => specific.find((r) => r.subjectLabel === label)?.amount ?? general?.amount;

  const chargeable = studentFeeRoster.filter((s) => s.subjectLabels.some((label) => rateFor(label) !== undefined));
  const allSelected = chargeable.length > 0 && chargeable.every((s) => selectedIds.includes(s.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : chargeable.map((s) => s.id));

  const markPaidForSelected = () => {
    if (selectedIds.length === 0) return;
    for (const studentId of selectedIds) {
      const student = studentFeeRoster.find((s) => s.id === studentId);
      if (!student) continue;
      for (const label of student.subjectLabels) {
        const rate = rateFor(label);
        if (rate !== undefined) setSubjectFeePayment(studentId, label, "paid", rate);
      }
    }
    setSelectedIds([]);
  };

  const addSubjectRate = () => {
    if (!newLabel.trim() || !newAmount.trim()) return;
    setSubjectFeeRate({ subjectLabel: newLabel.trim(), amount: Number(newAmount) });
    setNewLabel("");
    setNewAmount("");
  };

  const saveGeneral = () => {
    setSubjectFeeRate({ id: general?.id, isGeneral: true, amount: generalDraft.trim() ? Number(generalDraft) : 0 });
  };

  const saveGraceDays = () => {
    const days = Number(graceDraft);
    if (!Number.isFinite(days) || days < 0) return;
    setSubjectDropGraceDays(Math.round(days));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Drop policy</h3>
        <p className="text-xs text-slate-400">
          If a student drops a subject within this many days of starting it, the fee is waived. After that, they
          still owe it.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={graceDraft}
            onChange={(e) => setGraceDraft(e.target.value)}
            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue"
          />
          <span className="text-xs text-slate-500">days</span>
          <button
            onClick={saveGraceDays}
            className="rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95"
          >
            Save
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          General (fallback for any subject without its own price)
        </h3>
        <div className="flex items-center gap-2">
          <MoneyInput value={generalDraft} onChange={setGeneralDraft} className="w-32" />
          <button
            onClick={saveGeneral}
            className="rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95"
          >
            Save
          </button>
        </div>

        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2">Specific subjects</h3>
        <div className="space-y-2">
          {specific.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-slate-700">{r.subjectLabel}</span>
              <span className="text-sm text-slate-500">{money(r.amount)}</span>
              <button
                onClick={() => removeSubjectFeeRate(r.id)}
                className="text-slate-300 hover:text-red-500"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Biology"
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue"
            />
            <MoneyInput value={newAmount} onChange={setNewAmount} className="w-28" />
            <button
              onClick={addSubjectRate}
              className="flex items-center gap-1 rounded-lg border border-blue/30 px-2.5 py-1.5 text-xs font-semibold text-blue hover:bg-blue/5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Students</h3>
          {chargeable.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
                Select all
              </label>
              <button
                onClick={markPaidForSelected}
                disabled={selectedIds.length === 0}
                className="rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
              >
                Mark Paid{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              </button>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
          {studentFeeRoster.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No students yet.</p>}
          {studentFeeRoster.map((s) => {
            const priced = s.subjectLabels.filter((label) => rateFor(label) !== undefined);
            const total = priced.reduce((sum, label) => sum + (rateFor(label) ?? 0), 0);
            const canCharge = priced.length > 0;
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    disabled={!canCharge}
                    className="shrink-0 rounded border-slate-300 disabled:opacity-30"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{s.name}</p>
                    {s.subjectLabels.length === 0 ? (
                      <p className="text-xs text-slate-400">No schedule yet — assign a section first.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.subjectLabels.map((label) => (
                          <span key={label} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-slate-500">{money(total)}</span>
                  {priced.length > 0 && (
                    <button
                      onClick={() => setEditingStudentId(s.id)}
                      className="rounded-lg border border-blue/30 px-2.5 py-1 font-semibold text-blue hover:bg-blue/5"
                    >
                      Edit Payments
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {editingStudent && (
        <EditSubjectPaymentsModal
          student={editingStudent}
          rateFor={rateFor}
          onSave={setSubjectFeePayment}
          onClose={() => setEditingStudentId(null)}
        />
      )}
    </div>
  );
}

function FeePlanCard({
  plan,
  expanded,
  onToggle,
}: {
  plan: FeePlanSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { deleteFeePlan } = useAppData();
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const planTotal = plan.items.reduce((s, it) => s + it.amount, 0);

  const handleDelete = () => {
    if (!window.confirm(`Delete "${plan.title}"? This removes it and every assignment/payment for it.`)) return;
    deleteFeePlan(plan.planId);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
          <Receipt className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 truncate">{plan.title}</p>
          <p className="text-xs text-slate-400">
            {plan.kind === "itemized" ? "Itemized" : "Installments"} · {plan.items.length} item
            {plan.items.length === 1 ? "" : "s"} · {money(planTotal)} total
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-slate-700">{plan.assignments.length} assigned</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3">
          <div className="space-y-1.5">
            {plan.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm text-slate-600">
                <span>
                  {it.label}
                  {it.dueDate ? ` · Due ${formatFullDate(it.dueDate)}` : ""}
                </span>
                <span className="font-medium text-slate-700">{money(it.amount)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned Students</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold text-blue hover:underline"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Assign to more students
              </button>
              <button
                onClick={handleDelete}
                title="Delete plan"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {plan.assignments.length === 0 ? (
            <p className="text-sm text-slate-400">Not assigned to anyone yet.</p>
          ) : (
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
              {plan.assignments.map((a) => (
                <div key={a.studentId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <p className="text-sm text-slate-700 min-w-0 truncate">{a.studentName}</p>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="text-slate-400">Due {money(a.totalDue)}</span>
                    <span className="text-mint">Paid {money(a.totalPaid)}</span>
                    <span className={a.balance > 0 ? "font-semibold text-red-500" : "font-semibold text-slate-400"}>
                      Bal {money(a.balance)}
                    </span>
                    <button
                      onClick={() => setEditingStudentId(a.studentId)}
                      className="rounded-lg border border-blue/30 px-2.5 py-1 font-semibold text-blue hover:bg-blue/5"
                    >
                      Edit Payments
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {assignOpen && <AssignMoreModal plan={plan} onClose={() => setAssignOpen(false)} />}
      {editingStudentId && (
        <EditPaymentsModal
          plan={plan}
          studentId={editingStudentId}
          studentName={plan.assignments.find((a) => a.studentId === editingStudentId)?.studentName ?? "Student"}
          onClose={() => setEditingStudentId(null)}
        />
      )}
    </div>
  );
}

function GradeAudiencePicker({
  grade,
  onGradeChange,
}: {
  grade: number | null;
  onGradeChange: (grade: number) => void;
}) {
  const { studentFeeRoster } = useAppData();
  const countByGrade = new Map<number, number>();
  for (const s of studentFeeRoster) {
    if (s.grade != null) countByGrade.set(s.grade, (countByGrade.get(s.grade) ?? 0) + 1);
  }

  return (
    <select
      value={grade ?? ""}
      onChange={(e) => onGradeChange(Number(e.target.value))}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
    >
      <option value="" disabled>
        Choose a grade…
      </option>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
        <option key={g} value={g}>
          Grade {g} ({countByGrade.get(g) ?? 0} student{(countByGrade.get(g) ?? 0) === 1 ? "" : "s"})
        </option>
      ))}
    </select>
  );
}

function StudentPicker({
  selectedStudentIds,
  onToggle,
  excludeIds = [],
}: {
  selectedStudentIds: string[];
  onToggle: (id: string) => void;
  excludeIds?: string[];
}) {
  const { realStudents } = useAppData();
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();
  const options = realStudents
    .filter((s) => !excludeIds.includes(s.id))
    .filter((s) => !trimmed || s.name.toLowerCase().includes(trimmed));

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students…"
          className="w-full rounded-lg border border-slate-200 pl-8 pr-7 py-1.5 text-xs outline-none focus:border-blue"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            title="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
        {options.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400">
            {trimmed ? `No students match "${query.trim()}".` : "No students available."}
          </p>
        )}
        {options.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedStudentIds.includes(s.id)}
              onChange={() => onToggle(s.id)}
              className="rounded border-slate-300"
            />
            {s.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function AssignMoreModal({ plan, onClose }: { plan: FeePlanSummary; onClose: () => void }) {
  const { assignFeePlan, realStudents, studentFeeRoster, feesGradeBasedEnabled } = useAppData();
  const [mode, setMode] = useState<"grade" | "specific">("specific");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const assignedIds = plan.assignments.map((a) => a.studentId);

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const applyGrade = (g: number) => {
    setSelectedGrade(g);
    setSelected(studentFeeRoster.filter((s) => s.grade === g && !assignedIds.includes(s.id)).map((s) => s.id));
  };

  const save = () => {
    if (selected.length === 0) return;
    assignFeePlan(plan.planId, selected);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Assign "${plan.title}"`}>
      <div className="space-y-3">
        {realStudents.length === assignedIds.length ? (
          <p className="text-sm text-slate-400">Every student already has this plan.</p>
        ) : (
          <>
            <div className="flex gap-2">
              {feesGradeBasedEnabled && (
                <button
                  type="button"
                  onClick={() => setMode("grade")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                    mode === "grade" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                  }`}
                >
                  By grade
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode("specific")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                  mode === "specific" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                }`}
              >
                Specific students
              </button>
            </div>
            {mode === "grade" ? (
              <GradeAudiencePicker grade={selectedGrade} onGradeChange={applyGrade} />
            ) : (
              <StudentPicker selectedStudentIds={selected} onToggle={toggle} excludeIds={assignedIds} />
            )}
          </>
        )}
        <button
          onClick={save}
          disabled={selected.length === 0}
          className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          Assign {selected.length > 0 ? `(${selected.length})` : ""}
        </button>
      </div>
    </Modal>
  );
}

function EditPaymentsModal({
  plan,
  studentId,
  studentName,
  onClose,
}: {
  plan: FeePlanSummary;
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const { setFeeItemPayment } = useAppData();

  return (
    <Modal open onClose={onClose} title={`Payments — ${studentName}`}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{plan.title}</p>
        <div className="space-y-3">
          {plan.items.map((it) => (
            <PaymentItemRow key={it.id} itemId={it.id} label={it.label} amount={it.amount} studentId={studentId} onSave={setFeeItemPayment} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

function PaymentItemRow({
  itemId,
  label,
  amount,
  studentId,
  onSave,
}: {
  itemId: string;
  label: string;
  amount: number;
  studentId: string;
  onSave: (itemId: string, studentId: string, status: FeePaymentStatus, paidAmount: number) => void;
}) {
  const [status, setStatus] = useState<FeePaymentStatus>("unpaid");
  const [paidAmount, setPaidAmount] = useState("");

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-400">{money(amount)}</span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FeePaymentStatus)}
          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue"
        >
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <MoneyInput value={paidAmount} onChange={setPaidAmount} placeholder="Paid" className="w-28" />
        <button
          onClick={() => onSave(itemId, studentId, status, paidAmount.trim() ? Number(paidAmount) : status === "paid" ? amount : 0)}
          className="rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95"
        >
          Save
        </button>
      </div>
    </div>
  );
}

interface ItemDraft {
  id: string;
  label: string;
  amount: string;
}

function newItemDraft(label = "", amount = ""): ItemDraft {
  return { id: `item-${Date.now()}-${Math.random()}`, label, amount };
}

function CreateFeePlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    createFeePlan,
    realStudents,
    studentFeeRoster,
    gradeFeeRates,
    subjectFeeRates,
    feesItemizedEnabled,
    feesGradeBasedEnabled,
    feesSubjectBasedEnabled,
  } = useAppData();
  const kind: FeeKind = "itemized";
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([newItemDraft()]);
  const [audienceMode, setAudienceMode] = useState<"grade" | "specific">("specific");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setItems([newItemDraft()]);
    setAudienceMode("specific");
    setSelectedGrade(null);
    setSelectedStudentIds([]);
    setConfirmed(false);
  };

  const updateItem = (id: string, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  const rateForSubject = (label: string) => {
    const specific = subjectFeeRates.find((r) => !r.isGeneral && r.subjectLabel === label);
    if (specific) return specific.amount;
    return subjectFeeRates.find((r) => r.isGeneral)?.amount;
  };

  const subjectSetKey = (labels: string[]) => [...labels].sort().join("|");

  const selectedStudentEntries = (studentIds: string[]) =>
    studentIds
      .map((id) => studentFeeRoster.find((s) => s.id === id))
      .filter((s): s is StudentFeeRosterEntry => !!s);

  /** Only prefillable when every selected student has the exact same priced subjects — a plan's items apply identically to everyone assigned. */
  const prefillSubjectItems = (studentIds: string[]) => {
    if (!feesSubjectBasedEnabled) return;
    if (studentIds.length === 0) return;
    if (items.length !== 1 || items[0].label.trim() || items[0].amount.trim()) return;
    const entries = selectedStudentEntries(studentIds);
    if (entries.length === 0) return;
    const firstKey = subjectSetKey(entries[0].subjectLabels);
    if (!entries.every((s) => subjectSetKey(s.subjectLabels) === firstKey)) return;
    const priced = entries[0].subjectLabels
      .map((label) => ({ label, amount: rateForSubject(label) }))
      .filter((p): p is { label: string; amount: number } => p.amount !== undefined);
    if (priced.length === 0) return;
    setItems(priced.map((p) => newItemDraft(p.label, String(p.amount))));
  };

  const selectedSubjectsDiffer = (() => {
    if (!feesSubjectBasedEnabled || selectedStudentIds.length < 2) return false;
    const entries = selectedStudentEntries(selectedStudentIds);
    if (entries.length < 2) return false;
    const firstKey = subjectSetKey(entries[0].subjectLabels);
    return !entries.every((s) => subjectSetKey(s.subjectLabels) === firstKey);
  })();

  /** Each selected student's own subject fees, summed — used when they don't all share the same subjects (so Fee items can't be one shared list). */
  const selectedSubjectFeeTotal = feesSubjectBasedEnabled
    ? selectedStudentEntries(selectedStudentIds).reduce(
        (sum, s) => sum + s.subjectLabels.reduce((inner, label) => inner + (rateForSubject(label) ?? 0), 0),
        0,
      )
    : 0;

  const toggleStudent = (id: string) => {
    const next = selectedStudentIds.includes(id)
      ? selectedStudentIds.filter((x) => x !== id)
      : [...selectedStudentIds, id];
    setSelectedStudentIds(next);
    prefillSubjectItems(next);
  };

  const allStudentsSelected = realStudents.length > 0 && realStudents.every((s) => selectedStudentIds.includes(s.id));

  const toggleSelectAll = () => {
    const next = allStudentsSelected ? [] : realStudents.map((s) => s.id);
    setSelectedStudentIds(next);
    prefillSubjectItems(next);
  };

  const applyGrade = (g: number) => {
    setSelectedGrade(g);
    setSelectedStudentIds(studentFeeRoster.filter((s) => s.grade === g).map((s) => s.id));
    // Prefill a still-blank single item with this grade's existing rate, if one's set — admin can still change it.
    const rate = gradeFeeRates.find((r) => r.grade === g)?.amount;
    if (items.length === 1 && !items[0].label.trim() && !items[0].amount.trim()) {
      setItems([{ ...items[0], label: `Grade ${g} Fee`, amount: rate !== undefined ? String(rate) : items[0].amount }]);
    }
  };

  const validItems = items.filter((it) => it.label.trim() && it.amount.trim() && !Number.isNaN(Number(it.amount)));
  const runningTotal = validItems.reduce((s, it) => s + Number(it.amount), 0);

  const isValid =
    feesItemizedEnabled &&
    title.trim() &&
    validItems.length === items.length &&
    validItems.length > 0 &&
    selectedStudentIds.length > 0;

  const missingReasons: string[] = [];
  if (!title.trim()) missingReasons.push("a plan title");
  if (validItems.length === 0 || validItems.length !== items.length)
    missingReasons.push("at least one fee item with a label and a non-zero amount");
  if (selectedStudentIds.length === 0) missingReasons.push("at least one student selected");

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    const input: NewFeePlanInput = {
      title: title.trim(),
      kind,
      items: validItems.map((it) => ({
        label: it.label.trim(),
        amount: Number(it.amount),
      })),
      assignedStudentIds: selectedStudentIds,
    };
    try {
      await createFeePlan(input);
      setConfirmed(true);
    } catch {
      window.alert("Couldn't create this fee plan — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Create Fee Plan"
    >
      {confirmed ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/10 text-mint mb-3">
            <Receipt className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800">Fee plan created</p>
          <button
            onClick={() => {
              onClose();
              reset();
            }}
            className="mt-4 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      ) : !feesItemizedEnabled ? (
        <p className="text-sm text-slate-500">Ask the owner to turn on Itemized Billing before creating a fee plan.</p>
      ) : (
        <div className="space-y-3">
          <Field label="Plan title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 9 Annual Fees"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-500">Fee items</span>
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2">
                <input
                  value={it.label}
                  onChange={(e) => updateItem(it.id, { label: e.target.value })}
                  placeholder="e.g. Tuition"
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue"
                />
                <MoneyInput value={it.amount} onChange={(v) => updateItem(it.id, { amount: v })} className="w-24" />
                <button
                  onClick={() => removeItem(it.id)}
                  className="text-slate-300 hover:text-red-500"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setItems((prev) => [...prev, newItemDraft()])}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
            <p className="text-xs text-slate-400">Total: {money(runningTotal)}</p>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1">Assign to</span>
            {feesGradeBasedEnabled && (
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAudienceMode("grade")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                    audienceMode === "grade" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                  }`}
                >
                  By grade
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceMode("specific")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                    audienceMode === "specific" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                  }`}
                >
                  Specific students
                </button>
              </div>
            )}
            {audienceMode === "grade" && feesGradeBasedEnabled ? (
              <GradeAudiencePicker grade={selectedGrade} onGradeChange={applyGrade} />
            ) : (
              <>
                <label className="flex items-center gap-2 mb-2 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allStudentsSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                  Select all students
                </label>
                {allStudentsSelected ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                    <p className="font-semibold text-slate-700">
                      All {realStudents.length} student{realStudents.length === 1 ? "" : "s"} selected
                    </p>
                    {selectedSubjectsDiffer ? (
                      <p className="text-slate-500 mt-0.5">
                        {money(selectedSubjectFeeTotal)} total — each student's own subject fees added up
                        (amounts differ per student)
                      </p>
                    ) : (
                      <p className="text-slate-500 mt-0.5">
                        {money(runningTotal)} each · {money(runningTotal * realStudents.length)} total
                      </p>
                    )}
                  </div>
                ) : (
                  <StudentPicker selectedStudentIds={selectedStudentIds} onToggle={toggleStudent} />
                )}
              </>
            )}
            {!allStudentsSelected && selectedStudentIds.length > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">{selectedStudentIds.length} student(s) selected</p>
            )}
            {feesSubjectBasedEnabled && selectedStudentIds.length >= 1 && !selectedSubjectsDiffer && (
              <p className="text-xs text-slate-400 mt-1">
                Fee items were auto-filled from{" "}
                {selectedStudentIds.length === 1 ? "this student's" : "the selected students' shared"} priced
                subjects — edit or add more as needed.
              </p>
            )}
            {selectedSubjectsDiffer && !allStudentsSelected && (
              <p className="text-xs text-slate-500 mt-1">
                These students take different subjects — their own subject fees add up to {money(selectedSubjectFeeTotal)}{" "}
                combined. That can't go into one shared Fee items list (each item here applies the same amount to
                everyone assigned); it's already billed automatically per student via Subject-Based Fees.
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Fee Plan"}
          </button>
          {!isValid && !saving && missingReasons.length > 0 && (
            <p className="text-xs text-slate-400 text-center">Still needed: {missingReasons.join(", ")}.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

