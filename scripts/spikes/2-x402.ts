#!/usr/bin/env bun
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme as ExactEvmServerScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const NETWORK = "eip155:84532";
const PORT = 4021;

const buyer = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const sellerPayTo = privateKeyToAccount(process.env.SELLER_PRIVATE_KEY as `0x${string}`).address;

function startSeller() {
  const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
  const resourceServer = new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmServerScheme());
  const app = new Hono();
  app.use(
    paymentMiddleware(
      {
        "GET /pharmacy": {
          accepts: { scheme: "exact", price: "$0.01", network: NETWORK, payTo: sellerPayTo },
          description: "Pharmacy delivery",
        },
      },
      resourceServer,
    ),
  );
  app.get("/pharmacy", (c) => c.json({ order: "prescription", status: "confirmed" }));
  return Bun.serve({ port: PORT, fetch: app.fetch });
}

const inspectedTypedData: unknown[] = [];
const signer = {
  address: buyer.address,
  signTypedData: async (typedData: Parameters<typeof buyer.signTypedData>[0]) => {
    inspectedTypedData.push(typedData);
    return buyer.signTypedData(typedData);
  },
};

const client = new x402Client().register(NETWORK, new ExactEvmScheme(signer));
let refuseNext = false;
client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
  console.log("Terms before signing:", selectedRequirements);
  if (refuseNext) return { abort: true, reason: "refused by decide()" };
});

const server = startSeller();
const payingFetch = wrapFetchWithPayment(fetch, client);
const url = `http://localhost:${PORT}/pharmacy`;

try {
  refuseNext = true;
  const refused = await payingFetch(url).then(
    () => "paid",
    (error: Error) => error.message,
  );
  console.log("Refusal path:", refused, `(typed data signed: ${inspectedTypedData.length})`);

  refuseNext = false;
  const response = await payingFetch(url);
  const receiptHeader = response.headers.get("PAYMENT-RESPONSE");
  console.log("Typed data inspected before signing:", JSON.stringify(inspectedTypedData.at(-1), (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  console.log("Status:", response.status, await response.text());
  if (receiptHeader) console.log("Receipt:", decodePaymentResponseHeader(receiptHeader));

  const passed = response.status === 200 && Boolean(receiptHeader) && inspectedTypedData.length === 1;
  console.log(passed ? "\nSPIKE 2 PASS" : "\nSPIKE 2 FAIL");
} finally {
  server.stop();
}
