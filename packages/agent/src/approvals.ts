import { Database } from "bun:sqlite";
import { encodeAbiParameters, keccak256, type Hex } from "viem";
import type { PaymentTerms } from "../../shared/src";
import type { DeviceAuthorization, PollResult } from "./world-approval";

export const APPROVAL_WINDOW_MS = 10 * 60 * 1000;

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "cancelled" | "failed" | "consumed";

export type PendingApproval = {
  id: string;
  termsHash: Hex;
  reason: string;
  expectedApprover: string;
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  status: ApprovalStatus;
  statusDetail: string | null;
  createdAt: number;
  expiresAt: number;
};

type Row = {
  id: string;
  terms_hash: Hex;
  reason: string;
  expected_approver: string;
  device_code: string;
  user_code: string;
  verification_uri: string;
  status: ApprovalStatus;
  status_detail: string | null;
  created_at: number;
  expires_at: number;
};

export function hashTerms(terms: PaymentTerms): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "string" }, { type: "address" }, { type: "uint256" }, { type: "address" }, { type: "string" }],
      [terms.sellerName, terms.payTo, terms.amount, terms.asset, terms.network],
    ),
  );
}

function fromRow(row: Row): PendingApproval {
  return {
    id: row.id,
    termsHash: row.terms_hash,
    reason: row.reason,
    expectedApprover: row.expected_approver,
    deviceCode: row.device_code,
    userCode: row.user_code,
    verificationUri: row.verification_uri,
    status: row.status,
    statusDetail: row.status_detail,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export class ApprovalStore {
  private readonly db: Database;

  constructor(path = ":memory:") {
    this.db = new Database(path, { create: true });
    this.db.run(`CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      terms_hash TEXT NOT NULL,
      reason TEXT NOT NULL,
      expected_approver TEXT NOT NULL,
      device_code TEXT NOT NULL,
      user_code TEXT NOT NULL,
      verification_uri TEXT NOT NULL,
      status TEXT NOT NULL,
      status_detail TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`);
  }

  create(terms: PaymentTerms, reason: string, expectedApprover: string, authorization: DeviceAuthorization, now = Date.now()): PendingApproval {
    if (!expectedApprover) throw new Error("Policy has no approver; cannot request family approval");
    const approval: PendingApproval = {
      id: crypto.randomUUID(),
      termsHash: hashTerms(terms),
      reason,
      expectedApprover,
      deviceCode: authorization.device_code,
      userCode: authorization.user_code,
      verificationUri: authorization.verification_uri_complete,
      status: "pending",
      statusDetail: null,
      createdAt: now,
      expiresAt: now + APPROVAL_WINDOW_MS,
    };
    this.db
      .query(`INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        approval.id,
        approval.termsHash,
        approval.reason,
        approval.expectedApprover,
        approval.deviceCode,
        approval.userCode,
        approval.verificationUri,
        approval.status,
        approval.statusDetail,
        approval.createdAt,
        approval.expiresAt,
      );
    return approval;
  }

  get(id: string, now = Date.now()): PendingApproval | null {
    this.expireStale(now);
    const row = this.db.query<Row, [string]>(`SELECT * FROM approvals WHERE id = ?`).get(id);
    return row ? fromRow(row) : null;
  }

  list(now = Date.now()): PendingApproval[] {
    this.expireStale(now);
    return this.db.query<Row, []>(`SELECT * FROM approvals ORDER BY created_at DESC`).all().map(fromRow);
  }

  applyPollResult(id: string, result: PollResult, now = Date.now()): PendingApproval | null {
    const approval = this.get(id, now);
    if (!approval || approval.status !== "pending") return approval;
    if (result.status === "pending" || result.status === "slow_down") return approval;

    if (result.status === "approved") {
      if (result.approverSub !== approval.expectedApprover) {
        this.setStatus(id, "denied", "Approved by someone other than the family approver in ENS");
      } else {
        this.setStatus(id, "approved", null);
      }
    } else {
      this.setStatus(id, result.status, result.error);
    }
    return this.get(id, now);
  }

  cancel(id: string): void {
    this.db.query(`UPDATE approvals SET status = 'cancelled' WHERE id = ? AND status IN ('pending', 'approved')`).run(id);
  }

  // Single-use: only succeeds once, only while unexpired, and only for exactly the terms that were approved.
  consume(id: string, terms: PaymentTerms, now = Date.now()): boolean {
    const result = this.db
      .query(`UPDATE approvals SET status = 'consumed' WHERE id = ? AND status = 'approved' AND expires_at > ? AND terms_hash = ?`)
      .run(id, now, hashTerms(terms));
    return result.changes === 1;
  }

  private setStatus(id: string, status: ApprovalStatus, detail: string | null): void {
    this.db.query(`UPDATE approvals SET status = ?, status_detail = ? WHERE id = ?`).run(status, detail, id);
  }

  private expireStale(now: number): void {
    this.db
      .query(`UPDATE approvals SET status = 'expired', status_detail = 'Approval window closed' WHERE status IN ('pending', 'approved') AND expires_at <= ?`)
      .run(now);
  }
}
