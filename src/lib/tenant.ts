import { eq, or, and, asc } from "drizzle-orm";
import { db } from "@/db";
import { tenants, categorias, servicos, type Tenant } from "@/db/schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Busca o tenant pelo slug ou pelo id. */
export async function buscarTenant(slugOuId: string): Promise<Tenant | undefined> {
  const cond = UUID_RE.test(slugOuId)
    ? or(eq(tenants.id, slugOuId), eq(tenants.slug, slugOuId))
    : eq(tenants.slug, slugOuId.toLowerCase());
  const [t] = await db.select().from(tenants).where(cond).limit(1);
  return t;
}

/** Recursos liberados por plano. O front completo é o mesmo; o Start só tem os do Pro bloqueados. */
export function recursosDoPlano(plano: Tenant["plano"]) {
  const pro = plano === "pro";
  return {
    promocoes: pro,
    destaques: pro,
    faixaAviso: pro,
    historicoClientes: pro,
    numeros: pro,
  };
}

export function statusPublico(t: Tenant) {
  return {
    id: t.id,
    slug: t.slug,
    status: t.status,
    plano: t.plano,
    disponivel: t.status !== "suspenso",
    noindex: t.status === "previa",
    recursos: recursosDoPlano(t.plano),
  };
}

export async function montarCatalogo(t: Tenant) {
  const [cats, servs] = await Promise.all([
    db
      .select()
      .from(categorias)
      .where(and(eq(categorias.tenantId, t.id), eq(categorias.ativo, true)))
      .orderBy(asc(categorias.ordem), asc(categorias.nome)),
    db
      .select()
      .from(servicos)
      .where(and(eq(servicos.tenantId, t.id), eq(servicos.ativo, true)))
      .orderBy(asc(servicos.ordem), asc(servicos.nome)),
  ]);

  const servicoPublico = (s: (typeof servs)[number]) => ({
    id: s.id,
    nome: s.nome,
    descricao: s.descricao,
    precoCentavos: s.precoCentavos,
    duracaoMin: s.duracaoMin,
    fotoUrl: s.fotoUrl,
  });

  return {
    ...statusPublico(t),
    negocio: {
      nome: t.nome,
      whatsapp: t.whatsapp,
      instagram: t.instagram,
      endereco: t.endereco,
      mapsUrl: t.mapsUrl,
      horario: t.horario,
    },
    categorias: cats.map((c) => ({
      id: c.id,
      nome: c.nome,
      servicos: servs.filter((s) => s.categoriaId === c.id).map(servicoPublico),
    })),
    // Serviços sem categoria. Os de categoria inativa ficam de fora.
    semCategoria: servs.filter((s) => !s.categoriaId).map(servicoPublico),
    atualizadoEm: new Date().toISOString(),
  };
}
