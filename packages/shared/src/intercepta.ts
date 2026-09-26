import type { Address } from "viem";
import type { RiskLevel, ScreeningVerdict } from "./types";

const BASE_URL = "https://api.web3antivirus.io/api/public/v2/extension";

type Trait = { risk: number; name: string; txsCount: number; description: string };
export type AddressScanResponse = { toxicScore: number; traits: Trait[] };

type Detector = { code: string; description: string };
export type TokenScanResponse = {
  riskLevel: "neutral" | "low" | "medium" | "high";
  trust: "whitelist" | "blocklist" | "neutral";
  action: "block" | "warn" | "info";
  detectors: Detector[];
  token: { chainId: string; address: string; symbol: string };
};

export type SignatureScanResponse = {
  riskGroup: "Low" | "Medium" | "High";
  detectors: Detector[];
  addresses: { address: string; type: string; detectors: string[] }[];
};

const HIGH_RISK_TRAITS = new Set([
  "sanction_address",
  "known_scammer",
  "blacklist",
  "fake_phishing_transfer",
  "fake_phishing_contract_communication",
  "initiator_scam_transactions",
  "attack_money_target",
]);
const HIGH_RISK_TOKEN_DETECTORS = new Set(["FAKE_TOKEN", "HONEYPOT", "SANCTIONED_TOKEN", "KNOWN_MALICIOUS"]);
const HIGH_RISK_SIGNATURE_DETECTORS = new Set([
  "WALLET_DRAINER",
  "KNOWN_MALICIOUS",
  "SCAM_ADDRESS",
  "BLOCKLIST_SITE",
  "POISONING_ATTACK",
  "INITIATOR_SCAM_TRANSACTIONS",
]);
const POSITIVE_TOKEN_DETECTORS = new Set(["HIGH_REPUTATION_TOKEN"]);

export class InterceptaClient {
  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error("INTERCEPTA_API_KEY is not set");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "X-API-KEY": this.apiKey, "Content-Type": "application/json", ...init.headers },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Intercepta ${path} failed (${response.status}): ${body}`);
    return JSON.parse(body) as T;
  }

  quickScanAddress(address: Address): Promise<AddressScanResponse> {
    return this.request(`/account/${address}/quick-scan`);
  }

  deepScanAddress(address: Address): Promise<AddressScanResponse> {
    return this.request(`/account/${address}/toxic-score`);
  }

  scanToken(address: Address, chainId: string): Promise<TokenScanResponse> {
    return this.request(`/token-intelligence/token/${address}/risks?chainId=${chainId}`);
  }

  scanTypedData(from: Address, typedData: unknown, chainId: string, website: string): Promise<SignatureScanResponse> {
    const message = JSON.stringify(typedData, (_key, value) => (typeof value === "bigint" ? value.toString() : value));
    return this.request("/analysis/signature", {
      method: "POST",
      body: JSON.stringify({ from, message, chainId, website }),
    });
  }
}

function describe(detectors: Detector[]): string[] {
  return detectors.map((d) => `${d.code}: ${d.description}`);
}

export function addressVerdict(scan: AddressScanResponse): ScreeningVerdict {
  if (scan.traits.length === 0) return { level: "clean", reasons: [] };
  const isHigh = scan.traits.some((t) => HIGH_RISK_TRAITS.has(t.name));
  const reasons = scan.traits.map((t) => `${t.name}: ${t.description}`);
  return { level: isHigh ? "high" : "warning", reasons };
}

export function tokenVerdict(scan: TokenScanResponse): ScreeningVerdict {
  const risky = scan.detectors.filter((d) => !POSITIVE_TOKEN_DETECTORS.has(d.code));
  const reasons = describe(risky);
  const isHigh =
    scan.action === "block" ||
    scan.trust === "blocklist" ||
    scan.riskLevel === "high" ||
    risky.some((d) => HIGH_RISK_TOKEN_DETECTORS.has(d.code));
  if (isHigh) return { level: "high", reasons };
  if (scan.action === "warn" || scan.riskLevel === "medium") return { level: "warning", reasons };
  return { level: "clean", reasons };
}

export function signatureVerdict(scan: SignatureScanResponse): ScreeningVerdict {
  const codes = [...scan.detectors.map((d) => d.code), ...scan.addresses.flatMap((a) => a.detectors)];
  const reasons = describe(scan.detectors);
  let level: RiskLevel = "clean";
  if (scan.riskGroup === "Medium" || codes.length > 0) level = "warning";
  if (scan.riskGroup === "High" || codes.some((c) => HIGH_RISK_SIGNATURE_DETECTORS.has(c))) level = "high";
  return { level, reasons };
}
