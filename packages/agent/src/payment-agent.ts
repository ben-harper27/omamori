import type { Address, LocalAccount, PublicClient } from "viem";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { decodePaymentRequiredHeader, decodePaymentResponseHeader } from "@x402/core/http";
import type { PaymentRequired } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { PAYER_ENS_HEADER, decide, readPolicy, verifySellerName, type Decision, type PaymentTerms, type Policy, type Screening } from "../../shared/src";
import type { ApprovalStore, PendingApproval } from "./approvals";
import type { PaymentLedger, PaymentRecord } from "./ledger";
import type { OnchainSpend } from "./onchain-spend";
import type { PaymentScreener } from "./screening";
import type { WorldApprovalClient } from "./world-approval";

export const PAYMENT_NETWORK = "eip155:84532";

export type PurchaseRequest = { url: string; sellerName: string };
export type PurchaseResult = { record: PaymentRecord; approval: PendingApproval | null };

type GateResult = { decision: Decision; screening: Screening; policy: Policy | null };

export type PaymentAgentDeps = {
  ensClient: PublicClient;
  agentName: string;
  account: LocalAccount;
  screener: PaymentScreener;
  ledger: PaymentLedger;
  approvals: ApprovalStore;
  world: WorldApprovalClient | null;
  onchainSpend: OnchainSpend | null;
};

export class PaymentAgent {
  constructor(private readonly deps: PaymentAgentDeps) {}

  async purchase(request: PurchaseRequest, approvalId: string | null = null): Promise<PurchaseResult> {
    const quote = await this.fetchPaymentTerms(request.url);
    if ("rejection" in quote) return this.sellerRejected(request, quote.rejection);
    const paymentRequired = quote.paymentRequired;
    const requirements = paymentRequired.accepts.find((a) => a.network === PAYMENT_NETWORK && a.scheme === "exact");
    if (!requirements) throw new Error(`Seller at ${request.url} does not accept exact payments on ${PAYMENT_NETWORK}`);

    const payTo = requirements.payTo as Address;
    const terms: PaymentTerms = {
      sellerName: await verifySellerName(this.deps.ensClient, request.sellerName, payTo),
      payTo,
      amount: BigInt(requirements.amount),
      asset: requirements.asset as Address,
      network: requirements.network,
    };

    let gate: GateResult | null = null;
    const signer = {
      address: this.deps.account.address,
      signTypedData: async (typedData: Parameters<LocalAccount["signTypedData"]>[0]) => {
        gate = await this.runGate(terms, typedData, new URL(request.url).host, approvalId);
        if (gate.decision.outcome !== "pay") throw new Error(`decide() returned ${gate.decision.outcome}`);
        return this.deps.account.signTypedData(typedData);
      },
    };
    const client = new x402Client().register(PAYMENT_NETWORK, new ExactEvmScheme(signer)).setSpendControls(false);

    let payload;
    try {
      payload = await client.createPaymentPayload(paymentRequired);
    } catch (error) {
      if (!gate) return this.fail(request, terms, `Could not create payment: ${(error as Error).message}`);
      return this.handleNotPaid(request, terms, gate, approvalId);
    }
    return this.sendPayment(request, terms, gate!, client, payload, approvalId);
  }

  payments(): Promise<PaymentRecord[]> {
    return this.deps.ledger.list();
  }

  payment(id: string): Promise<PaymentRecord | null> {
    return this.deps.ledger.get(id);
  }

  approvals(): Promise<PendingApproval[]> {
    return this.deps.approvals.list();
  }

  async processApprovals(): Promise<void> {
    const { approvals, ledger, world } = this.deps;
    if (!world) return;
    for (const approval of await approvals.list()) {
      const record = await ledger.findByApproval(approval.id);
      if (!record) continue;
      const current = approval.status === "pending" ? await approvals.applyPollResult(approval.id, await world.poll(approval.deviceCode)) : approval;
      if (!current) continue;
      await this.settleApproval(record, current);
    }
  }

  private async settleApproval(record: PaymentRecord, approval: PendingApproval): Promise<void> {
    const { ledger } = this.deps;
    if (approval.status === "approved") {
      await ledger.updateOutcome(record.id, "approved", "Family approved via World ID");
      await this.purchase({ url: record.url, sellerName: record.sellerName.replace(/^unverified:/, "") }, approval.id);
    } else if (approval.status === "expired") {
      await ledger.updateOutcome(record.id, "approval_expired", "Family approval expired; nothing was paid");
    } else if (approval.status !== "pending") {
      await ledger.updateOutcome(record.id, "approval_denied", `Family approval ${approval.status}: ${approval.statusDetail ?? ""}; nothing was paid`);
    }
  }

  private identityHeaders(): Record<string, string> {
    return { [PAYER_ENS_HEADER]: this.deps.agentName };
  }

  private async fetchPaymentTerms(url: string): Promise<{ paymentRequired: PaymentRequired } | { rejection: string }> {
    const response = await fetch(url, { headers: this.identityHeaders() });
    const header = response.headers.get("PAYMENT-REQUIRED");
    if (response.status === 402 && header) return { paymentRequired: decodePaymentRequiredHeader(header) };
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { rejection: body.error ?? `Seller answered ${response.status} instead of payment terms` };
  }

  private async sellerRejected(request: PurchaseRequest, rejection: string): Promise<PurchaseResult> {
    const record = await this.deps.ledger.record({
      url: request.url,
      sellerName: request.sellerName,
      payTo: "",
      amount: 0n,
      outcome: "refused",
      rule: null,
      reason: `Seller refused: ${rejection}`,
      details: [],
      screening: null,
      txHash: null,
      approvalId: null,
    });
    return { record, approval: null };
  }

  private async runGate(terms: PaymentTerms, typedData: unknown, website: string, approvalId: string | null): Promise<GateResult> {
    const { ensClient, agentName, account, screener, approvals } = this.deps;
    const [policy, screening, monthSpend] = await Promise.all([
      readPolicy(ensClient, agentName),
      screener.screen(terms, typedData, account.address, website),
      this.monthSpend(),
    ]);
    const decision = decide({ terms, policy, monthSpend, screening });
    if (decision.outcome === "ask_family" && approvalId && (await approvals.consume(approvalId, terms))) {
      return { policy, screening, decision: { ...decision, outcome: "pay", reason: `Family approved via World ID (${decision.reason})` } };
    }
    return { policy, screening, decision };
  }

  // The ledger can only raise the figure, never lower it below what the chain shows was actually paid.
  private async monthSpend(): Promise<bigint> {
    const [ledgerSpend, chainSpend] = await Promise.all([
      this.deps.ledger.monthSpend(),
      this.deps.onchainSpend?.thisMonth().catch((error: Error) => {
        console.warn(`Onchain spend unavailable, using ledger: ${error.message}`);
        return 0n;
      }) ?? 0n,
    ]);
    return ledgerSpend > chainSpend ? ledgerSpend : chainSpend;
  }

  private async handleNotPaid(request: PurchaseRequest, terms: PaymentTerms, gate: GateResult, approvalId: string | null): Promise<PurchaseResult> {
    const { decision, screening, policy } = gate;
    const base = { url: request.url, sellerName: terms.sellerName, payTo: terms.payTo, amount: terms.amount, rule: decision.rule, details: decision.details, screening, txHash: null };

    if (decision.outcome === "refuse") {
      return { record: await this.deps.ledger.record({ ...base, outcome: "refused", reason: decision.reason, approvalId }), approval: null };
    }
    if (approvalId || !this.deps.world || !policy) {
      const reason = approvalId ? "Family approval does not match these payment terms" : "Family approval is unavailable";
      return { record: await this.deps.ledger.record({ ...base, outcome: "refused", reason, approvalId }), approval: null };
    }

    const authorization = await this.deps.world.startApproval();
    const approval = await this.deps.approvals.create(terms, decision.reason, policy.approver, authorization);
    const record = await this.deps.ledger.record({ ...base, outcome: "awaiting_approval", reason: decision.reason, approvalId: approval.id });
    return { record, approval };
  }

  private async sendPayment(
    request: PurchaseRequest,
    terms: PaymentTerms,
    gate: GateResult,
    client: x402Client,
    payload: Awaited<ReturnType<x402Client["createPaymentPayload"]>>,
    approvalId: string | null,
  ): Promise<PurchaseResult> {
    const headers = new x402HTTPClient(client).encodePaymentSignatureHeader(payload);
    const response = await fetch(request.url, { headers: { ...headers, ...this.identityHeaders() } });
    const receiptHeader = response.headers.get("PAYMENT-RESPONSE");
    const receipt = receiptHeader ? decodePaymentResponseHeader(receiptHeader) : null;
    if (response.status !== 200 || !receipt?.success) {
      return this.fail(request, terms, `Seller rejected payment (${response.status}): ${await response.text()}`, gate.screening);
    }
    const record = await this.deps.ledger.record({
      url: request.url,
      sellerName: terms.sellerName,
      payTo: terms.payTo,
      amount: terms.amount,
      outcome: "paid",
      rule: gate.decision.rule,
      reason: gate.decision.reason,
      details: gate.decision.details,
      screening: gate.screening,
      txHash: receipt.transaction,
      approvalId,
    });
    return { record, approval: null };
  }

  private async fail(request: PurchaseRequest, terms: PaymentTerms, reason: string, screening: Screening | null = null): Promise<PurchaseResult> {
    const record = await this.deps.ledger.record({
      url: request.url,
      sellerName: terms.sellerName,
      payTo: terms.payTo,
      amount: terms.amount,
      outcome: "failed",
      rule: null,
      reason,
      details: [],
      screening,
      txHash: null,
      approvalId: null,
    });
    return { record, approval: null };
  }
}
