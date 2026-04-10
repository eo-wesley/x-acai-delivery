# Production Checklist - X-Acai

Data: 2026-04-10

## Estado atual antes do cutover

- frontend publico live em `https://x-acai-delivery.vercel.app`
- backend de producao live em `https://x-acai-production-backend.onrender.com`
- banco de producao no Neon ativo
- autenticacao admin com Firebase validada
- catalogo importado do iFood publicado e reconciliado
- Pix real validado em producao
- WhatsApp de producao mantido em `mock`

## Cutover final de dominio

### 1. Frontend

- apontar o dominio final do app na Vercel
- confirmar HTTPS ativo
- atualizar o campo `Site` do Mercado Pago para o dominio final

### 2. Backend

- apontar o subdominio HTTPS real da API no Render
- confirmar `/health` respondendo no dominio final
- atualizar `MP_WEBHOOK_URL` para o dominio final

### 3. Variaveis

Atualizar:

- `NEXT_PUBLIC_API_URL`
- `CORS_ORIGIN`
- `MP_WEBHOOK_URL`
- `BASE_DOMAIN`, se o roteamento por dominio for usado

### 4. DNS / Proxy

- configurar DNS no provedor escolhido
- manter frontend e backend em HTTPS
- revisar qualquer regra de proxy ou redirecionamento

### 5. Mercado Pago

- campo `Site` apontando para o frontend final
- webhook apontando para:
  - `/api/payments/mercadopago/webhook/mercadopago`
- validar criacao de Pix sem fallback
- validar mudanca para `paid / completed`

### 6. WhatsApp

- manter `WHATSAPP_PROVIDER=mock` ate existir Evolution publica valida
- quando a Evolution estiver pronta:
  - configurar `WHATSAPP_BASE_URL`
  - configurar `WHATSAPP_INSTANCE`
  - configurar `WHATSAPP_API_KEY`
  - trocar `WHATSAPP_PROVIDER` para `evolution`

## Smoke obrigatorio depois do cutover

1. `GET /health`
2. home/menu publico
3. produto com repeticao do mesmo complemento
4. carrinho
5. checkout
6. pedido Pix com QR real
7. `payment-status` mudando para `paid`
8. pedido aparecendo no admin com o status correto

## Evidencias atuais ja validadas

- pedido pendente com QR real:
  - `f4d7e02e-f5d6-47bc-a207-56558a4013e5`
- pedido pago/completed:
  - `75df02d7-0baa-424d-a5f5-58048ed29599`
