// 初始化 Supabase 雲端連線組態 (避免與 CDN 全域 window.supabase 變數衝突)
var zgSupabaseClient = null;
try {
  if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
    zgSupabaseClient = window.supabase.createClient(
      'https://pdycpmbvjmhxabnzzdld.supabase.co',
      'sb_publishable_1Z-6ijop728MxaiXhZGTCQ_LWfdWrrY'
    );
  }
} catch (e) {
  console.warn("[Supabase] 初始化警示：", e);
}
/**
 * 智光商工 115學年度 第62屆校慶園遊會 - 前端商城業務邏輯 (Customer Storefront)
 * 涵蓋：6大必填個資、圖檔 1080P 檢驗、購物車側邊欄、雙重確認結帳、品項自動拆單與訂單查詢
 */

// 全域狀態
let currentStudent = null;
let cart = [];
let currentUploadData = null; // 暫存上傳圖檔資訊 (dataUrl, width, height, is1080p)
let selectedProductId = null;
let currentCategoryFilter = "all";
let selectedDetailProductId = null;

// 初始化防禦（無論是 DOMContentLoaded 觸發或已載入完成均能立即渲染，且任一步驟異常均不阻斷其他模組）
function initStoreApp() {
  try { initStudentAuth(); } catch (e) { console.error("initStudentAuth failed:", e); }
  try { loadCart(); } catch (e) { console.error("loadCart failed:", e); }
  try { checkRestockArrivalNotice(); } catch (e) { console.error("checkRestockArrivalNotice failed:", e); }
  try { renderProducts(); } catch (e) { console.error("renderProducts failed:", e); }
  try { setupEventListeners(); } catch (e) { console.error("setupEventListeners failed:", e); }
  try { updateCartBadge(); } catch (e) { console.error("updateCartBadge failed:", e); }
  try { initIosMicroInteractions(); } catch (e) { console.error("initIosMicroInteractions failed:", e); }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStoreApp);
} else {
  initStoreApp();
}

window.refreshStoreViews = () => {
  try { renderProducts(); } catch (e) { }
  try { updateStudentUI(); } catch (e) { }
  try { updateCartBadge(); } catch (e) { }
  try { checkRestockArrivalNotice(); } catch (e) { }
};

// 檢查購物車內先前「補貨預約中」的商品是否已完成到貨，若到貨則彈出正式通知並解鎖下單
function checkRestockArrivalNotice() {
  if (!cart || cart.length === 0) return;
  const newlyRestockedItems = [];
  let cartChanged = false;

  cart.forEach(item => {
    if (item.isRestocking) {
      const prod = ZgDataManager.getProductById(item.productId);
      if (prod && prod.stockStatus === "in_stock") {
        item.isRestocking = false;
        cartChanged = true;
        newlyRestockedItems.push(item);
      }
    }
  });

  if (cartChanged) {
    saveCart();
    updateCartUI();
  }

  if (newlyRestockedItems.length > 0) {
    setTimeout(() => {
      showRestockArrivalModal(newlyRestockedItems);
    }, 450);
  }
}

function showRestockArrivalModal(items) {
  const modal = document.getElementById("modal-restock-arrival");
  const listEl = document.getElementById("restock-arrival-items-list");
  if (listEl) {
    listEl.innerHTML = items.map(item => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${item.imageUrl || ''}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--border-subtle);background:#ffffff;">
          <div>
            <strong style="color:var(--text-primary);font-size:0.92rem;">${item.name}</strong>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">預約數量：${item.quantity} 件 · 總計 NT$ ${item.price * item.quantity}</div>
          </div>
        </div>
        <span style="background:rgba(16,185,129,0.15);color:#059669;border:1px solid rgba(16,185,129,0.3);padding:3px 12px;border-radius:9999px;font-size:0.75rem;font-weight:800;">🟢 已補貨到貨</span>
      </div>
    `).join("");
  }
  if (modal) {
    openModal(modal);
  }
  showToast(`🎉 到貨通知：您預約的商品已補貨到貨！已為您自動解鎖，現在可以正式下單結帳了！`, "success", 7000);
}

function handleGoToCartAfterRestock() {
  const modal = document.getElementById("modal-restock-arrival");
  if (modal) closeModal(modal);
  openCartDrawer();
}


// 1. 醒目 Toast 通知橫幅 (精確回報錯誤與狀態)
function showToast(message, type = "success", duration = 4000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "✓";
  if (type === "error") icon = "✕ 錯誤：";
  else if (type === "warning") icon = "⚠ 提醒：";

  toast.innerHTML = `<span style="font-size:1.1rem;font-weight:900;">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-fadeout");
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// 2. 零死當：按鈕載入鎖定器 (防連點防卡死)
function setButtonLoading(btn, isLoading, originalText = "") {
  if (!btn) return;
  if (isLoading) {
    btn.classList.add("is-loading");
    btn.dataset.origText = btn.innerHTML;
    btn.disabled = true;
  } else {
    btn.classList.remove("is-loading");
    if (btn.dataset.origText) {
      btn.innerHTML = btn.dataset.origText;
    }
    btn.disabled = false;
  }
}

// 3. 會員註冊、登入與個人資料修改 (嚴格班級座號唯一性驗證)
function initStudentAuth() {
  currentStudent = ZgDataManager.getCurrentUser();
  updateStudentUI();
  updateDynamicIsland();
}

function updateStudentUI() {
  const statusEl = document.getElementById("user-status-text");
  const dotEl = document.getElementById("user-status-dot");
  if (currentStudent && currentStudent.studentId) {
    if (statusEl) statusEl.textContent = `${currentStudent.className} ${parseInt(currentStudent.seatNo, 10)}號 ${currentStudent.name}`;
    if (dotEl) dotEl.classList.add("logged-in");
  } else {
    if (statusEl) statusEl.textContent = "💖 學生登入 / 註冊";
    if (dotEl) dotEl.classList.remove("logged-in");
  }
  updateDynamicIsland();
}

function openStudentAuthModal() {
  const modal = document.getElementById("modal-student-auth");
  const tabProfileBtn = document.getElementById("auth-tab-btn-profile");
  if (currentStudent && currentStudent.studentId) {
    if (tabProfileBtn) tabProfileBtn.style.display = "inline-block";
    switchAuthTab("profile");
    populateStudentProfile();
  } else {
    if (tabProfileBtn) tabProfileBtn.style.display = "none";
    switchAuthTab("login");
  }
  openModal(modal);
}

function closeStudentAuthModal() {
  const modal = document.getElementById("modal-student-auth");
  if (modal) closeModal(modal);
}

function openStudentProfileModal() {
  const modal = document.getElementById("modal-student-auth");
  switchAuthTab("profile");
  populateStudentProfile();
  if (modal) openModal(modal);
}

function closeStudentProfileModal() {
  closeStudentAuthModal();
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById("auth-tab-btn-login");
  const btnReg = document.getElementById("auth-tab-btn-register");
  const btnProfile = document.getElementById("auth-tab-btn-profile");
  const panelLogin = document.getElementById("auth-panel-login");
  const panelReg = document.getElementById("auth-panel-register");
  const panelProfile = document.getElementById("auth-panel-profile");

  if (btnLogin) btnLogin.classList.toggle("active", tab === "login");
  if (btnReg) btnReg.classList.toggle("active", tab === "register");
  if (btnProfile) btnProfile.classList.toggle("active", tab === "profile");

  if (panelLogin) panelLogin.style.display = tab === "login" ? "block" : "none";
  if (panelReg) panelReg.style.display = tab === "register" ? "block" : "none";
  if (panelProfile) {
    panelProfile.style.display = tab === "profile" ? "block" : "none";
    if (tab === "profile") populateStudentProfile();
  }
}

function populateStudentProfile() {
  if (!currentStudent) return;
  const idEl = document.getElementById("profile-student-id");
  const nameEl = document.getElementById("profile-student-name");
  const classEl = document.getElementById("profile-student-class");
  const seatEl = document.getElementById("profile-student-seat");
  const genderEl = document.getElementById("profile-student-gender");
  const phoneEl = document.getElementById("profile-student-phone");

  if (idEl) idEl.value = currentStudent.studentId || "";
  if (nameEl) nameEl.value = currentStudent.name || "";
  if (classEl) classEl.value = currentStudent.className || "";
  if (seatEl) seatEl.value = currentStudent.seatNo || "";
  if (genderEl) genderEl.value = currentStudent.gender || "不方便透露";
  if (phoneEl) phoneEl.value = currentStudent.phone || "";
}

function handleSaveStudentProfile(event) {
  if (event) event.preventDefault();
  if (!currentStudent) {
    return showToast("尚未登入學生會員！", "error");
  }

  const genderEl = document.getElementById("profile-student-gender");
  const phoneEl = document.getElementById("profile-student-phone");
  const gender = genderEl ? genderEl.value : "不方便透露";
  const phone = phoneEl ? phoneEl.value.trim() : "";

  if (!phone || !/^09\d{8}$/.test(phone)) {
    return showToast("請填寫正確的手機號碼（格式：09xxxxxxxx，共 10 碼數字）！", "error");
  }

  // 學號、姓名、班級、座號為唯一綁定，不可修改；僅性別、電話可修改 (User Requirement)
  currentStudent.gender = gender;
  currentStudent.phone = phone;

  // 更新學生名冊
  const students = ZgDataManager.getStudents();
  const idx = students.findIndex(s => s.studentId === currentStudent.studentId);
  if (idx !== -1) {
    students[idx].gender = gender;
    students[idx].phone = phone;
    ZgDataManager.saveStudents(students);
  }

  // 儲存當前登入者並同步至後端 server db.json
  ZgDataManager.saveCurrentUser(currentStudent);
  ZgDataManager.syncStudentToServer(currentStudent);

  updateStudentUI();
  updateDynamicIsland();
  showToast("個人資料修改已成功儲存！", "success");
  closeModal(document.getElementById("modal-student-auth"));
}

function handleStudentLogout() {
  ZgDataManager.clearCurrentUser();
  currentStudent = null;
  updateStudentUI();
  updateDynamicIsland();
  const tabProfileBtn = document.getElementById("auth-tab-btn-profile");
  if (tabProfileBtn) tabProfileBtn.style.display = "none";
  switchAuthTab("login");
  closeModal(document.getElementById("modal-student-auth"));
  showToast("您已安全登出學生會員帳號。", "info");
}

async function handleStudentLogin(event) {
  if (event) event.preventDefault();
  const inputEl = document.getElementById("login-student-id");
  if (!inputEl) return;
  const studentId = inputEl.value.trim();

  if (!studentId || !/^\d{6}$/.test(studentId)) {
    return showToast("請輸入完整的 6 碼學生學號（例如：112001）！", "error");
  }

  // 1. 本地快速檢查
  let result = ZgDataManager.loginStudent(studentId);

  // 2. 若本地無此學號（例如在手機端首次開啟），向 Supabase 雲端資料庫檢索學生名冊
  if (!result.success && zgSupabaseClient) {
    try {
      const { data: cloudStudents, error } = await zgSupabaseClient
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .limit(1);

      if (!error && cloudStudents && cloudStudents.length > 0) {
        const cs = cloudStudents[0];
        const studentObj = {
          studentId: cs.student_id,
          name: cs.name,
          className: cs.class_name,
          seatNo: String(cs.seat_no),
          gender: cs.gender || "未指定",
          phone: cs.phone || "",
          registeredAt: cs.created_at || getTaiwanNowString()
        };
        // 寫入手機本地
        const students = ZgDataManager.getStudents();
        students.push(studentObj);
        ZgDataManager.saveStudents(students);
        ZgDataManager.saveCurrentUser(studentObj);
        result = { success: true, student: studentObj };
      }
    } catch (e) {
      console.warn("Supabase 學生雲端登入檢索失敗：", e);
    }
  }

  if (result.success) {
    currentStudent = result.student;
    updateStudentUI();
    closeModal(document.getElementById("modal-student-auth"));
    showToast(`歡迎回來，${result.student.className} ${result.student.name} 同學！`, "success");
  } else {
    showToast(result.message, "error");
  }
}

async function handleStudentRegister(event) {
  if (event) event.preventDefault();
  const studentId = document.getElementById("reg-student-id").value.trim();
  const name = document.getElementById("reg-student-name").value.trim();
  const className = document.getElementById("reg-student-class").value.trim();
  const seatNo = document.getElementById("reg-student-seat").value.trim();
  const gender = document.getElementById("reg-student-gender").value;
  const phone = document.getElementById("reg-student-phone").value.trim();

  if (!studentId || !/^\d{6}$/.test(studentId)) {
    return showToast("請輸入完整的 6 碼學生學號（例如：112001）", "error");
  }
  if (!className) {
    return showToast("請填寫班級（格式：科系+班級，例如：資處科一仁、廣設科二信甲）", "error");
  }
  const parsedSeat = parseInt(seatNo, 10);
  if (!seatNo || isNaN(parsedSeat) || parsedSeat < 1 || parsedSeat > 65) {
    return showToast("請填寫有效座號數字（例如：1、2、3...）", "error");
  }
  if (!name || name.length < 2) {
    return showToast("請填写真實姓名", "error");
  }
  if (!phone || !/^09\d{8}$/.test(phone)) {
    return showToast("請填寫正確的手機號碼（例：0912345678）", "error");
  }

  const result = ZgDataManager.registerStudent({
    studentId,
    name,
    className,
    seatNo: String(parsedSeat),
    gender: gender || "不方便透露",
    phone
  });

  if (result.success) {
    currentStudent = result.student;
    updateStudentUI();

    // 跨裝置同步至 Supabase 雲端資料庫
    if (zgSupabaseClient) {
      try {
        await zgSupabaseClient.from('students').upsert([
          {
            student_id: studentId,
            name: name,
            class_name: className,
            seat_no: parsedSeat,
            gender: gender || "不方便透露",
            phone: phone
          }
        ], { onConflict: 'student_id' });
      } catch (cloudErr) {
        console.warn("Supabase 學生雲端同步：", cloudErr);
      }
    }

    closeModal(document.getElementById("modal-student-auth"));
    showToast(`✨ 註冊成功！歡迎 ${className} ${name} 同學！`, "success");
  } else {
    // 撞號或學號重複，醒目警告阻止
    alert(result.message);
    showToast(result.message, "error", 6000);
  }
}

// 4. 購買前強制彈出【客製化規範與注意事項】彈窗 (User Requirement)
let pendingNoticeProductId = null;

function promptPreOrderNotice(productId) {
  const prod = ZgDataManager.getProductById(productId);
  if (prod && prod.stockStatus === "out_of_stock") {
    alert(`【${prod.name}】目前暫時缺貨（已搶光），暫停客製接單！請待下一批物料到貨。`);
    return showToast(`【${prod.name}】目前暫時缺貨中，無法進行客製下單！`, "warning");
  }

  pendingNoticeProductId = productId;
  const modal = document.getElementById("modal-pre-order-notice");
  const chk = document.getElementById("check-agree-notice");
  const btn = document.getElementById("btn-proceed-to-studio");
  if (chk) chk.checked = false;
  if (btn) btn.disabled = true;

  if (modal) {
    openModal(modal);
  } else {
    // 若該頁面無注意事項彈窗，直接進入工坊
    openCustomStudio(productId);
  }
}

function toggleAgreeNotice(checked) {
  const btn = document.getElementById("btn-proceed-to-studio");
  if (btn) btn.disabled = !checked;
}

function confirmNoticeAndOpenStudio() {
  closeModal(document.getElementById("modal-pre-order-notice"));
  if (pendingNoticeProductId) {
    openCustomStudio(pendingNoticeProductId);
  }
}

function handleCategoryDropdownChange(category) {
  currentCategoryFilter = category;
  renderProducts();
}

function openProductDetailModal(productId) {
  const prod = ZgDataManager.getProductById(productId);
  if (!prod) return;

  selectedDetailProductId = productId;

  const nameEl = document.getElementById("detail-prod-name");
  const imgEl = document.getElementById("detail-prod-image");
  const badgeEl = document.getElementById("detail-prod-badge");
  const stockEl = document.getElementById("detail-prod-stock-badge");
  const catEl = document.getElementById("detail-prod-category");
  const codeEl = document.getElementById("detail-prod-code");
  const priceEl = document.getElementById("detail-prod-price");
  const specsEl = document.getElementById("detail-prod-specs");
  const matEl = document.getElementById("detail-prod-material");
  const resEl = document.getElementById("detail-prod-resreq");
  const descEl = document.getElementById("detail-prod-desc");
  const btnProceed = document.getElementById("btn-detail-proceed");

  if (nameEl) nameEl.textContent = prod.name;
  if (imgEl) { imgEl.src = prod.image; imgEl.alt = prod.name; }
  if (badgeEl) badgeEl.textContent = prod.badge || "人氣限定";
  if (catEl) catEl.textContent = prod.category;
  if (codeEl) codeEl.textContent = prod.code || "ITEM";
  if (priceEl) priceEl.textContent = `NT$ ${prod.price}`;
  if (specsEl) specsEl.textContent = prod.specs || "標準校慶工藝規格";
  if (matEl) matEl.textContent = prod.material || "特級熱昇華工藝材質";
  if (resEl) resEl.textContent = prod.resolutionReq || "建議 1080P 以上 (300 DPI)";
  if (descEl) descEl.textContent = prod.description || "智光商工 115 年度第六十二屆校慶限定客製紀念商品，由資料處理科師生精心監製，採用高溫熱轉印與直噴工藝。";

  const status = prod.stockStatus || "in_stock";
  if (stockEl) {
    if (status === "in_stock") {
      stockEl.innerHTML = `<span class="stock-pill in_stock">🟢 現貨熱銷中</span>`;
      if (btnProceed) {
        btnProceed.disabled = false;
        btnProceed.style.opacity = "1";
        btnProceed.style.cursor = "pointer";
        btnProceed.innerHTML = `<span>✨ 立即客製選購 ➔</span>`;
      }
    } else if (status === "restocking") {
      stockEl.innerHTML = `<span class="stock-pill restocking">🟡 補貨中 · 支援預約</span>`;
      if (btnProceed) {
        btnProceed.disabled = false;
        btnProceed.style.opacity = "1";
        btnProceed.style.cursor = "pointer";
        btnProceed.innerHTML = `<span>🟡 預約到購物車 (到貨通知) ➔</span>`;
      }
    } else {
      stockEl.innerHTML = `<span class="stock-pill out_of_stock">🔴 暫時缺貨 (已搶光)</span>`;
      if (btnProceed) {
        btnProceed.disabled = true;
        btnProceed.style.opacity = "0.6";
        btnProceed.style.cursor = "not-allowed";
        btnProceed.innerHTML = `<span>✕ 已售罄 (暫停接單)</span>`;
      }
    }
  }

  openModal(document.getElementById("modal-product-detail"));
}

function handleDetailProceedToOrder() {
  closeModal(document.getElementById("modal-product-detail"));
  if (selectedDetailProductId) {
    promptPreOrderNotice(selectedDetailProductId);
  }
}

// 5. 商品渲染 (含分類過濾、卡片點擊彈出簡介與庫存狀態：現貨/補貨中/已搶光)
function renderProducts() {
  const grid = document.getElementById("product-grid-container") || document.getElementById("products-grid");
  if (!grid) return;
  let products = ZgDataManager.getProducts();

  let wishlistIds = [];
  try {
    wishlistIds = JSON.parse(localStorage.getItem("zg_wishlist_ids") || "[]");
  } catch (e) {
    wishlistIds = [];
  }

  // 分類過濾邏輯
  if (currentCategoryFilter && currentCategoryFilter !== "all") {
    if (currentCategoryFilter === "陶瓷工藝") {
      products = products.filter(p => p.category === "陶瓷工藝");
    } else if (currentCategoryFilter === "金屬紀念品" || currentCategoryFilter === "金屬胸章") {
      products = products.filter(p => p.category === "金屬紀念品" || p.category === "金屬胸章");
    } else if (currentCategoryFilter === "皮革配件" || currentCategoryFilter === "各式配件") {
      products = products.filter(p => p.category === "皮革配件" || p.category === "各式配件");
    } else {
      products = products.filter(p => p.category === currentCategoryFilter);
    }
  }

  // 同步下拉式選單之選取值
  const catSelect = document.getElementById("catalog-category-select");
  if (catSelect && catSelect.value !== currentCategoryFilter) {
    catSelect.value = currentCategoryFilter;
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #ffffff; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        <p style="font-size: 2.2rem; margin-bottom: 8px;">🎨</p>
        <p style="font-weight: 700; color: var(--text-primary);">該分類目前無上架商品</p>
        <button class="btn btn-secondary btn-sm" onclick="handleCategoryDropdownChange('all')" style="margin-top: 12px;">查看全部商品</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(prod => {
    const stockStatus = prod.stockStatus || "in_stock";
    const isWishlisted = wishlistIds.includes(prod.id);
    let stockBadgeHtml = "";
    let btnHtml = "";

    if (stockStatus === "in_stock") {
      stockBadgeHtml = `<span class="stock-pill in_stock">🟢 現貨熱銷中</span>`;
      btnHtml = `<button class="btn btn-primary" onclick="event.stopPropagation(); promptPreOrderNotice('${prod.id}')"><span>✨ 立即客製選購</span></button>`;
    } else if (stockStatus === "restocking") {
      stockBadgeHtml = `<span class="stock-pill restocking">🟡 補貨中 · 支援預約</span>`;
      btnHtml = `<button class="btn btn-secondary" onclick="event.stopPropagation(); promptPreOrderNotice('${prod.id}')"><span>🟡 預約到購物車 (到貨通知)</span></button>`;
    } else {
      stockBadgeHtml = `<span class="stock-pill out_of_stock">🔴 暫時缺貨 (已搶光)</span>`;
      btnHtml = `<button class="btn btn-secondary" disabled style="opacity:0.6;cursor:not-allowed;"><span>✕ 已售罄 (暫停接單)</span></button>`;
    }

    const isOutOfStock = stockStatus === "out_of_stock";

    return `
      <div class="product-card ${isOutOfStock ? 'is-out-of-stock' : ''}" data-id="${prod.id}" onclick="openProductDetailModal('${prod.id}')" style="cursor:pointer;" title="點擊檢視【${prod.name}】商品簡介與直徑尺寸規格">
        <span class="product-card-badge">${prod.badge || "人氣限定"}</span>
        <button class="wishlist-heart-btn ${isWishlisted ? 'is-active' : ''}" onclick="toggleWishlistItem(event, '${prod.id}')" title="${isWishlisted ? '已加入願望清單' : '加入願望清單'}">
          <svg viewBox="0 0 24 24"><path class="heart-svg-path" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
        <div class="product-image-box">
          <img src="${prod.image}" alt="${prod.name}" class="product-image" loading="lazy">
        </div>
        <div class="product-card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div class="product-category-tag">${prod.category}</div>
            ${stockBadgeHtml}
          </div>
          <h3 class="product-card-title" title="${prod.name}">${prod.name}</h3>
          <div class="product-spec-badge single-line" title="${prod.specs}">${prod.specs}</div>
          <div class="product-res-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span class="single-line">${prod.resolutionReq}</span>
          </div>
          <div class="product-price-row">
            <div>
              <span class="product-price-currency">NT$</span>
              <span class="product-price-amount">${prod.price}</span>
            </div>
            ${btnHtml}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function handleCategoryDropdownChange(cat) {
  currentCategoryFilter = cat || "all";
  renderProducts();
}

// ❤️ 收藏 / 願望清單心型彈跳微互動 (Heart Bounce & Spring Physics)
function toggleWishlistItem(event, productId) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  let wishlistIds = [];
  try {
    wishlistIds = JSON.parse(localStorage.getItem("zg_wishlist_ids") || "[]");
  } catch (e) {
    wishlistIds = [];
  }

  const prod = ZgDataManager.getProductById(productId);
  const prodName = prod ? prod.name : "商品";
  const index = wishlistIds.indexOf(productId);
  const btn = event ? event.currentTarget : null;

  if (index === -1) {
    wishlistIds.push(productId);
    localStorage.setItem("zg_wishlist_ids", JSON.stringify(wishlistIds));
    if (btn) {
      btn.classList.add("is-active");
      btn.title = "已加入願望清單";
    }
    showToast(`❤️ 已將【${prodName}】加入願望清單！`, "success", 2500);
    if (navigator.vibrate) {
      try { navigator.vibrate([15, 30, 20]); } catch (e) { }
    }
  } else {
    wishlistIds.splice(index, 1);
    localStorage.setItem("zg_wishlist_ids", JSON.stringify(wishlistIds));
    if (btn) {
      btn.classList.remove("is-active");
      btn.title = "加入願望清單";
    }
    showToast(`已從願望清單移除【${prodName}】`, "info", 2000);
  }
}

// 🚀 像 Instagram 一樣靈動的加入購物車拋物線飛入動畫 (Fly-to-Cart Animation)
function playFlyToCartAnimation(imgSrc) {
  try {
    let target = document.getElementById("btn-open-cart");
    if (!target || target.offsetParent === null) {
      target = document.getElementById("mob-nav-cart") || document.getElementById("island-cart-badge");
    }
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const startX = Math.max(20, Math.min(window.innerWidth - 90, window.innerWidth / 2 - 35));
    const startY = Math.max(60, Math.min(window.innerHeight - 90, window.innerHeight / 2 - 35));

    const flyingImg = document.createElement("img");
    flyingImg.src = imgSrc;
    flyingImg.className = "fly-to-cart-flying-clone";
    flyingImg.style.width = "72px";
    flyingImg.style.height = "72px";
    flyingImg.style.left = `${startX}px`;
    flyingImg.style.top = `${startY}px`;
    document.body.appendChild(flyingImg);

    requestAnimationFrame(() => {
      const destX = targetRect.left + (targetRect.width / 2) - 15;
      const destY = targetRect.top + (targetRect.height / 2) - 15;
      const diffX = destX - startX;
      const diffY = destY - startY;

      flyingImg.style.transform = `translate(${diffX}px, ${diffY}px) scale(0.2)`;
      flyingImg.style.opacity = "0.2";
    });

    setTimeout(() => {
      flyingImg.remove();
      target.classList.add("cart-bump-active");
      const islandBadge = document.getElementById("island-cart-badge");
      if (islandBadge) islandBadge.classList.add("cart-bump-active");

      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch (e) { }
      }

      setTimeout(() => {
        target.classList.remove("cart-bump-active");
        if (islandBadge) islandBadge.classList.remove("cart-bump-active");
      }, 500);
    }, 620);
  } catch (err) {
    console.warn("Fly-to-cart animation skipped:", err);
  }
}

// 5. 客製化工作室與圖檔 1080P 上傳檢驗模組
function openCustomStudio(productId) {
  const prod = ZgDataManager.getProductById(productId);
  if (!prod) return;

  selectedProductId = productId;
  currentUploadData = null;

  // 安全更新商品資訊
  const titleEl = document.getElementById("studio-prod-title") || document.getElementById("studio-prod-name");
  if (titleEl) titleEl.textContent = `✨ 客製化印製工坊 - ${prod.name}`;

  const priceTag = document.getElementById("studio-item-price-tag") || document.getElementById("studio-prod-price");
  if (priceTag) priceTag.textContent = `NT$ ${prod.price}`;

  const specsEl = document.getElementById("studio-prod-specs");
  if (specsEl) specsEl.textContent = prod.specs || `${prod.dimensions || ""} (${prod.category || ""})`;

  const resreqEl = document.getElementById("studio-prod-resreq") || document.getElementById("studio-prod-res-req");
  if (resreqEl) resreqEl.textContent = `建議解析度：${prod.resolutionReq || "1920 × 1080 (300 DPI)"}`;

  const materialEl = document.getElementById("studio-prod-material");
  if (materialEl) materialEl.textContent = prod.material || prod.category || "";

  const imgEl = document.getElementById("studio-prod-img");
  if (imgEl) imgEl.src = prod.image || "";

  // 重置表單數值
  const notesEl = document.getElementById("studio-notes");
  if (notesEl) notesEl.value = "";

  const qtyEl = document.getElementById("studio-qty");
  if (qtyEl) {
    qtyEl.value = "1";
    qtyEl.oninput = () => {
      const q = parseInt(qtyEl.value, 10) || 1;
      if (priceTag) priceTag.textContent = `NT$ ${prod.price * q}`;
    };
  }

  const fileInputEl = document.getElementById("studio-file-input");
  if (fileInputEl) fileInputEl.value = "";

  const previewImg = document.getElementById("studio-img-preview") || document.getElementById("upload-preview-box");
  if (previewImg) {
    previewImg.src = "";
    previewImg.style.display = "none";
  }

  const promptBox = document.getElementById("dropzone-prompt") || document.getElementById("upload-placeholder-box");
  if (promptBox) promptBox.style.display = "block";

  const resIndicator = document.getElementById("studio-res-indicator") || document.getElementById("upload-res-badge");
  if (resIndicator) resIndicator.style.display = "none";

  // 更新麵包屑
  const crumb = document.getElementById("crumb-product");
  if (crumb) crumb.textContent = prod.name;

  // 根據庫存狀態調整工作室按鈕
  const addToCartBtn = document.getElementById("btn-add-to-cart");
  const isRestock = (prod.stockStatus === "restocking");
  if (addToCartBtn) {
    if (isRestock) {
      addToCartBtn.innerHTML = `<span>🟡 預約加入購物車 (到貨通知)</span>`;
      addToCartBtn.className = "btn btn-secondary";
    } else {
      addToCartBtn.innerHTML = `<span>✨ 確認客製並加入購物車</span>`;
      addToCartBtn.className = "btn btn-primary";
    }
  }

  // 成功開啟客製化工作室 Modal
  const studioModal = document.getElementById("modal-custom-studio");
  if (studioModal) {
    openModal(studioModal);
  }
}

function handleFileUpload(file) {
  if (!file) return;

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return showToast("檔案格式錯誤！系統僅接受 PNG, JPG, WEBP 圖片格式", "error");
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const is1080p = width >= 1080 || height >= 1080;

      // 若圖片尺寸過大（如 3840x2400）或 Base64 檔案超過 800KB，生成高品質 1200px 壓縮預覽圖，避免灌爆 localStorage 5MB 配額
      let safeDataUrl = dataUrl;
      try {
        if (width > 1200 || height > 1200 || dataUrl.length > 800000) {
          const canvas = document.createElement("canvas");
          const maxDim = 1200;
          let targetW = width;
          let targetH = height;
          if (targetW > targetH) {
            if (targetW > maxDim) {
              targetH = Math.round((targetH * maxDim) / targetW);
              targetW = maxDim;
            }
          } else {
            if (targetH > maxDim) {
              targetW = Math.round((targetW * maxDim) / targetH);
              targetH = maxDim;
            }
          }
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, targetW, targetH);
          safeDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        }
      } catch (err) {
        console.warn("Canvas compression skipped:", err);
      }

      currentUploadData = {
        dataUrl: safeDataUrl,
        originalDataUrl: dataUrl,
        width,
        height,
        is1080p,
        resText: `${width} × ${height} px`
      };

      const previewImg = document.getElementById("studio-img-preview") || document.getElementById("upload-thumb");
      const promptBox = document.getElementById("dropzone-prompt") || document.getElementById("upload-placeholder-box");
      const resIndicator = document.getElementById("studio-res-indicator") || document.getElementById("upload-res-badge");

      if (promptBox) promptBox.style.display = "none";
      if (previewImg) {
        previewImg.src = safeDataUrl;
        previewImg.style.display = "block";
      }

      if (resIndicator) {
        resIndicator.style.display = "block";
        if (is1080p) {
          resIndicator.className = "res-badge res-pass";
          resIndicator.innerHTML = `<span>✓ 解析度達標 (1080P+ 高畫質：${width} × ${height} px)</span>`;
          showToast(`圖檔檢驗通過！解析度 ${width} × ${height} px 符合 1080P 轉印標準`, "success");
        } else {
          resIndicator.className = "res-badge res-fail";
          resIndicator.innerHTML = `<span>⚠ 低於 1080P 建議值 (${width} × ${height} px)，印製恐有微小鋸齒</span>`;
          showToast(`提醒：解析度 (${width} × ${height} px) 低於 1080P，若轉印模糊需自行負責！`, "warning");
        }
      }
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

let selectedPaletteVibe = "香檳流金 (Champagne Gold)";

function selectPaletteSwatch(btn, colorName) {
  selectedPaletteVibe = colorName;
  document.querySelectorAll(".swatch-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  showToast(`已選定 2026 配色氛圍：【${colorName}】`, "success");
}

function addToCartFromStudio() {
  const btn = document.getElementById("btn-add-to-cart");
  if (btn) setButtonLoading(btn, true);

  const prod = ZgDataManager.getProductById(selectedProductId);
  if (!prod) {
    if (btn) setButtonLoading(btn, false);
    return;
  }

  // 嚴格檢測：若未上傳客製圖檔，嚴禁加入購物車！(User Requirement)
  if (!currentUploadData || !currentUploadData.dataUrl) {
    if (btn) setButtonLoading(btn, false);
    showToast("尚未上傳客製圖檔！請先點選左側區域上傳您的圖檔（JPG / PNG），未上傳圖檔無法加入購物車！", "error", 5000);
    const dropzone = document.getElementById("studio-dropzone");
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
      dropzone.style.animation = "shake 0.5s ease-in-out";
      dropzone.style.borderColor = "#e11d48";
      setTimeout(() => {
        dropzone.style.animation = "";
        dropzone.style.borderColor = "";
      }, 2000);
    }
    return;
  }

  const qty = parseInt(document.getElementById("studio-qty")?.value, 10) || 1;
  const rawNotes = document.getElementById("studio-notes")?.value.trim() || "無特別備註";
  const stampStyle = document.getElementById("studio-stamp-select")?.value || "純淨原創圖檔";

  const notes = `${rawNotes} [鋼印風格: ${stampStyle}]`;

  // 立即關閉客製工坊視窗，避免畫面停滯
  const studioModal = document.getElementById("modal-custom-studio");
  if (studioModal) closeModal(studioModal);

  const isRestocking = (prod.stockStatus === "restocking");

  cart.push({
    id: "cart_" + Date.now(),
    productId: prod.id,
    name: prod.name,
    code: prod.code,
    price: prod.price,
    quantity: qty,
    imageUrl: currentUploadData.dataUrl,
    imageRes: currentUploadData.resText,
    notes: notes,
    paletteVibe: selectedPaletteVibe,
    stampStyle: stampStyle,
    isRestocking: isRestocking
  });

  saveCart();
  updateCartUI();
  if (btn) setButtonLoading(btn, false);

  // 🚀 像 Instagram 一樣靈動的加入購物車拋物線粒子動畫 (Fly-to-Cart Animation)
  playFlyToCartAnimation(currentUploadData.dataUrl || prod.image);

  if (isRestocking) {
    showToast(`🟡 已成功預約【${prod.name}】至購物車！目前產線補貨中，待到貨後再次造訪將會主動通知您解鎖下單！`, "warning", 6000);
  } else {
    showToast(`✨ 已成功將【${prod.name}】× ${qty} 加入購物車！`, "success");
  }

  // 延遲 420ms 後滑出購物車側邊抽屜，讓使用者先看見極致流暢的拋物線軌跡！
  setTimeout(() => {
    openCartDrawer();
  }, 420);
}

// 6. 購物車懸浮側邊欄 (Cart Drawer)
function updateCartUI() {
  renderCartItems();
  updateCartBadge();
}

function openCartDrawer() {
  renderCartItems();
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (drawer) drawer.classList.add("active");
  if (backdrop) backdrop.classList.add("active");
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (drawer) drawer.classList.remove("active");
  if (backdrop) backdrop.classList.remove("active");
}

function renderCartItems() {
  const container = document.getElementById("drawer-cart-list");
  const totalAmountEl = document.getElementById("drawer-total-amount");
  const checkoutBtn = document.getElementById("btn-drawer-checkout");

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 10px;color:var(--text-muted);">
        <p style="font-size:2.5rem;margin-bottom:10px;">🛒</p>
        <p style="font-weight:700;">購物車目前空空如也</p>
        <p style="font-size:0.85rem;margin-top:4px;">請選擇商品並上傳 1080P 圖檔客製！</p>
      </div>
    `;
    totalAmountEl.textContent = "NT$ 0";
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;
  let total = 0;

  container.innerHTML = cart.map((item, idx) => {
    const itemSubtotal = item.price * item.quantity;
    total += itemSubtotal;
    const isRestock = item.isRestocking;
    const restockBadge = isRestock 
      ? `<div class="cart-restock-tag">🟡 補貨預約中（待到貨後解鎖送單）</div>` 
      : '';

    return `
      <div class="cart-item-card">
        <img src="${item.imageUrl}" class="cart-item-thumb" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-title single-line" title="${item.name}">${item.name}</div>
          ${restockBadge}
          <div class="cart-item-note single-line" title="備註：${item.notes}">備註：${item.notes}</div>
          <div class="cart-item-price">NT$ ${item.price} × ${item.quantity} = NT$ ${itemSubtotal}</div>
        </div>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="updateCartItemQty(${idx}, -1)">-</button>
          <span style="font-weight:800;font-size:0.9rem;min-width:18px;text-align:center;">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartItemQty(${idx}, 1)">+</button>
          <button class="qty-btn" style="background:rgba(239,68,68,0.2);color:#f87171;margin-left:4px;" onclick="removeCartItem(${idx})">✕</button>
        </div>
      </div>
    `;
  }).join("");

  totalAmountEl.textContent = `NT$ ${total}`;
}

function updateCartItemQty(index, change) {
  if (!cart[index]) return;
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
  renderCartItems();
}

function removeCartItem(index) {
  cart.splice(index, 1);
  saveCart();
  renderCartItems();
  showToast("已從購物車移除品項", "warning");
}

function saveCart() {
  try {
    localStorage.setItem("zg_cart_v1", JSON.stringify(cart));
  } catch (e) {
    console.warn("localStorage quota exceeded or unavailable:", e);
  }
  updateCartBadge();
}

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem("zg_cart_v1")) || [];
  } catch (e) {
    cart = [];
  }
}

function updateCartBadge() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cart-badge-count");
  if (badge) badge.textContent = count;
  const mobBadge = document.getElementById("mob-cart-count-badge");
  if (mobBadge) mobBadge.textContent = count;
  updateDynamicIsland();
  updateStickyCartBar();
}

// iOS 靈動島 (Dynamic Island) 狀態同步
function updateDynamicIsland() {
  try {
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const countEl = document.getElementById("island-cart-count");
    if (countEl) countEl.textContent = `${totalQty} 件`;
    
    const totalEl = document.getElementById("island-total-badge");
    if (totalEl) totalEl.textContent = `NT$ ${totalAmount}`;
    
    const userEl = document.getElementById("island-user-status");
    if (userEl) {
      if (currentStudent && currentStudent.name) {
        userEl.textContent = `👤 ${currentStudent.className} ${currentStudent.name}`;
      } else {
        userEl.textContent = `💖 尚未登入學生會員`;
      }
    }
  } catch (e) {
    // 安全防護
  }
}

// 底部浮動購物列 (Sticky Add-to-Cart Bar) 即時狀態
function updateStickyCartBar() {
  try {
    const bar = document.getElementById("sticky-add-to-cart-bar");
    if (!bar) return;
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const countEl = document.getElementById("sticky-cart-count");
    const priceEl = document.getElementById("sticky-cart-price");

    if (countEl) countEl.textContent = totalQty;
    if (priceEl) priceEl.textContent = `NT$ ${totalAmount}`;

    if (totalQty > 0 || window.scrollY > 300) {
      bar.classList.remove("is-hidden");
    } else {
      bar.classList.add("is-hidden");
    }
  } catch (e) { }
}

// iOS 微互動與捲動監聽
function initIosMicroInteractions() {
  try {
    window.addEventListener("scroll", () => {
      updateStickyCartBar();
      updateBackToTopButton();
    }, { passive: true });
  } catch (e) { }
}

function updateBackToTopButton() {
  const btn = document.getElementById("btn-back-to-top");
  if (!btn) return;
  if (window.scrollY > 300) {
    btn.classList.add("is-visible");
  } else {
    btn.classList.remove("is-visible");
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleMobNavCategory() {
  const catalog = document.getElementById("catalog-section") || document.getElementById("product-grid-container");
  if (catalog) {
    catalog.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll('.mob-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('mob-nav-category')?.classList.add('active');
}

function toggleFooterAccordion(sectionId) {
  if (window.innerWidth > 768) return; // 僅在行動裝置啟用折疊
  const col = document.getElementById(sectionId);
  if (col) {
    col.classList.toggle("is-expanded");
  }
}

function handleNewsletterSubmit(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("footer-newsletter-input");
  const email = input ? input.value.trim() : "";
  if (!email) return;
  showToast("🎉 感謝訂閱！優惠折扣碼【ZG2026VIP】已為您啟用，結帳立折 NT$20！", "success", 6000);
  if (input) input.value = "";
}

function handleLanguageChange(event) {
  const lang = event?.target?.value || "zh-TW";
  const langNames = {
    "zh-TW": "🇹🇼 繁體中文 (台灣)",
    "en-US": "🇺🇸 English (US)",
    "ja-JP": "🇯🇵 日本語 (Japan)"
  };
  showToast(`🌐 介面語言已切換為：${langNames[lang] || lang}`, "info");
}

function handleCurrencyChange(event) {
  const curr = event?.target?.value || "TWD";
  showToast(`💱 結帳幣別已更新為：${curr}`, "info");
}


// 7. 結帳雙重確認機制 (Double Confirmation) 與核心自動拆單
function startCheckoutProcess() {
  if (cart.length === 0) {
    return showToast("購物車為空，請先挑選商品加入購物車！", "warning");
  }

  // 補貨中商品規則：補貨中的不能下單，只能預約到購物車，待到貨通知後方可下單
  const restockingItems = cart.filter(item => {
    const currentProd = ZgDataManager.getProductById(item.productId);
    if (item.isRestocking) {
      if (currentProd && currentProd.stockStatus === "in_stock") {
        item.isRestocking = false;
        return false;
      }
      return true;
    }
    return currentProd && currentProd.stockStatus === "restocking";
  });

  if (restockingItems.length > 0) {
    const names = restockingItems.map(i => `【${i.name}】`).join("、");
    alert(`⚠️ 購物車含有排程補貨中的預約品項：${names}\n\n依規定「補貨中商品只能預約至購物車，無法立即送單結帳」！\n請待產線完成補貨（之後再開啟網站時會自動通知您到貨），屆時即可立即正式送單。\n\n💡 若您想先購買其他現貨商品，請先點擊預約品項右側的「✕」將其移出購物車。`);
    return showToast("⚠️ 購物車含有補貨預約品項，待到貨通知後方可下單！", "warning", 6000);
  }

  closeCartDrawer();
  populateDoubleConfirmModal();
  const modal = document.getElementById("modal-checkout-confirm") || document.getElementById("modal-double-confirm");
  if (modal) {
    openModal(modal);
  }
}

function populateDoubleConfirmModal() {
  // 檢查是否有當前已登入學生資訊
  currentStudent = ZgDataManager.getCurrentUser();

  const inputId = document.getElementById("confirm-input-student-id");
  const inputName = document.getElementById("confirm-input-student-name");
  const inputClass = document.getElementById("confirm-input-student-class");
  const inputSeat = document.getElementById("confirm-input-student-seat");
  const inputGender = document.getElementById("confirm-input-student-gender");
  const inputPhone = document.getElementById("confirm-input-student-phone");
  const authBadge = document.getElementById("checkout-auth-badge");

  if (currentStudent && currentStudent.studentId) {
    if (inputId) inputId.value = currentStudent.studentId;
    if (inputName) inputName.value = currentStudent.name || "";
    if (inputClass) inputClass.value = currentStudent.className || "";
    if (inputSeat) inputSeat.value = parseInt(currentStudent.seatNo, 10) || "";
    if (inputGender) inputGender.value = currentStudent.gender || "男";
    if (inputPhone) inputPhone.value = currentStudent.phone || "";
    if (authBadge) authBadge.textContent = `✓ 已登入會員：${currentStudent.className} ${parseInt(currentStudent.seatNo, 10)}號 ${currentStudent.name}`;
  } else {
    if (authBadge) authBadge.textContent = "✎ 請確認或填寫以下取件個資";
  }

  // 舊版唯讀欄位相容性防呆
  const idEl = document.getElementById("confirm-student-id");
  const nameEl = document.getElementById("confirm-student-name");
  const genderEl = document.getElementById("confirm-student-gender");
  const classEl = document.getElementById("confirm-student-class");
  const seatEl = document.getElementById("confirm-student-seat");
  const phoneEl = document.getElementById("confirm-student-phone");

  if (idEl) idEl.textContent = currentStudent ? currentStudent.studentId : "";
  if (nameEl) nameEl.textContent = currentStudent ? currentStudent.name : "";
  if (genderEl) genderEl.textContent = currentStudent ? currentStudent.gender : "";
  if (classEl) classEl.textContent = currentStudent ? currentStudent.className : "";
  if (seatEl) seatEl.textContent = currentStudent ? currentStudent.seatNo : "";
  if (phoneEl) phoneEl.textContent = currentStudent ? currentStudent.phone : "";

  // 渲染購物車品項
  const itemsContainer = document.getElementById("confirm-items-list") || document.getElementById("confirm-items-summary");
  const finalTotalEl = document.getElementById("confirm-total-amount") || document.getElementById("confirm-final-total");

  let total = 0;
  if (itemsContainer) {
    total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    itemsContainer.innerHTML = cart.map(item => {
      const sub = item.price * item.quantity;
      return `
        <div style="background:#ffffff;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:var(--shadow-sm);margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${item.imageUrl}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;background:#f3f4f6;border:1px solid var(--border-subtle);">
            <div>
              <div style="font-weight:700;color:var(--text-primary);font-size:0.92rem;">${item.name} × ${item.quantity} 件</div>
              <div style="font-size:0.75rem;color:var(--text-muted);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.notes}">備註：${item.notes}</div>
              <div style="font-size:0.72rem;color:var(--sage-green);font-weight:700;">${item.imageRes || "1080P/300DPI"}</div>
            </div>
          </div>
          <div style="font-weight:800;color:#e11d48;font-size:1.05rem;">NT$ ${sub}</div>
        </div>
      `;
    }).join("");
  }

  if (finalTotalEl) {
    finalTotalEl.textContent = `NT$ ${total}`;
  }

  const agreeCheck = document.getElementById("confirm-agree-terms");
  if (agreeCheck) agreeCheck.checked = true;
}

function submitFinalOrder() {
  const btn = document.getElementById("btn-confirm-submit");
  if (btn && btn.disabled) return;

  const agreeCheck = document.getElementById("confirm-agree-terms");
  if (agreeCheck && !agreeCheck.checked) {
    return showToast("請勾選確認條款，同意客製化商品印製規範及資安承諾！", "warning");
  }

  if (cart.length === 0) {
    return showToast("購物車為空，無法送出訂單！", "error");
  }

  // 取得個資輸入欄位
  const inputIdEl = document.getElementById("confirm-input-student-id");
  let studentProfile = null;

  if (inputIdEl) {
    const inputId = inputIdEl.value.trim();
    const inputName = document.getElementById("confirm-input-student-name")?.value.trim();
    const inputClass = document.getElementById("confirm-input-student-class")?.value.trim();
    const inputSeat = document.getElementById("confirm-input-student-seat")?.value.trim();
    const inputGender = document.getElementById("confirm-input-student-gender")?.value || "男";
    const inputPhone = document.getElementById("confirm-input-student-phone")?.value.trim();

    if (!inputId || !/^\d{6}$/.test(inputId)) {
      return showToast("學生學號必須為 6 碼數字（例如：112001）！", "error", 5000);
    }
    if (!inputId || !inputName || !inputClass || !inputSeat || !inputPhone) {
      return showToast("請完整填寫 6 項學生訂購人個資（學號、姓名、班級、座號、性別、電話）！", "error", 5000);
    }

    studentProfile = {
      studentId: inputId,
      name: inputName,
      className: inputClass,
      seatNo: String(parseInt(inputSeat, 10)),
      gender: inputGender,
      phone: inputPhone
    };

    // 嚴格班級座號唯一性驗證與原子級資料庫更新
    const upsertRes = ZgDataManager.upsertStudent(studentProfile);
    if (!upsertRes.success) {
      alert(upsertRes.message);
      return showToast(upsertRes.message, "error", 6000);
    }

    currentStudent = upsertRes.student;
    updateStudentUI();
  } else {
    studentProfile = currentStudent;
    if (!studentProfile || !studentProfile.studentId) {
      return showToast("請先填寫訂購人 6 大欄位個資或完成學生登入！", "error");
    }
  }

  if (btn) setButtonLoading(btn, true);

  // 整理購物車品項與總金額
  const cartSummary = cart.map(item => `${item.name} × ${item.quantity}`).join(", ");
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const customerName = studentProfile?.name || document.getElementById("confirm-input-student-name")?.value || "現場顧客";

  (async () => {
    // 1. 同步寫入 Supabase 雲端資料庫 orders 資料表
    if (zgSupabaseClient) {
      try {
        const studentInfoStr = `${studentProfile?.className || ''} ${studentProfile?.seatNo || ''}號 ${studentProfile?.name || customerName} (${studentProfile?.studentId || ''})`;
        const fullCustomerName = studentProfile?.studentId ? `${customerName} [${studentProfile.studentId}]` : customerName;
        const { data, error } = await zgSupabaseClient.from('orders').insert([
          {
            customer_name: fullCustomerName,
            order_items: `${cartSummary} | 班級座號: ${studentInfoStr} | 電話: ${studentProfile?.phone || ''}`,
            total_price: Number(cartTotal),
            status: '待處理'
          }
        ]);

        if (error) {
          console.error('[Supabase 雲端下單失敗]', error);
          showToast(`雲端同步警示：${error.message}`, 'warning', 6000);
        } else {
          console.log('[Supabase 雲端下單成功]', data);
          showToast('🎉 下單成功！訂單已即時同步到雲端與後台！', 'success', 5000);
        }
      } catch (cloudErr) {
        console.error('[Supabase 連線異常]', cloudErr);
      }
    }

    // 2. 執行核心品項智慧自動拆單與寫入本地資料庫 (保持原有列印與管理完全相容)
    const result = ZgDataManager.splitAndCreateOrders(cart, studentProfile);

    // 清空購物車
    cart = [];
    saveCart();
    renderCartItems();
    updateCartBadge();

    if (btn) setButtonLoading(btn, false);
    const checkoutModal = document.getElementById("modal-checkout-confirm") || document.getElementById("modal-double-confirm");
    if (checkoutModal) closeModal(checkoutModal);

    // 彈出訂單完成視窗
    openOrderSuccessModal(result.parentOrderId, result.createdOrders);
  })();
}

function openOrderSuccessModal(parentOrderId, createdOrders) {
  const modal = document.getElementById("modal-order-success");
  if (!modal) {
    showToast(`🎉 訂單已成功送出！訂單編號：${parentOrderId}`, "success");
    return;
  }
  const pidEl = document.getElementById("success-parent-order-id");
  if (pidEl) pidEl.textContent = parentOrderId;

  const listEl = document.getElementById("success-child-orders-list");
  if (listEl) {
    listEl.innerHTML = createdOrders.map(order => `
      <div style="background:var(--bg-subtle-warm);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:700;color:var(--teal-primary);font-family:monospace;">${order.id}</div>
          <div style="font-size:0.85rem;color:var(--text-primary);font-weight:700;">${order.productName} × ${order.quantity} 件</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">三聯單流水號：NO.${order.slipNo}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800;color:#e11d48;">NT$ ${order.totalPrice}</div>
          <span class="badge badge-warning" style="font-size:0.7rem;">${order.qcStatus}</span>
        </div>
      </div>
    `).join("");
  }

  openModal(modal);
}

// 8. 學生訂單進度查詢 (輸入學號直接查詢)
function openOrderLookupModal() {
  const modal = document.getElementById("modal-order-lookup");
  if (currentStudent && currentStudent.studentId) {
    document.getElementById("lookup-student-id").value = currentStudent.studentId;
    searchStudentOrders();
  }
  openModal(modal);
}

function formatTaiwanOrderTime(timeStr) {
  if (!timeStr) return "";
  if (timeStr.includes("T") || timeStr.endsWith("Z")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      const secs = String(d.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    }
  }
  return timeStr;
}

async function searchStudentOrders() {
  const studentId = document.getElementById("lookup-student-id").value.trim();
  const resultBox = document.getElementById("lookup-results-box");

  if (!studentId) {
    return showToast("請輸入要查詢的學生學號！", "error");
  }

  let allOrders = ZgDataManager.getOrders();
  let studentOrders = allOrders.filter(o => o.studentId === studentId);

  // 若手機本地查無訂單，從 Supabase 雲端資料庫撈取並呈現在手機上
  if (studentOrders.length === 0 && zgSupabaseClient) {
    try {
      const { data: cloudOrders, error } = await zgSupabaseClient
        .from('orders')
        .select('*')
        .ilike('customer_name', `%${studentId}%`);

      if (!error && cloudOrders && cloudOrders.length > 0) {
        cloudOrders.forEach(co => {
          studentOrders.push({
            id: `CLOUD-${co.id}`,
            productName: co.order_items || "客製化商品",
            quantity: 1,
            totalPrice: Number(co.total_price) || 0,
            qcStatus: co.status === "待處理" ? "待審核" : (co.status || "待審核"),
            prodStatus: "排單印製中",
            deliveryStatus: "待配送",
            paymentStatus: "未收款",
            createdAt: co.created_at || getTaiwanNowString()
          });
        });
      }
    } catch (e) {
      console.warn("Supabase 訂單查詢異常：", e);
    }
  }

  if (studentOrders.length === 0) {
    resultBox.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--text-muted);background:var(--bg-elevated);border-radius:var(--radius-md);border:1px dashed var(--border-subtle);">
        查無學號 [${studentId}] 的任何訂單，請確認學號或完成結帳！
      </div>
    `;
    return;
  }

  resultBox.innerHTML = studentOrders.map(order => {
    let qcBadgeClass = "badge-pending";
    if (order.qcStatus === "審核通過") qcBadgeClass = "badge-approved";
    else if (order.qcStatus === "退件") qcBadgeClass = "badge-rejected";

    // 簽收表外送狀態（待配送 / 配送中 / 已送達班級）
    const delivery = order.deliveryStatus || "待配送";
    let deliveryBadgeHtml = "";
    if (delivery === "已送達班級") {
      deliveryBadgeHtml = `<span style="font-size:0.75rem;font-weight:800;padding:3px 9px;border-radius:12px;background:#dcfce7;color:#15803d;display:inline-flex;align-items:center;gap:4px;">🎉 已送達班級簽收</span>`;
    } else if (delivery === "配送中") {
      deliveryBadgeHtml = `<span style="font-size:0.75rem;font-weight:800;padding:3px 9px;border-radius:12px;background:#dbeafe;color:#1e40af;display:inline-flex;align-items:center;gap:4px;">🚚 配送中 (外送員出發中)</span>`;
    } else {
      deliveryBadgeHtml = `<span style="font-size:0.75rem;font-weight:800;padding:3px 9px;border-radius:12px;background:#fef3c7;color:#b45309;display:inline-flex;align-items:center;gap:4px;">🛵 待配送 (等待製作或派單)</span>`;
    }

    // 現金收款狀態
    const payment = order.paymentStatus || "未收款";
    const paymentBadgeHtml = payment === "已收款"
      ? `<span style="font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:4px;background:#dcfce7;color:#15803d;">🟢 現金已收款</span>`
      : `<span style="font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:4px;background:#fee2e2;color:#991b1b;">🔴 現金未收款 (備妥交予外送員)</span>`;

    // 產線印製進度
    const prod = order.prodStatus || "待印製";
    const prodBadgeHtml = `<span style="font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.15);color:var(--text-secondary);">⚙️ 產線：${prod}</span>`;

    // 三聯單列印標記
    const slipBadgeHtml = order.isPrintedSlip
      ? `<span style="font-size:0.72rem;color:#10b981;font-weight:700;">📄 三聯單：✓ 團隊已列印備查</span>`
      : `<span style="font-size:0.72rem;color:var(--text-muted);">📄 三聯單：準備列印中</span>`;

    const displayTime = formatTaiwanOrderTime(order.createdAt);

    let extraNotice = "";
    if (order.qcStatus === "審核通過") {
      extraNotice = `
        <div style="margin-top:10px;font-size:0.8rem;color:#10b981;background:rgba(16,185,129,0.1);padding:8px 12px;border-radius:6px;border:1px solid rgba(16,185,129,0.2);">
          ✓ 審核通過！商品排程印製中，外送專員將送達 <strong>${order.className}</strong> 班級親簽驗收！
        </div>
      `;
    } else if (order.qcStatus === "退件") {
      extraNotice = `
        <div style="margin-top:10px;font-size:0.8rem;color:#f87171;background:rgba(239,68,68,0.1);padding:8px 12px;border-radius:6px;border:1px solid rgba(239,68,68,0.2);">
          ✕ 圖檔退件原因：${order.qcNote || "圖檔不符合印刷規範，請至首頁重新上傳 1080P 清晰原圖"}
          ${order.daysSinceReview >= 4 ? "<br><strong>⚠ 提醒：已逾期第 4 天未更換圖檔，外送組將發送紙本通知單至班級！</strong>" : ""}
        </div>
      `;
    }

    return `
      <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;margin-bottom:14px;box-shadow:var(--shadow-sm);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <div>
            <span style="font-size:0.75rem;color:var(--text-muted);margin-right:6px;">工單代碼</span>
            <strong style="color:var(--gold-glow);font-family:monospace;font-size:0.95rem;">${order.id}</strong>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <span style="font-size:0.8rem;font-weight:800;padding:2px 8px;border-radius:4px;" class="${qcBadgeClass}">${order.qcStatus}</span>
            ${deliveryBadgeHtml}
          </div>
        </div>

        <div style="display:flex;gap:12px;align-items:center;margin-top:8px;">
          <img src="${order.imageUrl}" style="width:56px;height:56px;border-radius:6px;object-fit:cover;border:1px solid var(--border-subtle);flex-shrink:0;">
          <div style="flex-grow:1;">
            <div style="font-weight:800;color:#fff;font-size:0.95rem;">${order.productName} × ${order.quantity} 件</div>
            <div style="font-weight:800;color:#ff6584;margin-top:2px;">金額：NT$ ${order.totalPrice}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
              🕒 下單時間：<strong style="color:var(--teal-primary);">${displayTime}</strong> | 三聯單號：NO.${order.slipNo}
            </div>
          </div>
        </div>

        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--border-subtle);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <div style="display:flex;gap:6px;align-items:center;">
            ${paymentBadgeHtml}
            ${prodBadgeHtml}
          </div>
          <div>${slipBadgeHtml}</div>
        </div>

        ${extraNotice}
      </div>
    `;
  }).join("");
}

// 9. 通用 Modal 操作函式
function openModal(modal) {
  if (!modal) return;
  modal.classList.add("active");
  if (document.body) document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("active");
  if (document.body) document.body.style.overflow = "";
}

// ==========================================
// 10. 2026 設計趨勢大師課隨堂測驗互動系統
// ==========================================
const QUIZ_QUESTIONS = [
  {
    q: "1. 在 2026 年，UI/UX 產品團隊用來判斷一個設計好不好的核心 KPI 正在轉變為什麼？",
    options: [
      "Time on Site（用戶停留時間）",
      "Page Views（頁面瀏覽數）",
      "Resolution Velocity（解決速度/意圖抵達完成的速度）",
      "Daily Active Users（日活躍用戶）"
    ],
    ans: 2,
    explanation: "2026年好設計的指標已從「停留時間」轉向「解決速度 (Resolution Velocity)」，以最快速度幫使用者達成意圖並安心離開流程。"
  },
  {
    q: "2. WGSN 揭曉的 2026 年趨勢主色「變革藍綠色」（Transformative Teal）在心理層面上呼應了什麼？",
    options: [
      "強烈搶眼的數位潮流與人工智慧速度感",
      "後疫情時代人心渴望安定、尋求平衡與療癒的心理",
      "傳統冷調工業風與極簡主義的復興",
      "純粹為了防污與耐髒的實用主義"
    ],
    ans: 1,
    explanation: "變革藍綠色介於藍色的理性與綠色的生機，象徵轉型、希望與心靈安全感。"
  },
  {
    q: "3. 對於 2026 年流行的霧面（Matte）與絲緞（Satin）車身漆面，以下哪一項保養流程是錯誤的？",
    options: [
      "沖洗時水壓建議控制在 1200 psi 以下，保持至少 30 公分距離",
      "使用 pH 中性泡沫噴霧進行預洗浸泡，不直接沖洗乾泥垢",
      "為了徹底去除頑固髒污，應使用「美容粘土（Clay Bar）」來回摩擦",
      "乾燥時使用超細纖維巾點壓吸水（Blotting），禁止橫向拖拉"
    ],
    ans: 2,
    explanation: "美容粘土會磨損霧面微觀漫反射結構導致漆面永久發亮，必須嚴格禁止使用！"
  },
  {
    q: "4. EasyStore 提到的 2026 電商趨勢中，「UCX」代表什麼概念？",
    options: [
      "用戶自行客製化設計（User Customized eXperience）",
      "全通路顧客整合體驗（Unified Customer Experience）",
      "跨國電商物流系統（Universal Crossborder eXchange）",
      "用戶流失預測模型（User Churn eXtinction）"
    ],
    ans: 1,
    explanation: "UCX (Unified Customer Experience) 全通路整合網購、實體門市 POS、會員積分與跨店服務。"
  },
  {
    q: "5. 法國奢侈品牌 LOUIS VUITTON 的 LOGO 之所以看起來極具高級感，其字體設計的秘密在於？",
    options: [
      "選擇了隨性奔放的手寫字體",
      "選擇了「Futura」字型並刻意拉寬、調整字母間距",
      "使用高飽和度的多種顏色字型進行層次堆疊",
      "完全交由 AI 隨機生成了無規律的字型"
    ],
    ans: 1,
    explanation: "字距（Kerning）拉寬創造出尊榮從容的負空間與呼吸感，提升品牌的知覺溢價。"
  }
];

function openDesignQuizModal() {
  renderQuizQuestions();
  openModal(document.getElementById("modal-design-quiz"));
}

function renderQuizQuestions() {
  const container = document.getElementById("quiz-container");
  if (!container) return;

  container.innerHTML = QUIZ_QUESTIONS.map((item, qIdx) => `
    <div style="background:#ffffff;border:1.5px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;box-shadow:var(--shadow-sm);">
      <div style="font-weight:800;color:var(--text-primary);font-size:0.95rem;margin-bottom:12px;">${item.q}</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${item.options.map((opt, optIdx) => `
          <button class="quiz-option-btn" id="q_${qIdx}_opt_${optIdx}" onclick="checkQuizAnswer(${qIdx}, ${optIdx}, this)">
            <span>${opt}</span>
            <span class="quiz-feedback-mark" style="font-weight:800;"></span>
          </button>
        `).join("")}
      </div>
      <div id="q_${qIdx}_exp" style="display:none;margin-top:10px;font-size:0.82rem;line-height:1.5;padding:8px 12px;border-radius:6px;"></div>
    </div>
  `).join("");
}

function checkQuizAnswer(qIdx, optIdx, btn) {
  const item = QUIZ_QUESTIONS[qIdx];
  const expBox = document.getElementById(`q_${qIdx}_exp`);

  // 鎖定該題按鈕
  for (let i = 0; i < item.options.length; i++) {
    const b = document.getElementById(`q_${qIdx}_opt_${i}`);
    if (b) b.disabled = true;
  }

  if (optIdx === item.ans) {
    btn.classList.add("correct");
    btn.querySelector(".quiz-feedback-mark").textContent = "✓ 正確！";
    expBox.style.display = "block";
    expBox.style.background = "var(--sage-soft)";
    expBox.style.color = "var(--sage-green)";
    expBox.innerHTML = `<strong>解析：</strong>${item.explanation}`;
    showToast("回答正確！掌握了 2026 設計大勢的核心精髓！", "success");
  } else {
    btn.classList.add("wrong");
    btn.querySelector(".quiz-feedback-mark").textContent = "✕ 不正確";

    // 標亮正確答案
    const correctBtn = document.getElementById(`q_${qIdx}_opt_${item.ans}`);
    if (correctBtn) {
      correctBtn.classList.add("correct");
      correctBtn.querySelector(".quiz-feedback-mark").textContent = "✓ 這是正解";
    }

    expBox.style.display = "block";
    expBox.style.background = "var(--alert-soft)";
    expBox.style.color = "var(--alert-crimson)";
    expBox.innerHTML = `<strong>解析：</strong>${item.explanation}`;
    showToast("答案有誤，已為您顯示 2026 大師課正確解析！", "warning");
  }
}

// ==========================================
// 11. 行動 App 下載與安裝互動系統 (Android APK & iOS Safari)
// ==========================================
let deferredPwaPrompt = null;

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    console.log('[PWA] 已捕捉到系統原生安裝事件');
  });
}


function openAppDownloadModal() {
  const modal = document.getElementById("modal-app-download");
  const urlDisplay = document.getElementById("copy-url-display");
  if (urlDisplay) {
    urlDisplay.textContent = window.location.href;
  }

  // 智慧偵測：若用戶是 iOS 裝置 (iPhone/iPad/iPod)，自動切換至 iOS 分頁
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    switchAppTab('ios');
  } else {
    switchAppTab('android');
  }

  openModal(modal);
}

function closeAppDownloadModal() {
  closeModal(document.getElementById("modal-app-download"));
}

function switchAppTab(tabName) {
  // 切換按鈕狀態
  document.getElementById("tab-btn-android")?.classList.toggle("active", tabName === 'android');
  document.getElementById("tab-btn-ios")?.classList.toggle("active", tabName === 'ios');
  document.getElementById("tab-btn-qr")?.classList.toggle("active", tabName === 'qr');

  // 切換面板顯示
  const pAndroid = document.getElementById("app-panel-android");
  const pIos = document.getElementById("app-panel-ios");
  const pQr = document.getElementById("app-panel-qr");

  if (pAndroid) pAndroid.style.display = tabName === 'android' ? 'block' : 'none';
  if (pIos) pIos.style.display = tabName === 'ios' ? 'block' : 'none';
  if (pQr) pQr.style.display = tabName === 'qr' ? 'block' : 'none';
}

function triggerPwaInstall() {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    deferredPwaPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('感謝安裝 ZG創客商城 官方 App！', 'success');
      } else {
        showToast('已取消安裝，您仍可隨時下載 APK 或在瀏覽器使用！', 'info');
      }
      deferredPwaPrompt = null;
    });
  } else {
    showToast('已為您觸發安裝引導！若未跳出提示，可點擊上方【立即下載 APK】直接安裝。', 'info');
  }
}

function copySiteUrl() {
  const url = window.location.href;
  copyTextToClipboard(url, '商城網址已複製！請於手機 Safari/Chrome 貼上開啟');
}

function copyLanUrl() {
  const lanUrl = 'http://192.168.0.10:8080/';
  copyTextToClipboard(lanUrl, '📱 手機專用區域網路網址 (http://192.168.0.10:8080/) 已複製！');
}

function copyTextToClipboard(text, successMsg) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => {
      prompt('請複製以下專案網址：', text);
    });
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMsg, 'success');
    } catch (err) {
      prompt('請複製以下專案網址：', text);
    }
    document.body.removeChild(textArea);
  }
}

function handleMobNavHome() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.mob-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('mob-nav-home')?.classList.add('active');
}

// 12. 事件監聽設置
function setupEventListeners() {
  // 檔案拖曳與選擇
  const dropzone = document.getElementById("studio-dropzone");
  const fileInput = document.getElementById("studio-file-input");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      if (e.dataTransfer.files.length) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) {
        handleFileUpload(e.target.files[0]);
      }
    });
  }

  // 下載/安裝手機 App 按鈕
  document.getElementById("btn-open-app-modal")?.addEventListener("click", openAppDownloadModal);

  // 購物車側邊欄抽屜
  document.getElementById("btn-open-cart")?.addEventListener("click", openCartDrawer);
  document.getElementById("btn-close-cart")?.addEventListener("click", closeCartDrawer);
  document.getElementById("drawer-backdrop")?.addEventListener("click", closeCartDrawer);
  document.getElementById("btn-drawer-checkout")?.addEventListener("click", startCheckoutProcess);

  // 學生會員與個人資料修改表單
  document.getElementById("user-status-pill")?.addEventListener("click", openStudentAuthModal);
  document.getElementById("form-student-login")?.addEventListener("submit", handleStudentLogin);
  document.getElementById("form-student-register")?.addEventListener("submit", handleStudentRegister);
  document.getElementById("form-student-profile")?.addEventListener("submit", handleSaveStudentProfile);

  // 客製工作室加入購物車
  document.getElementById("btn-add-to-cart")?.addEventListener("click", addToCartFromStudio);

  // 雙重確認送出
  document.getElementById("btn-confirm-submit")?.addEventListener("click", submitFinalOrder);

  // 訂單查詢按鈕
  document.getElementById("btn-open-lookup")?.addEventListener("click", openOrderLookupModal);
  document.getElementById("btn-do-lookup")?.addEventListener("click", searchStudentOrders);

  // 2026 美學導覽與測驗按鈕
  document.getElementById("btn-open-quiz")?.addEventListener("click", openDesignQuizModal);

  // 結帳個資：輸入學號時自動檢索資料庫並自動帶入姓名、班級、座號、性別、電話
  const chkStudentId = document.getElementById("confirm-input-student-id");
  if (chkStudentId) {
    const autoFillHandler = (e) => {
      const sId = (e.target.value || "").trim();
      if (sId.length >= 3) {
        const student = ZgDataManager.getStudents().find(s => s.studentId === sId);
        if (student) {
          const inputName = document.getElementById("confirm-input-student-name");
          const inputClass = document.getElementById("confirm-input-student-class");
          const inputSeat = document.getElementById("confirm-input-student-seat");
          const inputGender = document.getElementById("confirm-input-student-gender");
          const inputPhone = document.getElementById("confirm-input-student-phone");
          const authBadge = document.getElementById("checkout-auth-badge");

          if (inputName) inputName.value = student.name || "";
          if (inputClass) inputClass.value = student.className || "";
          if (inputSeat) inputSeat.value = parseInt(student.seatNo, 10) || "";
          if (inputGender) inputGender.value = student.gender || "不方便透露";
          if (inputPhone) inputPhone.value = student.phone || "";
          if (authBadge) authBadge.textContent = `✨ 已自動帶出【${student.name} 同學】資料`;
          showToast(`✨ 已自動帶出學號 [${sId}] 登記之姓名、科系班級與聯絡資訊！`, "info", 3000);
        }
      }
    };
    chkStudentId.addEventListener("blur", autoFillHandler);
    chkStudentId.addEventListener("change", autoFillHandler);
  }

  // 點擊 Modal 外部或關閉按鈕
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
    modal.querySelectorAll(".modal-close-trigger").forEach(btn => {
      btn.addEventListener("click", () => closeModal(modal));
    });
  });
}

// 確保所有 HTML 標籤內 inline onclick 事件函式均成功掛載至 window
if (typeof window !== "undefined") {
  window.handleMobNavHome = handleMobNavHome;
  window.handleMobNavCategory = handleMobNavCategory;
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
  window.openStudentAuthModal = openStudentAuthModal;
  window.closeStudentAuthModal = closeStudentAuthModal;
  window.switchAuthTab = switchAuthTab;
  window.handleStudentLogin = handleStudentLogin;
  window.handleStudentRegister = handleStudentRegister;
  window.handleStudentLogout = handleStudentLogout;
  window.openStudentProfileModal = openStudentProfileModal;
  window.closeStudentProfileModal = closeStudentProfileModal;
  window.handleSaveStudentProfile = handleSaveStudentProfile;
  window.openOrderLookupModal = openOrderLookupModal;
  window.searchStudentOrders = searchStudentOrders;
  window.openDesignQuizModal = openDesignQuizModal;
  window.openAppDownloadModal = openAppDownloadModal;
  window.closeAppDownloadModal = closeAppDownloadModal;
  window.switchAppTab = switchAppTab;
  window.triggerPwaInstall = triggerPwaInstall;
  window.copySiteUrl = copySiteUrl;
  window.copyLanUrl = copyLanUrl;
  window.startCheckoutProcess = startCheckoutProcess;
  window.submitFinalOrder = submitFinalOrder;
  window.openOrderSuccessModal = openOrderSuccessModal;
  window.promptPreOrderNotice = promptPreOrderNotice;
  window.confirmNoticeAndOpenStudio = confirmNoticeAndOpenStudio;
  window.openProductDetailModal = openProductDetailModal;
  window.openCustomStudio = openCustomStudio;
  window.addToCartFromStudio = addToCartFromStudio;
  window.toggleWishlistItem = toggleWishlistItem;
  window.updateCartItemQty = updateCartItemQty;
  window.removeCartItem = removeCartItem;
  window.updateBackToTopButton = updateBackToTopButton;
  window.scrollToTop = scrollToTop;
  window.toggleFooterAccordion = toggleFooterAccordion;
  window.handleNewsletterSubmit = handleNewsletterSubmit;
  window.handleLanguageChange = handleLanguageChange;
  window.handleCurrencyChange = handleCurrencyChange;
  window.handleCategoryDropdownChange = handleCategoryDropdownChange;
  window.checkRestockArrivalNotice = checkRestockArrivalNotice;
  window.handleGoToCartAfterRestock = handleGoToCartAfterRestock;
}

