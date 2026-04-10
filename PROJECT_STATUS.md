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

## Fechamento da importacao iFood em producao - 2026-04-09

Foco executado: concluir a importacao completa do cardapio do iFood para producao, mantendo fotos, descricoes, bebidas e complementos pelo caminho oficial do admin.

Concluido nesta entrega:

- `scripts/import-ifood-menu.js` passou a priorizar `portal.ifood.com.br/menu-list` na captura autenticada
- o importador agora aceita snapshot ja normalizado como fallback operacional seguro
- a validacao da captura ficou mais forte:
  - registra URL e origem da aba capturada
  - confere quantidade de categorias, produtos e detalhes clicados
  - bloqueia escrita sem complementos/detalhes, salvo override explicito
- a importacao real em producao foi executada via API oficial do admin, nunca por escrita direta no banco
- o catalogo de producao deixou de ficar vazio e recebeu:
  - 27 produtos
  - 4 categorias
  - 33 grupos de opcoes
  - 268 itens de opcao

Validacao confirmada:

- `GET /api/default/menu` deixou de retornar vazio
- `GET /api/admin/menu?slug=default` confirmou os produtos importados em producao
- `GET /api/admin/menu/:id/options?slug=default` confirmou grupos e opcoes do primeiro item
- imagens, descricoes e precos do snapshot rico foram preservados na importacao

Ponto de atencao remanescente:

- o backend atualmente em producao ainda devolve `sort_order = 0` nos itens importados
- na pratica, a maior parte da ordem visual foi preservada pela sequencia de criacao, mas a API publica ainda nao reflete `sort_order` corretamente
- antes de considerar o catalogo 100% finalizado, o backend de producao deve ser redeployado com a `main` mais recente e a ordem publica precisa ser revalidada

## Pos-redeploy do catalogo em producao - 2026-04-09

Foco executado: confirmar o catalogo publicado apos o redeploy do backend e validar o checkout Pix real em producao sem reimportar o menu.

Concluido nesta entrega:

- o backend de producao voltou a responder `sort_order` corretamente na API admin e na API publica
- `GET /api/default/menu` confirmou 27 itens em 4 categorias com ordem coerente por categoria
- `GET /api/default/menu/item/:id` confirmou item com complemento em rota publica:
  - item `Acai X-King Pacoca`
  - 1 grupo de opcoes
  - 8 opcoes no grupo `Turbine seu Acai com Extras Premium`
- o frontend publico respondeu `200` nas rotas criticas:
  - `/`
  - `/product/:id`
  - `/checkout`
  - `/pix/:id`
- um pedido Pix real de producao foi criado com sucesso para validar o fluxo minimo:
  - pedido `75df02d7-0baa-424d-a5f5-58048ed29599`
  - item `Agua Mineral Sem Gas 500ml`
  - `payment_reference` real `153262562923`
  - QR Pix retornado pelo backend
  - `GET /api/default/orders/:id/payment-status` respondeu `pending`

Estado atual confirmado:

- catalogo de producao importado e publicado
- sort_order refletido nas respostas da API
- complementos visiveis no endpoint publico de detalhe do produto
- checkout gera Pix real em producao
- falta apenas a aprovacao/pagamento real para fechar a prova final de `paid/confirmed` em producao

## Correcao de UX do Monte O Seu - 2026-04-09

Foco executado: remover o wizard da tela publica do produto e mostrar todos os complementos/adicionais na mesma tela para os itens de `Acai Monte O Seu`.

Concluido nesta entrega:

- confirmacao tecnica de que o backend de producao ja tinha os grupos/opcoes corretos para os 10 itens de `Acai Monte O Seu`
- a tela `product/[id]` saiu do fluxo `Comecar Montagem` -> `Proximo Passo`
- os grupos agora ficam todos visiveis em lista continua na mesma pagina
- a validacao de obrigatorios continua ativa no CTA final
- o contrato do carrinho e do checkout foi preservado, incluindo `selected_options`

Resultado esperado apos o deploy do frontend:

- `Acompanhamentos` e `Adicionais Extras Premium` aparecem juntos no produto
- o cliente consegue selecionar tudo sem navegar por etapas
- o item entra no carrinho com os complementos escolhidos

## Reconciliacao final dos complementos em producao - 2026-04-09

Foco executado: corrigir definitivamente os grupos/opcoes divergentes de `Acaí Monte O Seu` e `Acaí Copos da Promocao` para deixar o catalogo igual ao snapshot normalizado do iFood.

Concluido nesta entrega:

- `scripts/import-ifood-menu.js` ganhou uma fase explicita de reconciliacao:
  - `reconcile-options`
  - filtra por categoria
  - faz exact sync de grupos e opcoes via API oficial do admin
  - cria faltantes, atualiza divergentes e remove extras
- a escrita do importador deixou de engolir falhas de grupo/opcao apenas como warning:
  - falhas entram no resultado do item
  - `write` agora roda reconciliacao + verificacao final e falha se sobrar mismatch
- o snapshot salvo em `apps/backend/ifood-normalized-augmented.json` foi corrigido para refletir selecao exata dos grupos `Acompanhamentos (Escolha N)`:
  - `Escolha 3` => `min_select = 3` / `max_select = 3`
  - `Escolha 4` => `min_select = 4` / `max_select = 4`
  - `Escolha 6` => `min_select = 6` / `max_select = 6`
  - `Escolha 7` => `min_select = 7` / `max_select = 7`
- a reconciliacao em producao foi executada em duas passadas:
  - 1a passada: criou 2 grupos e 18 opcoes faltantes
  - 2a passada: atualizou 10 grupos de `Monte O Seu` para quantidade exata
- a verificacao final caiu para `0 mismatches` nas categorias alvo

Casos obrigatorios confirmados:

- `Acaí X-King Pacoca`
  - 1 grupo `Turbine seu Acaí com Extras Premium`
  - 8 opcoes
- `Acaí Marmitex 700ml Grátis 4 Complementos`
  - `Acompanhamentos (Escolha 4)` com `min = 4`, `max = 4`, `10` opcoes
  - `Adicionais Extras Premium` com `8` opcoes

Validacao operacional confirmada:

- pedido real criado para `Acaí X-King Pacoca`
  - `selected_options` enviado: `1`
  - `selected_options` persistido: `1`
  - `payment_reference` real gerado em producao
- pedido real criado para `Acaí Marmitex 700ml Grátis 4 Complementos`
  - `selected_options` enviado: `4`
  - `selected_options` persistido: `4`
  - `payment_reference` real gerado em producao

Estado atual confirmado:

- backend e snapshot do repo agora concordam para `Monte O Seu` e `Copos da Promocao`
- a quantidade gratis obrigatoria dos grupos `Escolha N` deixou de ficar em `min_select = 1`
- o frontend publico usa esses mesmos campos para rotulo e validacao, entao a tela passa a refletir a quantidade correta sem novo ajuste de API

## Re-sincronizacao pelo Partner Portal - 2026-04-10

Foco executado: substituir o snapshot antigo pela captura autenticada do `portal.ifood.com.br/menu/list` e deixar o catalogo de producao igual ao portal, inclusive nos grupos de adicionais/complementos.

Concluido nesta entrega:

- `scripts/import-ifood-menu.js` passou a reconhecer o portal atual em `portal.ifood.com.br/menu/list`
- a captura autenticada do portal agora:
  - le a ordem real das categorias/produtos pela DOM do portal
  - captura o header real de autorizacao do Partner Portal
  - busca o detalhe de cada produto via `partner-catalog-bff/product/:id`
- a normalizacao de precos foi corrigida para nao inflar adicionais que ja vinham em centavos
- a reconciliacao exata foi corrigida para remover grupos/opcoes duplicados apos criacao/atualizacao
- o produto faltante `Acai X-Tropical` foi criado em producao antes da sincronizacao final
- `apps/backend/ifood-normalized-augmented.json` foi regravado com a base nova do portal e os precos base atuais de producao

Validacao final confirmada:

- `GET /api/default/menu` retorna `28` produtos em `4` categorias
- o reconciliador terminou com `0 mismatches`
- exemplos confirmados no endpoint publico:
  - `Acai X-King Pacoca`
    - `Tamanho dos Copos` (`4`)
    - `Turbinando o Acai` (`7`)
    - `Vai uma Bebida ?` (`4`)
    - `Colher` (`2`)
  - `Acai X-Tropical`
    - publicado em producao com os mesmos `4` grupos do portal
  - `Acai 300ml Gratis 3 Complementos`
    - `Onde vai?` (`2`)
    - `Acompanhamentos` (`24`, `min=1`, `max=3`)
    - `Adicionais` (`32`)
    - `Vai uma Bebida ?` (`4`)
    - `Colher` (`2`)
  - `Acai 300ml Escolha 2 opcoes`
    - `Copos` (`4`, `min=2`, `max=2`)
    - `Vai uma Bebida ?` (`4`)
    - `Colher` (`2`)
- exemplo de preco revalidado apos a correcao:
  - adicionais do `Acai 300ml Gratis 3 Complementos` em `400`, `500`, `600` e `1000` centavos, sem inflacao para `40000`
