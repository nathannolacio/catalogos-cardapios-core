import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Garante que quem chama é admin. Usar em toda página e server action do painel admin. */
export async function exigirAdmin() {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) redirect("/admin/login");
  if ((s.user as { role?: string }).role !== "admin") redirect("/admin/login?erro=sem-permissao");
  return s;
}
