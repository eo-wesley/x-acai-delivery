# Guia de Variaveis de Ambiente em Producao - X-Acai

Este documento reflete o contrato atual da aplicacao para deploy separado de frontend e backend.

## Defaults finais recomendados

1. Frontend: Vercel
2. Backend: Render
3. Banco PostgreSQL: Neon
4. Auth admin: Firebase
5. Pagamentos Pix: Mercado Pago
6. WhatsApp: Evolution publica separada de staging/local
7. DNS e proxy: Cloudflare

## Backend obrigatorio

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexao PostgreSQL do Neon/provedor escolhido. | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Segredo interno do backend. | `use-uma-chave-longa-e-aleatoria` |
| `MP_ACCESS_TOKEN` | Access token de producao do Mercado Pago. | `APP_USR-...` |
| `MP_WEBHOOK_URL` | URL HTTPS publica do webhook real do backend. | `https://api.seudominio.com/api/payments/mercadopago/webhook/mercadopago` |
| `WHATSAPP_PROVIDER` | Provider de notificacao. Na subida inicial de producao, manter `mock`; depois trocar para `evolution`. | `mock` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON completo da service account do Firebase Admin. | `{\"type\":\"service_account\",...}` |

## Backend recomendado

| Variavel | Descricao |
|----------|-----------|
| `REDIS_URL` | Redis para filas, cache e workers em producao. |
| `DB_SEED_MINIMAL` | Deve permanecer `false` apos o bootstrap inicial. |
| `NEXT_PUBLIC_API_URL` | URL publica do proprio backend. Hoje ela ainda e usada como fallback interno do Pix e no checkout legado. |
| `CORS_ORIGIN` | Origem do frontend publicado. O backend agora respeita essa variavel e aceita multiplas origens separadas por virgula. |
| `WHATSAPP_BASE_URL` | Base publica da Evolution, quando o provider real for ativado. |
| `WHATSAPP_INSTANCE` | Nome da instancia conectada ao WhatsApp em producao. |
| `WHATSAPP_API_KEY` | Chave da Evolution em producao. |
| `BASE_DOMAIN` | Dominio base do produto, se o SaaS por slug/subdominio for usado. |

## Frontend obrigatorio

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL publica do backend remoto. | `https://api.seudominio.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Chave web publica do Firebase. | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de auth do projeto Firebase. | `xacai.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID do Firebase. | `xacai-prod` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket do Firebase. | `xacai-prod.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Firebase. | `1234567890` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID web do Firebase. | `1:1234567890:web:abcdef123456` |

## Sequencia curta de producao

1. Provisionar PostgreSQL no Neon e guardar `DATABASE_URL`.
2. Publicar backend no Render com `FIREBASE_SERVICE_ACCOUNT_JSON`, Mercado Pago, webhook HTTPS e WhatsApp.
3. Deixar o `preDeployCommand` do Render rodar `npm run db:migrate`.
4. Publicar frontend no Vercel com `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_FIREBASE_*`.
5. Apontar DNS/dominio no Cloudflare.
6. Validar smoke final:
   - `/health`
   - login admin
   - cardapio publico
   - criacao de pedido
   - Pix + webhook
   - notificacao WhatsApp
