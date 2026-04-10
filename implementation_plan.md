# Implementation Plan

Data: 2026-04-10

## Objetivo

Fechar a producao operacional com o que ja esta funcionando e preparar o cutover final de dominio sem abrir novas frentes de produto.

## Plano executado nesta continuidade

1. Revalidar os endpoints publicos de producao:
   - `https://x-acai-production-backend.onrender.com/health`
   - `https://x-acai-delivery.vercel.app/`
2. Revalidar o smoke publico do frontend:
   - produto
   - carrinho
   - checkout
   - pedido
3. Revalidar autenticacao admin com Firebase e leitura autenticada do menu.
4. Revalidar o fluxo Pix real em duas pontas:
   - novo pedido com QR real e `pending_payment`
   - pedido ja pago com `paid / completed`
5. Registrar a decisao operacional atual:
   - producao continua com `WHATSAPP_PROVIDER=mock`
6. Atualizar a trilha do repo:
   - `PROJECT_STATUS.md`
   - `task.md`
   - `implementation_plan.md`
   - `walkthrough.md`
7. Alinhar a documentacao e os templates de ambiente:
   - `docs/PRODUCTION_ENVIRONMENT.md`
   - `docs/PRODUCTION_CHECKLIST.md`
   - `.env.production.example`
8. Preparar o checklist final de cutover de dominio:
   - frontend
   - backend
   - `NEXT_PUBLIC_API_URL`
   - `CORS_ORIGIN`
   - `MP_WEBHOOK_URL`
   - `Site` do Mercado Pago

## Fora de escopo desta etapa

- ativar WhatsApp real em producao sem Evolution publica pronta
- reimportar catalogo
- abrir nova feature antes do fechamento operacional

## Entregaveis desta etapa

- fotografia fiel da producao atual salva no repo
- smoke final documentado com evidencias reais
- checklist objetivo para a troca das URLs publicas temporarias pelo dominio final
