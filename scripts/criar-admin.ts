/**
 * Cria (ou atualiza a senha de) uma conta de admin do painel.
 * Uso: npm run criar-admin -- email@exemplo.com "senha-forte" "Nome"
 */
import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { db } from "../src/db";
import { user, account } from "../src/db/schema";

async function main() {
  const [email, senha, nome = "Admin"] = process.argv.slice(2);
  if (!email || !senha) {
    console.error('Uso: npm run criar-admin -- email "senha" "Nome"');
    process.exit(1);
  }
  if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const hash = await hashPassword(senha);
  const emailNorm = email.trim().toLowerCase();

  const [existente] = await db.select().from(user).where(eq(user.email, emailNorm));
  if (existente) {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, existente.id));
    await db
      .update(account)
      .set({ password: hash, updatedAt: new Date() })
      .where(and(eq(account.userId, existente.id), eq(account.providerId, "credential")));
    console.log(`Admin ${emailNorm} atualizado.`);
    return;
  }
  const id = randomUUID();
  await db.insert(user).values({ id, name: nome, email: emailNorm, emailVerified: true, role: "admin" });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: hash,
  });
  console.log(`Admin ${emailNorm} criado.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
