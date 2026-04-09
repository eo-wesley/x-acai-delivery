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

Foco executado: estabilização de infraestrutura e validação E2E Pix/Webhook em Staging.

Commit publicado desta etapa:

- `880bc811` (Correção Pix PWA)
- `3dcbcd4a` (Validação WhatsApp Local)
- `96b2baea` (Unificação de rotas de Webhook)
- `70eb5ec8` (Estabilização de variáveis env no Zod)

Concluido nesta entrega:

- Identificação e unificação das rotas de Webhook do Mercado Pago (fallbacks agora apontam para `/api/payments/mercadopago/webhook/mercadopago`).
- Correção do `env.ts` (Zod) para permitir a leitura das variáveis `MP_ACCESS_TOKEN` e `MP_WEBHOOK_URL` em ambiente de produção (Render).
- Script de teste E2E (`test-pix-staging.js`) configurado e validado como ferramenta de infraestrutura.
- WhatsApp local comprovadamente operacional (visto em etapa anterior).

## Proximas missoes recomendadas

1. **VALIDAÇÃO FINAL:** Re-executar o script `node tmp/test-pix-staging.js` assim que o deploy automático do Render (commit `70eb5ec8`) estiver concluído (uptime do servidor RESETAR).
2. Instalar dependencias do frontend localmente e validar build em dev server.
3. Migrar banco de dados SQLite de staging para PostgreSQL (Neon/Supabase) para suportar persistência real.
4. Implementar dashboard administrativo para gestão de instâncias de WhatsApp por restaurante (Multi-tenant).
5. Configurar domínios customizados com SSL e headers de segurança Gringo para o PWA.

## Etapa de Importação iFood — 2026-04-08

Foco executado: corrigir sort_order ponta-a-ponta + criar importador one-off de cardápio iFood.

### Problemas encontrados e corrigidos

- `menu.repo.ts` → `listMenu()` e `getMenuByCategory()` não tinham `ORDER BY sort_order` — **CORRIGIDO**
- `menu.repo.ts` → `createMenuItem()` não persistia `sort_order` — **CORRIGIDO** (INSERT inclui coluna)
- `menu.repo.ts` → `updateMenuItem()` não aceitava `sort_order` — **CORRIGIDO**
- Interface `MenuItem` não tinha campo `sort_order` — **CORRIGIDO**
- `scripts/import-ifood-menu.js` **não existia** (estava só no plano) — **CRIADO**

### O que o importador faz

Script em 3 fases estanques:
- `--phase extract` — Valida snapshot cru do iFood (sem gravar nada)
- `--phase normalize` — Valida + normaliza + salva `tmp/ifood-normalized.json`
- [x] Phase 65: AI-Driven Dynamic Pricing & Revenue Yield
- [x] Phase 66: Logistics AI & Advanced Dispatch
- [x] Phase 67: Tracking Pixels & Marketing Integrations
- [ ] Phase 68: SaaS Landing Page & Automated Onboarding (Plataforma White Label)
- `--phase write` — normalize + escreve em produção via API oficial do admin
- `--phase all` — tudo de uma vez
- `--dry-run` — simula sem gravar

Rotas usadas (API oficial, nunca banco direto):
- `POST /api/:slug/admin/menu` — cria produto com `sort_order`
- `POST /api/:slug/admin/menu/:id/options/groups` — cria grupo de opções
- `POST /api/:slug/admin/menu/:id/options/groups/:gid/items` — cria item de opção

### Próximos passos da importação

1. Login no iFood no navegador → executar bookmarklet do Console → salvar `tmp/ifood-snapshot.json`
2. Rodar `node scripts/import-ifood-menu.js --phase normalize`
3. Revisar `tmp/ifood-normalized.json`
4. Rodar com credenciais reais:
   ```
   XACAI_API_URL=https://x-acai-backend.onrender.com \
   XACAI_ADMIN_TOKEN=<firebase-token> \
   XACAI_SLUG=default \
   node scripts/import-ifood-menu.js --phase write
   ```

## Atualizacao do importador iFood - 2026-04-09

- o caminho recomendado de importacao agora e autenticado no navegador, sem depender so do bookmarklet/manual
- `scripts/import-ifood-menu.js` voltou a suportar:
  - `open` para abrir iFood + admin com DevTools remoto
  - `run` para capturar o catalogo autenticado, abrir cada item e importar via API oficial
- a captura foi endurecida para puxar complementos/adicionais:
  - percorre os itens na ordem do catalogo encontrado
  - abre cada produto para disparar payloads de detalhe/modificadores
  - mistura as respostas ricas ao snapshot antes da normalizacao e da escrita
- a escrita em producao continua protegida contra duplicacao acidental:
  - se o menu nao estiver vazio, o script aborta
  - para sobrescrever deliberadamente, e preciso `--allow-existing` ou `IFOOD_IMPORT_ALLOW_EXISTING=1`
- proximo passo operacional ficou reduzido a login no iFood e no admin nas abas abertas pelo `open`, seguido do `run`
5. Validar menu público, admin e fluxo de checkout até Pix
