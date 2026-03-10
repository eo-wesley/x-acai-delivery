# 🌍 Variáveis de Ambiente (Production)

Guia completo das configurações necessárias para o funcionamento real do X-Açaí Delivery.

## 🧱 Essenciais
| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NODE_ENV` | Define o ambiente (production/development) | `production` |
| `PORT` | Porta onde o backend irá rodar | `3000` |
| `DATABASE_URL` | URL de conexão PostgreSQL (Obrigatório para Prod) | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | Chave mestre para criptografia de tokens | `uma-senha-longa-e-aleatoria` |
| `NEXT_PUBLIC_API_URL` | Endereço público da API (Frontend consome) | `https://api.xacai.com.br` |

## 💰 Pagamentos (Mercado Pago)
| Variável | Descrição |
|----------|-----------|
| `MP_ACCESS_TOKEN` | Token de Produção gerado no painel do Mercado Pago |
| `MP_PUBLIC_KEY` | Chave pública para o frontend (opcional) |

## 💬 WhatsApp (Evolution API)
| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `WHATSAPP_BASE_URL` | URL onde a Evolution API está rodando | `https://evo.xacai.com.br` |
| `WHATSAPP_INSTANCE` | Nome da instância (ex: xacai-principal) | `acai-vendas` |
| `WHATSAPP_API_KEY` | API Key configurada na Evolution API | `sua-chave-secreta` |

## 🏠 SaaS & Multi-tenant
| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `BASE_DOMAIN` | Domínio base para subdomínios automáticos | `xacai.com.br` |
| `DEFAULT_TENANT_SLUG` | Slug do restaurante principal | `matriz` |

## 🚨 Observabilidade
| Variável | Descrição |
|----------|-----------|
| `LOG_LEVEL` | Nível de detalhamento dos logs (info, error, debug) |
| `SENTRY_DSN` | (Opcional) DSN para monitoramento de erros |

---
**Nota:** Em ambiente de desenvolvimento, o sistema utilizará `sqlite` por padrão se `DATABASE_URL` não for fornecida.
