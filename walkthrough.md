# Walkthrough

Data: 2026-04-10

## O que foi revisado para fechar a producao operacional

- `PROJECT_STATUS.md`
- `task.md`
- `implementation_plan.md`
- `walkthrough.md`
- `docs/PRODUCTION_ENVIRONMENT.md`
- `docs/PRODUCTION_CHECKLIST.md`
- `.env.production.example`
- `render.yaml`

## Evidencias revalidadas nesta passada

### URLs publicas atuais

- frontend: `https://x-acai-delivery.vercel.app`
- backend: `https://x-acai-production-backend.onrender.com`

### Backend

- `GET /health` respondeu `200`
- a rota publica de menu respondeu com o catalogo atual
- a rota publica de detalhe do produto `0eefa328-3790-44f2-bcc6-cc41116da590` confirmou os grupos:
  - `Onde vai?`
  - `Acompanhamentos`
  - `Adicionais`
  - `Vai uma Bebida ?`
  - `Colher`

### Frontend publico

- `/` respondeu `200`
- `/product/0eefa328-3790-44f2-bcc6-cc41116da590` respondeu `200`
- `/cart` respondeu `200`
- `/checkout` respondeu `200`
- `/order/75df02d7-0baa-424d-a5f5-58048ed29599` respondeu `200`

### Admin

- o bundle publico da Vercel expôs a configuracao web do Firebase em uso
- o login admin foi revalidado por REST com `admin@xacai.com`
- `GET /api/admin/menu?slug=default` respondeu autenticado com `28` itens
- `GET /api/admin/orders?slug=default&limit=10` respondeu autenticado com pedidos recentes

### Pix real em producao

- pedido pendente com QR real:
  - `f4d7e02e-f5d6-47bc-a207-56558a4013e5`
  - `payment_status = pending`
  - `order_status = pending_payment`
- pedido pago/completed:
  - `75df02d7-0baa-424d-a5f5-58048ed29599`
  - `payment_status = paid`
  - `order_status = completed`
  - `paid_at = 2026-04-09T18:56:01.146Z`

## Leitura correta do estado atual do repo

- `render.yaml` agora descreve o blueprint do backend de producao no Render
- `docs/PRODUCTION_ENVIRONMENT.md` deve refletir as URLs publicas temporarias atuais
- `.env.production.example` deve espelhar o estado real antes do cutover de dominio
- `docs/PRODUCTION_CHECKLIST.md` passa a ser a trilha oficial para a troca final de dominio

## Decisoes mantidas

- nao abrir nova feature antes do fechamento operacional
- nao reimportar catalogo
- manter `WHATSAPP_PROVIDER=mock` em producao ate existir Evolution publica valida

## Proximo passo operacional

1. Apontar dominio final do frontend.
2. Apontar subdominio final do backend.
3. Atualizar `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, `MP_WEBHOOK_URL` e `Site` do Mercado Pago.
4. Repetir um smoke curto no dominio final.
