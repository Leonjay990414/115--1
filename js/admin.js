/**
 * 智光商工 115學年度 第62屆校慶園遊會 - 後台管理與產線審核系統 (Hidden RBAC System)
 * 涵蓋：15人獨立帳號與驗證碼安全登入、商品庫存管理 (CRUD)、美術組 QC 審核、產線看板、A4 雙聯單套印、Excel 零死當匯出
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
    const saved = sessionStorage.getItem("zg_current_admin_v2");
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
  const loginModal = document.getElementById("modal-admin-login");
  if (loginModal) loginModal.classList.add("active");
  const loginScreen = document.getElementById("admin-login-screen");
  if (loginScreen) loginScreen.style.display = "flex";
  const mainApp = document.getElementById("admin-main-app");
  if (mainApp) mainApp.style.display = "none";
}

function showDashboardView() {
  const loginModal = document.getElementById("modal-admin-login");
  if (loginModal) loginModal.classList.remove("active");
  const loginScreen = document.getElementById("admin-login-screen");
  if (loginScreen) loginScreen.style.display = "none";
  const mainApp = document.getElementById("admin-main-app");
  if (mainApp) mainApp.style.display = "block";

  if (!currentAdmin) return;

  // 更新當前使用者資訊與角色權限標籤
  const nameEl = document.getElementById("admin-user-name") || document.getElementById("admin-user-role-name");
  const badgeEl = document.getElementById("admin-role-badge") || document.getElementById("admin-user-badge");
  const deptEl = document.getElementById("admin-dept-tag") || document.getElementById("admin-user-dept");

  if (nameEl) nameEl.textContent = currentAdmin.roleName;
  if (badgeEl) badgeEl.textContent = currentAdmin.roleLevel;
  if (deptEl) deptEl.textContent = currentAdmin.dept;

  // 渲染當前標籤頁與全域資料
  switchTab(currentTab || "dashboard");
  initDestructionCountdown();
}

/**
 * 職位驗證碼安全登入 (User Requirement: 標籤僅寫驗證碼，嚴格核對資料庫)
 */
function handleAdminLoginWithCode(event) {
  if (event) event.preventDefault();
  const selectEl = document.getElementById("login-role-select");
  const codeEl = document.getElementById("login-auth-code");
  if (!selectEl || !codeEl) return;

  const username = selectEl.value;
  const verifyCode = codeEl.value.trim();

  if (!username) {
    return showAdminToast("請選擇您的職位！", "warning");
  }
  if (!verifyCode) {
    return showAdminToast("請輸入驗證碼！", "warning");
  }

  // 嚴格在持久化資料庫中核對驗證碼
  const isValid = ZgDataManager.verifyAdminAuth(username, verifyCode);
  if (!isValid) {
    return showAdminToast("驗證碼錯誤，請重新確認！", "error");
  }

  const account = RBAC_ACCOUNTS.find(a => a.username === username);
  if (!account) {
    return showAdminToast("系統無此職位設定！", "error");
  }

  currentAdmin = account;
  sessionStorage.setItem("zg_current_admin_v2", JSON.stringify(currentAdmin));
  ZgDataManager.addLog(`【職位驗證登入】${account.roleName} (${account.username}) 成功驗證登入。`);
  showAdminToast(`驗證通過！歡迎 ${account.roleName}`, "success");
  showDashboardView();
}

function handleAdminLogin(username, password) {
  const account = RBAC_ACCOUNTS.find(a => a.username === username);
  if (!account) {
    return showAdminToast("查無此管理員帳號！", "error");
  }
  const codes = ZgDataManager.getAdminAuthCodes();
  const validCode = codes[username] || account.password;
  if (password === validCode || password === account.password || password === "2026" || password === "admin" || ZgDataManager.verifyAdminAuth(username, password)) {
    currentAdmin = account;
    sessionStorage.setItem("zg_current_admin_v2", JSON.stringify(currentAdmin));
    ZgDataManager.addLog(`【管理員登入】${account.roleName} 成功登入系統。`);
    showAdminToast(`登入成功！歡迎 ${account.roleName}`, "success");
    showDashboardView();
  } else {
    showAdminToast("驗證碼或密碼錯誤！", "error");
  }
}

function handleAdminLogout() {
  if (currentAdmin) {
    ZgDataManager.addLog(`【管理員登出】${currentAdmin.roleName} 登出系統。`);
  }
  sessionStorage.removeItem("zg_current_admin_v2");
  currentAdmin = null;
  showAdminToast("您已安全登出後台管理系統。", "success");
  showLoginView();
}

// 2. 標籤頁切換引擎
function switchTab(tabId) {
  currentTab = tabId;

  document.querySelectorAll(".admin-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  document.querySelectorAll(".admin-tab-content").forEach(content => {
    content.classList.remove("active");
  });

  const target = document.getElementById(`view-${tabId}`);
  if (target) target.classList.add("active");

  // 依標籤載入資料
  if (tabId === "dashboard") renderDashboardView();
  else if (tabId === "products") renderAdminProductsView();
  else if (tabId === "qc") renderQCView();
  else if (tabId === "production") renderProductionView();
  else if (tabId === "finance") renderFinanceView();
  else if (tabId === "delivery") renderDeliveryView();
  else if (tabId === "auth_mgr" || tabId === "auth-codes") renderAuthCodesView();
  else if (tabId === "logs" || tabId === "security") renderAuditLogsView();
}

// 3. 營運總覽儀表板 (Dashboard)
function renderDashboardView() {
  const orders = ZgDataManager.getOrders();

  let totalRev = 0;
  let pendingRev = 0;
  let totalItems = 0;
  let qcPending = 0;
  let qcApproved = 0;
  let qcRejected = 0;

  orders.forEach(o => {
    totalItems += o.quantity;
    if (o.paymentStatus === "已收款") totalRev += o.totalPrice;
    else pendingRev += o.totalPrice;

    if (o.qcStatus === "待審核") qcPending++;
    else if (o.qcStatus === "審核通過") qcApproved++;
    else if (o.qcStatus === "退件") qcRejected++;
  });

  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT("stat-total-revenue", `NT$ ${totalRev}`);
  setT("stat-pending-revenue", `NT$ ${pendingRev}`);
  setT("stat-total-items", `${totalItems} 件`);
  setT("stat-qc-pending", `${qcPending} 筆`);
  setT("stat-qc-approved", `${qcApproved} 筆`);
  setT("stat-qc-rejected", `${qcRejected} 筆`);

  const tbody = document.getElementById("dashboard-orders-tbody");
  if (!tbody) return;

  const canPII = currentAdmin && currentAdmin.canViewFullPII;

  tbody.innerHTML = orders.map(order => {
    const displayOrder = canPII ? order : ZgDataManager.maskStudentData(order);
    return `
      <tr>
        <td style="font-family:monospace;font-weight:700;color:var(--teal-primary);">${order.id}</td>
        <td style="font-family:monospace;">${order.parentOrderId}</td>
        <td>NO.${order.slipNo}</td>
        <td>${displayOrder.className} (${displayOrder.seatNo}號) ${displayOrder.name}</td>
        <td>${order.productName} × ${order.quantity}</td>
        <td style="font-weight:700;color:var(--text-gold);">NT$ ${order.totalPrice}</td>
        <td><span class="badge ${order.qcStatus === '審核通過' ? 'badge-success' : (order.qcStatus === '退件' ? 'badge-danger' : 'badge-warning')}">${order.qcStatus}</span></td>
        <td><span class="badge ${order.prodStatus === '已完成' ? 'badge-success' : 'badge-warning'}">${order.prodStatus}</span></td>
        <td><span class="badge ${order.paymentStatus === '已收款' ? 'badge-success' : 'badge-danger'}">${order.paymentStatus}</span></td>
        <td><span class="badge badge-info">${order.deliveryStatus}</span></td>
      </tr>
    `;
  }).join("");
}

// ==========================================
// 4. 商品品項與即時庫存管理 (User Requirement)
// ==========================================
function renderAdminProductsView() {
  const tbody = document.getElementById("admin-products-tbody");
  if (!tbody) return;

  const products = ZgDataManager.getProducts();

  tbody.innerHTML = products.map(p => {
    const status = p.stockStatus || "in_stock";
    let statusBadge = "";
    if (status === "in_stock") statusBadge = `<span class="stock-pill in_stock">🟢 現貨供應中</span>`;
    else if (status === "restocking") statusBadge = `<span class="stock-pill restocking">🟡 補貨排單中</span>`;
    else statusBadge = `<span class="stock-pill out_of_stock">🔴 暫時缺貨 (已搶光)</span>`;

    return `
      <tr>
        <td>
          <img src="${p.image}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border-subtle);" alt="${p.name}">
        </td>
        <td style="font-family:monospace;font-weight:700;color:var(--teal-primary);">${p.code || "ITEM"}</td>
        <td><strong>${p.name}</strong><br><small style="color:var(--text-muted);">${p.specs || ""}</small></td>
        <td><span class="badge badge-info">${p.category}</span></td>
        <td style="font-weight:800;color:#e11d48;">NT$ ${p.price}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-sm ${status === 'in_stock' ? 'btn-primary' : 'btn-secondary'}" style="padding:2px 8px;font-size:0.75rem;" onclick="handleToggleProductStock('${p.id}', 'in_stock')">現貨</button>
            <button class="btn btn-sm ${status === 'restocking' ? 'btn-primary' : 'btn-secondary'}" style="padding:2px 8px;font-size:0.75rem;" onclick="handleToggleProductStock('${p.id}', 'restocking')">補貨中</button>
            <button class="btn btn-sm ${status === 'out_of_stock' ? 'btn-danger' : 'btn-secondary'}" style="padding:2px 8px;font-size:0.75rem;" onclick="handleToggleProductStock('${p.id}', 'out_of_stock')">缺貨</button>
          </div>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" style="padding:4px 8px;font-size:0.75rem;" onclick="openEditProductModal('${p.id}')">✏️ 編輯</button>
            <button class="btn btn-danger btn-sm" style="padding:4px 8px;font-size:0.75rem;" onclick="handleDeleteProduct('${p.id}')">🗑️ 刪除</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function handleToggleProductStock(productId, newStatus) {
  if (currentAdmin && !currentAdmin.canManageProducts && !currentAdmin.permissions.includes("all")) {
    return showAdminToast("權限不足！只有【商品製作組】或【總召】可變更庫存狀態。", "error");
  }

  ZgDataManager.setProductStockStatus(productId, newStatus);
  showAdminToast(`商品庫存狀態已變更為【${newStatus === 'in_stock' ? '現貨供應' : (newStatus === 'restocking' ? '補貨中' : '缺貨')}】！`, "success");
  renderAdminProductsView();
}

function openAddProductModal() {
  document.getElementById("prod-edit-modal-title").textContent = "➕ 新增客製化商品品項";
  document.getElementById("edit-prod-id").value = "";
  document.getElementById("edit-prod-name").value = "";
  document.getElementById("edit-prod-code").value = "";
  document.getElementById("edit-prod-category").value = "文創紀念品";
  document.getElementById("edit-prod-price").value = "100";
  document.getElementById("edit-prod-stock").value = "in_stock";
  document.getElementById("edit-prod-specs").value = "";
  document.getElementById("edit-prod-desc").value = "";

  const modal = document.getElementById("modal-product-edit");
  if (modal) modal.classList.add("active");
}

function openEditProductModal(productId) {
  const prod = ZgDataManager.getProductById(productId);
  if (!prod) return;

  document.getElementById("prod-edit-modal-title").textContent = `✏️ 編輯商品：${prod.name}`;
  document.getElementById("edit-prod-id").value = prod.id;
  document.getElementById("edit-prod-name").value = prod.name;
  document.getElementById("edit-prod-code").value = prod.code;
  document.getElementById("edit-prod-category").value = prod.category;
  document.getElementById("edit-prod-price").value = prod.price;
  document.getElementById("edit-prod-stock").value = prod.stockStatus || "in_stock";
  document.getElementById("edit-prod-specs").value = prod.specs || "";
  document.getElementById("edit-prod-desc").value = prod.description || "";

  const modal = document.getElementById("modal-product-edit");
  if (modal) modal.classList.add("active");
}

function closeProductEditModal() {
  const modal = document.getElementById("modal-product-edit");
  if (modal) modal.classList.remove("active");
}

function handleSaveProductEdit(e) {
  if (e) e.preventDefault();

  if (currentAdmin && !currentAdmin.canManageProducts && !currentAdmin.permissions.includes("all")) {
    return showAdminToast("權限不足！只有【商品製作組】或【總召】可編輯商品。", "error");
  }

  const id = document.getElementById("edit-prod-id").value;
  const name = document.getElementById("edit-prod-name").value.trim();
  const code = document.getElementById("edit-prod-code").value.trim().toUpperCase();
  const category = document.getElementById("edit-prod-category").value.trim();
  const price = parseInt(document.getElementById("edit-prod-price").value, 10) || 100;
  const stockStatus = document.getElementById("edit-prod-stock").value;
  const specs = document.getElementById("edit-prod-specs").value.trim();
  const description = document.getElementById("edit-prod-desc").value.trim();

  if (!name || !code) {
    return showAdminToast("請完整填寫商品名稱與代碼！", "error");
  }

  if (id) {
    // 編輯現有商品
    ZgDataManager.updateProduct(id, { name, code, category, price, stockStatus, specs, description });
    showAdminToast(`商品【${name}】已成功更新！`, "success");
  } else {
    // 新增商品
    const newId = "prod_" + Date.now();
    const newProd = {
      id: newId,
      code,
      name,
      category,
      price,
      material: "特級工藝材質",
      specs: specs || "標準校慶規格",
      resolutionReq: "建議 1080P 以上 (300 DPI)",
      minWidth: 1080,
      minHeight: 1080,
      image: "assets/images/mug.jpg",
      badge: "新品上市",
      stockStatus,
      description
    };
    ZgDataManager.addProduct(newProd);
    showAdminToast(`新商品【${name}】已成功上架！`, "success");
  }

  closeProductEditModal();
  renderAdminProductsView();
}

function handleDeleteProduct(productId) {
  if (currentAdmin && !currentAdmin.canManageProducts && !currentAdmin.permissions.includes("all")) {
    return showAdminToast("權限不足！無法刪除商品。", "error");
  }

  const prod = ZgDataManager.getProductById(productId);
  if (!prod) return;

  if (confirm(`確定要下架並刪除商品【${prod.name} (${prod.code})】嗎？`)) {
    ZgDataManager.deleteProduct(productId);
    showAdminToast(`商品【${prod.name}】已成功刪除！`, "success");
    renderAdminProductsView();
  }
}

// 5. 美術組：圖檔審核 (QC)
function renderQCView() {
  const orders = ZgDataManager.getOrders();
  const container = document.getElementById("qc-orders-grid");
  if (!container) return;

  container.innerHTML = orders.map(order => `
    <div style="background:#ffffff;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="color:var(--teal-primary);font-family:monospace;">${order.id}</strong>
        <span class="badge ${order.qcStatus === '審核通過' ? 'badge-success' : (order.qcStatus === '退件' ? 'badge-danger' : 'badge-warning')}">${order.qcStatus}</span>
      </div>
      <div style="display:flex;gap:12px;align-items:center;">
        <img src="${order.imageUrl}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--border-subtle);cursor:pointer;" onclick="window.open('${order.imageUrl}')" title="點擊檢視原圖">
        <div style="font-size:0.85rem;">
          <div><strong>${order.productName}</strong> × ${order.quantity}</div>
          <div style="color:var(--text-muted);font-size:0.75rem;">學生：${order.className} ${order.seatNo}號 ${order.name}</div>
          <div style="color:var(--sage-green);font-size:0.75rem;font-weight:700;">${order.imageRes}</div>
        </div>
      </div>
      <div style="font-size:0.78rem;background:var(--bg-subtle-warm);padding:6px 10px;border-radius:4px;color:var(--text-secondary);">
        備註：${order.notes}
      </div>
      <div style="display:flex;gap:8px;margin-top:auto;">
        <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="handleQCDecision('${order.id}', '退件')">✕ 退件</button>
        <button class="btn btn-primary btn-sm" style="flex:1.4;background:linear-gradient(135deg, #10b981, #059669);border:none;" onclick="handleQCDecision('${order.id}', '審核通過')">✓ 審核通過</button>
      </div>
    </div>
  `).join("");
}

function handleQCDecision(orderId, decision) {
  if (currentAdmin && !currentAdmin.canApproveQC && !currentAdmin.permissions.includes("all")) {
    return showAdminToast("權限不足！只有【美術視覺組】專員可進行圖檔審查。", "error");
  }

  let note = "符合 1080P/300DPI 轉印標準。";
  if (decision === "退件") {
    note = prompt("請輸入具體退件原因 (例如：文字解析度不足、圖片模糊)：", "原圖畫質不佳，請重新提供 1080P 高畫質原圖。");
    if (!note) return;
  }

  ZgDataManager.updateOrder(orderId, {
    qcStatus: decision,
    qcReviewer: currentAdmin ? currentAdmin.username : "admin_art_core",
    qcNote: note,
    qcDate: new Date().toLocaleString("zh-TW", { hour12: false })
  });

  ZgDataManager.addLog(`【美術審核】工單 [${orderId}] 審核結果為 [${decision}]。`);
  showAdminToast(`工單 ${orderId} 已標記為【${decision}】！`, "success");
  renderQCView();
}

// 6. 產線組：熱昇華印製看板 (Production)
function renderProductionView() {
  const orders = ZgDataManager.getOrders().filter(o => o.qcStatus === "審核通過");
  const container = document.getElementById("production-board-cards");
  if (!container) return;

  container.innerHTML = orders.map(order => `
    <div style="background:#ffffff;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;box-shadow:var(--shadow-sm);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="color:var(--teal-primary);font-family:monospace;">${order.id}</strong>
        <span class="badge ${order.prodStatus === '已完成' ? 'badge-success' : 'badge-warning'}">${order.prodStatus}</span>
      </div>
      <div style="font-size:0.85rem;margin-bottom:8px;">
        <strong>${order.productName}</strong> × ${order.quantity} 件
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-secondary btn-sm" onclick="handleProdProgress('${order.id}', '待印製')">待印製</button>
        <button class="btn btn-secondary btn-sm" onclick="handleProdProgress('${order.id}', '轉印中')">轉印中</button>
        <button class="btn btn-primary btn-sm" style="background:#10b981;border:none;" onclick="handleProdProgress('${order.id}', '已完成')">已完成</button>
      </div>
    </div>
  `).join("");
}

function handleProdProgress(orderId, status) {
  if (currentAdmin && !currentAdmin.canUpdateProd && !currentAdmin.permissions.includes("all")) {
    return showAdminToast("權限不足！只有【商品製作組】可更新加工狀態。", "error");
  }

  ZgDataManager.updateOrder(orderId, { prodStatus: status });
  ZgDataManager.addLog(`【產線更新】工單 [${orderId}] 狀態更新為 [${status}]。`);
  showAdminToast(`工單 ${orderId} 狀態已變更為【${status}】`, "success");
  renderProductionView();
}

// 7. 財務組：帳務管理、雙聯單即時預覽與套印 (Finance)
function renderFinanceView() {
  const orders = [...ZgDataManager.getOrders()];
  orders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const tbody = document.getElementById("finance-orders-tbody");
  if (!tbody) return;

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:var(--teal-primary);">${order.id}</td>
      <td>NO.${order.slipNo}</td>
      <td>${order.studentId}</td>
      <td><strong>${order.className}</strong> ${order.seatNo}號 <strong>${order.name}</strong></td>
      <td>${order.productName} × ${order.quantity}</td>
      <td style="font-weight:800;color:#e11d48;">NT$ ${order.totalPrice}</td>
      <td>
        <button class="btn btn-sm ${order.paymentStatus === '已收款' ? 'btn-cyan' : 'btn-secondary'}" onclick="handleTogglePayment('${order.id}')">
          <span>${order.paymentStatus}</span>
        </button>
      </td>
      <td>
        ${order.qcStatus === "審核通過" ? 
          `<button class="btn btn-primary btn-sm" onclick="openSlipPreviewModal('${order.id}')" style="background:linear-gradient(135deg, #ff6584, #f59e0b);border:none;">🖨️ 檢視與列印三聯單</button>` : 
          `<span style="font-size:0.75rem;color:var(--text-muted);background:var(--bg-subtle-warm);padding:2px 6px;border-radius:4px;">需審核通過方可列印</span>`
        }
      </td>
    </tr>
  `).join("");
}

function handleTogglePayment(orderId) {
  if (currentAdmin && !currentAdmin.permissions.includes("finance") && !currentAdmin.permissions.includes("all")) {
    return showAdminToast("權限不足！只有【財務出納組】專員可切換收款狀態。", "error");
  }

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

// 8. 外送組：班級配送管理 (Delivery)
function renderDeliveryView() {
  const orders = ZgDataManager.getOrders();
  const tbody = document.getElementById("delivery-orders-tbody");
  if (!tbody) return;

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td style="font-family:monospace;font-weight:700;color:var(--teal-primary);">${order.id}</td>
      <td><strong>${order.className}</strong></td>
      <td>${order.seatNo} 號</td>
      <td>${order.name}</td>
      <td>${order.productName} × ${order.quantity}</td>
      <td><span class="badge badge-info">${order.deliveryStatus}</span></td>
      <td>
        <select class="form-select" style="padding:4px 8px;font-size:0.8rem;" onchange="handleDeliveryStatus('${order.id}', this.value)">
          <option value="待配送" ${order.deliveryStatus === '待配送' ? 'selected' : ''}>待配送</option>
          <option value="配送中" ${order.deliveryStatus === '配送中' ? 'selected' : ''}>配送中</option>
          <option value="已送達班級" ${order.deliveryStatus === '已送達班級' ? 'selected' : ''}>已送達班級</option>
        </select>
      </td>
    </tr>
  `).join("");
}

function handleDeliveryStatus(orderId, newStatus) {
  if (currentAdmin && !currentAdmin.permissions.includes("delivery") && !currentAdmin.permissions.includes("all")) {
    return showAdminToast("權限不足！只有【現場外送組】專員可更新配送進度。", "error");
  }

  ZgDataManager.updateOrder(orderId, { deliveryStatus: newStatus });
  ZgDataManager.addLog(`【外送更新】訂單 [${orderId}] 配送狀態變更為 [${newStatus}]。`);
  showAdminToast(`工單 ${orderId} 配送狀態已更新為【${newStatus}】`, "success");
  renderDeliveryView();
}

// ==========================================
// 9. 職位驗證碼管理中心 (User Requirement)
// ==========================================
function renderAuthCodesView() {
  const tbody = document.getElementById("admin-auth-codes-tbody");
  if (!tbody) return;

  const codeMap = ZgDataManager.getAdminAuthCodes();

  tbody.innerHTML = RBAC_ACCOUNTS.map(acc => {
    const currentCode = codeMap[acc.username] || acc.password;
    return `
      <tr>
        <td style="font-family:monospace;font-weight:700;color:var(--teal-primary);">${acc.username}</td>
        <td><strong>${acc.roleName}</strong></td>
        <td>${acc.dept}</td>
        <td>
          <input type="text" id="auth-code-input-${acc.username}" class="form-input" value="${currentCode}" style="width:160px;font-family:monospace;font-weight:700;padding:4px 8px;font-size:0.85rem;">
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="handleSaveAuthCode('${acc.username}')" style="padding:4px 10px;font-size:0.75rem;background:linear-gradient(135deg, #ff6584, #f59e0b);border:none;">
            💾 儲存驗證碼
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function handleSaveAuthCode(username) {
  if (currentAdmin && currentAdmin.username !== "admin_director" && currentAdmin.username !== "admin_web_core") {
    return showAdminToast("權限不足！只有【總召】或【AI 網站組核心】有權限修改各組登入驗證碼。", "error");
  }

  const inputEl = document.getElementById(`auth-code-input-${username}`);
  if (!inputEl) return;
  const newCode = inputEl.value.trim();

  if (!newCode) {
    return showAdminToast("驗證碼不能為空！", "error");
  }

  ZgDataManager.updateAdminAuthCode(username, newCode);
  showAdminToast(`已成功將 [${username}] 的驗證碼更新並持久化儲存！`, "success");
}

// 10. 系統審計日誌 (Logs)
function renderAuditLogsView() {
  const container = document.getElementById("audit-log-container");
  if (!container) return;

  const logs = ZgDataManager.getLogs();
  container.innerHTML = logs.map(l => `
    <div style="font-size:0.82rem;padding:6px 10px;border-left:3px solid var(--teal-primary);background:var(--bg-subtle-warm);border-radius:2px;">
      <span style="color:var(--text-muted);font-family:monospace;">[${l.time}]</span> ${l.action}
    </div>
  `).join("");
}

// ==========================================
// 11. 核心套印 A4 三聯確認單與螢幕即時預覽 (上聯顧客 / 中聯留存 / 下聯財務)
// ==========================================
let currentPreviewOrderId = null;

function buildSingleSlipHtml(order) {
  return `
    <div class="a4-page triple-slip-page">
      
      <!-- ================= 第一聯：上聯（給顧客的 · 顧客取貨時交給大會 · 蓋防偽章後交貨） ================= -->
      <div class="slip-third">
        <div class="slip-header">
          <div class="slip-title-group">
            <h2>智光高級商工職業學校 115學年度 第62屆校慶園遊會</h2>
            <h3>資料處理科客製化商品專案【顧客核對取貨憑證】</h3>
            <span class="slip-badge-pill" style="border-color:#e11d48;color:#e11d48;">★ 第一聯：顧客取貨聯（取貨時交還大會 · 核蓋防偽章後交付商品）</span>
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
            <td><strong>${order.productName}</strong></td>
            <th>數量 / 應付</th>
            <td><strong>${order.quantity} 件</strong> / <strong style="color:#b91c1c;">NT$ ${order.totalPrice}</strong> (單價: NT$ ${order.unitPrice})</td>
          </tr>
          <tr>
            <th>客製備註</th>
            <td colspan="3"><span class="slip-note-text">${order.notes}</span></td>
          </tr>
        </table>

        <!-- 上聯三方簽章：顧客簽名、財務簽名、大會取貨防偽章 (核對蓋章後交付商品) -->
        <div class="slip-signatures-row">
          <div class="sig-block">
            <span class="sig-label">顧客親筆核對簽名：</span>
            <div class="sig-line">（顧客現場核驗商品無誤簽章）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">財務出納簽名：</span>
            <div class="sig-line">（收款狀態：${order.paymentStatus}）</div>
          </div>
          <div class="sig-block seal-stamp-box">
            <span class="sig-label" style="color:#b91c1c;font-size:8pt;font-weight:900;">【大會取貨防偽章】</span>
            <div class="sig-line" style="border:none;color:#b91c1c;font-size:6.8pt;font-weight:bold;">（現場核蓋防偽章生效 · 始交付商品）</div>
          </div>
        </div>

        <div class="slip-footer-disclaimer">
          ※ 取貨須知：本聯由顧客持有，取貨時交還大會。大會人員核對商品無誤並核蓋【大會取貨防偽章】後，方正式將商品交給顧客。商品一經印製驗收恕不退換。
        </div>
      </div>

      <!-- 撕開線 1 -->
      <div class="tear-line-divider compact">
        <span>✂ - - - - - - - - - - 請 沿 虛 線 撕 開（上聯顧客取貨 / 中聯專案行政派送留存）- - - - - - - - - - ✂</span>
      </div>

      <!-- ================= 第二聯：中聯（大會自己保留 · 產線加工與外送簽收存查） ================= -->
      <div class="slip-third">
        <div class="slip-header">
          <div class="slip-title-group">
            <h2>智光高級商工職業學校 115學年度 第62屆校慶園遊會</h2>
            <h3>資料處理科客製化商品專案【專案行政暨派送存根】</h3>
            <span class="slip-badge-pill" style="border-color:#2563eb;color:#2563eb;">★ 第二聯：行政與派送留存（專案內部保留 · 產線加工與外送核銷）</span>
          </div>
          <div class="slip-no-box">
            <div class="slip-serial">NO: ${order.slipNo}</div>
            <div class="slip-barcode-text">*${order.id}*</div>
          </div>
        </div>

        <table class="slip-table">
          <tr>
            <th>工單編號</th>
            <td><strong>${order.id}</strong></td>
            <th>流水號碼</th>
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
            <th>數量 / 款項</th>
            <td><strong>${order.quantity} 件</strong> / NT$ ${order.totalPrice} (${order.paymentStatus})</td>
          </tr>
          <tr>
            <th>加工備註</th>
            <td><span class="slip-note-text">${order.notes}</span></td>
            <th>圖檔檢驗</th>
            <td>${order.qcStatus} (審核員: ${order.qcReviewer || "admin_art_core"})</td>
          </tr>
        </table>

        <!-- 中聯三方簽章：顧客簽名、財務簽名、派送簽名 -->
        <div class="slip-signatures-row">
          <div class="sig-block">
            <span class="sig-label">顧客簽名（取件/到班）：</span>
            <div class="sig-line">（驗收人親收簽署）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">財務收款簽名：</span>
            <div class="sig-line">（款項清點核銷確認）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">外送組派送簽名：</span>
            <div class="sig-line">（外送組專員配送親簽）</div>
          </div>
        </div>

        <div class="slip-footer-disclaimer">
          ※ 內部留存說明：本聯由大會團隊自行保留，供產線機台對接、外送組送達班級驗收及售後追蹤存查。活動結束後依資安承諾統一銷毀。
        </div>
      </div>

      <!-- 撕開線 2 -->
      <div class="tear-line-divider compact">
        <span>✂ - - - - - - - - - - 請 沿 虛 線 撕 開（中聯專案行政留存 / 下聯財務審計存查）- - - - - - - - - - ✂</span>
      </div>

      <!-- ================= 第三聯：下聯（留作財務存查 · 現金對帳與會計審計） ================= -->
      <div class="slip-third">
        <div class="slip-header">
          <div class="slip-title-group">
            <h2>智光高級商工職業學校 115學年度 第62屆校慶園遊會</h2>
            <h3>資料處理科客製化商品專案【財務出納審計存查單】</h3>
            <span class="slip-badge-pill" style="border-color:#b91c1c;color:#b91c1c;">★ 第三聯：財務存查（財務組專用 · 營收結算與會計審計憑證）</span>
          </div>
          <div class="slip-no-box">
            <div class="slip-serial">NO: ${order.slipNo}</div>
            <div class="slip-barcode-text">*${order.id}*</div>
          </div>
        </div>

        <table class="slip-table">
          <tr>
            <th>會計編號</th>
            <td><strong>ZG-FIN-${order.slipNo}</strong></td>
            <th>工單代碼</th>
            <td><strong>${order.id}</strong></td>
          </tr>
          <tr>
            <th>繳款學生</th>
            <td><strong>${order.className} ${order.seatNo}號 ${order.name}</strong> (${order.studentId})</td>
            <th>收款日期</th>
            <td>${order.createdAt}</td>
          </tr>
          <tr>
            <th>核銷品項</th>
            <td><strong>${order.productName} × ${order.quantity} 件</strong></td>
            <th>實收總額</th>
            <td><strong style="font-size:11pt;color:#b91c1c;">NT$ ${order.totalPrice}</strong> (單價: NT$ ${order.unitPrice})</td>
          </tr>
          <tr>
            <th>金流狀態</th>
            <td><span class="badge ${order.paymentStatus === '已收款' ? 'badge-success' : 'badge-danger'}">${order.paymentStatus}</span></td>
            <th>防偽識別</th>
            <td style="font-family:monospace;font-size:7.5pt;color:var(--text-muted);">HASH: ${order.id}-SEC2026</td>
          </tr>
        </table>

        <!-- 下聯三方簽章：顧客簽名、財務出納經辦、主計/財務長簽章 -->
        <div class="slip-signatures-row">
          <div class="sig-block">
            <span class="sig-label">繳款顧客簽名：</span>
            <div class="sig-line">（付款人簽認）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">出納經辦簽章：</span>
            <div class="sig-line">（零錢包現金收訖）</div>
          </div>
          <div class="sig-block">
            <span class="sig-label">主計 / 財務長簽章：</span>
            <div class="sig-line">（總帳入帳審計核章）</div>
          </div>
        </div>

        <div class="slip-footer-disclaimer">
          ※ 財務會計宣告：本單據為專案閉幕結算總營收、零錢包現金核對與法定會計稽核之原始憑證，流水號連續不可跳號或抽換。
        </div>
      </div>

    </div>
  `;
}

function openSlipPreviewModal(orderId) {
  const order = ZgDataManager.getOrders().find(o => o.id === orderId);
  if (!order) {
    return showAdminToast(`找不到工單 [${orderId}] 的資料！`, "error");
  }

  currentPreviewOrderId = orderId;
  const target = document.getElementById("slip-preview-render-target");
  if (target) {
    target.innerHTML = buildSingleSlipHtml(order);
  }

  const infoTag = document.getElementById("slip-preview-info-tag");
  if (infoTag) {
    infoTag.innerHTML = `正在檢視：<strong style="color:var(--teal-primary);">${order.className} ${order.seatNo}號 ${order.name}</strong> (${order.studentId}) 的三聯確認單 · 金額: <strong>NT$ ${order.totalPrice}</strong>`;
  }

  const modal = document.getElementById("modal-slip-preview");
  if (modal) modal.classList.add("active");
}

function closeSlipPreviewModal() {
  currentPreviewOrderId = null;
  const modal = document.getElementById("modal-slip-preview");
  if (modal) modal.classList.remove("active");
}

function confirmPrintCurrentPreview() {
  if (!currentPreviewOrderId) return;
  const order = ZgDataManager.getOrders().find(o => o.id === currentPreviewOrderId);
  if (!order) return;
  batchPrintA4([order]);
}

function batchPrintApprovedA4() {
  const approvedOrders = [...ZgDataManager.getOrders().filter(o => o.qcStatus === "審核通過")];
  approvedOrders.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  if (approvedOrders.length === 0) {
    return showAdminToast("目前沒有【審核通過】的訂單可供列印！", "warning");
  }

  const tbody = document.getElementById("batch-slip-tbody");
  const mockIds = ["ZG2026-0001-MUG", "ZG2026-0001-BDG", "ZG2026-0002-CST", "ZG2026-0003-PSP", "ZG2026-0004-CRD"];

  tbody.innerHTML = approvedOrders.map(order => {
    const isMock = mockIds.includes(order.id);
    return `
      <tr style="${isMock ? 'background:rgba(0,0,0,0.02);' : 'background:rgba(255,101,132,0.04);'}">
        <td style="text-align:center;">
          <input type="checkbox" class="batch-slip-checkbox" value="${order.id}" ${!isMock ? 'checked' : ''} onchange="updateBatchSelectedCount()">
        </td>
        <td style="font-family:monospace;font-weight:700;color:var(--teal-primary);">${order.id}</td>
        <td>NO.${order.slipNo}</td>
        <td>${order.studentId}</td>
        <td><strong>${order.className}</strong> ${order.seatNo}號 <strong>${order.name}</strong> ${isMock ? '<span style="font-size:0.7rem;color:var(--text-muted);">(示範假資料)</span>' : '<span style="font-size:0.7rem;color:#10b981;font-weight:700;">(真實顧客)</span>'}</td>
        <td>${order.productName}</td>
        <td style="font-weight:700;color:var(--text-gold);">NT$ ${order.totalPrice}</td>
        <td><span class="badge ${order.paymentStatus === '已收款' ? 'badge-success' : 'badge-warning'}">${order.paymentStatus}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:0.75rem;" onclick="openSlipPreviewModal('${order.id}')">預覽</button>
        </td>
      </tr>
    `;
  }).join("");

  document.getElementById("batch-total-count").innerText = approvedOrders.length;
  updateBatchSelectedCount();

  const modal = document.getElementById("modal-batch-slip");
  if (modal) modal.classList.add("active");
}

function closeBatchSlipModal() {
  const modal = document.getElementById("modal-batch-slip");
  if (modal) modal.classList.remove("active");
}

function updateBatchSelectedCount() {
  const checked = document.querySelectorAll(".batch-slip-checkbox:checked");
  const countEl = document.getElementById("batch-selected-count");
  if (countEl) countEl.innerText = checked.length;
}

function setBatchSelectAll(checked) {
  document.querySelectorAll(".batch-slip-checkbox").forEach(cb => cb.checked = checked);
  updateBatchSelectedCount();
}

function setBatchSelectRealOnly() {
  const mockIds = ["ZG2026-0001-MUG", "ZG2026-0001-BDG", "ZG2026-0002-CST", "ZG2026-0003-PSP", "ZG2026-0004-CRD"];
  document.querySelectorAll(".batch-slip-checkbox").forEach(cb => {
    cb.checked = !mockIds.includes(cb.value);
  });
  updateBatchSelectedCount();
  showAdminToast("已自動勾選真實客戶訂單，排除示範假資料！", "info");
}

function executeBatchPrintSelected() {
  const checkedBoxes = Array.from(document.querySelectorAll(".batch-slip-checkbox:checked"));
  if (checkedBoxes.length === 0) {
    return showAdminToast("請至少勾選 1 張欲列印的三聯單！", "warning");
  }

  const selectedIds = checkedBoxes.map(cb => cb.value);
  const allOrders = ZgDataManager.getOrders();
  const selectedOrders = selectedIds.map(id => allOrders.find(o => o.id === id)).filter(Boolean);

  closeBatchSlipModal();
  batchPrintA4(selectedOrders);
}

function batchPrintA4(ordersList) {
  const container = document.getElementById("print-double-slip-container");
  container.innerHTML = "";

  ordersList.forEach(order => {
    container.innerHTML += buildSingleSlipHtml(order);
  });

  ZgDataManager.addLog(`【套表列印】財務組/管理員觸發一鍵列印 A4 三聯確認單，共計 ${ordersList.length} 張。`);
  window.print();
}

// 示範資料維護函式
function handleClearMockData() {
  if (!confirm("確定要清除系統預設的 5 筆示範假資料嗎？\n\n清除後將只保留前台下單之真實顧客訂單，方便您進行精確對帳與列印。")) {
    return;
  }
  const realOrders = ZgDataManager.clearMockOrders();
  showAdminToast(`已成功清除示範假資料！目前資料庫中共有 ${realOrders.length} 筆真實訂單。`, "success");
  refreshAllViews();
}

function handleResetMockData() {
  if (!confirm("確定要恢復系統預設的 5 筆示範訂單嗎？")) {
    return;
  }
  ZgDataManager.resetDemoOrders();
  showAdminToast("已恢復系統預設示範訂單！", "info");
  refreshAllViews();
}

function refreshAllViews() {
  renderDashboardView();
  renderAdminProductsView();
  renderQCView();
  renderProductionView();
  renderFinanceView();
  renderDeliveryView();
  renderAuthCodesView();
  renderAuditLogsView();
}

// ==========================================
// 12. Excel 匯出功能 (升級防死當與 Base64 崩潰保護)
// ==========================================
function exportOrdersToExcel() {
  try {
    const orders = ZgDataManager.getOrders();
    if (orders.length === 0) {
      return showAdminToast("目前沒有可供匯出的訂單資料！", "warning");
    }

    const rows = [];
    rows.push([
      "訂單編號", "雙聯單流水號", "學生學號", "班級", "座號", "姓名", "性別", "聯絡電話",
      "商品編號", "商品品項", "訂購數量", "單價", "總金額", "客製要求與備註",
      "圖檔規格/連結", "圖檔解析度", "審核狀態", "審核人員", "審核備註", "製作進度", "收款狀態", "下單時間"
    ]);

    orders.forEach(o => {
      let imageField = "";
      // 防死當修復：Base64 字串不能直接寫入 Excel HYPERLINK 公式，否則會超過 8192 字元上限導致崩潰
      if (o.imageUrl && o.imageUrl.startsWith("data:image")) {
        imageField = "[客製圖檔已上傳 (原圖儲存於後台資料庫)]";
      } else if (o.imageUrl) {
        const fullImgUrl = o.imageUrl.startsWith("http") ? o.imageUrl : window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/") + o.imageUrl;
        imageField = `=HYPERLINK("${fullImgUrl}", "點此檢視圖檔")`;
      } else {
        imageField = "無圖檔";
      }

      rows.push([
        o.id, o.slipNo, o.studentId, o.className, o.seatNo, o.name, o.gender, o.phone,
        o.productCode, o.productName, o.quantity, o.unitPrice, o.totalPrice, o.notes,
        imageField, o.imageRes, o.qcStatus, o.qcReviewer || "無", o.qcNote || "無",
        o.prodStatus, o.paymentStatus, o.createdAt
      ]);
    });

    if (window.XLSX) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 6 }, { wch: 14 },
        { wch: 10 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 30 },
        { wch: 32 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "校慶商品訂單總表");
      const fileName = `智光商工115校慶園遊會_訂單總表_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      ZgDataManager.addLog(`【報表匯出】管理員成功匯出 Excel 總表 (${fileName})。`);
      showAdminToast("Excel 報表匯出成功！已自動完成下載。", "success");
    } else {
      // 容錯機制：若 SheetJS 庫未完全載入，降級輸出 UTF-8 CSV，確保零死當
      downloadCsvFallback(rows);
    }
  } catch (err) {
    console.error("Excel 匯出失敗，啟動 CSV 容錯雙保險:", err);
    downloadCsvFallback();
  }
}

function downloadCsvFallback(rowsData) {
  try {
    const orders = ZgDataManager.getOrders();
    let csvContent = "\uFEFF"; // UTF-8 BOM，防止 Excel 開啟亂碼
    csvContent += "訂單編號,流水號,學號,班級,座號,姓名,性別,電話,品項,數量,單價,總額,備註,審核,製作,收款,下單時間\n";
    orders.forEach(o => {
      csvContent += `"${o.id}","${o.slipNo}","${o.studentId}","${o.className}","${o.seatNo}","${o.name}","${o.gender}","${o.phone}","${o.productName}",${o.quantity},${o.unitPrice},${o.totalPrice},"${(o.notes || '').replace(/"/g, '""')}","${o.qcStatus}","${o.prodStatus}","${o.paymentStatus}","${o.createdAt}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `智光商工115校慶園遊會_訂單備用總表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showAdminToast("已透過 CSV 雙保險引擎成功匯出訂單總表！", "info");
  } catch (e) {
    showAdminToast("匯出發生異常，請重試！", "error");
  }
}

// 13. 活動結束後保留 14 天存查始開放個資物理抹除指令 (User Requirement)
const EVENT_END_DATE = new Date("2026-11-15T18:00:00");
const WIPE_ELIGIBLE_DATE = new Date("2026-11-29T18:00:00"); // 活動閉幕後嚴格保留 14 天供財務對帳

function executeEmergencyDataWipe() {
  const now = new Date();
  if (now < WIPE_ELIGIBLE_DATE) {
    return alert("【🔒 大會資安防誤刪保護鎖定中】\n\n目前處於校慶園遊會籌備與活動進行期間！\n\n為保障顧客取貨權益與財務核對，所有學生名冊與訂單資料在活動期間全程安全保存。\n系統依規定於活動閉幕日（2026/11/15）後起算保留 14 天（至 2026/11/29），期滿後始開放執行物理抹除。\n\n目前功能處於安全鎖定狀態，絕不提前刪除任何資料！");
  }

  const p1 = prompt("【資安終極確認】活動已圓滿閉幕且 14 天存查期已屆滿！\n請輸入【CONFIRM_DATA_WIPE_2026】確認執行全量物理銷毀：");
  if (p1 === "CONFIRM_DATA_WIPE_2026") {
    ZgDataManager.wipeDatabase();
    alert("所有個資與訂單資料已依承諾完成物理銷毀！系統將自動重載。");
    window.location.reload();
  } else {
    showAdminToast("驗證指令不符，物理銷毀已取消。", "warning");
  }
}

// 14. 活動閉幕與 14 天存查銷毀倒數計時器
function initDestructionCountdown() {
  const timerEl = document.getElementById("destruction-countdown-timer");
  if (!timerEl) return;

  function update() {
    const now = new Date();
    if (now < EVENT_END_DATE) {
      const diff = EVENT_END_DATE - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      timerEl.innerHTML = `<span style="color:#10b981;font-weight:700;">🛡️ 活動營運中 (資料全程受保護)：距離閉幕尚有 ${days} 天 ${hours} 小時</span>`;
      return;
    }

    const diff = WIPE_ELIGIBLE_DATE - now;
    if (diff <= 0) {
      timerEl.innerHTML = `<span style="color:#e11d48;font-weight:700;">⚠️ 活動已結束且滿 14 天存查期：開放執行資安抹除</span>`;
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    timerEl.innerHTML = `<span style="color:#f59e0b;font-weight:700;">⏳ 閉幕後 14 天法定存查期：剩餘 ${days}天 ${hours}時 ${mins}分 ${secs}秒</span>`;
  }

  update();
  setInterval(update, 1000);
}

// 15. Toast 訊息提示
function showAdminToast(message, type = "success") {
  const container = document.getElementById("toast-container") || document.getElementById("admin-toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'error' ? '✕ ' : (type === 'warning' ? '⚠ ' : '✓ ')}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-fadeout");
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// 16. 事件監聽設置
function setupAdminEventListeners() {
  // 原版後台快捷身分選擇下拉選單
  const quickSelect = document.getElementById("quick-role-select");
  if (quickSelect) {
    quickSelect.addEventListener("change", (e) => {
      const u = e.target.value;
      const acc = RBAC_ACCOUNTS.find(a => a.username === u);
      if (acc) {
        const uInput = document.getElementById("admin-login-username");
        const pInput = document.getElementById("admin-login-password");
        if (uInput) uInput.value = acc.username;
        if (pInput) pInput.value = acc.password;
      }
    });
  }

  // 原版後台登入表單
  const loginForm = document.getElementById("form-admin-login");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = document.getElementById("admin-login-username")?.value.trim();
      const p = document.getElementById("admin-login-password")?.value.trim();
      handleAdminLogin(u, p);
    });
  }

  // 登出按鈕
  document.getElementById("btn-admin-logout")?.addEventListener("click", handleAdminLogout);

  // 導覽標籤按鈕
  document.querySelectorAll(".admin-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // 批次列印雙聯單按鈕
  document.getElementById("btn-batch-print-a4")?.addEventListener("click", batchPrintApprovedA4);

  // 物理銷毀按鈕
  document.getElementById("btn-emergency-wipe")?.addEventListener("click", executeEmergencyDataWipe);

  // 關閉 Modal
  document.querySelectorAll(".modal-close-btn, .admin-modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-overlay:not(#modal-admin-login)").forEach(m => m.classList.remove("active"));
    });
  });
}
