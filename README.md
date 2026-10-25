# 🌌 Orion Agent

> Intelligent Cosmic AI Platform & Assistant — CLI & Monorepo Architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](file:///Users/arjunalanangadiwarsana/Herd/ORIONAI/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Monorepo](https://img.shields.io/badge/Monorepo-npm%20workspaces-crimson.svg)](https://docs.npmjs.com/cli/using-npm/workspaces)

Orion Agent adalah platform asisten kecerdasan kosmik berbasis Web & CLI yang dilengkapi arsitektur streaming token waktu nyata (SSE), rendering Markdown interaktif (LaTeX, Mermaid flowchart, code highlighting), dan antarmuka kosmik modern.

---

## 🏛️ Arsitektur Monorepo Workspaces

Proyek ini menggunakan standar **NPM Workspaces** yang memisahkan modul-modul sistem ke dalam `packages/`:

```text
ORIONAI/
├── bin/
│   └── orion.js                 # Global executable entry point
├── packages/
│   ├── cli/                     # Package @orion-agent/cli
│   │   ├── bin/orion.js         # Command line launcher (--view, --port, -h)
│   │   └── package.json
│   ├── server/                  # Package @orion-agent/server (Express & AI Engine)
│   │   ├── src/
│   │   │   ├── controllers/     # Controller chat, item, streaming
│   │   │   ├── middleware/      # Error handling & rate limiter
│   │   │   ├── routes/          # REST & SSE stream endpoints
│   │   │   ├── services/        # AI Provider service (OpenAI-compatible)
│   │   │   └── server.js        # Server entry & static SPA serving
│   │   ├── .env.example         # Environment template
│   │   └── package.json
│   └── web/                     # Package @orion-agent/web (React + Vite SPA)
│       ├── src/                 # Antarmuka kosmik, komponen chat, aurora UI
│       ├── public/              # Aset statis & logo
│       ├── vite.config.js       # Konfigurasi Vite & dev proxy
│       └── package.json
├── package.json                 # Monorepo root workspace & distribution config
├── .npmignore                   # Filter asset untuk publish package
├── LICENSE                      # MIT License
└── README.md
```

---

### 1. Obrolan Terminal Interaktif (Default)
Jalankan perintah `orion` tanpa argumen untuk langsung masuk ke sesi obrolan terminal interaktif:

```bash
# Langsung masuk ke sesi terminal chat
orion

# Atau via npm:
npm run chat
```

> **Fitur Terminal Chat:**
> - Ketik `/` pada prompt kosong untuk memunculkan **rekomendasi perintah instan** (tanpa perlu menekan tombol Enter).
> - Gunakan panah atas (↑) dan bawah (↓) lalu tekan **Enter** untuk memilih rekomendasi perintah (`/model`, `/tier`, `/key`, dll.).
> - Pemilih model (`/model`) otomatis menampilkan seluruh model dari custom provider yang Anda tambahkan di antarmuka web.

### 2. Jalankan Antarmuka Web di Browser
Cukup panggil perintah `view` atau opsi `--view` untuk menyalakan service dan otomatis membuka antarmuka web di browser:

```bash
# Menyalakan service dan otomatis membuka browser
orion --view

# Atau via npm:
npm run view
```

### Opsi Perintah CLI

```text
Penggunaan:
  orion [opsi]
  orion --view          Jalankan service dan langsung buka Orion Agent di browser
  orion start           Jalankan service server di foreground
  orion --port <angka>  Gunakan port kustom (default: 5001)

Opsi:
  --view, -v            Otomatis membuka browser default ke antarmuka web
  --port, -p <nomor>    Tentukan port server (default: 5001)
  --help, -h            Tampilkan petunjuk penggunaan ini
  --version, -V         Tampilkan versi Orion Agent
```

---

## 🛠️ Pengembangan Lokal (Development)

Untuk mengembangkan modul-modul di dalam monorepo:

```bash
# 1. Install semua dependensi di seluruh packages:
npm install

# 2. Build antarmuka web (Vite production bundle):
npm run build

# 3. Mode pengembangan terpisah:
npm run dev:server      # Menjalankan backend server dengan hot-reload
npm run dev:web         # Menjalankan Vite dev server di http://localhost:5173
```

---

## ⚙️ Konfigurasi Environment (.env)

Buat file `packages/server/.env` (atau `.env` di root direktori):

```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
AI_BASE_URL=
AI_API_KEY=your_orion_api_key_here
AI_MODEL=orion
```

---

## 📄 Lisensi

Didistribusikan di bawah lisensi [MIT](file:///Users/arjunalanangadiwarsana/Herd/ORIONAI/LICENSE). Dikelola oleh **Lanvry**.
