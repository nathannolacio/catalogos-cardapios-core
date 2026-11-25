"use client";

import { useActionState } from "react";
import { salvarCliente } from "@/app/admin/actions";
import { Aviso } from "@/components/aviso";
import type { Tenant } from "@/db/schema";

export function DadosClienteForm({ cliente: t }: { cliente: Tenant }) {
  const [estado, acao, pendente] = useActionState(salvarCliente, undefined);
  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={t.id} />
      <Campo nome="nome" rotulo="Nome do negócio" valor={t.nome} obrigatorio />
      <Campo nome="slug" rotulo="Endereço (slug)" valor={t.slug} obrigatorio />
      <div>
        <label className="rotulo" htmlFor="plano">Plano</label>
        <select id="plano" name="plano" defaultValue={t.plano} className="campo">
          <option value="start">Start</option>
          <option value="pro">Pro</option>
        </select>
      </div>
      <div>
        <label className="rotulo" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={t.status} className="campo">
          <option value="previa">Prévia</option>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
        </select>
      </div>
      <Campo nome="whatsapp" rotulo="WhatsApp (com DDD)" valor={t.whatsapp} placeholder="55 11 99999-9999" />
      <Campo nome="instagram" rotulo="Instagram" valor={t.instagram} placeholder="@perfil" />
      <Campo nome="email" rotulo="E-mail" valor={t.email} tipo="email" />
      <Campo nome="horario" rotulo="Horário de atendimento" valor={t.horario} placeholder="Seg a sex, 9h às 18h" />
      <Campo nome="endereco" rotulo="Endereço" valor={t.endereco} />
      <Campo nome="mapsUrl" rotulo="Link do Google Maps" valor={t.mapsUrl} tipo="url" />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="botao" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar dados"}
        </button>
        <Aviso estado={estado} />
      </div>
    </form>
  );
}

function Campo(p: {
  nome: string;
  rotulo: string;
  valor: string | null;
  tipo?: string;
  placeholder?: string;
  obrigatorio?: boolean;
}) {
  return (
    <div>
      <label className="rotulo" htmlFor={p.nome}>{p.rotulo}</label>
      <input
        id={p.nome}
        name={p.nome}
        type={p.tipo ?? "text"}
        defaultValue={p.valor ?? ""}
        placeholder={p.placeholder}
        required={p.obrigatorio}
        className="campo"
      />
    </div>
  );
}
