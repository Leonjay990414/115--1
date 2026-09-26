/**
 * 智光商工 115學年度 第62屆校慶園遊會 - 前端商城業務邏輯 (Customer Storefront)
 * 涵蓋：6大必填個資、圖檔 1080P 檢驗、購物車側邊欄、雙重確認結帳、品項自動拆單與訂單查詢
 */

// 全域狀態
let currentStudent = null;
let cart = [];
let currentUploadData = null; // 暫存上傳圖檔資訊 (dataUrl, width, height, is1080p)
let selectedProductId = null;

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initStudentAuth();
  loadCart();
  renderProducts();
  setupEventListeners();
  updateCartBadge();
});

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

// 3. 會員註冊與登入機制 (嚴格班級座號唯一性驗證)
function initStudentAuth() {
  currentStudent = ZgDataManager.getCurrentUser();
  updateStudentUI();
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
}

function openStudentAuthModal() {
  const modal = document.getElementById("modal-student-auth");
  // 若未登入，預設開啟登入分頁
  switchAuthTab(currentStudent ? "register" : "login");
  openModal(modal);
}

function switchAuthTab(tab) {
  const btnLogin = document.getElementById("auth-tab-btn-login");
  const btnReg = document.getElementById("auth-tab-btn-register");
  const panelLogin = document.getElementById("auth-panel-login");
  const panelReg = document.getElementById("auth-panel-register");

  if (btnLogin) btnLogin.classList.toggle("active", tab === "login");
  if (btnReg) btnReg.classList.toggle("active", tab === "register");
  if (panelLogin) panelLogin.style.display = tab === "login" ? "block" : "none";
  if (panelReg) panelReg.style.display = tab === "register" ? "block" : "none";
}

function handleStudentLogin(event) {
  if (event) event.preventDefault();
  const inputEl = document.getElementById("login-student-id");
  if (!inputEl) return;
  const studentId = inputEl.value.trim();

  if (!studentId) {
    return showToast("請輸入學生學號！", "error");
  }

  const result = ZgDataManager.loginStudent(studentId);
  if (result.success) {
    currentStudent = result.student;
    updateStudentUI();
    closeModal(document.getElementById("modal-student-auth"));
    showToast(`歡迎回來，${result.student.className} ${result.student.name} 同學！`, "success");
  } else {
    showToast(result.message, "error");
  }
}

function handleStudentRegister(event) {
  if (event) event.preventDefault();
  const studentId = document.getElementById("reg-student-id").value.trim();
  const name = document.getElementById("reg-student-name").value.trim();
  const className = document.getElementById("reg-student-class").value.trim();
  const seatNo = document.getElementById("reg-student-seat").value.trim();
  const gender = document.getElementById("reg-student-gender").value;
  const phone = document.getElementById("reg-student-phone").value.trim();

  if (!studentId || studentId.length < 4) {
    return showToast("請輸入完整的學號（至少4碼）", "error");
  }
  if (!className) {
    return showToast("請填寫班級（如：資三1）", "error");
  }
  if (!seatNo || isNaN(seatNo) || parseInt(seatNo) < 1 || parseInt(seatNo) > 65) {
    return showToast("請填寫有效座號（1 ~ 65 號）", "error");
  }
  if (!name || name.length < 2) {
    return showToast("請填写真實姓名", "error");
  }
  if (!phone || !/^09\d{8}$/.test(phone)) {
    return showToast("請填寫正確的手機號碼（例：0912345678）", "error");
  }

  const result = ZgDataManager.registerStudent({
    studentId, name, className, seatNo, gender, phone
  });

  if (result.success) {
    currentStudent = result.student;
    updateStudentUI();
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

let currentCategoryFilter = "all";

function filterCatalog(category, btn) {
  currentCategoryFilter = category;
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  if (btn) {
    btn.classList.add("active");
  } else {
    const matchingBtn = document.querySelector(`.filter-pill[data-cat="${category}"]`);
    if (matchingBtn) matchingBtn.classList.add("active");
  }
  renderProducts();
}

// 5. 商品渲染 (含分類過濾與庫存狀態：現貨/補貨中/已搶光)
function renderProducts() {
  const grid = document.getElementById("product-grid-container") || document.getElementById("products-grid");
  if (!grid) return;
  let products = ZgDataManager.getProducts();

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

  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #ffffff; border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        <p style="font-size: 2.2rem; margin-bottom: 8px;">🎨</p>
        <p style="font-weight: 700; color: var(--text-primary);">該分類目前無上架商品</p>
        <button class="btn btn-secondary btn-sm" onclick="filterCatalog('all')" style="margin-top: 12px;">查看全部商品</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(prod => {
    const stockStatus = prod.stockStatus || "in_stock";
    let stockBadgeHtml = "";
    let btnHtml = "";

    if (stockStatus === "in_stock") {
      stockBadgeHtml = `<span class="stock-pill in_stock">🟢 現貨熱銷中</span>`;
      btnHtml = `<button class="btn btn-primary" onclick="promptPreOrderNotice('${prod.id}')" style="background:linear-gradient(135deg, #ff6584, #f59e0b);border:none;"><span>✨ 立即客製選購</span></button>`;
    } else if (stockStatus === "restocking") {
      stockBadgeHtml = `<span class="stock-pill restocking">🟡 機台排程補貨中</span>`;
      btnHtml = `<button class="btn btn-secondary" onclick="promptPreOrderNotice('${prod.id}')"><span>✨ 預約客製排單</span></button>`;
    } else {
      stockBadgeHtml = `<span class="stock-pill out_of_stock">🔴 暫時缺貨 (已搶光)</span>`;
      btnHtml = `<button class="btn btn-secondary" disabled style="opacity:0.6;cursor:not-allowed;"><span>✕ 已售罄 (暫停接單)</span></button>`;
    }

    return `
      <div class="product-card" data-id="${prod.id}">
        <span class="product-card-badge" style="background:linear-gradient(135deg, #ff758c, #f59e0b);">${prod.badge || "人氣限定"}</span>
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
              <span class="product-price-currency" style="color:#e11d48;">NT$</span>
              <span class="product-price-amount" style="color:#e11d48;">${prod.price}</span>
            </div>
            ${btnHtml}
          </div>
        </div>
      </div>
    `;
  }).join("");
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

  // 若顧客尚未自行上傳，自動備援使用官方示範高畫質圖檔，流程絕不卡住！
  if (!currentUploadData) {
    currentUploadData = {
      dataUrl: prod.image,
      width: 1920,
      height: 1080,
      is1080p: true,
      resText: "1920 × 1080 (官方高畫質標準圖檔)"
    };
  }

  const qty = parseInt(document.getElementById("studio-qty")?.value, 10) || 1;
  const rawNotes = document.getElementById("studio-notes")?.value.trim() || "無特別備註";
  const stampStyle = document.getElementById("studio-stamp-select")?.value || "純淨原創圖檔";

  const notes = `${rawNotes} [鋼印風格: ${stampStyle}]`;

  // 立即關閉客製工坊視窗，避免畫面停滯
  const studioModal = document.getElementById("modal-custom-studio");
  if (studioModal) closeModal(studioModal);

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
    stampStyle: stampStyle
  });

  saveCart();
  updateCartUI();
  if (btn) setButtonLoading(btn, false);

  showToast(`✨ 已成功將【${prod.name}】× ${qty} 加入購物車！`, "success");
  
  // 即時滑出購物車側邊抽屜，給予最明確的操作反饋！
  openCartDrawer();
}

// 6. 購物車懸浮側邊欄 (Cart Drawer)
function openCartDrawer() {
  renderCartItems();
  document.getElementById("cart-drawer").classList.add("active");
  document.getElementById("drawer-backdrop").classList.add("active");
}

function closeCartDrawer() {
  document.getElementById("cart-drawer").classList.remove("active");
  document.getElementById("drawer-backdrop").classList.remove("active");
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
    return `
      <div class="cart-item-card">
        <img src="${item.imageUrl}" class="cart-item-thumb" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-title single-line" title="${item.name}">${item.name}</div>
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
}

// 7. 結帳雙重確認機制 (Double Confirmation) 與核心自動拆單
function startCheckoutProcess() {
  if (cart.length === 0) {
    return showToast("購物車為空，無法進行結帳！", "error");
  }

  // 結帳前必須完成註冊
  if (!currentStudent || !currentStudent.studentId) {
    closeCartDrawer();
    showToast("結帳前請先填寫 6 項核心學生個資！", "warning");
    openStudentAuthModal();
    return;
  }

  closeCartDrawer();
  populateDoubleConfirmModal();
  const modal = document.getElementById("modal-checkout-confirm") || document.getElementById("modal-double-confirm");
  if (modal) {
    openModal(modal);
  }
}

function populateDoubleConfirmModal() {
  // 支援 store/index.html (modal-checkout-confirm) 與 index.html (modal-double-confirm)
  const itemsContainer = document.getElementById("confirm-items-list") || document.getElementById("confirm-items-summary");
  const finalTotalEl = document.getElementById("confirm-total-amount") || document.getElementById("confirm-final-total");

  // 學生資訊欄位
  const idEl = document.getElementById("confirm-student-id");
  const nameEl = document.getElementById("confirm-student-name");
  const genderEl = document.getElementById("confirm-student-gender");
  const classEl = document.getElementById("confirm-student-class");
  const seatEl = document.getElementById("confirm-student-seat");
  const phoneEl = document.getElementById("confirm-student-phone");

  if (idEl) idEl.textContent = currentStudent.studentId || "";
  if (nameEl) nameEl.textContent = currentStudent.name || "";
  if (genderEl) genderEl.textContent = currentStudent.gender || "";
  if (classEl) classEl.textContent = currentStudent.className || "";
  if (seatEl) seatEl.textContent = currentStudent.seatNo || "";
  if (phoneEl) phoneEl.textContent = currentStudent.phone || "";

  const studentInfoBox = document.getElementById("confirm-student-summary");
  if (studentInfoBox) {
    studentInfoBox.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.9rem;">
        <div><span style="color:var(--text-secondary);">學號 (PK)：</span> <strong>${currentStudent.studentId}</strong></div>
        <div><span style="color:var(--text-secondary);">班級座號：</span> <strong>${currentStudent.className} (${currentStudent.seatNo}號)</strong></div>
        <div><span style="color:var(--text-secondary);">姓名：</span> <strong>${currentStudent.name} (${currentStudent.gender})</strong></div>
        <div><span style="color:var(--text-secondary);">聯絡電話：</span> <strong>${currentStudent.phone}</strong></div>
      </div>
    `;
  }

  let total = 0;
  if (itemsContainer) {
    total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    itemsContainer.innerHTML = cart.map(item => {
      const sub = item.price * item.quantity;
      return `
        <div style="background:#ffffff;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:var(--shadow-sm);margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${item.imageUrl}" style="width:46px;height:46px;border-radius:6px;object-fit:contain;background:#f3f4f6;border:1px solid var(--border-subtle);">
            <div>
              <div style="font-weight:700;color:var(--text-primary);font-size:0.92rem;">${item.name} × ${item.quantity} 件</div>
              <div style="font-size:0.75rem;color:var(--text-muted);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.notes}">${item.notes}</div>
            </div>
          </div>
          <div style="font-weight:800;color:#e11d48;font-size:1rem;">NT$ ${sub}</div>
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
  const agreeCheck = document.getElementById("confirm-agree-terms");

  if (agreeCheck && !agreeCheck.checked) {
    return showToast("請勾選確認條款，同意客製化商品印製規範及資安承諾！", "warning");
  }

  if (btn) setButtonLoading(btn, true);

  setTimeout(() => {
    // 執行核心品項拆單與入庫
    const result = ZgDataManager.splitAndCreateOrders(cart, currentStudent);
    
    // 清空購物車
    cart = [];
    saveCart();
    updateCartUI();

    if (btn) setButtonLoading(btn, false);
    const checkoutModal = document.getElementById("modal-checkout-confirm") || document.getElementById("modal-double-confirm");
    if (checkoutModal) closeModal(checkoutModal);

    // 彈出訂單完成視窗
    openOrderSuccessModal(result.parentOrderId, result.createdOrders);
  }, 500);
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

function searchStudentOrders() {
  const studentId = document.getElementById("lookup-student-id").value.trim();
  const resultBox = document.getElementById("lookup-results-box");

  if (!studentId) {
    return showToast("請輸入要查詢的學生學號！", "error");
  }

  const allOrders = ZgDataManager.getOrders();
  const studentOrders = allOrders.filter(o => o.studentId === studentId);

  if (studentOrders.length === 0) {
    resultBox.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--text-muted);">
        查無學號 [${studentId}] 的任何訂單，請確認學號或完成結帳！
      </div>
    `;
    return;
  }

  resultBox.innerHTML = studentOrders.map(order => {
    let badgeClass = "badge-pending";
    let badgeText = order.qcStatus;
    let extraNotice = "";

    if (order.qcStatus === "審核通過") {
      badgeClass = "badge-approved";
      extraNotice = `
        <div style="margin-top:8px;font-size:0.8rem;color:var(--emerald-success);background:rgba(16,185,129,0.1);padding:6px 10px;border-radius:4px;">
          ✓ 審核通過！進入【3 天送單倒數】，商品製作中，請備妥現金交由現場或外送專員！
        </div>
      `;
    } else if (order.qcStatus === "退件") {
      badgeClass = "badge-rejected";
      extraNotice = `
        <div style="margin-top:8px;font-size:0.8rem;color:#f87171;background:rgba(239,68,68,0.1);padding:6px 10px;border-radius:4px;">
          ✕ 退件原因：${order.qcNote || "圖檔不符合印刷規範，請重新上傳"}
          ${order.daysSinceReview >= 4 ? "<br><strong>⚠ 警告：已逾期第 4 天未更換圖檔，外送組即將發送紙本通知單至班級！</strong>" : ""}
        </div>
      `;
    }

    return `
      <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:var(--gold-glow);">${order.id}</strong>
          <span style="font-size:0.8rem;font-weight:700;padding:2px 8px;border-radius:4px;" class="${badgeClass}">${badgeText}</span>
        </div>
        <div style="margin-top:6px;display:flex;gap:12px;align-items:center;">
          <img src="${order.imageUrl}" style="width:48px;height:48px;border-radius:4px;object-fit:cover;border:1px solid var(--border-subtle);">
          <div>
            <div style="font-weight:700;color:#fff;">${order.productName} × ${order.quantity} 件 (NT$ ${order.totalPrice})</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">下單時間：${order.createdAt} | 雙聯單號：NO.${order.slipNo}</div>
          </div>
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
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
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

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  console.log('[PWA] 已捕捉到系統原生安裝事件');
});

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
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('商城網址已複製！請於 iPhone Safari 貼上開啟', 'success');
    }).catch(() => {
      prompt('請複製以下專案網址：', url);
    });
  } else {
    prompt('請複製以下專案網址：', url);
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

  // 註冊表單
  document.getElementById("user-status-pill")?.addEventListener("click", openStudentAuthModal);
  document.getElementById("form-student-auth")?.addEventListener("submit", saveStudentAuth);

  // 客製工作室加入購物車
  document.getElementById("btn-add-to-cart")?.addEventListener("click", addToCartFromStudio);

  // 雙重確認送出
  document.getElementById("btn-confirm-submit")?.addEventListener("click", submitFinalOrder);

  // 訂單查詢按鈕
  document.getElementById("btn-open-lookup")?.addEventListener("click", openOrderLookupModal);
  document.getElementById("btn-do-lookup")?.addEventListener("click", searchStudentOrders);

  // 2026 美學導覽與測驗按鈕
  document.getElementById("btn-open-quiz")?.addEventListener("click", openDesignQuizModal);

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
