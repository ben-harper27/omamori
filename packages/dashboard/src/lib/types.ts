export type RiskLevel = "high" | "warning" | "clean";
export type ScreeningVerdict = { level: RiskLevel; reasons: string[] };
export type Screening = { payTo: ScreeningVerdict; token: ScreeningVerdict; authorization: ScreeningVerdict };

export type Policy = {
  maxPerPayment: string;
  approvalThreshold: string;
  monthlyCap: string;
  allowlist: string[] | null;
  approver: string;
};

export type PolicyResponse = {
  agentName: string;
  active: boolean;
  policy: Policy | null;
  agentAddress: string | null;
  resolver: string | null;
  description: string | null;
};

export type PaymentOutcome = "paid" | "refused" | "awaiting_approval" | "approved" | "approval_denied" | "approval_expired" | "failed";

export type PaymentRecord = {
  id: string;
  createdAt: number;
  url: string;
  sellerName: string;
  payTo: string;
  amount: string;
  outcome: PaymentOutcome;
  rule: number | null;
  reason: string;
  details: string[];
  screening: Screening | null;
  txHash: string | null;
  approvalId: string | null;
};

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "cancelled" | "failed" | "consumed";

export type Approval = {
  id: string;
  termsHash: string;
  reason: string;
  expectedApprover: string;
  userCode: string;
  verificationUri: string;
  status: ApprovalStatus;
  statusDetail: string | null;
  createdAt: number;
  expiresAt: number;
};

export type ActivityResponse = { payments: PaymentRecord[]; approvals: Approval[] };

export type ChatHistory = unknown[];
export type ChatResponse = { reply: string; history: ChatHistory };
