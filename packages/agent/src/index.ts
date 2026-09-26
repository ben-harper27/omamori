import { createPublicClient, createWalletClient, http, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { InterceptaClient } from "../../shared/src";
import { ApprovalStore } from "./approvals";
import { Assistant } from "./assistant";
import { getConfig } from "./config";
import { createNeonClient } from "./db";
import { PaymentLedger } from "./ledger";
import { OnchainSpend } from "./onchain-spend";
import { PaymentAgent } from "./payment-agent";
import { PaymentScreener } from "./screening";
import { attemptOwnRecordUpdate } from "./self-policy";
import { WorldApprovalClient } from "./world-approval";

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export function createEnsClient(): PublicClient {
  return createPublicClient({ chain: sepolia, transport: http(getConfig().sepoliaRpcUrl) }) as PublicClient;
}

export function createPaymentAgent(): PaymentAgent {
  const config = getConfig();
  const sql = createNeonClient(config.databaseUrl);
  const account = privateKeyToAccount(config.agentPrivateKey);
  return new PaymentAgent({
    ensClient: createEnsClient(),
    agentName: config.agentName,
    account,
    screener: new PaymentScreener(config.interceptaApiKey ? new InterceptaClient(config.interceptaApiKey) : null),
    ledger: new PaymentLedger(sql),
    approvals: new ApprovalStore(sql),
    world: config.worldClientId ? new WorldApprovalClient(config.worldClientId, config.worldClientSecret) : null,
    onchainSpend: new OnchainSpend(config.baseSepoliaRpcUrl, BASE_SEPOLIA_USDC, account.address),
  });
}

export function createAssistant(paymentAgent: PaymentAgent, sellersBaseUrl: string): Assistant {
  const config = getConfig();
  const ensClient = createEnsClient();
  const agentWallet = createWalletClient({ account: privateKeyToAccount(config.agentPrivateKey), chain: sepolia, transport: http(config.sepoliaRpcUrl) });
  return new Assistant({
    paymentAgent,
    sellersBaseUrl,
    updateOwnRecord: (key, value) => attemptOwnRecordUpdate(ensClient, agentWallet, config.agentName, key, value),
  });
}

export { PaymentAgent } from "./payment-agent";
export { getConfig } from "./config";
export { createNeonClient, ensureSchema } from "./db";
export type { ChatHistory } from "./assistant";
export type { PaymentRecord } from "./ledger";
export type { PendingApproval } from "./approvals";
