"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarCategoria } from "@/app/admin/actions";
import { Aviso } from "@/components/aviso";

export function NovaCategoriaForm({ tenantId }: { tenantId: string }) {
  const [estado, acao, pendente] = useActionState(criarCategoria, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input name="nome" required placeholder="Nova categoria (ex.: Cabelo)" className="campo max-w-xs flex-1" />
      <input name="ordem" type="number" min={0} placeholder="Ordem" className="campo w-24" />
      <button className="botao-sec" disabled={pendente}>Adicionar</button>
      <Aviso estado={estado} okTexto="Categoria criada." />
    </form>
  );
}
