import { Database } from "bun:sqlite";
import type { Screening } from "../../shared/src";

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
  created_at: number;
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
    createdAt: row.created_at,
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
  private readonly db: Database;

  constructor(path = ":memory:") {
    this.db = new Database(path, { create: true });
    this.db.run(`CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      url TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      pay_to TEXT NOT NULL,
      amount TEXT NOT NULL,
      outcome TEXT NOT NULL,
      rule INTEGER,
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      screening TEXT,
      tx_hash TEXT,
      approval_id TEXT
    )`);
  }

  record(entry: Omit<PaymentRecord, "id" | "createdAt">, now = Date.now()): PaymentRecord {
    const record: PaymentRecord = { id: crypto.randomUUID(), createdAt: now, ...entry };
    this.db.query(`INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
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
    );
    return record;
  }

  updateOutcome(id: string, outcome: PaymentOutcome, reason: string): void {
    this.db.query(`UPDATE payments SET outcome = ?, reason = ? WHERE id = ?`).run(outcome, reason, id);
  }

  get(id: string): PaymentRecord | null {
    const row = this.db.query<Row, [string]>(`SELECT * FROM payments WHERE id = ?`).get(id);
    return row ? fromRow(row) : null;
  }

  findByApproval(approvalId: string): PaymentRecord | null {
    const row = this.db
      .query<Row, [string]>(`SELECT * FROM payments WHERE approval_id = ? AND outcome = 'awaiting_approval'`)
      .get(approvalId);
    return row ? fromRow(row) : null;
  }

  list(): PaymentRecord[] {
    return this.db.query<Row, []>(`SELECT * FROM payments ORDER BY created_at DESC`).all().map(fromRow);
  }

  monthSpend(now = Date.now()): bigint {
    const rows = this.db
      .query<{ amount: string }, [number]>(`SELECT amount FROM payments WHERE outcome = 'paid' AND created_at >= ?`)
      .all(startOfMonthUtc(now));
    let total = 0n;
    for (const row of rows) total += BigInt(row.amount);
    return total;
  }
}
