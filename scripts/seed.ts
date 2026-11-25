/** Cria uma cliente de exemplo (slug: demo-beleza) para testar a API localmente. */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { tenants, categorias, servicos } from "../src/db/schema";

async function main() {
  const [existe] = await db.select().from(tenants).where(eq(tenants.slug, "demo-beleza"));
  if (existe) {
    console.log("demo-beleza já existe:", existe.id);
    return;
  }
  const [t] = await db
    .insert(tenants)
    .values({
      slug: "demo-beleza",
      nome: "Studio Demo Beleza",
      plano: "pro",
      status: "previa",
      whatsapp: "5511999999999",
      instagram: "studiodemo",
      horario: "Ter a sáb, 9h às 19h",
    })
    .returning();
  const [cabelo, unhas] = await db
    .insert(categorias)
    .values([
      { tenantId: t.id, nome: "Cabelo", ordem: 1 },
      { tenantId: t.id, nome: "Unhas", ordem: 2 },
    ])
    .returning();
  await db.insert(servicos).values([
    { tenantId: t.id, categoriaId: cabelo.id, nome: "Corte feminino", precoCentavos: 8000, duracaoMin: 60, ordem: 1 },
    { tenantId: t.id, categoriaId: cabelo.id, nome: "Escova", precoCentavos: 5000, duracaoMin: 45, ordem: 2 },
    { tenantId: t.id, categoriaId: unhas.id, nome: "Pé e mão", precoCentavos: 6000, duracaoMin: 90, ordem: 1 },
    { tenantId: t.id, nome: "Avaliação", precoCentavos: null, duracaoMin: 20 },
  ]);
  console.log("Criada demo-beleza:", t.id);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
