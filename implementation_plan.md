# Implementation Plan

Data: 2026-04-01

## Objetivo

Fechar a lacuna operacional deixada pelo Pix aprovado em staging, alinhando backend e frontend para o status `confirmed`.

## Plano executado

1. Revisar o estado real salvo no GitHub e os documentos de continuidade.
2. Revisar os pontos que lidam com status de pedido no admin e no backend.
3. Tratar `confirmed` como estado operacional valido entre pagamento aprovado e preparo.
4. Atualizar os contadores operacionais para nao subcontarem pedidos pagos.
5. Registrar o ponto real do projeto em documentos simples e versionados.
6. Validar o diff, commitar e subir para `main`.

## Escopo tecnico

- Frontend admin:
  - `apps/frontend/src/app/admin/orders/page.tsx`
  - `apps/frontend/src/app/admin/kitchen/page.tsx`
  - `apps/frontend/src/app/admin/live/page.tsx`
- Backend:
  - `apps/backend/src/db/repositories/analytics.repo.ts`
  - `apps/backend/src/db/repositories/operations.repo.ts`
  - `apps/backend/src/routes/admin.router.ts`
- Documentacao:
  - `PROJECT_STATUS.md`
  - `task.md`
  - `implementation_plan.md`
  - `walkthrough.md`

## Fora de escopo

- novas mudancas em Pix alem da consistencia de status
- alterar Firebase, Neon, Render, WhatsApp ou SQLite local
- limpar alteracoes locais preexistentes fora desta etapa
