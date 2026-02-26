import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:client_app/core/models/order.dart';

class OrderRepository {
  final FirebaseFirestore _firebaseFirestore = FirebaseFirestore.instance;
  static const String _collectionName = 'orders';

  /// Generate order number (timestamp-based)
  String _generateOrderNumber() {
    return 'ORD${DateTime.now().millisecondsSinceEpoch.toString().substring(0, 10)}';
  }

  /// Create new order
  Future<DeliveryOrder> createOrder({
    required DeliveryOrder order,
  }) async {
    try {
      final orderData = order.copyWith(
        orderNumber: _generateOrderNumber(),
      );

      await _firebaseFirestore
          .collection(_collectionName)
          .doc(orderData.id)
          .set(orderData.toJson());

      return orderData;
    } catch (e) {
      rethrow;
    }
  }

  /// Get order by ID
  Future<DeliveryOrder?> getOrderById(String id) async {
    try {
      final doc = await _firebaseFirestore
          .collection(_collectionName)
          .doc(id)
          .get();

      if (!doc.exists) return null;
      return DeliveryOrder.fromSnapshot(doc);
    } catch (e) {
      rethrow;
    }
  }

  /// Get orders by customer ID
  Future<List<DeliveryOrder>> getOrdersByCustomerId(String customerId) async {
    try {
      final snapshot = await _firebaseFirestore
          .collection(_collectionName)
          .where('customerId', isEqualTo: customerId)
          .orderBy('createdAt', descending: true)
          .get();

      return snapshot.docs
          .map((doc) => DeliveryOrder.fromSnapshot(doc))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Get orders by status
  Future<List<DeliveryOrder>> getOrdersByStatus(OrderStatus status) async {
    try {
      final snapshot = await _firebaseFirestore
          .collection(_collectionName)
          .where('status', isEqualTo: status.value)
          .orderBy('createdAt', descending: true)
          .get();

      return snapshot.docs
          .map((doc) => DeliveryOrder.fromSnapshot(doc))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Stream of all orders (for real-time admin dashboard)
  Stream<List<DeliveryOrder>> getAllOrdersStream() {
    return _firebaseFirestore
        .collection(_collectionName)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DeliveryOrder.fromSnapshot(doc))
            .toList());
  }

  /// Stream of orders by status
  Stream<List<DeliveryOrder>> getOrdersByStatusStream(OrderStatus status) {
    return _firebaseFirestore
        .collection(_collectionName)
        .where('status', isEqualTo: status.value)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DeliveryOrder.fromSnapshot(doc))
            .toList());
  }

  /// Stream of customer's orders (for real-time updates on order detail page)
  Stream<List<DeliveryOrder>> getCustomerOrdersStream(String customerId) {
    return _firebaseFirestore
        .collection(_collectionName)
        .where('customerId', isEqualTo: customerId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DeliveryOrder.fromSnapshot(doc))
            .toList());
  }

  /// Update order status
  Future<void> updateOrderStatus(String orderId, OrderStatus newStatus) async {
    try {
      await _firebaseFirestore.collection(_collectionName).doc(orderId).update({
        'status': newStatus.value,
        'updatedAt': DateTime.now(),
      });
    } catch (e) {
      rethrow;
    }
  }

  /// Cancel order
  Future<void> cancelOrder(String orderId) async {
    try {
      await updateOrderStatus(orderId, OrderStatus.canceled);
    } catch (e) {
      rethrow;
    }
  }
}
