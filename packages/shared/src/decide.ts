import type { Decision, DecisionInput, RiskLevel, Screening } from "./types";

export const SCREENING_UNAVAILABLE = "Screening unavailable";

function reasonsAtLevel(screening: Screening, level: RiskLevel): string[] {
  const verdicts = [screening.payTo, screening.token, screening.authorization];
  const reasons = new Set<string>();
  for (const verdict of verdicts) {
    if (verdict.level === level) verdict.reasons.forEach((reason) => reasons.add(reason));
  }
  return [...reasons];
}

function hasLevel(screening: Screening, level: RiskLevel): boolean {
  return [screening.payTo, screening.token, screening.authorization].some((v) => v.level === level);
}

export function decide({ terms, policy, monthSpend, screening }: DecisionInput): Decision {
  if (!policy) {
    return { outcome: "refuse", rule: 1, reason: "Agent is not authorised by the family", details: [] };
  }
  if (hasLevel(screening, "high")) {
    const details = reasonsAtLevel(screening, "high");
    const unscreened = details.every((detail) => detail.startsWith(SCREENING_UNAVAILABLE));
    const reason = unscreened ? "Screening unavailable, refusing to pay unscreened" : "Flagged as high risk by Intercepta";
    return { outcome: "refuse", rule: 2, reason, details };
  }
  if (terms.amount > policy.maxPerPayment) {
    return { outcome: "refuse", rule: 3, reason: "Over the family's hard limit", details: [] };
  }
  if (monthSpend + terms.amount > policy.monthlyCap) {
    return { outcome: "refuse", rule: 4, reason: "Monthly budget used up", details: [] };
  }
  if (policy.allowlist && !policy.allowlist.includes(terms.sellerName)) {
    return { outcome: "ask_family", rule: 5, reason: "New or unknown seller", details: [] };
  }
  if (hasLevel(screening, "warning")) {
    return { outcome: "ask_family", rule: 6, reason: "Intercepta returned warnings", details: reasonsAtLevel(screening, "warning") };
  }
  if (terms.amount > policy.approvalThreshold) {
    return { outcome: "ask_family", rule: 7, reason: "Large payment", details: [] };
  }
  return { outcome: "pay", rule: 8, reason: "Within policy, screening clean", details: [] };
}
