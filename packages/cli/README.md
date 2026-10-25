# @orion-agent/cli

Antarmuka baris perintah (CLI) dan launcher resmi untuk **Orion Agent**.

## Instalasi & Penggunaan

Jalankan perintah `orion` langsung dari terminal Anda:

```bash
# Mulai obrolan AI interaktif langsung di terminal (Default)
orion

# Buka antarmuka web di browser default (Port 5001)
orion --view

# Periksa status service Orion Agent
orion --status

# Muat ulang / restart service
orion --restart

# Hentikan service
orion --stop
```

## Perintah Obrolan Terminal (Interactive Chat)

Saat berada dalam sesi terminal chat:
- Tekan tombol `/` langsung pada prompt kosong — rekomendasi perintah akan **langsung muncul secara instan tanpa perlu menekan tombol Enter**. Gunakan panah atas (↑) dan bawah (↓) untuk bernavigasi dan tekan **Enter** untuk memilih rekomendasi. Tekan **Backspace** atau **Esc** untuk membatalkan.
- `/model` — Buka pemilih model AI interaktif dengan panah keyboard (↑ / ↓) dan Enter. Semua model dari custom provider yang Anda tambahkan di antarmuka web (seperti Ollama, OpenAI, Google Gemini, Agnes, dll.) otomatis muncul dan tersinkronisasi di daftar ini.
- `/tier` — Buka pemilih tingkat penalaran interaktif (`low`, `medium`, `high`) dengan panah keyboard (↑ / ↓) dan Enter.
- `/key <api_key>` — Masukkan atau perbarui Orion API Key Anda (otomatis tersinkronisasi ke seluruh sistem).
- `/clear` — Bersihkan layar terminal obrolan.
- `/reset` — Mulai percakapan baru (reset riwayat obrolan).
- `/help` — Tampilkan panduan bantuan perintah.
- `/exit` atau `/q` — Keluar dari obrolan terminal.

## Lisensi
MIT License
