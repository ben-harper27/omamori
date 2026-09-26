import { encodeAbiParameters, keccak256, type Hex } from "viem";
import type { PaymentTerms } from "../../shared/src";
import type { SqlClient } from "./db";
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
  created_at: number | string;
  expires_at: number | string;
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
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
}

export class ApprovalStore {
  constructor(private readonly sql: SqlClient) {}

  async create(terms: PaymentTerms, reason: string, expectedApprover: string, authorization: DeviceAuthorization, now = Date.now()): Promise<PendingApproval> {
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
    await this.sql.query(`INSERT INTO approvals VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
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
    ]);
    return approval;
  }

  async get(id: string, now = Date.now()): Promise<PendingApproval | null> {
    await this.expireStale(now);
    const [row] = await this.sql.query<Row>(`SELECT * FROM approvals WHERE id = $1`, [id]);
    return row ? fromRow(row) : null;
  }

  async list(now = Date.now()): Promise<PendingApproval[]> {
    await this.expireStale(now);
    const rows = await this.sql.query<Row>(`SELECT * FROM approvals ORDER BY created_at DESC`);
    return rows.map(fromRow);
  }

  async applyPollResult(id: string, result: PollResult, now = Date.now()): Promise<PendingApproval | null> {
    const approval = await this.get(id, now);
    if (!approval || approval.status !== "pending") return approval;
    if (result.status === "pending" || result.status === "slow_down") return approval;

    if (result.status === "approved") {
      if (result.approverSub !== approval.expectedApprover) {
        await this.setStatus(id, "denied", "Approved by someone other than the family approver in ENS");
      } else {
        await this.setStatus(id, "approved", null);
      }
    } else {
      await this.setStatus(id, result.status, result.error);
    }
    return this.get(id, now);
  }

  async cancel(id: string): Promise<void> {
    await this.sql.query(`UPDATE approvals SET status = 'cancelled' WHERE id = $1 AND status IN ('pending', 'approved')`, [id]);
  }

  // Single-use: only succeeds once, only while unexpired, and only for exactly the terms that were approved.
  async consume(id: string, terms: PaymentTerms, now = Date.now()): Promise<boolean> {
    const rows = await this.sql.query(
      `UPDATE approvals SET status = 'consumed' WHERE id = $1 AND status = 'approved' AND expires_at > $2 AND terms_hash = $3 RETURNING id`,
      [id, now, hashTerms(terms)],
    );
    return rows.length === 1;
  }

  private async setStatus(id: string, status: ApprovalStatus, detail: string | null): Promise<void> {
    await this.sql.query(`UPDATE approvals SET status = $1, status_detail = $2 WHERE id = $3`, [status, detail, id]);
  }

  private async expireStale(now: number): Promise<void> {
    await this.sql.query(
      `UPDATE approvals SET status = 'expired', status_detail = 'Approval window closed' WHERE status IN ('pending', 'approved') AND expires_at <= $1`,
      [now],
    );
  }
}
