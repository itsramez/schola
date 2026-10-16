import { useState } from "react";
import { CheckCircle2, Clock, Receipt, XCircle } from "lucide-react";
import { formatFullDate } from "../dateUtils";
import Modal from "./Modal";
import type { FeePaymentStatus, StudentFeeItemView, StudentFeePlanView } from "../types";

const STATUS_STYLE: Record<FeePaymentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid: { label: "Paid", icon: CheckCircle2, className: "text-mint bg-mint/10" },
  partial: { label: "Partial", icon: Clock, className: "text-amber-600 bg-amber-50" },
  unpaid: { label: "Unpaid", icon: XCircle, className: "text-red-500 bg-red-50" },
};

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

interface ReceiptTarget {
  planTitle: string;
  item: StudentFeeItemView;
}

/** The plan cards themselves, with no outer heading — reusable wherever a student's fee breakdown needs to show up without its own "Fees & Payments" label (e.g. search results). Paid/partial items are clickable and open a receipt. */
export function FeePlanCards({ plans }: { plans: StudentFeePlanView[] }) {
  const [receipt, setReceipt] = useState<ReceiptTarget | null>(null);

  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <div key={plan.planId} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-slate-800">{plan.title}</p>
            <span className="text-xs text-slate-400">{plan.kind === "itemized" ? "Itemized" : "Installments"}</span>
          </div>
          {plan.items.length === 0 ? (
            <p className="text-sm text-slate-400">No installment due this month.</p>
          ) : (
            <>
              <div className="space-y-1.5 mb-3">
                {plan.items.map((it) => {
                  const style = STATUS_STYLE[it.status];
                  const StatusIcon = style.icon;
                  const hasReceipt = it.status !== "unpaid";
                  return (
                    <div
                      key={it.id}
                      role={hasReceipt ? "button" : undefined}
                      tabIndex={hasReceipt ? 0 : undefined}
                      onClick={hasReceipt ? () => setReceipt({ planTitle: plan.title, item: it }) : undefined}
                      className={`flex w-full items-center justify-between text-sm ${hasReceipt ? "hover:bg-slate-50 rounded-lg -mx-1 px-1 py-0.5 cursor-pointer" : ""}`}
                    >
                      <span className="text-slate-600 text-left">
                        {it.label}
                        {it.dueDate ? ` · Due ${formatFullDate(it.dueDate)}` : ""}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{money(it.amount)}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {style.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-sm">
                <span className="text-slate-500">
                  Due {money(plan.totalDue)} · Paid {money(plan.totalPaid)}
                </span>
                <span className={`font-semibold ${plan.balance > 0 ? "text-red-500" : "text-mint"}`}>
                  Balance {money(plan.balance)}
                </span>
              </div>
            </>
          )}
        </div>
      ))}

      {receipt && <ReceiptModal target={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ReceiptModal({ target, onClose }: { target: ReceiptTarget; onClose: () => void }) {
  const { item, planTitle } = target;
  const style = STATUS_STYLE[item.status];
  const StatusIcon = style.icon;

  return (
    <Modal open onClose={onClose} title="Payment Receipt">
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center py-2">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full mb-3 ${style.className}`}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <p className="text-2xl font-bold text-navy">{money(item.paidAmount)}</p>
          <p className="text-sm text-slate-400 mt-0.5">
            {item.status === "paid" ? "Paid in full" : "Partial payment"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
          <ReceiptRow label="For" value={`${planTitle} — ${item.label}`} />
          <ReceiptRow label="Amount due" value={money(item.amount)} />
          <ReceiptRow label="Amount paid" value={money(item.paidAmount)} />
          <ReceiptRow label="Remaining" value={money(Math.max(item.amount - item.paidAmount, 0))} />
          <ReceiptRow
            label="Paid on"
            value={item.paidAt ? new Date(item.paidAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
          />
        </div>
      </div>
    </Modal>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

/** A student's (or their parent's linked child's) assigned fee plans — renders nothing if there are none. */
export default function FeesSummarySection({ plans }: { plans: StudentFeePlanView[] }) {
  if (plans.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 text-navy mb-3">
        <Receipt className="h-5 w-5" />
        <h2 className="font-bold text-lg">Fees & Payments</h2>
      </div>
      <FeePlanCards plans={plans} />
    </section>
  );
}
