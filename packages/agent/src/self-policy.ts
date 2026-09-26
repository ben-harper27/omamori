import type { Account, Address, Chain, Hash, PublicClient, Transport, WalletClient } from "viem";
import { dnsEncode, permissionedResolverAbi } from "../../shared/src";

// Fixed gas skips estimation, so a forbidden write is broadcast and reverts onchain (visible on Etherscan)
// instead of failing silently in the client.
const SELF_UPDATE_GAS = 200_000n;

export type SelfUpdateResult = { key: string; value: string; txHash: Hash; succeeded: boolean };

export async function attemptOwnRecordUpdate(
  publicClient: PublicClient,
  agentWallet: WalletClient<Transport, Chain, Account>,
  agentName: string,
  key: string,
  value: string,
): Promise<SelfUpdateResult> {
  const resolver = (await publicClient.getEnsResolver({ name: agentName })) as Address;
  const txHash = await agentWallet.writeContract({
    address: resolver,
    abi: permissionedResolverAbi,
    functionName: "setText",
    args: [dnsEncode(agentName), key, value],
    gas: SELF_UPDATE_GAS,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { key, value, txHash, succeeded: receipt.status === "success" };
}
