/**
 * db.ts — FIXED
 * Adds pool timeout config, error event logging, and safe withTransaction
 * that handles pool.connect() failure without crashing the finally block.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

export const pool = new Pool({
  connectionString:        env.DATABASE_URL,
  max:                     20,
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis: 5_000,   // fail fast if pool is exhausted
  application_name:        "finding-astro-backend",
});

pool.on("error", (err) => {
  logger.error("Unexpected database pool error", { message: err.message });
});

export const query = async <T extends QueryResultRow>(
  text: string,
  params: ReadonlyArray<unknown> = []
): Promise<QueryResult<T>> => pool.query<T>(text, params as any[]);

export const withTransaction = async <T>(
  executor: (client: PoolClient) => Promise<T>
): Promise<T> => {
  // Separate connect call so client is always defined before finally block
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (err) {
    logger.error("Failed to acquire DB connection from pool", { err });
    throw err;
  }

  try {
    await client.query("BEGIN");
    const result = await executor(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      logger.error("ROLLBACK failed", { rollbackErr });
    }
    throw error;
  } finally {
    client.release();
  }
};

export const checkDbHealth = async (): Promise<{ ok: boolean; latencyMs: number }> => {
  const start = Date.now();
  try {
    await query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
};
