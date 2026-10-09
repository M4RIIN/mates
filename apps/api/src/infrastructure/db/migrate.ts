import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { logger } from "../logger.js";

// Resolve apps/api/migrations from both src and the compiled dist tree.
export const migrationsFolder = fileURLToPath(new URL("../../../migrations/", import.meta.url));
const migrationLockId = 726418305;

export async function migrateDatabase(connectionString: string): Promise<void> {
  // A private, single-connection pool with no connection rotation keeps the
  // session lock across Drizzle's queries and migration transaction.
  const client = postgres(connectionString, {
    max: 1, prepare: false, max_lifetime: null, idle_timeout: 0
  });
  try {
    await client`SELECT pg_advisory_lock(${migrationLockId})`;
    try {
      logger.info("database.migrations.started");
      await migrate(drizzle(client), { migrationsFolder });
      logger.info("database.migrations.completed");
    } finally {
      await client`SELECT pg_advisory_unlock(${migrationLockId})`;
    }
  } finally {
    await client.end();
  }
}
