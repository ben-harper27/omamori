import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createPublicClient, createWalletClient, http, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { InterceptaClient } from "../../shared/src";
import { ApprovalStore } from "./approvals";
import { Assistant } from "./assistant";
import { config } from "./config";
import { PaymentLedger } from "./ledger";
import { PaymentAgent } from "./payment-agent";
import { PaymentScreener } from "./screening";
import { attemptOwnRecordUpdate } from "./self-policy";
import { WorldApprovalClient } from "./world-approval";

function createEnsClient(): PublicClient {
  return createPublicClient({ chain: sepolia, transport: http(config.sepoliaRpcUrl) }) as PublicClient;
}

export function createPaymentAgent(): PaymentAgent {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  return new PaymentAgent({
    ensClient: createEnsClient(),
    agentName: config.agentName,
    account: privateKeyToAccount(config.agentPrivateKey),
    screener: new PaymentScreener(config.interceptaApiKey ? new InterceptaClient(config.interceptaApiKey) : null),
    ledger: new PaymentLedger(config.databasePath),
    approvals: new ApprovalStore(config.databasePath),
    world: config.worldClientId ? new WorldApprovalClient(config.worldClientId, config.worldClientSecret) : null,
  });
}

export function createAssistant(paymentAgent: PaymentAgent): Assistant {
  const ensClient = createEnsClient();
  const agentWallet = createWalletClient({ account: privateKeyToAccount(config.agentPrivateKey), chain: sepolia, transport: http(config.sepoliaRpcUrl) });
  return new Assistant({
    paymentAgent,
    updateOwnRecord: (key, value) => attemptOwnRecordUpdate(ensClient, agentWallet, config.agentName, key, value),
  });
}

export { PaymentAgent } from "./payment-agent";
export { config } from "./config";
