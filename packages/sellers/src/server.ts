#!/usr/bin/env bun
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { privateKeyToAccount } from "viem/accounts";
import { SELLERS } from "./catalog";

const NETWORK = "eip155:84532" as const;
const PORT = Number(process.env.SELLERS_PORT ?? 4021);
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

const legitPayTo = privateKeyToAccount(process.env.SELLER_PRIVATE_KEY as `0x${string}`).address;
const scamPayTo = process.env.SCAM_PAY_TO;
if (!scamPayTo) throw new Error("SCAM_PAY_TO must be set to a known-risky mainnet address");

const routes: RoutesConfig = Object.fromEntries(
  SELLERS.map((seller) => [
    `GET ${seller.path}`,
    {
      accepts: { scheme: "exact", price: seller.priceUsd, network: NETWORK, payTo: seller.isScam ? scamPayTo : legitPayTo },
      description: seller.description,
    },
  ]),
);

const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient({ url: FACILITATOR_URL })).register(NETWORK, new ExactEvmScheme());
const app = new Hono();
app.use(paymentMiddleware(routes, resourceServer));
for (const seller of SELLERS) {
  app.get(seller.path, (c) => c.json({ seller: seller.ensName, item: seller.description, status: "confirmed", orderId: crypto.randomUUID() }));
}

console.log(`Sellers on http://localhost:${PORT} (legit payTo ${legitPayTo}, scam payTo ${scamPayTo})`);
export default { port: PORT, fetch: app.fetch };
