import { buscarTenant, statusPublico } from "@/lib/tenant";
import { json, erro, preflight, CACHE_PUBLICO } from "@/lib/http";

export const OPTIONS = preflight;

/** GET /api/cliente/{id}/status: status (prévia, ativo, suspenso) e plano. Aceita id ou slug. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const t = await buscarTenant(id);
  if (!t) return erro(404, "Cliente não encontrada");
  return json(statusPublico(t), { cache: CACHE_PUBLICO });
}
