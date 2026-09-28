# -*- coding: utf-8 -*-
"""
智光商工 115學年度 第62屆校慶園遊會客製專案
後台核心伺服器 (Integrated Backend Server & Cross-Device Sync Engine)
位置：index/server.py
"""

import os
import sys
import json
import time
import socket
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse
import argparse

# 確保 Windows 控制台輸出支援 UTF-8 編碼，避免 CP950 UnicodeEncodeError
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
DB_FILE = os.path.join(BASE_DIR, 'data', 'db.json')

def get_now_str():
    now = datetime.now()
    return now.strftime('%Y-%m-%d %H:%M:%S')

DEFAULT_PRODUCTS = [
    {
        "id": "prod_mug",
        "code": "MUG",
        "name": "經典高白陶瓷馬克杯",
        "category": "陶瓷工藝",
        "price": 150,
        "material": "高級瓷土 / 特級熱昇華顯色塗層",
        "specs": "容量 320ml (11oz) / 轉印範圍 20cm × 8.5cm",
        "resolutionReq": "建議 1080P 以上 (寬度 ≥ 1920px, 300 DPI)",
        "minWidth": 1080,
        "minHeight": 800,
        "image": "assets/images/mug.jpg",
        "badge": "人氣首選",
        "stockStatus": "in_stock",
        "description": "智光校慶限定高規格陶瓷馬克杯，經 1280°C 高溫燒製，塗層均勻細緻，熱昇華顯色飽滿耐清洗。"
    },
    {
        "id": "prod_coaster",
        "code": "CST",
        "name": "圓形瞬吸陶瓷吸水杯墊",
        "category": "陶瓷工藝",
        "price": 80,
        "material": "高密度吸水陶瓷 + 環保天然軟木止滑底",
        "specs": "圓形直徑 10.3cm / 厚度 0.6cm",
        "resolutionReq": "建議 1080P 以上 (正方形 ≥ 1080 × 1080px, 300 DPI)",
        "minWidth": 1080,
        "minHeight": 1080,
        "image": "assets/images/coaster.jpg",
        "badge": "實用必備",
        "stockStatus": "in_stock",
        "description": "微米毛細孔能快速吸乾冷飲水珠，保持桌面乾爽；底部貼合軟木墊防刮桌面。"
    },
    {
        "id": "prod_badge",
        "code": "BDG",
        "name": "58mm 亮面金屬胸章",
        "category": "金屬紀念品",
        "price": 40,
        "material": "金屬馬口鐵底殼 + 高透光防刮亮膜 + 安全別針",
        "specs": "直徑 5.8cm (58mm 標準尺寸)",
        "resolutionReq": "建議 1080P 以上 (正方形 ≥ 1080 × 1080px, 300 DPI)",
        "minWidth": 1080,
        "minHeight": 1080,
        "image": "assets/images/badge.jpg",
        "badge": "超值紀念",
        "stockStatus": "in_stock",
        "description": "高飽和色彩還原，表面覆蓋防刮耐磨防水光膜，背附安全旋轉別針，書包外套隨心裝飾。"
    },
    {
        "id": "prod_cardholder",
        "code": "CRD",
        "name": "質感荔枝紋皮革悠遊卡套",
        "category": "皮革配件",
        "price": 120,
        "material": "環保 PU 荔枝紋皮革 + 強化透明壓克力視窗",
        "specs": "外徑 7.2cm × 11cm / 可容納標準信用卡與學生證",
        "resolutionReq": "建議 1080P 以上 (正方形 ≥ 1080 × 1080px, 300 DPI)",
        "minWidth": 1080,
        "minHeight": 1080,
        "image": "assets/images/cardholder.jpg",
        "badge": "校園必帶",
        "stockStatus": "in_stock",
        "description": "高磅數精緻車線，防滑防磁干擾設計，搭乘捷運刷卡感應極速敏銳。"
    },
    {
        "id": "prod_passport",
        "code": "PSP",
        "name": "輕奢風燙金皮革護照套",
        "category": "皮革配件",
        "price": 200,
        "material": "十字紋防刮耐磨皮革 + 內襯細緻絨布",
        "specs": "展開 20cm × 14cm / 閉合 10cm × 14cm",
        "resolutionReq": "建議 1080P 以上 (寬度 ≥ 1920px, 300 DPI)",
        "minWidth": 1080,
        "minHeight": 1080,
        "image": "assets/images/passport.jpg",
        "badge": "畢業典藏",
        "stockStatus": "in_stock",
        "description": "多卡位收納槽可同時放置登機證、SIM 卡與多張信用卡，校慶專屬畢業出國首選。"
    }
]

DEFAULT_STUDENTS = [
    { "studentId": "112345", "className": "資處科三1", "seatNo": "18", "name": "陳冠宇", "gender": "男", "phone": "0912345678", "registeredAt": "2026-09-24 09:00:00" },
    { "studentId": "112412", "className": "廣設科三1", "seatNo": "5", "name": "林詩婷", "gender": "女", "phone": "0987654321", "registeredAt": "2026-09-23 13:45:00" },
    { "studentId": "111889", "className": "廣設科三2", "seatNo": "12", "name": "張立誠", "gender": "男", "phone": "0922334455", "registeredAt": "2026-09-24 10:00:00" },
    { "studentId": "112999", "className": "電子科二1", "seatNo": "8", "name": "張志偉", "gender": "男", "phone": "0933112233", "registeredAt": "2026-09-22 10:30:00" }
]

DEFAULT_ORDERS = [
    {
        "id": "ZG2026-0001-MUG",
        "parentOrderId": "ZG2026-0001",
        "slipNo": "000001",
        "studentId": "112345",
        "className": "資處科三1",
        "seatNo": "18",
        "name": "陳冠宇",
        "gender": "男",
        "phone": "0912345678",
        "productId": "prod_mug",
        "productCode": "MUG",
        "productName": "經典高白陶瓷馬克杯",
        "quantity": 2,
        "unitPrice": 150,
        "totalPrice": 300,
        "notes": "杯身正面請置中對齊，不要裁切到右下角年份字樣",
        "imageUrl": "assets/images/mug.jpg",
        "imageRes": "1920 x 1080 (合格 1080P)",
        "qcStatus": "審核通過",
        "qcReviewer": "admin_art_core",
        "qcNote": "解析度 300 DPI 達標，符合出血與轉印規格。",
        "qcDate": "2026-09-24 10:30:00",
        "prodStatus": "已完成",
        "paymentStatus": "已收款",
        "deliveryStatus": "已送達班級",
        "isPrintedSlip": True,
        "printedSlipAt": "2026-09-24 11:00:00",
        "createdAt": "2026-09-24 09:15:00",
        "daysSinceReview": 2
    },
    {
        "id": "ZG2026-0001-BDG",
        "parentOrderId": "ZG2026-0001",
        "slipNo": "000002",
        "studentId": "112345",
        "className": "資處科三1",
        "seatNo": "18",
        "name": "陳冠宇",
        "gender": "男",
        "phone": "0912345678",
        "productId": "prod_badge",
        "productCode": "BDG",
        "productName": "58mm 亮面金屬胸章",
        "quantity": 1,
        "unitPrice": 40,
        "totalPrice": 40,
        "notes": "圓形亮膜邊緣請保留 3mm 出血線",
        "imageUrl": "assets/images/badge.jpg",
        "imageRes": "1200 x 1200 (合格 1080P)",
        "qcStatus": "審核通過",
        "qcReviewer": "admin_art_core",
        "qcNote": "裁切版型吻合 58mm 標準尺寸。",
        "qcDate": "2026-09-24 10:35:00",
        "prodStatus": "轉印中",
        "paymentStatus": "已收款",
        "deliveryStatus": "待配送",
        "isPrintedSlip": True,
        "printedSlipAt": "2026-09-24 11:00:00",
        "createdAt": "2026-09-24 09:15:00",
        "daysSinceReview": 2
    },
    {
        "id": "ZG2026-0002-CST",
        "parentOrderId": "ZG2026-0002",
        "slipNo": "000003",
        "studentId": "112412",
        "className": "廣設科三1",
        "seatNo": "5",
        "name": "林詩婷",
        "gender": "女",
        "phone": "0987654321",
        "productId": "prod_coaster",
        "productCode": "CST",
        "productName": "圓形瞬吸陶瓷吸水杯墊",
        "quantity": 1,
        "unitPrice": 80,
        "totalPrice": 80,
        "notes": "線條插畫請維持黑白高對比度",
        "imageUrl": "assets/images/coaster.jpg",
        "imageRes": "2048 x 2048 (合格 1080P)",
        "qcStatus": "審核通過",
        "qcReviewer": "admin_art_staff",
        "qcNote": "高解析度向量圖，色彩分層乾淨。",
        "qcDate": "2026-09-23 15:20:00",
        "prodStatus": "待印製",
        "paymentStatus": "未收款",
        "deliveryStatus": "待配送",
        "isPrintedSlip": False,
        "printedSlipAt": "",
        "createdAt": "2026-09-23 14:00:00",
        "daysSinceReview": 3
    }
]

DEFAULT_SITE_SETTINGS = {
    "siteTitle": "智光商工 115學年度 第62屆校慶園遊會",
    "storeBrand": "智光創客商城",
    "bannerSlogan": "✨ 2026 可愛精品亮晶晶 · 青春限定印製",
    "marqueeNotice": "📢 校慶客製化商品全面開放線上預訂！圖檔自動驗證 1080P，滿額直送班級教室。",
    "colorPrimary": "#12636b",
    "colorAccent": "#ff6584",
    "colorBg": "#fbf9f5",
    "colorText": "#1b2e35",
    "enableMotion": True,
    "enableBlur": True,
    "marqueeSpeed": "normal"
}

def load_db():
    if not os.path.exists(DB_FILE):
        # 嘗試從外層目錄複製既有 db.json
        parent_db = os.path.join(PARENT_DIR, 'data', 'db.json')
        if os.path.exists(parent_db):
            try:
                with open(parent_db, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                data.setdefault('site_settings', DEFAULT_SITE_SETTINGS)
                data.setdefault('staff_auth', data.get('adminAuth', {}))
                save_db(data)
                return data
            except Exception:
                pass

        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        init_data = {
            "students": DEFAULT_STUDENTS,
            "orders": DEFAULT_ORDERS,
            "products": DEFAULT_PRODUCTS,
            "site_settings": DEFAULT_SITE_SETTINGS,
            "adminAuth": {
                "admin_director": "ZgShop@2026_01",
                "admin_exec_deputy": "ZgShop@2026_02",
                "admin_web_core": "ZgShop@2026_03",
                "admin_art_core": "ZgShop@2026_04",
                "admin_art_staff": "ZgShop@2026_05",
                "admin_maker_core": "ZgShop@2026_06",
                "admin_maker_staff": "ZgShop@2026_07",
                "admin_finance_core": "ZgShop@2026_08",
                "admin_finance_staff": "ZgShop@2026_09",
                "admin_logistics_core": "ZgShop@2026_10",
                "admin_logistics_staff": "ZgShop@2026_11",
                "admin_marketing_core": "ZgShop@2026_12"
            },
            "staff_auth": {
                "admin_director": "ZgShop@2026_01",
                "admin_exec_deputy": "ZgShop@2026_02",
                "admin_web_core": "ZgShop@2026_03",
                "admin_art_core": "ZgShop@2026_04",
                "admin_art_staff": "ZgShop@2026_05",
                "admin_maker_core": "ZgShop@2026_06",
                "admin_maker_staff": "ZgShop@2026_07",
                "admin_finance_core": "ZgShop@2026_08",
                "admin_finance_staff": "ZgShop@2026_09",
                "admin_logistics_core": "ZgShop@2026_10",
                "admin_logistics_staff": "ZgShop@2026_11",
                "admin_marketing_core": "ZgShop@2026_12"
            },
            "logs": [
                { "time": get_now_str(), "action": "【後台啟動】智光創客中央資料庫引擎成功初始化，跨裝置即時同步已啟動。" }
            ],
            "slipCounter": 6
        }
        save_db(init_data)
        return init_data

    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            updated = False
            if 'site_settings' not in data:
                data['site_settings'] = DEFAULT_SITE_SETTINGS
                updated = True
            if 'staff_auth' not in data:
                data['staff_auth'] = data.get('adminAuth', {})
                updated = True
            if updated:
                save_db(data)
            return data
    except Exception as e:
        print(f"Error loading {DB_FILE}: {e}")
        return {"students": DEFAULT_STUDENTS, "orders": DEFAULT_ORDERS, "products": DEFAULT_PRODUCTS, "site_settings": DEFAULT_SITE_SETTINGS, "logs": [], "slipCounter": 6}

def save_db(data):
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        tmp_file = DB_FILE + '.tmp'
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        if os.path.exists(DB_FILE):
            os.replace(tmp_file, DB_FILE)
        else:
            os.rename(tmp_file, DB_FILE)
    except Exception as e:
        print(f"Error saving {DB_FILE}: {e}")

class ZgShopRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def address_string(self):
        # 覆寫反向 DNS 查詢，避免 Windows 系統連線時發生 10~30 秒 DNS 逾時卡頓
        return str(self.client_address[0])

    def end_headers(self):
        # 允許跨裝置存取 (CORS) 與關閉 API 快取
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control')
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def translate_path(self, path):
        clean_path = urllib.parse.unquote(path.split('?', 1)[0].split('#', 1)[0])
        # 快捷存取：/store 或 /shop 直接導向後台目錄下的 store.html 商城頁面
        if clean_path in ('/store', '/store/', '/shop', '/shop/'):
            return os.path.join(BASE_DIR, 'store.html')
        # 快捷存取：/admin 直接導向 index.html 後台管理頁面
        elif clean_path in ('/admin', '/admin/'):
            return os.path.join(BASE_DIR, 'index.html')
        # 存取外層根目錄專案檔案 (/front/ 路由)
        elif clean_path.startswith('/front/') or clean_path == '/front':
            sub = clean_path[len('/front'):].lstrip('/')
            return os.path.join(PARENT_DIR, sub if sub else 'index.html')
        return super().translate_path(path)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/db':
            db = load_db()
            resp = json.dumps({"success": True, "db": db}, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
            return

        elif parsed.path == '/api/orders/image':
            query = urllib.parse.parse_qs(parsed.query)
            order_id = query.get('id', [''])[0]
            db = load_db()
            order = next((o for o in db.get('orders', []) if o.get('id') == order_id), None)
            if not order or not order.get('imageUrl'):
                self.send_error(404, "Order image not found")
                return
            img_url = order['imageUrl']
            if img_url.startswith('data:image'):
                try:
                    import base64
                    header, base64_data = img_url.split(',', 1)
                    mime = header.split(';')[0].replace('data:', '')
                    raw_bytes = base64.b64decode(base64_data)
                    self.send_response(200)
                    self.send_header('Content-Type', mime)
                    self.send_header('Content-Length', str(len(raw_bytes)))
                    self.end_headers()
                    self.wfile.write(raw_bytes)
                    return
                except Exception as e:
                    self.send_error(500, f"Error decoding base64 image: {e}")
                    return
            else:
                clean_path = '/' + img_url.lstrip('/')
                self.send_response(302)
                self.send_header('Location', clean_path)
                self.end_headers()
                return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
        
        try:
            req_data = json.loads(body)
        except Exception:
            req_data = {}

        if parsed.path == '/api/sync':
            db = load_db()
            if 'students' in req_data and isinstance(req_data['students'], list):
                existing_map = {s['studentId']: s for s in db.get('students', [])}
                for s in req_data['students']:
                    existing_map[s['studentId']] = s
                db['students'] = list(existing_map.values())

            if 'orders' in req_data and isinstance(req_data['orders'], list):
                order_map = {o['id']: o for o in db.get('orders', [])}
                for o in req_data['orders']:
                    order_map[o['id']] = o
                db['orders'] = list(order_map.values())

            if 'products' in req_data and isinstance(req_data['products'], list):
                db['products'] = req_data['products']

            if 'adminAuth' in req_data and isinstance(req_data['adminAuth'], dict):
                if 'adminAuth' not in db:
                    db['adminAuth'] = {}
                db['adminAuth'].update(req_data['adminAuth'])

            if 'staff_auth' in req_data and isinstance(req_data['staff_auth'], dict):
                if 'staff_auth' not in db:
                    db['staff_auth'] = {}
                db['staff_auth'].update(req_data['staff_auth'])

            if 'site_settings' in req_data and isinstance(req_data['site_settings'], dict):
                if 'site_settings' not in db:
                    db['site_settings'] = {}
                db['site_settings'].update(req_data['site_settings'])

            if 'slipCounter' in req_data:
                db['slipCounter'] = max(int(db.get('slipCounter', 6)), int(req_data['slipCounter']))

            if 'logs' in req_data and isinstance(req_data['logs'], list):
                existing_actions = {l.get('time', '') + l.get('action', '') for l in db.get('logs', [])}
                for l in req_data['logs']:
                    key = l.get('time', '') + l.get('action', '')
                    if key not in existing_actions:
                        db['logs'].insert(0, l)
                db['logs'] = db['logs'][:150]

            save_db(db)
            self._send_json({"success": True, "db": db})
            return

        elif parsed.path == '/api/staff/update':
            db = load_db()
            username = str(req_data.get('username', '')).strip()
            new_code = str(req_data.get('code', '')).strip()
            if not username or not new_code:
                self._send_json({"success": False, "message": "帳號與驗證碼不能為空"}, status=400)
                return
            if 'adminAuth' not in db: db['adminAuth'] = {}
            if 'staff_auth' not in db: db['staff_auth'] = {}
            db['adminAuth'][username] = new_code
            db['staff_auth'][username] = new_code
            db['logs'].insert(0, {
                "time": get_now_str(),
                "action": f"【專員驗證碼異動】工作人員職位 [{username}] 驗證碼/學號已成功更新並持久化儲存。"
            })
            save_db(db)
            self._send_json({"success": True, "username": username, "code": new_code, "db": db})
            return

        elif parsed.path == '/api/settings/update':
            db = load_db()
            settings = req_data.get('settings', {})
            if 'site_settings' not in db:
                db['site_settings'] = {}
            db['site_settings'].update(settings)
            db['logs'].insert(0, {
                "time": get_now_str(),
                "action": "【全站外觀設定更新】管理員已調整網站標題、配色與動態視覺效果。"
            })
            save_db(db)
            self._send_json({"success": True, "site_settings": db['site_settings']})
            return

        elif parsed.path == '/api/students/upsert':
            db = load_db()
            profile = req_data
            student_id = str(profile.get('studentId', '')).strip()
            class_name = str(profile.get('className', '')).strip()
            seat_raw = profile.get('seatNo', '1')
            try:
                seat_no = str(int(seat_raw))
            except Exception:
                seat_no = str(seat_raw).strip()
            name = str(profile.get('name', '')).strip()
            gender = profile.get('gender', '男')
            phone = str(profile.get('phone', '')).strip()

            students = db.get('students', [])

            for s in students:
                if s.get('studentId') != student_id and s.get('className', '').lower() == class_name.lower():
                    s_seat = str(int(s.get('seatNo', 0))) if str(s.get('seatNo', '')).isdigit() else str(s.get('seatNo', ''))
                    if s_seat == seat_no:
                        self._send_json({
                            "success": False,
                            "message": f"【座號已被註冊】「{class_name}」已有 {seat_no} 號學生（{s.get('name')}，學號 {s.get('studentId')}）完成註冊！同一個班級每個座號僅限 1 位學生使用，請確認您的班級與座號。"
                        })
                        return

            idx = next((i for i, s in enumerate(students) if s.get('studentId') == student_id), -1)
            if idx != -1:
                students[idx].update({
                    "className": class_name,
                    "seatNo": seat_no,
                    "name": name,
                    "gender": gender,
                    "phone": phone,
                    "updatedAt": get_now_str()
                })
                final_student = students[idx]
            else:
                final_student = {
                    "studentId": student_id,
                    "className": class_name,
                    "seatNo": seat_no,
                    "name": name,
                    "gender": gender,
                    "phone": phone,
                    "registeredAt": get_now_str()
                }
                students.append(final_student)

            db['students'] = students
            db['logs'].insert(0, {
                "time": get_now_str(),
                "action": f"【學生資料同步】學生 [{name} ({class_name} {seat_no}號 - {student_id})] 資料已成功同步至中央資料庫。"
            })
            save_db(db)
            self._send_json({"success": True, "student": final_student})
            return

        elif parsed.path == '/api/orders/update':
            db = load_db()
            order_id = req_data.get('orderId')
            updates = req_data.get('updates', {})
            orders = db.get('orders', [])

            target = next((o for o in orders if o.get('id') == order_id), None)
            if not target:
                self._send_json({"success": False, "message": f"找不到工單 {order_id}"})
                return

            target.update(updates)
            save_db(db)
            self._send_json({"success": True, "order": target})
            return

        self._send_json({"error": "Unknown API route"}, status=404)

    def _send_json(self, data, status=200):
        resp = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def start_server(port=8080):
    load_db()
    
    # 若請求埠號已被佔用，自動嘗試遞增埠號
    active_port = port
    max_tries = 20
    httpd = None

    for attempt in range(max_tries):
        try:
            server_address = ('0.0.0.0', active_port)
            httpd = ThreadingHTTPServer(server_address, ZgShopRequestHandler)
            break
        except OSError as e:
            if e.errno in (98, 10048): # Address already in use
                print(f"⚠️ 埠號 {active_port} 已被其他程序佔用，自動嘗試下一個可用埠號 {active_port + 1}...")
                active_port += 1
            else:
                raise e

    if not httpd:
        print(f"❌ 無法在埠號 {port} ~ {port + max_tries} 啟動伺服器！")
        sys.exit(1)

    lan_ip = get_lan_ip()

    print("\n" + "=" * 72)
    print("🚀 智光商工 62週年校慶 後台整合管理伺服器 (ZG Shop Backend Server)")
    print("=" * 72)
    print(f"📍 本機後台首頁 (Admin Dashboard): http://localhost:{active_port}/index.html")
    print(f"📱 區網/手機後台 (LAN IP):         http://{lan_ip}:{active_port}/index.html")
    print(f"🛍️ 前台顧客商城 (Storefront):     http://localhost:{active_port}/front/index.html")
    print(f"📡 即時中央資料庫 API:             http://localhost:{active_port}/api/db")
    print(f"🔄 跨裝置資料同步 API:             http://localhost:{active_port}/api/sync")
    print(f"📂 後台根目錄:                     {BASE_DIR}")
    print(f"💾 資料庫檔案:                     {DB_FILE}")
    print("=" * 72)
    print("💡 按下 Ctrl + C 可安全停止伺服器\n")
    sys.stdout.flush()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 伺服器已安全停止。")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="ZG Shop 62nd Anniversary Backend Server")
    parser.add_argument('-p', '--port', type=int, default=8080, help="Server port (default: 8080)")
    args = parser.parse_args()
    start_server(args.port)
