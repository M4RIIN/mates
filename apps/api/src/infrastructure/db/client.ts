import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type AppDb = PostgresJsDatabase<typeof schema>;

export function createDb(connectionString: string): AppDb {
  const client = postgres(connectionString, {
    max: 10,
    prepare: false
  });

  return drizzle(client, { schema });
}
