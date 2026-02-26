import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app/app.dart';
import 'core/state/cart_state.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    // Firebase initialization may fail in dev, continue anyway
    debugPrint('Firebase init error: $e');
  }

  runApp(
    ChangeNotifierProvider<CartState>(
      create: (_) => CartState(),
      child: const XAcaiApp(),
    ),
  );
}
