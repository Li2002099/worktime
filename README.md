# 員工上下班打卡系統

React + Node.js + SQLite 打卡系統，以台灣時間（Asia/Taipei）為基準，無需密碼，輸入帳號即可登入。

---

## 帳號清單

| 帳號   | 角色   |
|--------|--------|
| admin  | 管理者 |
| andy   | 員工   |
| jen    | 員工   |
| bob    | 員工   |
| daisey | 員工   |
| willy  | 員工   |
| hong   | 員工   |
| jenna  | 員工   |

---

## 安裝與執行步驟

### 前置條件
- Node.js 18 以上
- npm 9 以上

---

### 步驟一：初始化後端

```powershell
cd d:\worktime\backend
npm install
node init-db.js
```

成功後會看到「✅ 資料庫初始化完成」，並在 backend/ 目錄下產生 `worktime.db`。

---

### 步驟二：啟動後端伺服器

```powershell
cd d:\worktime\backend
npm start
```

後端啟動於 http://localhost:3001

---

### 步驟三：初始化並啟動前端

**開另一個終端機視窗**執行：

```powershell
cd d:\worktime\frontend
npm install
npm run dev
```

前端啟動於 http://localhost:5173，開啟瀏覽器即可使用。

---

## 專案結構

```
worktime/
├── backend/
│   ├── src/
│   │   ├── config/database.js       # SQLite 連線
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT 驗證
│   │   │   └── adminOnly.js         # 管理者權限
│   │   ├── routes/
│   │   │   ├── auth.js              # 登入/登出/me
│   │   │   ├── attendance.js        # 員工打卡 API
│   │   │   └── admin.js             # 管理者 API
│   │   └── utils/timeUtils.js       # 台灣時間工具
│   ├── app.js                       # Express 主程式
│   ├── init-db.js                   # 初始化資料庫
│   ├── worktime.db                  # SQLite 資料庫（執行 init 後產生）
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── contexts/AuthContext.jsx
│   │   ├── services/api.js
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── AdminRoute.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Records.jsx
│   │       ├── AdminDashboard.jsx
│   │       └── AdminUserDetail.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## API 文件

### Authentication

| Method | Path              | 說明                         |
|--------|-------------------|------------------------------|
| POST   | /api/auth/login   | `{ username }` → JWT token  |
| POST   | /api/auth/logout  | 登出（前端清除 token）        |
| GET    | /api/auth/me      | 取得目前登入使用者資訊        |

### 員工打卡

| Method | Path                          | 說明                      |
|--------|-------------------------------|---------------------------|
| POST   | /api/attendance/clock-in      | 上班打卡                  |
| POST   | /api/attendance/clock-out     | 下班打卡（含備註）         |
| GET    | /api/attendance/today         | 今日打卡狀態              |
| PATCH  | /api/attendance/today/note    | 更新今日備註              |
| GET    | /api/attendance/me?month=     | 個人打卡紀錄              |
| GET    | /api/attendance/me/monthly?month= | 個人月統計            |

### 管理者後台

| Method | Path                                    | 說明                |
|--------|-----------------------------------------|---------------------|
| GET    | /api/admin/summary?month=               | 所有員工月統計摘要  |
| GET    | /api/admin/attendance?month=            | 所有員工每日明細    |
| GET    | /api/admin/attendance/user/:id?month=   | 指定員工每日明細    |

---

## 重要邏輯說明

### 台灣時間判斷
- 後端使用 `dayjs` + `dayjs/plugin/timezone`，時區設定為 `Asia/Taipei`
- `getTWDate()` 回傳目前台灣日期（YYYY-MM-DD），用於打卡紀錄的 `work_date` 欄位

### 當日 23:59 限制
- 每次打卡都以「當下台灣日期」作為 `work_date`
- 超過午夜後即為新的一天，前一天的紀錄不可再修改
- 系統不提供補打或預打功能

### 工時整數計算
```
工作時數 = floor((下班時間 - 上班時間) / 60 分鐘)
```
- 09:30 上班，18:00 下班 → 510 分鐘 → floor(510/60) = 8 小時

### 加班時數計算
```
加班時數 = max(0, 工作時數 - 8)
```
- 工作 9 小時 → 加班 1 小時
- 工作 8 小時以下 → 加班 0 小時

### 每月統計
- 只有完成下班打卡（`clock_out IS NOT NULL`）的紀錄才計入月統計
- 未完成下班打卡的紀錄在後台以橘色背景標示「⚠ 未完成下班打卡」

---

## 錯誤處理

| 狀況 | HTTP 狀態碼 | 訊息 |
|------|------------|------|
| 帳號不存在 | 401 | 找不到此帳號 |
| 未登入 / Token 過期 | 401 | 請先登入 / 登入已過期 |
| 權限不足 | 403 | 權限不足，僅限管理者操作 |
| 今日已打上班卡 | 400 | 今日已完成上班打卡 |
| 未打上班卡就打下班卡 | 400 | 尚未完成上班打卡 |
| 今日已打下班卡 | 400 | 今日已完成下班打卡 |
| 查無資料 | 404 | 找不到此使用者 |
