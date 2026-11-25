import type { Resultado } from "@/app/admin/actions";

export function Aviso({ estado, okTexto = "Salvo." }: { estado: Resultado; okTexto?: string }) {
  if (!estado) return null;
  if (estado.erro) return <p className="text-sm text-red-700">{estado.erro}</p>;
  if (estado.ok) return <p className="text-sm text-emerald-700">{okTexto}</p>;
  return null;
}
