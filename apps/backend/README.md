# X-Açaí Backend (Zero-Billing AI + Core de Operação Real)

Este backend foi turbinado com a **Camada Completa de Negócios e Motor de IA Flexível**. Ele gerencia todo o modelo de Delivery com banco de dados real sem adicionar seu Cartão de Crédito no Google Cloud Billing. Utilizamos o **Google AI Studio (Gemini 2.5 Flash)** como provedor principal atrelado a um Banco **SQLite3** local escalável.

## O Motor App + Ferramentas da PadBase

A rota `/api/` hospeda as operações reais de REST que seu Aplicativo Frontend usará (`/api/orders`, `/api/menu`). 
A rota `/ai/tools` hospeda o modelo conversacional atrelado a essa mesma base. O LLM é instruído por um Sistema RAG para interagir em tempo real com as Ferramentas, permitindo Listar Itens, Consultar Preços de Entrega, e Finalizar/Cancelar Pedidos interagindo diretamente com as tabelas SQL.

---

## Setup de Ponta a Ponta (R$ 0,00)

**1. Instale e garanta a chave de API gratuita:**
Crie uma chave gratuita no Google AI Studio (https://aistudio.google.com).
```bash
cd apps/backend
npm install
copy .env.example .env
```
> ⚠️ NUNCA suba `.env` para o GitHub. Certifique-se de que ele esteja coberto pelo seu `.gitignore`.

**2. Configure a API Key e Admin Token no `.env`:**
```env
# Defina o provedor como auto para Cascata, ou gemini se quiser forçar o principal 
AI_PROVIDER=gemini
GEMINI_API_KEY=Cole_Sua_Chave_AIStudio_Aqui
GEMINI_MODEL=gemini-2.5-flash
```

**3. Teste o Setup do Banco e Carga de Produtos (Seed):**
O sqlite local inicia tabelas automaticamente. Mas os produtos não preenchem sozinhos:
```bash
npx tsx scripts/seed-menu.ts
```
*(Após rodar isso, o cardápio base de Açaís será carregado pra dentro de database.sqlite)*

---

## Validando a Máquina

O sistema já escuta na porta 3000 por padrão (`npm run dev`). Com ele ligado, você pode inspecionar todos os subsistemas rodando as suítes de teste nativas em outro terminal para entender o loop. 

### A) Testes do Aplicativo REST Tradicional:
```bash
# Lê as 10 categorias persistidas localmente
npx tsx scripts/test-menu.ts

# Engaja o checkout purista criando, consultando e cancelando um Pedido no ID
npx tsx scripts/test-order-flow.ts

# Fura a API usando a HEADER x-admin-token
npx tsx scripts/test-admin.ts
```

### B) Testes de Agente Conversacional AI:
```bash
# Faz o loop ultra-híbrido: A IA LÊ O CARÁDPIO REAL e finaliza um pedido com o SQLite!
npx tsx scripts/test-ai-tools.ts

# Bate num chat de sistema rápido provando validação JSON estrita / RAG
npx tsx scripts/test-ai-json.ts
```

## Painel de Estatísticas
O rate limiter, guard, e usage tracking enviam métricas na memória. Você pode acessar chamadas, hits em chache e economia num dashboard nativo em:
**`GET http://localhost:3000/ai/stats`**
