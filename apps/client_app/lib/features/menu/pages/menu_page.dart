import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/state/cart_state.dart';
import '../data/menu_repository.dart';
import '../widgets/product_card.dart';
import '../models/product_model.dart';
import '../../cart/cart_page.dart';

class MenuPage extends StatefulWidget {
  const MenuPage({super.key});

  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  final MenuRepository _repository = MenuRepository();
  late Future<List<ProductModel>> _futureCatalog;

  @override
  void initState() {
    super.initState();
    _futureCatalog = _repository.fetchMenu();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cardápio'),
        centerTitle: true,
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                onPressed: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CartPage()),
                  );
                },
                icon: const Icon(Icons.shopping_cart_outlined),
              ),
              Consumer<CartState>(
                builder: (context, cart, child) {
                  if (cart.totalItems > 0) {
                    return Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '${cart.totalItems}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ],
          ),
        ],
      ),
      body: FutureBuilder<List<ProductModel>>(
        future: _futureCatalog,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erro ao carregar cardápio'));
          }
          final catalog = snapshot.data ?? [];
          if (catalog.isEmpty) {
            return Center(
              child: TextButton(
                onPressed: () => setState(() {
                  _futureCatalog = _repository.fetchMenu();
                }),
                child: const Text('Nenhum item disponível, tocar para recarregar'),
              ),
            );
          }
          return Stack(
            children: [
              ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: catalog.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final item = catalog[index];
                  return ProductCard(
                    product: item,
                    onAdd: () {
                      final cart = context.read<CartState>();
                      cart.addItem(item.name, item.price);
                      ScaffoldMessenger.of(context)
                        ..clearSnackBars()
                        ..showSnackBar(
                          const SnackBar(
                            content: Text('Adicionado ao carrinho'),
                            duration: Duration(milliseconds: 800),
                          ),
                        );
                    },
                  );
                },
              ),
              Consumer<CartState>(
                builder: (context, cart, child) {
                  if (cart.totalItems == 0) return const SizedBox.shrink();
                  return Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      color: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Ver carrinho (${cart.totalItems}) – R\$ ${cart.totalPrice.toStringAsFixed(2)}'),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const CartPage()),
                              );
                            },
                            child: const Text('Ver carrinho'),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}