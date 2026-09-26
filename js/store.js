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

// 3. 會員註冊與登入機制 (6 大核心必填欄位驗證)
function initStudentAuth() {
  try {
    const saved = localStorage.getItem("zg_current_user_v1");
    if (saved) {
      currentStudent = JSON.parse(saved);
      updateStudentUI();
    }
  } catch (e) {
    currentStudent = null;
  }
}

function updateStudentUI() {
  const statusEl = document.getElementById("user-status-text");
  const dotEl = document.getElementById("user-status-dot");
  if (currentStudent && currentStudent.studentId) {
    statusEl.textContent = `${currentStudent.className} ${currentStudent.seatNo}號 ${currentStudent.name}`;
    dotEl.classList.add("logged-in");
  } else {
    statusEl.textContent = "學生註冊 / 登入";
    dotEl.classList.remove("logged-in");
  }
}

function openStudentAuthModal() {
  const modal = document.getElementById("modal-student-auth");
  if (currentStudent) {
    document.getElementById("auth-student-id").value = currentStudent.studentId || "";
    document.getElementById("auth-class-name").value = currentStudent.className || "資三1";
    document.getElementById("auth-seat-no").value = currentStudent.seatNo || "";
    document.getElementById("auth-name").value = currentStudent.name || "";
    document.getElementById("auth-gender").value = currentStudent.gender || "男";
    document.getElementById("auth-phone").value = currentStudent.phone || "";
  }
  openModal(modal);
}

function saveStudentAuth(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-auth");
  setButtonLoading(btn, true);

  const studentId = document.getElementById("auth-student-id").value.trim();
  const className = document.getElementById("auth-class-name").value.trim();
  const seatNo = document.getElementById("auth-seat-no").value.trim();
  const name = document.getElementById("auth-name").value.trim();
  const gender = document.getElementById("auth-gender").value;
  const phone = document.getElementById("auth-phone").value.trim();

  // 嚴格資安防呆校驗 (缺一不可)
  if (!studentId || studentId.length < 5) {
    setButtonLoading(btn, false);
    return showToast("請輸入正確且完整的學號（系統防偽與追蹤主鍵，至少5碼）", "error");
  }
  if (!className) {
    setButtonLoading(btn, false);
    return showToast("請選擇或填寫所屬班級（如：資三1、美三1）", "error");
  }
  if (!seatNo || isNaN(seatNo) || parseInt(seatNo) < 1 || parseInt(seatNo) > 60) {
    setButtonLoading(btn, false);
    return showToast("請輸入有效座號（1 ~ 60 號）", "error");
  }
  if (!name || name.length < 2) {
    setButtonLoading(btn, false);
    return showToast("請輸入真實姓名", "error");
  }
  if (!phone || !/^09\d{8}$/.test(phone)) {
    setButtonLoading(btn, false);
    return showToast("請輸入正確的手機號碼格式（如：0912345678）", "error");
  }

  setTimeout(() => {
    currentStudent = { studentId, className, seatNo: String(seatNo).padStart(2, "0"), name, gender, phone };
    localStorage.setItem("zg_current_user_v1", JSON.stringify(currentStudent));
    updateStudentUI();
    setButtonLoading(btn, false);
    closeModal(document.getElementById("modal-student-auth"));
    showToast(`註冊成功！歡迎 ${className} ${name} 同學`, "success");
  }, 400);
}

// 4. 商品渲染 (套用絕對單行截斷與卡片樣式)
function renderProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;
  const products = ZgDataManager.getProducts();

  grid.innerHTML = products.map(prod => `
    <div class="product-card" data-id="${prod.id}">
      <span class="product-card-badge">${prod.badge}</span>
      <div class="product-image-box">
        <img src="${prod.image}" alt="${prod.name}" class="product-image" loading="lazy">
      </div>
      <div class="product-card-body">
        <div class="product-category-tag">${prod.category}</div>
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
          <button class="btn btn-primary" onclick="openCustomStudio('${prod.id}')">
            <span>客製下單</span>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

// 5. 客製化工作室與圖檔 1080P 上傳檢驗模組
function openCustomStudio(productId) {
  const prod = ZgDataManager.getProductById(productId);
  if (!prod) return;

  selectedProductId = productId;
  currentUploadData = null;

  document.getElementById("studio-prod-name").textContent = prod.name;
  document.getElementById("studio-prod-specs").textContent = prod.specs;
  document.getElementById("studio-prod-price").textContent = `NT$ ${prod.price}`;
  document.getElementById("studio-prod-material").textContent = prod.material;
  document.getElementById("studio-prod-res-req").textContent = prod.resolutionReq;
  document.getElementById("studio-prod-img").src = prod.image;
  
  // 重置上傳區塊
  document.getElementById("studio-notes").value = "";
  document.getElementById("studio-qty").value = "1";
  document.getElementById("studio-file-input").value = "";
  document.getElementById("upload-preview-box").style.display = "none";
  document.getElementById("upload-placeholder-box").style.display = "block";

  // 更新麵包屑
  document.getElementById("crumb-product").textContent = prod.name;

  openModal(document.getElementById("modal-custom-studio"));
}

function handleFileUpload(file) {
  if (!file) return;

  // 格式防呆 (僅限圖片格式 PNG, JPG, JPEG, WEBP)
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

      currentUploadData = {
        dataUrl,
        width,
        height,
        is1080p,
        resText: `${width} × ${height} px`
      };

      // 顯示預覽與解析度判斷標籤
      const previewBox = document.getElementById("upload-preview-box");
      const placeholderBox = document.getElementById("upload-placeholder-box");
      const thumb = document.getElementById("upload-thumb");
      const resBadge = document.getElementById("upload-res-badge");
      const resText = document.getElementById("upload-res-text");

      thumb.src = dataUrl;
      placeholderBox.style.display = "none";
      previewBox.style.display = "flex";

      if (is1080p) {
        resBadge.className = "res-badge res-pass";
        resBadge.textContent = "✓ 解析度達標 (1080P+ 合格)";
        resText.textContent = `原始尺寸：${width} × ${height} px，轉印效果優良！`;
        showToast("圖檔解析度檢驗合格！達到 1080P 高畫質轉印標準", "success");
      } else {
        resBadge.className = "res-badge res-fail";
        resBadge.textContent = "⚠ 低於 1080P 建議值";
        resText.textContent = `原始尺寸：${width} × ${height} px，建議使用清晰度更高之圖檔避免印製品模糊。`;
        showToast("提醒：圖檔解析度低於 1080P，若印製品產生模糊需自行負責！", "warning");
      }
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

let selectedPaletteVibe = "雲舞白 (Cloud Dancer)";

function selectPaletteSwatch(btn, colorName) {
  selectedPaletteVibe = colorName;
  document.querySelectorAll(".swatch-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  showToast(`已選定 2026 配色氛圍：【${colorName}】`, "success");
}

function addToCartFromStudio() {
  const btn = document.getElementById("btn-add-to-cart");
  setButtonLoading(btn, true);

  // 圖檔上傳限制：顧客下單時「強制」附上圖檔
  if (!currentUploadData) {
    setButtonLoading(btn, false);
    return showToast("請強制上傳客製化印製圖檔後方可加入購物車！", "error");
  }

  const prod = ZgDataManager.getProductById(selectedProductId);
  const qty = parseInt(document.getElementById("studio-qty").value) || 1;
  const rawNotes = document.getElementById("studio-notes").value.trim() || "無特殊備註";
  const stampStyle = document.getElementById("studio-stamp-select")?.value || "純淨原創圖檔";

  // 將 2026 刻意的不完美風格與靈感色票組合成備註資訊
  const notes = `${rawNotes} [風格:${stampStyle} | 色調:${selectedPaletteVibe}]`;

  setTimeout(() => {
    // 檢查購物車是否已有相同商品且相同圖檔 -> 合併數量；否則新增品項
    const existingIndex = cart.findIndex(item => item.productId === selectedProductId && item.notes === notes && item.imageUrl === currentUploadData.dataUrl);

    if (existingIndex !== -1) {
      cart[existingIndex].quantity += qty;
    } else {
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
    }

    saveCart();
    setButtonLoading(btn, false);
    closeModal(document.getElementById("modal-custom-studio"));
    showToast(`已將 ${prod.name} (${qty}件) 加入購物車！`, "success");
    openCartDrawer();
  }, 400);
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
  localStorage.setItem("zg_cart_v1", JSON.stringify(cart));
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
  const badge = document.getElementById("cart-badge-count");
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (badge) badge.textContent = count;
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
  openModal(document.getElementById("modal-double-confirm"));
}

function populateDoubleConfirmModal() {
  const summaryBox = document.getElementById("confirm-items-summary");
  const studentInfoBox = document.getElementById("confirm-student-summary");
  const splitNoticeBox = document.getElementById("confirm-split-preview");
  const finalTotalEl = document.getElementById("confirm-final-total");

  let total = 0;
  let itemsHtml = `
    <table class="confirm-summary-table">
      <thead>
        <tr style="border-bottom:1px solid var(--border-subtle);text-align:left;color:var(--text-secondary);">
          <th>商品</th><th>客製圖檔與備註</th><th>單價</th><th>數量</th><th>小計</th>
        </tr>
      </thead>
      <tbody>
  `;

  cart.forEach(item => {
    const sub = item.price * item.quantity;
    total += sub;
    itemsHtml += `
      <tr>
        <td style="color:#fff;font-weight:700;">${item.name}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="${item.imageUrl}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;">
            <span class="single-line" style="max-width:180px;font-size:0.8rem;color:var(--text-secondary);" title="${item.notes}">${item.notes}</span>
          </div>
        </td>
        <td>NT$ ${item.price}</td>
        <td>${item.quantity}</td>
        <td style="color:var(--gold-glow);font-weight:800;">NT$ ${sub}</td>
      </tr>
    `;
  });
  itemsHtml += `</tbody></table>`;
  summaryBox.innerHTML = itemsHtml;
  finalTotalEl.textContent = `NT$ ${total}`;

  // 學生 6 項個資摘要
  studentInfoBox.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.9rem;">
      <div><span style="color:var(--text-secondary);">學號 (PK)：</span> <strong>${currentStudent.studentId}</strong></div>
      <div><span style="color:var(--text-secondary);">班級座號：</span> <strong>${currentStudent.className} (${currentStudent.seatNo}號)</strong></div>
      <div><span style="color:var(--text-secondary);">姓名：</span> <strong>${currentStudent.name} (${currentStudent.gender})</strong></div>
      <div><span style="color:var(--text-secondary);">聯絡電話：</span> <strong>${currentStudent.phone}</strong></div>
    </div>
  `;

  // 拆單邏輯預覽通知
  const uniqueCount = cart.length;
  if (uniqueCount > 1) {
    splitNoticeBox.innerHTML = `
      <div style="background:rgba(245,158,11,0.1);border:1px solid var(--border-bright);border-radius:var(--radius-md);padding:12px;font-size:0.85rem;color:var(--gold-glow);">
        ⚡ <strong>智慧拆單技術觸發：</strong> 購物車內含 <strong>${uniqueCount}</strong> 種不同商品，送出後系統將自動拆解為 <strong>${uniqueCount}</strong> 張獨立產線工單以利美術組與機台分流！
      </div>
    `;
  } else {
    splitNoticeBox.innerHTML = `
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-md);padding:12px;font-size:0.85rem;color:var(--emerald-success);">
        ✓ 單一品項訂單：共 ${cart[0].quantity} 件，將合併於同一張專屬產線工單。
      </div>
    `;
  }

  // 重置同意 Checkbox
  document.getElementById("confirm-agree-terms").checked = false;
}

function submitFinalOrder() {
  const btn = document.getElementById("btn-confirm-submit");
  const agreeCheck = document.getElementById("confirm-agree-terms");

  if (!agreeCheck.checked) {
    return showToast("請勾選確認條款，同意客製化商品不退費及資安個資條約！", "error");
  }

  setButtonLoading(btn, true);

  setTimeout(() => {
    // 執行核心品項拆單與存庫
    const result = ZgDataManager.splitAndCreateOrders(cart, currentStudent);
    
    // 清空購物車
    cart = [];
    saveCart();

    setButtonLoading(btn, false);
    closeModal(document.getElementById("modal-double-confirm"));

    // 彈出訂單完成視窗
    openOrderSuccessModal(result.parentOrderId, result.createdOrders);
  }, 700);
}

function openOrderSuccessModal(parentOrderId, createdOrders) {
  const modal = document.getElementById("modal-order-success");
  document.getElementById("success-parent-order-id").textContent = parentOrderId;
  
  const listEl = document.getElementById("success-child-orders-list");
  listEl.innerHTML = createdOrders.map(order => `
    <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:12px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:700;color:var(--gold-glow);">${order.id}</div>
        <div style="font-size:0.85rem;color:#fff;">${order.productName} × ${order.quantity} 件</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">雙聯單流水號：NO.${order.slipNo}</div>
      </div>
      <div style="text-align:right;">
        <span style="font-size:0.75rem;padding:3px 8px;border-radius:4px;background:rgba(245,158,11,0.2);color:var(--gold-glow);border:1px solid var(--border-bright);">待美術組審核</span>
        <div style="font-weight:800;color:#fff;margin-top:4px;">NT$ ${order.totalPrice}</div>
      </div>
    </div>
  `).join("");

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

// 11. 事件監聽設置
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
