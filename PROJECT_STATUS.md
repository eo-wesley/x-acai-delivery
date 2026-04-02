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
- Checklist final de producao consolidada no repo
- Banco de producao provisionado no Neon com schema migrado

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

Foco executado nesta continuidade sequencial:

- registrar a decisao correta de manter WhatsApp mock no staging
- preparar o frontend para deploy remoto separado do backend
- consolidar a checklist final de producao no repo

Concluido nesta continuidade:

- consistencia operacional do status `confirmed` preservada na `main`
- staging mantido estavel com `WHATSAPP_PROVIDER=mock`
- frontend alinhado com backend remoto em `finance` e `logistics`
- build do frontend validada para deploy remoto com env publico preenchido
- documentacao de producao e continuidade atualizada no GitHub

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

## Atualizacao desta continuidade - ETAPA 3

- checklist final de producao criada em `docs/PRODUCTION_CHECKLIST.md`
- defaults finais consolidados:
  - backend: Render
  - frontend: Vercel
  - banco: Neon
  - auth admin: Firebase
  - pagamentos: Mercado Pago
  - dominio/DNS: Cloudflare
  - WhatsApp: Evolution publica separada do local/staging
- ficou explicitado o que ja esta pronto para producao e o que ainda depende de provisionamento real

## Atualizacao desta continuidade - ETAPA 1 da producao real

- banco de producao provisionado no Neon
- `DATABASE_URL` real confirmada como PostgreSQL valida para o backend
- migration versionada aplicada com sucesso na base de producao
- segunda execucao de `db:migrate` confirmou idempotencia
- seed minima nao foi executada na producao por seguranca, para nao criar tenant/item artificial sem necessidade operacional

## Validacao adicional desta continuidade

- `npm run build` do frontend passou com `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_FIREBASE_*` preenchidos
- o warning residual atual e nao bloqueante fica restrito a metadata/viewport legadas e ao aviso de `middleware` deprecated do Next 16

## Arquivos principais desta continuidade

- `apps/frontend/src/app/admin/finance/page.tsx`
- `apps/frontend/src/app/admin/logistics/page.tsx`
- `apps/frontend/src/app/admin/reports/page.tsx`
- `apps/frontend/src/app/criar-delivery/page.tsx`
- `apps/frontend/src/app/login/page.tsx`
- `apps/frontend/src/app/onboarding/welcome/page.tsx`
- `apps/frontend/src/app/order/[id]/page.tsx`
- `apps/frontend/src/app/pix/[id]/page.tsx`
- `apps/frontend/vercel.json`
- `docs/PRODUCTION_ENVIRONMENT.md`
- `docs/PRODUCTION_CHECKLIST.md`
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
- base de producao no Neon conectando e respondendo com schema pronto

## Risco residual atual

- Ainda existem arquivos legados e alteracoes locais fora deste escopo no worktree principal; eles nao entram nesta integracao.
- O backlog historico do repositorio continua mais desatualizado que este status consolidado.
- Permanecem warnings nao bloqueantes do Next 16 sobre metadata/viewport legados e `middleware` deprecated.
- Backend de producao no Render ainda nao foi provisionado.

## Proximo passo operacional

1. Provisionar o backend de producao no Render apontando para o Neon ja criado.
2. Colar as credenciais reais nos provedores.
3. Publicar frontend em dominio HTTPS final.
4. Rodar o smoke test final ponta a ponta.
