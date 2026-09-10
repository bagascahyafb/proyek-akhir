# Deployment Docker dengan Tailscale

## Yang perlu disiapkan

- Server Linux yang sudah terpasang Docker Engine dan Docker Compose.
- Tailscale aktif di server dan perangkat yang akan membuka aplikasi.
- MagicDNS dan HTTPS Certificates aktif pada halaman DNS di Tailscale Admin Console.
- Groq API key yang masih aktif.
- Akses internet keluar dari server ke `api.groq.com` melalui HTTPS/port 443.

Isi `.env` berikut dan jangan commit file tersebut:

```dotenv
GROQ_API_KEY=gsk_xxx
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=qwen/qwen3.8-27b

UPLOAD_DIR=/app/uploaded_files
LIBREOFFICE_BINARY=libreoffice
PUBLIC_API_URL=/api
BACKEND_INTERNAL_URL=http://backend:8000
APP_PORT=3000
BACKEND_PORT=8000
```

`PUBLIC_API_URL` harus tetap `/api`. Frontend meneruskan request ke backend lewat jaringan Docker, sehingga tidak perlu mencari URL backend dan tidak perlu mengatur CORS.

## Deploy

```bash
cd app
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/api/health
```

Respons healthcheck yang benar:

```json
{"status":"ok","provider":"groq"}
```

## Membuat URL Tailscale

Jalankan pada host server, bukan di dalam container:

```bash
tailscale status
tailscale ip -4
tailscale serve --bg 3000
tailscale serve status
```

Perintah terakhir menampilkan URL HTTPS, misalnya:

```text
https://nama-server.nama-tailnet.ts.net
```

URL tersebut hanya dapat dibuka oleh perangkat yang masuk ke tailnet dan diizinkan oleh ACL Tailscale. Compose mengikat port 3000 dan 8000 ke `127.0.0.1`, jadi aplikasi tidak terbuka langsung ke LAN atau internet.

Untuk menghentikan akses Tailscale Serve:

```bash
tailscale serve reset
```

## Update dan pemeriksaan

```bash
git pull
cd app
docker compose up -d --build
docker compose logs --tail=100 backend frontend
```

File upload disimpan di volume Docker `uploaded_files`. Jangan hapus volume tersebut jika file lama masih diperlukan.
