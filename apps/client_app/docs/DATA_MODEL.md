# X-Açaí Delivery — Data Model & Firestore Schema

---

## 1. Domain Models (Dart)

### 1.1 Product Model

```dart
class ProductModel {
  final String id;              // UUID ou incremental
  final String name;
  final String description;
  final double price;
  final String imageUrl;        // Firebase Storage path
  final List<String> tags;      // ['vegan', 'açaí', 'frutas']
  final bool available;
  final DateTime createdAt;
  final DateTime updatedAt;

  ProductModel({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
needed this.imageUrl,
    this.tags = const [],
    this.available = true,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'price': price,
    'imageUrl': imageUrl,
    'tags': tags,
    'available': available,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    description: json['description'] ?? '',
    price: (json['price'] ?? 0.0).toDouble(),
    imageUrl: json['imageUrl'] ?? '',
    tags: List<String>.from(json['tags'] ?? []),
    available: json['available'] ?? true,
    createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
  );
}
```

### 1.2 CartItem Model

```dart
class CartItem {
  final String productId;       // Reference to Product
  final String name;
  final double price;
  int quantity;

  CartItem({
    required this.productId,
    required this.name,
    required this.price,
    this.quantity = 1,
  });

  double get total => price * quantity;

  Map<String, dynamic> toJson() => {
    'productId': productId,
    'name': name,
    'price': price,
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    productId: json['productId'] ?? '',
    name: json['name'] ?? '',
    price: (json['price'] ?? 0.0).toDouble(),
    quantity: json['quantity'] ?? 1,
  );
}
```

### 1.3 Order Model

```dart
enum OrderStatus { new_, accepted, preparing, outForDelivery, delivered, canceled }

class Order {
  final String id;              // Firestore doc ID
  final String customerId;      // User ID (no auth yet, use email?)
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final List<CartItem> items;
  final double subtotal;        // sum(item.total)
  final double deliveryFee;     // from AppConfig
  final double total;           // subtotal + deliveryFee
  final String paymentMethod;   // 'pix', 'card', 'cash'
  final String? observations;
  final OrderStatus status;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final List<OrderEvent> events; // log de transições

  Order({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
    required this.paymentMethod,
    this.observations,
    this.status = OrderStatus.new_,
    required this.createdAt,
    this.updatedAt,
    this.events = const [],
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'customerId': customerId,
    'customerName': customerName,
    'customerPhone': customerPhone,
    'customerAddress': customerAddress,
    'items': items.map((i) => i.toJson()).toList(),
    'subtotal': subtotal,
    'deliveryFee': deliveryFee,
    'total': total,
    'paymentMethod': paymentMethod,
    'observations': observations,
    'status': status.toString().split('.').last,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt?.toIso8601String(),
    'events': events.map((e) => e.toJson()).toList(),
  };

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id: json['id'] ?? '',
    customerId: json['customerId'] ?? '',
    customerName: json['customerName'] ?? '',
    customerPhone: json['customerPhone'] ?? '',
    customerAddress: json['customerAddress'] ?? '',
    items: (json['items'] as List?)?.map((i) => CartItem.fromJson(i)).toList() ?? [],
    subtotal: (json['subtotal'] ?? 0.0).toDouble(),
    deliveryFee: (json['deliveryFee'] ?? 0.0).toDouble(),
    total: (json['total'] ?? 0.0).toDouble(),
    paymentMethod: json['paymentMethod'] ?? 'cash',
    observations: json['observations'],
    status: _parseStatus(json['status']),
    createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
    updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
    events: (json['events'] as List?)?.map((e) => OrderEvent.fromJson(e)).toList() ?? [],
  );

  static OrderStatus _parseStatus(String? status) {
    switch (status) {
      case 'accepted': return OrderStatus.accepted;
      case 'preparing': return OrderStatus.preparing;
      case 'outForDelivery': return OrderStatus.outForDelivery;
      case 'delivered': return OrderStatus.delivered;
      case 'canceled': return OrderStatus.canceled;
      default: return OrderStatus.new_;
    }
  }
}

class OrderEvent {
  final String eventType;       // 'created', 'accepted', 'preparing', etc.
  final String description;
  final DateTime timestamp;

  OrderEvent({
    required this.eventType,
    required this.description,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'eventType': eventType,
    'description': description,
    'timestamp': timestamp.toIso8601String(),
  };

  factory OrderEvent.fromJson(Map<String, dynamic> json) => OrderEvent(
    eventType: json['eventType'] ?? '',
    description: json['description'] ?? '',
    timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
  );
}
```

### 1.4 Customer Model (CRM)

```dart
class Customer {
  final String id;              // Email ou Phone
  final String name;
  final String email;
  final String phone;
  final String? address;
  final List<String> orderIds;  // References to Orders
  final double totalSpent;
  final int totalOrders;
  final DateTime createdAt;

  Customer({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.address,
    this.orderIds = const [],
    this.totalSpent = 0.0,
    this.totalOrders = 0,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'phone': phone,
    'address': address,
    'orderIds': orderIds,
    'totalSpent': totalSpent,
    'totalOrders': totalOrders,
    'createdAt': createdAt.toIso8601String(),
  };

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    email: json['email'] ?? '',
    phone: json['phone'] ?? '',
    address: json['address'],
    orderIds: List<String>.from(json['orderIds'] ?? []),
    totalSpent: (json['totalSpent'] ?? 0.0).toDouble(),
    totalOrders: json['totalOrders'] ?? 0,
    createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
  );
}
```

---

## 2. Firestore Schema

### 2.1 Collections Overview

```
firestore/
├── products/                  [public read, admin write]
│   ├── {productId}
│   │   ├── name: string
│   │   ├── price: number
│   │   ├── imageUrl: string
│   │   ├── available: boolean
│   │   ├── createdAt: timestamp
│   │   └── ...
│   └── ...
│
├── orders/                    [customer read own, admin read all]
│   ├── {orderId}
│   │   ├── customerId: string (reference)
│   │   ├── customerName: string
│   │   ├── items: array
│   │   ├── total: number
│   │   ├── status: enum
│   │   ├── createdAt: timestamp
│   │   └── ...
│   └── ...
│
├── customers/                 [customer read own, admin read all]
│   ├── {customerId}
│   │   ├── name: string
│   │   ├── email: string
│   │   ├── phone: string
│   │   ├── totalSpent: number
│   │   ├── createdAt: timestamp
│   │   └── ...
│   └── ...
│
├── order_events/              [admin read/write]
│   ├── {eventId}
│   │   ├── orderId: string (reference)
│   │   ├── eventType: enum
│   │   ├── description: string
│   │   ├── timestamp: timestamp
│   │   └── ...
│   └── ...
│
└── analytics/                 [admin read]
    ├── daily/{date}
    ├── monthly/{month}
    └── (aggregated reports)
```

### 2.2 Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function: check if user is admin
    function isAdmin() {
      return request.auth.token.admin == true;
    }

    // Helper: check if owner
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // PRODUCTS: public read, admin write
    match /products/{productId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    // ORDERS: customer read own, admin read all
    match /orders/{orderId} {
      allow read: if isAdmin() || isOwner(resource.data.customerId);
      allow create, update: if isAdmin(); // Orders criadas via Cloud Function
      allow delete: if false;
    }

    // CUSTOMERS: customer read own, admin read all
    match /customers/{customerId} {
      allow read: if isAdmin() || isOwner(customerId);
      allow create, update, delete: if isAdmin();
    }

    // ORDER_EVENTS: admin only
    match /order_events/{eventId} {
      allow read: if isAdmin();
      allow write: if false; // Cloud Function only
    }

    // ANALYTICS: admin only
    match /analytics/{document=**} {
      allow read: if isAdmin();
      allow write: if false;
    }
  }
}
```

### 2.3 Firestore Indexes (if needed)

```
- Collection: `orders`
  - Fields: `customerId` (Ascending) + `createdAt` (Descending)
  - Purpose: Listar pedidos de cliente ordenados por data

- Collection: `orders`
  - Fields: `status` (Ascending) + `createdAt` (Descending)
  - Purpose: Dashboard admin: pedidos por status

- Collection: `customers`
  - Fields: `totalSpent` (Descending)
  - Purpose: Ranking de melhores clientes
```

---

## 3. Data Flow Diagrams

### 3.1 Order Creation Flow

```
User clicks "Enviar pedido"
  ↓
Coleta: name, address, paymentMethod, observations
  ↓
Calcula: subtotal (sum items), deliveryFee, total
  ↓
Constrói Order object
  ↓
Abre WhatsApp (mensagem manual)
  ↓
Admin recebe no WhatsApp
  ↓
Admin cria Order no Firestore (via Admin Dashboard)
  ↓
Cloud Function (onOrderCreate)
    ├─ Cria OrderEvent: "CREATED"
    ├─ Atualiza Customer.totalOrders
    ├─ Atualiza Customer.totalSpent
    └─ Envia FCM notification ao cliente
  ↓
Cliente vê "Pedido criado" na app
```

### 3.2 Order Status Flow

```
NEW → ACCEPTED (admin clica "Aceitar")
  ↓
  └─> OrderEvent: "Pedido aceito, prazo estimado 30min"

ACCEPTED → PREPARING (admin clica "Preparando")
  ↓
  └─> OrderEvent: "Estamos preparando seu açaí"

PREPARING → OUT_FOR_DELIVERY (entregador sai)
  ↓
  └─> OrderEvent: "Pedido saiu para entrega" + GPS link

OUT_FOR_DELIVERY → DELIVERED (entregador confirma)
  ↓
  └─> OrderEvent: "Pedido entregue"

(any status) → CANCELED (admin cancela)
  ↓
  └─> OrderEvent: "Pedido cancelado por desistência do cliente" ou "Sem stock"
```

---

## 4. API Contracts (Firestore)

### 4.1 Save Order

**Endpoint:** Cloud Function `saveOrder`

**Request:**
```json
{
  "customerId": "customer@email.com",
  "customerName": "João Silva",
  "customerPhone": "11987470862",
  "customerAddress": "Rua A, 123, Apto 45",
  "items": [
    {
      "productId": "prod_001",
      "name": "Açaí 300ml",
      "price": 14.90,
      "quantity": 2
    }
  ],
  "subtotal": 29.80,
  "deliveryFee": 5.00,
  "total": 34.80,
  "paymentMethod": "pix",
  "observations": "Sem banana"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_abc123",
  "message": "Pedido criado com sucesso"
}
```

### 4.2 Get Order (Realtime)

```dart
FirebaseFirestore.instance
  .collection('orders')
  .doc(orderId)
  .snapshots()
  .listen((doc) {
    Order order = Order.fromJson(doc.data());
    // Update UI with order status
  });
```

---

## 5. Migrations & Versioning

### 5.1 Data Migration Strategy

When schema changes:

```dart
// Version 1 → 2: Add `description` field to products
Cloud Function migration() {
  const batch = getFirestore().batch();
  const snapshot = await getFirestore().collection('products').get();
  
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { description: '[migração] Sem descrição' });
  });
  
  return batch.commit();
}
```

### 5.2 Backward Compatibility

Always handle missing fields in fromJson:

```dart
// Safe: defaults if field missing
String description = json['description'] ?? '[Sem descrição]';
```

---

## 6. Performance Considerations

### 6.1 Pagination

```dart
// First page
QuerySnapshot firstPage = await FirebaseFirestore.instance
  .collection('orders')
  .where('customerId', isEqualTo: userId)
  .orderBy('createdAt', descending: true)
  .limit(10)
  .get();

// Next page
DocumentSnapshot lastDoc = firstPage.docs.last;
QuerySnapshot nextPage = await FirebaseFirestore.instance
  .collection('orders')
  .where('customerId', isEqualTo: userId)
  .orderBy('createdAt', descending: true)
  .startAfterDocument(lastDoc)
  .limit(10)
  .get();
```

### 6.2 Caching

- Products: Cache local por 1 hora (asset JSON, não Firestore)
- Orders: Sempre ler do Firestore (fresh)
- Customers: Cache de 5 minutos

---

## 7. Testing Data

### 7.1 Firebase Emulator

```bash
firebase emulators:start --only firestore

# In Dart tests:
FirebaseFirestore.instance.settings = Settings(
  host: 'localhost:8080',
  sslEnabled: false,
);
```

### 7.2 Mock Data

```dart
// test/fixtures/mock_products.dart
final mockProducts = [
  ProductModel(
    id: 'prod_1',
    name: 'Açaí 300ml',
    price: 14.90,
    ...
  ),
];
```

---

## Summary

| Entity | Status | Next |
|--------|--------|------|
| Product | ✅ Asset JSON | → Firestore quando CRM pronto |
| CartItem | ✅ Em progresso | → localStorage (futuro) |
| Order | 📋 Design pronto | → Implement Cloud Function |
| Customer | 📋 Design pronto | → CRM dashboard |
| OrderEvent | 📋 Design pronto | → Audit log |
| Analytics | 📋 Planejado | → Dashboard |

