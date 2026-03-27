# 🚀 Guia de Deploy — X-Açaí Delivery

Este documento descreve como levar o sistema para produção real seguindo as melhores práticas de estabilidade e segurança.

## 📋 Pré-requisitos
- Servidor Linux (Ubuntu 22.04 recomendado)
- Docker e Docker Compose instalados
- Chave SSH configurada
- Domínio configurado no DNS (A record apontando para o IP)

## 🏗️ Opção 1: Cloud-First (Recomendado para SaaS)
Esta é a forma mais moderna e escalável de hospedar a plataforma.

### Frontend (Next.js) - [Vercel](https://vercel.com)
1. Conecte seu repositório GitHub ao Vercel.
2. Defina as variáveis de ambiente (veja `PRODUCTION_ENVIRONMENT.md`).
3. O Vercel detectará automaticamente as configurações de build.

### Backend (Node.js) - [Railway](https://railway.app)
1. Conecte o repositório ao Railway.
2. O Railway usará o arquivo `railway.json` na raiz para configurar o serviço.
3. Configure `DATABASE_URL` e `REDIS_URL` no painel.

## 🐳 Opção 2: Servidor Próprio (Docker)
Ideal para controle total e redução de custos fixos.

1. Configure o arquivo `.env` (baseado no `.env.example`).
2. Suba os containers de produção:
```bash
npm run docker:prod
```
3. O sistema usará o `docker-compose.prod.yml` para orquestrar os serviços.

## 🗄️ Gerenciamento de Banco de Dados
O sistema suporta PostgreSQL nativamente se a variável `DATABASE_URL` estiver presente.

### Migrações
As migrações ocorrem automaticamente no startup do backend, mas você pode rodar manualmente se buildar sem Docker:
```bash
npm run migrate
```

### Backups
Recomendamos o uso de `pg_dump` via cronjob:
```bash
docker exec -t x-acai-postgres pg_dumpall -c -U postgres > backup_$(date +%F).sql
```

## 🔐 Segurança
- **SSL/HTTPS:** Recomendamos o uso de **Nginx Proxy Manager** ou **Traefik** como camada externa.
- **Firewall:** Bloqueie todas as portas exceto 80, 443 e 22 (SSH).
- **Secrets:** Nunca compartilhe seu `JWT_SECRET` ou `ACCESS_TOKEN` do Mercado Pago.

## 📲 Integrações de Produção
- **WhatsApp:** Certifique-se que o servidor da Evolution API esteja público e com HTTPS.
- **Mercado Pago:** O Webhook deve ser configurado no painel do desenvolvedor apontando para `https://sua-api.com/api/payments/mercadopago/webhook`.
