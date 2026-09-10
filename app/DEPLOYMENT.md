# Deployment Publik dengan Docker dan Tailscale Funnel

## Arsitektur

```text
Internet -> Tailscale Funnel (HTTPS) -> 127.0.0.1:3000 -> frontend -> backend:8000 -> Groq API
```

Hanya Tailscale Funnel yang menerima trafik internet. Frontend hanya bind ke loopback host dan backend hanya tersedia di jaringan internal Compose. Browser memakai `/api`, jadi tidak perlu mengatur CORS atau URL backend publik.

## Persiapan Server

- Linux dengan Docker Engine dan Docker Compose terbaru.
- Tailscale 1.38.3 atau lebih baru.
- MagicDNS, HTTPS Certificates, dan Funnel aktif di Tailscale Admin Console.
- Akses internet keluar melalui HTTPS/port 443 untuk Tailscale dan Groq.
- Minimal 2 GB RAM kosong untuk backend; 4 GB total server lebih nyaman untuk LibreOffice dan Poppler.

Isi `.env` dengan Groq API key dan konfigurasi berikut:

```dotenv
GROQ_API_KEY=gsk_xxx
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=qwen/qwen3.8-27b

UPLOAD_DIR=/app/uploaded_files
LIBREOFFICE_BINARY=libreoffice
UPLOAD_RETENTION_HOURS=24
UPLOAD_URL_TTL_SECONDS=3600
RATE_LIMIT_PER_MINUTE=12
GLOBAL_RATE_LIMIT_PER_MINUTE=30
GLOBAL_RATE_LIMIT_PER_HOUR=300

PUBLIC_API_URL=/api
BACKEND_INTERNAL_URL=http://backend:8000
APP_PORT=3000
BACKEND_MEMORY_LIMIT=2g
BACKEND_CPU_LIMIT=2.0
FRONTEND_MEMORY_LIMIT=512m
FRONTEND_CPU_LIMIT=1.0
```

Batasi file secret agar hanya user deploy yang dapat membacanya:

```bash
chmod 600 .env
```

Compose memasang `GROQ_API_KEY` sebagai file secret di container backend, bukan sebagai environment variable container.

## Deploy

```bash
cd app
docker compose build --pull
docker compose up -d
docker compose ps
curl http://127.0.0.1:3000/api/health
```

Respons yang benar:

```json
{"status":"ok","provider":"groq"}
```

## Membuka ke Internet

Jalankan di host server, bukan di dalam container:

```bash
tailscale funnel --bg 3000
tailscale funnel status
```

Status akan menampilkan URL publik HTTPS seperti:

```text
https://nama-server.nama-tailnet.ts.net
```

Siapa pun dapat membuka URL tersebut tanpa akun Tailscale. Tidak perlu membuka port 3000 atau 8000 pada router maupun firewall.

Untuk host Linux yang memakai UFW, pertahankan trafik publik masuk dalam keadaan tertutup dan izinkan administrasi dari tailnet:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0
sudo ufw enable
sudo ufw status verbose
```

Pastikan akses Tailscale sudah bekerja sebelum mengaktifkan UFW agar sesi administrasi tidak terkunci. Jangan menambahkan rule publik untuk port 3000 atau 8000.

Untuk menutup akses publik:

```bash
tailscale funnel reset
```

## Proteksi yang Aktif

- Endpoint mahal dibatasi per client dan secara global.
- Request lebih dari 6 MB ditolak; file upload dibatasi 5 MB.
- Upload hanya menerima PDF, JPEG, dan PNG berdasarkan signature file.
- Gambar dibatasi 25 megapixel dan konversi PDF memiliki timeout.
- Preview memakai URL bertanda tangan yang berlaku satu jam.
- File upload lama diperiksa dan dihapus otomatis oleh healthcheck setelah 24 jam.
- API docs dimatikan di production dan error internal tidak dikirim ke browser.
- Container berjalan sebagai user non-root, read-only, tanpa Linux capabilities, dan memiliki limit resource.
- Security headers dan log rotation aktif.

## Operasional Rutin

```bash
docker compose logs --tail=100 backend frontend
docker compose build --pull
docker compose up -d
cd frontend-gencvats
npm audit --omit=dev
```

Perbarui OS, Docker, Tailscale, image dasar, dan dependency aplikasi secara berkala. Rotasi Groq key jika pernah masuk log, chat, screenshot, atau repository. Pantau pemakaian dan batas biaya pada Groq Console.

Karena pengguna mengunggah dokumen pribadi dan dokumen dikirim ke Groq untuk OCR, UI meminta persetujuan pengguna sebelum upload. Lengkapi aplikasi publik dengan halaman kebijakan privasi yang menjelaskan tujuan pemrosesan, masa simpan, serta cara meminta penghapusan data.
