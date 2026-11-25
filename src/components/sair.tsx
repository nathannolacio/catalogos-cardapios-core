"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function BotaoSair() {
  const router = useRouter();
  return (
    <button
      className="botao-sec"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
