@AGENTS.md

- Responda e escreva textos de interface em português.
- Toda query de dados de cliente filtra por `tenant_id`. Toda server action do painel chama `exigirAdmin()` (ou, na fase 2, a checagem da cliente).
- Mudou o schema: `npm run db:generate` e commite a migração em `drizzle/`.
- Antes de commitar: `npm run typecheck && npm run lint && npm test`.
