import { PGlite } from "@electric-sql/pglite";
import { ensureSchema, type SqlClient } from "./db";

let shared: SqlClient | null = null;

// One PGlite instance per test run: creating many crashes PGlite's WASM under Bun.
export async function createTestDb(): Promise<SqlClient> {
  if (!shared) {
    const db = new PGlite();
    shared = { query: async <T>(text: string, params: unknown[] = []) => (await db.query<T>(text, params)).rows };
    await ensureSchema(shared);
  }
  await shared.query("TRUNCATE approvals, payments");
  return shared;
}
