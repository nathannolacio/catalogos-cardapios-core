import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cardápios · Core",
  description: "API e painel dos cardápios digitais",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-stone-900">{children}</body>
    </html>
  );
}
