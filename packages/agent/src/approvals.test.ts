import { describe, expect, test } from "bun:test";
import type { PaymentTerms } from "../../shared/src";
import { APPROVAL_WINDOW_MS, ApprovalStore } from "./approvals";
import type { DeviceAuthorization } from "./world-approval";

const APPROVER = "family-sub";
const T0 = 1_000_000;

const taxi: PaymentTerms = {
  sellerName: "taxi.omamori-demo.eth",
  payTo: "0x8c8d0d29b1b62a8C1710A789116da5115b707616",
  amount: 8_000_000n,
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  network: "eip155:84532",
};

const authorization: DeviceAuthorization = {
  device_code: "device",
  user_code: "ABCD-EFGH",
  verification_uri: "https://sandbox.auth.world.org/device",
  verification_uri_complete: "https://sandbox.auth.world.org/device?code=ABCD-EFGH",
  expires_in: 1200,
  interval: 5,
};

function pendingTaxi() {
  const store = new ApprovalStore();
  const approval = store.create(taxi, "Large payment", APPROVER, authorization, T0);
  return { store, id: approval.id };
}

describe("ApprovalStore", () => {
  test("approved by the ENS approver can be consumed exactly once", () => {
    const { store, id } = pendingTaxi();
    store.applyPollResult(id, { status: "approved", approverSub: APPROVER, authTime: 0 }, T0 + 1000);
    expect(store.consume(id, taxi, T0 + 2000)).toBe(true);
    expect(store.consume(id, taxi, T0 + 3000)).toBe(false);
  });

  test("approval cannot be replayed for different or larger terms", () => {
    const { store, id } = pendingTaxi();
    store.applyPollResult(id, { status: "approved", approverSub: APPROVER, authTime: 0 }, T0 + 1000);
    expect(store.consume(id, { ...taxi, amount: 20_000_000n }, T0 + 2000)).toBe(false);
    expect(store.consume(id, { ...taxi, payTo: "0x000000000000000000000000000000000000dEaD" }, T0 + 2000)).toBe(false);
  });

  test("approval by a different World ID is treated as denied", () => {
    const { store, id } = pendingTaxi();
    const approval = store.applyPollResult(id, { status: "approved", approverSub: "stranger", authTime: 0 }, T0 + 1000);
    expect(approval?.status).toBe("denied");
    expect(store.consume(id, taxi, T0 + 2000)).toBe(false);
  });

  test("denied approval cannot be consumed", () => {
    const { store, id } = pendingTaxi();
    const approval = store.applyPollResult(id, { status: "denied", error: "access_denied" }, T0 + 1000);
    expect(approval?.status).toBe("denied");
    expect(store.consume(id, taxi, T0 + 2000)).toBe(false);
  });

  test("pending approval expires after the window", () => {
    const { store, id } = pendingTaxi();
    expect(store.get(id, T0 + APPROVAL_WINDOW_MS)?.status).toBe("expired");
  });

  test("approved but unused approval expires and cannot be consumed late", () => {
    const { store, id } = pendingTaxi();
    store.applyPollResult(id, { status: "approved", approverSub: APPROVER, authTime: 0 }, T0 + 1000);
    expect(store.consume(id, taxi, T0 + APPROVAL_WINDOW_MS + 1)).toBe(false);
    expect(store.get(id, T0 + APPROVAL_WINDOW_MS + 1)?.status).toBe("expired");
  });

  test("cancelled approval ignores a later approval", () => {
    const { store, id } = pendingTaxi();
    store.cancel(id);
    const approval = store.applyPollResult(id, { status: "approved", approverSub: APPROVER, authTime: 0 }, T0 + 1000);
    expect(approval?.status).toBe("cancelled");
    expect(store.consume(id, taxi, T0 + 2000)).toBe(false);
  });

  test("pending poll results leave the approval pending", () => {
    const { store, id } = pendingTaxi();
    expect(store.applyPollResult(id, { status: "pending" }, T0 + 1000)?.status).toBe("pending");
  });
});
