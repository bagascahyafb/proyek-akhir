---
title: GenCVATS Backend
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# Hugging Face Backend

Folder ini adalah versi backend terpisah yang menembak model langsung ke Hugging Face.

Endpoint yang tersedia tetap sama:

- `POST /extract-ocr`
- `POST /enhance-cv`
- `POST /generate-docx`

## Environment Variables

Salin `.env.example` menjadi `.env`, lalu isi nilainya:

- `HF_TOKEN`: token Hugging Face
- `HF_MODEL_ID`: model yang akan dipakai, misalnya `Qwen/Qwen2.5-VL-7B-Instruct`
- `HF_PROVIDER`: default `hf-inference`. Tetap dipakai sebagai fallback metadata walau mode dedicated aktif
- `HF_BASE_URL`: URL dedicated endpoint OpenAI-compatible, misalnya `https://your-endpoint.endpoints.huggingface.cloud`
- `CORS_ORIGINS`: daftar origin frontend yang diizinkan, pisahkan dengan koma. Gunakan `*` untuk development

## Mode Dedicated Endpoint

Untuk model multimodal seperti Qwen-VL, jalur yang direkomendasikan adalah dedicated endpoint.

Contoh `.env`:

```env
HF_TOKEN=hf_xxx
HF_MODEL_ID=Qwen/Qwen2.5-VL-7B-Instruct
HF_PROVIDER=hf-inference
HF_BASE_URL=https://your-endpoint.endpoints.huggingface.cloud
CORS_ORIGINS=http://localhost:3000
```

Catatan:

- Jika `HF_BASE_URL` terisi, backend akan memakai dedicated endpoint
- Jika `HF_BASE_URL` kosong, backend akan mencoba router provider biasa
- Untuk route OCR saat ini, dedicated endpoint yang mendukung `/v1/chat/completions` adalah opsi yang paling aman

## Menjalankan

```bash
uvicorn api:app --host 0.0.0.0 --port 8001 --reload
```

## Deploy

Folder ini sudah disiapkan untuk deploy:

- `Dockerfile` untuk container deployment
- `start.sh` agar port mengikuti environment cloud
- `.dockerignore` untuk image yang lebih bersih
- `render.yaml` untuk Render
- `requirements.txt` minimal khusus backend Hugging Face
- `README.md` dengan header YAML untuk Hugging Face Space Docker

Health check:

- `GET /`
- `GET /health`

Output `/health` akan menunjukkan:

- model aktif
- apakah dedicated endpoint sedang dipakai
- host dedicated endpoint

## Catatan

- Batas upload tetap `5 MB` per file.
- Format request dan response dibuat tetap kompatibel dengan backend lama.
- Untuk PDF di cloud, container memakai `poppler-utils` agar konversi halaman pertama tetap jalan.
- Untuk deploy, simpan `HF_TOKEN`, `HF_MODEL_ID`, `HF_PROVIDER`, `HF_BASE_URL`, dan `CORS_ORIGINS` sebagai secrets/environment variables platform cloud.

## Target Deploy

### Hugging Face Space

- Buat Space baru dengan tipe `Docker`
- Push isi folder ini ke repo Space
- Atur secrets di Settings:
  - `HF_TOKEN`
  - `HF_MODEL_ID`
  - `HF_PROVIDER`
  - `HF_BASE_URL`
  - `CORS_ORIGINS`

### Render

- Gunakan file `render.yaml`
- Tambahkan environment variables yang sama di dashboard Render

### VPS / Docker

```bash
docker build -t gencvats-hf .
docker run -p 7860:7860 --env-file .env gencvats-hf
```
