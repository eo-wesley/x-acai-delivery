# Diagrama de Arquitetura da Plataforma X-Açaí

O diagrama abaixo visualiza o fluxo de dados e a interconexão entre as 8 camadas principais do sistema.

```mermaid
graph TD
    %% Camadas Principais
    subgraph "📱 Customer Layer"
        PWA["Next.js PWA / MarketPlace"]
        Tracking["SSE Real-time Tracking"]
        PIX["Mercado Pago Checkout"]
    end

    subgraph "🏬 Merchant Layer (PDV/ERP)"
        Admin["Admin Dashboard"]
        POS["PDV Application"]
        Inventory["Stock/BOM System"]
    end

    subgraph "🛵 Driver / Logistics Layer"
        DriverApp["Driver Mobile App"]
        OSRM["OSRM Routing Engine"]
        Radar["Logistics Radar"]
    end

    subgraph "📈 Growth Engine"
        QR["QR Code Campaign"]
        Loyalty["Loyalty Points / Coupons"]
        WhatsApp["WhatsApp Bot (Abandoned Cart)"]
    end

    subgraph "🤖 AI Layer"
        AIGateway["AI Gateway"]
        NLParser["Natural Language Order"]
    end

    subgraph "⚛️ Platform Core"
        OrderEngine["Order Lifecycle Engine"]
        MultiTenant["Multi-tenant Middleware"]
        EventBus["Internal Event Bus"]
    end

    subgraph "☁️ Infrastructure"
        DB[("PostgreSQL")]
        Cache[("Redis / Cache layer")]
        Queue[("BullMQ / Workers")]
    end

    %% Fluxos de Dados
    PWA -->|Order Created| MultiTenant
    MultiTenant --> OrderEngine
    OrderEngine --> DB
    OrderEngine -->|Event| EventBus
    
    EventBus -->|Push| Tracking
    EventBus -->|WhatsApp Task| Queue
    Queue --> WhatsApp
    
    Admin -->|Manage Menu| DB
    Inventory -->|Update| DB
    
    AIGateway --> NLParser
    NLParser -->|Structured Order| OrderEngine
    
    OSRM -->|Distance/ETA| Radar
    DriverApp -->|GPS Update| Radar
    Radar -->|Update Status| OrderEngine

    OrderEngine --> PIX
    PIX -->|Webhook| EventBus

    Loyalty -->|Credit Points| DB
    QR -->|Conversion Track| DB
```

---

## 🛠️ Detalhes do Fluxo
1. **Pedido**: O cliente inicia o pedido no PWA/Marketplace.
2. **Multi-tenancy**: O middleware identifica qual restaurante/tenant deve processar a requisição.
3. **Eventos**: Após o pagamento PIX, o `EventBus` dispara tarefas para o BullMQ (WhatsApp) e atualizações em tempo real para o cliente via SSE.
4. **Logística**: O `Radar` orquestra a distância via OSRM e posiciona os pedidos para os motoristas via `DriverApp`.
