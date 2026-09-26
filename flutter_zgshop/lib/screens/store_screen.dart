import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/student.dart';
import '../theme/boutique_theme.dart';
import 'notice_screen.dart';
import 'product_detail_screen.dart';

class StoreScreen extends StatefulWidget {
  final List<Product> products;
  final Student? currentStudent;
  final Function(Student) onStudentLogin;
  final Function(Product) onAddToCart;

  const StoreScreen({
    super.key,
    required this.products,
    required this.currentStudent,
    required this.onStudentLogin,
    required this.onAddToCart,
  });

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  void _handleProductClick(Product product) {
    if (product.isOutOfStock) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('此商品目前已搶光，正火速補貨中！'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    // 強制彈出購買前須知視窗 (User Requirement)
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PreOrderNoticeDialog(
        onAccepted: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (ctx) => ProductDetailScreen(
                product: product,
                onAddToCart: widget.onAddToCart,
              ),
            ),
          );
        },
      ),
    );
  }

  void _showAuthModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _StudentAuthSheet(onLoginSuccess: widget.onStudentLogin),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // 精品亮晶晶頂部橫幅 (SliverAppBar)
          SliverAppBar(
            expandedHeight: 140,
            floating: false,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('✨ ', style: TextStyle(fontSize: 16)),
                  Text(
                    'ZG BOUTIQUE 旗艦工坊',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              background: Container(
                decoration: const BoxDecoration(
                  gradient: BoutiqueTheme.primaryGradient,
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          '智光商工 62週年校慶限定 × 資處科出品',
                          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.account_circle, color: Colors.white),
                tooltip: '學生登入 / 註冊',
                onPressed: _showAuthModal,
              ),
            ],
          ),

          // 會員狀態提示條
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: BoutiqueTheme.surfaceWarm,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: BoutiqueTheme.borderSubtle.withOpacity(0.5)),
              ),
              child: Row(
                children: [
                  Icon(
                    widget.currentStudent != null ? Icons.verified : Icons.info_outline,
                    size: 18,
                    color: widget.currentStudent != null ? Colors.green : BoutiqueTheme.glitterRose,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.currentStudent != null
                          ? '已登入：${widget.currentStudent!.className} ${widget.currentStudent!.seatNo}號 ${widget.currentStudent!.name}'
                          : '尚未登入，下單前請先點擊右上角完成【登入/註冊】',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: widget.currentStudent != null ? Colors.black87 : BoutiqueTheme.glitterRose,
                      ),
                    ),
                  ),
                  if (widget.currentStudent == null)
                    TextButton(
                      onPressed: _showAuthModal,
                      style: TextButton.styleFrom(padding: EdgeInsets.zero),
                      child: const Text('登入/註冊', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                    ),
                ],
              ),
            ),
          ),

          // 商品列表標題
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  Text('💎 ', style: TextStyle(fontSize: 16)),
                  Text(
                    '校慶限定客製商品全品項',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: BoutiqueTheme.textPrimary),
                  ),
                ],
              ),
            ),
          ),

          // 商品網格 (Grid)
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 260,
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 0.72,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final prod = widget.products[index];
                  return _buildProductCard(prod);
                },
                childCount: widget.products.length,
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  Widget _buildProductCard(Product prod) {
    Color badgeColor = Colors.green;
    if (prod.isRestocking) badgeColor = BoutiqueTheme.glitterGold;
    if (prod.isOutOfStock) badgeColor = Colors.redAccent;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _handleProductClick(prod),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 商品圖片區域與庫存徽章
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: Colors.grey.shade150,
                    child: Center(
                      child: Icon(Icons.image, size: 48, color: Colors.grey.shade400),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: badgeColor,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(color: badgeColor.withOpacity(0.4), blurRadius: 4),
                        ],
                      ),
                      child: Text(
                        prod.stockLabel,
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 商品名稱與定價
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    prod.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    prod.description,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: BoutiqueTheme.textMuted),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'NT\$ ${prod.price}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: BoutiqueTheme.glitterRose,
                        ),
                      ),
                      ElevatedButton(
                        onPressed: prod.isOutOfStock ? null : () => _handleProductClick(prod),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(prod.isOutOfStock ? '已售罄' : '客製', style: const TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 學生會員登入 / 註冊彈窗
class _StudentAuthSheet extends StatefulWidget {
  final Function(Student) onLoginSuccess;
  const _StudentAuthSheet({required this.onLoginSuccess});

  @override
  State<_StudentAuthSheet> createState() => _StudentAuthSheetState();
}

class _StudentAuthSheetState extends State<_StudentAuthSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _loginIdController = TextEditingController();

  // 註冊表單
  final _regIdController = TextEditingController();
  final _regClassController = TextEditingController();
  final _regSeatController = TextEditingController();
  final _regNameController = TextEditingController();
  final _regPhoneController = TextEditingController();

  // 模擬學生資料庫 (檢查同班同座號唯一性)
  static final List<Student> _studentDb = [
    Student(studentId: '112345', className: '資三1', seatNo: '18', name: '陳冠宇', gender: '男', phone: '0912345678', registeredAt: '2026-09-24'),
    Student(studentId: '112412', className: '美三1', seatNo: '05', name: '林詩婷', gender: '女', phone: '0987654321', registeredAt: '2026-09-23'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  void _doLogin() {
    final id = _loginIdController.text.trim();
    if (id.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('請輸入學生學號！')));
      return;
    }
    final student = _studentDb.firstWhere(
      (s) => s.studentId == id,
      orElse: () => Student(studentId: id, className: '資三1', seatNo: '08', name: '同學', gender: '未指定', phone: '', registeredAt: '2026-09-26'),
    );
    widget.onLoginSuccess(student);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('歡迎回來，${student.name}！')));
  }

  void _doRegister() {
    final id = _regIdController.text.trim();
    final cls = _regClassController.text.trim();
    final seat = _regSeatController.text.trim();
    final name = _regNameController.text.trim();
    final phone = _regPhoneController.text.trim();

    if (id.isEmpty || cls.isEmpty || seat.isEmpty || name.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('所有欄位皆為必填！')));
      return;
    }

    // 嚴格同班同座號唯一性檢查 (User Requirement)
    final duplicate = _studentDb.any((s) => s.className.toLowerCase() == cls.toLowerCase() && int.tryParse(s.seatNo) == int.tryParse(seat));
    if (duplicate) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('⚠️ 座號已被註冊'),
          content: Text('「$cls」已經有 $seat 號學生完成註冊！同一個班級每個座號僅限 1 位同學使用，請確認是否填寫錯誤。'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('確定')),
          ],
        ),
      );
      return;
    }

    final newStudent = Student(
      studentId: id,
      className: cls,
      seatNo: seat.padLeft(2, '0'),
      name: name,
      gender: '未指定',
      phone: phone,
      registeredAt: DateTime.now().toString(),
    );
    _studentDb.add(newStudent);
    widget.onLoginSuccess(newStudent);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('註冊成功！歡迎 $name 同學。')));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TabBar(
            controller: _tabController,
            labelColor: BoutiqueTheme.glitterRose,
            unselectedLabelColor: BoutiqueTheme.textMuted,
            indicatorColor: BoutiqueTheme.glitterRose,
            tabs: const [
              Tab(text: '🔑 會員快速登入'),
              Tab(text: '✨ 首次使用註冊'),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 280,
            child: TabBarView(
              controller: _tabController,
              children: [
                // 登入 Tab
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('若您之前已註冊過，輸入學號即可直接登入：', style: TextStyle(fontSize: 13, color: BoutiqueTheme.textMuted)),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _loginIdController,
                      decoration: const InputDecoration(
                        labelText: '學生學號 (Student ID)',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.badge),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _doLogin,
                      style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                      child: const Text('登入系統 ✨'),
                    ),
                  ],
                ),

                // 註冊 Tab
                SingleChildScrollView(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _regClassController,
                              decoration: const InputDecoration(labelText: '班級 (例如: 資三1)', border: OutlineInputBorder()),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _regSeatController,
                              decoration: const InputDecoration(labelText: '座號 (唯一防重)', border: OutlineInputBorder()),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _regIdController,
                        decoration: const InputDecoration(labelText: '學生學號', border: OutlineInputBorder()),
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _regNameController,
                        decoration: const InputDecoration(labelText: '姓名', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _regPhoneController,
                        decoration: const InputDecoration(labelText: '聯絡電話', border: OutlineInputBorder()),
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _doRegister,
                        style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                        child: const Text('完成註冊並登入 ✨'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
