import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:client_app/core/models/customer.dart';

class CustomerRepository {
  final FirebaseFirestore _firebaseFirestore = FirebaseFirestore.instance;
  static const String _collectionName = 'customers';

  /// Get customer by phone number (unique identifier OR create new)
  Future<Customer?> getCustomerByPhone(String phone) async {
    try {
      final snapshot = await _firebaseFirestore
          .collection(_collectionName)
          .where('phone', isEqualTo: phone)
          .limit(1)
          .get();

      if (snapshot.docs.isEmpty) return null;
      return Customer.fromSnapshot(snapshot.docs.first);
    } catch (e) {
      rethrow;
    }
  }

  /// Get customer by ID
  Future<Customer?> getCustomerById(String id) async {
    try {
      final doc = await _firebaseFirestore
          .collection(_collectionName)
          .doc(id)
          .get();

      if (!doc.exists) return null;
      return Customer.fromSnapshot(doc);
    } catch (e) {
      rethrow;
    }
  }

  /// Create or get customer (get existing by phone, create if not found)
  Future<Customer> getOrCreateCustomer({
    required String name,
    required String phone,
    required String address,
    String? notes,
  }) async {
    try {
      // Try to find existing customer
      final existing = await getCustomerByPhone(phone);
      if (existing != null) {
        return existing;
      }

      // Create new customer
      final now = DateTime.now();
      final customerId = _firebaseFirestore.collection(_collectionName).doc().id;

      final newCustomer = Customer(
        id: customerId,
        name: name,
        phone: phone,
        address: address,
        notes: notes,
        createdAt: now,
      );

      await _firebaseFirestore
          .collection(_collectionName)
          .doc(customerId)
          .set(newCustomer.toJson());

      return newCustomer;
    } catch (e) {
      rethrow;
    }
  }

  /// Update customer
  Future<void> updateCustomer(String id, Customer customer) async {
    try {
      await _firebaseFirestore
          .collection(_collectionName)
          .doc(id)
          .update(customer.toJson());
    } catch (e) {
      rethrow;
    }
  }

  /// Update last order timestamp
  Future<void> updateLastOrder(String customerId) async {
    try {
      await _firebaseFirestore
          .collection(_collectionName)
          .doc(customerId)
          .update({'lastOrderAt': DateTime.now()});
    } catch (e) {
      rethrow;
    }
  }
}
