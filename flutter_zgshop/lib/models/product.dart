class Product {
  final String id;
  final String code;
  final String name;
  final String category;
  final int price;
  final String description;
  final String image;
  final String dimensions;
  final String aspect;
  String stockStatus; // 'in_stock', 'restocking', 'out_of_stock'

  Product({
    required this.id,
    required this.code,
    required this.name,
    required this.category,
    required this.price,
    required this.description,
    required this.image,
    required this.dimensions,
    required this.aspect,
    this.stockStatus = 'in_stock',
  });

  bool get isInStock => stockStatus == 'in_stock';
  bool get isRestocking => stockStatus == 'restocking';
  bool get isOutOfStock => stockStatus == 'out_of_stock';

  String get stockLabel {
    switch (stockStatus) {
      case 'in_stock':
        return '現貨供應';
      case 'restocking':
        return '補貨中';
      case 'out_of_stock':
        return '暫時缺貨';
      default:
        return '現貨供應';
    }
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      price: json['price'] is int ? json['price'] : int.tryParse(json['price'].toString()) ?? 0,
      description: json['description'] ?? '',
      image: json['image'] ?? '',
      dimensions: json['dimensions'] ?? '',
      aspect: json['aspect'] ?? '1:1',
      stockStatus: json['stockStatus'] ?? 'in_stock',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'category': category,
      'price': price,
      'description': description,
      'image': image,
      'dimensions': dimensions,
      'aspect': aspect,
      'stockStatus': stockStatus,
    };
  }

  static List<Product> get initialProducts => [
    Product(
      id: 'prod_mug',
      code: 'MUG',
      name: '經典高白陶瓷馬克杯 (11oz)',
      category: '熱昇華印刷',
      price: 150,
      description: '全彩高解析度轉印、耐高溫、微波爐適用。',
      image: 'assets/images/mug.jpg',
      dimensions: '200 × 85 mm',
      aspect: '2.35:1',
      stockStatus: 'in_stock',
    ),
    Product(
      id: 'prod_coaster',
      code: 'CST',
      name: '圓形瞬吸陶瓷吸水杯墊',
      category: 'UV噴印',
      price: 80,
      description: '高密度天然陶土燒製，瞬間吸附冷熱水珠。',
      image: 'assets/images/coaster.jpg',
      dimensions: '直徑 100 mm',
      aspect: '1:1',
      stockStatus: 'in_stock',
    ),
    Product(
      id: 'prod_badge',
      code: 'BDG',
      name: '58mm 亮面金屬別針胸章',
      category: '胸章沖壓',
      price: 40,
      description: '日本亮膜抗刮塗層，高彩度沖壓。',
      image: 'assets/images/badge.jpg',
      dimensions: '直徑 58 mm',
      aspect: '1:1',
      stockStatus: 'in_stock',
    ),
    Product(
      id: 'prod_cardholder',
      code: 'CRD',
      name: '質感皮革雙面悠遊卡套',
      category: '皮革燙印/UV',
      price: 120,
      description: '納帕紋防刮皮革，雙面透明開窗設計。',
      image: 'assets/images/cardholder.jpg',
      dimensions: '75 × 110 mm',
      aspect: '3:4',
      stockStatus: 'in_stock',
    ),
    Product(
      id: 'prod_passport',
      code: 'PSP',
      name: '出國必備極簡多功能護照套',
      category: '皮革彩印',
      price: 180,
      description: '多隔層卡槽、登機證與機票收納。',
      image: 'assets/images/passport.jpg',
      dimensions: '140 × 100 mm',
      aspect: '4:3',
      stockStatus: 'in_stock',
    ),
  ];
}
