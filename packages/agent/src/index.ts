import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createPublicClient, http, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { InterceptaClient } from "../../shared/src";
import { ApprovalStore } from "./approvals";
import { config } from "./config";
import { PaymentLedger } from "./ledger";
import { PaymentAgent } from "./payment-agent";
import { PaymentScreener } from "./screening";
import { WorldApprovalClient } from "./world-approval";

export function createPaymentAgent(): PaymentAgent {
  mkdirSync(dirname(config.databasePath), { recursive: true });
  return new PaymentAgent({
    ensClient: createPublicClient({ chain: sepolia, transport: http(config.sepoliaRpcUrl) }) as PublicClient,
    agentName: config.agentName,
    account: privateKeyToAccount(config.agentPrivateKey),
    screener: new PaymentScreener(config.interceptaApiKey ? new InterceptaClient(config.interceptaApiKey) : null),
    ledger: new PaymentLedger(config.databasePath),
    approvals: new ApprovalStore(config.databasePath),
    world: config.worldClientId ? new WorldApprovalClient(config.worldClientId, config.worldClientSecret) : null,
  });
}

export { PaymentAgent } from "./payment-agent";
export { config } from "./config";
