import type { Screening } from "../../shared/src";
import type { SqlClient } from "./db";

export type PaymentOutcome = "paid" | "refused" | "awaiting_approval" | "approved" | "approval_denied" | "approval_expired" | "failed";

export type PaymentRecord = {
  id: string;
  createdAt: number;
  url: string;
  sellerName: string;
  payTo: string;
  amount: bigint;
  outcome: PaymentOutcome;
  rule: number | null;
  reason: string;
  details: string[];
  screening: Screening | null;
  txHash: string | null;
  approvalId: string | null;
};

type Row = {
  id: string;
  created_at: number | string;
  url: string;
  seller_name: string;
  pay_to: string;
  amount: string;
  outcome: PaymentOutcome;
  rule: number | null;
  reason: string;
  details: string;
  screening: string | null;
  tx_hash: string | null;
  approval_id: string | null;
};

function fromRow(row: Row): PaymentRecord {
  return {
    id: row.id,
    createdAt: Number(row.created_at),
    url: row.url,
    sellerName: row.seller_name,
    payTo: row.pay_to,
    amount: BigInt(row.amount),
    outcome: row.outcome,
    rule: row.rule,
    reason: row.reason,
    details: JSON.parse(row.details),
    screening: row.screening ? JSON.parse(row.screening) : null,
    txHash: row.tx_hash,
    approvalId: row.approval_id,
  };
}

function startOfMonthUtc(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export class PaymentLedger {
  constructor(private readonly sql: SqlClient) {}

  async record(entry: Omit<PaymentRecord, "id" | "createdAt">, now = Date.now()): Promise<PaymentRecord> {
    const record: PaymentRecord = { id: crypto.randomUUID(), createdAt: now, ...entry };
    await this.sql.query(`INSERT INTO payments VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
      record.id,
      record.createdAt,
      record.url,
      record.sellerName,
      record.payTo,
      record.amount.toString(),
      record.outcome,
      record.rule,
      record.reason,
      JSON.stringify(record.details),
      record.screening ? JSON.stringify(record.screening) : null,
      record.txHash,
      record.approvalId,
    ]);
    return record;
  }

  async updateOutcome(id: string, outcome: PaymentOutcome, reason: string): Promise<void> {
    await this.sql.query(`UPDATE payments SET outcome = $1, reason = $2 WHERE id = $3`, [outcome, reason, id]);
  }

  async get(id: string): Promise<PaymentRecord | null> {
    const [row] = await this.sql.query<Row>(`SELECT * FROM payments WHERE id = $1`, [id]);
    return row ? fromRow(row) : null;
  }

  async findByApproval(approvalId: string): Promise<PaymentRecord | null> {
    const [row] = await this.sql.query<Row>(`SELECT * FROM payments WHERE approval_id = $1 AND outcome = 'awaiting_approval'`, [approvalId]);
    return row ? fromRow(row) : null;
  }

  async list(): Promise<PaymentRecord[]> {
    const rows = await this.sql.query<Row>(`SELECT * FROM payments ORDER BY created_at DESC`);
    return rows.map(fromRow);
  }

  async monthSpend(now = Date.now()): Promise<bigint> {
    const rows = await this.sql.query<{ amount: string }>(`SELECT amount FROM payments WHERE outcome = 'paid' AND created_at >= $1`, [startOfMonthUtc(now)]);
    let total = 0n;
    for (const row of rows) total += BigInt(row.amount);
    return total;
  }
}
