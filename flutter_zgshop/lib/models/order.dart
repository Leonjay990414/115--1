class OrderItem {
  final String id;
  final String slipNo;
  final String studentId;
  final String className;
  final String seatNo;
  final String name;
  final String phone;
  final String productCode;
  final String productName;
  final int quantity;
  final int unitPrice;
  final int totalPrice;
  final String notes;
  final String imageUrl;
  final String imageRes;
  String qcStatus; // '待審核', '審核通過', '退件修正'
  String prodStatus; // '待印製', '轉印中', '已完成'
  String paymentStatus; // '未收款', '已收款'
  String deliveryStatus; // '待配送', '已送達班級'
  final String createdAt;

  OrderItem({
    required this.id,
    required this.slipNo,
    required this.studentId,
    required this.className,
    required this.seatNo,
    required this.name,
    required this.phone,
    required this.productCode,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.notes,
    required this.imageUrl,
    required this.imageRes,
    this.qcStatus = '待審核',
    this.prodStatus = '待印製',
    this.paymentStatus = '未收款',
    this.deliveryStatus = '待配送',
    required this.createdAt,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? '',
      slipNo: json['slipNo'] ?? '',
      studentId: json['studentId'] ?? '',
      className: json['className'] ?? '',
      seatNo: json['seatNo'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      productCode: json['productCode'] ?? '',
      productName: json['productName'] ?? '',
      quantity: json['quantity'] ?? 1,
      unitPrice: json['unitPrice'] ?? 0,
      totalPrice: json['totalPrice'] ?? 0,
      notes: json['notes'] ?? '',
      imageUrl: json['imageUrl'] ?? '',
      imageRes: json['imageRes'] ?? '1080P',
      qcStatus: json['qcStatus'] ?? '待審核',
      prodStatus: json['prodStatus'] ?? '待印製',
      paymentStatus: json['paymentStatus'] ?? '未收款',
      deliveryStatus: json['deliveryStatus'] ?? '待配送',
      createdAt: json['createdAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'slipNo': slipNo,
      'studentId': studentId,
      'className': className,
      'seatNo': seatNo,
      'name': name,
      'phone': phone,
      'productCode': productCode,
      'productName': productName,
      'quantity': quantity,
      'unitPrice': unitPrice,
      'totalPrice': totalPrice,
      'notes': notes,
      'imageUrl': imageUrl,
      'imageRes': imageRes,
      'qcStatus': qcStatus,
      'prodStatus': prodStatus,
      'paymentStatus': paymentStatus,
      'deliveryStatus': deliveryStatus,
      'createdAt': createdAt,
    };
  }
}
