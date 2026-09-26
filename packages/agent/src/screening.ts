import type { Address } from "viem";
import {
  addressVerdict,
  signatureVerdict,
  tokenVerdict,
  type InterceptaClient,
  type PaymentTerms,
  type Screening,
  type ScreeningVerdict,
} from "../../shared/src";

// Intercepta risk data is mainnet-only, so testnet USDC is screened as its mainnet counterpart.
const CANONICAL_USDC: Record<string, { testnet: Address; mainnet: Address; mainnetChainId: string }> = {
  "eip155:84532": {
    testnet: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    mainnet: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    mainnetChainId: "8453",
  },
};

function unavailable(error: unknown): ScreeningVerdict {
  return { level: "high", reasons: [`Screening unavailable, refusing to pay unscreened: ${(error as Error).message}`] };
}

async function safely(check: () => Promise<ScreeningVerdict>): Promise<ScreeningVerdict> {
  try {
    return await check();
  } catch (error) {
    return unavailable(error);
  }
}

export class PaymentScreener {
  private readonly tokenCache = new Map<string, ScreeningVerdict>();

  constructor(private readonly intercepta: InterceptaClient | null) {}

  async screen(terms: PaymentTerms, typedData: unknown, payer: Address, website: string): Promise<Screening> {
    const usdc = CANONICAL_USDC[terms.network];
    const client = this.intercepta;
    if (!client) {
      const missing = unavailable(new Error("INTERCEPTA_API_KEY is not set"));
      return { payTo: missing, token: missing, authorization: missing };
    }
    const [payTo, token, authorization] = await Promise.all([
      safely(async () => addressVerdict(await client.quickScanAddress(terms.payTo))),
      safely(() => this.screenToken(client, terms)),
      safely(async () => signatureVerdict(await client.scanTypedData(payer, typedData, usdc?.mainnetChainId ?? "1", website))),
    ]);
    return { payTo, token, authorization };
  }

  private async screenToken(client: InterceptaClient, terms: PaymentTerms): Promise<ScreeningVerdict> {
    const usdc = CANONICAL_USDC[terms.network];
    if (!usdc || usdc.testnet.toLowerCase() !== terms.asset.toLowerCase()) {
      return { level: "high", reasons: [`Token ${terms.asset} is not canonical USDC on ${terms.network}`] };
    }
    const cached = this.tokenCache.get(usdc.mainnet);
    if (cached) return cached;
    const verdict = tokenVerdict(await client.scanToken(usdc.mainnet, usdc.mainnetChainId));
    this.tokenCache.set(usdc.mainnet, verdict);
    return verdict;
  }
}
