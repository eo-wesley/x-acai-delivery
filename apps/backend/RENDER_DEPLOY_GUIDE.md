# RENDER DEPLOYMENT GUIDE

Este guia reflete o estado atual do backend de producao do X-Acai. O caminho correto agora e o runtime nativo `Node`, sem `Dockerfile`, usando o blueprint da raiz em `render.yaml`.

## 1) Configuracao correta do servico

Crie o backend de producao pelo Render com estes valores:

- **Type**: `web`
- **Runtime**: `node`
- **Name**: `x-acai-production-backend`
- **Root Directory**: `apps/backend`
- **Build Command**: `npm ci --include=dev`
- **Pre-Deploy Command**: `npm run db:migrate`
- **Start Command**: `npx tsx src/server.ts`
- **Health Check Path**: `/health`
- **Auto Deploy**: `off`
- **Plan**: `starter`

O arquivo [render.yaml](C:\Users\Bom\Documents\New project.tmp-seq-main\render.yaml) ja deixa isso declarado para a criacao por Blueprint.

## 2) Firebase Admin

O backend usa uma unica variavel para o Firebase Admin:

- `FIREBASE_SERVICE_ACCOUNT_JSON`

Como obter:

1. Acesse o Firebase Console.
2. Entre no projeto de producao.
3. Abra `Project settings` > `Service accounts`.
4. Gere uma nova private key.
5. Copie o conteudo inteiro do arquivo JSON.

No Render:

- Crie a variavel `FIREBASE_SERVICE_ACCOUNT_JSON`
- Cole o JSON completo como valor

Apague variaveis antigas granulares se existirem:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## 3) Variaveis do backend de producao

| KEY | VALUE |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DB_SEED_MINIMAL` | `false` |
| `WHATSAPP_PROVIDER` | `mock` *(manter assim ate a etapa de WhatsApp em producao)* |
| `DATABASE_URL` | string real do Neon de producao |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON completo da service account |
| `MP_ACCESS_TOKEN` | token real de producao do Mercado Pago |
| `MP_WEBHOOK_URL` | `https://api.seudominio.com/api/payments/mercadopago/webhook/mercadopago` |
| `JWT_SECRET` | segredo interno do backend *(o blueprint pode gerar automaticamente)* |

Observacoes:

- `NEXT_PUBLIC_API_URL` so precisa entrar quando voce ja tiver a URL publica final da API; ela e usada como fallback do Pix e no fluxo legado de checkout do Mercado Pago
- `CORS_ORIGIN` so precisa ser fixada quando o frontend de producao estiver publicado; o backend aceita multiplas origens separadas por virgula

## 4) Deploy

Depois de salvar as variaveis:

1. Crie o servico via **Blueprint** usando o `render.yaml` da raiz, ou replique exatamente os mesmos valores manualmente.
2. O `preDeployCommand` ja roda `npm run db:migrate`, entao nao ha shell manual obrigatoria para bootstrap.
3. Depois do deploy, valide:
   - `GET /health`
   - `GET /api/default/menu`
   - `POST /api/default/orders`
4. Para validar rotas admin protegidas, use um token Firebase valido do projeto de producao.
