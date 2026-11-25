import { buscarTenant } from "@/lib/tenant";
import { json, erro, preflight } from "@/lib/http";
import {
  solicitacaoInput,
  criarSolicitacao,
  excedeuLimite,
  hashIp,
  ipDaRequisicao,
  mensagemWhatsapp,
  gerarCodigo,
} from "@/lib/solicitacao";

export const OPTIONS = preflight;

/**
 * POST /api/solicitacoes
 * Body: { cliente, servicoId?, nome, telefone, observacao?, concordo: true, site? }
 * Resposta 201: { codigo, servico, whatsapp: { texto, url } }
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erro(400, "JSON inválido");
  }

  const parsed = solicitacaoInput.safeParse(body);
  if (!parsed.success) {
    return erro(422, parsed.error.issues[0]?.message ?? "Dados inválidos", {
      campos: parsed.error.issues.map((i) => i.path.join(".")),
    });
  }
  const input = parsed.data;

  const t = await buscarTenant(input.cliente);
  if (!t) return erro(404, "Cliente não encontrada");
  if (t.status === "suspenso") return erro(403, "Site indisponível no momento");

  // Bot preencheu o campo isca: responde como sucesso, mas não grava nada.
  if (input.site) {
    const codigo = gerarCodigo();
    return json({ codigo, servico: null, whatsapp: mensagemWhatsapp(t, codigo, input.nome) }, { status: 201 });
  }

  const ipHash = hashIp(ipDaRequisicao(req));
  if (await excedeuLimite(t.id, ipHash)) {
    return erro(429, "Muitas solicitações em pouco tempo. Tente de novo em alguns minutos.");
  }

  const r = await criarSolicitacao(t, input, ipHash);
  if ("erro" in r) return erro(404, r.erro!);

  return json(
    {
      codigo: r.codigo,
      servico: r.servicoNome,
      whatsapp: mensagemWhatsapp(t, r.codigo, input.nome, r.servicoNome),
    },
    { status: 201 },
  );
}
