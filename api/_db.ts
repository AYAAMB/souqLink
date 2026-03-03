import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function getSql() {
  if (sql) return sql;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  sql = postgres(url, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
  });

  return sql;
}
/*
import postgres from "postgres";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const isLocal =
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    url.includes("0.0.0.0");

  return postgres(url, {
    ssl: isLocal ? false : "require",
    max: 1,
    connect_timeout: 10,
  });
}*/