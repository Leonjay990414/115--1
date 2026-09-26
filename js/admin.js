/**
 * 智光商工 115學年度 第62屆校慶園遊會 - 後台管理與產線審核系統 (Hidden RBAC System)
 * 涵蓋：15人獨立帳號 RBAC 矩陣、美術組圖檔 QC 審核、A4 雙聯單列印、Excel HYPERLINK 總表匯出、第4天退件通知單、14天個資銷毀
 */

let currentAdmin = null;
let currentTab = "dashboard";
let inspectingOrder = null;

document.addEventListener("DOMContentLoaded", () => {
  checkAdminSession();
  setupAdminEventListeners();
});

// 1. 後台登入與 Session 控管
function checkAdminSession() {
  try {
    const saved = sessionStorage.getItem("zg_current_admin_v1");
    if (saved) {
      currentAdmin = JSON.parse(saved);
      showDashboardView();
      return;
    }
  } catch (e) {
    currentAdmin = null;
  }
  showLoginView();
}

function showLoginView() {
  document.getElementById("admin-login-screen").style.display = "flex";
  document.getElementById("admin-main-app").style.display = "none";
}

function showDashboardView() {
  document.getElementById("admin-login-screen").style.display = "none";
  document.getElementById("admin-main-app").style.display = "block";

  // 更新當前使用者資訊與角色權限標籤
  document.getElementById("admin-user-name").textContent = currentAdmin.roleName;
  document.getElementById("admin-role-badge").textContent = currentAdmin.roleLevel;
  document.getElementById("admin-dept-tag").textContent = currentAdmin.dept;

  // 根據角色權限顯示/隱藏功能標籤頁
  applyRBACNavRules();

  // 預設切換至首選標籤
  switchTab(currentTab || "dashboard");

  // 啟動 14 天個資銷毀倒數計時器
  initDestructionCountdown();
}

function handleAdminLogin(username, password) {
  const account = RBAC_ACCOUNTS.find(a => a.username === username && a.password === password);
  if (!account) {
    showAdminToast("帳號或密碼錯誤！請核對 15 人帳號權限矩陣清單。", "error");
    return;
  }

  currentAdmin = account;
  sessionStorage.setItem("zg_current_admin_v1", JSON.stringify(currentAdmin));
  ZgDataManager.addLog(`【管理員登入】${account.roleName} (${account.username}) 成功登入系統。`);
  showAdminToast(`登入成功！歡迎 ${account.roleName}`, "success");
  showDashboardView();
}

function handleAdminLogout() {
  if (currentAdmin) {
    ZgDataManager.addLog(`【管理員登出】${currentAdmin.roleName} 登出系統。`);
  }
  sessionStorage.removeItem("zg_current_admin_v1");
  currentAdmin = null;
  showAdminToast("您已安全登出後台管理系統。", "success");
  showLoginView();
}

// 快速角色切換 (評審與展示必備工具)
function quickSwitchRole(username) {
  const account = RBAC_ACCOUNTS.find(a => a.username === username);
  if (account) {
    currentAdmin = account;
    sessionStorage.setItem("zg_current_admin_v1", JSON.stringify(currentAdmin));
    ZgDataManager.addLog(`【快速角色切換】切換至 ${account.roleName}`);
    showAdminToast(`已無縫切換權限角色為：${account.roleName} (${account.roleLevel})`, "success");
    showDashboardView();
  }
}

// 2. RBAC 介面權限遮罩與過濾引擎
function applyRBACNavRules() {
  const perms = currentAdmin.permissions || [];
  const isSuper = perms.includes("all");

  const tabConfigs = [
    { id: "tab-btn-dashboard", key: "dashboard" },
    { id: "tab-btn-qc", key: "qc" },
    { id: "tab-btn-production", key: "production" },
    { id: "tab-btn-finance", key: "finance" },
    { id: "tab-btn-delivery", key: "delivery" },
    { id: "tab-btn-security", key: "wipe" }
  ];

  tabConfigs.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    if (isSuper || perms.includes(cfg.key)) {
      el.style.display = "flex";
    } else {
      el.style.display = "none";
    }
  });

  // 個資匯出按鈕遮罩 (無權下載者隱藏)
  const exportBtn = document.getElementById("btn-export-excel");
  if (exportBtn) {
    exportBtn.style.display = currentAdmin.canExportExcel ? "inline-flex" : "none";
  }

  // 雙聯單列印按鈕遮罩
  const printA4Btn = document.getElementById("btn-batch-print-a4");
  if (printA4Btn) {
    printA4Btn.style.display = currentAdmin.canPrintA4 ? "inline-flex" : "none";
  }
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll(".admin-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".admin-tab-content").forEach(content => {
    content.classList.toggle("active", content.id === `view-${tabName}`);
  });

  // 重新渲染該頁面
  if (tabName === "dashboard") renderDashboardView();
  else if (tabName === "qc") renderQCView();
  else if (tabName === "production") renderProductionView();
  else if (tabName === "finance") renderFinanceView();
  else if (tabName === "delivery") renderDeliveryView();
  else if (tabName === "security") renderSecurityView();
}

// 3. 儀表板視圖 (營收與進度統計)
function renderDashboardView() {
  const orders = ZgDataManager.getOrders();
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === "已收款" ? o.totalPrice : 0), 0);
  const pendingRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === "未收款" ? o.totalPrice : 0), 0);
  const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);

  const qcPending = orders.filter(o => o.qcStatus === "待審核").length;
  const qcApproved = orders.filter(o => o.qcStatus === "審核通過").length;
  const qcRejected = orders.filter(o => o.qcStatus === "退件").length;

  document.getElementById("stat-total-revenue").textContent = `NT$ ${totalRevenue}`;
  document.getElementById("stat-pending-revenue").textContent = `NT$ ${pendingRevenue}`;
  document.getElementById("stat-total-items").textContent = `${totalItems} 件`;
  document.getElementById("stat-qc-pending").textContent = `${qcPending} 筆`;
  document.getElementById("stat-qc-approved").textContent = `${qcApproved} 筆`;
  document.getElementById("stat-qc-rejected").textContent = `${qcRejected} 筆`;

  // 渲染近期訂單簡表 (個資脫敏處理)
  const tbody = document.getElementById("dashboard-orders-tbody");
  tbody.innerHTML = orders.slice(0, 10).map(rawOrder => {
    const order = currentAdmin.canViewFullPII ? rawOrder : ZgDataManager.maskStudentData(rawOrder);
    return `
      <tr>
        <td style="font-family:monospace;font-weight:700;color:var(--gold-glow);">${order.id}</td>
        <td>NO.${order.slipNo}</td>
        <td>${order.className} ${order.seatNo}號 ${order.name}</td>
        <td>${order.productName} × ${order.quantity}</td>
        <td style="color:var(--gold-glow);font-weight:700;">NT$ ${order.totalPrice}</td>
        <td>${getQCBadgeHtml(order.qcStatus)}</td>
        <td>${getProdBadgeHtml(order.prodStatus)}</td>
        <td>${getPaymentBadgeHtml(order.paymentStatus)}</td>
      </tr>
    `;
  }).join("");
}

// 4. 美術視覺組：強制圖檔 QC 審核工作台
function renderQCView() {
  const orders = ZgDataManager.getOrders();
  const filter = document.getElementById("qc-status-filter")?.value || "all";
  
  const filtered = orders.filter(o => filter === "all" ? true : o.qcStatus === filter);
  const tbody = document.getElementById("qc-orders-tbody");

  tbody.innerHTML = filtered.map(order => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:var(--gold-glow);">${order.id}</td>
      <td>
        <img src="${order.imageUrl}" class="table-img-thumb" onclick="openQCInspectModal('${order.id}')" title="點擊檢視原圖">
      </td>
      <td>
        <div style="font-weight:700;color:#fff;">${order.productName}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${order.imageRes}</div>
      </td>
      <td>
        <span class="single-line" style="max-width:220px;" title="${order.notes}">${order.notes}</span>
      </td>
      <td>${getQCBadgeHtml(order.qcStatus)}</td>
      <td style="font-size:0.8rem;color:var(--text-secondary);">${order.qcNote || "—"}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openQCInspectModal('${order.id}')">
          <span>檢查審核</span>
        </button>
      </td>
    </tr>
  `).join("");
}

function openQCInspectModal(orderId) {
  const order = ZgDataManager.getOrders().find(o => o.id === orderId);
  if (!order) return;
  inspectingOrder = order;

  document.getElementById("qc-inspect-order-id").textContent = order.id;
  document.getElementById("qc-inspect-prod-name").textContent = `${order.productName} (${order.quantity}件)`;
  document.getElementById("qc-inspect-student").textContent = `${order.className} ${order.seatNo}號 ${order.name} (${order.studentId})`;
  document.getElementById("qc-inspect-notes").textContent = order.notes;
  document.getElementById("qc-inspect-res").textContent = order.imageRes;
  document.getElementById("qc-inspect-img").src = order.imageUrl;
  document.getElementById("qc-inspect-note-input").value = order.qcNote || "";

  // 外部連結開原圖按鈕
  document.getElementById("qc-open-original-tab").href = order.imageUrl;

  const modal = document.getElementById("modal-qc-inspect");
  modal.classList.add("active");
}

function submitQCDecision(decision) {
  if (!inspectingOrder) return;
  const note = document.getElementById("qc-inspect-note-input").value.trim();
  const reviewer = currentAdmin ? currentAdmin.username : "admin_art_core";

  if (decision === "退件" && !note) {
    return showAdminToast("退件時必須填寫具體原因（如：解析度不足 1080P、嚴重偏色等），以便學生重傳！", "error");
  }

  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

  ZgDataManager.updateOrder(inspectingOrder.id, {
    qcStatus: decision,
    qcReviewer: reviewer,
    qcNote: note || (decision === "審核通過" ? "解析度符合 1080P/300DPI 轉印標準，准予生產。" : "圖檔未達標準退件"),
    qcDate: nowStr,
    daysSinceReview: 0
  });

  ZgDataManager.addLog(`【美術組審核】訂單 [${inspectingOrder.id}] 審核結果為 [${decision}]，審核人：${reviewer}。`);
  showAdminToast(`訂單 ${inspectingOrder.id} 已完成審核：【${decision}】！`, decision === "審核通過" ? "success" : "warning");

  closeAdminModal(document.getElementById("modal-qc-inspect"));
  renderQCView();
  renderDashboardView();
}

// 5. 商品製作組：產線工作清單與圖檔直達對接
function renderProductionView() {
  const orders = ZgDataManager.getOrders();
  const filterCat = document.getElementById("prod-filter-cat")?.value || "all";
  
  const filtered = orders.filter(o => {
    if (filterCat === "all") return true;
    return o.productCode === filterCat;
  });

  const container = document.getElementById("production-board-cards");
  container.innerHTML = filtered.map(order => `
    <div class="prod-card" style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;display:flex;gap:16px;">
      <a href="${order.imageUrl}" target="_blank" title="點擊在瀏覽器開啟原圖列印" style="flex-shrink:0;">
        <img src="${order.imageUrl}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;border:1px solid var(--gold-primary);">
      </a>
      <div style="flex-grow:1;overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:var(--gold-glow);">${order.id} (NO.${order.slipNo})</strong>
          ${getProdBadgeHtml(order.prodStatus)}
        </div>
        <div style="font-weight:700;color:#fff;margin-top:4px;">${order.productName} × ${order.quantity} 件</div>
        <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">班級：${order.className} ${order.seatNo}號 | 規格：${order.imageRes}</div>
        <div class="single-line" style="font-size:0.75rem;color:var(--cyan-accent);margin-top:4px;" title="備註：${order.notes}">客製要求：${order.notes}</div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
          <a href="${order.imageUrl}" download="${order.id}_artwork.png" class="btn btn-secondary btn-sm" target="_blank">
            <span>📥 開啟原圖 / 下載</span>
          </a>
          <select class="form-select" style="padding:4px 8px;font-size:0.8rem;" onchange="updateProdProgress('${order.id}', this.value)">
            <option value="待印製" ${order.prodStatus === "待印製" ? "selected" : ""}>待印製</option>
            <option value="轉印中" ${order.prodStatus === "轉印中" ? "selected" : ""}>轉印中</option>
            <option value="已完成" ${order.prodStatus === "已完成" ? "selected" : ""}>已完成</option>
          </select>
        </div>
      </div>
    </div>
  `).join("");
}

function updateProdProgress(orderId, newStatus) {
  ZgDataManager.updateOrder(orderId, { prodStatus: newStatus });
  ZgDataManager.addLog(`【產線更新】工單 [${orderId}] 製作狀態更新為 [${newStatus}]。`);
  showAdminToast(`工單 ${orderId} 狀態已變更為【${newStatus}】`, "success");
  renderProductionView();
}

// 6. 財務組：帳務管理、Excel =HYPERLINK() 匯出與 A4 雙聯單一鍵套印
function renderFinanceView() {
  const orders = ZgDataManager.getOrders();
  const tbody = document.getElementById("finance-orders-tbody");

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:var(--gold-glow);">${order.id}</td>
      <td>NO.${order.slipNo}</td>
      <td>${order.studentId}</td>
      <td>${order.className} ${order.seatNo}號 ${order.name}</td>
      <td>${order.productName} × ${order.quantity}</td>
      <td style="font-weight:800;color:var(--gold-glow);">NT$ ${order.totalPrice}</td>
      <td>
        <button class="btn btn-sm ${order.paymentStatus === "已收款" ? "btn-cyan" : "btn-secondary"}" onclick="togglePaymentStatus('${order.id}')">
          <span>${order.paymentStatus}</span>
        </button>
      </td>
      <td>
        ${order.qcStatus === "審核通過" ? 
          `<button class="btn btn-secondary btn-sm" onclick="printSingleOrderA4('${order.id}')">🖨️ 印雙聯單</button>` : 
          `<span style="font-size:0.75rem;color:var(--text-muted);">需審核通過方可列印</span>`
        }
      </td>
    </tr>
  `).join("");
}

function togglePaymentStatus(orderId) {
  const orders = ZgDataManager.getOrders();
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  const newStatus = o.paymentStatus === "已收款" ? "未收款" : "已收款";
  ZgDataManager.updateOrder(orderId, { paymentStatus: newStatus });
  ZgDataManager.addLog(`【財務更新】訂單 [${orderId}] 款項狀態變更為 [${newStatus}]。`);
  showAdminToast(`訂單 ${orderId} 收款狀態已切換為【${newStatus}】`, "success");
  renderFinanceView();
  renderDashboardView();
}

/**
 * 規格書第四區塊核心：Excel 總表匯出功能 (嵌入 =HYPERLINK() 函數)
 */
function exportOrdersToExcel() {
  if (!window.XLSX) {
    return showAdminToast("SheetJS 匯出庫載入中，請稍候再試！", "error");
  }

  const orders = ZgDataManager.getOrders();
  if (orders.length === 0) {
    return showAdminToast("目前沒有可供匯出的訂單資料！", "warning");
  }

  // 構建結構化表頭與列資料
  const rows = [];
  rows.push([
    "訂單編號", "雙聯單流水號", "學生學號", "班級", "座號", "姓名", "性別", "聯絡電話",
    "商品編號", "商品品項", "訂購數量", "單價", "總金額", "客製要求與備註",
    "圖檔連結 (點擊開啟)", "圖檔規格", "審核狀態", "審核人員", "審核備註", "製作進度", "收款狀態", "下單時間"
  ]);

  orders.forEach(o => {
    // 取得絕對圖檔網址 (若在本地則生成完整路徑)
    const fullImgUrl = o.imageUrl.startsWith("http") ? o.imageUrl : window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/") + o.imageUrl;
    
    // 嚴格依照規格書第4區塊第3條：寫入 =HYPERLINK() 公式
    const hyperlinkFormula = `=HYPERLINK("${fullImgUrl}", "點此檢視原圖")`;

    rows.push([
      o.id,
      o.slipNo,
      o.studentId,
      o.className,
      o.seatNo,
      o.name,
      o.gender,
      o.phone,
      o.productCode,
      o.productName,
      o.quantity,
      o.unitPrice,
      o.totalPrice,
      o.notes,
      hyperlinkFormula,
      o.imageRes,
      o.qcStatus,
      o.qcReviewer || "無",
      o.qcNote || "無",
      o.prodStatus,
      o.paymentStatus,
      o.createdAt
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 設定欄位寬度
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 6 }, { wch: 14 },
    { wch: 10 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 30 },
    { wch: 24 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "訂單總表與圖檔超連結");

  const fileName = `智光商工115校慶園遊會_客製商品訂單總表_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fileName);

  ZgDataManager.addLog(`【報表匯出】財務組/管理員匯出訂單 Excel 總表 (${fileName})，包含 =HYPERLINK 圖檔連結。`);
  showAdminToast("Excel 報表匯出成功！圖檔連結欄位已具備超連結公式。", "success");
}

/**
 * 規格書第四區塊核心：自動排版 A4 雙聯確認單套印程式
 */
function printSingleOrderA4(orderId) {
  const order = ZgDataManager.getOrders().find(o => o.id === orderId);
  if (!order) return;
  batchPrintA4([order]);
}

function batchPrintApprovedA4() {
  const approvedOrders = ZgDataManager.getOrders().filter(o => o.qcStatus === "審核通過");
  if (approvedOrders.length === 0) {
    return showAdminToast("目前沒有【審核通過】的訂單可供列印！", "warning");
  }
  batchPrintA4(approvedOrders);
}

function batchPrintA4(ordersList) {
  const container = document.getElementById("print-double-slip-container");
  container.innerHTML = "";

  ordersList.forEach(order => {
    const pageEl = document.createElement("div");
    pageEl.className = "a4-page";
    
    // 上聯：顧客核對取貨憑證
    // 下聯：大會財務暨產線存根
    pageEl.innerHTML = `
      <!-- 上聯：顧客核對取貨憑證 -->
      <div class="slip-half">
        <div class="slip-header">
          <div class="slip-title-group">
            <h2>智光高級商工職業學校 115學年度 第62屆校慶園遊會</h2>
            <h3>資料處理科客製化商品專案【顧客核對取貨憑證】</h3>
            <span class="slip-badge-pill">★ 上聯：顧客留存（憑本單現場取件）</span>
          </div>
          <div class="slip-no-box">
            <div class="slip-serial">NO: ${order.slipNo}</div>
            <div class="slip-barcode-text">*${order.id}*</div>
          </div>
        </div>

        <table class="slip-table">
          <tr>
            <th>訂單編號</th>
            <td><strong>${order.id}</strong></td>
            <th>下單時間</th>
            <td>${order.createdAt}</td>
          </tr>
          <tr>
            <th>學生學號</th>
            <td><strong>${order.studentId}</strong></td>
            <th>班級座號</th>
            <td><strong>${order.className}</strong> (${order.seatNo} 號)</td>
          </tr>
          <tr>
            <th>訂購姓名</th>
            <td><strong>${order.name}</strong> (${order.gender})</td>
            <th>聯絡電話</th>
            <td>${order.phone}</td>
          </tr>
          <tr>
            <th>商品名稱</th>
            <td colspan="3"><strong>${order.productName}</strong></td>
          </tr>
          <tr>
            <th>訂購數量</th>
            <td>${order.quantity} 件</td>
            <th>結帳應付金額</th>
            <td><strong style="font-size:12pt;color:#b91c1c;">NT$ ${order.totalPrice}</strong> (單價: NT$ ${order.unitPrice})</td>
          </tr>
          <tr>
            <th>客製備註</th>
            <td colspan="3"><span class="slip-note-text">${order.notes}</span></td>
          </tr>
          <tr>
            <th>美術審核</th>
            <td colspan="3">審核員：${order.qcReviewer || "admin_art_core"} | 狀態：${order.qcStatus} (${order.qcDate})</td>
          </tr>
        </table>

        <div class="slip-signatures-row">
          <div class="sig-block">
            <span class="sig-label">顧客親筆核對簽名：</span>
            <div class="sig-line">（請現場核對商品無誤後簽名）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">財務收款專員簽名：</span>
            <div class="sig-line">（現金收款簽核：${order.paymentStatus}）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">大會取貨防偽章：</span>
            <div class="sig-line">（蓋章生效 / 3天內配送）</div>
          </div>
        </div>

        <div class="slip-footer-disclaimer">
          ※ 購物規範宣告：依本專案規範，客製化印製商品均經買方確認規格圖檔，印製後恕不接受退費或換貨。全程採 HTTPS 加密並於活動結案 14 天後物理銷毀個資。
        </div>
      </div>

      <!-- 撕斷線 (Tear Line) -->
      <div class="tear-line-divider">
        <span>✂ - - - - - - - - - - 請 沿 虛 線 撕 開（上聯顧客 / 下聯存根）- - - - - - - - - - ✂</span>
      </div>

      <!-- 下聯：大會財務暨產線存根 -->
      <div class="slip-half">
        <div class="slip-header">
          <div class="slip-title-group">
            <h2>智光高級商工職業學校 115學年度 第62屆校慶園遊會</h2>
            <h3>資料處理科客製化商品專案【大會財務暨產線存根】</h3>
            <span class="slip-badge-pill" style="border-color:#b91c1c;color:#b91c1c;">★ 下聯：財務出納與產線對帳存根</span>
          </div>
          <div class="slip-no-box">
            <div class="slip-serial">NO: ${order.slipNo}</div>
            <div class="slip-barcode-text">*${order.id}*</div>
          </div>
        </div>

        <table class="slip-table">
          <tr>
            <th>訂單編號</th>
            <td><strong>${order.id}</strong></td>
            <th>工單流水號</th>
            <td>NO: ${order.slipNo}</td>
          </tr>
          <tr>
            <th>學生學號</th>
            <td><strong>${order.studentId}</strong></td>
            <th>班級座號</th>
            <td><strong>${order.className}</strong> (${order.seatNo} 號)</td>
          </tr>
          <tr>
            <th>訂購姓名</th>
            <td><strong>${order.name}</strong></td>
            <th>聯絡電話</th>
            <td>${order.phone}</td>
          </tr>
          <tr>
            <th>製造品項</th>
            <td><strong>${order.productName}</strong></td>
            <th>製作數量</th>
            <td><strong>${order.quantity} 件</strong></td>
          </tr>
          <tr>
            <th>收款金額</th>
            <td><strong style="font-size:12pt;color:#b91c1c;">NT$ ${order.totalPrice}</strong></td>
            <th>金流狀態</th>
            <td>${order.paymentStatus}</td>
          </tr>
          <tr>
            <th>印刷加工要求</th>
            <td colspan="3"><span class="slip-note-text">${order.notes}</span></td>
          </tr>
          <tr>
            <th>圖檔檢驗結果</th>
            <td colspan="3">1080P/300DPI 檢驗合格 | 審核員：${order.qcReviewer || "admin_art_core"}</td>
          </tr>
        </table>

        <div class="slip-signatures-row">
          <div class="sig-block">
            <span class="sig-label">產線轉印完成人員：</span>
            <div class="sig-line">（機台加工簽核）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">外送組配送簽收：</span>
            <div class="sig-line">（送達班級確認）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">財務腰包現金核銷：</span>
            <div class="sig-line">（財務收訖覆核）</div>
          </div>
        </div>

        <div class="slip-footer-disclaimer">
          ※ 內部存根備註：本單據為專案閉幕結算營收與盤點實體耗材之法定依據，流水號連續不可跳號。結案後依規定辦理銷毀。
        </div>
      </div>
    `;

    container.appendChild(pageEl);
  });

  ZgDataManager.addLog(`【套表列印】財務組/管理員觸發一鍵列印 A4 雙聯確認單，共計 ${ordersList.length} 張。`);
  window.print();
}

// 7. 外送組：班級配送管理與「第4天圖檔退件通知單」列印
function renderDeliveryView() {
  const orders = ZgDataManager.getOrders();
  const deliveryTbody = document.getElementById("delivery-orders-tbody");
  const returnWatchlist = document.getElementById("delivery-return-watchlist");

  // 1. 班級配送清單
  deliveryTbody.innerHTML = orders.map(order => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:var(--gold-glow);">${order.id}</td>
      <td><strong>${order.className}</strong></td>
      <td>${order.seatNo} 號</td>
      <td>${order.name}</td>
      <td>${order.productName} × ${order.quantity}</td>
      <td>${getDeliveryBadgeHtml(order.deliveryStatus)}</td>
      <td>
        <select class="form-select" style="padding:4px 8px;font-size:0.8rem;" onchange="updateDeliveryStatus('${order.id}', this.value)">
          <option value="待配送" ${order.deliveryStatus === "待配送" ? "selected" : ""}>待配送</option>
          <option value="配送中" ${order.deliveryStatus === "配送中" ? "selected" : ""}>配送中</option>
          <option value="已送達班級" ${order.deliveryStatus === "已送達班級" ? "selected" : ""}>已送達班級</option>
        </select>
      </td>
    </tr>
  `).join("");

  // 2. 第 4 天退件防漏接清單 (若顧客至第4天仍未上網處理退件，外送組印出實體通知單親送班級)
  const day4RejectedOrders = orders.filter(o => o.qcStatus === "退件" && o.daysSinceReview >= 4);

  if (day4RejectedOrders.length === 0) {
    returnWatchlist.innerHTML = `
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);padding:14px;border-radius:var(--radius-md);color:var(--emerald-success);font-size:0.9rem;">
        ✓ 太棒了！目前沒有逾期超過 4 天未更換圖檔之退件訂單。
      </div>
    `;
  } else {
    returnWatchlist.innerHTML = day4RejectedOrders.map(order => `
      <div style="background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:var(--radius-md);padding:16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="color:#f87171;font-weight:800;font-size:1rem;">
            ⚠ 逾期第 ${order.daysSinceReview} 天未處理：【${order.className} ${order.seatNo}號 ${order.name} 同學】
          </div>
          <div style="font-size:0.85rem;color:#fff;margin-top:4px;">
            訂單：${order.id} (${order.productName}) | 學號：${order.studentId} | 電話：${order.phone}
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">
            退件原因：${order.qcNote}
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="printClassReturnNotice('${order.id}')">
          <span>🖨️ 列印實體退件通知單</span>
        </button>
      </div>
    `).join("");
  }
}

function updateDeliveryStatus(orderId, newStatus) {
  ZgDataManager.updateOrder(orderId, { deliveryStatus: newStatus });
  ZgDataManager.addLog(`【外送組更新】工單 [${orderId}] 配送狀態更新為 [${newStatus}]。`);
  showAdminToast(`工單 ${orderId} 配送狀態已變更為【${newStatus}】`, "success");
}

function printClassReturnNotice(orderId) {
  const order = ZgDataManager.getOrders().find(o => o.id === orderId);
  if (!order) return;

  const container = document.getElementById("print-return-notice-container");
  container.innerHTML = `
    <div class="return-notice-sheet">
      <div class="return-notice-header">
        <h1>智光高級商工職業學校 115學年度 第62屆校慶園遊會</h1>
        <p>資料處理科【客製化商品專案】圖檔退件緊急到班紙本通知單</p>
      </div>

      <div style="margin-bottom:16px;font-size:12pt;line-height:1.8;">
        <div><strong>受通知學生：</strong>${order.className} 班 ${order.seatNo} 號 【<strong>${order.name}</strong> 同學】 (學號: ${order.studentId})</div>
        <div><strong>訂單編號：</strong>${order.id} (雙聯單號: NO.${order.slipNo})</div>
        <div><strong>訂購品項：</strong>${order.productName} (${order.quantity} 件)</div>
        <div><strong>下單日期：</strong>${order.createdAt}</div>
      </div>

      <div style="background:#fee2e2;border:2px solid #ef4444;padding:12px 16px;border-radius:4px;margin-bottom:16px;color:#991b1b;font-size:11pt;line-height:1.6;">
        <strong>【美術組審查退件說明】：</strong><br>
        ${order.qcNote || "上傳圖檔畫質嚴重不足 1080P，若直接熱轉印將產生強烈鋸齒模糊。"}
      </div>

      <div style="font-size:11pt;line-height:1.8;margin-bottom:20px;">
        <p><strong>親愛的同學您好：</strong></p>
        <p>您於本屆校慶園遊會預購之客製化商品，因圖檔規格未符印刷標準已遭退件。系統偵測至今日（第 ${order.daysSinceReview} 天）尚未收到您重新上傳之 1080P 高畫質原圖。</p>
        <p>為避免影響機台印製排程與校慶當日取貨權益，<strong>外送物流組專員特別專程到班遞送本通知單</strong>，請您於 <strong>24 小時內</strong> 登入商城重新更換清晰圖片，或親洽資處科工坊辦公室由美術專員協助修圖。</p>
      </div>

      <div style="display:flex;justify-content:space-between;border-top:2px solid #000;padding-top:10px;font-size:10pt;">
        <div>外送專員簽名：____________________</div>
        <div>班級學生簽收：____________________</div>
        <div>遞送日期：${new Date().toLocaleDateString("zh-TW")}</div>
      </div>
    </div>
  `;

  ZgDataManager.addLog(`【外送專員通知】列印第4天圖檔退件實體通知單，訂單 [${order.id}] 送往 [${order.className}]。`);
  window.print();
}

// 8. 資安防護與 14 天到期全量物理銷毀引擎
function renderSecurityView() {
  const logs = ZgDataManager.getLogs();
  const logBox = document.getElementById("security-audit-logs-box");
  logBox.innerHTML = logs.map(l => `
    <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.8rem;">
      <span style="color:var(--text-muted);font-family:monospace;">[${l.time}]</span>
      <span style="color:#fff;margin-left:8px;">${l.action}</span>
    </div>
  `).join("");
}

function initDestructionCountdown() {
  const targetDate = new Date("2026-10-10T23:59:59").getTime(); // 活動結案日 14 天後
  const el = document.getElementById("destruction-countdown-timer");
  if (!el) return;

  function update() {
    const now = Date.now();
    const diff = targetDate - now;
    if (diff <= 0) {
      el.textContent = "已屆 14 天期限：個資自動銷毀程序待命中";
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    el.textContent = `${days} 天 ${hours} 小時 ${mins} 分 ${secs} 秒`;
  }
  update();
  setInterval(update, 1000);
}

function executeEmergencyDataWipe() {
  if (currentAdmin.roleLevel !== "Super Admin" && currentAdmin.roleLevel !== "Developer") {
    return showAdminToast("權限不足！僅有總召 (Super Admin) 或核心開發員具備個資銷毀指令權限。", "error");
  }

  const promptResult = confirm("【高風險警告】您即將依照資安承諾執行「14天到期個資物理全量抹除」！此動作將永遠銷毀所有學生姓名、學號、電話與訂單資料庫，不可復原。確定執行？");
  if (!promptResult) return;

  ZgDataManager.wipeDatabase();
  showAdminToast("全量個資已完成物理抹除！資料庫已回歸乾淨初始態。", "success");
  setTimeout(() => {
    location.reload();
  }, 1200);
}

// 輔助標籤 HTML 產生器
function getQCBadgeHtml(status) {
  if (status === "審核通過") return `<span class="badge-approved">✓ 審核通過</span>`;
  if (status === "退件") return `<span class="badge-rejected">✕ 退件</span>`;
  return `<span class="badge-pending">⏳ 待審核</span>`;
}

function getProdBadgeHtml(status) {
  if (status === "已完成") return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(16,185,129,0.2);color:#34d399;">✓ 已完成</span>`;
  if (status === "轉印中") return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(6,182,212,0.2);color:#22d3ee;">⚡ 轉印中</span>`;
  return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.08);color:var(--text-secondary);">待印製</span>`;
}

function getPaymentBadgeHtml(status) {
  if (status === "已收款") return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(16,185,129,0.2);color:#34d399;">已收款</span>`;
  return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,0.2);color:#f87171;">未收款</span>`;
}

function getDeliveryBadgeHtml(status) {
  if (status === "已送達班級") return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(16,185,129,0.2);color:#34d399;">已送達班級</span>`;
  if (status === "配送中") return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(245,158,11,0.2);color:var(--gold-glow);">配送中</span>`;
  return `<span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.08);color:var(--text-secondary);">待配送</span>`;
}

function showAdminToast(msg, type = "success") {
  const container = document.getElementById("admin-toast-container") || document.getElementById("toast-container");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add("toast-fadeout");
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

function closeAdminModal(m) {
  if (m) m.classList.remove("active");
}

function setupAdminEventListeners() {
  document.getElementById("form-admin-login")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("admin-login-username").value.trim();
    const p = document.getElementById("admin-login-password").value.trim();
    handleAdminLogin(u, p);
  });

  document.getElementById("btn-admin-logout")?.addEventListener("click", handleAdminLogout);

  document.querySelectorAll(".admin-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // 快捷切換角色下拉選單
  document.getElementById("quick-role-select")?.addEventListener("change", (e) => {
    if (e.target.value) quickSwitchRole(e.target.value);
  });

  // 匯出 Excel
  document.getElementById("btn-export-excel")?.addEventListener("click", exportOrdersToExcel);

  // 批次列印 A4 雙聯單
  document.getElementById("btn-batch-print-a4")?.addEventListener("click", batchPrintApprovedA4);

  // 物理銷毀資料庫
  document.getElementById("btn-emergency-wipe")?.addEventListener("click", executeEmergencyDataWipe);

  // 關閉 Modal
  document.querySelectorAll(".admin-modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
    });
  });
}
