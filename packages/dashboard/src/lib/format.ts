export function formatUsdc(baseUnits: string | null | undefined): string {
  if (!baseUnits) return "—";
  const value = Number(baseUnits) / 1_000_000;
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;
}

export function shortHex(value: string | null | undefined): string {
  if (!value) return "—";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export const EXPLORERS = {
  baseSepoliaTx: (hash: string) => `https://sepolia.basescan.org/tx/${hash}`,
  sepoliaAddress: (address: string) => `https://sepolia.etherscan.io/address/${address}`,
};
