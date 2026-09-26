"use client";

import { Fingerprint, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsdc, timeAgo } from "@/lib/format";
import type { Approval, ApprovalStatus, PaymentRecord } from "@/lib/types";

const STATUS_VARIANT: Record<ApprovalStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  approved: "secondary",
  consumed: "secondary",
  denied: "destructive",
  expired: "outline",
  cancelled: "outline",
  failed: "destructive",
};

export function ApprovalsCard({ approvals, payments }: { approvals: Approval[]; payments: PaymentRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Family approvals</CardTitle>
        <CardDescription>Large or unusual payments wait for a verified family member through World ID. Each approval covers one payment and expires in 10 minutes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {approvals.length === 0 && <p className="text-sm text-muted-foreground">No approval requests yet.</p>}
        {approvals.map((approval) => {
          const payment = payments.find((p) => p.approvalId === approval.id && p.outcome !== "paid");
          return (
            <div key={approval.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {payment ? `${formatUsdc(payment.amount)} to ${payment.sellerName}` : "Payment"}
                </div>
                <Badge variant={STATUS_VARIANT[approval.status]}>{approval.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {approval.reason} · requested {timeAgo(approval.createdAt)}
                {approval.statusDetail ? ` · ${approval.statusDetail}` : ""}
              </div>
              {approval.status === "pending" && (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">Code {approval.userCode}</span>
                  <a className={buttonVariants({ size: "sm" })} href={approval.verificationUri} target="_blank" rel="noreferrer">
                    <Fingerprint className="size-4" /> Review with World ID <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
