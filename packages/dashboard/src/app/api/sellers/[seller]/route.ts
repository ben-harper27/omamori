import { NextResponse, type NextRequest } from "next/server";
import { withX402 } from "@x402/next";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { Address } from "viem";
import { createEnsClient } from "@omamori/agent";
import { InterceptaClient, PAYER_ENS_HEADER, checkPayer } from "@omamori/shared";
import { SELLERS, SELLER_NETWORK, sellerPayTo, type SellerListing } from "@omamori/sellers/catalog";

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

type Handler = (request: NextRequest) => Promise<NextResponse>;
const handlers = new Map<string, Handler>();

function createHandler(seller: SellerListing): Handler {
  const server = new x402ResourceServer(new HTTPFacilitatorClient({ url: FACILITATOR_URL })).register(SELLER_NETWORK, new ExactEvmScheme());
  const fulfil = async () =>
    NextResponse.json({ seller: seller.ensName, item: seller.description, status: "confirmed", orderId: crypto.randomUUID() });
  return withX402(
    fulfil,
    { [seller.path]: { accepts: { scheme: "exact", price: seller.priceUsd, network: SELLER_NETWORK, payTo: sellerPayTo(seller) }, description: seller.description } },
    server,
  );
}

function payingWallet(request: NextRequest): Address | null {
  const header = request.headers.get("PAYMENT-SIGNATURE");
  if (!header) return null;
  const payload = decodePaymentSignatureHeader(header).payload as { authorization?: { from?: string } };
  return (payload.authorization?.from as Address | undefined) ?? null;
}

async function rejectionReason(request: NextRequest): Promise<string | null> {
  const intercepta = process.env.INTERCEPTA_API_KEY ? new InterceptaClient(process.env.INTERCEPTA_API_KEY) : null;
  return checkPayer(createEnsClient(), intercepta, request.headers.get(PAYER_ENS_HEADER), payingWallet(request));
}

export async function GET(request: NextRequest, context: RouteContext<"/api/sellers/[seller]">) {
  const { seller: sellerId } = await context.params;
  const seller = SELLERS.find((s) => s.id === sellerId);
  if (!seller) return NextResponse.json({ error: `Unknown seller ${sellerId}` }, { status: 404 });

  // Legit sellers verify the payer's ENS identity before quoting or accepting; the scam seller takes anyone's money.
  if (!seller.isScam) {
    const reason = await rejectionReason(request);
    if (reason) return NextResponse.json({ error: reason }, { status: 403 });
  }

  let handler = handlers.get(seller.id);
  if (!handler) {
    handler = createHandler(seller);
    handlers.set(seller.id, handler);
  }
  return handler(request);
}
