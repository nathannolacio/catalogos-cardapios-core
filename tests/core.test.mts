import { test, before } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "pglite:memory";

const { db } = await import("../src/db");
const { tenants } = await import("../src/db/schema");
const { migrate } = await import("drizzle-orm/pglite/migrator");
const { lerPreco, slugify } = await import("../src/lib/formato");
const sol = await import("../src/lib/solicitacao");
const { montarCatalogo, buscarTenant } = await import("../src/lib/tenant");

before(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: "./drizzle" });
});

test("lerPreco aceita formatos brasileiros", () => {
  assert.equal(lerPreco("45,90"), 4590);
  assert.equal(lerPreco("R$ 1.200,00"), 120000);
  assert.equal(lerPreco("45"), 4500);
  assert.equal(lerPreco(""), null);
  assert.throws(() => lerPreco("abc"));
});

test("slugify", () => {
  assert.equal(slugify("Studio Ána Lima!"), "studio-ana-lima");
});

test("gerarCodigo no formato A12", () => {
  for (let i = 0; i < 50; i++) assert.match(sol.gerarCodigo(), /^[A-HJ-NP-Z]\d{2}$/);
});

test("solicitação valida concordo e telefone", () => {
  const ok = sol.solicitacaoInput.safeParse({ cliente: "x", nome: "Ana", telefone: "(11) 98888-7777", concordo: true });
  assert.ok(ok.success);
  assert.equal(ok.data.telefone, "11988887777");
  assert.equal(sol.solicitacaoInput.safeParse({ cliente: "x", nome: "Ana", telefone: "11988887777" }).success, false);
  assert.equal(sol.solicitacaoInput.safeParse({ cliente: "x", nome: "Ana", telefone: "123", concordo: true }).success, false);
});

test("cria solicitações com códigos únicos e aplica o limite por IP", async () => {
  const [t] = await db.insert(tenants).values({ slug: "teste", nome: "Teste", whatsapp: "5511900000000" }).returning();
  const input = { cliente: "teste", nome: "Ana", telefone: "11988887777", concordo: true as const };
  const codigos = new Set<string>();
  for (let i = 0; i < sol.LIMITE_POR_IP_TENANT; i++) {
    assert.equal(await sol.excedeuLimite(t.id, "ip1"), false);
    const r = await sol.criarSolicitacao(t, input, "ip1");
    assert.ok(!("erro" in r));
    codigos.add((r as { codigo: string }).codigo);
  }
  assert.equal(codigos.size, sol.LIMITE_POR_IP_TENANT);
  assert.equal(await sol.excedeuLimite(t.id, "ip1"), true);
  assert.equal(await sol.excedeuLimite(t.id, "ip2"), false);
});

test("serviço de outra cliente é recusado (isolamento por tenant)", async () => {
  const outra = await buscarTenant("teste");
  const [t2] = await db.insert(tenants).values({ slug: "outra", nome: "Outra" }).returning();
  const { servicos } = await import("../src/db/schema");
  const [s] = await db.insert(servicos).values({ tenantId: t2.id, nome: "X" }).returning();
  const r = await sol.criarSolicitacao(outra!, { cliente: "teste", nome: "Ana", telefone: "11988887777", concordo: true, servicoId: s.id }, "ip3");
  assert.ok("erro" in r);
  const cat = await montarCatalogo(outra!);
  assert.equal(cat.semCategoria.length, 0);
});
