# Playwright E2E

Folder ini berisi test browser end-to-end untuk flow user dari isi data CV sampai download file.

## Install

Jalankan dari folder `app/frontend-gencvats`:

```powershell
npm install
npx playwright install
```

## Jalankan test

Mode default menggunakan mock API untuk endpoint:

- `/enhance-cv`
- `/generate-docx`

```powershell
npm run test:e2e
```

## Jalankan terhadap backend asli

Pastikan:

- frontend Next.js berjalan
- backend FastAPI berjalan
- `NEXT_PUBLIC_API_URL` di frontend mengarah ke backend yang benar

Lalu jalankan:

```powershell
$env:PLAYWRIGHT_SKIP_WEBSERVER="true"
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3000"
$env:E2E_USE_REAL_BACKEND="true"
$env:E2E_API_URL="http://127.0.0.1:8000"
npm run test:e2e
```

## Yang diuji

1. User mengisi data personal
2. User menambah pendidikan manual
3. User menambah pengalaman
4. User menambah proyek
5. User mengisi skills
6. User menambah sertifikat manual
7. User menjalankan `Polish & Rewrite with AI`
8. User men-download file CV `.docx`
