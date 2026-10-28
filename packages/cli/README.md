# @orion-agent/cli

Antarmuka baris perintah (CLI) dan launcher resmi untuk **Orion Agent**.

## Instalasi & Penggunaan

Jalankan perintah `orion` langsung dari terminal Anda:

```bash
# Mulai obrolan AI interaktif langsung di terminal (Default)
orion

# Jalankan service di latar belakang & buka antarmuka web di browser (Rekomendasi)
orion --view --bg

# Buka antarmuka web di browser (foreground)
orion --view

# Jalankan service di latar belakang tanpa membuka browser (daemon)
orion --bg

# Periksa status service Orion Agent
orion --status

# Muat ulang / restart service
orion --restart

# Hentikan service
orion --stop
```

## Fitur Interaktif & Pintasan (Pi-Engine Style)

Antarmuka terminal didesain responsif dan canggih mengikuti filosofi [Pi AI agent](https://github.com/earendil-works/pi):

### 1. Pintasan Cepat (Keyboard Shortcuts)
- **`Ctrl+L`** — Buka pemilih model AI seketika tanpa perlu mengetik perintah.
- **`Shift+Tab`** — Putar tingkat penalaran (*reasoning tier*) secara instan (`low` → `medium` → `high`).
- **`Ctrl+C`** — Hentikan respon AI yang sedang streaming atau bersihkan baris ketikan.
- **`Ctrl+D`** — Keluar dari sesi terminal secara bersih.
- **`Tab`** — Lengkapi otomatis (*auto-complete*) saran perintah atau model.
- **`Esc`** — Tutup pop-up rekomendasi perintah.

### 2. Eksekusi Perintah Shell Terminal (`!`)
- **`!<perintah>`** (misal `!git status`, `!ls -la`, `!npm test`) — Jalankan perintah sistem langsung di folder proyek Anda. Outputnya ditampilkan rapi di terminal dan **otomatis disertakan ke dalam memori percakapan AI** agar Orion dapat menganalisis dan mendiskusikan hasilnya!
- **`!!<perintah>`** — Jalankan perintah shell secara diam-diam tanpa menyertakan hasilnya ke memori AI.

### 3. Perintah Slash (Slash Commands)
- **`/`** — Buka menu rekomendasi perintah interaktif secara real-time saat mengetik.
- **`/model [nama]`** — Buka pemilih model interaktif (panah ↑ / ↓) atau beralih model langsung.
- **`/thinking [level]` / `/tier [level]`** — Atur tingkat penalaran (`low`, `medium`, `high`).
- **`/session`** — Tampilkan detail sesi aktif (folder kerja, statistik pesan, estimasi token, status API key).
- **`/copy`** — Salin respon terakhir dari asisten langsung ke clipboard sistem Anda.
- **`/compact`** — Kompak percakapan lama untuk menghemat token konteks AI.
- **`/hotkeys`** — Tampilkan ringkasan seluruh pintasan keyboard.
- **`/settings`** — Tampilkan konfigurasi dan preferensi yang sedang aktif.
- **`/login [key]` / `/key [key]`** — Sambungkan atau perbarui Orion API Key (tersinkronisasi ke web & server).
- **`/logout`** — Hapus kredensial API Key yang tersimpan.
- **`/clear`** — Bersihkan layar terminal obrolan.
- **`/new` / `/reset`** — Mulai sesi percakapan baru & kosongkan riwayat obrolan.
- **`/help`** — Tampilkan panduan lengkap semua perintah.
### 4. Sinkronisasi Real-time Web View & Terminal
- **Dua Arah (Bidirectional Sync)**: Sesi obrolan, perintah, dan percakapan di terminal secara otomatis tersinkronisasi dua arah dengan antarmuka Web View (`localhost:3000` / `localhost:5173`).
- **Paritas Persona Jarvis**: Perlakuan sapaan ramah dan eksekusi alat otonom (Superpowers & Jarvis partner) memiliki paritas 1:1 antara terminal dan antarmuka web, memastikan konsistensi respon tanpa divergensi.

## Lisensi
MIT License
