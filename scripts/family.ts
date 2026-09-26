#!/usr/bin/env bun
import { createPublicClient, createWalletClient, http, type Address, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { EnsAdmin, readPolicy } from "../packages/shared/src";

const USAGE = "Usage: bun scripts/family.ts <revoke|restore|status>";
const action = process.argv[2];
if (!["revoke", "restore", "status"].includes(action ?? "")) throw new Error(USAGE);

const rpcUrl = process.env.SEPOLIA_RPC_URL!;
const agentName = process.env.OMAMORI_AGENT_NAME!;
const registry = process.env.OMAMORI_AGENT_REGISTRY as Address;
const resolver = process.env.OMAMORI_AGENT_RESOLVER as Address;
const label = agentName.split(".")[0];

const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) }) as PublicClient;
const family = privateKeyToAccount(process.env.FAMILY_PRIVATE_KEY as `0x${string}`);
const admin = new EnsAdmin(publicClient, createWalletClient({ account: family, chain: sepolia, transport: http(rpcUrl) }));

if (action === "revoke") {
  await admin.unregisterSubname(registry, label);
  console.log(`Revoked ${agentName}`);
}
if (action === "restore") {
  // Records live on the agent's own resolver, so re-registering with it brings the policy back unchanged.
  await admin.registerSubname(registry, label, resolver);
  console.log(`Restored ${agentName} with resolver ${resolver}`);
}

const policy = await readPolicy(publicClient, agentName);
console.log(`${agentName}: ${policy ? `active, maxPerPayment ${policy.maxPerPayment}` : "inactive (agent refuses everything)"}`);
