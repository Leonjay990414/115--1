import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/student.dart';
import '../theme/boutique_theme.dart';

class CartScreen extends StatelessWidget {
  final List<Product> cartItems;
  final Student? currentStudent;
  final VoidCallback onClearCart;
  final VoidCallback onOrderPlaced;

  const CartScreen({
    super.key,
    required this.cartItems,
    required this.currentStudent,
    required this.onClearCart,
    required this.onOrderPlaced,
  });

  int get totalAmount => cartItems.fold(0, (sum, item) => sum + item.price);

  @override
  Widget build(BuildContext context) {
    if (cartItems.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('🛒 我的購物車')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.shopping_bag_outlined, size: 70, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              const Text('您的購物車是空的', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('前往商城挑選專屬校慶客製商品吧！', style: TextStyle(color: BoutiqueTheme.textMuted)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('🛒 購物車 (${cartItems.length})'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep),
            tooltip: '清空購物車',
            onPressed: onClearCart,
          ),
        ],
      ),
      body: Column(
        children: [
          // 學生收件資訊提示
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: BoutiqueTheme.surfaceWarm,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: BoutiqueTheme.borderSubtle),
            ),
            child: Row(
              children: [
                const Icon(Icons.school, color: BoutiqueTheme.glitterRose),
                const SizedBox(width: 10),
                Expanded(
                  child: currentStudent != null
                      ? Text(
                          '訂單配送對象：${currentStudent!.className} ${currentStudent!.seatNo}號 ${currentStudent!.name} (${currentStudent!.phone})',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        )
                      : const Text(
                          '⚠️ 尚未登入學生身份，送單前請先至首頁右上角登入',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.redAccent),
                        ),
                ),
              ],
            ),
          ),

          // 項目清單
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: cartItems.length,
              itemCount: cartItems.length,
              itemBuilder: (ctx, i) {
                final p = cartItems[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: BoutiqueTheme.surfaceWarm,
                      child: Icon(Icons.stars, color: BoutiqueTheme.glitterGold),
                    ),
                    title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('規格：${p.dimensions} | ${p.category}'),
                    trailing: Text('NT\$ ${p.price}', style: const TextStyle(fontWeight: FontWeight.w900, color: BoutiqueTheme.glitterRose)),
                  ),
                );
              },
            ),
          ),

          // 底部結帳卡片
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, -4)),
              ],
            ),
            child: SafeArea(
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('訂單應付總金額：', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                      Text(
                        'NT\$ $totalAmount',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: BoutiqueTheme.glitterRose),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: currentStudent == null
                        ? null
                        : () {
                            onOrderPlaced();
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('🎉 下單成功！'),
                                content: const Text('已為您完成智慧拆單！工單已自動分發至美術審核組進行 1080P QC 檢驗。通過後將開立 A4 雙聯存根並由外送員送達班級！'),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    child: const Text('確定'),
                                  ),
                                ],
                              ),
                            );
                          },
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      backgroundColor: BoutiqueTheme.glitterRose,
                    ),
                    child: const Text('✨ 確認送出客製訂單 (實名制拆單)'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
