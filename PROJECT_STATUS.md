# Project Status - X-Acai Delivery

Data: 2026-04-10

## Estado atual validado

- frontend publico em producao: `https://x-acai-delivery.vercel.app`
- backend de producao no Render: `https://x-acai-production-backend.onrender.com`
- banco de producao no Neon em uso pelo backend publicado
- autenticacao admin com Firebase validada em producao
- catalogo importado do iFood publicado em producao com `28` produtos e `4` categorias
- complementos e adicionais reconciliados contra o Partner Portal do iFood
- repeticao do mesmo complemento com botoes `+ / -` validada no frontend publico
- CTA fixo de produto, carrinho, checkout e pedido visivel sem sobreposicao da navegacao inferior
- Pix real em producao validado em duas pontas:
  - pedido pendente com QR real: `f4d7e02e-f5d6-47bc-a207-56558a4013e5`
  - pedido pago/completed: `75df02d7-0baa-424d-a5f5-58048ed29599`
- WhatsApp de producao mantido em `mock` por ausencia de Evolution publica valida

## Smoke final desta etapa

### Backend

- `GET /health` respondeu `200`
- `GET /api/default/menu` respondeu com o catalogo publicado
- `GET /api/default/menu/item/0eefa328-3790-44f2-bcc6-cc41116da590` confirmou grupos reais de complemento
- `GET /api/default/orders/f4d7e02e-f5d6-47bc-a207-56558a4013e5/payment-status` confirmou `pending / pending_payment`
- `GET /api/default/orders/75df02d7-0baa-424d-a5f5-58048ed29599/payment-status` confirmou `paid / completed`

### Frontend publico

- `/` respondeu `200`
- `/product/0eefa328-3790-44f2-bcc6-cc41116da590` respondeu `200`
- `/cart` respondeu `200`
- `/checkout` respondeu `200`
- `/order/75df02d7-0baa-424d-a5f5-58048ed29599` respondeu `200`

### Admin

- login admin com Firebase validado em producao
- `GET /api/admin/menu?slug=default` respondeu autenticado com `28` itens
- `GET /api/admin/orders?slug=default&limit=10` respondeu autenticado com pedidos reais recentes
- o pedido `f4d7e02e-f5d6-47bc-a207-56558a4013e5` apareceu no admin com `pending_payment`
- o pedido `75df02d7-0baa-424d-a5f5-58048ed29599` apareceu no admin com `paid / completed`

## Pendencias externas para o go-live final

- dominio final do frontend ainda nao esta apontado
- subdominio final do backend ainda nao esta apontado
- `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, `MP_WEBHOOK_URL` e o campo `Site` do Mercado Pago ainda usam URLs publicas temporarias
- WhatsApp real em producao segue bloqueado por falta de Evolution publica valida

## Proximo passo recomendado

1. Executar o cutover de dominio final.
2. Atualizar as variaveis e URLs publicas para o dominio definitivo.
3. Repetir um smoke curto apos o cutover:
   - `/health`
   - menu publico
   - produto com complementos repetidos
   - checkout
   - Pix real com webhook HTTPS final
