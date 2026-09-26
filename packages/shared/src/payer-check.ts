import type { Address, PublicClient } from "viem";
import { normalize } from "viem/ens";
import { addressVerdict, type InterceptaClient } from "./intercepta";

export const PAYER_ENS_HEADER = "X-Payer-ENS";

// Seller-side: returns a rejection reason, or null when the payer may pay.
export async function checkPayer(
  ensClient: PublicClient,
  intercepta: InterceptaClient | null,
  payerName: string | null,
  payerAddress: Address | null,
): Promise<string | null> {
  if (!payerName) return `Payer must identify itself with an ENS name in the ${PAYER_ENS_HEADER} header`;

  let name: string;
  try {
    name = normalize(payerName);
  } catch {
    return `Payer ENS name "${payerName}" is not a valid name`;
  }

  const resolved = await ensClient.getEnsAddress({ name }).catch(() => null);
  if (!resolved) return `Payer ENS name ${name} is not active (revoked or never registered)`;
  if (!payerAddress) return null;
  if (resolved.toLowerCase() !== payerAddress.toLowerCase()) {
    return `Paying wallet ${payerAddress} is not the addr record of ${name}`;
  }

  if (intercepta) {
    const verdict = addressVerdict(await intercepta.deepScanAddress(payerAddress));
    if (verdict.level === "high") return `Intercepta flagged the payer: ${verdict.reasons.join("; ")}`;
  }
  return null;
}
