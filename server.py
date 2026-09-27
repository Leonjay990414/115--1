import os
import sys
import json
import time
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse

PORT = 8080
DB_FILE = os.path.join(os.path.dirname(__file__), 'data', 'db.json')

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

def load_db():
    if not os.path.exists(DB_FILE):
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        init_data = {
            "students": DEFAULT_STUDENTS,
            "orders": DEFAULT_ORDERS,
            "products": DEFAULT_PRODUCTS,
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
            "logs": [
                { "time": get_now_str(), "action": "【系統重啟】雲端統一資料庫引擎成功初始化，跨裝置即時同步已啟動。" }
            ],
            "slipCounter": 6
        }
        save_db(init_data)
        return init_data

    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {DB_FILE}: {e}")
        return {"students": DEFAULT_STUDENTS, "orders": DEFAULT_ORDERS, "products": DEFAULT_PRODUCTS, "logs": [], "slipCounter": 6}

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
            # 跨裝置整包資料合併與儲存
            db = load_db()
            if 'students' in req_data and isinstance(req_data['students'], list):
                # 依據 studentId 合併學生名冊
                existing_map = {s['studentId']: s for s in db.get('students', [])}
                for s in req_data['students']:
                    existing_map[s['studentId']] = s
                db['students'] = list(existing_map.values())

            if 'orders' in req_data and isinstance(req_data['orders'], list):
                # 依據 id 合併工單
                order_map = {o['id']: o for o in db.get('orders', [])}
                for o in req_data['orders']:
                    order_map[o['id']] = o
                db['orders'] = list(order_map.values())

            if 'products' in req_data and isinstance(req_data['products'], list):
                db['products'] = req_data['products']

            if 'slipCounter' in req_data:
                db['slipCounter'] = max(int(db.get('slipCounter', 6)), int(req_data['slipCounter']))

            if 'logs' in req_data and isinstance(req_data['logs'], list):
                # 合併日誌
                existing_actions = {l['time'] + l['action'] for l in db.get('logs', [])}
                for l in req_data['logs']:
                    key = l.get('time', '') + l.get('action', '')
                    if key not in existing_actions:
                        db['logs'].insert(0, l)
                db['logs'] = db['logs'][:150]

            save_db(db)
            self._send_json({"success": True, "db": db})
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

            # 嚴格約束：同一個班級只能有一個特定座號，不可被不同學號佔用
            for s in students:
                if s.get('studentId') != student_id and s.get('className', '').lower() == class_name.lower():
                    s_seat = str(int(s.get('seatNo', 0))) if str(s.get('seatNo', '')).isdigit() else str(s.get('seatNo', ''))
                    if s_seat == seat_no:
                        self._send_json({
                            "success": False,
                            "message": f"【座號已被註冊】「{class_name}」已有 {seat_no} 號學生（{s.get('name')}，學號 {s.get('studentId')}）完成註冊！同一個班級每個座號僅限 1 位學生使用，請確認您的班級與座號。"
                        })
                        return

            # 搜尋現有學號
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

if __name__ == '__main__':
    load_db()
    server_address = ('0.0.0.0', PORT)
    httpd = ThreadingHTTPServer(server_address, ZgShopRequestHandler)
    print(f"ZG Shop Cross-Device Sync Server running on http://0.0.0.0:{PORT}...")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
