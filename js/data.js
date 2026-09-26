/**
 * 智光商工 115學年度 第62屆校慶園遊會 - 客製化商品專案 (ZG Shop)
 * 核心資料庫模型、RBAC 權限矩陣與初始資料
 */

// 1. 商品資料定義 (5 大客製化商品)
const INITIAL_PRODUCTS = [
  {
    id: "prod_mug",
    code: "MUG",
    name: "經典高白陶瓷馬克杯",
    category: "陶瓷工藝",
    price: 150,
    material: "高級瓷土 / 特級熱昇華顯色塗層",
    specs: "容量 320ml (11oz) / 轉印範圍 20cm × 8.5cm",
    resolutionReq: "建議 1080P 以上 (寬度 ≥ 1920px, 300 DPI)",
    minWidth: 1080,
    minHeight: 800,
    image: "assets/images/mug.jpg",
    badge: "人氣首選",
    description: "智光校慶限定高規格陶瓷馬克杯，經 1280°C 高溫燒製，塗層均勻細緻，熱昇華顯色飽滿耐清洗。"
  },
  {
    id: "prod_coaster",
    code: "CST",
    name: "圓形瞬吸陶瓷吸水杯墊",
    category: "陶瓷工藝",
    price: 80,
    material: "高密度吸水陶瓷 + 環保天然軟木止滑底",
    specs: "圓形直徑 10.3cm / 厚度 0.6cm",
    resolutionReq: "建議 1080P 以上 (正方形 ≥ 1080 × 1080px, 300 DPI)",
    minWidth: 1080,
    minHeight: 1080,
    image: "assets/images/coaster.jpg",
    badge: "實用必備",
    description: "微米毛細孔能快速吸乾冷飲水珠，保持桌面乾爽；底部貼合軟木墊防刮桌面。"
  },
  {
    id: "prod_badge",
    code: "BDG",
    name: "58mm 亮面金屬胸章",
    category: "金屬紀念品",
    price: 40,
    material: "金屬馬口鐵底殼 + 高透光防刮亮膜 + 安全別針",
    specs: "直徑 5.8cm (58mm 標準尺寸)",
    resolutionReq: "建議 1080P 以上 (正方形 ≥ 1080 × 1080px, 300 DPI)",
    minWidth: 1080,
    minHeight: 1080,
    image: "assets/images/badge.jpg",
    badge: "超值紀念",
    description: "高飽和色彩還原，表面覆蓋防刮耐磨防水光膜，背附安全旋轉別針，書包外套隨心裝飾。"
  },
  {
    id: "prod_cardholder",
    code: "CRD",
    name: "質感荔枝紋皮革悠遊卡套",
    category: "皮革配件",
    price: 120,
    material: "耐磨環保荔枝紋 PU 皮革 + 鋅合金扣 + 頸掛繩",
    specs: "外徑 7.5cm × 10.5cm (容納標準學生證/悠遊卡)",
    resolutionReq: "建議 1080P 以上 (直式 ≥ 1080 × 1500px, 300 DPI)",
    minWidth: 1080,
    minHeight: 1200,
    image: "assets/images/cardholder.jpg",
    badge: "校園通行",
    description: "高透光防消磁視窗，附贈同色精緻皮革頸掛繩，雙面卡槽便於收納學生證與捷運卡。"
  },
  {
    id: "prod_passport",
    code: "PSP",
    name: "尊榮客製化皮革護照套",
    category: "皮革配件",
    price: 180,
    material: "頂級納帕紋皮革 + 燙金包角 + 防消磁保護層",
    specs: "閉合 10cm × 14cm / 展開 20cm × 14cm (國際護照通用)",
    resolutionReq: "建議 1080P 以上 (橫式展開 ≥ 1920 × 1400px, 300 DPI)",
    minWidth: 1080,
    minHeight: 1080,
    image: "assets/images/passport.jpg",
    badge: "出國尊榮",
    description: "全包覆精緻車縫邊，內置多功能機票與卡片插槽，精美燙印客製專屬圖騰與字體。"
  }
];

// 2. 15人獨立帳號與 RBAC 權限矩陣定義
const RBAC_ACCOUNTS = [
  {
    username: "admin_director",
    password: "ZgShop@2026_01",
    roleName: "總召 (主辦人)",
    roleLevel: "Super Admin",
    dept: "大會核心指揮部",
    permissions: ["all", "dashboard", "qc", "production", "finance", "delivery", "export", "wipe", "settings"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: true,
    canUpdateProd: true
  },
  {
    username: "admin_web_core",
    password: "ZgShop@2026_02",
    roleName: "AI 網站組 (核心)",
    roleLevel: "Developer",
    dept: "AI 資訊網站組",
    permissions: ["dashboard", "qc", "production", "finance", "delivery", "export", "wipe", "settings"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: true,
    canUpdateProd: true
  },
  {
    username: "admin_web_staff",
    password: "ZgShop@2026_03",
    roleName: "AI 網站組 (招募)",
    roleLevel: "Developer",
    dept: "AI 資訊網站組",
    permissions: ["dashboard", "qc", "production", "finance", "delivery", "export"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: true,
    canUpdateProd: true
  },
  {
    username: "admin_art_core",
    password: "ZgShop@2026_04",
    roleName: "美術視覺組 (核心)",
    roleLevel: "QC Reviewer",
    dept: "視覺設計審查組",
    permissions: ["qc", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false, // 美術組專注審核圖檔
    canApproveQC: true,
    canUpdateProd: false
  },
  {
    username: "admin_art_staff",
    password: "ZgShop@2026_05",
    roleName: "美術視覺組 (招募)",
    roleLevel: "QC Reviewer",
    dept: "視覺設計審查組",
    permissions: ["qc", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: true,
    canUpdateProd: false
  },
  {
    username: "admin_maker_core",
    password: "ZgShop@2026_06",
    roleName: "商品製作組 (核心)",
    roleLevel: "Production",
    dept: "產線加工製造組",
    permissions: ["production", "view_orders"],
    canExportExcel: true, // 供機台對接下載
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: true
  },
  {
    username: "admin_maker_staff",
    password: "ZgShop@2026_07",
    roleName: "商品製作組 (招募)",
    roleLevel: "Production",
    dept: "產線加工製造組",
    permissions: ["production", "view_orders"],
    canExportExcel: true,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: true
  },
  {
    username: "admin_finance_core",
    password: "ZgShop@2026_08",
    roleName: "財務組 (核心)",
    roleLevel: "Finance",
    dept: "帳務金流出納組",
    permissions: ["dashboard", "finance", "export", "print_a4"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: false,
    canUpdateProd: false
  },
  {
    username: "admin_finance_staff",
    password: "ZgShop@2026_09",
    roleName: "財務組 (招募)",
    roleLevel: "Finance",
    dept: "帳務金流出納組",
    permissions: ["dashboard", "finance", "export", "print_a4"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: false,
    canUpdateProd: false
  },
  {
    username: "staff_plan_A",
    password: "ZgStaff@2026_10",
    roleName: "企劃組 (人員A)",
    roleLevel: "Marketing",
    dept: "企劃文案組",
    permissions: ["dashboard", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false, // 個資遮蔽保護
    canApproveQC: false,
    canUpdateProd: false
  },
  {
    username: "staff_plan_B",
    password: "ZgStaff@2026_11",
    roleName: "企劃組 (人員B)",
    roleLevel: "Marketing",
    dept: "企劃文案組",
    permissions: ["dashboard", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: false
  },
  {
    username: "staff_promo_A",
    password: "ZgStaff@2026_12",
    roleName: "宣傳組 (人員A)",
    roleLevel: "Promotion",
    dept: "宣傳公關組",
    permissions: ["dashboard", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: false
  },
  {
    username: "staff_promo_B",
    password: "ZgStaff@2026_13",
    roleName: "宣傳組 (人員B)",
    roleLevel: "Promotion",
    dept: "宣傳公關組",
    permissions: ["dashboard", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: false
  },
  {
    username: "staff_delivery_A",
    password: "ZgStaff@2026_14",
    roleName: "外送組 (人員A)",
    roleLevel: "Logistics",
    dept: "外送物流組",
    permissions: ["delivery", "view_orders", "print_return_notice"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false, // 個資遮蔽，僅配送班級
    canApproveQC: false,
    canUpdateProd: false
  },
  {
    username: "staff_delivery_B",
    password: "ZgStaff@2026_15",
    roleName: "外送組 (人員B)",
    roleLevel: "Logistics",
    dept: "外送物流組",
    permissions: ["delivery", "view_orders", "print_return_notice"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: false
  }
];

// 3. 初始預設訂單資料 (用於展示拆單邏輯、各組審核狀態、第4天退件防漏接)
const INITIAL_ORDERS = [
  {
    id: "ZG2026-0001-MUG",
    parentOrderId: "ZG2026-0001",
    slipNo: "000001",
    studentId: "112345",
    className: "資三1",
    seatNo: "18",
    name: "陳冠宇",
    gender: "男",
    phone: "0912345678",
    productId: "prod_mug",
    productCode: "MUG",
    productName: "經典高白陶瓷馬克杯",
    quantity: 2,
    unitPrice: 150,
    totalPrice: 300,
    notes: "杯身正面請置中對齊，不要裁切到右下角年份字樣",
    imageUrl: "assets/images/mug.jpg",
    imageRes: "1920 x 1080 (合格 1080P)",
    qcStatus: "審核通過", // 待審核 / 審核通過 / 退件
    qcReviewer: "admin_art_core",
    qcNote: "解析度 300 DPI 達標，符合出血與轉印規格。",
    qcDate: "2026-09-24 10:30:00",
    prodStatus: "已完成", // 待印製 / 轉印中 / 已完成
    paymentStatus: "已收款", // 未收款 / 已收款
    deliveryStatus: "已送達班級", // 待配送 / 配送中 / 已送達班級
    createdAt: "2026-09-24 09:15:00",
    daysSinceReview: 2
  },
  {
    id: "ZG2026-0001-BDG",
    parentOrderId: "ZG2026-0001",
    slipNo: "000002",
    studentId: "112345",
    className: "資三1",
    seatNo: "18",
    name: "陳冠宇",
    gender: "男",
    phone: "0912345678",
    productId: "prod_badge",
    productCode: "BDG",
    productName: "58mm 亮面金屬胸章",
    quantity: 1,
    unitPrice: 40,
    totalPrice: 40,
    notes: "圓形亮膜邊緣請保留 3mm 出血線",
    imageUrl: "assets/images/badge.jpg",
    imageRes: "1200 x 1200 (合格 1080P)",
    qcStatus: "審核通過",
    qcReviewer: "admin_art_core",
    qcNote: "裁切版型吻合 58mm 標準尺寸。",
    qcDate: "2026-09-24 10:35:00",
    prodStatus: "轉印中",
    paymentStatus: "已收款",
    deliveryStatus: "待配送",
    createdAt: "2026-09-24 09:15:00",
    daysSinceReview: 2
  },
  {
    id: "ZG2026-0002-CST",
    parentOrderId: "ZG2026-0002",
    slipNo: "000003",
    studentId: "112412",
    className: "美三1",
    seatNo: "05",
    name: "林詩婷",
    gender: "女",
    phone: "0987654321",
    productId: "prod_coaster",
    productCode: "CST",
    productName: "圓形瞬吸陶瓷吸水杯墊",
    quantity: 1,
    unitPrice: 80,
    totalPrice: 80,
    notes: "線條插畫請維持黑白高對比度",
    imageUrl: "assets/images/coaster.jpg",
    imageRes: "1600 x 1600 (合格 1080P)",
    qcStatus: "待審核",
    qcReviewer: "",
    qcNote: "",
    qcDate: "",
    prodStatus: "待印製",
    paymentStatus: "未收款",
    deliveryStatus: "待配送",
    createdAt: "2026-09-26 11:20:00",
    daysSinceReview: 0
  },
  {
    id: "ZG2026-0003-CRD",
    parentOrderId: "ZG2026-0003",
    slipNo: "000004",
    studentId: "112089",
    className: "普三2",
    seatNo: "33",
    name: "張志偉",
    gender: "男",
    phone: "0933112233",
    productId: "prod_cardholder",
    productCode: "CRD",
    productName: "質感荔枝紋皮革悠遊卡套",
    quantity: 1,
    unitPrice: 120,
    totalPrice: 120,
    notes: "學生證識別請使用大字體",
    imageUrl: "assets/images/cardholder.jpg",
    imageRes: "480 x 360 (畫質嚴重不足)",
    qcStatus: "退件",
    qcReviewer: "admin_art_staff",
    qcNote: "上傳圖檔尺寸僅 480x360，嚴重低於 1080P 建議標準，熱轉印會產生明顯鋸齒模糊，請重新提供 1080P 高畫質原圖！",
    qcDate: "2026-09-22 14:00:00",
    prodStatus: "待印製",
    paymentStatus: "未收款",
    deliveryStatus: "待配送",
    createdAt: "2026-09-22 11:00:00",
    daysSinceReview: 4 // 第4天防漏接機制觸發！
  }
];

// 4. 資料庫封裝層 (LocalStorage + 預設資料管理)
class ZgDataManager {
  static KEY_ORDERS = "zg_orders_db_v1";
  static KEY_USER = "zg_current_user_v1";
  static KEY_ADMIN = "zg_current_admin_v1";
  static KEY_LOGS = "zg_audit_logs_v1";
  static KEY_SLIP_COUNTER = "zg_slip_counter_v1";

  static init() {
    if (!localStorage.getItem(this.KEY_ORDERS)) {
      localStorage.setItem(this.KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
    }
    if (!localStorage.getItem(this.KEY_SLIP_COUNTER)) {
      localStorage.setItem(this.KEY_SLIP_COUNTER, "000005");
    }
  }

  static getProducts() {
    return INITIAL_PRODUCTS;
  }

  static getProductById(id) {
    return INITIAL_PRODUCTS.find(p => p.id === id);
  }

  static getOrders() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.KEY_ORDERS)) || [];
    } catch (e) {
      return INITIAL_ORDERS;
    }
  }

  static saveOrders(orders) {
    localStorage.setItem(this.KEY_ORDERS, JSON.stringify(orders));
  }

  static getNextSlipNo() {
    let cur = parseInt(localStorage.getItem(this.KEY_SLIP_COUNTER) || "5", 10);
    let str = String(cur).padStart(6, "0");
    localStorage.setItem(this.KEY_SLIP_COUNTER, String(cur + 1));
    return str;
  }

  /**
   * 核心技術：品項獨立拆單邏輯 (Split Order Logic)
   * 購物車中若有不同商品品項，自動拆分為獨立工單；同品項多件則合併。
   */
  static splitAndCreateOrders(cartItems, studentProfile) {
    const parentOrderId = "ZG2026-" + Math.floor(1000 + Math.random() * 9000);
    const orders = this.getOrders();
    const createdOrders = [];
    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    cartItems.forEach((item, index) => {
      const prod = this.getProductById(item.productId);
      const childSlipNo = this.getNextSlipNo();
      const childOrderId = `${parentOrderId}-${prod.code || "ITEM"}`;

      const newOrder = {
        id: childOrderId,
        parentOrderId: parentOrderId,
        slipNo: childSlipNo,
        studentId: studentProfile.studentId.trim(),
        className: studentProfile.className.trim(),
        seatNo: String(studentProfile.seatNo).padStart(2, "0"),
        name: studentProfile.name.trim(),
        gender: studentProfile.gender || "未指定",
        phone: studentProfile.phone.trim(),
        productId: item.productId,
        productCode: prod.code,
        productName: prod.name,
        quantity: item.quantity,
        unitPrice: prod.price,
        totalPrice: prod.price * item.quantity,
        notes: item.notes || "無特別備註",
        imageUrl: item.imageUrl || prod.image,
        imageRes: item.imageRes || "1920 x 1080 (1080P)",
        qcStatus: "待審核",
        qcReviewer: "",
        qcNote: "",
        qcDate: "",
        prodStatus: "待印製",
        paymentStatus: "未收款",
        deliveryStatus: "待配送",
        createdAt: nowStr,
        daysSinceReview: 0
      };

      orders.unshift(newOrder);
      createdOrders.push(newOrder);
    });

    this.saveOrders(orders);
    this.addLog(`學生 [${studentProfile.name} (${studentProfile.studentId})] 建立訂單，拆單產生 ${createdOrders.length} 張工單。`);
    return { parentOrderId, createdOrders };
  }

  static updateOrder(orderId, updateFields) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...updateFields };
      this.saveOrders(orders);
      return orders[idx];
    }
    return null;
  }

  // 14 天後物理銷毀個資功能
  static wipeDatabase() {
    localStorage.removeItem(this.KEY_ORDERS);
    localStorage.removeItem(this.KEY_USER);
    localStorage.removeItem(this.KEY_SLIP_COUNTER);
    this.addLog("【重大資安警報】大會管理員執行 14 天到期物理個資全量抹除指令，所有訂單與學生個資已被徹底銷毀！");
  }

  static getLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY_LOGS)) || [];
    } catch (e) {
      return [];
    }
  }

  static addLog(action) {
    const logs = this.getLogs();
    const time = new Date().toLocaleString("zh-TW", { hour12: false });
    logs.unshift({ time, action });
    localStorage.setItem(this.KEY_LOGS, JSON.stringify(logs.slice(0, 100)));
  }

  // 學生個資脫敏函數 (供行銷、宣傳、外送組查看時遮蔽敏感欄位)
  static maskStudentData(order) {
    const masked = { ...order };
    if (masked.studentId && masked.studentId.length >= 4) {
      masked.studentId = masked.studentId.substring(0, 3) + "***";
    }
    if (masked.phone && masked.phone.length >= 8) {
      masked.phone = masked.phone.substring(0, 4) + "****" + masked.phone.substring(masked.phone.length - 2);
    }
    if (masked.name && masked.name.length >= 2) {
      masked.name = masked.name[0] + "○" + (masked.name.length > 2 ? masked.name.substring(2) : "");
    }
    return masked;
  }
}

// 預設執行初始化
ZgDataManager.init();
