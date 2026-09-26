import { createNeonClient, createPaymentAgent, ensureSchema, getConfig, type PaymentAgent } from "@omamori/agent";

let paymentAgent: PaymentAgent | null = null;
let schemaReady: Promise<void> | null = null;

export async function getPaymentAgent(): Promise<PaymentAgent> {
  if (!schemaReady) schemaReady = ensureSchema(createNeonClient(getConfig().databaseUrl));
  await schemaReady;
  if (!paymentAgent) paymentAgent = createPaymentAgent();
  return paymentAgent;
}

export function jsonResponse(value: unknown, status = 200): Response {
  const body = JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v));
  return new Response(body, { status, headers: { "Content-Type": "application/json" } });
}

export function errorResponse(error: unknown, status = 500): Response {
  return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, status);
}
