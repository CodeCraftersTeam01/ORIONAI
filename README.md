<div align="center">

  <img src="packages/web/public/orion-logo.svg" alt="Orion AI Logo" width="130" height="130" />

  # 🌌 ORION AI

  ### Autonomous Engineering Partner & Cosmic AI Platform
  **Modern Monorepo Architecture • Real-Time Voice Calling • Interactive Terminal CLI • In-Built Superpowers**

  <p align="center">
    <a href="#-key-features">Key Features</a> •
    <a href="#-monorepo-architecture">Architecture</a> •
    <a href="#-quickstart">Quickstart</a> •
    <a href="#-interactive-terminal-cli">Terminal CLI</a> •
    <a href="#-skills-ecosystem">Skills Hub</a> •
    <a href="#-configuration">Configuration</a> •
    <a href="#-contributing">Contributing</a>
  </p>

  <p align="center">
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License MIT" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
    <a href="https://docs.npmjs.com/cli/using-npm/workspaces"><img src="https://img.shields.io/badge/Monorepo-NPM%20Workspaces-crimson?style=flat-square&logo=npm&logoColor=white" alt="NPM Workspaces" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Frontend-Vite%20%2B%20React-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite React" /></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Backend-Express%20%2B%20SSE-black?style=flat-square&logo=express&logoColor=white" alt="Express SSE" /></a>
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
  </p>

</div>

---

## 🌟 Overview

**Orion AI** adalah platform asisten kecerdasan buatan dan mitra rekayasa perangkat lunak (*Senior Engineering Partner & Autonomous Collaborator*) berarsitektur monorepo modern. Didesain dari awal untuk menjembatani komunikasi lisan manusia dan otomasi rekayasa kode presisi tinggi, Orion mengintegrasikan:

- **Voice Dialogue Stage (Mode Panggilan Suara)**: Percakapan audio alami bebas delay dengan pembersihan teks lisan adaptif, kartu persetujuan interaktif (*Approval Cards*), dan sintesis suara tanpa teks robotik.
- **Terminal & Web Parity**: Pengalaman obrolan terminal berkecepatan tinggi (*Pi-Engine style*) yang tersinkronisasi dua arah secara *real-time* dengan dashboard web.
- **In-Built Superpowers Methodology**: Metodologi rekayasa perangkat lunak menyeluruh (*Socratic Brainstorming, Approach Options with Trade-offs, TDD, and Verification Before Completion*) yang tertanam permanen di dalam *runtime* agen otonom.
- **Universal Multi-Platform Skills Hub**: Ekosistem keterampilan otonom yang dapat diperluas untuk Claude, Gemini, Hermes, dan universal tooling dengan isolasi *safety guard*.

---

## ✨ Key Features

| Fitur | Deskripsi |
| :--- | :--- |
| 🎙️ **Synchronized Orion Voice Mode** | Panggilan suara dua arah dengan antarmuka elegan, deteksi giliran bicara (*turn-taking*), pembersihan teks otomatis, dan kartu persetujuan eksekusi (*system approval card*). |
| ⚡ **Interactive Terminal CLI (`orion`)** | Terminal interaktif kaya fitur: popup rekomendasi perintah instan saat mengetik `/`, pintasan keyboard (`Ctrl+L`, `Shift+Tab`), serta eksekusi shell langsung (`!<perintah>`). |
| 🧠 **In-Built Superpowers Engine** | Aturan baku arsitektur yang mewajibkan AI berdialog Sokratik sebelum *coding*, mengusulkan opsi dengan *trade-off*, dan memverifikasi hasil nyata sebelum menyatakan tugas selesai. |
| 💬 **Conversational Tool Feedback** | Respons dinamis, hangat, dan komunikatif saat memeriksa direktori atau menjalankan berkas (misal: *"Oh di folder ini ditemukan berkas .DS_Store nih bang..."*). |
| 🔄 **Bidirectional Real-Time Sync** | Riwayat pesan, sesi obrolan, eksekusi tool, dan preferensi tersinkronisasi secara instan antara Terminal CLI dan Web Dashboard. |
| 🛡️ **Autonomous Safety Guard** | Proteksi terisolasi terhadap eksekusi perintah berbahaya atau modifikasi berkas di luar *workspace root* yang diizinkan. |
| 🧩 **Extensible Skills Architecture** | Pemasangan keahlian multi-platform (1-click install dari Hub atau via URL git) yang dapat dipanggil agen secara dinamis melalui tool `use_skill`. |

---

## 🏛️ Monorepo Architecture

Proyek ini dibangun menggunakan standar **NPM Workspaces** yang modular, rapi, dan independen:

```text
ORIONAI/
├── bin/
│   └── orion.js                 # Global binary wrapper untuk npx / global install
├── packages/
│   ├── cli/                     # @orion-agent/cli — Terminal engine & CLI daemon launcher
│   │   ├── bin/orion.js         # Command line entry point (--view, --bg, --status, dll.)
│   │   ├── src/                 # Terminal UI, keyboard hotkeys, and sync adapters
│   │   └── package.json
│   ├── server/                  # @orion-agent/server — Express, SSE Streaming & AI Core Engine
│   │   ├── src/
│   │   │   ├── agent/           # Autonomous agent loop, tool definitions, & safety guard
│   │   │   ├── controllers/     # Session, chat, and hub controllers
│   │   │   ├── routes/          # REST endpoints & SSE streaming handlers
│   │   │   ├── services/        # AI Provider router, combo/fusion, and skill services
│   │   │   └── server.js        # Server entry point & static SPA delivery
│   │   ├── data/                # Local database, session storage, and skills registry
│   │   └── package.json
│   └── web/                     # @orion-agent/web — React 18 + Vite SPA Client
│       ├── src/
│       │   ├── components/      # VoiceCallingOverlay, SkillsView, SettingsModal, ModelsView
│       │   ├── utils/           # Adaptive textCleaner, soundEffects, and speech synthesis
│       │   ├── App.jsx          # Unified state orchestrator & cosmic aurora UI
│       │   └── App.css          # Curated aesthetic design system (Vanilla CSS)
│       ├── public/              # Static SVG/PNG logos and audio synthesizer assets
│       ├── vite.config.js       # Vite configuration with backend proxy
│       └── package.json
├── package.json                 # Monorepo root workspace configuration
├── LICENSE                      # MIT Open-Source License
└── README.md                    # Project documentation
```

---

## 🚀 Quickstart

### Prasyarat
- **Node.js**: versi `18.0.0` atau yang lebih baru
- **NPM**: versi `9.0.0` atau yang lebih baru
- **OS**: macOS, Linux, atau Windows (WSL disarankan)

### 1. Kloning & Instalasi Dependensi
```bash
# Kloning repositori
git clone https://github.com/CodeCraftersTeam01/ORIONAI.git
cd ORIONAI

# Instal seluruh dependensi di semua workspace packages
npm install
```

### 2. Konfigurasi Environment
Salin berkas contoh konfigurasi ke `packages/server/.env` (atau di root):
```bash
cp packages/server/.env.example packages/server/.env
```

Isi variabel utama di `packages/server/.env`:
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
AI_BASE_URL=
AI_API_KEY=your_orion_api_key_here
AI_MODEL=orion
```

### 3. Kompilasi & Jalankan
```bash
# Build paket frontend web
npm run build

# Menjalankan antarmuka web langsung di browser
npm run view

# Atau mulai obrolan terminal interaktif
npm run chat
```

---

## 💻 Interactive Terminal CLI

Orion dilengkapi dengan antarmuka baris perintah canggih bergaya **Pi AI Agent**:

```bash
# Masuk ke sesi terminal interaktif (Default)
orion

# Buka Web Dashboard di browser secara otomatis
orion --view

# Jalankan service di latar belakang (daemon background)
orion --view --bg

# Periksa status service dan port yang digunakan
orion --status

# Hentikan atau muat ulang service
orion --stop
orion --restart
```

### Pintasan Keyboard (Hotkeys)
| Tombol | Tindakan |
| :--- | :--- |
| `Ctrl + L` | Membuka pemilih model AI (*Interactive Model Selector*) seketika. |
| `Shift + Tab` | Mengganti tingkat penalaran AI (*reasoning tier*): `low` → `medium` → `high`. |
| `Tab` | Melengkapi otomatis (*auto-complete*) saran perintah slash atau model. |
| `Ctrl + C` | Membatalkan streaming respon AI atau membersihkan input baris. |
| `Ctrl + D` | Keluar dari sesi terminal secara bersih. |
| `Esc` | Menutup menu rekomendasi perintah. |

### Eksekusi Shell Langsung (`!`)
Ketik tanda seru `!` di awal kalimat untuk mengeksekusi perintah terminal sistem secara langsung di folder proyek aktif:
```bash
# Jalankan git status dan sertakan hasilnya ke dalam memori analisis AI
!git status

# Jalankan unit test dan biarkan Orion menganalisis kegagalannya
!npm test

# Jalankan perintah secara diam-diam tanpa menyertakan output ke memori AI
!!ls -la
```

---

## 🎙️ Voice Calling Overlay (Orion Voice Mode)

Mode panggilan suara Orion dirancang dengan estetika *borderless typography*, bebas gangguan visual, dan responsif:
- **Zero-Glitch Speech Display**: Didukung algoritma *text cleaner* pintar yang memisahkan kata menempel (*squished compound words*), menjaga ekstensi berkas sistem seperti `.DS_Store`, dan merapikan tanda baca.
- **Interactive Approval Gates**: Saat model AI perlu menjalankan tool kritis (menulis berkas, menjalankan perintah bash, menghapus file), kartu persetujuan interaktif muncul seketika di layar dengan tombol **Setujui (Approve)** dan **Tolak (Reject)**.
- **Natural Dynamic Tone**: AI menyapa hangat layaknya rekan kerja, menjelaskan hasil temuan dengan gaya bahasa manusiawi, dan tidak pernah membalas dengan kalimat robotik template.

---

## 🧩 Skills Ecosystem

Orion memiliki arsitektur keahlian bawaan dan eksternal yang fleksibel:

- **In-Built Superpowers Methodology**: Kemampuan bawaan inti yang selalu aktif untuk memastikan semua rekayasa perangkat lunak berjalan terstruktur, teruji, dan terverifikasi.
- **Skills Hub**: Akses ke katalog keahlian populer lintas platform (*antislop, bang-motion, tdd-practitioner, ponytail*, dll.) yang dapat diunduh langsung dari web atau dipasang via URL GitHub.
- **Custom Skills Directory**: Letakkan file `SKILL.md` di `.agents/skills/<nama_skill>/` pada proyek Anda, dan Orion Agent akan otomatis mengenali dan memuatnya saat sesi aktif.

---

## 🛠️ Monorepo Scripts Reference

Gunakan perintah root npm berikut untuk mempermudah alur kerja pengembangan:

```bash
# Pengembangan lokal
npm run dev              # Menjalankan server dan web secara simultan
npm run dev:server       # Menjalankan server backend dengan nodemon
npm run dev:web          # Menjalankan Vite dev server di http://localhost:5173

# Kompilasi & Build
npm run build            # Membangun bundle produksi paket web
npm run build:web        # Membangun bundle web SPA

# Menjalankan Aplikasi
npm run start            # Menjalankan server backend produksi
npm run chat             # Memulai sesi obrolan terminal interaktif
npm run view             # Menjalankan service dan membuka browser secara otomatis
```

---

## ⚙️ Configuration Reference

| Variabel | Deskripsi | Default |
| :--- | :--- | :--- |
| `PORT` | Port HTTP yang digunakan oleh server backend. | `5001` |
| `NODE_ENV` | Mode lingkungan aplikasi (`development` / `production`). | `development` |
| `CLIENT_URL` | URL origin yang diizinkan untuk CORS frontend. | `http://localhost:5173` |
| `AI_BASE_URL` | Endpoint API kompatibel OpenAI untuk inferensi LLM. | `https://pi.leopard-gila.ts.net/v1` |
| `AI_API_KEY` | API Key otentikasi untuk provider model AI. | *Opsional jika proxy lokal* |
| `AI_MODEL` | Identifier model AI default yang aktif. | `orion` |

---

## 🤝 Contributing & Git Guidelines

Kami menyambut kontribusi dari komunitas! Sebelum membuat Pull Request:

1. Pastikan kode mengikuti standar kebersihan komentar dan tata bahasa (*anti-slop guidelines*).
2. Uji build frontend sebelum commit: `npm run build`.
3. Gunakan pesan commit yang deskriptif mengikuti konvensi [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(...)`: Fitur atau kapabilitas baru
   - `fix(...)`: Perbaikan bug atau penyesuaian logika
   - `refactor(...)`: Restrukturisasi kode tanpa mengubah perilaku
   - `docs(...)`: Dokumentasi dan panduan

---

## 📄 License

Proyek ini didistribusikan di bawah lisensi terbuka [MIT](LICENSE).  
Dikelola dengan bangga oleh tim **CodeCrafters / Lanvry**.
