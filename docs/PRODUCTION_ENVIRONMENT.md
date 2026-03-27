# Guia de Variáveis de Ambiente em Produção — X-Açaí

Este documento descreve todas as variáveis necessárias para rodar a plataforma X-Açaí em produção.

## Variáveis Obrigatórias (Backend)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexão PostgreSQL (Supabase/Neon). | `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | String de conexão Redis (Upstash/Railway). | `redis://:pass@host:port` |
| `JWT_SECRET` | Chave para assinatura de tokens de autenticação. | `use-uma-chave-longa-e-aleatoria` |
| `ENCRYPTION_KEY` | Chave de 32 caracteres para dados sensíveis. | `12345678901234567890123456789012` |
| `MP_ACCESS_TOKEN` | Token de produção do Mercado Pago. | `APP_USR-...` |
| `MP_NOTIFICATION_URL` | URL pública para receber webhooks de pagamento. | `https://api.seuaçaí.com/api/payments/mercadopago/webhook` |
| `EVOLUTION_API_URL` | URL da sua instância da Evolution API (WhatsApp). | `https://wa.seuaçaí.com` |
| `EVOLUTION_API_KEY` | Chave mestre da Evolution API. | `SUA_API_KEY_AQUI` |

## Variáveis Obrigatórias (Frontend)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL pública do seu backend. | `https://api.seuaçaí.com` |

## Serviços Recomendados para Lançamento de Baixo Custo

1. **Frontend**: Vercel (Hobby) - Grátis
2. **Backend**: Railway ou Render - ~$5/mês
3. **Banco de Dados**: Neon.tech ou Supabase - Grátis (camada free)
4. **Redis**: Upstash - Grátis (camada free)
5. **WhatsApp**: Evolution API em uma VPS barata (Hetzner/DigitalOcean) - ~$4/mês
