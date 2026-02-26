import 'package:cloud_firestore/cloud_firestore.dart';

enum OrderStatus {
  draft('draft'),
  placed('placed'),
  accepted('accepted'),
  preparing('preparing'),
  outForDelivery('out_for_delivery'),
  delivered('delivered'),
  canceled('canceled');

  final String value;
  const OrderStatus(this.value);

  factory OrderStatus.fromString(String value) {
    return OrderStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => OrderStatus.draft,
    );
  }
}

class OrderItem {
  final String productId;
  final String name;
  final double unitPrice;
  final int quantity;
  final double lineTotal;

  OrderItem({
    required this.productId,
    required this.name,
    required this.unitPrice,
    required this.quantity,
    required this.lineTotal,
  });

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'name': name,
      'unitPrice': unitPrice,
      'quantity': quantity,
      'lineTotal': lineTotal,
    };
  }

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'] as String,
      name: json['name'] as String,
      unitPrice: (json['unitPrice'] as num).toDouble(),
      quantity: json['quantity'] as int,
      lineTotal: (json['lineTotal'] as num).toDouble(),
    );
  }
}

class DeliveryOrder {
  final String id;
  final String orderNumber;
  final OrderStatus status;
  final List<OrderItem> items;
  final double subtotal;
  final double total;
  final String paymentMethod;
  final String customerName;
  final String? customerPhone;
  final String address;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String customerId;

  DeliveryOrder({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.total,
    required this.paymentMethod,
    required this.customerName,
    this.customerPhone,
    required this.address,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    required this.customerId,
  });

  /// Convert Order to Firestore document
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderNumber': orderNumber,
      'status': status.value,
      'items': items.map((item) => item.toJson()).toList(),
      'subtotal': subtotal,
      'total': total,
      'paymentMethod': paymentMethod,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'address': address,
      'notes': notes,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'customerId': customerId,
    };
  }

  /// Create Order from Firestore document
  factory DeliveryOrder.fromJson(Map<String, dynamic> json) {
    final itemsData = json['items'] as List<dynamic>? ?? [];
    return DeliveryOrder(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      status: OrderStatus.fromString(json['status'] as String),
      items: itemsData
          .map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      subtotal: (json['subtotal'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      paymentMethod: json['paymentMethod'] as String,
      customerName: json['customerName'] as String,
      customerPhone: json['customerPhone'] as String?,
      address: json['address'] as String,
      notes: json['notes'] as String?,
      createdAt: (json['createdAt'] as Timestamp).toDate(),
      updatedAt: (json['updatedAt'] as Timestamp).toDate(),
      customerId: json['customerId'] as String,
    );
  }

  /// Create from snapshot
  factory DeliveryOrder.fromSnapshot(DocumentSnapshot doc) {
    return DeliveryOrder.fromJson(doc.data() as Map<String, dynamic>);
  }

  DeliveryOrder copyWith({
    String? id,
    String? orderNumber,
    OrderStatus? status,
    List<OrderItem>? items,
    double? subtotal,
    double? total,
    String? paymentMethod,
    String? customerName,
    String? customerPhone,
    String? address,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? customerId,
  }) {
    return DeliveryOrder(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      status: status ?? this.status,
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      total: total ?? this.total,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      address: address ?? this.address,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      customerId: customerId ?? this.customerId,
    );
  }
}
