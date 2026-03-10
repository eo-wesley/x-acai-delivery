# Plataforma X-Açaí: O "World Tree" da Arquitetura SaaS

Esta documentação detalha a estrutura de camadas e componentes que compõem a plataforma Food-Tech X-Açaí Delivery.

---

## 🌳 1. World Tree: Camadas da Plataforma

A plataforma é dividida em 8 camadas estratégicas que garantem isolamento, escalabilidade e inteligência.

### 📱 Camada 1: Customer App (Front-Facing)
- **Tecnologia**: Next.js / React (PWA Optimized)
- **Responsabilidade**: Experiência do usuário final.
- **Diferenciais**:
    - **Discovery Marketplace**: Encontrar lojas por região.
    - **Checkout Mercado Pago (PIX)**: Pagamento em segundos.
    - **SSE Tracking**: Acompanhamento do pedido em tempo real.
    - **Fidelidade Dinâmica**: Resgate de pontos e uso de cupons automáticos.

### 🏬 Camada 2: Merchant Layer (ERP/PDV Light)
- **Componentes**: Admin Dashboard, PDV (Ponto de Venda), Gestão de Cardápio.
- **Responsabilidade**: Gestão operacional do restaurante.
- **Diferenciais**:
    - **Gestão de Modificadores**: Combinações infinitas de açaí.
    - **BOM (Ficha Técnica)**: Baixa automática de estoque por receita.
    - **Radar Logístico**: Visualização em tempo real de motoboys.

### 🛵 Camada 3: Driver / Logistics Layer
- **Componentes**: Driver Mobile App, OSRM Routing, SSE Events.
- **Responsabilidade**: Entrega e rastreamento.
- **Diferenciais**:
    - **Assign Automático**: Atribuição inteligente de pedidos.
    - **GPS Track**: Reporte de localização a cada 5 segundos.
    - **SSE Push**: Recebimento de novas corridas via WebSocket/SSE.

### 📈 Camada 4: Growth Layer (Growth Engine)
- **Componentes**: QR Campaign Engine, Coupon Engine, WhatsApp Automation.
- **Responsabilidade**: Conversão e retenção (Anti-iFood).
- **Diferenciais**:
    - **QR Tracker**: Rastreia de qual marketplace o cliente fugiu.
    - **WhasApp Bot**: Recuperação de carrinho abandonado via BullMQ.
    - **Loyalty Points**: Moeda própria para retenção.

### 🤖 Camada 5: AI Layer
- **Componentes**: AI Agent (Natural Language Ordering), Sentiment Analysis.
- **Responsabilidade**: Interface conversacional.
- **Diferenciais**:
    - **NL Parsing**: Converter "quero um açaí 500ml com morango" em objeto de pedido válido.
    - **Recomendações Dinâmicas**: Sugestões baseadas no histórico do cliente.

### 🏢 Camada 6: SaaS / Franchise Layer
- **Componentes**: Franchise Hub, Billing, Plan Management.
- **Responsabilidade**: Gestão da escala da plataforma.
- **Diferenciais**:
    - **Multi-tenancy**: Isolamento total de dados por banco ou tenant_id.
    - **Royalty Tracking**: Gestão de taxas para franqueadores.

### ⚛️ Camada 7: Platform Core (Base Engine)
- **Componentes**: Order Engine, Event Bus (SSE/Redis), Multi-tenant Middleware.
- **Responsabilidade**: Lógica de negócio e orquestração.
- **Diferenciais**:
    - **Order Lifecycle**: Máquina de estados para pedidos (Pendendo -> Aceito -> Saiu -> Entregue).

### ☁️ Camada 8: Infrastructure Layer
- **Componentes**: PostgreSQL, Redis (BullMQ), OSRM Engine, CDN Images.
- **Responsabilidade**: Estabilidade e performance.
- **Diferenciais**:
    - **Edge Caching**: Cache local para cardápios populares.
    - **Scale Predictor**: Pronto para rodar em Railway/Render/AWS.
