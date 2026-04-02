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

## Como ler o estado do projeto daqui para frente

- `PROJECT_STATUS.md` = fotografia resumida do produto
- `task.md` = missao ativa
- `implementation_plan.md` = plano aplicado nesta fase
- `walkthrough.md` = trilha de leitura e evidencias
- `docs/PRODUCTION_ENVIRONMENT.md` = contrato de variaveis
- `docs/PRODUCTION_CHECKLIST.md` = sequencia final de rollout
