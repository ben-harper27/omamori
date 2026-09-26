import type { PaymentAgent, PendingApproval } from "@omamori/agent";

// deviceCode is the World ID polling secret; it never leaves the server.
function withoutDeviceCode(approval: PendingApproval) {
  return {
    id: approval.id,
    termsHash: approval.termsHash,
    reason: approval.reason,
    expectedApprover: approval.expectedApprover,
    userCode: approval.userCode,
    verificationUri: approval.verificationUri,
    status: approval.status,
    statusDetail: approval.statusDetail,
    createdAt: approval.createdAt,
    expiresAt: approval.expiresAt,
  };
}

export async function publicActivity(agent: PaymentAgent) {
  const [payments, approvals] = await Promise.all([agent.payments(), agent.approvals()]);
  return { payments, approvals: approvals.map(withoutDeviceCode) };
}
