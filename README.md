# Media Metadata Analyzer

Aplikasi web untuk membaca dan menganalisis metadata dari file foto dan video, menggunakan
[ExifTool](https://exiftool.org) sebagai engine utama. Fokus utama pada deteksi
GPS/lokasi, tapi menampilkan seluruh metadata relevan (kamera, tanggal, teknis, dsb).

Dibangun sepenuhnya di atas [Bun](https://bun.sh) — satu runtime untuk server, bundler,
dan test runner. Tanpa Node.js, tanpa Vite.

## Fitur

- **Upload drag-and-drop** — bisa pilih beberapa file sekaligus, lihat nama/ukuran/tipe file
  sebelum dianalisis, dan hapus file dari daftar sebelum dianalisis
- **Format yang didukung**: JPEG, PNG, HEIC/HEIF, TIFF, WebP, GIF, AVIF (gambar) dan
  MP4, MOV, M4V, AVI, MKV, WebM (video)
- **Deteksi GPS/lokasi** — latitude, longitude, altitude, GPS timestamp, arah (direction),
  ditampilkan dalam format desimal *dan* DMS (derajat/menit/detik), dengan penanganan
  N/S/E/W yang benar
- **Reverse geocoding opsional** — mengubah koordinat GPS menjadi nama negara/provinsi/kota
  (hanya koordinat yang dikirim, file asli tidak pernah dikirim ke pihak ketiga)
- **Peta interaktif** (Leaflet + OpenStreetMap) dengan tombol "Open in Google Maps" dan
  "Open in OpenStreetMap"
- **Metadata explorer** — kelompok kategori (File, Image/Video, Camera, Date & Time,
  Technical, Raw) yang bisa expand/collapse, dicari (search key/value), disalin (copy),
  dan diekspor ke JSON/CSV
- **Progress tahap asli** — status "Uploading... → Validating... → Extracting... →
  Analyzing GPS... → Resolving location... → Complete" mengikuti proses backend
  yang sesungguhnya, bukan progress bar palsu
- **Privacy-first** — file yang diupload divalidasi dari isi biner (bukan dari nama/ekstensi/
  MIME type yang gampang dipalsukan), disimpan sementara dengan nama acak, lalu langsung
  dihapus setelah dianalisis. Tidak ada file/metadata yang disimpan permanen atau ke database
- Tampilan dark-mode ala forensic/developer tool (Tailwind CSS v4)

## Requirement

- [Bun](https://bun.sh) ≥ 1.4
- [ExifTool](https://exiftool.org) ≥ 12, harus tersedia di `PATH`

## Cara Install

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Install ExifTool

```bash
# macOS
brew install exiftool

# Debian/Ubuntu
sudo apt-get install libimage-exiftool-perl

# Cek instalasi
exiftool -ver
```

### 3. Install dependency project

```bash
bun install
```

### 4. Siapkan environment variable

```bash
cp .env.example .env
```

Nilai default sudah cukup untuk jalan di lokal (lihat tabel [Environment Variables](#environment-variables)
kalau mau mengubah, misalnya mengaktifkan reverse geocoding).

### 5. Jalankan

```bash
bun run dev
```

Buka **http://localhost:3000** di browser.

## Perintah yang tersedia

```bash
bun install     # install dependency
bun run dev     # jalankan dev server + HMR
bun run build   # build client (React + Tailwind + assets) ke ./dist
bun run start   # jalankan production server
bun test        # jalankan seluruh test
```

## Environment Variables

Lihat `.env.example` untuk daftar lengkap.

| Variable | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP server |
| `NODE_ENV` | — | `production` akan menyajikan build dari `dist/` |
| `MAX_FILE_SIZE` | `100MB` | Batas ukuran upload (`B`/`KB`/`MB`/`GB`) |
| `UPLOAD_DIR` | `./uploads` | Folder sementara untuk file yang sedang diproses |
| `REVERSE_GEOCODING_PROVIDER` | _(kosong)_ | `nominatim`, `opencage`, atau kosong/`none` untuk menonaktifkan |
| `REVERSE_GEOCODING_API_KEY` | _(kosong)_ | Wajib diisi untuk provider berbasis API key (mis. `opencage`) |
| `RATE_LIMIT_PER_MINUTE` | `20` | Batas request per IP per menit ke `/api/analyze` |
| `CORS_ALLOWED_ORIGIN` | `*` | Nilai header `Access-Control-Allow-Origin` |

Reverse geocoding hanya jalan kalau file memang punya koordinat GPS, dan hanya koordinat
(bukan file) yang dikirim ke provider yang dikonfigurasi.

## Docker

```bash
docker build -t media-metadata-analyzer .
docker run --rm -p 3000:3000 --env-file .env media-metadata-analyzer
```

Image sudah mencakup Bun + ExifTool, dan berjalan sebagai non-root user.

## Testing

```bash
bun test
```

Mencakup unit test (konversi GPS, deteksi signature file, hash SHA-256, path traversal
protection) dan integration test upload gambar/video lewat `/api/analyze`.

## Dokumentasi API

`POST /api/analyze` — upload file via `multipart/form-data` (field `file`), respons berupa
newline-delimited JSON yang mengikuti tahap proses asli:

```
{"stage":"validating"}
{"stage":"extracting"}
{"stage":"analyzing-gps"}
{"stage":"resolving-location"}
{"stage":"complete","success":true,"file":{...},"metadata":{...},"gps":{...},"location":{...}}
```

Kalau file tidak punya GPS, `gps` dan `location` bernilai `null` — tidak pernah dikarang.
`GET /api/health` untuk healthcheck.
