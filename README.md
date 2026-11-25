# Cardápios · Core

Backend único dos cardápios e catálogos digitais: **API pública** consumida pelos fronts de cada cliente e **painel admin**.
Next.js 16 (App Router) · Drizzle · Postgres no Neon · Better Auth · Vercel Blob.

## Rodar localmente

```bash
npm install
cp .env.example .env.local      # preencha BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate               # sem DATABASE_URL usa PGlite em ./.pglite
npm run seed                     # opcional: cria a cliente de exemplo "demo-beleza"
npm run criar-admin -- voce@email.com "uma-senha-forte" "Seu nome"
npm run dev                      # http://localhost:3000/admin
```

Testes: `npm test` · Tipos: `npm run typecheck` · Lint: `npm run lint`

## API (para os fronts)

Todas as rotas têm CORS liberado e respondem JSON. `{cliente}` aceita o slug ou o id.

| Rota | O que faz |
|---|---|
| `GET /api/catalogo/{cliente}` | Dados do negócio, plano, recursos liberados, categorias e serviços visíveis. Se a cliente estiver suspensa, volta só o status (`disponivel: false`). |
| `GET /api/cliente/{cliente}/status` | `status` (`previa`, `ativo`, `suspenso`), `plano`, `noindex` e `recursos`. |
| `POST /api/solicitacoes` | Cria uma solicitação e devolve o código (`A12`) e o link do WhatsApp. |

Body do `POST /api/solicitacoes`:

```json
{ "cliente": "studio-ana", "servicoId": "uuid opcional", "nome": "Maria", "telefone": "(11) 98888-7777",
  "observacao": "opcional", "concordo": true, "site": "" }
```

- `concordo: true` é obrigatório (aviso de privacidade/LGPD). O horário do aceite fica gravado.
- `site` é um campo isca anti-bot: o front deixa escondido. Se vier preenchido, a API finge sucesso e não grava.
- Limite: 5 solicitações por IP a cada 10 min na mesma cliente, 15 somando todas (responde `429`). O IP é guardado só como hash.
- Respostas: `201` criada, `422` dados inválidos, `404` cliente/serviço não encontrado, `403` cliente suspensa.

### Cache e "última versão boa"

As rotas GET mandam `Cache-Control: public, s-maxage=60, stale-while-revalidate=300, stale-if-error=604800`:
a CDN da Vercel serve a resposta por 60 s e, se o core ou o banco cair, continua servindo a última versão boa.
No front, use `revalidate: 60` e trate erro da API mantendo o último catálogo (isso entra no template da fase 2).

## Painel admin

`/admin`: criar clientes, editar dados, mudar plano e status (prévia, ativo, suspenso), cadastrar categorias e serviços
(fotos redimensionadas para 1200 px em WebP no navegador e enviadas ao Vercel Blob) e marcar solicitações como
Confirmado ou Não enviou. Só contas com `role = admin` entram; cadastro público fica desligado.

## Deploy na Vercel

1. Importe o repositório na Vercel (framework Next.js).
2. Em **Storage**, crie um banco **Neon** (ou cole a connection string em `DATABASE_URL`) e um **Blob store** (gera `BLOB_READ_WRITE_TOKEN`).
3. Variáveis: `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` (ex.: `https://catalogos-cardapios-core.vercel.app`).
4. Rode as migrações e crie seu admin apontando para o Neon:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate
   DATABASE_URL="postgresql://..." npm run criar-admin -- voce@email.com "senha" "Nome"
   ```

## Estrutura

- `src/db/schema.ts`: tabelas (`tenants`, `categorias`, `servicos`, `solicitacoes` e as do Better Auth)
- `drizzle/`: migrações SQL (`npm run db:generate` após mudar o schema)
- `src/app/api/`: rotas públicas
- `src/app/admin/`: painel e server actions (toda action chama `exigirAdmin()` e filtra por `tenant_id`)
- `scripts/`: migração, seed e criação de admin

## Pendências conhecidas (próximas fases)

- Login e painel da cliente, recuperação de senha por e-mail (Resend)
- Backup semanal automático do banco
- Template do front, Asaas, promoções e números do Pro
