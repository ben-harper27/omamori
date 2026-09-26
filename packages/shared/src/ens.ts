import { parseAbi, toHex, type Address, type Hex, type PublicClient } from "viem";
import { normalize, packetToBytes } from "viem/ens";
import type { Policy } from "./types";

// Live ENSv2 beta on Sepolia, from docs.ens.domains/learn/deployments (not the contracts-v2 main branch).
export const ENS_V2 = {
  ethRegistry: "0x657ea849311d3d5823348dded7c2aaafb3ede09e",
  ethRegistrar: "0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca",
  verifiableFactory: "0x9e726eb570beb6bceb495ab8cda7df517d4e841c",
  userRegistryImpl: "0xa80338aaa8d23831cea25e858d1774534abb0263",
  permissionedResolverImpl: "0x14f09fd05d4585759e54844dc9b00147131cf243",
  mockUsdc: "0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e",
} as const satisfies Record<string, Address>;

export const ALL_ROLES = BigInt("0x" + "1".repeat(64));
export const ROLE_SET_RESOLVER = 1n << 24n;
export const REGISTRY_STATUS_REGISTERED = 2;

export const ethRegistrarAbi = parseAbi([
  "function makeCommitment(string label,address owner,bytes32 secret,address subregistry,address resolver,uint64 duration,bytes32 referrer) pure returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label,address owner,bytes32 secret,address subregistry,address resolver,uint64 duration,address paymentToken,bytes32 referrer) returns (uint256)",
  "function getRegisterPrice(string label,uint64 duration,address paymentToken) view returns (uint256 base,uint256 premium)",
  "function isAvailable(string label) view returns (bool)",
]);

export const erc20Abi = parseAbi([
  "function mint(address to,uint256 amount)",
  "function approve(address spender,uint256 amount) returns (bool)",
]);

export const verifiableFactoryAbi = parseAbi([
  "function deployProxy(address implementation,uint256 salt,bytes data) returns (address)",
  "event ProxyDeployed(address indexed sender,address indexed proxyAddress,uint256 salt,address implementation)",
]);

export const registryAbi = parseAbi([
  "struct RoleGrant { address account; uint256 roleBitmap; }",
  "function initialize(RoleGrant[] grants)",
  "function register(string label,address owner,address registry,address resolver,uint256 roleBitmap,uint64 expiry) returns (uint256)",
  "function setSubregistry(uint256 anyId,address registry)",
  "function setParent(address parent,string label)",
  "function unregister(uint256 anyId)",
  "function getStatus(uint256 anyId) view returns (uint8)",
  "function getTokenId(uint256 anyId) view returns (uint256)",
  "function unsafeTransfer(address to,uint256 tokenId,bytes data)",
  "error TransferDisallowed(uint256 tokenId,address from)",
  "error EACUnauthorizedAccountRoles(uint256 resource,uint256 roleBitmap,address account)",
]);

export const permissionedResolverAbi = parseAbi([
  "struct RoleGrant { address account; uint256 roleBitmap; }",
  "function initialize(RoleGrant[] grants,bytes[] calls)",
  "function setText(bytes name,string key,string value)",
  "function setAddress(bytes name,uint256 coinType,bytes addressBytes)",
  "function grantSetterRoles(bytes setter,address account) returns (bool)",
  "function hasRoles(uint256 resource,uint256 roleBitmap,address account) view returns (bool)",
  "function multicall(bytes[] calls) returns (bytes[])",
  "error EACUnauthorizedAccountRoles(uint256 resource,uint256 roleBitmap,address account)",
]);

export const POLICY_KEYS = {
  maxPerPayment: "omamori.maxPerPayment",
  approvalThreshold: "omamori.approvalThreshold",
  monthlyCap: "omamori.monthlyCap",
  allowlist: "omamori.allowlist",
  approver: "omamori.approver",
} as const;

export function dnsEncode(name: string): Hex {
  return toHex(packetToBytes(normalize(name)));
}

function parseAmount(value: string | null): bigint | null {
  if (!value || !/^\d+$/.test(value)) return null;
  return BigInt(value);
}

function parseAllowlist(value: string | null): string[] | null {
  if (!value) return null;
  const names = value.split(",").map((n) => n.trim().toLowerCase()).filter(Boolean);
  return names.length > 0 ? names : null;
}

// Returns null when the name is revoked, unresolvable, or its policy is incomplete: decide() refuses on null.
export async function readPolicy(client: PublicClient, name: string): Promise<Policy | null> {
  const normalized = normalize(name);
  const keys = Object.values(POLICY_KEYS);
  const values = await Promise.all(keys.map((key) => client.getEnsText({ name: normalized, key }).catch(() => null)));
  const records = Object.fromEntries(keys.map((key, i) => [key, values[i]]));

  const maxPerPayment = parseAmount(records[POLICY_KEYS.maxPerPayment]);
  const approvalThreshold = parseAmount(records[POLICY_KEYS.approvalThreshold]);
  const monthlyCap = parseAmount(records[POLICY_KEYS.monthlyCap]);
  const approver = records[POLICY_KEYS.approver];
  if (maxPerPayment === null || approvalThreshold === null || monthlyCap === null || !approver) return null;

  return { maxPerPayment, approvalThreshold, monthlyCap, approver, allowlist: parseAllowlist(records[POLICY_KEYS.allowlist]) };
}
