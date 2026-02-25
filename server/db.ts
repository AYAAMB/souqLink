import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../shared/schema";

let sql: ReturnType<typeof postgres> | null = null;

export function getSql() {
  if (sql) return sql;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const isLocal =
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    url.includes("0.0.0.0");

  sql = postgres(url, {
    ssl: isLocal ? false : "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });

  return sql;
}

let _db: PostgresJsDatabase<typeof schema> | null = null;

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    if (!_db) {
      _db = drizzle(getSql(), { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});