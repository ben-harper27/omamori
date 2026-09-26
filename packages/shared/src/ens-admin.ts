import {
  encodeFunctionData,
  keccak256,
  parseEventLogs,
  toHex,
  zeroAddress,
  type Account,
  type Address,
  type Chain,
  type Hash,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import {
  ALL_ROLES,
  ENS_V2,
  ROLE_SET_RESOLVER,
  dnsEncode,
  erc20Abi,
  ethRegistrarAbi,
  permissionedResolverAbi,
  registryAbi,
  verifiableFactoryAbi,
} from "./ens";

export const ONE_YEAR = 365n * 24n * 60n * 60n;

type AdminWallet = WalletClient<Transport, Chain, Account>;

function random32(): Hash {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export function labelId(label: string): bigint {
  return BigInt(keccak256(toHex(label)));
}

// Family-side ENSv2 writes. The family wallet is admin of every registry and resolver it deploys.
export class EnsAdmin {
  constructor(
    private readonly publicClient: PublicClient,
    private readonly wallet: AdminWallet,
    private readonly waitForCommitment: () => Promise<void> = () => Bun.sleep(65_000),
  ) {}

  get address(): Address {
    return this.wallet.account.address;
  }

  async confirm(hash: Hash) {
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
    return receipt;
  }

  async deployResolver(): Promise<Address> {
    const initData = encodeFunctionData({
      abi: permissionedResolverAbi,
      functionName: "initialize",
      args: [[{ account: this.address, roleBitmap: ALL_ROLES }], []],
    });
    return this.deployProxy(ENS_V2.permissionedResolverImpl, initData);
  }

  async deployUserRegistry(): Promise<Address> {
    const initData = encodeFunctionData({ abi: registryAbi, functionName: "initialize", args: [[{ account: this.address, roleBitmap: ALL_ROLES }]] });
    return this.deployProxy(ENS_V2.userRegistryImpl, initData);
  }

  async isEthNameAvailable(label: string): Promise<boolean> {
    return this.publicClient.readContract({ address: ENS_V2.ethRegistrar, abi: ethRegistrarAbi, functionName: "isAvailable", args: [label] });
  }

  async registerEthName(label: string, resolver: Address): Promise<void> {
    await this.payForRegistration(label);
    const secret = random32();
    const referrer = toHex(0, { size: 32 });
    const commitment = await this.publicClient.readContract({
      address: ENS_V2.ethRegistrar,
      abi: ethRegistrarAbi,
      functionName: "makeCommitment",
      args: [label, this.address, secret, zeroAddress, resolver, ONE_YEAR, referrer],
    });
    await this.confirm(await this.wallet.writeContract({ address: ENS_V2.ethRegistrar, abi: ethRegistrarAbi, functionName: "commit", args: [commitment] }));
    await this.waitForCommitment();
    await this.confirm(
      await this.wallet.writeContract({
        address: ENS_V2.ethRegistrar,
        abi: ethRegistrarAbi,
        functionName: "register",
        args: [label, this.address, secret, zeroAddress, resolver, ONE_YEAR, ENS_V2.mockUsdc, referrer],
      }),
    );
  }

  async attachSubregistry(parentLabel: string): Promise<Address> {
    const registry = await this.deployUserRegistry();
    await this.confirm(await this.wallet.writeContract({ address: ENS_V2.ethRegistry, abi: registryAbi, functionName: "setSubregistry", args: [labelId(parentLabel), registry] }));
    await this.confirm(await this.wallet.writeContract({ address: registry, abi: registryAbi, functionName: "setParent", args: [ENS_V2.ethRegistry, parentLabel] }));
    return registry;
  }

  // Registered without ROLE_CAN_TRANSFER_ADMIN, so the subname can never leave the family.
  async registerSubname(registry: Address, label: string, resolver: Address): Promise<void> {
    const block = await this.publicClient.getBlock();
    await this.confirm(
      await this.wallet.writeContract({
        address: registry,
        abi: registryAbi,
        functionName: "register",
        args: [label, this.address, zeroAddress, resolver, ROLE_SET_RESOLVER, block.timestamp + ONE_YEAR - 86400n],
      }),
    );
  }

  async setRecords(resolver: Address, name: string, texts: Record<string, string>, ethAddress?: Address): Promise<void> {
    const dnsName = dnsEncode(name);
    const calls = Object.entries(texts).map(([key, value]) =>
      encodeFunctionData({ abi: permissionedResolverAbi, functionName: "setText", args: [dnsName, key, value] }),
    );
    if (ethAddress) calls.push(encodeFunctionData({ abi: permissionedResolverAbi, functionName: "setAddress", args: [dnsName, 60n, ethAddress] }));
    await this.confirm(await this.wallet.writeContract({ address: resolver, abi: permissionedResolverAbi, functionName: "multicall", args: [calls] }));
  }

  async grantTextKey(resolver: Address, key: string, account: Address): Promise<void> {
    const setter = encodeFunctionData({ abi: permissionedResolverAbi, functionName: "setText", args: ["0x", key, ""] });
    await this.confirm(await this.wallet.writeContract({ address: resolver, abi: permissionedResolverAbi, functionName: "grantSetterRoles", args: [setter, account] }));
  }

  async unregisterSubname(registry: Address, label: string): Promise<void> {
    await this.confirm(await this.wallet.writeContract({ address: registry, abi: registryAbi, functionName: "unregister", args: [labelId(label)] }));
  }

  private async payForRegistration(label: string): Promise<void> {
    const [basePrice, premium] = await this.publicClient.readContract({
      address: ENS_V2.ethRegistrar,
      abi: ethRegistrarAbi,
      functionName: "getRegisterPrice",
      args: [label, ONE_YEAR, ENS_V2.mockUsdc],
    });
    const price = basePrice + premium;
    await this.confirm(await this.wallet.writeContract({ address: ENS_V2.mockUsdc, abi: erc20Abi, functionName: "mint", args: [this.address, price] }));
    await this.confirm(await this.wallet.writeContract({ address: ENS_V2.mockUsdc, abi: erc20Abi, functionName: "approve", args: [ENS_V2.ethRegistrar, price] }));
  }

  private async deployProxy(implementation: Address, initData: Hash): Promise<Address> {
    const hash = await this.wallet.writeContract({
      address: ENS_V2.verifiableFactory,
      abi: verifiableFactoryAbi,
      functionName: "deployProxy",
      args: [implementation, BigInt(random32()), initData],
    });
    const receipt = await this.confirm(hash);
    const [event] = parseEventLogs({ abi: verifiableFactoryAbi, logs: receipt.logs, eventName: "ProxyDeployed" });
    return event.args.proxyAddress;
  }
}
