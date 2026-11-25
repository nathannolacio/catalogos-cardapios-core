import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { BotaoSair } from "@/components/sair";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const s = await exigirAdmin();
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold">
            Cardápios · Admin
          </Link>
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <span className="hidden sm:inline">{s.user.email}</span>
            <BotaoSair />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
