"use client";

import { useActionState } from "react";
import { criarCliente } from "@/app/admin/actions";
import { Aviso } from "@/components/aviso";

export function NovaClienteForm() {
  const [estado, acao, pendente] = useActionState(criarCliente, undefined);
  return (
    <form action={acao} className="cartao grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <div>
        <label className="rotulo" htmlFor="nome">Nova cliente</label>
        <input id="nome" name="nome" required placeholder="Studio Ana Lima" className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="slug">Endereço (slug)</label>
        <input id="slug" name="slug" placeholder="gerado a partir do nome" className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="plano">Plano</label>
        <select id="plano" name="plano" className="campo" defaultValue="start">
          <option value="start">Start</option>
          <option value="pro">Pro</option>
        </select>
      </div>
      <button className="botao" disabled={pendente}>
        {pendente ? "Criando..." : "Criar"}
      </button>
      <div className="sm:col-span-4">
        <Aviso estado={estado} />
      </div>
    </form>
  );
}
