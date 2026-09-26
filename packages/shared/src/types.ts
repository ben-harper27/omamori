import type { Address } from "viem";

export type RiskLevel = "high" | "warning" | "clean";

export type ScreeningVerdict = {
  level: RiskLevel;
  reasons: string[];
};

export type Screening = {
  payTo: ScreeningVerdict;
  token: ScreeningVerdict;
  authorization: ScreeningVerdict;
};

export type PaymentTerms = {
  sellerName: string;
  payTo: Address;
  amount: bigint;
  asset: Address;
  network: string;
};

export type Policy = {
  maxPerPayment: bigint;
  approvalThreshold: bigint;
  monthlyCap: bigint;
  allowlist: string[] | null;
  approver: string;
};

export type DecisionInput = {
  terms: PaymentTerms;
  policy: Policy | null;
  monthSpend: bigint;
  screening: Screening;
};

export type Outcome = "pay" | "refuse" | "ask_family";

export type Decision = {
  outcome: Outcome;
  rule: number;
  reason: string;
  details: string[];
};
