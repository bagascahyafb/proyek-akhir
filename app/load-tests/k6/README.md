# k6 Load Test Setup

Folder ini berisi script dasar untuk uji multi-user pada backend GenCVATS.

Script yang tersedia:

- `generate-docx.js`
  Untuk menguji endpoint `/generate-docx`
- `enhance-cv.js`
  Untuk menguji endpoint `/enhance-cv`
- `llm-concurrency-check.js`
  Untuk mengecek apakah endpoint LLM masih kuat saat dipakai lebih dari 5 user bersamaan
- `full-user-journey.js`
  Untuk menguji alur user dari isi CV, enhance, lalu download `.docx`
- `payload.js`
  Payload contoh yang dipakai semua skenario

## 1. Install k6

Sumber resmi:

- Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Running k6: https://grafana.com/docs/k6/latest/get-started/running-k6/

### Windows

Pilih salah satu:

```powershell
winget install k6 --source winget
```

atau

```powershell
choco install k6
```

Lalu verifikasi:

```powershell
k6 version
```

## 2. Jalankan backend Anda

Pastikan FastAPI backend aktif di port yang sesuai, default script ini memakai:

```text
http://127.0.0.1:8000
```

Kalau backend berjalan di URL lain, gunakan env `BASE_URL`.

## 3. Jalankan smoke test

### Generate DOCX

```powershell
k6 run app/load-tests/k6/generate-docx.js
```

### Enhance CV

```powershell
k6 run app/load-tests/k6/enhance-cv.js
```

### LLM Concurrency Check

Script ini cocok untuk pertanyaan:
"Apakah server saya masih kuat kalau user yang memakai LLM lebih dari 5 orang?"

```powershell
k6 run app/load-tests/k6/llm-concurrency-check.js
```

### Full User Journey

```powershell
k6 run app/load-tests/k6/full-user-journey.js
```

## 4. Jalankan ke server tertentu

```powershell
$env:BASE_URL="http://127.0.0.1:8000"
k6 run app/load-tests/k6/generate-docx.js
```

Atau:

```powershell
$env:BASE_URL="http://127.0.0.1:8000"
k6 run app/load-tests/k6/enhance-cv.js
```

Atau khusus uji LLM > 5 user:

```powershell
$env:BASE_URL="http://127.0.0.1:8000"
k6 run app/load-tests/k6/llm-concurrency-check.js
```

Atau full journey:

```powershell
$env:BASE_URL="http://127.0.0.1:8000"
k6 run app/load-tests/k6/full-user-journey.js
```

## 5. Ubah jumlah virtual user

Jumlah user sekarang diset di `options.scenarios` masing-masing file.

Contoh default:

- `generate-docx.js`: naik sampai 20 VUs
- `enhance-cv.js`: naik sampai 5 VUs
- `llm-concurrency-check.js`: tahan di 6 user, lalu 10 user, lalu 15 user
- `full-user-journey.js`: naik sampai 8 VUs

Untuk aplikasi Anda, saya sarankan:

1. Mulai dari `generate-docx.js`
2. Jalankan `enhance-cv.js` dengan user kecil dulu karena endpoint ini kemungkinan memanggil AI dan lebih mahal
3. Jalankan `llm-concurrency-check.js` kalau target Anda memang ingin tahu apakah LLM tetap stabil saat dipakai lebih dari 5 user
4. Jalankan `full-user-journey.js` untuk simulasi alur utama user
5. Tambahkan test OCR nanti terpisah kalau Anda memang ingin menguji upload file juga

## 6. Interpretasi hasil

Fokus dulu ke metrik ini:

- `http_req_failed`
- `http_req_duration`
- `p(95)`
- total request yang sukses/gagal

Untuk cek "lebih dari 5 user", perhatikan khusus:

1. apakah error mulai naik saat masuk 6 user
2. apakah `p(95)` melonjak tajam saat 10 user
3. apakah pada 15 user masih banyak request yang selesai sukses
4. apakah log backend menunjukkan timeout, rate limit, atau bottleneck API LLM

Kalau `generate-docx` masih error:

1. cek log backend FastAPI
2. cek response body error dari endpoint
3. kurangi VUs lalu ulangi

## 7. Catatan penting

- Script ini menguji backend/API, bukan browser UI
- Untuk uji browser end-to-end, lebih cocok pakai Playwright
- Untuk AI-heavy endpoint, jangan langsung mulai dari user besar
- `full-user-journey.js` tidak mengunggah file OCR, tetapi menguji alur utama builder sampai file berhasil dihasilkan
- `llm-concurrency-check.js` adalah script paling relevan untuk menguji beban endpoint LLM Anda secara langsung
