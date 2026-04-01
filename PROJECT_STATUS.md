# Project Status - X-Acai Delivery

Data: 2026-04-01

## Estado atual reconstruido

- Backend de staging online no Render com PostgreSQL no Neon
- Auth admin padronizada em Firebase no backend e no frontend admin
- Menu admin e menu publico validados em staging
- Smoke test visual do frontend/admin concluido
- WhatsApp real local validado com Evolution
- Pix sandbox real em staging validado sem fallback mock
- Webhook do Mercado Pago atualizando pedidos para `paid` / `confirmed`

## Ultimo ponto confirmado no GitHub antes desta entrega

Commits mais recentes em `origin/main`:

- `09621a69` fix(pix): persist payment logs with current staging schema
- `44d998c4` fix(pix): honor staging webhook url and expose payment logs
- `a27c5a1c` feat(db): publish staging postgres migration layer
- `c7c9d2b2` fix(admin): unify staging admin auth on firebase

Esses commits consolidaram o staging real, o Firebase Admin no backend, a camada de migracao PostgreSQL e a observabilidade minima de pagamentos.

## Entrega atual

Foco executado: normalizacao operacional do status `confirmed` apos aprovacao Pix.

Concluido nesta entrega:

- tela de pedidos do admin ajustada para tratar `pending_payment`, `accepted` e `confirmed`
- fluxo do pedido pago segue no admin para `preparing` sem ficar preso em status cru
- KDS/cozinha passa a exibir pedidos `confirmed`
- Live Hub e contadores operacionais passam a considerar `confirmed`
- analytics e dashboard deixam de subcontar pedidos pagos que aguardam preparo
- documentos de continuidade recriados e atualizados com o ponto real do produto

## Arquivos principais desta entrega

- `apps/frontend/src/app/admin/orders/page.tsx`
- `apps/frontend/src/app/admin/kitchen/page.tsx`
- `apps/frontend/src/app/admin/live/page.tsx`
- `apps/backend/src/db/repositories/analytics.repo.ts`
- `apps/backend/src/db/repositories/operations.repo.ts`
- `apps/backend/src/routes/admin.router.ts`
- `PROJECT_STATUS.md`
- `task.md`
- `implementation_plan.md`
- `walkthrough.md`

## Validacoes ja confirmadas antes desta entrega

- `/health` em staging respondendo com banco ok
- `/api/admin/profile` funcional com token Firebase valido
- `POST /api/admin/menu?slug=default` funcional
- menu publico refletindo alteracoes do admin
- `POST /api/default/orders` funcional em staging
- `GET /api/default/orders/:id/payment-status` consistente com o estado do pedido
- webhook do Mercado Pago na rota:
  `https://x-acai-staging-backend.onrender.com/api/payments/mercadopago/webhook/mercadopago`

## Risco residual atual

- Ainda existem arquivos legados e alteracoes locais fora deste escopo no worktree; eles nao foram tocados nesta entrega.
- O backlog historico do repositorio esta desatualizado em relacao ao estado real do staging.

## Proximo passo mais coerente apos esta entrega

1. Fazer um fechamento operacional da jornada Pix no admin com observabilidade visual de pagamento/logs, se isso ainda estiver faltando na interface.
2. Escolher o proximo bloco de endurecimento de producao entre:
   - deploy publico do frontend de staging
   - endurecimento operacional do WhatsApp em cloud
   - limpeza dos fluxos/admin ainda presos em `/api/...` relativo
