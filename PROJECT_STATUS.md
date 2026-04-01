# Project Status - X-Acai Delivery

Data: 2026-04-01

## Estado atual reconstruido

- Backend de staging online no Render com PostgreSQL no Neon
- Auth admin padronizada em Firebase no backend e no frontend admin
- Menu admin e menu publico validados em staging
- Smoke test visual do frontend/admin concluido
- WhatsApp real local validado com Evolution
- Staging mantido com `WHATSAPP_PROVIDER=mock` por decisao tecnica correta
- Pix sandbox real em staging validado sem fallback mock
- Webhook do Mercado Pago atualizando pedidos para `paid` / `confirmed`
- Frontend preparado para deploy remoto separado do backend

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

## Decisao tecnica registrada nesta continuidade

- O staging continua em `WHATSAPP_PROVIDER=mock`.
- Nao existe Evolution publica confirmada para staging neste momento.
- O provider `evolution` ja esta pronto no backend, mas nao foi ativado no Render para evitar acoplar staging a um endpoint inexistente ou local.
- O WhatsApp real permanece validado no ambiente local com Evolution, sem quebrar o staging.

## Entrega atual

Foco executado: normalizacao operacional do status `confirmed` apos aprovacao Pix.

Concluido nesta entrega:

- tela de pedidos do admin ajustada para tratar `pending_payment`, `accepted` e `confirmed`
- fluxo do pedido pago segue no admin para `preparing` sem ficar preso em status cru
- KDS/cozinha passa a exibir pedidos `confirmed`
- Live Hub e contadores operacionais passam a considerar `confirmed`
- analytics e dashboard deixam de subcontar pedidos pagos que aguardam preparo
- documentos de continuidade recriados e atualizados com o ponto real do produto

## Atualizacao desta continuidade - ETAPA 2

- `finance` e `logistics` do admin deixaram de usar `/api/...` relativo e passaram a usar backend remoto com `NEXT_PUBLIC_API_URL`, `Authorization` e `slug`
- o deploy do frontend no Vercel passou a declarar tambem as variaveis publicas do Firebase
- a documentacao de ambiente foi alinhada com o webhook real do Mercado Pago em `/api/payments/mercadopago/webhook/mercadopago`
- a build do frontend passou no checkout limpo depois de corrigir bloqueios reais de publicacao em:
  - `criar-delivery`
  - `pix/[id]`
  - `onboarding/welcome`
  - `login`
  - `admin/reports`

## Validacao adicional desta continuidade

- `npm run build` do frontend passou com `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_FIREBASE_*` preenchidos
- o warning residual atual e nao bloqueante fica restrito a metadata/viewport legadas e ao aviso de `middleware` deprecated do Next 16

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
- build do frontend validada para deploy remoto com env publico preenchido

## Risco residual atual

- Ainda existem arquivos legados e alteracoes locais fora deste escopo no worktree principal; eles nao entram nesta integracao.
- O backlog historico do repositorio continua mais desatualizado que este status consolidado.

## Proximo passo mais coerente apos esta entrega

1. Consolidar checklist e documentacao de producao com defaults finais de backend, frontend, banco, Firebase, Mercado Pago, dominio e WhatsApp.
2. Preparar a transicao final de staging para producao sem quebrar os ambientes ja validados.
