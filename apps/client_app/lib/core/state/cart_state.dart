import 'package:flutter/foundation.dart';

import '../models/cart_item.dart';

class CartState extends ChangeNotifier {
  CartState._privateConstructor();
  static final CartState _instance = CartState._privateConstructor();
  factory CartState() => _instance;

  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  int get totalItems =>
      _items.fold<int>(0, (sum, item) => sum + item.quantity);

  int get itemsCount => _items.length; // number of distinct product lines

  double get totalPrice =>
      _items.fold<double>(0.0, (sum, item) => sum + item.total);

  void addItem(String name, double price) {
    final index = _items.indexWhere((i) => i.name == name);
    if (index >= 0) {
      _items[index].quantity++;
    } else {
      _items.add(CartItem(name: name, price: price));
    }
    notifyListeners();
  }

  void increaseQuantity(CartItem item) {
    final index = _items.indexOf(item);
    if (index >= 0) {
      _items[index].quantity++;
      notifyListeners();
    }
  }

  void decreaseQuantity(CartItem item) {
    final index = _items.indexOf(item);
    if (index >= 0) {
      _items[index].quantity--;
      if (_items[index].quantity <= 0) {
        _items.removeAt(index);
      }
      notifyListeners();
    }
  }

  void removeItem(CartItem item) {
    _items.remove(item);
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    notifyListeners();
  }
}

