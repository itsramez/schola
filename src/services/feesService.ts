import { supabase } from "../lib/supabaseClient";
import type { FeeKind, FeePaymentStatus } from "../types";

export interface RawFeePlan {
  id: string;
  school_id: string;
  created_by: string;
  title: string;
  kind: FeeKind;
  created_at: string;
}

export interface RawFeePlanItem {
  id: string;
  plan_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  position: number;
  created_at: string;
}

export interface RawFeeAssignment {
  id: string;
  plan_id: string;
  student_id: string;
  school_id: string | null;
  assigned_at: string;
}

export interface RawFeeItemPayment {
  id: string;
  item_id: string;
  student_id: string;
  status: FeePaymentStatus;
  paid_amount: number;
  paid_at: string | null;
  note: string | null;
  school_id: string | null;
}

export interface RawGradeFeeRate {
  id: string;
  school_id: string;
  grade: number;
  amount: number;
}

export interface RawSubjectFeeRate {
  id: string;
  school_id: string;
  subject_label: string | null;
  is_general: boolean;
  amount: number;
}

export interface RawGradeFeePayment {
  id: string;
  school_id: string | null;
  student_id: string;
  status: FeePaymentStatus;
  paid_amount: number;
  paid_at: string | null;
}

export interface RawSubjectFeePayment {
  id: string;
  school_id: string | null;
  student_id: string;
  subject_label: string;
  status: FeePaymentStatus;
  paid_amount: number;
  paid_at: string | null;
}

export interface RawFeeSettings {
  school_id: string;
  subject_drop_grace_days: number;
  updated_at: string;
}

export interface RawSubjectFeeEnrollment {
  id: string;
  school_id: string;
  student_id: string;
  subject_label: string;
  started_at: string;
  dropped_at: string | null;
  fee_waived: boolean;
  created_at: string;
}

export async function fetchFeePlans(): Promise<RawFeePlan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("fee_plans").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as RawFeePlan[];
}

export async function fetchFeePlanItems(): Promise<RawFeePlanItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("fee_plan_items").select("*").order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawFeePlanItem[];
}

export async function fetchFeeAssignments(): Promise<RawFeeAssignment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("fee_assignments").select("*");
  if (error) throw new Error(error.message);
  return data as RawFeeAssignment[];
}

export async function fetchFeeItemPayments(): Promise<RawFeeItemPayment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("fee_item_payments").select("*");
  if (error) throw new Error(error.message);
  return data as RawFeeItemPayment[];
}

/** Admin-only (enforced by RLS) — creates a fee plan and its line items together. */
export async function createFeePlan(input: {
  createdBy: string;
  title: string;
  kind: FeeKind;
  items: { label: string; amount: number; dueDate?: string }[];
}): Promise<{ plan: RawFeePlan; items: RawFeePlanItem[] }> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: plan, error: planError } = await supabase
    .from("fee_plans")
    .insert([
      {
        created_by: input.createdBy,
        title: input.title,
        kind: input.kind,
      },
    ])
    .select()
    .single();
  if (planError) throw new Error(planError.message);

  const { data: items, error: itemsError } = await supabase
    .from("fee_plan_items")
    .insert(
      input.items.map((it, index) => ({
        plan_id: plan.id,
        label: it.label,
        amount: it.amount,
        due_date: it.dueDate ?? null,
        position: index,
      })),
    )
    .select();
  if (itemsError) throw new Error(itemsError.message);

  return { plan: plan as RawFeePlan, items: items as RawFeePlanItem[] };
}

/** Admin-only (enforced by RLS) — assigns an existing plan to one or more students. */
export async function assignFeePlan(planId: string, studentIds: string[]): Promise<RawFeeAssignment[]> {
  if (!supabase) throw new Error("Supabase is not configured");
  if (studentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("fee_assignments")
    .upsert(
      studentIds.map((studentId) => ({ plan_id: planId, student_id: studentId })),
      { onConflict: "plan_id,student_id", ignoreDuplicates: true },
    )
    .select();
  if (error) throw new Error(error.message);
  return data as RawFeeAssignment[];
}

export async function unassignFeePlan(planId: string, studentId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("fee_assignments")
    .delete()
    .eq("plan_id", planId)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
}

export async function deleteFeePlan(planId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("fee_plans").delete().eq("id", planId);
  if (error) throw new Error(error.message);
}

/** Admin-only (enforced by RLS) — records a student's payment status for one fee item. */
export async function upsertFeeItemPayment(input: {
  itemId: string;
  studentId: string;
  status: FeePaymentStatus;
  paidAmount: number;
  paidAt?: string | null;
  note?: string;
}): Promise<RawFeeItemPayment> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("fee_item_payments")
    .upsert(
      [
        {
          item_id: input.itemId,
          student_id: input.studentId,
          status: input.status,
          paid_amount: input.paidAmount,
          paid_at: input.paidAt ?? null,
          note: input.note ?? null,
        },
      ],
      { onConflict: "item_id,student_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawFeeItemPayment;
}

export async function fetchGradeFeeRates(): Promise<RawGradeFeeRate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("grade_fee_rates").select("*").order("grade", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawGradeFeeRate[];
}

/** Admin-only (enforced by RLS) — sets (or clears, passing amount null) the fee for one grade. */
export async function upsertGradeFeeRate(grade: number, amount: number | null): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  if (amount === null) {
    const { error } = await supabase.from("grade_fee_rates").delete().eq("grade", grade);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase
    .from("grade_fee_rates")
    .upsert([{ grade, amount }], { onConflict: "school_id,grade" });
  if (error) throw new Error(error.message);
}

export async function fetchSubjectFeeRates(): Promise<RawSubjectFeeRate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("subject_fee_rates").select("*");
  if (error) throw new Error(error.message);
  return data as RawSubjectFeeRate[];
}

/** Admin-only (enforced by RLS) — creates or updates a subject (or the general fallback) rate. */
export async function upsertSubjectFeeRate(input: {
  id?: string;
  subjectLabel?: string;
  isGeneral?: boolean;
  amount: number;
}): Promise<RawSubjectFeeRate> {
  if (!supabase) throw new Error("Supabase is not configured");
  const row = {
    ...(input.id ? { id: input.id } : {}),
    subject_label: input.isGeneral ? null : input.subjectLabel ?? null,
    is_general: input.isGeneral ?? false,
    amount: input.amount,
  };
  const { data, error } = await supabase.from("subject_fee_rates").upsert([row]).select().single();
  if (error) throw new Error(error.message);
  return data as RawSubjectFeeRate;
}

export async function deleteSubjectFeeRate(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("subject_fee_rates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchGradeFeePayments(): Promise<RawGradeFeePayment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("grade_fee_payments").select("*");
  if (error) throw new Error(error.message);
  return data as RawGradeFeePayment[];
}

/** Admin-only (enforced by RLS) — records a student's grade-fee payment status. */
export async function upsertGradeFeePayment(input: {
  studentId: string;
  status: FeePaymentStatus;
  paidAmount: number;
}): Promise<RawGradeFeePayment> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("grade_fee_payments")
    .upsert(
      [
        {
          student_id: input.studentId,
          status: input.status,
          paid_amount: input.paidAmount,
          paid_at: input.status === "unpaid" ? null : new Date().toISOString(),
        },
      ],
      { onConflict: "student_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawGradeFeePayment;
}

export async function fetchSubjectFeePayments(): Promise<RawSubjectFeePayment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("subject_fee_payments").select("*");
  if (error) throw new Error(error.message);
  return data as RawSubjectFeePayment[];
}

/** Admin-only (enforced by RLS) — records a student's payment status for one subject. */
export async function upsertSubjectFeePayment(input: {
  studentId: string;
  subjectLabel: string;
  status: FeePaymentStatus;
  paidAmount: number;
}): Promise<RawSubjectFeePayment> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("subject_fee_payments")
    .upsert(
      [
        {
          student_id: input.studentId,
          subject_label: input.subjectLabel,
          status: input.status,
          paid_amount: input.paidAmount,
          paid_at: input.status === "unpaid" ? null : new Date().toISOString(),
        },
      ],
      { onConflict: "student_id,subject_label" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawSubjectFeePayment;
}

export async function fetchFeeSettings(): Promise<RawFeeSettings[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("fee_settings").select("*");
  if (error) throw new Error(error.message);
  return data as RawFeeSettings[];
}

/** Admin-only (enforced by RLS) — sets how many days after starting a subject a student can drop it fee-free. */
export async function upsertFeeSettings(subjectDropGraceDays: number): Promise<RawFeeSettings> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("fee_settings")
    .upsert([{ subject_drop_grace_days: subjectDropGraceDays, updated_at: new Date().toISOString() }], {
      onConflict: "school_id",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawFeeSettings;
}

export async function fetchSubjectFeeEnrollments(): Promise<RawSubjectFeeEnrollment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("subject_fee_enrollments").select("*");
  if (error) throw new Error(error.message);
  return data as RawSubjectFeeEnrollment[];
}

/**
 * Admin-only (enforced by RLS) — creates or updates a student's subject-fee enrollment record:
 * used both to lazily mark "they started taking this subject" (no dropped fields) and to record
 * a drop (droppedAt + feeWaived, computed client-side against the grace period).
 */
export async function upsertSubjectFeeEnrollment(input: {
  studentId: string;
  subjectLabel: string;
  startedAt?: string;
  droppedAt?: string | null;
  feeWaived?: boolean;
}): Promise<RawSubjectFeeEnrollment> {
  if (!supabase) throw new Error("Supabase is not configured");
  const row: Record<string, unknown> = { student_id: input.studentId, subject_label: input.subjectLabel };
  if (input.startedAt !== undefined) row.started_at = input.startedAt;
  if (input.droppedAt !== undefined) row.dropped_at = input.droppedAt;
  if (input.feeWaived !== undefined) row.fee_waived = input.feeWaived;
  const { data, error } = await supabase
    .from("subject_fee_enrollments")
    .upsert([row], { onConflict: "student_id,subject_label" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawSubjectFeeEnrollment;
}

export function subscribeToFees(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`fees-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "fee_plans" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "fee_plan_items" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "fee_assignments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "fee_item_payments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "grade_fee_rates" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "subject_fee_rates" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "grade_fee_payments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "subject_fee_payments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "fee_settings" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "subject_fee_enrollments" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
