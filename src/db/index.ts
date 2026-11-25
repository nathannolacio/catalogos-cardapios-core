import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB };

/**
 * Produção/preview: DATABASE_URL = connection string do Neon.
 * Desenvolvimento e testes sem Neon: DATABASE_URL vazio usa PGlite (Postgres em arquivo, em ./.pglite).
 */
function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith("postgres")) {
    return drizzleNeon(neon(url), { schema }) as unknown as DB;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite } = require("@electric-sql/pglite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/pglite");
  const dir = url?.startsWith("pglite:") ? url.slice("pglite:".length) : "./.pglite";
  const client = dir === "memory" ? new PGlite() : new PGlite(dir);
  return drizzle(client, { schema }) as DB;
}

function getDb(): DB {
  return (globalForDb.__db ??= createDb());
}

/** Conexão criada só no primeiro uso (não durante o build). */
export const db: DB = new Proxy({} as DB, {
  get(_alvo, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});
export { schema };
