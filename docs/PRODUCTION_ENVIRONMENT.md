# Guia de Variaveis de Ambiente em Producao - X-Acai

Este documento reflete o estado atual da producao publicada e o contrato de ambiente para o cutover final de dominio.

## URLs publicas atuais

- frontend: `https://x-acai-delivery.vercel.app`
- backend: `https://x-acai-production-backend.onrender.com`
- webhook Mercado Pago atual:
  - `https://x-acai-production-backend.onrender.com/api/payments/mercadopago/webhook/mercadopago`

## Stack publicada hoje

1. Frontend: Vercel
2. Backend: Render
3. Banco PostgreSQL: Neon
4. Auth admin: Firebase
5. Pix: Mercado Pago
6. WhatsApp: `mock` em producao ate existir Evolution publica

## Backend obrigatorio

| Variavel | Descricao | Exemplo atual |
|----------|-----------|---------------|
| `DATABASE_URL` | String de conexao PostgreSQL da base de producao. | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Segredo interno do backend. | `use-uma-chave-longa-e-aleatoria` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON completo da service account do Firebase Admin. | `{\"type\":\"service_account\",...}` |
| `MP_ACCESS_TOKEN` | Access token real do Mercado Pago. | `APP_USR-...` |
| `MP_WEBHOOK_URL` | URL HTTPS publica do webhook real. | `https://x-acai-production-backend.onrender.com/api/payments/mercadopago/webhook/mercadopago` |
| `WHATSAPP_PROVIDER` | Provider atual de notificacao. | `mock` |

## Backend recomendado

| Variavel | Descricao | Exemplo atual |
|----------|-----------|---------------|
| `NEXT_PUBLIC_API_URL` | Base publica usada por partes do fluxo Pix e por fallbacks internos. | `https://x-acai-production-backend.onrender.com` |
| `CORS_ORIGIN` | Origem publica permitida no backend. | `https://x-acai-delivery.vercel.app` |
| `BASE_DOMAIN` | Dominio base do produto para o cutover final. | `app.seudominio.com` |
| `WHATSAPP_BASE_URL` | Base da Evolution publica quando o provider real for ativado. | `https://wa.seudominio.com` |
| `WHATSAPP_INSTANCE` | Nome da instancia de WhatsApp real. | `restaurante-acai` |
| `WHATSAPP_API_KEY` | Chave da Evolution publica. | `CHANGE_ME_EVOLUTION_KEY` |

## Frontend obrigatorio

| Variavel | Descricao | Exemplo atual |
|----------|-----------|---------------|
| `NEXT_PUBLIC_API_URL` | URL publica do backend remoto. | `https://x-acai-production-backend.onrender.com` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Chave web publica do Firebase. | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de auth do Firebase. | `xacai-delivery-prod.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID do Firebase. | `xacai-delivery-prod` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket do Firebase. | `xacai-delivery-prod.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Firebase. | `1077201570871` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID web do Firebase. | `1:1077201570871:web:...` |

## Nota sobre o blueprint do Render

O `render.yaml` atual do repo descreve o blueprint do backend de producao:

- `name: x-acai-production-backend`
- `rootDir: apps/backend`
- `preDeployCommand: npm run db:migrate`
- `healthCheckPath: /health`

## Quando o dominio final estiver pronto

Atualizar, no minimo:

1. frontend:
   - dominio publico do app
2. backend:
   - subdominio HTTPS real da API
3. variaveis:
   - `NEXT_PUBLIC_API_URL`
   - `CORS_ORIGIN`
   - `MP_WEBHOOK_URL`
   - `BASE_DOMAIN`, se o roteamento por dominio for usado
4. Mercado Pago:
   - campo `Site`
   - webhook HTTPS final

## Decisao operacional atual

Enquanto nao existir Evolution publica valida para producao:

- manter `WHATSAPP_PROVIDER=mock`
- nao usar localhost no Render
- nao bloquear o go-live do app por causa do WhatsApp
