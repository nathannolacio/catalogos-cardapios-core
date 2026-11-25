import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------- Negócio ----------

export const planoEnum = pgEnum("plano", ["start", "pro"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["previa", "ativo", "suspenso"]);
export const solicitacaoStatusEnum = pgEnum("solicitacao_status", [
  "pendente",
  "confirmado",
  "nao_enviou",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Cada cliente (profissional / negócio) é um tenant. */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  plano: planoEnum("plano").notNull().default("start"),
  status: tenantStatusEnum("status").notNull().default("previa"),
  whatsapp: text("whatsapp"), // só dígitos, com DDI: 5511999999999
  instagram: text("instagram"), // @usuario, sem URL
  email: text("email"),
  endereco: text("endereco"),
  mapsUrl: text("maps_url"),
  horario: text("horario"), // texto livre, ex.: "Seg a sex, 9h às 18h"
  ...timestamps,
});

export const categorias = pgTable(
  "categorias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("categorias_tenant_idx").on(t.tenantId)],
);

export const servicos = pgTable(
  "servicos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    categoriaId: uuid("categoria_id").references(() => categorias.id, { onDelete: "set null" }),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    precoCentavos: integer("preco_centavos"), // null = "sob consulta"
    duracaoMin: integer("duracao_min"),
    fotoUrl: text("foto_url"),
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("servicos_tenant_idx").on(t.tenantId)],
);

export const solicitacoes = pgTable(
  "solicitacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    codigo: text("codigo").notNull(), // ex.: A12 (mostrado como #A12)
    servicoId: uuid("servico_id").references(() => servicos.id, { onDelete: "set null" }),
    servicoNome: text("servico_nome"), // cópia do nome no momento do pedido
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    observacao: text("observacao"),
    status: solicitacaoStatusEnum("status").notNull().default("pendente"),
    consentimentoEm: timestamp("consentimento_em", { withTimezone: true }).notNull(),
    ipHash: text("ip_hash"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("solicitacoes_tenant_codigo_uq").on(t.tenantId, t.codigo),
    index("solicitacoes_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("solicitacoes_ip_created_idx").on(t.ipHash, t.createdAt),
  ],
);

// ---------- Better Auth ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("cliente"), // "admin" | "cliente"
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type Categoria = typeof categorias.$inferSelect;
export type Servico = typeof servicos.$inferSelect;
export type Solicitacao = typeof solicitacoes.$inferSelect;
