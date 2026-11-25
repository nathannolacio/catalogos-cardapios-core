/**
 * Aplica as migrações da pasta drizzle/ no banco de DATABASE_URL
 * (Neon se começar com postgres://, senão PGlite local).
 * Uso: npm run db:migrate
 */
import { db } from "../src/db";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.VERCEL && !url.startsWith("postgres")) {
    console.warn("DATABASE_URL não configurada neste ambiente da Vercel: migrações puladas.");
    return;
  }
  if (url.startsWith("postgres")) {
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./drizzle" });
  }
  console.log("Migrações aplicadas.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
