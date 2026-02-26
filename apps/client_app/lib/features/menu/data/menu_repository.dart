import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/product_model.dart';

class MenuRepository {
  Future<List<ProductModel>> fetchMenu() async {
    try {
      final jsonStr = await rootBundle.loadString('assets/data/menu.json');
      final List<dynamic> list = json.decode(jsonStr);
      return list.map((e) => ProductModel.fromJson(e)).toList();
    } catch (e) {
      rethrow;
    }
  }
}