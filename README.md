# Fullstack Starter: Express.js + React Vite

Template fullstack siap oprek dengan arsitektur terpisah antara **Backend (Express.js)** dan **Frontend (React + Vite)**.

---

## 📁 Struktur Direktori

```text
ORIONAI/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── itemController.js      # Logika CRUD & manipulasi data
│   │   ├── routes/
│   │   │   ├── apiRoutes.js           # Endpoint /api/health & /api/info
│   │   │   └── itemRoutes.js          # REST Endpoint /api/items
│   │   ├── middleware/
│   │   │   └── errorHandler.js        # Global error & 404 handler
│   │   └── server.js                  # Entry point Express.js
│   ├── .env                           # Konfigurasi PORT & environment
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Komponen utama dengan CRUD Sandbox
│   │   ├── App.css                    # Styling modern vanilla CSS
│   │   ├── index.css                  # Design tokens & CSS variables
│   │   └── main.jsx                   # Entry point React
│   ├── index.html
│   ├── vite.config.js                 # Dev proxy /api -> http://localhost:5001
│   └── package.json
│
├── package.json                       # Helper script root
└── README.md
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan Backend (Port 5001)
```bash
cd backend
npm install   # jika belum
npm run dev
```
> **Catatan:** Backend memakai port `5001` (bukan 5000) untuk menghindari bentrok dengan AirPlay / ControlCenter bawaan macOS.

### 2. Jalankan Frontend (Port 5173)
Buka terminal baru:
```bash
cd frontend
npm install   # jika belum
npm run dev
```

Buka browser di: **`http://localhost:5173`**

---

## 🌐 REST API Endpoints Tersedia

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Status kesehatan server |
| `GET` | `/api/info` | Metadata API & daftar routes |
| `GET` | `/api/items` | Ambil semua items |
| `POST` | `/api/items` | Tambah item baru (`{ title, description, status }`) |
| `GET` | `/api/items/:id` | Ambil detail satu item |
| `PUT` | `/api/items/:id` | Update data/status item |
| `DELETE` | `/api/items/:id` | Hapus item |

---

## 🤖 Konfigurasi AI Model (OpenAI-Compatible)

Platform ini menggunakan single model **`orion`** dengan protokol OpenAI-compatible:

- **AI Base URL**: `https://pi.leopard-gila.ts.net/v1`
- **Model**: `orion`
- **Fitur**: Mendukung **Real-time SSE Token Streaming** sehingga kata-kata muncul mengalir (*typing stream*) secara langsung di frontend.

Konfigurasi tersimpan di file [`backend/.env`](file:///Users/arjunalanangadiwarsana/Herd/ORIONAI/backend/.env):
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
AI_BASE_URL=https://pi.leopard-gila.ts.net/v1
AI_API_KEY=your_orion_api_key_here
AI_MODEL=orion
```
