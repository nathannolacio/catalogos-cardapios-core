"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("senha")),
    });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={entrar} className="cartao w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Painel dos cardápios</h1>
          <p className="text-sm text-stone-500">Entre com sua conta de administrador.</p>
        </div>
        <div>
          <label className="rotulo" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" required autoComplete="current-password" className="campo" />
        </div>
        {erro && <p className="text-sm text-red-700">{erro}</p>}
        <button className="botao w-full" disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
