import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Painel interno e API sempre dinâmicos: sem Cache Components por enquanto.
  // O cache dos fronts é feito no próprio front (revalidate) e na CDN (Cache-Control da API).
  cacheComponents: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb", // upload de fotos já comprimidas no navegador
    },
  },
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
