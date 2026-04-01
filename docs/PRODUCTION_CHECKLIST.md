# Production Checklist - X-Acai

Data: 2026-04-01

## O que ja esta pronto

- backend de staging validado no Render com PostgreSQL no Neon
- auth admin padronizada com Firebase
- menu admin, menu publico e smoke do admin validados
- frontend preparado para deploy remoto separado do backend
- Pix sandbox real validado com webhook na rota correta
- WhatsApp real validado localmente com Evolution
- staging mantido em `WHATSAPP_PROVIDER=mock` por decisao tecnica correta

## O que ainda falta para ir a producao

- criar o backend de producao no Render
- criar o banco PostgreSQL de producao no Neon
- publicar o frontend de producao no Vercel
- configurar as credenciais reais de Firebase, Mercado Pago e Evolution
- apontar dominio e subdominios HTTPS reais
- rodar smoke test final em dominio publico

## Sequencia final recomendada

### 1. Backend de producao

Criar um novo servico Node no Render para o backend de producao com:

- `Root Directory`: `apps/backend`
- `Build Command`: `npm ci --include=dev`
- `Start Command`: `npx tsx src/server.ts`
- `Health Check Path`: `/health`

Variaveis minimas:

- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_URL`
- `WHATSAPP_PROVIDER=evolution`
- `WHATSAPP_BASE_URL`
- `WHATSAPP_INSTANCE`
- `WHATSAPP_API_KEY`
- `CORS_ORIGIN`
- `BASE_DOMAIN`

### 2. PostgreSQL de producao

Criar o banco no Neon e conectar o backend de producao com `DATABASE_URL`.

Bootstrap recomendado:

1. rodar `npm run db:migrate`
2. rodar `npm run db:seed:minimal` somente se precisar subir tenant/item inicial
3. manter `DB_SEED_MINIMAL=false` depois do bootstrap

### 3. Firebase

Backend:

- Render com `FIREBASE_SERVICE_ACCOUNT_JSON`

Frontend:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 4. Mercado Pago

Configurar credenciais reais de producao no backend:

- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_URL=https://api.seudominio.com/api/payments/mercadopago/webhook/mercadopago`

Antes do go-live:

- validar criacao de pagamento sem fallback mock
- validar notificacao HTTPS real chegando no backend
- confirmar pedido mudando para `paid` / `confirmed`

### 5. WhatsApp

Provisionar uma Evolution publica separada do local/staging.

Checklist:

- instancia conectada ao numero oficial
- `WHATSAPP_PROVIDER=evolution`
- `WHATSAPP_BASE_URL` publico
- `WHATSAPP_INSTANCE` correta
- `WHATSAPP_API_KEY` valida

### 6. Frontend de producao

Publicar no Vercel com:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_*`

O frontend ja esta ajustado para deploy separado do backend.

### 7. Dominio e HTTPS

Recomendacao:

- Cloudflare para DNS e proxy
- `app.seudominio.com` -> frontend
- `api.seudominio.com` -> backend
- `wa.seudominio.com` -> Evolution, se fizer sentido operacionalmente

### 8. Smoke test final obrigatorio

1. `GET /health`
2. login admin
3. cadastro/edicao de item
4. menu publico refletindo mudanca
5. criacao de pedido
6. Pix com webhook HTTPS real
7. pedido atualizando para `paid` / `confirmed`
8. notificacao WhatsApp disparada

## Bloqueios reais restantes

- nao existe Evolution publica confirmada para staging/producao ainda
- dominio final ainda nao esta apontado
- credenciais de producao ainda nao foram aplicadas nos provedores

## Proximo passo minimo quando for virar producao

1. provisionar Neon de producao
2. provisionar backend de producao no Render
3. colar credenciais reais
4. publicar frontend no Vercel
5. validar smoke final
