export type SellerId = "pharmacy" | "grocery" | "taxi" | "refund";

export type SellerListing = {
  id: SellerId;
  ensName: string;
  path: string;
  priceUsd: string;
  description: string;
  isScam: boolean;
};

export const SELLERS: SellerListing[] = [
  { id: "pharmacy", ensName: "pharmacy.omamori-demo.eth", path: "/api/sellers/pharmacy", priceUsd: "$1", description: "Pharmacy delivery: repeat prescription", isScam: false },
  { id: "grocery", ensName: "grocery.omamori-demo.eth", path: "/api/sellers/grocery", priceUsd: "$1", description: "Grocery delivery: weekly basket", isScam: false },
  { id: "taxi", ensName: "taxi.omamori-demo.eth", path: "/api/sellers/taxi", priceUsd: "$8", description: "Taxi booking: airport run", isScam: false },
  { id: "refund", ensName: "refund-desk.eth", path: "/api/sellers/refund", priceUsd: "$5", description: "Urgent refund processing fee", isScam: true },
];

export function findSeller(id: string): SellerListing {
  const seller = SELLERS.find((s) => s.id === id);
  if (!seller) throw new Error(`Unknown seller "${id}". Known: ${SELLERS.map((s) => s.id).join(", ")}`);
  return seller;
}

export const SELLER_NETWORK = "eip155:84532" as const;

export function sellerPayTo(seller: SellerListing): `0x${string}` {
  const address = seller.isScam ? process.env.SCAM_PAY_TO : process.env.SELLER_ADDRESS;
  if (!address) throw new Error(seller.isScam ? "SCAM_PAY_TO must be set" : "SELLER_ADDRESS must be set");
  return address as `0x${string}`;
}
