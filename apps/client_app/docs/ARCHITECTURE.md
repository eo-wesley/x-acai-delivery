# X-Açaí Delivery — Arquitetura Profissional

## 1. Visão Geral

O projeto X-Açaí Delivery é um aplicativo Flutter Web que combina:
- **Frontend**: Flutter Web (UI responsiva, PWA instalável)
- **State Management**: Provider (ChangeNotifier)
- **Backend**: Firebase Hosting + Firestore (futuro)
- **Integrações**: WhatsApp API, Firebase Analytics (futuro)

---

## 2. Estrutura de Pastas (Feature-First)

```
lib/
├── main.dart                          # Entry point
├── app/
│   └── app.dart                       # Material App config
├── core/
│   ├── config/
│   │   └── app_config.dart            # App constants (WhatsApp, delivery fee)
│   ├── constants/
│   │   ├── colors.dart
│   │   └── typography.dart
│   ├── models/
│   │   └── cart_item.dart             # Domain models (core)
│   ├── routing/
│   │   └── app_router.dart            # Future: Named routes
│   ├── state/
│   │   └── cart_state.dart            # Global state (Provider)
│   └── theme/
│       └── app_theme.dart             # Material theme
├── features/
│   ├── cart/
│   │   ├── pages/
│   │   │   └── cart_page.dart
│   │   ├── models/
│   │   │   └── (shared with core/models)
│   │   └── widgets/
│   │       └── (cart-specific widgets)
│   ├── checkout/
│   │   ├── pages/
│   │   │   └── checkout_page.dart
│   │   └── widgets/
│   │       └── form_fields.dart
│   ├── home/
│   │   └── pages/
│   │       └── home_page.dart
│   └── menu/
│       ├── pages/
│       │   └── menu_page.dart
│       ├── models/
│       │   └── product_model.dart
│       ├── data/
│       │   └── menu_repository.dart
│       └── widgets/
│           └── product_card.dart
└── shared/
    ├── widgets/
    │   ├── custom_button.dart
    │   └── (reusable components)
    └── utils/
        └── extensions.dart
```

---

## 3. Padrões de Arquitetura

### 3.1 State Management (Provider)

**Padrão:** Singleton ChangeNotifier

```dart
// CartState (exemplo)
class CartState extends ChangeNotifier {
  CartState._privateConstructor();
  static final CartState _instance = CartState._privateConstructor();
  factory CartState() => _instance;

  void addItem(String name, double price) {
    _items.add(...);
    notifyListeners(); // Triggers UI rebuild
  }
}
```

**Consumo na UI:**
```dart
// 1. Leitura (sem reatividade)
context.read<CartState>().addItem(...);

// 2. Escuta de mudanças (com reatividade)
Consumer<CartState>(
  builder: (context, cartState, child) {
    return Text('Items: ${cartState.totalItems}');
  },
)
```

### 3.2 Repositories & Data Sources

**Padrão:** Repository → Dados locais/remote

```dart
class MenuRepository {
  Future<List<ProductModel>> fetchMenu() async {
    // Carrega de assets (JSON) ou Firestore
    final jsonStr = await rootBundle.loadString('assets/data/menu.json');
    final list = json.decode(jsonStr);
    return list.map((e) => ProductModel.fromJson(e)).toList();
  }
}
```

### 3.3 Models & Serialization

Todos os modelos implementam `toJson()` / `fromJson()` para:
- Persistência local (localStorage, shared_preferences)
- Sincronização com backend (Firestore)

```dart
class CartItem {
  final String name;
  final double price;
  int quantity;

  CartItem({required this.name, required this.price, this.quantity = 1});

  Map<String, dynamic> toJson() => {
    'name': name,
    'price': price,
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    name: json['name'],
    price: json['price'].toDouble(),
    quantity: json['quantity'] ?? 1,
  );
}
```

---

## 4. Fluxo de Dados

### 4.1 Menu → Carrinho

```
MenuPage
  ↓ (usa) MenuRepository
  ↓ (carrega) products.json
  ↓ (renderiza) ProductCard
  ↓ (onClick) "Adicionar ao carrinho"
  ↓ (chama) context.read<CartState>().addItem()
  ↓ (salva em) CartState._items
  ↓ (notifica) Consumer<CartState> na UI
  ↓ (atualiza) badge no AppBar & SnackBar
```

### 4.2 Carrinho → Checkout

```
CartPage
  ↓ (mostra) CartState.items
  ↓ (onClick) "Finalizar pedido"
  ↓ (abre) CheckoutPage (via Navigator.push)
  ↓ (mantém estado) CartState persiste
  ↓ (onClick) "Enviar pedido"
  ↓ (constrói) mensagem WhatsApp
  ↓ (abre URL) wa.me/5511987470862?text=...
  ↓ (usuário envia) no WhatsApp Web
  ↓ (limpa) CartState.clearCart()
```

---

## 5. Decisões de Design

### 5.1 Por que Singleton CartState?

- ✅ Simplicidade: Uma instância global, previsível.
- ✅ Persistência: Fácil de integrar localStorage/Firestore.
- ✅ Performance: Sem recriação desnecessária.
- ❌ Testabilidade: Mais complexo mockar.
- **Alternativa futura:** Riverpod (mais modular) ou Bloc (mais robusto).

### 5.2 Por que Provider em vez de Bloc/Redux?

- ✅ Lightweight: Menos boilerplate.
- ✅ Aprendizado: Curva mais suave.
- ✅ Performance: Adequado para este escopo.
- **Upgrade futuro:** Se lógica ficar muito complexa, migrar para Riverpod.

### 5.3 Assets vs. Firestore

- **Fase atual:** JSON assets (assets/data/menu.json)
  - ✅ Carregamento rápido, offline.
  - ✅ Sem custos Firebase.
- **Fase 2 (CRM):** Firestore
  - ✅ Atualização remota de cardápio.
  - ✅ Pedidos em tempo real.

---

## 6. Camadas da Aplicação

```
┌─────────────────────────────────────┐
│         UI Layer (Pages/Widgets)    │ ← Flutter Widgets
├─────────────────────────────────────┤
│     State Management (Provider)     │ ← ChangeNotifier
├─────────────────────────────────────┤
│    Domain Layer (Models/Entities)   │ ← CartItem, Product, Order
├─────────────────────────────────────┤
│   Data Layer (Repositories/Sources) │ ← MenuRepository, OrderService
├─────────────────────────────────────┤
│         External Services           │ ← Firestore, WhatsApp, Firebase
└─────────────────────────────────────┘
```

---

## 7. Extending Futuro

### 7.1 Admin/CRM

Nova feature isolada `features/admin/`:
```dart
lib/features/admin/
├── pages/
│   ├── dashboard_page.dart
│   ├── orders_page.dart
│   ├── products_page.dart
│   └── analytics_page.dart
├── state/
│   └── admin_state.dart
└── models/
    └── order_model.dart
```

**State separado:**
```dart
class AdminState extends ChangeNotifier {
  // Pedidos, produtos, relatórios
}
```

### 7.2 Firestore Integration

```dart
lib/core/services/
├── firestore_service.dart    // Wrapper Firestore
├── auth_service.dart          // Firebase Auth (futuro)
└── storage_service.dart       // Firebase Storage (fotos)
```

### 7.3 Notificações (FCM)

```dart
lib/core/services/
└── notification_service.dart  // Firebase Cloud Messaging
```

---

## 8. Segurança

### Firestore Rules (exemplo)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Clientes: apenas leem/criam seus próprios pedidos
    match /orders/{orderId} {
      allow read, create: if request.auth != null && request.auth.uid == resource.data.customerId;
      allow update: if false; // Admin apenas via Cloud Functions
    }

    // Produtos: apenas leitura
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## 9. Testing Strategy

### Unit Tests
```dart
// test/core/state/cart_state_test.dart
void main() {
  group('CartState', () {
    test('addItem should increase totalItems', () {
      final cart = CartState();
      cart.addItem('Açaí 300ml', 14.90);
      expect(cart.totalItems, 1);
    });
  });
}
```

### Widget Tests
```dart
// test/features/menu/pages/menu_page_test.dart
void main() {
  testWidgets('MenuPage shows product list', (WidgetTester tester) async {
    await tester.pumpWidget(MyTestApp());
    expect(find.byType(ProductCard), findsWidgets);
  });
}
```

### Integration Tests
```dart
// test_driver/app_test.dart
// Test fluxo completo: Menu → Carrinho → Checkout → WhatsApp
```

---

## 10. Performance & Optimizations

### Web Specific
- ✅ Tree-shaking de fonts (Material Icons, CupertinoIcons)
- ✅ Lazy loading de imagens
- ✅ Bundling inteligente (main.dart.js)
- ✅ IndexedStack para manter estado de tabs

### Future
- [ ] Image caching strategy
- [ ] Pagination no cardápio
- [ ] Offline mode com Service Worker customizado

---

## 11. CI/CD & Deployment

### Phases
1. **Development**: `flutter run -d chrome` (hot reload)
2. **Staging**: Deploy em branch `develop` via GitHub Actions
3. **Production**: Deploy em `main` via GitHub Actions → Firebase Hosting

### GitHub Actions Workflow
```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
      - run: flutter build web --release
      - run: npm install -g firebase-tools
      - run: firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

---

## Summary

**Atual (MVP):**
- Feature-first architecture ✅
- Provider state management ✅
- JSON-based menu ✅
- WhatsApp integration ✅
- Firebase Hosting PWA ✅

**Próximas (3-6 meses):**
- Firestore orders CRUD
- Admin dashboard (CRM)
- FCM notifications
- Analytics dashboard
- Payment integration (Pix/Card)

**Long-term (6-12 meses):**
- Delivery tracking (Google Maps API)
- AI-driven promotions
- Multi-branch support
- Mobile app (iOS/Android)
