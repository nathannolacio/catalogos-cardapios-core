"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { criarServico, salvarServico, type Resultado } from "@/app/admin/actions";
import { Aviso } from "@/components/aviso";
import { precoParaInput } from "@/lib/formato";
import type { Servico } from "@/db/schema";

/** Redimensiona para no máximo 1200 px e converte para WebP antes de enviar. */
async function comprimir(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.8));
  if (!blob) return arquivo;
  return new File([blob], arquivo.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}

export function ServicoForm({
  tenantId,
  categorias,
  servico: s,
}: {
  tenantId: string;
  categorias: { id: string; nome: string }[];
  servico?: Servico;
}) {
  const acaoServidor = s ? salvarServico : criarServico;
  const ref = useRef<HTMLFormElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [estado, acao, pendente] = useActionState<Resultado, FormData>(async (prev, fd) => {
    const foto = fd.get("foto");
    if (foto instanceof File && foto.size > 0) fd.set("foto", await comprimir(foto));
    const r = await acaoServidor(prev, fd);
    if (r?.ok && !s) setPrevia(null);
    return r;
  }, undefined);

  useEffect(() => {
    if (estado?.ok && !s) ref.current?.reset();
  }, [estado, s]);

  return (
    <form ref={ref} action={acao} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="tenantId" value={tenantId} />
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="sm:col-span-2">
        <label className="rotulo">Nome</label>
        <input name="nome" required defaultValue={s?.nome} className="campo" placeholder="Design de sobrancelha" />
      </div>
      <div className="sm:col-span-2">
        <label className="rotulo">Descrição</label>
        <textarea name="descricao" rows={2} defaultValue={s?.descricao ?? ""} className="campo" />
      </div>
      <div>
        <label className="rotulo">Categoria</label>
        <select name="categoriaId" defaultValue={s?.categoriaId ?? ""} className="campo">
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="rotulo">Preço (R$)</label>
          <input name="preco" inputMode="decimal" defaultValue={precoParaInput(s?.precoCentavos)} placeholder="45,00" className="campo" />
        </div>
        <div>
          <label className="rotulo">Duração (min)</label>
          <input name="duracaoMin" type="number" min={0} defaultValue={s?.duracaoMin ?? ""} className="campo" />
        </div>
        <div>
          <label className="rotulo">Ordem</label>
          <input name="ordem" type="number" min={0} defaultValue={s?.ordem ?? 0} className="campo" />
        </div>
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        {(previa ?? s?.fotoUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previa ?? s!.fotoUrl!} alt="" className="h-16 w-16 rounded-lg object-cover" />
        )}
        <div>
          <label className="rotulo">Foto</label>
          <input
            name="foto"
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPrevia(f ? URL.createObjectURL(f) : null);
            }}
          />
        </div>
        {s?.fotoUrl && (
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="removerFoto" /> remover foto
          </label>
        )}
        {s && (
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="ativo" defaultChecked={s.ativo} /> visível no site
          </label>
        )}
      </div>
      <p className="sm:col-span-2 text-xs text-stone-500">Deixe o preço vazio para mostrar “Sob consulta”.</p>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button className="botao" disabled={pendente}>
          {pendente ? "Salvando..." : s ? "Salvar serviço" : "Adicionar serviço"}
        </button>
        <Aviso estado={estado} okTexto={s ? "Salvo." : "Serviço criado."} />
      </div>
    </form>
  );
}
