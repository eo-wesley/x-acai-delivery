# Project Status - X-Acai Delivery

Data: 2026-03-27

## Estado atual validado

- Autenticacao admin com Firebase funcionando
- Painel admin funcionando
- Fluxo de pedidos E2E funcionando
- Integracao Pix Mercado Pago funcionando
- Webhook confirmando pagamento e atualizando pedido
- Status de pagamento visivel no admin
- Legibilidade operacional do admin corrigida

## Entrega desta etapa

Foco executado: UX da tela de pagamento Pix no frontend.

Commit publicado desta etapa:

- `adc1d8f892a0fefb26f5a4fae39dcb76b5a8aaa7`

Concluido nesta entrega:

- polling do Pix estabilizado para rodar a cada 3s sem sobreposicao de requisicoes
- compatibilidade entre frontend e backend para rota de status de pagamento
- resolucao do tenant slug alinhada no storefront e persistida no fluxo Pix
- QR Code maior e mais legivel no mobile
- botao de copiar codigo Pix mantido e reforcado na UX
- estado claro de sucesso antes do redirecionamento
- redirecionamento automatico para a tela do pedido com feedback de pagamento aprovado
- CTA no pedido para reabrir a tela Pix quando o pagamento ainda estiver pendente

## Arquivos alterados nesta etapa

- apps/frontend/src/hooks/useTenant.ts
- apps/frontend/src/hooks/usePaymentPolling.ts
- apps/frontend/src/app/checkout/page.tsx
- apps/frontend/src/app/pix/[id]/page.tsx
- apps/frontend/src/app/order/[id]/page.tsx
- apps/backend/src/routes/orders.router.ts

## Validacao executada

Validado nesta maquina:

- checagem sintatica dos arquivos alterados com TypeScript: OK
- git diff --check sem erros bloqueantes de patch: OK

Limitacoes do ambiente atual:

- apps/frontend esta sem dependencias instaladas localmente, entao `npm run lint` e `npm run build` nao puderam rodar
- o backend possui dependencias faltando e erros de tipagem pre-existentes fora do escopo desta etapa, entao `npm run build` nao representa apenas esta entrega

## Proximas missoes recomendadas

1. Instalar dependencias do frontend e validar a jornada Pix no browser real.
2. Revisar o ambiente do backend para restaurar um build limpo.
3. Avancar para infraestrutura de producao (Postgres, staging e secrets).
4. Ativar mensageria real no WhatsApp.
5. Validar webhook Pix em HTTPS real antes do deploy comercial.
