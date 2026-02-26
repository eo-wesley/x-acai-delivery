class CartItem {
  final String name;
  final double price;
  int quantity;

  CartItem({
    required this.name,
    required this.price,
    this.quantity = 1,
  });

  double get total => price * quantity;

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() => {
        'name': name,
        'price': price,
        'quantity': quantity,
      };

  /// Create from JSON
  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        name: json['name'] ?? '',
        price: (json['price'] ?? 0.0).toDouble(),
        quantity: json['quantity'] ?? 1,
      );
}