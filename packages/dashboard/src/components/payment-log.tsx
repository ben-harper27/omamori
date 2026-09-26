"use client";

import { ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPLORERS, formatUsdc, timeAgo } from "@/lib/format";
import type { PaymentOutcome, PaymentRecord, RiskLevel } from "@/lib/types";

const OUTCOME_STYLE: Record<PaymentOutcome, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-success text-primary-foreground" },
  refused: { label: "Refused", className: "bg-destructive text-primary-foreground" },
  failed: { label: "Failed", className: "bg-destructive text-primary-foreground" },
  awaiting_approval: { label: "Waiting for family", className: "bg-warning text-primary-foreground" },
  approved: { label: "Family approved", className: "bg-secondary text-secondary-foreground" },
  approval_denied: { label: "Family denied", className: "bg-destructive text-primary-foreground" },
  approval_expired: { label: "Approval expired", className: "bg-muted text-muted-foreground" },
};

const RISK_STYLE: Record<RiskLevel, string> = {
  clean: "text-success",
  warning: "text-warning",
  high: "text-destructive",
};

function ScreeningSummary({ payment }: { payment: PaymentRecord }) {
  if (!payment.screening) return null;
  const checks = [
    ["payTo", payment.screening.payTo],
    ["token", payment.screening.token],
    ["authorization", payment.screening.authorization],
  ] as const;
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <span className="text-muted-foreground">Intercepta:</span>
      {checks.map(([label, verdict]) => (
        <span key={label} className={RISK_STYLE[verdict.level]}>
          {label} {verdict.level}
        </span>
      ))}
    </div>
  );
}

export function PaymentLog({ payments }: { payments: PaymentRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment log</CardTitle>
        <CardDescription>Every decision, the rule that fired, and the screening reasons.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
        {payments.map((payment) => {
          const style = OUTCOME_STYLE[payment.outcome];
          return (
            <motion.div key={payment.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{formatUsdc(payment.amount)}</div>
                  <div className="font-mono text-xs text-muted-foreground">{payment.sellerName}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={style.className}>{style.label}</Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(payment.createdAt)}</span>
                </div>
              </div>
              <div className="text-sm">
                {payment.rule !== null && <span className="text-muted-foreground">Rule {payment.rule} · </span>}
                {payment.reason}
              </div>
              {payment.details.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {payment.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
              <ScreeningSummary payment={payment} />
              {payment.txHash && (
                <a className="inline-flex items-center gap-1 text-xs hover:underline" href={EXPLORERS.baseSepoliaTx(payment.txHash)} target="_blank" rel="noreferrer">
                  Settled on Base Sepolia <ExternalLink className="size-3" />
                </a>
              )}
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
