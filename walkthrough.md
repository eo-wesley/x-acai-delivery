# Walkthrough

Data: 2026-04-01

## O que foi revisado para reconstruir o estado

- `PROJECT_STATUS.md`
- commits recentes de `origin/main`
- fluxo de notificacoes WhatsApp
- telas de frontend presas em `/api/...` relativo
- docs de ambiente e deploy
- build real do frontend em checkout limpo

## Evidencias encontradas

- staging segue correto com `WHATSAPP_PROVIDER=mock`
- nao existe Evolution publica confirmada para staging
- `finance` e `logistics` ainda estavam presos em fetch relativo e sem `Authorization`/`slug`
- a documentacao ainda apontava para webhook antigo e nao documentava todo o contrato `NEXT_PUBLIC_FIREBASE_*`
- a build do frontend ainda tinha bloqueios reais em:
  - `criar-delivery`
  - `pix/[id]`
  - `onboarding/welcome`
  - `login`
  - `admin/reports`
- a `DATABASE_URL` de producao recebida aponta para um Postgres real no Neon
- a base de producao estava inicialmente sem tabelas no schema `public`

## Mudanca aplicada nesta entrega

1. Staging WhatsApp:
   - decisao formalizada de manter mock ate existir Evolution publica valida
2. Frontend remoto:
   - `finance` e `logistics` ajustados para backend remoto com token e slug
   - `vercel.json` alinhado com `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_FIREBASE_*`
3. Build blockers:
   - import quebrado em `criar-delivery` corrigido
   - comparacao de fase na tela Pix corrigida
   - leituras de query string tornadas compatíveis com build sem `useSearchParams`
4. Producao:
   - envs e webhook atualizados
   - checklist final de producao criada em `docs/PRODUCTION_CHECKLIST.md`
5. Producao real - banco:
   - conexao real com o Neon validada
   - `db:migrate` aplicada com sucesso
   - schema `public` confirmado com as tabelas do produto
   - seed minima evitada por seguranca
6. Producao real - backend:
   - `render.yaml` revisto e corrigido para remover o caminho legado em Docker
   - blueprint atualizado para `node`, `rootDir: apps/backend` e `preDeployCommand: npm run db:migrate`
   - `CORS_ORIGIN` passou a ser aplicado no backend em runtime
   - variaveis obrigatorias do Render reduzidas ao contrato realmente usado pelo codigo
7. Producao real - validacao inicial do backend:
   - `GET /health` confirmou backend online com banco `ok`
   - hostname final do Render ficou `https://x-acai-production-backend.onrender.com`
   - rotas admin responderam `401` com a mensagem esperada de Firebase quando chamadas sem token
   - menu publico respondeu vazio, coerente com a base sem seed minima
   - criacao de pedido respondeu `201`, mas com `payment_reference` em `mock_...`, revelando bloqueio real de configuracao do Mercado Pago em producao
8. Producao real - frontend:
   - configuracao do projeto na Vercel revisada e sem bloqueio estrutural de deploy
   - o primeiro deploy ficou dependente apenas de um novo push na `main`, porque ainda nao havia nenhum deployment registrado no projeto
   - o trigger escolhido foi uma alteracao minima de documentacao, sem impacto funcional no app

## Como ler o estado do projeto daqui para frente

- `PROJECT_STATUS.md` = fotografia resumida do produto
- `task.md` = missao ativa
- `implementation_plan.md` = plano aplicado nesta fase
- `walkthrough.md` = trilha de leitura e evidencias
- `docs/PRODUCTION_ENVIRONMENT.md` = contrato de variaveis
- `docs/PRODUCTION_CHECKLIST.md` = sequencia final de rollout

## Atualizacao - leitura do iFood e importacao de cardapio

- o link publico do iFood identifica a loja correta, mas o HTML server-side chega com o menu vazio
- a investigacao das bundles mostrou que o catalogo rico e carregado no cliente por funcoes como `getMerchantInfo` e `getItemDetails`
- por isso o caminho viavel passou a ser sessao autenticada no navegador, e nao raspagem do HTML cru
- o repositorio agora tem um importador one-off em `scripts/import-ifood-menu.js`
- o importador:
  - abre o navegador com DevTools remoto
  - espera login manual inevitavel no iFood e no admin do X-Acai
  - captura respostas JSON do iFood pela rede
  - monta um snapshot normalizado
  - importa produtos e grupos de opcoes pela API oficial do admin
- a ordenacao exata do cardapio tambem foi fechada no X-Acai via `sort_order` no repositorio de menu e na tela admin/menu

## Atualizacao desta entrega

- a `origin/main` mais recente tinha voltado o fluxo do importador para snapshot/manual
- a continuidade desta etapa recolocou o caminho autenticado `open` + `run` sobre a `main` atual, sem perder o fallback por snapshot
- a principal mudanca tecnica foi forcar a abertura de cada item capturado no iFood para puxar payloads de detalhe/modificadores antes da escrita
- os screenshots enviados pelo usuario vieram de `portal.ifood.br/menu-list`, confirmando o portal do parceiro como melhor fonte de auditoria de ordem/completude
- a sessao remota do navegador nao se manteve estavel o tempo todo, entao o fluxo final combinou:
  - importador preparado para portal autenticado
  - snapshot normalizado rico ja existente no repo como fallback seguro
- o token Firebase do admin de producao foi lido da sessao do frontend no navegador remoto e usado apenas para a escrita via API oficial
- a importacao real foi executada com sucesso no backend de producao:
  - 27 produtos
  - 4 categorias
  - 33 grupos
  - 268 opcoes
- a validacao pos-importacao confirmou:
  - `GET /api/default/menu` nao vazio
  - `GET /api/admin/menu` com os itens importados
  - `GET /api/admin/menu/:id/options` com complementos no primeiro item
- ponto aberto identificado na producao:
  - o backend atualmente publicado ainda devolve `sort_order = 0` na API
  - a ordem visivel ficou quase toda correta por sequencia de criacao, mas o backend precisa de redeploy atualizado antes da validacao final do checkout/Pix
