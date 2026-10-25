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
- `/key <api_key>` — Masukkan atau perbarui Orion API Key Anda
- `/model <nama|nomor>` — Lihat katalog atau beralih model AI (`orion`, `agnes`, `nemotron`)
- `/tier <low|medium|high>` — Atur tingkat penalaran (reasoning tier)
- `/clear` — Bersihkan layar terminal
- `/reset` — Mulai percakapan baru (reset riwayat)
- `/help` — Tampilkan bantuan perintah
- `/exit` atau `/q` — Keluar dari obrolan terminal

## Lisensi
MIT License
