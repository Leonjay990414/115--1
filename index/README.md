# 智光商工 115學年度 第62屆校慶園遊會 - 後台管理與產線審核系統 (Index Package)

本目錄 `d:\115園遊會\index\` 為完整的獨立後台網站系統包，整合所有後台所需的靜態網頁（HTML/CSS/JS）、Python 伺服器、中央資料庫（Data）以及相關網站與系統連結。

---

## 📂 目錄結構與檔案清單

```text
d:\115園遊會\index\
│
├── index.html                # 核心後台網站主入口 (原 admin.html，RBAC 角色權限、訂單審核、產線看板)
├── store.html                # 前台顧客客製商城入口 (全品項預覽、1080P驗證、購物車、送單直通雲端)
├── server.py                 # 後台 Python 核心 HTTP/JSON API 伺服器 (具備自動防衝撞埠號與 CORS)
├── generate_apk.py           # 後台行動端 APK / PWA 套件打包工具
├── run_server.bat            # Windows 一鍵啟動後台伺服器批次檔
├── manifest.json             # PWA 應用程式清單 (支援手機「加入主畫面」)
├── sw.js                     # PWA Service Worker 離線快取引擎
├── README.md                 # 後台系統技術規格與網站連結手冊 (本檔案)
│
├── css\                      # 樣式表
│   ├── styles.css            # 2026 全球美學樣式表 (雲舞白 × 變革藍綠)
│   └── print.css             # A4 雙聯確認單與退件通知單列印專用樣式
│
├── js\                       # 核心邏輯腳本
│   ├── admin.js              # 後台全模組邏輯 (營業/美術/財務/外送/產線/專員/資安)
│   ├── data.js               # 中央數據管理器 (ZgDataManager)、RBAC 驗證、Supabase 雙向同步
│   └── store.js              # 前台商城互動與下單邏輯
│
├── data\                     # 中央資料庫
│   └── db.json               # 本機/區網持久化資料庫 (學生名冊、流水工單、商品規格、稽核日誌)
│
└── assets\                   # 靜態素材與第三方函式庫
    ├── images\               # 官方商品實拍圖、校徽 Logo、Favicon、App 圖示
    ├── vendor\               # SheetJS (xlsx.full.min.js)、QRCode 函式庫
    └── downloads\            # 客製化 APK 下載檔
```

---

## 🌐 相關網站與系統連結 (Web & System Links)

| 系統項目 | 連結網址 / 路徑 | 說明 |
| :--- | :--- | :--- |
| **🛍️ 顧客前台商城 (本機同目錄)** | [./store.html](file:///d:/115園遊會/index/store.html) 或 `http://localhost:8080/store.html` | 後台同目錄內之前台客製商城，支援即時下單與原圖驗證 |
| **🛍️ 顧客前台商城 (根目錄)** | [../index.html](file:///d:/115園遊會/index.html) 或 `http://localhost:8080/front/index.html` | 專案根目錄之公開商城入口 |
| **⚙️ 本機後台首頁 (本站)** | [./index.html](file:///d:/115園遊會/index/index.html) 或 `http://localhost:8080/index.html` | 智光創客 7 大模組 (營業/美術/財務/外送/產線/專員/資安) |
| **☁️ Supabase 雲端資料庫 Console** | [Supabase Project Dashboard](https://supabase.com/dashboard/project/pdycpmbvjmhxabnzzdld) | 專案代碼 `pdycpmbvjmhxabnzzdld`，管理雲端 orders/products |
| **⚡ Supabase API 端點** | `https://pdycpmbvjmhxabnzzdld.supabase.co` | 雲端 REST API 與即時 WebSocket 推播廣播通道 |
| **📡 本機中央資料庫 API** | `http://localhost:8080/api/db` | 查看目前全站即時 orders, products, students 資料快照 |
| **🔄 跨裝置資料同步 API** | `http://localhost:8080/api/sync` (POST) | 手機與電腦跨網路雙向自動合併資料 |
| **👥 學生註冊與同步 API** | `http://localhost:8080/api/students/upsert` (POST) | 嚴格防呆約束：同班級同座號防搶佔機制 |
| **🏭 工單狀態更新 API** | `http://localhost:8080/api/orders/update` (POST) | 美術 QC、財務收款、產線進度更新 |
| **🖼️ 原圖線上串流服務** | `http://localhost:8080/api/orders/image?id=<ID>` | 支援 Base64 與各格式圖檔秒開串流 |

---

## 🚀 啟動方式

### 方法 1：Windows 一鍵執行
雙擊開啟 `index/run_server.bat` 即可啟動。

### 方法 2：指令列執行
進入 `index` 資料夾後執行：
```bash
python server.py
```
或指定特定埠號：
```bash
python server.py --port 8081
```

---

## 🔑 後台登入測試憑證 (RBAC Accounts)

後台提供「**⚡ 專員快捷驗證碼登入**」與「**🔑 管理者帳號密碼登入**」雙軌驗證模式：

### 1. 快捷驗證碼模式
| 職位名稱 | 預設驗證碼 | 職責權限範圍 |
| :--- | :--- | :--- |
| **總召 (主辦人)** | `112001` | 最高權限 Super Admin，涵蓋全部 7 大模組 |
| **執行副總召** | `112002` | 全局督導、審核與產線排程權限 |
| **網站工程總監** | `112003` | 系統維運、資安日誌、雲端資料庫同步 |
| **美術設計組長** | `112004` | 圖檔 1080P QC 審核、退件補件管理 |
| **產線印製組長** | `112006` | 熱昇華設備對接、製造排程與看板操作 |
| **財務出納組長** | `112008` | 營收核對、A4 雙聯確認單批次套印、Excel 匯出 |
| **外送物流組長** | `112010` | 班級配送簽收、第四天實體退件單列印 |

### 2. 管理者帳密模式
- **帳號**：`admin_director`
- **密碼**：`ZgShop@2026_01` (亦支援緊急通行碼 `admin` 或 `2026`)
