# Orion AI: Unified Design System & Interface Guidelines

Dokumen ini adalah panduan desain resmi (Design System) untuk seluruh halaman, komponen, modal, dan tata letak di Orion AI. Dokumen ini memastikan seluruh halaman (Chat, Dashboard, Provider, Models, Settings, dan Logs) memiliki **konsistensi 100%** dalam hal palet warna, tipografi, struktur kontainer, kartu, tombol, dan komponen antarmuka.

---

## 1. Prinsip Desain: Cozy Monochrome & Natural Minimalist

1. **Konsistensi Token CSS**:
   - Dilarang keras memakai warna hardcoded (seperti hijau emerald `#071714` / `#16362f` / `#2ed59e`) di komponen internal halaman.
   - Semua warna harus merujuk pada CSS variables resmi yang didefinisikan di `packages/web/src/index.css`.
2. **Kesesuaian Dua Tema (Light & Dark Mode)**:
   - **Light Mode**: Palet bernuansa *Ivory Paper & Charcoal Warm* (bersih, bebas silau, latar `#faf9f5` / `#ffffff`, garis batas lembut `#e5e7eb`).
   - **Dark Mode**: Palet bernuansa *Cozy Charcoal & Off-White* (latar `#121213` / `#1c1c1f`, teks `#f5f4ef`, aksen kontras lembut).
3. **Harmonisasi Halaman Provider dan Models**:
   - Baik `Provider` maupun `Models` merupakan halaman konfigurasi AI tingkat lanjut.
   - Keduanya menggunakan wadah layout yang sama: `.page-view-container` dengan `.is-page-mode` (lebar konten konsisten `max-width: 980px`).

---

## 2. Palet Token Warna (Semantic CSS Variables)

| Token CSS | Dark Mode (Default) | Light Mode (Paper) | Penggunaan |
| :--- | :--- | :--- | :--- |
| `--bg-app` | `#121213` | `#faf9f5` | Latar belakang kanvas aplikasi & halaman utama |
| `--bg-sidebar` | `#171719` | `#f3f1ea` | Latar navigasi sidebar kiri |
| `--bg-surface` | `#1c1c1f` | `#ece9e1` | Latar kartu sekunder, filter bar, input slot |
| `--bg-surface-hover` | `#232326` | `#e4e1d7` | Hover pada item list dan tombol |
| `--bg-card` | `#18181b` | `#ffffff` | Latar kartu utama (Provider card, Model card) |
| `--border-subtle` | `#242428` | `#e2dfd7` | Garis pembatas kartu, separator, dan header bar |
| `--border-strong` | `#333338` | `#cfcbc2` | Garis batas elemen interaktif saat hover/fokus |
| `--text-primary` | `#f5f4ef` | `#191816` | Judul, headline, nilai utama, dan label tebal |
| `--text-secondary` | `#9c9a94` | `#6a6760` | Deskripsi, subtitle, dan keterangan pendukung |
| `--text-muted` | `#676560` | `#96938b` | Label kategori, waktu aktivitas, timestamp |
| `--accent-solid` | `#f5f4ef` | `#121213` | Tombol primer, tab pill aktif |
| `--accent-solid-text`| `#121213` | `#ffffff` | Teks di atas tombol aksen primer |
| `Status Active` | `#3b82f6` / `#10b981` | `#2563eb` / `#059669` | Indikator model/provider aktif, badge verified |

---

## 3. Tipografi & Skala Teks

- **Sans Font Family**: `-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Text", "Inter", sans-serif`
- **Monospace Font Family**: `"SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace`

### Hierarki Tipografi:
- **Judul Halaman (`.page-view-title`)**: `font-size: clamp(1.4rem, 2.8vw, 1.85rem)`, `font-weight: 600`, `letter-spacing: -0.02em`.
- **Subjudul Halaman (`.page-view-subtitle`)**: `font-size: 0.86rem`, `color: var(--text-secondary)`, `line-height: 1.5`.
- **Label Seksi (`.provider-section-label`)**: `font-size: 0.7rem`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.05em`, `color: var(--text-muted)`.
- **Nama Kartu Model / Provider**: `font-size: 0.86rem`, `font-weight: 700`, `font-family: var(--font-mono)`.

---

## 4. Standar Komponen Antarmuka

### A. Kontainer Halaman Penuh (`.page-view-container`)
```css
.page-view-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 2rem 2rem 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-app);
}

.models-page-content.is-page-mode,
.provider-page-content.is-page-mode {
  max-width: 980px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
```

### B. Kartu Model & Provider
- **Latar belakang**: `var(--bg-card)` atau `var(--bg-surface)`
- **Radius sudut**: `12px` (`var(--radius-md)`)
- **Border**: `1px solid var(--border-subtle)`
- **Hover**: Mengangkat sedikit (`transform: translateY(-2px)`), batas berubah ke `var(--border-strong)`.
- **Status Aktif**: Border biru subtle `rgba(59, 130, 246, 0.6)` dengan glow halus.

### C. Badge / Pill Tag (`.models-badge-pill`, `.provider-card-pill`)
- **Gaya**:
  - `font-size: 0.68rem;`
  - `font-weight: 500;`
  - `border-radius: 4px;`
  - `background: rgba(0, 0, 0, 0.04);` (Dark: `rgba(255, 255, 255, 0.06);`)
  - `border: 1px solid var(--border-subtle);`
  - `color: var(--text-secondary);`

### D. Tombol Aksi
- **Tombol Utama (`CHANGE`, `Selesai`)**:
  - `background: var(--accent-solid);`
  - `color: var(--accent-solid-text);`
  - `border-radius: 6px;`
- **Tombol Sekunder (`CONFIGURE`, `USE AS ⌵`)**:
  - `background: var(--bg-card);` atau `transparent;`
  - `border: 1px solid var(--border-subtle);`
  - `color: var(--text-primary);`
  - `border-radius: 6px;`
  - Hover: `background: var(--bg-surface-hover); border-color: var(--border-strong);`

### E. Dialog Modal (`.modal-dialog`, `.modal-backdrop`)
- **Backdrop**: `rgba(0, 0, 0, 0.5)` dengan `backdrop-filter: blur(8px)`.
- **Box Modal**: `background: var(--bg-card)`, `border: 1px solid var(--border-subtle)`, `border-radius: 16px`, `box-shadow: var(--shadow-dock)`.
- Header modal memiliki judul bersih `font-weight: 600` dan tombol tutup silang (`X`).

---

## 5. Aturan Integrasi Provider & Models

1. **Tidak Ada Model Duplikat**:
   - Model yang didaftarkan melalui Provider resmi tidak boleh diduplikasi dengan model statis hardcoded.
   - Gunakan normalisasi ID (`cleanModId = modelId.toLowerCase().trim()`) saat parsing.
2. **Format Badge Endpoint yang Bersih**:
   - Jangan menyertakan protokol `https://` atau trailing path `/v1` pada badge (contoh yang benar: `pi.leopard-gila.ts.net` atau `Official`, bukan `custom:https://pi.leopard-gila.ts.net/v1`).
3. **Perhitungan Sesi Nyata**:
   - Menghitung sesi dari array `sessions` yang benar-benar menggunakan model terkait atau pesan aktif.

---
*Dokumen ini diperbarui secara otomatis untuk memastikan seluruh pengembang dan agent AI mempertahankan kualitas visual Orion AI.*
