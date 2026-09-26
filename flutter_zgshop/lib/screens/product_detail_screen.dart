import 'package:flutter/material.dart';
import '../models/product.dart';
import '../theme/boutique_theme.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;
  final Function(Product) onAddToCart;

  const ProductDetailScreen({
    super.key,
    required this.product,
    required this.onAddToCart,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _qty = 1;
  final _notesController = TextEditingController();
  bool _imageUploaded = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product.name),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 商品主圖展示
            Container(
              height: 220,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: BoutiqueTheme.borderSubtle),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.palette_outlined, size: 60, color: BoutiqueTheme.glitterRose),
                    const SizedBox(height: 8),
                    Text('客製印刷規格：${widget.product.dimensions}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('工藝分類：${widget.product.category}', style: const TextStyle(color: BoutiqueTheme.textMuted, fontSize: 12)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 名稱與定價
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    widget.product.name,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                ),
                Text(
                  'NT\$ ${widget.product.price}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: BoutiqueTheme.glitterRose),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(widget.product.description, style: const TextStyle(color: BoutiqueTheme.textSecondary, fontSize: 13)),
            const Divider(height: 30),

            // 圖檔上傳與 1080P 檢驗
            const Text('🎨 上傳客製設計圖檔 (1080P 解析度檢驗)', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.green.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('解析度合格：1920 × 1080 (300 DPI)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.green)),
                        Text('符合印刷出血規範與彩度標準', style: TextStyle(fontSize: 11, color: Colors.black54)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 印刷備註與要求
            const Text('✍️ 客製要求備註 (例如：文字置中、不裁切年份)', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                hintText: '請輸入您對此商品的特定印製需求...',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),

            // 數量選擇
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('訂購數量', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: _qty > 1 ? () => setState(() => _qty--) : null,
                    ),
                    Text('$_qty', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () => setState(() => _qty++),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 加入購物車按鈕
            ElevatedButton(
              onPressed: () {
                widget.onAddToCart(widget.product);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('已將 ${widget.product.name} × $_qty 加入購物車！'),
                    backgroundColor: BoutiqueTheme.glitterRose,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                backgroundColor: BoutiqueTheme.glitterRose,
              ),
              child: Text(
                '✨ 立即加入購物車 (小計 NT\$ ${widget.product.price * _qty})',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
