import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, categorias, servicos, solicitacoes } from "@/db/schema";
import { BadgePlano, BadgeSolicitacao, BadgeTenant } from "@/components/badges";
import { formatarPreco } from "@/lib/formato";
import {
  excluirCategoria,
  excluirCliente,
  excluirServico,
  mudarStatusCliente,
  mudarStatusSolicitacao,
  salvarCategoria,
} from "@/app/admin/actions";
import { DadosClienteForm } from "./dados-form";
import { NovaCategoriaForm } from "./nova-categoria-form";
import { ServicoForm } from "./servico-form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [t] = await db.select().from(tenants).where(eq(tenants.id, id));
  if (!t) notFound();

  const [cats, servs, sols] = await Promise.all([
    db.select().from(categorias).where(eq(categorias.tenantId, id)).orderBy(asc(categorias.ordem), asc(categorias.nome)),
    db.select().from(servicos).where(eq(servicos.tenantId, id)).orderBy(asc(servicos.ordem), asc(servicos.nome)),
    db
      .select()
      .from(solicitacoes)
      .where(and(eq(solicitacoes.tenantId, id)))
      .orderBy(desc(solicitacoes.createdAt))
      .limit(50),
  ]);

  const nomeCat = new Map(cats.map((c) => [c.id, c.nome]));
  const opcoesCat = cats.map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t.nome}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-stone-500">
            <BadgePlano plano={t.plano} />
            <BadgeTenant status={t.status} />
            <a className="underline" href={`/api/catalogo/${t.slug}`} target="_blank">
              /api/catalogo/{t.slug}
            </a>
          </div>
        </div>
        <form action={mudarStatusCliente} className="flex gap-2">
          <input type="hidden" name="id" value={t.id} />
          {(["previa", "ativo", "suspenso"] as const).map((s) => (
            <button
              key={s}
              name="status"
              value={s}
              disabled={t.status === s}
              className={t.status === s ? "botao" : "botao-sec"}
            >
              {s === "previa" ? "Prévia" : s === "ativo" ? "Ativar" : "Suspender"}
            </button>
          ))}
        </form>
      </div>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Dados do negócio</h2>
        <DadosClienteForm cliente={t} />
      </section>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Categorias</h2>
        {cats.length > 0 && (
          <ul className="space-y-2">
            {cats.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <form action={salvarCategoria} className="flex flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="tenantId" value={t.id} />
                  <input name="nome" defaultValue={c.nome} className="campo max-w-xs flex-1" />
                  <input name="ordem" type="number" min={0} defaultValue={c.ordem} className="campo w-20" title="Ordem" />
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" name="ativo" defaultChecked={c.ativo} /> visível
                  </label>
                  <button className="botao-sec">Salvar</button>
                </form>
                <form action={excluirCategoria}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="tenantId" value={t.id} />
                  <button className="botao-perigo" title="Os serviços dela ficam sem categoria">
                    Excluir
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <NovaCategoriaForm tenantId={t.id} />
      </section>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Serviços ({servs.length})</h2>
        <ul className="divide-y divide-stone-100">
          {servs.map((s) => (
            <li key={s.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  {s.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.fotoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-stone-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${s.ativo ? "" : "text-stone-400 line-through"}`}>{s.nome}</p>
                    <p className="truncate text-xs text-stone-500">
                      {s.categoriaId ? nomeCat.get(s.categoriaId) : "Sem categoria"} · {formatarPreco(s.precoCentavos)}
                      {s.duracaoMin ? ` · ${s.duracaoMin} min` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">editar</span>
                </summary>
                <div className="mt-4 space-y-3 rounded-lg bg-stone-50 p-4">
                  <ServicoForm tenantId={t.id} categorias={opcoesCat} servico={s} />
                  <form action={excluirServico}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="tenantId" value={t.id} />
                    <button className="botao-perigo">Excluir serviço</button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className="rounded-lg border border-dashed border-stone-300 p-4" open={servs.length === 0}>
          <summary className="cursor-pointer text-sm font-medium">+ Novo serviço</summary>
          <div className="mt-4">
            <ServicoForm tenantId={t.id} categorias={opcoesCat} />
          </div>
        </details>
      </section>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Solicitações recentes</h2>
        {sols.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhuma solicitação ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {sols.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="font-mono text-stone-500">#{s.codigo}</span> {s.nome}
                  </p>
                  <p className="text-xs text-stone-500">
                    {s.servicoNome ?? "Sem serviço"} · {s.telefone} ·{" "}
                    {s.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </p>
                  {s.observacao && <p className="mt-1 text-xs text-stone-600">“{s.observacao}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <BadgeSolicitacao status={s.status} />
                  <form action={mudarStatusSolicitacao} className="flex gap-1">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="tenantId" value={t.id} />
                    {s.status !== "confirmado" && (
                      <button name="status" value="confirmado" className="botao-sec">Confirmar</button>
                    )}
                    {s.status !== "nao_enviou" && (
                      <button name="status" value="nao_enviou" className="botao-sec">Não enviou</button>
                    )}
                    {s.status !== "pendente" && (
                      <button name="status" value="pendente" className="botao-sec">Pendente</button>
                    )}
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao space-y-3 border-red-200">
        <h2 className="font-semibold text-red-800">Excluir cliente</h2>
        <p className="text-sm text-stone-600">
          Apaga a cliente, categorias, serviços, fotos e solicitações. Não tem volta. Para confirmar, digite{" "}
          <span className="font-mono">{t.slug}</span>.
        </p>
        <form action={excluirCliente} className="flex gap-2">
          <input type="hidden" name="id" value={t.id} />
          <input name="confirmacao" className="campo max-w-xs" placeholder={t.slug} autoComplete="off" />
          <button className="botao-perigo">Excluir</button>
        </form>
      </section>
    </div>
  );
}
