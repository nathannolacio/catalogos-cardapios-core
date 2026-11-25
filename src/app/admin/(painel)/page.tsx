import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { tenants, solicitacoes } from "@/db/schema";
import { BadgePlano, BadgeTenant } from "@/components/badges";
import { NovaClienteForm } from "./nova-cliente-form";

export default async function AdminHome() {
  const lista = await db
    .select({
      id: tenants.id,
      nome: tenants.nome,
      slug: tenants.slug,
      plano: tenants.plano,
      status: tenants.status,
      pendentes: sql<number>`(select count(*)::int from ${solicitacoes} s where s.tenant_id = ${tenants}.id and s.status = 'pendente')`,
    })
    .from(tenants)
    .orderBy(asc(tenants.nome));

  const contagem = (s: string) => lista.filter((t) => t.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-stone-500">
            {contagem("ativo")} ativas · {contagem("previa")} em prévia · {contagem("suspenso")} suspensas
          </p>
        </div>
      </div>

      <NovaClienteForm />

      <div className="cartao p-0">
        {lista.length === 0 ? (
          <p className="p-5 text-sm text-stone-500">Nenhuma cliente ainda. Crie a primeira acima.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {lista.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/clientes/${t.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.nome}</p>
                    <p className="truncate text-xs text-stone-500">{t.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.pendentes > 0 && (
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {t.pendentes} pendente{t.pendentes > 1 ? "s" : ""}
                      </span>
                    )}
                    <BadgePlano plano={t.plano} />
                    <BadgeTenant status={t.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

