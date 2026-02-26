import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';

class BackendApiClient {
  static Future<Map<String, dynamic>> createOrder({
    required String customerId,
    required List<Map<String, dynamic>> items,
    required double total,
    required String paymentMethod,
    required String address,
    String? notes,
  }) async {
    try {
      final url = Uri.parse(ApiConfig.getFullUrl(ApiConfig.ordersEndpoint));

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'customerId': customerId,
          'items': items,
          'total': total,
          'paymentMethod': paymentMethod,
          'address': address,
          if (notes case final n?) 'notes': n,
        }),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () => throw Exception('Backend request timeout'),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Backend error: ${response.statusCode}');
      }
    } catch (e) {
      // Log error but don't fail - local Firestore still works
      debugPrint('⚠️ Backend API error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<bool> checkBackendHealth() async {
    try {
      final url = Uri.parse(ApiConfig.getFullUrl(ApiConfig.healthEndpoint));

      final response = await http.get(url).timeout(
        const Duration(seconds: 5),
        onTimeout: () => throw Exception('Health check timeout'),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('⚠️ Backend health check failed: $e');
      return false;
    }
  }
}
