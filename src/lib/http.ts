/** Respostas JSON com CORS liberado: os fronts das clientes ficam em outros domínios. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/**
 * Cache na CDN da Vercel: resposta fresca por 60 s e, se a API ou o banco falharem,
 * a CDN continua servindo a última versão boa por até 7 dias (stale-if-error).
 */
export const CACHE_PUBLICO = "public, s-maxage=60, stale-while-revalidate=300, stale-if-error=604800";

export function json(data: unknown, init: { status?: number; cache?: string } = {}) {
  return Response.json(data, {
    status: init.status ?? 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": init.cache ?? "no-store",
    },
  });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function erro(status: number, mensagem: string, extra?: Record<string, unknown>) {
  return json({ erro: mensagem, ...extra }, { status });
}
