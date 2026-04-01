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

## Etapa publicada depois da UX Pix

Foco executado: camada operacional de notificacoes via WhatsApp no backend.

Commit publicado desta etapa:

- `2267a8993ec4f4695f8f384af81d229f8c473457`

Concluido nesta entrega:

- schema de `notification_logs` alinhado com observabilidade operacional por evento, destinatario, papel, status e motivo
- `whatsapp_configs` garantida no bootstrap do banco para compatibilidade com configuracao por restaurante
- trilha unica de disparo via `eventBus` + camada de notificacao existente
- compatibilidade preservada entre `customerPhone` e `recipientPhone` durante a transicao
- mensagens operacionais automaticas para:
  pedido recebido
  pagamento aprovado
  pedido saiu para entrega
- envio para cliente nos 3 eventos e para a loja no evento de pedido recebido
- idempotencia pratica com `idempotency_key` e trava em memoria para evitar duplicidade concorrente
- webhook do Mercado Pago e app do entregador sem envio direto paralelo
- falha no WhatsApp mantida como non-blocking para nao derrubar o fluxo principal do pedido

## Validacao adicional desta etapa

Validado em mock com SQLite temporario:

- `order_created` gerou 1 log `sent` para cliente e 1 log `sent` para loja
- repeticao concorrente do mesmo evento nao gerou duplicidade de envio/log `sent`
- `order_accepted` gerou 1 log `sent` para cliente
- `order_delivering` gerou 1 log `sent` para cliente
- cenario sem telefone gerou logs `skipped` com `customer_phone_missing` e `store_phone_missing`

Observacao de ambiente:

- durante a validacao apareceu um warning nao bloqueante de BOM/inventario por ausencia da tabela `recipes` no banco temporario de teste; isso nao afetou a camada de notificacao e nao foi alterado nesta etapa

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

## Etapa publicada em 2026-03-31

Foco executado: ativação e validação do WhatsApp real via Evolution API (Local).

Commit publicado desta etapa:

- `880bc811` (Correção Pix)
- Atualização atual (WhatsApp Real Local)

Concluido nesta entrega:

- Limpeza completa do `.env` do backend, eliminando duplicidade de configurações de WhatsApp.
- Configuração local apontando para Evolution API em `localhost:8080`.
- Validação de conectividade com a API Evolution: **OK (HTTP 200)**.
- Validação do estado da instância `acai-delivery`: **OK (Status: open)**.
- Teste de envio real bem-sucedido para o número `5511987470862`: **OK (HTTP 201 - PENDING)**.
- Confirmado que o `EvolutionWhatsAppProvider` está pronto para produção, dependendo apenas do chaveamento de variáveis de ambiente.

## Proximas missoes recomendadas

1. **PRIORITARIO:** Validar webhook Pix ponta a ponta em HTTPS real (staging Render) antes do primeiro cliente pagante.
2. Instalar dependencias do frontend localmente e validar build em dev server.
3. Configurar variaveis de ambiente de producao no Render/Railway (Postgres, secrets Firebase, Evolution API pública).
4. Considerar PWA offline e experiencia de erro de conexao para cliente mobile.
5. Implementar dashboard administrativo para gestão de instâncias de WhatsApp por restaurante (Multi-tenant).
