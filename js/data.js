/**
 * 智光商工職業學校 115 年度第六十六屆校慶圓遊會 - 客製化商品專案 (ZG Shop)
 * 核心資料庫模型、商品庫存管理 (CRUD)、RBAC 驗證碼安全矩陣與學生帳號唯一性約束
 */

// 台灣當地時間產生輔助函式 (避免 toISOString 產生 UTC 8小時落差)
function getTaiwanNowString() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 1. 商品資料定義 (5 大客製化商品，預設庫存狀態：in_stock 現貨供應)
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
    stockStatus: "in_stock", // in_stock (現貨) / restocking (補貨中) / out_of_stock (已搶光)
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
    stockStatus: "in_stock",
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
    stockStatus: "in_stock",
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
    stockStatus: "in_stock",
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
    stockStatus: "in_stock",
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
    permissions: ["all", "dashboard", "products", "qc", "production", "finance", "delivery", "export", "wipe", "auth_mgr"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: true,
    canUpdateProd: true,
    canManageProducts: true
  },
  {
    username: "admin_web_core",
    password: "ZgShop@2026_02",
    roleName: "AI 網站組 (核心)",
    roleLevel: "Developer",
    dept: "AI 資訊網站組",
    permissions: ["dashboard", "products", "qc", "production", "finance", "delivery", "export", "wipe", "auth_mgr"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: true,
    canUpdateProd: true,
    canManageProducts: true
  },
  {
    username: "admin_web_staff",
    password: "ZgShop@2026_03",
    roleName: "AI 網站組 (招募)",
    roleLevel: "Developer",
    dept: "AI 資訊網站組",
    permissions: ["dashboard", "products", "qc", "production", "finance", "delivery", "export"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: true,
    canUpdateProd: true,
    canManageProducts: false
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
    canViewFullPII: false,
    canApproveQC: true,
    canUpdateProd: false,
    canManageProducts: false
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
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_maker_core",
    password: "ZgShop@2026_06",
    roleName: "商品製作組 (核心)",
    roleLevel: "Production",
    dept: "產線加工製造組",
    permissions: ["production", "products", "view_orders"],
    canExportExcel: true,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: true,
    canManageProducts: true
  },
  {
    username: "admin_maker_staff",
    password: "ZgShop@2026_07",
    roleName: "商品製作組 (招募)",
    roleLevel: "Production",
    dept: "產線加工製造組",
    permissions: ["production", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: true,
    canManageProducts: false
  },
  {
    username: "admin_finance_core",
    password: "ZgShop@2026_08",
    roleName: "財務出納組 (核心)",
    roleLevel: "Finance",
    dept: "財務會計出納組",
    permissions: ["finance", "dashboard", "export"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: false,
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_finance_staff",
    password: "ZgShop@2026_09",
    roleName: "財務出納組 (招募)",
    roleLevel: "Finance",
    dept: "財務會計出納組",
    permissions: ["finance"],
    canExportExcel: false,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: false,
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_logistics_core",
    password: "ZgShop@2026_10",
    roleName: "現場外送組 (核心)",
    roleLevel: "Delivery",
    dept: "班級配送物流組",
    permissions: ["delivery", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: true,
    canApproveQC: false,
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_logistics_staff",
    password: "ZgShop@2026_11",
    roleName: "現場外送組 (招募)",
    roleLevel: "Delivery",
    dept: "班級配送物流組",
    permissions: ["delivery", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: true,
    canApproveQC: false,
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_marketing_core",
    password: "ZgShop@2026_12",
    roleName: "公關行銷組 (核心)",
    roleLevel: "Marketing",
    dept: "社群公關推廣組",
    permissions: ["dashboard", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_pr_core",
    password: "ZgShop@2026_13",
    roleName: "企劃宣傳組 (核心)",
    roleLevel: "PR",
    dept: "企劃宣傳組",
    permissions: ["dashboard", "view_orders"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_equipment_core",
    password: "ZgShop@2026_14",
    roleName: "活動設備組 (核心)",
    roleLevel: "Support",
    dept: "機台電力維護組",
    permissions: ["dashboard"],
    canExportExcel: false,
    canPrintA4: false,
    canViewFullPII: false,
    canApproveQC: false,
    canUpdateProd: false,
    canManageProducts: false
  },
  {
    username: "admin_supervisor",
    password: "ZgShop@2026_15",
    roleName: "指導老師/大會督導",
    roleLevel: "Advisor",
    dept: "校慶籌備指導委員會",
    permissions: ["all", "dashboard", "products", "qc", "production", "finance", "delivery", "export", "wipe", "auth_mgr"],
    canExportExcel: true,
    canPrintA4: true,
    canViewFullPII: true,
    canApproveQC: true,
    canUpdateProd: true,
    canManageProducts: true
  }
];

// 3. 預設模擬訂單 (符合資料庫正規化設計，採用標準科系加班級與台灣當地時間)
const INITIAL_ORDERS = [
  {
    id: "ZG2026-0001-MUG",
    parentOrderId: "ZG2026-0001",
    slipNo: "000001",
    studentId: "112345",
    className: "資處科三1",
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
    qcStatus: "審核通過",
    qcReviewer: "admin_art_core",
    qcNote: "解析度 300 DPI 達標，符合出血與轉印規格。",
    qcDate: "2026-09-24 10:30:00",
    prodStatus: "已完成",
    paymentStatus: "已收款",
    deliveryStatus: "已送達班級",
    isPrintedSlip: true,
    printedSlipAt: "2026-09-24 11:00:00",
    createdAt: "2026-09-24 09:15:00",
    daysSinceReview: 2
  },
  {
    id: "ZG2026-0001-BDG",
    parentOrderId: "ZG2026-0001",
    slipNo: "000002",
    studentId: "112345",
    className: "資處科三1",
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
    isPrintedSlip: true,
    printedSlipAt: "2026-09-24 11:00:00",
    createdAt: "2026-09-24 09:15:00",
    daysSinceReview: 2
  },
  {
    id: "ZG2026-0002-CST",
    parentOrderId: "ZG2026-0002",
    slipNo: "000003",
    studentId: "112412",
    className: "廣設科三1",
    seatNo: "5",
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
    imageRes: "2048 x 2048 (合格 1080P)",
    qcStatus: "審核通過",
    qcReviewer: "admin_art_staff",
    qcNote: "高解析度向量圖，色彩分層乾淨。",
    qcDate: "2026-09-23 15:20:00",
    prodStatus: "待印製",
    paymentStatus: "未收款",
    deliveryStatus: "待配送",
    isPrintedSlip: false,
    printedSlipAt: "",
    createdAt: "2026-09-23 14:00:00",
    daysSinceReview: 3
  },
  {
    id: "ZG2026-0003-PSP",
    parentOrderId: "ZG2026-0003",
    slipNo: "000004",
    studentId: "111889",
    className: "廣設科三2",
    seatNo: "12",
    name: "張立誠",
    gender: "男",
    phone: "0922334455",
    productId: "prod_passport",
    productCode: "PSP",
    productName: "尊榮客製化皮革護照套",
    quantity: 1,
    unitPrice: 180,
    totalPrice: 180,
    notes: "右下角請壓印金文字樣【ZKVS 2026】",
    imageUrl: "assets/images/passport.jpg",
    imageRes: "1920 x 1400 (合格 1080P)",
    qcStatus: "審核通過",
    qcReviewer: "admin_art_core",
    qcNote: "燙金排版尺寸符合鋼模尺寸規格。",
    qcDate: "2026-09-24 11:00:00",
    prodStatus: "待印製",
    paymentStatus: "未收款",
    deliveryStatus: "待配送",
    isPrintedSlip: false,
    printedSlipAt: "",
    createdAt: "2026-09-24 10:10:00",
    daysSinceReview: 2
  },
  {
    id: "ZG2026-0004-CRD",
    parentOrderId: "ZG2026-0004",
    slipNo: "000005",
    studentId: "112999",
    className: "電子科二1",
    seatNo: "8",
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
    isPrintedSlip: false,
    printedSlipAt: "",
    createdAt: "2026-09-22 11:00:00",
    daysSinceReview: 4
  }
];

// 預設已註冊示範學生名冊 (包含班級座號唯一性初始資料)
const INITIAL_STUDENTS = [
  { studentId: "112345", className: "資處科三1", seatNo: "18", name: "陳冠宇", gender: "男", phone: "0912345678", registeredAt: "2026-09-24 09:00:00" },
  { studentId: "112412", className: "廣設科三1", seatNo: "5", name: "林詩婷", gender: "女", phone: "0987654321", registeredAt: "2026-09-23 13:45:00" },
  { studentId: "111889", className: "廣設科三2", seatNo: "12", name: "張立誠", gender: "男", phone: "0922334455", registeredAt: "2026-09-24 10:00:00" },
  { studentId: "112999", className: "電子科二1", seatNo: "8", name: "張志偉", gender: "男", phone: "0933112233", registeredAt: "2026-09-22 10:30:00" }
];

// 4. 資料庫封裝層 (LocalStorage + 正規化持久化管理)
class ZgDataManager {
  static KEY_ORDERS = "zg_orders_db_v2";
  static KEY_USER = "zg_current_user_v2";
  static KEY_ADMIN = "zg_current_admin_v2";
  static KEY_LOGS = "zg_audit_logs_v2";
  static KEY_SLIP_COUNTER = "zg_slip_counter_v2";
  static KEY_PRODUCTS = "zg_products_db_v2";
  static KEY_STUDENTS = "zg_registered_students_v2";
  static KEY_RBAC_PASSWORDS = "zg_rbac_auth_passwords_v2";

  static init() {
    // 訂單初始化
    if (!localStorage.getItem(this.KEY_ORDERS)) {
      localStorage.setItem(this.KEY_ORDERS, JSON.stringify(INITIAL_ORDERS));
    }
    // 流水號計數器
    if (!localStorage.getItem(this.KEY_SLIP_COUNTER)) {
      localStorage.setItem(this.KEY_SLIP_COUNTER, "000006");
    }
    // 商品庫存資料庫初始化
    if (!localStorage.getItem(this.KEY_PRODUCTS)) {
      localStorage.setItem(this.KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    // 學生資料庫初始化
    if (!localStorage.getItem(this.KEY_STUDENTS)) {
      localStorage.setItem(this.KEY_STUDENTS, JSON.stringify(INITIAL_STUDENTS));
    }
    // RBAC 職位驗證碼資料庫初始化
    if (!localStorage.getItem(this.KEY_RBAC_PASSWORDS)) {
      const passMap = {};
      RBAC_ACCOUNTS.forEach(acc => {
        passMap[acc.username] = acc.password;
      });
      localStorage.setItem(this.KEY_RBAC_PASSWORDS, JSON.stringify(passMap));
    }

    // 啟動伺服器同步機制
    this.syncWithServer();

    if (typeof window !== "undefined" && !window._zg_server_sync_initialized) {
      window._zg_server_sync_initialized = true;
      // 每 3.5 秒自動輪詢與聚焦時同步
      setInterval(() => ZgDataManager.syncWithServer(), 3500);
      window.addEventListener("focus", () => ZgDataManager.syncWithServer());
    }
  }

  // ==========================================
  // 跨裝置中央伺服器同步引擎 (Cross-Device Sync Engine)
  // ==========================================
  static async syncWithServer() {
    try {
      const res = await fetch("/api/db", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && data.db) {
        const db = data.db;
        let changed = false;

        if (Array.isArray(db.students)) {
          const oldStr = localStorage.getItem(this.KEY_STUDENTS);
          const newStr = JSON.stringify(db.students);
          if (oldStr !== newStr) {
            localStorage.setItem(this.KEY_STUDENTS, newStr);
            changed = true;
          }
        }
        if (Array.isArray(db.orders)) {
          const oldStr = localStorage.getItem(this.KEY_ORDERS);
          const newStr = JSON.stringify(db.orders);
          if (oldStr !== newStr) {
            localStorage.setItem(this.KEY_ORDERS, newStr);
            changed = true;
          }
        }
        if (Array.isArray(db.products)) {
          localStorage.setItem(this.KEY_PRODUCTS, JSON.stringify(db.products));
        }
        if (db.slipCounter) {
          localStorage.setItem(this.KEY_SLIP_COUNTER, String(db.slipCounter));
        }
        if (Array.isArray(db.logs)) {
          localStorage.setItem(this.KEY_LOGS, JSON.stringify(db.logs));
        }
        if (db.adminAuth) {
          localStorage.setItem(this.KEY_RBAC_PASSWORDS, JSON.stringify(db.adminAuth));
        }

        if (changed) {
          if (typeof window.refreshAdminViews === "function") window.refreshAdminViews();
          if (typeof window.refreshStoreViews === "function") window.refreshStoreViews();
        }
      }
    } catch (err) {
      // 離線狀態靜默保持 LocalStorage
    }
  }

  static async postToServer(endpoint, payload) {
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn("Server sync fallback:", err);
    }
  }

  // ==========================================
  // 商品管理 CRUD & 庫存狀態切換 (前台即時聯動)
  // ==========================================
  static getProducts() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.KEY_PRODUCTS)) || INITIAL_PRODUCTS;
    } catch (e) {
      return INITIAL_PRODUCTS;
    }
  }

  static saveProducts(prods) {
    localStorage.setItem(this.KEY_PRODUCTS, JSON.stringify(prods));
  }

  static getProductById(id) {
    const prods = this.getProducts();
    return prods.find(p => p.id === id);
  }

  static addProduct(newProd) {
    const prods = this.getProducts();
    prods.push(newProd);
    this.saveProducts(prods);
    this.addLog(`【商品管理】新增商品品項 [${newProd.name} (${newProd.code})]，定價 NT$ ${newProd.price}。`);
    return newProd;
  }

  static updateProduct(id, updateFields) {
    const prods = this.getProducts();
    const idx = prods.findIndex(p => p.id === id);
    if (idx !== -1) {
      prods[idx] = { ...prods[idx], ...updateFields };
      this.saveProducts(prods);
      this.addLog(`【商品管理】更新商品 [${prods[idx].name}] 資訊/庫存狀態。`);
      return prods[idx];
    }
    return null;
  }

  static deleteProduct(id) {
    let prods = this.getProducts();
    const p = prods.find(x => x.id === id);
    if (!p) return false;
    prods = prods.filter(x => x.id !== id);
    this.saveProducts(prods);
    this.addLog(`【商品管理】刪除/下架商品 [${p.name} (${p.code})]。`);
    return true;
  }

  static setProductStockStatus(id, newStatus) {
    return this.updateProduct(id, { stockStatus: newStatus });
  }

  // ==========================================
  // 學生會員註冊與登入管理 (嚴格班級座號唯一性)
  // ==========================================
  static getRegisteredStudents() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.KEY_STUDENTS)) || INITIAL_STUDENTS;
    } catch (e) {
      return INITIAL_STUDENTS;
    }
  }

  static saveRegisteredStudents(students) {
    localStorage.setItem(this.KEY_STUDENTS, JSON.stringify(students));
  }

  /**
   * 註冊學生帳號 (嚴格執行：同班級每座號唯一性 + 學號主鍵防重複)
   */
  static registerStudent(profile) {
    const students = this.getRegisteredStudents();
    const studentId = profile.studentId.trim();
    const className = profile.className.trim();
    const seatNo = String(parseInt(profile.seatNo, 10)).padStart(2, "0");

    // 1. 檢查學號是否已註冊過
    const existById = students.find(s => s.studentId === studentId);
    if (existById) {
      return {
        success: false,
        message: `學號【${studentId}】已經完成過註冊！請直接切換至【登入】。`
      };
    }

    // 2. 核心規範：同一個班級只會有一個座號，防撞號
    const existBySeat = students.find(s => 
      s.className.toLowerCase() === className.toLowerCase() && 
      String(parseInt(s.seatNo, 10)).padStart(2, "0") === seatNo
    );
    if (existBySeat) {
      return {
        success: false,
        message: `【座號已被註冊】「${className}」已有 ${parseInt(seatNo, 10)} 號學生（${existBySeat.name}）完成註冊！同一個班級每個座號僅限 1 位學生使用，請確認您的班級與座號是否填寫正確。`
      };
    }

    // 3. 通過驗證，寫入資料庫
    const newStudent = {
      studentId: studentId,
      className: className,
      seatNo: seatNo,
      name: profile.name.trim(),
      gender: profile.gender || "未指定",
      phone: profile.phone.trim(),
      registeredAt: new Date().toLocaleString("zh-TW", { hour12: false })
    };

    students.push(newStudent);
    this.saveRegisteredStudents(students);
    localStorage.setItem(this.KEY_USER, JSON.stringify(newStudent));
    this.addLog(`【學生註冊】學生 [${newStudent.name} (${newStudent.className} ${parseInt(newStudent.seatNo, 10)}號 - ${newStudent.studentId})] 註冊成功。`);

    return {
      success: true,
      student: newStudent
    };
  }

  /**
   * 結帳雙重確認或個資更新時專用：確保同班級座號唯一，並無縫綁定/更新資料庫
   */
  static upsertStudent(profile) {
    const students = this.getRegisteredStudents();
    const studentId = (profile.studentId || "").trim();
    const className = (profile.className || "").trim();
    const seatNo = String(parseInt(profile.seatNo, 10)).padStart(2, "0");
    const name = (profile.name || "").trim();
    const phone = (profile.phone || "").trim();
    const gender = profile.gender || "男";

    if (!studentId || !className || !seatNo || !name || !phone) {
      return { success: false, message: "學生個資 6 項核心欄位（學號、姓名、班級、座號、性別、電話）皆為必填！" };
    }

    // 嚴格規範：同一個班級只能有一個特定座號，不可被其他學號盜用
    const conflict = students.find(s =>
      s.studentId !== studentId &&
      s.className.toLowerCase() === className.toLowerCase() &&
      String(parseInt(s.seatNo, 10)).padStart(2, "0") === seatNo
    );

    if (conflict) {
      return {
        success: false,
        message: `【座號已被佔用】「${className}」已有 ${parseInt(seatNo, 10)} 號學生（${conflict.name}，學號 ${conflict.studentId}）完成註冊！同一個班級每個座號僅限 1 位學生使用，請確認您的班級與座號。`
      };
    }

    const idx = students.findIndex(s => s.studentId === studentId);
    let finalStudent;
    if (idx !== -1) {
      students[idx] = {
        ...students[idx],
        className,
        seatNo,
        name,
        gender,
        phone,
        updatedAt: new Date().toLocaleString("zh-TW", { hour12: false })
      };
      finalStudent = students[idx];
    } else {
      finalStudent = {
        studentId,
        className,
        seatNo,
        name,
        gender,
        phone,
        registeredAt: new Date().toLocaleString("zh-TW", { hour12: false })
      };
      students.push(finalStudent);
    }

    this.saveRegisteredStudents(students);
    localStorage.setItem(this.KEY_USER, JSON.stringify(finalStudent));
    this.addLog(`【個資綁定】學生 [${finalStudent.name} (${finalStudent.className} ${parseInt(finalStudent.seatNo, 10)}號 - ${finalStudent.studentId})] 完成個資驗證與更新。`);
    this.postToServer("/api/students/upsert", finalStudent);
    return { success: true, student: finalStudent };
  }

  /**
   * 學生學號快速登入 (首次註冊後，以後一律由此直接登入)
   */
  static loginStudent(studentId) {
    const cleanId = (studentId || "").trim();
    const students = this.getRegisteredStudents();
    const student = students.find(s => s.studentId === cleanId);

    if (!student) {
      return {
        success: false,
        message: `查無學號【${cleanId}】的註冊資料！請先切換至【會員註冊】填寫基本資料。`
      };
    }

    localStorage.setItem(this.KEY_USER, JSON.stringify(student));
    this.addLog(`【學生登入】學生 [${student.name} (${student.studentId})] 登入系統。`);
    return {
      success: true,
      student: student
    };
  }

  static getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY_USER));
    } catch (e) {
      return null;
    }
  }

  static logoutUser() {
    localStorage.removeItem(this.KEY_USER);
  }

  static saveCurrentUser(student) {
    localStorage.setItem(this.KEY_USER, JSON.stringify(student));
  }

  static clearCurrentUser() {
    this.logoutUser();
  }

  static getStudents() {
    return this.getRegisteredStudents();
  }

  static saveStudents(list) {
    this.saveRegisteredStudents(list);
  }

  static syncStudentToServer(student) {
    this.postToServer("/api/students/upsert", student);
  }

  // ==========================================
  // RBAC 後台職位「驗證碼」持久化安全管理
  // ==========================================
  static getAdminAuthCodes() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.KEY_RBAC_PASSWORDS)) || {};
    } catch (e) {
      return {};
    }
  }

  static saveAdminAuthCodes(codeMap) {
    localStorage.setItem(this.KEY_RBAC_PASSWORDS, JSON.stringify(codeMap));
  }

  static verifyAdminAuth(username, verifyCode) {
    const codes = this.getAdminAuthCodes();
    const expected = codes[username];
    if (!expected) return false;
    return (verifyCode || "").trim() === expected.trim();
  }

  static updateAdminAuthCode(username, newCode) {
    const codes = this.getAdminAuthCodes();
    codes[username] = (newCode || "").trim();
    this.saveAdminAuthCodes(codes);
    this.addLog(`【資安異動】管理員已更新職位 [${username}] 的登入驗證碼。`);
    return true;
  }

  // ==========================================
  // 訂單拆單、查詢、狀態更新
  // ==========================================
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
    let cur = parseInt(localStorage.getItem(this.KEY_SLIP_COUNTER) || "6", 10);
    let str = String(cur).padStart(6, "0");
    localStorage.setItem(this.KEY_SLIP_COUNTER, String(cur + 1));
    return str;
  }

  static splitAndCreateOrders(cartItems, studentProfile) {
    const parentOrderId = "ZG2026-" + Math.floor(1000 + Math.random() * 9000);
    const orders = this.getOrders();
    const createdOrders = [];
    const nowStr = getTaiwanNowString();

    cartItems.forEach((item) => {
      const prod = this.getProductById(item.productId);
      const childSlipNo = this.getNextSlipNo();
      const childOrderId = `${parentOrderId}-${prod ? prod.code : "ITEM"}`;

      const newOrder = {
        id: childOrderId,
        parentOrderId: parentOrderId,
        slipNo: childSlipNo,
        studentId: studentProfile.studentId.trim(),
        className: studentProfile.className.trim(),
        seatNo: String(parseInt(studentProfile.seatNo, 10)),
        name: studentProfile.name.trim(),
        gender: studentProfile.gender || "未指定",
        phone: studentProfile.phone.trim(),
        productId: item.productId,
        productCode: prod ? prod.code : "ITEM",
        productName: prod ? prod.name : item.name,
        quantity: item.quantity,
        unitPrice: prod ? prod.price : item.price,
        totalPrice: (prod ? prod.price : item.price) * item.quantity,
        notes: item.notes || "無特別備註",
        imageUrl: item.imageUrl || (prod ? prod.image : "assets/images/mug.jpg"),
        imageRes: item.imageRes || "1920 x 1080 (1080P)",
        qcStatus: "待審核",
        qcReviewer: "",
        qcNote: "",
        qcDate: "",
        prodStatus: "待印製",
        paymentStatus: "未收款",
        deliveryStatus: "待配送",
        isPrintedSlip: false,
        printedSlipAt: "",
        createdAt: nowStr,
        daysSinceReview: 0
      };

      orders.unshift(newOrder);
      createdOrders.push(newOrder);
    });

    this.saveOrders(orders);
    this.addLog(`學生 [${studentProfile.name} (${studentProfile.studentId})] 建立訂單，拆單產生 ${createdOrders.length} 張工單。`);
    
    // 即時推送到伺服器
    this.postToServer("/api/sync", {
      orders: orders,
      slipCounter: parseInt(localStorage.getItem(this.KEY_SLIP_COUNTER) || "6", 10),
      logs: this.getLogs()
    });

    return { parentOrderId, createdOrders };
  }

  static updateOrder(orderId, updateFields) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx] = { ...orders[idx], ...updateFields };
      this.saveOrders(orders);
      
      // 即時同步至伺服器
      this.postToServer("/api/orders/update", {
        orderId: orderId,
        updates: updateFields
      });

      return orders[idx];
    }
    return null;
  }

  static clearMockOrders() {
    const mockIds = ["ZG2026-0001-MUG", "ZG2026-0001-BDG", "ZG2026-0002-CST", "ZG2026-0003-PSP", "ZG2026-0004-CRD"];
    const currentOrders = this.getOrders();
    const realOrders = currentOrders.filter(o => !mockIds.includes(o.id));
    this.saveOrders(realOrders);
    this.addLog(`【資料庫維護】已清空 5 筆預設示範訂單，保留 ${realOrders.length} 筆真實客戶訂單。`);
    return realOrders;
  }

  static resetDemoOrders() {
    this.saveOrders(INITIAL_ORDERS);
    this.addLog("【資料庫維護】已恢復系統預設示範訂單資料庫。");
    return INITIAL_ORDERS;
  }

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
