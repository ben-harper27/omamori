#!/usr/bin/env bun
import { createPublicClient, createWalletClient, http, toHex, type Address, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { EnsAdmin, POLICY_KEYS, dnsEncode, labelId, permissionedResolverAbi, readPolicy, registryAbi } from "../../packages/shared/src";

const RPC_URL = process.env.SEPOLIA_RPC_URL!;
const IS_FORK = process.env.FORK === "1";
const KEEP_NAME = process.env.KEEP_NAME === "1";
const AGENT_LABEL = "obaachan";

const family = privateKeyToAccount(process.env.FAMILY_PRIVATE_KEY as `0x${string}`);
const agent = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) }) as PublicClient;
const familyWallet = createWalletClient({ account: family, chain: sepolia, transport: http(RPC_URL) });
const agentWallet = createWalletClient({ account: agent, chain: sepolia, transport: http(RPC_URL) });

async function forkRpc(method: string, params: unknown[]) {
  await publicClient.request({ method: method as never, params: params as never });
}

async function skipCommitmentWait() {
  await forkRpc("evm_increaseTime", [61]);
  await forkRpc("evm_mine", []);
}

const admin = new EnsAdmin(publicClient, familyWallet, IS_FORK ? skipCommitmentWait : undefined);

const results: [string, boolean][] = [];
function check(label: string, passed: boolean) {
  results.push([label, passed]);
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);
}

async function agentCanSetText(resolver: Address, name: string, key: string, value: string): Promise<boolean> {
  const call = { address: resolver, abi: permissionedResolverAbi, functionName: "setText", args: [dnsEncode(name), key, value] } as const;
  try {
    await publicClient.simulateContract({ account: agent, ...call });
  } catch (error) {
    console.log(`      agent setText(${key}) reverted: ${(error as Error).message.split("\n")[0]}`);
    return false;
  }
  await admin.confirm(await agentWallet.writeContract(call));
  return true;
}

async function transferIsBlocked(registry: Address): Promise<boolean> {
  const tokenId = await publicClient.readContract({ address: registry, abi: registryAbi, functionName: "getTokenId", args: [labelId(AGENT_LABEL)] });
  try {
    await publicClient.simulateContract({ account: family, address: registry, abi: registryAbi, functionName: "unsafeTransfer", args: [agent.address, tokenId, "0x"] });
    return false;
  } catch (error) {
    console.log(`      transfer reverted: ${(error as Error).message.split("\n").slice(0, 3).join(" ")}`);
    return true;
  }
}

if (IS_FORK) {
  for (const address of [family.address, agent.address]) await forkRpc("anvil_setBalance", [address, toHex(10n ** 18n)]);
}

const parentLabel = process.env.PARENT_LABEL ?? `tanaka-${Math.random().toString(36).slice(2, 8)}`;
const agentName = `${AGENT_LABEL}.${parentLabel}.eth`;
console.log(`Family ${family.address}\nAgent  ${agent.address}\nName   ${agentName}${IS_FORK ? " (fork)" : ""}\n`);

const parentResolver = await admin.deployResolver();
await admin.registerEthName(parentLabel, parentResolver);
const userRegistry = await admin.attachSubregistry(parentLabel);
const agentResolver = await admin.deployResolver();
await admin.registerSubname(userRegistry, AGENT_LABEL, agentResolver);
console.log(`Registered ${agentName} with its own resolver ${agentResolver}`);

await admin.setRecords(
  agentResolver,
  agentName,
  {
    [POLICY_KEYS.maxPerPayment]: "20000000",
    [POLICY_KEYS.approvalThreshold]: "3000000",
    [POLICY_KEYS.monthlyCap]: "50000000",
    [POLICY_KEYS.allowlist]: "",
    [POLICY_KEYS.approver]: process.env.WORLD_APPROVER_SUB ?? "",
    description: "Tanaka family shopping assistant",
  },
  agent.address,
);
await admin.grantTextKey(agentResolver, "description", agent.address);

check("family set omamori.* records, readable via Universal Resolver", (await readPolicy(publicClient, agentName))?.maxPerPayment === 20_000_000n);
check("addr record resolves to agent wallet", (await publicClient.getEnsAddress({ name: agentName })) === agent.address);
check("agent can update description", await agentCanSetText(agentResolver, agentName, "description", "Obaachan's helper"));
check("agent cannot raise omamori.maxPerPayment", !(await agentCanSetText(agentResolver, agentName, POLICY_KEYS.maxPerPayment, "999000000")));
check("policy unchanged after agent attempt", (await readPolicy(publicClient, agentName))?.maxPerPayment === 20_000_000n);
check("subname is non-transferable", await transferIsBlocked(userRegistry));

if (!KEEP_NAME) {
  await admin.unregisterSubname(userRegistry, AGENT_LABEL);
  const status = await publicClient.readContract({ address: userRegistry, abi: registryAbi, functionName: "getStatus", args: [labelId(AGENT_LABEL)] });
  check("revoked subname status is not registered", status !== 2);
  check("revoked subname yields no policy (decide refuses)", (await readPolicy(publicClient, agentName)) === null);
}

console.log(`\nParent registry ${userRegistry}\nAgent resolver ${agentResolver}\nParent resolver ${parentResolver}`);
const failed = results.filter(([, passed]) => !passed).length;
console.log(failed === 0 ? "\nSPIKE 1 PASS" : `\nSPIKE 1 FAIL (${failed} checks)`);
