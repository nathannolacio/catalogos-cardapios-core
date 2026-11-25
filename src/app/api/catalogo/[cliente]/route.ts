import { buscarTenant, montarCatalogo, statusPublico } from "@/lib/tenant";
import { json, erro, preflight, CACHE_PUBLICO } from "@/lib/http";

export const OPTIONS = preflight;

/** GET /api/catalogo/{cliente}: catálogo público da cliente (slug ou id). */
export async function GET(_req: Request, ctx: { params: Promise<{ cliente: string }> }) {
  const { cliente } = await ctx.params;
  const t = await buscarTenant(cliente);
  if (!t) return erro(404, "Cliente não encontrada");

  if (t.status === "suspenso") {
    // O front mostra a tela de "site indisponível". Sem dados do catálogo.
    return json(statusPublico(t), { cache: CACHE_PUBLICO });
  }
  return json(await montarCatalogo(t), { cache: CACHE_PUBLICO });
}
