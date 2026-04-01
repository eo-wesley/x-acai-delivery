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

- `416d9c6b` feat: stabilize real Pix integration in staging and remove debug tools
- `70eb5ec8` fix: add MP_ACCESS_TOKEN and MP_WEBHOOK_URL to env schema and unify services
- `96b2baea` fix: unify mercadopago webhook paths across backend and test scripts
- `a27c5a1c` feat(db): publish staging postgres migration layer
- `c7c9d2b2` fix(admin): unify staging admin auth on firebase

Esses commits consolidaram o staging real, fecharam a entrada do Mercado Pago sandbox sem fallback mock e estabilizaram a base operacional de Firebase, PostgreSQL e webhook.

## Historico recente preservado

- UX Pix no frontend consolidada com polling, QR mais legivel e retorno claro de pagamento aprovado
- camada operacional de notificacoes via WhatsApp unificada no backend
- WhatsApp real local validado com Evolution API na instancia `acai-delivery`
- Pix real em staging validado com `payment_reference` real e webhook na rota:
  `https://x-acai-staging-backend.onrender.com/api/payments/mercadopago/webhook/mercadopago`

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

## Validacoes ja confirmadas

- `/health` em staging respondendo com banco ok
- `/api/admin/profile` funcional com token Firebase valido
- `POST /api/admin/menu?slug=default` funcional
- menu publico refletindo alteracoes do admin
- `POST /api/default/orders` funcional em staging
- `GET /api/default/orders/:id/payment-status` consistente com o estado do pedido
- webhook do Mercado Pago atualizando pedido para `paid` / `confirmed`
- WhatsApp local validado com conectividade real na Evolution

## Risco residual atual

- Ainda existem arquivos legados e alteracoes locais fora deste escopo no worktree principal; eles nao entram nesta integracao.
- O backlog historico do repositorio continua mais desatualizado que este status consolidado.

## Proximo passo mais coerente apos esta entrega

1. Fechar a observabilidade operacional da jornada Pix no admin, se ainda faltar visualizacao de logs/pagamento.
2. Escolher o proximo bloco de endurecimento entre:
   - deploy publico do frontend de staging
   - endurecimento operacional do WhatsApp em cloud
   - limpeza dos fluxos/admin ainda presos em `/api/...` relativo
