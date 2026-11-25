import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Produção usa BETTER_AUTH_URL. Nos deploys de Preview a URL muda a cada deploy,
 * então caímos no VERCEL_URL que a própria Vercel injeta.
 */
const baseURL =
  process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BETTER_AUTH_URL;

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Ninguém se cadastra sozinho: contas são criadas pelo script (admin)
    // e, na fase 2, pelo painel (clientes).
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "cliente", input: false },
      tenantId: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
