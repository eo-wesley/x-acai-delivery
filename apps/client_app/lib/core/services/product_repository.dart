import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:client_app/core/models/product.dart';

class ProductRepository {
  final FirebaseFirestore _firebaseFirestore = FirebaseFirestore.instance;
  static const String _collectionName = 'products';

  /// Get all active products
  Future<List<Product>> getProducts() async {
    try {
      final snapshot = await _firebaseFirestore
          .collection(_collectionName)
          .where('isActive', isEqualTo: true)
          .orderBy('category')
          .orderBy('name')
          .get();

      return snapshot.docs.map((doc) => Product.fromSnapshot(doc)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Get product by ID
  Future<Product?> getProductById(String id) async {
    try {
      final doc = await _firebaseFirestore
          .collection(_collectionName)
          .doc(id)
          .get();

      if (!doc.exists) return null;
      return Product.fromSnapshot(doc);
    } catch (e) {
      rethrow;
    }
  }

  /// Get products by category
  Future<List<Product>> getProductsByCategory(String category) async {
    try {
      final snapshot = await _firebaseFirestore
          .collection(_collectionName)
          .where('category', isEqualTo: category)
          .where('isActive', isEqualTo: true)
          .orderBy('name')
          .get();

      return snapshot.docs.map((doc) => Product.fromSnapshot(doc)).toList();
    } catch (e) {
      rethrow;
    }
  }

  /// Stream of all products (for real-time updates)
  Stream<List<Product>> getProductsStream() {
    return _firebaseFirestore
        .collection(_collectionName)
        .where('isActive', isEqualTo: true)
        .orderBy('category')
        .orderBy('name')
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Product.fromSnapshot(doc)).toList());
  }

  /// Create new product (admin only)
  Future<String> createProduct(Product product) async {
    try {
      final docRef = await _firebaseFirestore
          .collection(_collectionName)
          .add(product.toJson());
      return docRef.id;
    } catch (e) {
      rethrow;
    }
  }

  /// Update existing product (admin only)
  Future<void> updateProduct(String id, Product product) async {
    try {
      await _firebaseFirestore
          .collection(_collectionName)
          .doc(id)
          .update(product.toJson());
    } catch (e) {
      rethrow;
    }
  }

  /// Delete product (admin only)
  Future<void> deleteProduct(String id) async {
    try {
      await _firebaseFirestore.collection(_collectionName).doc(id).delete();
    } catch (e) {
      rethrow;
    }
  }
}
