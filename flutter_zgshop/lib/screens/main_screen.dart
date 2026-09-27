import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/student.dart';
import '../theme/boutique_theme.dart';
import 'admin_screen.dart';
import 'cart_screen.dart';
import 'store_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  List<Product> _products = Product.initialProducts;
  final List<Product> _cartItems = [];
  Student? _currentStudent;

  void _onStudentLogin(Student student) {
    setState(() {
      _currentStudent = student;
    });
  }

  void _onAddToCart(Product product) {
    setState(() {
      _cartItems.add(product);
    });
  }

  void _onClearCart() {
    setState(() {
      _cartItems.clear();
    });
  }

  void _onOrderPlaced() {
    setState(() {
      _cartItems.clear();
    });
  }

  void _onUpdateStock(String productId, String newStatus) {
    setState(() {
      final idx = _products.indexWhere((p) => p.id == productId);
      if (idx != -1) {
        _products[idx].stockStatus = newStatus;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      StoreScreen(
        products: _products,
        currentStudent: _currentStudent,
        onStudentLogin: _onStudentLogin,
        onAddToCart: _onAddToCart,
      ),
      CartScreen(
        cartItems: _cartItems,
        currentStudent: _currentStudent,
        onClearCart: _onClearCart,
        onOrderPlaced: _onOrderPlaced,
      ),
      AdminScreen(
        products: _products,
        onUpdateStock: _onUpdateStock,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        backgroundColor: Colors.white,
        elevation: 6,
        indicatorColor: BoutiqueTheme.glitterPink.withValues(alpha: 0.2),
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront, color: BoutiqueTheme.glitterRose),
            label: '旗艦商城',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: _cartItems.isNotEmpty,
              label: Text('${_cartItems.length}'),
              backgroundColor: BoutiqueTheme.glitterRose,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: _cartItems.isNotEmpty,
              label: Text('${_cartItems.length}'),
              backgroundColor: BoutiqueTheme.glitterRose,
              child: const Icon(Icons.shopping_cart, color: BoutiqueTheme.glitterRose),
            ),
            label: '購物車',
          ),
          const NavigationDestination(
            icon: Icon(Icons.admin_panel_settings_outlined),
            selectedIcon: Icon(Icons.admin_panel_settings, color: BoutiqueTheme.glitterRose),
            label: '後台管理',
          ),
        ],
      ),
    );
  }
}
