import { randomUUID } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { migrateDatabase, migrationsFolder } from "../src/infrastructure/db/migrate.js";

// Use a dedicated test PostgreSQL server: these tests create and remove databases.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(testDatabaseUrl === undefined)("startup migrations on PostgreSQL", () => {
  let admin: ReturnType<typeof postgres>;
  let sql: ReturnType<typeof postgres>;
  let databaseName: string;
  let connectionString: string;

  beforeEach(async () => {
    admin = postgres(testDatabaseUrl!, { max: 1 });
    databaseName = `mates_migration_test_${randomUUID().replaceAll("-", "")}`;
    await admin`CREATE DATABASE ${admin(databaseName)}`;
    const url = new URL(testDatabaseUrl!);
    url.pathname = `/${databaseName}`;
    connectionString = url.toString();
    sql = postgres(connectionString, { max: 1, onnotice: () => undefined });
  });

  afterEach(async () => {
    await sql?.end();
    if (admin !== undefined) {
      try {
        await admin`DROP DATABASE IF EXISTS ${admin(databaseName)} WITH (FORCE)`;
      } finally {
        await admin.end();
      }
    }
  });

  async function migrationCount(): Promise<number> {
    const rows = await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
    return rows[0]!.count;
  }

  it("upgrades an existing database and skips applied migrations on restart", async () => {
    const fixture = await mkdtemp(join(tmpdir(), "mates-migrations-"));
    const journal = JSON.parse(await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8"));
    try {
      await cp(migrationsFolder, fixture, { recursive: true });
      await writeFile(join(fixture, "meta/_journal.json"), JSON.stringify({
        ...journal, entries: journal.entries.slice(0, -1)
      }));
      await migrate(drizzle(sql), { migrationsFolder: fixture });
      expect(await migrationCount()).toBe(journal.entries.length - 1);

      await sql`CREATE TABLE startup_probe (value text NOT NULL)`;
      await sql`INSERT INTO startup_probe VALUES ('preserved')`;
      await migrateDatabase(connectionString);
      expect(await migrationCount()).toBe(journal.entries.length);
      const history = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`;

      await migrateDatabase(connectionString);
      expect(await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`).toEqual(history);
      expect((await sql`SELECT value FROM startup_probe`)[0]!.value).toBe("preserved");
      expect((await sql`SELECT count(*)::int AS count FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'onboarding_completed_at'`)[0]!.count).toBe(1);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it("serializes concurrent startup on a fresh database", async () => {
    await Promise.all([migrateDatabase(connectionString), migrateDatabase(connectionString)]);
    const journal = JSON.parse(await readFile(join(migrationsFolder, "meta/_journal.json"), "utf8"));
    expect(await migrationCount()).toBe(journal.entries.length);
  });

  it("rejects a failed migration and releases the connection and lock for retry", async () => {
    await sql`CREATE TABLE users (conflict boolean)`;
    await expect(migrateDatabase(connectionString)).rejects.toThrow();
    expect(await migrationCount()).toBe(0);
    await sql`DROP TABLE users`;
    await migrateDatabase(connectionString);
    expect(await migrationCount()).toBeGreaterThan(0);
  });
});
