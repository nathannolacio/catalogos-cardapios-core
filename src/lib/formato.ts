export function formatarPreco(centavos: number | null | undefined) {
  if (centavos == null) return "Sob consulta";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "45,90" | "45.90" | "45" -> 4590 ; vazio -> null */
export function lerPreco(valor: FormDataEntryValue | null): number | null {
  const s = String(valor ?? "").trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const normal = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normal);
  if (!Number.isFinite(n) || n < 0) throw new Error("Preço inválido");
  return Math.round(n * 100);
}

export function lerInteiro(valor: FormDataEntryValue | null): number | null {
  const s = String(valor ?? "").trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error("Número inválido");
  return n;
}

export function texto(valor: FormDataEntryValue | null): string | null {
  const s = String(valor ?? "").trim();
  return s ? s : null;
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function precoParaInput(centavos: number | null | undefined) {
  if (centavos == null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export const ROTULO_STATUS_TENANT = { previa: "Prévia", ativo: "Ativo", suspenso: "Suspenso" } as const;
export const ROTULO_STATUS_SOLICITACAO = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  nao_enviou: "Não enviou",
} as const;
