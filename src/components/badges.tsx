import { ROTULO_STATUS_SOLICITACAO, ROTULO_STATUS_TENANT } from "@/lib/formato";

const COR_TENANT = {
  previa: "bg-amber-100 text-amber-800",
  ativo: "bg-emerald-100 text-emerald-800",
  suspenso: "bg-red-100 text-red-800",
} as const;

const COR_SOL = {
  pendente: "bg-amber-100 text-amber-800",
  confirmado: "bg-emerald-100 text-emerald-800",
  nao_enviou: "bg-stone-200 text-stone-700",
} as const;

export function BadgeTenant({ status }: { status: keyof typeof COR_TENANT }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_TENANT[status]}`}>
      {ROTULO_STATUS_TENANT[status]}
    </span>
  );
}

export function BadgeSolicitacao({ status }: { status: keyof typeof COR_SOL }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_SOL[status]}`}>
      {ROTULO_STATUS_SOLICITACAO[status]}
    </span>
  );
}

export function BadgePlano({ plano }: { plano: "start" | "pro" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        plano === "pro" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"
      }`}
    >
      {plano === "pro" ? "Pro" : "Start"}
    </span>
  );
}
