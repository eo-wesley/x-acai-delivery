# X-Açaí Delivery — Roadmap Executável

---

## Phase 0: MVP (CONCLUÍDO ✅)

**Duração:** Semanas 1-3
**Status:** LIVE em https://xacai-delivery-prod.web.app

### Deliverables
- ✅ Flutter Web app estruturado (feature-first)
- ✅ Cardápio dinâmico (JSON assets)
- ✅ Carrinho com Provider state management
- ✅ Checkout com validação
- ✅ Integração WhatsApp (URL wa.me)
- ✅ Firebase Hosting + PWA instalável
- ✅ Análise de código (zero lint issues)
- ✅ Documentação arquitetural

### KPIs Atingidos
- Load time: ~3-5s (Chrome DevTools)
- Lighthouse score: 85+ (Performance)
- Mobile/Desktop: Responsive 100%
- WhatsApp: Mensagem formatada corretamente

---

## Phase 1: CRM Básico (INÍCIO: Semana 4)

**Duração:** 2 semanas
**Objetivo:** Admin Dashboard para gerenciar pedidos

### 1.1 Backend Setup (days 1-2)

**Tasks:**
- [ ] Criar projeto Firestore
- [ ] Implementar Cloud Functions para:
  - `saveOrder(customerId, orderData)` → gera Order doc
  - `updateOrderStatus(orderId, status)` → muda status + cria OrderEvent
  - `getCustomerOrders(customerId)` → lista pedidos do cliente
- [ ] Configurar Firestore Rules (read/write permissions)
- [ ] Criar índices Firestore se necessário

**Estimate:** 6-8 hours

**PR Checklist:**
- [ ] Testes unitários para cada Cloud Function
- [ ] Firebase Emulator testado localmente
- [ ] Rules validadas (deny deny, allow allow explicitly)

### 1.2 Admin Dashboard UI (days 3-4)

**Tasks:**
- [ ] Criar `features/admin/` folder
- [ ] Implementar AdminState (Provider)
- [ ] Criar AdminLogin (simples: email/senha hardcoded ou Firebase Auth)
- [ ] Listar pedidos en tempo real (StreamBuilder + Firestore listeners)
- [ ] Mostrar status com badges (NOVO, PREPARANDO, ENTREGANDO, etc)

**UI Components:**
```
Admin Dashboard
├── Sidebar
│   ├── My Orders
│   ├── All Orders (admin only)
│   ├── Customers
│   ├── Analytics
│   └── Logout
├── Order List
│   ├── Search/Filter by status
│   ├── Each row:
│   │   ├── Order ID
│   │   ├── Customer name
│   │   ├── Status dropdown (change → triggers Cloud Function)
│   │   ├── Total R$
│   │   ├── Created date
│   │   └── Actions: View, Mark delivered, Cancel
│   └── Pagination
└── Order Detail Modal
    ├── Items list
    ├── Customer info
    ├── Timeline (OrderEvents log)
    └── Status history
```

**Estimate:** 10-12 hours

**PR Checklist:**
- [ ] Responsive (tablet, desktop)
- [ ] Error handling (network, Firestore)
- [ ] Loading states
- [ ] No UI blocking when updating status

### 1.3 Realtime Order Notifications (days 5-10)

**Tasks:**
- [ ] Integrar FCM (Firebase Cloud Messaging)
- [ ] Enviar notificações quando:
  - Pedido é criado (admin)
  - Status muda (cliente e admin)
- [ ] Implementar Push Notification service
- [ ] Testar em Android e Chrome Web

**Estimate:** 8-10 hours

**Tech Stack:**
- `firebase_messaging` package
- FCM topic subscriptions

---

## Phase 2: CRM Avançado (INÍCIO: Semana 6)

**Duration:** 2 semanas

### 2.1 Customer & Product Management

**Tasks:**
- [ ] CRUD de Produtos (admin):
  - Create/Edit/Delete products
  - Upload imagens (Firebase Storage)
  - Stock/availability toggle
- [ ] Customer List & History:
  - Listar all customers
  - Ver histórico de pedidos de cada um
  - Estatísticas: total spent, order count, last order

**Estimate:** 8-10 hours

### 2.2 Analytics Dashboard (Relatórios)

**Tasks:**
- [ ] Criar `features/admin/pages/analytics_page.dart`
- [ ] Gráficos:
  - Revenue por dia (últimos 30 dias)
  - Top 10 produtos vendidos
  - Order count por status
  - Ticket médio
- [ ] Exportar relatórios (CSV/PDF)

**Tech:**
- `syncfusion_flutter_charts` ou `fl_chart`
- `csv`, `pdf` packages

**Estimate:** 6-8 hours

---

## Phase 3: Payment Integration (INÍCIO: Semana 8)

**Duration:** 2-3 weeks
**Objetivo:** Pagamento online integrado

### 3.1 Pix Integration (Instant Payment)

**Tasks:**
- [ ] Integrar Pix Dinâmico (banco ou provider como Stripe/Mercado Pago)
- [ ] Gerar QR Code automaticamente
- [ ] Webhook para confirmar pagamento
- [ ] Atualizar Order status automaticamente

**Estimate:** 10-12 hours

### 3.2 Card & Wallet (Future)

**Tasks:**
- [ ] Card payment via Stripe
- [ ] Digital wallet (Apple Pay, Google Pay)

**Estimate:** Backlog indefinido

---

## Phase 4: Delivery Tracking (INÍCIO: Semana 10)

**Duration:** 2-3 weeks

### 4.1 Integração Google Maps

**Tasks:**
- [ ] Implementar mapa em time real
- [ ] Rastrear posição do entregador
- [ ] ETA estimado
- [ ] Notificação quando entregador sai/chega

**Tech:**
- `google_maps_flutter`
- `geolocator`

**Estimate:** 12-14 hours

---

## Phase 5: Mobile App (INÍCIO: Semana 12)

**Duration:** 3-4 weeks
**Objetivo:** iOS/Android native apps

### 5.1 Reuse Flutter Code

**Tasks:**
- [ ] Configurar targets iOS & Android
- [ ] Adaptar UI para mobile (bottom nav, gestures)
- [ ] Testar em emuladores
- [ ]  Publicar em App Store & Play Store

**Estimate:** 20-30 hours

---

## Phase 6: AI & Automation (INÍCIO: Semana 16)

**Duration:** Indefinido
**Objetivo:** Inteligência artificial para otimizar negócio

### 6.1 Recomendações Inteligentes

**Tasks:**
- [ ] Treinar modelo: "Clientes que compraram X também compraram Y"
- [ ] Mostrar recomendações no menu
- [ ] A/B teste: com vs. sem (medir conversão)

**Tech:**
- Firestore analytics
- ML Kit (Firebase)

### 6.2 Automação de Atendimento

**Tasks:**
- [ ] Chatbot WhatsApp (Dialogflow / Rasa)
- [ ] Respostas automáticas para dúvidas comuns

**Tech:**
- Twilio / WhatsApp Business API
- Dialogflow ou Rasa

---

## Timeline Consolidada

```
Semana 1-3  │ ✅ MVP (Frontend + Cardápio + WhatsApp)
Semana 4-5  │ 📋 P1: CRM básico (Admin Dashboard + Orders + FCM)
Semana 6-7  │ 📋 P2: CRM avançado (Produtos + Analytics)
Semana 8-10 │ 📋 P3: Payment (Pix + Card)
Semana 10-13│ 📋 P4: Delivery Tracking (Maps)
Semana 12+  │ 📋 P5: Mobile Apps (iOS + Android)
Semana 16+  │ 📋 P6: AI & Automation
```

---

## Infrastructure & DevOps

### Immediate (Sprint 1)

- [x] Firebase Hosting + PWA
- [x] GitHub repo (with .gitignore for Flutter)
- [ ] GitHub Actions: CI/CD pipeline
  - Auto-test on PR
  - Auto-deploy to staging on develop push
  - Auto-deploy to prod on main push, after approval

### Next (Sprint 2)

- [ ] Error tracking: Sentry or Firebase Crashlytics
- [ ] Analytics: Firebase Analytics
- [ ] Monitoring: Cloud Logging

### Future

- [ ] CDN for assets (Cloud Storage + CloudCDN)
- [ ] Load balancing (auto-scale Cloud Functions)
- [ ] Backup & disaster recovery

---

## Testing Strategy

### Unit Tests

**Target:** 70%+ code coverage

```
test/
├── core/
│   ├── state/
│   │   └── cart_state_test.dart
│   └── models/
│       └── ...
└── features/
    ├── menu/
    │   └── menu_repository_test.dart
    └── ...
```

**Run locally:**
```bash
flutter test --coverage
genhtml coverage/lcov.report -o coverage/html/ # view report
```

### Widget Tests

```
test/features/
├── menu/
│   └── menu_page_test.dart
├── cart/
│   └── cart_page_test.dart
└── checkout/
    └── checkout_page_test.dart
```

### Integration Tests

```
test_driver/
├── app_test.dart (Fluxo: Menu → Cart → Checkout → WhatsApp)
├── admin_test.dart (Fluxo: Criar Order → Mudar Status)
└── payment_test.dart (Pix QR + Webhook)
```

**Run:**
```bash
flutter drive --target=test_driver/app_test.dart
```

---

## Team & Roles

### Phase 0 MVP
- 1 Full-stack (Flutter + Firebase)
- Estimated: 2-3 weeks (solo)

### Phase 1-2 (CRM)
- 1 Frontend (Flutter)
- 1 Backend (Cloud Functions / Firestore)
- Estimated: 4 weeks

### Phase 3+ (Scale)
- 1 FL PM (Product Manager)
- 2 FE (Flutter Web + Mobile)
- 2 BE (Cloud Functions, APIs)
- 1 DevOps (CI/CD, Monitoring)

---

## Success Metrics & KPIs

### Phase 0 (MVP)
- [ ] 100+ daily active users (beta testers)
- [ ] <3s load time (Lighthouse)
- [ ] 0 critical bugs in production
- [ ] PWA installable on Chrome/Android

### Phase 1-2 (CRM)
- [ ] Admin completa 10 pedidos/dia com <30s cada
- [ ] Order notification entregue em <5s
- [ ] Customer satisfaction (Typeform): >4.5/5

### Phase 3 (Payment)
- [ ] 80% pedidos pagos online
- [ ] Pix payment success rate: >99%
- [ ] Webhook reliability: >99.9%

### Phase 4+ (Scale)
- [ ] 1000+ daily orders
- [ ] Multi-branch support
- [ ] 5-star reviews in App Store

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Firestore costs surge | High | Implement caching, pagination, quotas |
| Admin has no time to update orders | High | Optimize UI, add bulk actions, consider voice |
| Customers don't find app | High | SEO, social media, WhatsApp link sharing |
| Payment service outage | High | Fallback to manual (WhatsApp), retry logic |
| Firebase region latency | Medium | Multi-region setup, CDN |

---

## Dependencies & Blockers

- [ ] Google Play / App Store developer accounts (Phase 5)
- [ ] SSL certificate for custom domain (optional Phase 1)
- [ ] Pix credentials from bank (Phase 3)
- [ ] Maps API key (Phase 4)

---

## Go-to-Market Strategy

### Phase 0 → Beta Launch
1. Invite 10-20 friends to test
2. Iterate based on feedback
3. Fix critical bugs

### Phase 1 → Soft Launch
1. Deploy to 100+ customers (local area)
2. Collect reviews & testimonials
3. Optimize based on usage patterns

### Phase 2 → Scale
1. Multi-location expansion
2. Marketing campaigns (Google Ads, Instagram)
3. Partnerships with delivery platforms

---

## Budget Estimate

| Phase | Component | Monthly Cost |
|-------|-----------|--------------|
| 0 | Firebase Hosting + DB | ~$10-50 |
| 1-2 | Cloud Functions | ~$50-200 |
| 3 | Payment processor | 3-5% per transaction |
| 4 | Maps API | ~$100-500 |
| All | Monitoring + Support | ~$50-100 |
| **Total** | | **~$210-850/month** |

*Note: Excludes team salaries*

---

## Summary

**MVP (Phase 0):** ✅ Complete
- Live on Firebase Hosting
- App works end-to-end
- Code is maintainable

**CRM (Phases 1-2):** 📋 Next Sprint
- Admin dashboard
- Order management
- Basic analytics

**Growth (Phases 3+):** 🚀 Roadmap
- Payment integration
- Delivery tracking
- Mobile apps
- AI/Automation

**Effort Estimate:** ~300 hours for full roadmap (4 developers × 3 months)

