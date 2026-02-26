import 'package:cloud_firestore/cloud_firestore.dart';

class Customer {
  final String id;
  final String name;
  final String phone;
  final String address;
  final String? notes;
  final DateTime createdAt;
  final DateTime? lastOrderAt;

  Customer({
    required this.id,
    required this.name,
    required this.phone,
    required this.address,
    this.notes,
    required this.createdAt,
    this.lastOrderAt,
  });

  /// Convert Customer to Firestore document
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'address': address,
      'notes': notes,
      'createdAt': createdAt,
      'lastOrderAt': lastOrderAt,
    };
  }

  /// Create Customer from Firestore document
  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      address: json['address'] as String,
      notes: json['notes'] as String?,
      createdAt: (json['createdAt'] as Timestamp).toDate(),
      lastOrderAt: json['lastOrderAt'] != null
          ? (json['lastOrderAt'] as Timestamp).toDate()
          : null,
    );
  }

  /// Create from snapshot
  factory Customer.fromSnapshot(DocumentSnapshot doc) {
    return Customer.fromJson(doc.data() as Map<String, dynamic>);
  }

  Customer copyWith({
    String? id,
    String? name,
    String? phone,
    String? address,
    String? notes,
    DateTime? createdAt,
    DateTime? lastOrderAt,
  }) {
    return Customer(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      lastOrderAt: lastOrderAt ?? this.lastOrderAt,
    );
  }
}
