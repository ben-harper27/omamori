#!/usr/bin/env bun
import { createPublicClient, createWalletClient, http, type Address, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { EnsAdmin, POLICY_KEYS } from "../packages/shared/src";
import { SELLERS } from "../packages/sellers/src/catalog";

const RPC_URL = process.env.SEPOLIA_RPC_URL!;
const SELLER_PARENT = "omamori-demo";
const AGENT_NAME = process.env.OMAMORI_AGENT_NAME!;

const family = privateKeyToAccount(process.env.FAMILY_PRIVATE_KEY as `0x${string}`);
const sellerPayTo = privateKeyToAccount(process.env.SELLER_PRIVATE_KEY as `0x${string}`).address;
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) }) as PublicClient;
const admin = new EnsAdmin(publicClient, createWalletClient({ account: family, chain: sepolia, transport: http(RPC_URL) }));

const legitSellers = SELLERS.filter((s) => !s.isScam);
for (const seller of legitSellers) {
  if (!seller.ensName.endsWith(`.${SELLER_PARENT}.eth`)) throw new Error(`${seller.ensName} is not under ${SELLER_PARENT}.eth`);
}
if (!(await admin.isEthNameAvailable(SELLER_PARENT))) throw new Error(`${SELLER_PARENT}.eth is already registered; nothing to do`);

const resolver = await admin.deployResolver();
await admin.registerEthName(SELLER_PARENT, resolver);
const registry = await admin.attachSubregistry(SELLER_PARENT);
console.log(`Registered ${SELLER_PARENT}.eth (resolver ${resolver}, registry ${registry})`);

for (const seller of legitSellers) {
  const label = seller.ensName.split(".")[0];
  await admin.registerSubname(registry, label, resolver);
  await admin.setRecords(resolver, seller.ensName, { description: seller.description }, sellerPayTo);
  console.log(`Registered ${seller.ensName} -> ${sellerPayTo}`);
}

const agentResolver = (await publicClient.getEnsResolver({ name: AGENT_NAME })) as Address;
const allowlist = legitSellers.map((s) => s.ensName).join(",");
await admin.setRecords(agentResolver, AGENT_NAME, { [POLICY_KEYS.allowlist]: allowlist });
console.log(`Set ${POLICY_KEYS.allowlist} on ${AGENT_NAME}: ${allowlist}`);

for (const seller of legitSellers) {
  console.log(`check ${seller.ensName} addr = ${await publicClient.getEnsAddress({ name: seller.ensName })}`);
}
