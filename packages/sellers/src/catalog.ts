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
  { id: "pharmacy", ensName: "pharmacy.omamori-demo.eth", path: "/pharmacy/prescription", priceUsd: "$1", description: "Pharmacy delivery: repeat prescription", isScam: false },
  { id: "grocery", ensName: "grocery.omamori-demo.eth", path: "/grocery/weekly", priceUsd: "$1", description: "Grocery delivery: weekly basket", isScam: false },
  { id: "taxi", ensName: "taxi.omamori-demo.eth", path: "/taxi/airport", priceUsd: "$8", description: "Taxi booking: airport run", isScam: false },
  { id: "refund", ensName: "refund-desk.eth", path: "/refund/urgent-fee", priceUsd: "$5", description: "Urgent refund processing fee", isScam: true },
];

export function findSeller(id: string): SellerListing {
  const seller = SELLERS.find((s) => s.id === id);
  if (!seller) throw new Error(`Unknown seller "${id}". Known: ${SELLERS.map((s) => s.id).join(", ")}`);
  return seller;
}
