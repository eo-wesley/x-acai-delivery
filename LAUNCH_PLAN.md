# Plano de Lançamento X-Açaí: Go-To-Market (GTM)

Este guia define a ordem exata de execução para colocar a plataforma online com segurança, baixo custo e estabilidade.

---

## 🏗️ 1. Infraestrutura Recomendada (Cheapest Stack)

Para o lançamento inicial (MVP/Beta), recomendamos o uso de PaaS (Platform as a Service) para evitar custos de gestão de servidores.

| Camada | Ferramenta Recomendada | Custo Estimado (Beta) |
| :--- | :--- | :--- |
| **Backend** | Railway.app (Docker) | $5.00/mês (Pay as you go) |
| **Frontend** | Vercel (Next.js) | Grátis (Free Tier) |
| **Banco de Dados** | Supabase ou Neon (PostgreSQL) | Grátis (Free Tier) |
| **Cache/Filas** | Upstash (Serverless Redis) | Grátis (Free Tier) |
| **Media/CDN** | Cloudinary / Decap | Grátis (Free Tier) |
| **Email/WhastApp** | Evolution API (Próprio) ou Twilio | $0.00 (Local) ou conforme uso |

**Total Estimado: ~$5.00 - $10.00 / mês**

---

## 🚦 2. Ordem de Execução (O Caminho Crítico)

Para alcançar o lançamento público sem erros:

### Passo 1: Configuração do Banco (Dia 1)
- [ ] Provisionar instância no Supabase/Neon.
- [ ] Rodar as migrations iniciais.
- [ ] Rodar `seed-demo.ts` para validar a estrutura.

### Passo 2: Deployment do Backend (Dia 1)
- [ ] Conectar o GitHub ao Railway.
- [ ] Configurar variáveis de ambiente (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`).
- [ ] Validar o `/health` para garantir conexões OK.

### Passo 3: Deployment do Frontend (Dia 1)
- [ ] Conectar repositório à Vercel.
- [ ] Configurar subdomínio `app.xacai.com` ou similar.
- [ ] Validar login e roteamento por slug.

### Passo 4: Integração de Pagamentos (Dia 2)
- [ ] Configurar tokens de produção do Mercado Pago.
- [ ] Validar o recebimento de Webhooks em `/api/payments/mercadopago/webhook`.

### Passo 5: Teste Piloto de Loja (Dia 2-3)
- [ ] Criar a primeira loja real ("Demo Master").
- [ ] Testar ciclo completo: Pedido -> Pagamento -> Cozinha -> Entrega.
- [ ] Validar o recebimento de notificações via WhatsApp.

---

## 🚀 3. Passos Imediatos para Colocar Online (HOJE)

1. **Commit & Push**: Garantir que o código no GitHub está com o "Master Fix".
2. **Setup Railway**: Fazer o link do repositório no Railway para auto-deploy.
3. **Provisionar DB**: Mudar do SQLite local para uma URL de PostgreSQL pública.
4. **Validar SSL**: Garantir que as URLs de Webhook são HTTPS (exigência do Mercado Pago).

---

## 🔭 4. Próximos Passos Prioritários (Pós-Lançamento)

1. **Escalabilidade**: Migrar o Redis para uma instância dedicada se o volume de BullMQ subir.
2. **Dashboard de Merchant**: Evoluir o Admin para um app mobile PWA próprio para o lojista.
3. **AI Fine-tuning**: Treinar o modelo de IA com cardápios reais brasileiros para melhorar a precisão dos pedidos.
