import { describe, expect, test } from "bun:test";
import type { PublicClient } from "viem";
import { checkPayer } from "./payer-check";

const AGENT = "0x4F2F35d637209f38c11D35370Fc1F5419e3cacE1";
const OTHER = "0x000000000000000000000000000000000000dEaD";

function ensWith(addr: string | null): PublicClient {
  return { getEnsAddress: async () => addr } as unknown as PublicClient;
}

describe("checkPayer", () => {
  test("rejects a payer with no ENS name", async () => {
    expect(await checkPayer(ensWith(AGENT), null, null, null)).toContain("X-Payer-ENS");
  });

  test("rejects a revoked name", async () => {
    expect(await checkPayer(ensWith(null), null, "obaachan.tanaka.eth", AGENT)).toContain("not active");
  });

  test("rejects a wallet that is not the name's addr", async () => {
    expect(await checkPayer(ensWith(AGENT), null, "obaachan.tanaka.eth", OTHER)).toContain("is not the addr record");
  });

  test("accepts an active name before payment and a matching wallet at payment", async () => {
    expect(await checkPayer(ensWith(AGENT), null, "obaachan.tanaka.eth", null)).toBeNull();
    expect(await checkPayer(ensWith(AGENT), null, "obaachan.tanaka.eth", AGENT)).toBeNull();
  });
});
