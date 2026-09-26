"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX, Clock, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { formatUsdc } from "@/lib/format";
import type { ActivityResponse, PaymentRecord } from "@/lib/types";

const FRIENDLY_ITEM: Record<string, string> = {
  pharmacy: "your medicine",
  grocery: "your groceries",
  taxi: "your taxi",
};

type Update = { id: string; tone: "waiting" | "yes" | "no" | "expired"; text: string };

function itemName(payment: PaymentRecord): string {
  const label = payment.sellerName.replace(/^unverified:/, "").split(".")[0];
  return FRIENDLY_ITEM[label] ?? "this payment";
}

function describe(payment: PaymentRecord, payments: PaymentRecord[]): Update | null {
  const item = itemName(payment);
  const amount = formatUsdc(payment.amount);
  if (payment.outcome === "awaiting_approval") {
    return { id: payment.id, tone: "waiting", text: `Waiting for your family to say yes to ${item} (${amount})…` };
  }
  if (payment.outcome === "approved") {
    const followUp = payments.find((p) => p.approvalId === payment.approvalId && p.id !== payment.id);
    if (followUp?.outcome === "paid") return { id: payment.id, tone: "yes", text: `Your family said yes, ${item} is booked and paid (${amount}).` };
    return { id: payment.id, tone: "waiting", text: `Your family said yes, paying for ${item} now…` };
  }
  if (payment.outcome === "approval_denied") return { id: payment.id, tone: "no", text: `Your family said no to ${item}. Nothing was paid.` };
  if (payment.outcome === "approval_expired") return { id: payment.id, tone: "expired", text: `No answer from your family in time for ${item}. Nothing was paid.` };
  return null;
}

function hasPending(data: ActivityResponse | undefined): boolean {
  return Boolean(data?.payments.some((p) => p.outcome === "awaiting_approval" || p.outcome === "approved"));
}

const TONE = {
  waiting: { icon: Loader2, className: "border-border bg-muted", iconClass: "animate-spin text-muted-foreground" },
  yes: { icon: CircleCheck, className: "border-success bg-muted", iconClass: "text-success" },
  no: { icon: CircleX, className: "border-destructive bg-muted", iconClass: "text-destructive" },
  expired: { icon: Clock, className: "border-border bg-muted", iconClass: "text-muted-foreground" },
};

// Polling runs the World ID check server-side, so an approved payment completes from this page alone.
export function ApprovalUpdates({ since }: { since: number }) {
  const { data } = useQuery({
    queryKey: ["activity"],
    queryFn: api.pollActivity,
    refetchInterval: (query) => (hasPending(query.state.data) ? 4_000 : false),
  });

  const payments = data?.payments ?? [];
  const updates = payments
    .filter((p) => p.approvalId && p.createdAt >= since)
    .map((p) => describe(p, payments))
    .filter((u): u is Update => u !== null);

  if (updates.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {updates.map((update) => {
        const { icon: Icon, className, iconClass } = TONE[update.tone];
        return (
          <motion.div key={update.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-lg ${className}`}>
            <Icon className={`size-7 shrink-0 ${iconClass}`} />
            {update.text}
          </motion.div>
        );
      })}
    </div>
  );
}
