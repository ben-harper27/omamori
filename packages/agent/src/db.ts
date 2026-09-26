import { neon } from "@neondatabase/serverless";

export type SqlClient = {
  query<T>(text: string, params?: unknown[]): Promise<T[]>;
};

export function createNeonClient(databaseUrl: string): SqlClient {
  if (!databaseUrl) throw new Error("DATABASE_URL must be set");
  const sql = neon(databaseUrl);
  return { query: async <T>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[] };
}

export async function ensureSchema(sql: SqlClient): Promise<void> {
  await sql.query(`CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    terms_hash TEXT NOT NULL,
    reason TEXT NOT NULL,
    expected_approver TEXT NOT NULL,
    device_code TEXT NOT NULL,
    user_code TEXT NOT NULL,
    verification_uri TEXT NOT NULL,
    status TEXT NOT NULL,
    status_detail TEXT,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
  )`);
  await sql.query(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    created_at BIGINT NOT NULL,
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
