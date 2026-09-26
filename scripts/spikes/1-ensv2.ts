#!/usr/bin/env bun
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  parseEventLogs,
  toHex,
  zeroAddress,
  type Address,
  type Hash,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  ALL_ROLES,
  ENS_V2,
  POLICY_KEYS,
  ROLE_SET_RESOLVER,
  dnsEncode,
  erc20Abi,
  ethRegistrarAbi,
  permissionedResolverAbi,
  readPolicy,
  registryAbi,
  verifiableFactoryAbi,
} from "../../packages/shared/src";

const RPC_URL = process.env.SEPOLIA_RPC_URL!;
const IS_FORK = process.env.FORK === "1";
const KEEP_NAME = process.env.KEEP_NAME === "1";
const ONE_YEAR = 365n * 24n * 60n * 60n;
const AGENT_LABEL = "obaachan";

const family = privateKeyToAccount(process.env.FAMILY_PRIVATE_KEY as `0x${string}`);
const agent = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) }) as PublicClient;
const familyWallet = createWalletClient({ account: family, chain: sepolia, transport: http(RPC_URL) });
const agentWallet = createWalletClient({ account: agent, chain: sepolia, transport: http(RPC_URL) });

const results: [string, boolean][] = [];
function check(label: string, passed: boolean) {
  results.push([label, passed]);
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);
}

async function confirm(hash: Hash) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return receipt;
}

function randomSalt(): bigint {
  return BigInt(toHex(crypto.getRandomValues(new Uint8Array(32))));
}

async function deployProxy(implementation: Address, initData: `0x${string}`): Promise<Address> {
  const hash = await familyWallet.writeContract({
    address: ENS_V2.verifiableFactory,
    abi: verifiableFactoryAbi,
    functionName: "deployProxy",
    args: [implementation, randomSalt(), initData],
  });
  const receipt = await confirm(hash);
  const [event] = parseEventLogs({ abi: verifiableFactoryAbi, logs: receipt.logs, eventName: "ProxyDeployed" });
  return event.args.proxyAddress;
}

function deployResolver(): Promise<Address> {
  const initData = encodeFunctionData({
    abi: permissionedResolverAbi,
    functionName: "initialize",
    args: [[{ account: family.address, roleBitmap: ALL_ROLES }], []],
  });
  return deployProxy(ENS_V2.permissionedResolverImpl, initData);
}

function deployUserRegistry(): Promise<Address> {
  const initData = encodeFunctionData({
    abi: registryAbi,
    functionName: "initialize",
    args: [[{ account: family.address, roleBitmap: ALL_ROLES }]],
  });
  return deployProxy(ENS_V2.userRegistryImpl, initData);
}

async function waitForCommitment() {
  if (IS_FORK) {
    await publicClient.request({ method: "evm_increaseTime" as never, params: [61] as never });
    await publicClient.request({ method: "evm_mine" as never, params: [] as never });
    return;
  }
  console.log("Waiting 65s for commit/reveal...");
  await Bun.sleep(65_000);
}

async function registerParent(label: string, resolver: Address) {
  const [basePrice, premium] = await publicClient.readContract({
    address: ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "getRegisterPrice",
    args: [label, ONE_YEAR, ENS_V2.mockUsdc],
  });
  const price = basePrice + premium;
  await confirm(await familyWallet.writeContract({ address: ENS_V2.mockUsdc, abi: erc20Abi, functionName: "mint", args: [family.address, price] }));
  await confirm(await familyWallet.writeContract({ address: ENS_V2.mockUsdc, abi: erc20Abi, functionName: "approve", args: [ENS_V2.ethRegistrar, price] }));

  const secret = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const referrer = toHex(0, { size: 32 });
  const commitment = await publicClient.readContract({
    address: ENS_V2.ethRegistrar,
    abi: ethRegistrarAbi,
    functionName: "makeCommitment",
    args: [label, family.address, secret, zeroAddress, resolver, ONE_YEAR, referrer],
  });
  await confirm(await familyWallet.writeContract({ address: ENS_V2.ethRegistrar, abi: ethRegistrarAbi, functionName: "commit", args: [commitment] }));
  await waitForCommitment();
  await confirm(
    await familyWallet.writeContract({
      address: ENS_V2.ethRegistrar,
      abi: ethRegistrarAbi,
      functionName: "register",
      args: [label, family.address, secret, zeroAddress, resolver, ONE_YEAR, ENS_V2.mockUsdc, referrer],
    }),
  );
}

async function setPolicyRecords(resolver: Address, name: string) {
  const dnsName = dnsEncode(name);
  const records: [string, string][] = [
    [POLICY_KEYS.maxPerPayment, "20000000"],
    [POLICY_KEYS.approvalThreshold, "3000000"],
    [POLICY_KEYS.monthlyCap, "50000000"],
    [POLICY_KEYS.allowlist, ""],
    [POLICY_KEYS.approver, process.env.WORLD_APPROVER_SUB ?? ""],
    ["description", "Tanaka family shopping assistant"],
  ];
  const calls = records.map(([key, value]) =>
    encodeFunctionData({ abi: permissionedResolverAbi, functionName: "setText", args: [dnsName, key, value] }),
  );
  calls.push(encodeFunctionData({ abi: permissionedResolverAbi, functionName: "setAddress", args: [dnsName, 60n, agent.address] }));
  await confirm(await familyWallet.writeContract({ address: resolver, abi: permissionedResolverAbi, functionName: "multicall", args: [calls] }));
}

async function grantAgentDescriptionOnly(resolver: Address) {
  const setter = encodeFunctionData({ abi: permissionedResolverAbi, functionName: "setText", args: ["0x", "description", ""] });
  await confirm(
    await familyWallet.writeContract({ address: resolver, abi: permissionedResolverAbi, functionName: "grantSetterRoles", args: [setter, agent.address] }),
  );
}

async function agentCanSetText(resolver: Address, name: string, key: string, value: string): Promise<boolean> {
  try {
    await publicClient.simulateContract({
      account: agent,
      address: resolver,
      abi: permissionedResolverAbi,
      functionName: "setText",
      args: [dnsEncode(name), key, value],
    });
  } catch (error) {
    console.log(`      agent setText(${key}) reverted: ${(error as Error).message.split("\n")[0]}`);
    return false;
  }
  await confirm(await agentWallet.writeContract({ address: resolver, abi: permissionedResolverAbi, functionName: "setText", args: [dnsEncode(name), key, value] }));
  return true;
}

async function fundOnFork() {
  for (const address of [family.address, agent.address]) {
    await publicClient.request({ method: "anvil_setBalance" as never, params: [address, toHex(10n ** 18n)] as never });
  }
}

if (IS_FORK) await fundOnFork();

const parentLabel = process.env.PARENT_LABEL ?? `tanaka-${Math.random().toString(36).slice(2, 8)}`;
const parentName = `${parentLabel}.eth`;
const agentName = `${AGENT_LABEL}.${parentName}`;
const agentLabelId = BigInt(keccak256(toHex(AGENT_LABEL)));
console.log(`Family ${family.address}\nAgent  ${agent.address}\nName   ${agentName}${IS_FORK ? " (fork)" : ""}\n`);

const parentResolver = await deployResolver();
await registerParent(parentLabel, parentResolver);
console.log(`Registered ${parentName} with resolver ${parentResolver}`);

const userRegistry = await deployUserRegistry();
await confirm(await familyWallet.writeContract({ address: ENS_V2.ethRegistry, abi: registryAbi, functionName: "setSubregistry", args: [BigInt(keccak256(toHex(parentLabel))), userRegistry] }));
await confirm(await familyWallet.writeContract({ address: userRegistry, abi: registryAbi, functionName: "setParent", args: [ENS_V2.ethRegistry, parentLabel] }));
console.log(`Subregistry ${userRegistry}`);

const agentResolver = await deployResolver();
const block = await publicClient.getBlock();
await confirm(
  await familyWallet.writeContract({
    address: userRegistry,
    abi: registryAbi,
    functionName: "register",
    args: [AGENT_LABEL, family.address, zeroAddress, agentResolver, ROLE_SET_RESOLVER, block.timestamp + ONE_YEAR - 86400n],
  }),
);
console.log(`Registered ${agentName} with its own resolver ${agentResolver}`);

await setPolicyRecords(agentResolver, agentName);
await grantAgentDescriptionOnly(agentResolver);

const policy = await readPolicy(publicClient, agentName);
check("family set omamori.* records, readable via Universal Resolver", policy?.maxPerPayment === 20_000_000n);
check("addr record resolves to agent wallet", (await publicClient.getEnsAddress({ name: agentName })) === agent.address);
check("agent can update description", await agentCanSetText(agentResolver, agentName, "description", "Obaachan's helper"));
check("agent cannot raise omamori.maxPerPayment", !(await agentCanSetText(agentResolver, agentName, POLICY_KEYS.maxPerPayment, "999000000")));
check("policy unchanged after agent attempt", (await readPolicy(publicClient, agentName))?.maxPerPayment === 20_000_000n);

const tokenId = await publicClient.readContract({ address: userRegistry, abi: registryAbi, functionName: "getTokenId", args: [agentLabelId] });
const transferBlocked = await publicClient
  .simulateContract({ account: family, address: userRegistry, abi: registryAbi, functionName: "unsafeTransfer", args: [agent.address, tokenId, "0x"] })
  .then(
    () => false,
    (error: Error) => {
      console.log(`      transfer reverted: ${error.message.split("\n").slice(0, 3).join(" ")}`);
      return true;
    },
  );
check("subname is non-transferable", transferBlocked);

if (!KEEP_NAME) {
  await confirm(await familyWallet.writeContract({ address: userRegistry, abi: registryAbi, functionName: "unregister", args: [agentLabelId] }));
  const status = await publicClient.readContract({ address: userRegistry, abi: registryAbi, functionName: "getStatus", args: [agentLabelId] });
  check("revoked subname status is not registered", status !== 2);
  check("revoked subname yields no policy (decide refuses)", (await readPolicy(publicClient, agentName)) === null);
}

console.log(`\nParent registry ${userRegistry}\nAgent resolver ${agentResolver}\nParent resolver ${parentResolver}`);
const failed = results.filter(([, passed]) => !passed).length;
console.log(failed === 0 ? "\nSPIKE 1 PASS" : `\nSPIKE 1 FAIL (${failed} checks)`);
