import { describe, expect, test } from "bun:test";
import { decide } from "./decide";
import type { DecisionInput, Policy, Screening, ScreeningVerdict } from "./types";

const USDC = (n: number) => BigInt(Math.round(n * 1_000_000));
const clean: ScreeningVerdict = { level: "clean", reasons: [] };

const policy: Policy = {
  maxPerPayment: USDC(20),
  approvalThreshold: USDC(3),
  monthlyCap: USDC(50),
  allowlist: ["pharmacy.omamori-demo.eth", "grocery.omamori-demo.eth"],
  approver: "approver-id",
};

const cleanScreening: Screening = { payTo: clean, token: clean, authorization: clean };

function input(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    terms: {
      sellerName: "pharmacy.omamori-demo.eth",
      payTo: "0x000000000000000000000000000000000000dEaD",
      amount: USDC(1),
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "base-sepolia",
    },
    policy,
    monthSpend: 0n,
    screening: cleanScreening,
    ...overrides,
  };
}

describe("decide", () => {
  test("rule 1: missing or revoked name refuses", () => {
    expect(decide(input({ policy: null }))).toMatchObject({ outcome: "refuse", rule: 1 });
  });

  test("rule 2: high risk refuses with Intercepta reasons verbatim", () => {
    const screening = { ...cleanScreening, payTo: { level: "high" as const, reasons: ["Linked to phishing"] } };
    const decision = decide(input({ screening }));
    expect(decision).toMatchObject({ outcome: "refuse", rule: 2 });
    expect(decision.details).toEqual(["Linked to phishing"]);
  });

  test("rule 2 says screening was unavailable rather than blaming Intercepta", () => {
    const unavailable = { level: "high" as const, reasons: ["Screening unavailable: timeout"] };
    const decision = decide(input({ screening: { payTo: unavailable, token: unavailable, authorization: unavailable } }));
    expect(decision).toMatchObject({ outcome: "refuse", rule: 2, reason: "Screening unavailable, refusing to pay unscreened" });
  });

  test("rule 2 wins over an amount that would also break limits", () => {
    const screening = { ...cleanScreening, token: { level: "high" as const, reasons: ["Fake USDC"] } };
    const base = input({ screening });
    expect(decide({ ...base, terms: { ...base.terms, amount: USDC(100) } }).rule).toBe(2);
  });

  test("rule 3: above maxPerPayment refuses", () => {
    const base = input();
    expect(decide({ ...base, terms: { ...base.terms, amount: USDC(21) } })).toMatchObject({ outcome: "refuse", rule: 3 });
  });

  test("rule 4: month spend plus amount above cap refuses", () => {
    expect(decide(input({ monthSpend: USDC(49.5) }))).toMatchObject({ outcome: "refuse", rule: 4 });
  });

  test("rule 5: seller not on allowlist asks family", () => {
    const base = input();
    const terms = { ...base.terms, sellerName: "unknown.eth" };
    expect(decide({ ...base, terms })).toMatchObject({ outcome: "ask_family", rule: 5 });
  });

  test("rule 5 skipped when no allowlist is set", () => {
    const base = input({ policy: { ...policy, allowlist: null } });
    const terms = { ...base.terms, sellerName: "unknown.eth" };
    expect(decide({ ...base, terms })).toMatchObject({ outcome: "pay", rule: 8 });
  });

  test("rule 6: warnings ask family with reasons", () => {
    const screening = { ...cleanScreening, authorization: { level: "warning" as const, reasons: ["New contract"] } };
    const decision = decide(input({ screening }));
    expect(decision).toMatchObject({ outcome: "ask_family", rule: 6 });
    expect(decision.details).toEqual(["New contract"]);
  });

  test("rule 7: above approval threshold asks family", () => {
    const base = input();
    expect(decide({ ...base, terms: { ...base.terms, amount: USDC(8) } })).toMatchObject({ outcome: "ask_family", rule: 7 });
  });

  test("rule 8: within policy and clean pays", () => {
    expect(decide(input())).toMatchObject({ outcome: "pay", rule: 8 });
  });

  test("boundaries are inclusive: exactly at threshold and cap still pays", () => {
    const base = input({ monthSpend: USDC(47) });
    expect(decide({ ...base, terms: { ...base.terms, amount: USDC(3) } })).toMatchObject({ outcome: "pay", rule: 8 });
  });
});
