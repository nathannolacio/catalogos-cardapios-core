"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { db } from "@/db";
import { tenants, categorias, servicos, solicitacoes } from "@/db/schema";
import { exigirAdmin } from "@/lib/admin";
import { lerInteiro, lerPreco, slugify, texto } from "@/lib/formato";

export type Resultado = { ok?: boolean; erro?: string } | undefined;

const STATUS_TENANT = ["previa", "ativo", "suspenso"] as const;
const PLANOS = ["start", "pro"] as const;
const STATUS_SOL = ["pendente", "confirmado", "nao_enviou"] as const;

function umDe<T extends readonly string[]>(lista: T, v: FormDataEntryValue | null, campo: string): T[number] {
  const s = String(v ?? "");
  if (!(lista as readonly string[]).includes(s)) throw new Error(`${campo} inválido`);
  return s as T[number];
}

function msg(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (/unique|duplicate/i.test(m)) return "Já existe uma cliente com esse endereço (slug).";
  return m;
}

function soDigitos(v: FormDataEntryValue | null) {
  const s = texto(v);
  return s ? s.replace(/\D/g, "") || null : null;
}

function instagram(v: FormDataEntryValue | null) {
  const s = texto(v);
  if (!s) return null;
  return s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
}

// ---------- Clientes ----------

export async function criarCliente(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await exigirAdmin();
  let id: string;
  try {
    const nome = texto(fd.get("nome"));
    if (!nome) return { erro: "Informe o nome." };
    const slug = slugify(texto(fd.get("slug")) ?? nome);
    if (!slug) return { erro: "Endereço (slug) inválido." };
    const [t] = await db
      .insert(tenants)
      .values({
        nome,
        slug,
        plano: umDe(PLANOS, fd.get("plano") ?? "start", "Plano"),
        status: "previa",
      })
      .returning({ id: tenants.id });
    id = t.id;
  } catch (e) {
    return { erro: msg(e) };
  }
  revalidatePath("/admin");
  redirect(`/admin/clientes/${id}`);
}

export async function salvarCliente(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await exigirAdmin();
  try {
    const id = String(fd.get("id"));
    const nome = texto(fd.get("nome"));
    const slug = slugify(texto(fd.get("slug")) ?? "");
    if (!nome || !slug) return { erro: "Nome e endereço são obrigatórios." };
    await db
      .update(tenants)
      .set({
        nome,
        slug,
        plano: umDe(PLANOS, fd.get("plano"), "Plano"),
        status: umDe(STATUS_TENANT, fd.get("status"), "Status"),
        whatsapp: soDigitos(fd.get("whatsapp")),
        instagram: instagram(fd.get("instagram")),
        email: texto(fd.get("email")),
        endereco: texto(fd.get("endereco")),
        mapsUrl: texto(fd.get("mapsUrl")),
        horario: texto(fd.get("horario")),
      })
      .where(eq(tenants.id, id));
    revalidatePath(`/admin/clientes/${id}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { erro: msg(e) };
  }
}

export async function mudarStatusCliente(fd: FormData) {
  await exigirAdmin();
  const id = String(fd.get("id"));
  await db
    .update(tenants)
    .set({ status: umDe(STATUS_TENANT, fd.get("status"), "Status") })
    .where(eq(tenants.id, id));
  revalidatePath("/admin");
  revalidatePath(`/admin/clientes/${id}`);
}

export async function excluirCliente(fd: FormData) {
  await exigirAdmin();
  const id = String(fd.get("id"));
  const confirmacao = String(fd.get("confirmacao") ?? "");
  const [t] = await db.select().from(tenants).where(eq(tenants.id, id));
  if (!t || confirmacao !== t.slug) return;
  const fotos = await db.select({ url: servicos.fotoUrl }).from(servicos).where(eq(servicos.tenantId, id));
  await apagarFotos(fotos.map((f) => f.url));
  await db.delete(tenants).where(eq(tenants.id, id));
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------- Categorias ----------

export async function criarCategoria(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await exigirAdmin();
  try {
    const tenantId = String(fd.get("tenantId"));
    const nome = texto(fd.get("nome"));
    if (!nome) return { erro: "Informe o nome da categoria." };
    await db.insert(categorias).values({ tenantId, nome, ordem: lerInteiro(fd.get("ordem")) ?? 0 });
    revalidatePath(`/admin/clientes/${tenantId}`);
    return { ok: true };
  } catch (e) {
    return { erro: msg(e) };
  }
}

export async function salvarCategoria(fd: FormData) {
  await exigirAdmin();
  const id = String(fd.get("id"));
  const tenantId = String(fd.get("tenantId"));
  const nome = texto(fd.get("nome"));
  if (!nome) return;
  await db
    .update(categorias)
    .set({ nome, ordem: lerInteiro(fd.get("ordem")) ?? 0, ativo: fd.get("ativo") === "on" })
    .where(and(eq(categorias.id, id), eq(categorias.tenantId, tenantId)));
  revalidatePath(`/admin/clientes/${tenantId}`);
}

export async function excluirCategoria(fd: FormData) {
  await exigirAdmin();
  const id = String(fd.get("id"));
  const tenantId = String(fd.get("tenantId"));
  await db.delete(categorias).where(and(eq(categorias.id, id), eq(categorias.tenantId, tenantId)));
  revalidatePath(`/admin/clientes/${tenantId}`);
}

// ---------- Serviços ----------

async function enviarFoto(tenantId: string, foto: FormDataEntryValue | null) {
  if (!(foto instanceof File) || foto.size === 0) return undefined;
  if (!foto.type.startsWith("image/")) throw new Error("A foto precisa ser uma imagem.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Upload de fotos indisponível: falta configurar o Vercel Blob (BLOB_READ_WRITE_TOKEN).");
  }
  const ext = foto.type === "image/webp" ? "webp" : foto.type === "image/png" ? "png" : "jpg";
  const blob = await put(`servicos/${tenantId}/${crypto.randomUUID()}.${ext}`, foto, {
    access: "public",
    contentType: foto.type,
  });
  return blob.url;
}

async function apagarFotos(urls: (string | null | undefined)[]) {
  const validas = urls.filter((u): u is string => !!u && u.includes(".blob.vercel-storage.com"));
  if (!validas.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(validas);
  } catch (e) {
    console.error("Falha ao apagar fotos do Blob", e);
  }
}

function dadosServico(fd: FormData) {
  const nome = texto(fd.get("nome"));
  if (!nome) throw new Error("Informe o nome do serviço.");
  return {
    nome,
    descricao: texto(fd.get("descricao")),
    categoriaId: texto(fd.get("categoriaId")),
    precoCentavos: lerPreco(fd.get("preco")),
    duracaoMin: lerInteiro(fd.get("duracaoMin")),
    ordem: lerInteiro(fd.get("ordem")) ?? 0,
  };
}

async function validarCategoria(tenantId: string, categoriaId: string | null) {
  if (!categoriaId) return;
  const [c] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(and(eq(categorias.id, categoriaId), eq(categorias.tenantId, tenantId)));
  if (!c) throw new Error("Categoria inválida.");
}

export async function criarServico(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await exigirAdmin();
  try {
    const tenantId = String(fd.get("tenantId"));
    const dados = dadosServico(fd);
    await validarCategoria(tenantId, dados.categoriaId);
    const fotoUrl = await enviarFoto(tenantId, fd.get("foto"));
    await db.insert(servicos).values({ tenantId, ...dados, fotoUrl: fotoUrl ?? null });
    revalidatePath(`/admin/clientes/${tenantId}`);
    return { ok: true };
  } catch (e) {
    return { erro: msg(e) };
  }
}

export async function salvarServico(_prev: Resultado, fd: FormData): Promise<Resultado> {
  await exigirAdmin();
  try {
    const id = String(fd.get("id"));
    const tenantId = String(fd.get("tenantId"));
    const dados = dadosServico(fd);
    await validarCategoria(tenantId, dados.categoriaId);
    const [atual] = await db
      .select()
      .from(servicos)
      .where(and(eq(servicos.id, id), eq(servicos.tenantId, tenantId)));
    if (!atual) return { erro: "Serviço não encontrado." };

    const novaFoto = await enviarFoto(tenantId, fd.get("foto"));
    const removerFoto = fd.get("removerFoto") === "on";
    let fotoUrl = atual.fotoUrl;
    if (novaFoto) fotoUrl = novaFoto;
    else if (removerFoto) fotoUrl = null;

    await db
      .update(servicos)
      .set({ ...dados, ativo: fd.get("ativo") === "on", fotoUrl })
      .where(and(eq(servicos.id, id), eq(servicos.tenantId, tenantId)));
    if (atual.fotoUrl && atual.fotoUrl !== fotoUrl) await apagarFotos([atual.fotoUrl]);
    revalidatePath(`/admin/clientes/${tenantId}`);
    return { ok: true };
  } catch (e) {
    return { erro: msg(e) };
  }
}

export async function excluirServico(fd: FormData) {
  await exigirAdmin();
  const id = String(fd.get("id"));
  const tenantId = String(fd.get("tenantId"));
  const [s] = await db
    .delete(servicos)
    .where(and(eq(servicos.id, id), eq(servicos.tenantId, tenantId)))
    .returning({ fotoUrl: servicos.fotoUrl });
  if (s) await apagarFotos([s.fotoUrl]);
  revalidatePath(`/admin/clientes/${tenantId}`);
}

// ---------- Solicitações ----------

export async function mudarStatusSolicitacao(fd: FormData) {
  await exigirAdmin();
  const id = String(fd.get("id"));
  const tenantId = String(fd.get("tenantId"));
  await db
    .update(solicitacoes)
    .set({ status: umDe(STATUS_SOL, fd.get("status"), "Status") })
    .where(and(eq(solicitacoes.id, id), eq(solicitacoes.tenantId, tenantId)));
  revalidatePath(`/admin/clientes/${tenantId}`);
}
