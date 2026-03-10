# 🚀 Guia de Deploy — X-Açaí Delivery

Este documento descreve como levar o sistema para produção real seguindo as melhores práticas de estabilidade e segurança.

## 📋 Pré-requisitos
- Servidor Linux (Ubuntu 22.04 recomendado)
- Docker e Docker Compose instalados
- Chave SSH configurada
- Domínio configurado no DNS (A record apontando para o IP)

## 🏗️ Opção 1: Deploy com Docker (Recomendado)
A forma mais rápida de subir o sistema completo (Backend, Frontend e PostgreSQL).

1. Clone o repositório:
```bash
git clone https://github.com/usuario/x-acai-delivery.git
cd x-acai-delivery
```

2. Configure o arquivo `.env` (veja `ENVIRONMENT.md` para detalhes).

3. Suba os containers:
```bash
docker-compose up -d --build
```

O sistema estará disponível na porta definida em `PORT` (Padrão 3000).

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
