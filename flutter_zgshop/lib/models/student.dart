class Student {
  final String studentId;
  final String className;
  final String seatNo;
  final String name;
  final String gender;
  final String phone;
  final String registeredAt;

  Student({
    required this.studentId,
    required this.className,
    required this.seatNo,
    required this.name,
    required this.gender,
    required this.phone,
    required this.registeredAt,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      studentId: json['studentId'] ?? '',
      className: json['className'] ?? '',
      seatNo: json['seatNo'] ?? '',
      name: json['name'] ?? '',
      gender: json['gender'] ?? '未指定',
      phone: json['phone'] ?? '',
      registeredAt: json['registeredAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'className': className,
      'seatNo': seatNo,
      'name': name,
      'gender': gender,
      'phone': phone,
      'registeredAt': registeredAt,
    };
  }
}
