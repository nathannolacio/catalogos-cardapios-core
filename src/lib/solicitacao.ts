import { createHash, randomInt } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { solicitacoes, servicos, type Tenant } from "@/db/schema";

/** Letras sem as que confundem (I, O). */
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function gerarCodigo(digitos = 2) {
  const letra = LETRAS[randomInt(LETRAS.length)];
  const max = 10 ** digitos;
  const num = String(randomInt(max)).padStart(digitos, "0");
  return `${letra}${num}`;
}

export function hashIp(ip: string) {
  const sal = process.env.IP_HASH_SALT ?? process.env.BETTER_AUTH_SECRET ?? "dev";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 32);
}

export function ipDaRequisicao(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "desconhecido").trim();
}

/** Só dígitos; aceita com ou sem DDI 55. */
export function normalizarTelefone(tel: string) {
  return tel.replace(/\D/g, "");
}

export const solicitacaoInput = z.object({
  cliente: z.string().min(1).max(80),
  servicoId: z.uuid().optional().nullable(),
  nome: z.string().trim().min(2, "Informe seu nome").max(80),
  telefone: z
    .string()
    .trim()
    .transform(normalizarTelefone)
    .refine((t) => t.length >= 10 && t.length <= 13, "Telefone inválido"),
  observacao: z.string().trim().max(300).optional().nullable(),
  concordo: z.literal(true, { error: "É preciso concordar com o aviso de privacidade" }),
  // Campo isca (anti-bot): o front deixa escondido; humano nunca preenche.
  site: z.string().optional().nullable(),
});

export type SolicitacaoInput = z.infer<typeof solicitacaoInput>;

/** Limites de envio por IP. */
export const LIMITE_POR_IP_TENANT = 5; // por janela, na mesma cliente
export const LIMITE_POR_IP_GLOBAL = 15; // por janela, somando todas as clientes
export const JANELA_MIN = 10;

export async function excedeuLimite(tenantId: string, ipHash: string) {
  const desde = new Date(Date.now() - JANELA_MIN * 60_000);
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      noTenant: sql<number>`count(*) filter (where ${solicitacoes.tenantId} = ${tenantId})::int`,
    })
    .from(solicitacoes)
    .where(and(eq(solicitacoes.ipHash, ipHash), gte(solicitacoes.createdAt, desde)));
  return (row?.noTenant ?? 0) >= LIMITE_POR_IP_TENANT || (row?.total ?? 0) >= LIMITE_POR_IP_GLOBAL;
}

export function mensagemWhatsapp(t: Tenant, codigo: string, nome: string, servicoNome?: string | null) {
  const linhas = [
    `Olá! Sou ${nome} e quero agendar${servicoNome ? `: ${servicoNome}` : "."}`,
    `Código da solicitação: #${codigo}`,
  ];
  const texto = linhas.join("\n");
  const url = t.whatsapp ? `https://wa.me/${t.whatsapp}?text=${encodeURIComponent(texto)}` : null;
  return { texto, url };
}

export async function criarSolicitacao(t: Tenant, input: SolicitacaoInput, ipHash: string) {
  let servicoNome: string | null = null;
  let servicoId: string | null = null;
  if (input.servicoId) {
    const [s] = await db
      .select({ id: servicos.id, nome: servicos.nome })
      .from(servicos)
      .where(and(eq(servicos.id, input.servicoId), eq(servicos.tenantId, t.id)));
    if (!s) return { erro: "Serviço não encontrado" as const };
    servicoNome = s.nome;
    servicoId = s.id;
  }

  // Tenta códigos curtos (A12); se colidir várias vezes, passa para 3 e 4 dígitos.
  for (let tentativa = 0; tentativa < 9; tentativa++) {
    const codigo = gerarCodigo(2 + Math.floor(tentativa / 3));
    const inserido = await db
      .insert(solicitacoes)
      .values({
        tenantId: t.id,
        codigo,
        servicoId,
        servicoNome,
        nome: input.nome,
        telefone: input.telefone,
        observacao: input.observacao ?? null,
        consentimentoEm: new Date(),
        ipHash,
      })
      .onConflictDoNothing()
      .returning({ id: solicitacoes.id, codigo: solicitacoes.codigo });
    if (inserido.length) {
      return { codigo, servicoNome, id: inserido[0].id };
    }
  }
  throw new Error("Não foi possível gerar um código único");
}
