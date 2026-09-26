#!/usr/bin/env bun
import { config, createPaymentAgent } from "../packages/agent/src";
import { findSeller } from "../packages/sellers/src/catalog";

const [sellerId, ...flags] = process.argv.slice(2);
if (!sellerId) throw new Error("Usage: bun scripts/purchase.ts <pharmacy|grocery|taxi|refund> [--wait]");

const seller = findSeller(sellerId);
const agent = createPaymentAgent();
const { record, approval } = await agent.purchase({ url: `${config.sellersBaseUrl}${seller.path}`, sellerName: seller.ensName });

function show(label: string, value: unknown) {
  console.log(label.padEnd(12), typeof value === "string" ? value : JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
}

show("Outcome", record.outcome);
show("Rule", String(record.rule));
show("Reason", record.reason);
if (record.details.length) show("Details", record.details);
if (record.screening) show("Screening", record.screening);
if (record.txHash) show("Tx", `https://sepolia.basescan.org/tx/${record.txHash}`);

if (approval) {
  show("Approve at", approval.verificationUri);
  show("Code", approval.userCode);
  if (flags.includes("--wait")) {
    console.log("\nWaiting for the family decision...");
    let current = record;
    while (current.outcome === "awaiting_approval") {
      await Bun.sleep(5000);
      await agent.processApprovals();
      current = (await agent.payment(record.id)) ?? current;
    }
    show("Decision", `${current.outcome}: ${current.reason}`);
    const followUp = (await agent.payments()).find((p) => p.approvalId === approval.id && p.id !== record.id);
    if (followUp) {
      show("Follow-up", `${followUp.outcome}: ${followUp.reason}`);
      if (followUp.txHash) show("Tx", `https://sepolia.basescan.org/tx/${followUp.txHash}`);
    }
  }
}
