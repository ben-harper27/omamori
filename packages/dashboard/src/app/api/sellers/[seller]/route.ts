import { NextResponse, type NextRequest } from "next/server";
import { withX402 } from "@x402/next";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
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

export async function GET(request: NextRequest, context: RouteContext<"/api/sellers/[seller]">) {
  const { seller: sellerId } = await context.params;
  const seller = SELLERS.find((s) => s.id === sellerId);
  if (!seller) return NextResponse.json({ error: `Unknown seller ${sellerId}` }, { status: 404 });

  let handler = handlers.get(seller.id);
  if (!handler) {
    handler = createHandler(seller);
    handlers.set(seller.id, handler);
  }
  return handler(request);
}
