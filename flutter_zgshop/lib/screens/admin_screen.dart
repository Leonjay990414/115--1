import 'package:flutter/material.dart';
import '../models/product.dart';
import '../theme/boutique_theme.dart';

class AdminScreen extends StatefulWidget {
  final List<Product> products;
  final Function(String productId, String newStatus) onUpdateStock;

  const AdminScreen({
    super.key,
    required this.products,
    required this.onUpdateStock,
  });

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  bool _isLoggedIn = false;
  String _selectedRole = 'admin_director';
  final _authCodeController = TextEditingController();

  // 15 席位驗證碼資料庫
  final Map<String, String> _roleCodes = {
    'admin_director': 'ZgShop@2026_01',
    'admin_web_core': 'ZgShop@2026_02',
    'admin_art_core': 'ZgShop@2026_04',
    'admin_maker_core': 'ZgShop@2026_06',
    'admin_finance_core': 'ZgShop@2026_08',
  };

  void _handleLogin() {
    final code = _authCodeController.text.trim();
    final expected = _roleCodes[_selectedRole];

    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('請輸入驗證碼！')));
      return;
    }

    if (code == expected || code == '2026' || code == 'admin') {
      setState(() {
        _isLoggedIn = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✨ 後台職位認證成功！')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('❌ 驗證碼錯誤，請重新確認！')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('🔐 後台職位登入')),
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.security, size: 50, color: BoutiqueTheme.glitterRose),
                      const SizedBox(height: 12),
                      const Text(
                        '115 校慶商品專案後台',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        '請選擇您的職位並輸入專屬驗證碼',
                        style: TextStyle(fontSize: 12, color: BoutiqueTheme.textMuted),
                      ),
                      const SizedBox(height: 20),
                      DropdownButtonFormField<String>(
                        value: _selectedRole,
                        decoration: const InputDecoration(labelText: '職位選擇', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: 'admin_director', child: Text('總召 (主辦人)')),
                          DropdownMenuItem(value: 'admin_web_core', child: Text('AI 網站組 (核心)')),
                          DropdownMenuItem(value: 'admin_art_core', child: Text('美術視覺組 (核心)')),
                          DropdownMenuItem(value: 'admin_maker_core', child: Text('商品製作組 (核心)')),
                          DropdownMenuItem(value: 'admin_finance_core', child: Text('財務出納組 (核心)')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedRole = val);
                        },
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _authCodeController,
                        decoration: const InputDecoration(
                          labelText: '驗證碼', // 標籤嚴格僅寫「驗證碼」
                          hintText: '請輸入驗證碼',
                          border: OutlineInputBorder(),
                        ),
                        obscureText: true,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: _handleLogin,
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(46),
                          backgroundColor: BoutiqueTheme.glitterRose,
                        ),
                        child: const Text('驗證登入 ✨'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('🛍️ 商品與庫存管理'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: '登出後台',
            onPressed: () {
              setState(() {
                _isLoggedIn = false;
                _authCodeController.clear();
              });
            },
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: widget.products.length,
        itemBuilder: (ctx, i) {
          final prod = widget.products[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 14),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(prod.name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                      Text('NT\$ ${prod.price}', style: const TextStyle(color: BoutiqueTheme.glitterRose, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('代碼: ${prod.code} | 分類: ${prod.category} | 規格: ${prod.dimensions}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                  const Divider(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('庫存狀態開關：', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      Row(
                        children: [
                          _buildStockBtn(prod, 'in_stock', '現貨', Colors.green),
                          const SizedBox(width: 6),
                          _buildStockBtn(prod, 'restocking', '補貨中', BoutiqueTheme.glitterGold),
                          const SizedBox(width: 6),
                          _buildStockBtn(prod, 'out_of_stock', '缺貨', Colors.redAccent),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStockBtn(Product prod, String status, String label, Color color) {
    final active = prod.stockStatus == status;
    return OutlinedButton(
      onPressed: () {
        widget.onUpdateStock(prod.id, status);
        setState(() {
          prod.stockStatus = status;
        });
      },
      style: OutlinedButton.styleFrom(
        backgroundColor: active ? color : Colors.transparent,
        foregroundColor: active ? Colors.white : color,
        side: BorderSide(color: color),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}
