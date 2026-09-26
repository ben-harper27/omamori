import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { POLICY_KEYS } from "../../shared/src";
import { SELLERS, findSeller } from "../../sellers/src/catalog";
import type { PaymentAgent } from "./payment-agent";
import type { SelfUpdateResult } from "./self-policy";

const MODEL = "claude-opus-5";

const SYSTEM_PROMPT = `You are Omamori, a gentle shopping and payments helper for an elderly woman in Japan (obaachan) whose family looks after her finances.
You can order from the sellers listed by list_sellers and pay them with the purchase tool.
You never decide whether a payment is allowed: the purchase tool applies the family's rules and safety screening, and reports whether it paid, refused, or is waiting for a family member to approve.
Report that outcome honestly and simply, including the reason. If it is waiting for approval, say a family member has been asked to approve.
If she asks you to change your spending limit, use update_my_spending_limit and tell her plainly what happened.
Keep replies short and warm. Show prices in USDC.`;

function describePurchase(result: Awaited<ReturnType<PaymentAgent["purchase"]>>): string {
  const { record, approval } = result;
  return JSON.stringify({
    outcome: record.outcome,
    rule: record.rule,
    reason: record.reason,
    details: record.details,
    amountUsdc: Number(record.amount) / 1_000_000,
    seller: record.sellerName,
    txHash: record.txHash,
    familyApprovalRequested: approval !== null,
  });
}

export type AssistantDeps = {
  paymentAgent: PaymentAgent;
  updateOwnRecord: (key: string, value: string) => Promise<SelfUpdateResult>;
};

export class Assistant {
  private readonly client = new Anthropic();
  private history: Anthropic.Beta.BetaMessageParam[] = [];
  private readonly tools;

  constructor(deps: AssistantDeps) {
    this.tools = [
      betaZodTool({
        name: "list_sellers",
        description: "List the shops and services you can order from, with prices in USD.",
        inputSchema: z.object({}),
        run: async () => JSON.stringify(SELLERS.map(({ id, description, priceUsd }) => ({ id, description, priceUsd }))),
      }),
      betaZodTool({
        name: "purchase",
        description: "Order and pay for one item from a seller. The family's rules decide whether it is paid, refused, or needs family approval.",
        inputSchema: z.object({ seller_id: z.enum(SELLERS.map((s) => s.id) as [string, ...string[]]) }),
        run: async ({ seller_id }) => {
          const seller = findSeller(seller_id);
          const result = await deps.paymentAgent.purchase({ url: `${process.env.SELLERS_BASE_URL ?? "http://localhost:4021"}${seller.path}`, sellerName: seller.ensName });
          return describePurchase(result);
        },
      }),
      betaZodTool({
        name: "update_my_spending_limit",
        description: "Change your own maximum amount per payment, in USDC. This sends an onchain transaction from your own key to your ENS policy record.",
        inputSchema: z.object({ max_per_payment_usdc: z.number().positive() }),
        run: async ({ max_per_payment_usdc }) => {
          const value = String(Math.round(max_per_payment_usdc * 1_000_000));
          const result = await deps.updateOwnRecord(POLICY_KEYS.maxPerPayment, value);
          return JSON.stringify({
            succeeded: result.succeeded,
            txHash: result.txHash,
            note: result.succeeded ? "Limit changed" : "Transaction reverted: only the family can change the spending policy",
          });
        },
      }),
    ];
  }

  async send(userMessage: string): Promise<string> {
    const runner = this.client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      tools: this.tools,
      messages: [...this.history, { role: "user", content: userMessage }],
    });
    const finalMessage = await runner.runUntilDone();
    this.history = [...runner.params.messages];
    const last = this.history.at(-1);
    if (last?.role !== "assistant") this.history.push({ role: "assistant", content: finalMessage.content });

    if (finalMessage.stop_reason === "refusal") return "(The assistant declined to respond.)";
    return finalMessage.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }
}
