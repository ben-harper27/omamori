import { createPublicClient, http, parseAbiItem, type Address, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";

const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const MAX_BLOCK_RANGE = 50_000n;
const BASE_BLOCK_SECONDS = 2n;

function startOfMonthUtcSeconds(now: number): bigint {
  const date = new Date(now);
  return BigInt(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000);
}

// Every USDC transfer out of the agent wallet is a payment, so this month's outflow is its spend.
export class OnchainSpend {
  private readonly client: PublicClient;

  constructor(rpcUrl: string, private readonly usdc: Address, private readonly wallet: Address) {
    this.client = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) }) as PublicClient;
  }

  async thisMonth(now = Date.now()): Promise<bigint> {
    const latest = await this.client.getBlock();
    const secondsSinceMonthStart = latest.timestamp - startOfMonthUtcSeconds(now);
    const fromBlock = latest.number - secondsSinceMonthStart / BASE_BLOCK_SECONDS;

    const ranges: [bigint, bigint][] = [];
    for (let start = fromBlock; start <= latest.number; start += MAX_BLOCK_RANGE) {
      const end = start + MAX_BLOCK_RANGE - 1n;
      ranges.push([start, end < latest.number ? end : latest.number]);
    }
    const chunks = await Promise.all(
      ranges.map(([from, to]) =>
        this.client.getLogs({ address: this.usdc, event: TRANSFER, args: { from: this.wallet }, fromBlock: from, toBlock: to }),
      ),
    );

    let total = 0n;
    for (const logs of chunks) for (const log of logs) total += log.args.value ?? 0n;
    return total;
  }
}
