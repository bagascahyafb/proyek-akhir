import hashlib
import hmac
import os
import logging
import re
import secrets
import shutil
import subprocess
import tempfile
import threading
import time
from collections import defaultdict, deque
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.background import BackgroundTask
from pydantic import BaseModel
import io
from pdf2image import convert_from_path
from PIL import Image
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Import library logic
from lib.ai import AIRateLimitError, run_ai_ocr, enhance_final_cv_llm, validate_it_ds_relevance
from lib.doc_gen import generate_ats_docx
from lib.file_process import validate_name_detailed
import uuid

logger = logging.getLogger("gencvats")
IS_PRODUCTION = os.getenv("APP_ENV", "development").lower() == "production"
app = FastAPI(
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
MAX_REQUEST_SIZE_BYTES = 6 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
UPLOAD_RETENTION_SECONDS = int(os.getenv("UPLOAD_RETENTION_HOURS", "24")) * 3600
UPLOAD_URL_TTL_SECONDS = int(os.getenv("UPLOAD_URL_TTL_SECONDS", "3600"))
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_HOURLY_WINDOW_SECONDS = 3600
RATE_LIMIT_PER_CLIENT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "12"))
RATE_LIMIT_GLOBAL = int(os.getenv("GLOBAL_RATE_LIMIT_PER_MINUTE", "30"))
RATE_LIMIT_GLOBAL_HOURLY = int(os.getenv("GLOBAL_RATE_LIMIT_PER_HOUR", "300"))
RATE_LIMITED_PATHS = {
    "/extract-ocr",
    "/enhance-cv",
    "/generate-docx",
    "/generate-pdf",
    "/preview-pdf",
}
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

configured_upload_dir = Path(os.getenv("UPLOAD_DIR", "uploaded_files"))
UPLOAD_DIR = configured_upload_dir if configured_upload_dir.is_absolute() else BASE_DIR / configured_upload_dir
UPLOAD_DIR = UPLOAD_DIR.resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_SIGNING_KEY = secrets.token_bytes(32)

_rate_lock = threading.Lock()
_global_requests = deque()
_global_hourly_requests = deque()
_client_requests = defaultdict(deque)


def get_groq_api_key() -> str:
    secret_file = os.getenv("GROQ_API_KEY_FILE")
    if secret_file:
        try:
            return Path(secret_file).read_text(encoding="utf-8").strip()
        except OSError:
            return ""
    return os.getenv("GROQ_API_KEY", "").strip()


def cleanup_expired_uploads() -> None:
    cutoff = time.time() - UPLOAD_RETENTION_SECONDS
    for path in UPLOAD_DIR.iterdir():
        try:
            if path.is_file() and path.stat().st_mtime < cutoff:
                path.unlink()
        except OSError:
            logger.warning("Gagal membersihkan satu file upload lama.")


def create_signed_upload_url(filename: str) -> str:
    expires = int(time.time()) + UPLOAD_URL_TTL_SECONDS
    payload = f"gencvats-upload:{filename}:{expires}".encode()
    signature = hmac.new(UPLOAD_SIGNING_KEY, payload, hashlib.sha256).hexdigest()
    return f"/uploads/{filename}?expires={expires}&signature={signature}"


def check_rate_limit(client_key: str) -> tuple[bool, int]:
    now = time.monotonic()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    hourly_cutoff = now - RATE_LIMIT_HOURLY_WINDOW_SECONDS

    with _rate_lock:
        while _global_requests and _global_requests[0] <= cutoff:
            _global_requests.popleft()
        while _global_hourly_requests and _global_hourly_requests[0] <= hourly_cutoff:
            _global_hourly_requests.popleft()

        client_bucket = _client_requests[client_key]
        while client_bucket and client_bucket[0] <= cutoff:
            client_bucket.popleft()

        if len(_global_hourly_requests) >= RATE_LIMIT_GLOBAL_HOURLY:
            retry_after = RATE_LIMIT_HOURLY_WINDOW_SECONDS - (now - _global_hourly_requests[0])
            return False, max(1, int(retry_after))
        if len(_global_requests) >= RATE_LIMIT_GLOBAL:
            retry_after = RATE_LIMIT_WINDOW_SECONDS - (now - _global_requests[0])
            return False, max(1, int(retry_after))
        if len(client_bucket) >= RATE_LIMIT_PER_CLIENT:
            retry_after = RATE_LIMIT_WINDOW_SECONDS - (now - client_bucket[0])
            return False, max(1, int(retry_after))

        _global_requests.append(now)
        _global_hourly_requests.append(now)
        client_bucket.append(now)

        if len(_client_requests) > 10_000:
            stale_keys = [key for key, bucket in _client_requests.items() if not bucket or bucket[-1] <= cutoff]
            for key in stale_keys:
                _client_requests.pop(key, None)

    return True, 0


@app.middleware("http")
async def protect_api(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_SIZE_BYTES:
                return JSONResponse(status_code=413, content={"detail": "Request melebihi batas ukuran."})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Content-Length tidak valid."})

    if request.method == "POST" and request.url.path in RATE_LIMITED_PATHS:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        client_address = forwarded_for.split(",")[0].strip() or (request.client.host if request.client else "unknown")
        client_key = hashlib.sha256(client_address.encode()).hexdigest()
        allowed, retry_after = check_rate_limit(client_key)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Terlalu banyak request. Coba lagi sebentar."},
                headers={"Retry-After": str(retry_after)},
            )

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

@app.get("/health")
def health_check():
    cleanup_expired_uploads()
    missing = []
    if not get_groq_api_key():
        missing.append("GROQ_API_KEY")
    if not os.getenv("GROQ_MODEL"):
        missing.append("GROQ_MODEL")
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Konfigurasi Groq belum lengkap: {', '.join(missing)}",
        )
    return {"status": "ok", "provider": "groq"}


@app.get("/uploads/{filename}", include_in_schema=False)
def get_uploaded_file(filename: str, expires: int, signature: str):
    if filename != Path(filename).name or not re.fullmatch(r"[0-9a-f]{32}\.(?:pdf|jpg|png)", filename):
        raise HTTPException(status_code=404, detail="File tidak ditemukan.")

    payload = f"gencvats-upload:{filename}:{expires}".encode()
    expected_signature = hmac.new(UPLOAD_SIGNING_KEY, payload, hashlib.sha256).hexdigest()
    if expires < int(time.time()) or not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=404, detail="File tidak ditemukan atau tautan sudah kedaluwarsa.")

    file_path = UPLOAD_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File tidak ditemukan.")

    return FileResponse(file_path, headers={"Cache-Control": "private, no-store"})

# --- KONFIGURASI PATH POPPLER ---
LOCAL_POPPLER_PATH = BASE_DIR / "bin" / "poppler-25.07.0" / "Library" / "bin"
POPPLER_PATH = os.getenv("POPPLER_PATH") or (str(LOCAL_POPPLER_PATH) if LOCAL_POPPLER_PATH.exists() else None)

# --- MODEL DATA ---
class CVData(BaseModel):
    Personal_Info: dict
    Education: list
    Experience: list
    Projects: list
    Skills_Hard: list
    Skills_Soft: list
    Certifications: list
    Awards: list
    Language: str = "English"


def validate_upload(upload_file: UploadFile) -> tuple[str, str]:
    file_obj = upload_file.file
    current_position = file_obj.tell()
    file_obj.seek(0, os.SEEK_END)
    file_size = file_obj.tell()
    file_obj.seek(current_position)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File kosong.")
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Ukuran file melebihi batas 5 MB per file."
        )

    file_obj.seek(0)
    signature = file_obj.read(16)
    file_obj.seek(0)

    if signature.startswith(b"%PDF-"):
        return "pdf", ".pdf"
    if signature.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", ".png"
    if signature.startswith(b"\xff\xd8\xff"):
        return "image", ".jpg"

    raise HTTPException(status_code=400, detail="Format file harus PDF, JPEG, atau PNG.")

def convert_docx_to_pdf(docx_path: Path, output_dir: Path) -> Path:
    libreoffice_binary = os.getenv("LIBREOFFICE_BINARY", "libreoffice")
    command = [
        libreoffice_binary,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        str(output_dir),
        str(docx_path),
    ]

    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="LibreOffice tidak ditemukan. Pastikan LibreOffice terinstall di Docker image/server.",
        )
    except subprocess.CalledProcessError as e:
        logger.error("LibreOffice gagal mengonversi dokumen: %s", e.returncode)
        raise HTTPException(status_code=500, detail="Gagal mengonversi dokumen ke PDF.")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Konversi PDF timeout.")

    pdf_path = output_dir / f"{docx_path.stem}.pdf"
    if not pdf_path.exists():
        logger.error("LibreOffice selesai tanpa menghasilkan file PDF.")
        raise HTTPException(status_code=500, detail="Gagal mengonversi dokumen ke PDF.")
    return pdf_path

def cleanup_files(*paths):
    for path in paths:
        target = Path(path)
        try:
            if target.is_dir():
                target.rmdir()
            else:
                target.unlink(missing_ok=True)
        except Exception:
            pass

# --- ENDPOINT OCR (PERBAIKAN HANDLING FILE) ---
@app.post("/extract-ocr")
async def extract_ocr(
    file: UploadFile = File(...), 
    jenis: str = Form(...),
    target_name: str = Form(""),
):
    original_filename = file.filename or "uploaded-file"
    basename = Path(original_filename.replace("\\", "/")).name
    safe_original_name = re.sub(r"[^A-Za-z0-9._ -]", "_", basename)[:120] or "uploaded-file"
    detected_type, canonical_suffix = validate_upload(file)
    stored_filename = f"{uuid.uuid4().hex}{canonical_suffix}"
    stored_path = UPLOAD_DIR / stored_filename
    temp_filename = Path(tempfile.gettempdir()) / f"gencvats_{uuid.uuid4().hex}{canonical_suffix}"
    try:
        cleanup_expired_uploads()

        # Simpan file dengan nama acak di direktori sementara.
        with open(temp_filename, "wb") as f:
            shutil.copyfileobj(file.file, f)
        logger.info("Memproses satu dokumen upload.")
        
        image_to_process = None
        
        # 2. LOGIC DETEKSI TIPE FILE (LEBIH KUAT)
        is_pdf = detected_type == "pdf"
        
        if is_pdf:
            try:
                images = convert_from_path(
                    temp_filename, 
                    first_page=1, 
                    last_page=1, 
                    poppler_path=POPPLER_PATH,
                    dpi=200,
                    thread_count=1,
                    timeout=30,
                )
                if images: 
                    image_to_process = images[0]
                else:
                    raise Exception("PDF kosong atau tidak bisa dikonversi.")
            except Exception as e:
                logger.warning("PDF upload gagal diproses: %s", type(e).__name__)
                raise HTTPException(status_code=400, detail="PDF tidak valid atau gagal diproses.")
        else:
            try:
                img = Image.open(temp_filename)
                if img.width * img.height > MAX_IMAGE_PIXELS:
                    raise ValueError("image dimensions exceed limit")
                img.load() 
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                    
                image_to_process = img
            except Exception as e:
                logger.warning("Gambar upload gagal diproses: %s", type(e).__name__)
                raise HTTPException(status_code=400, detail="Gambar tidak valid atau terlalu besar.")
        
        if not image_to_process:
             raise HTTPException(status_code=400, detail="Gagal memproses file (Image object null)")

        # 3. Jalankan AI OCR
        logger.info("Mengirim dokumen ke layanan OCR.")
        try:
            ocr_result = run_ai_ocr(image_to_process, jenis)
        except AIRateLimitError as error:
            raise HTTPException(
                status_code=429,
                detail="Batas pemakaian Groq tercapai. Tunggu sebentar lalu coba lagi.",
                headers={"Retry-After": str(error.retry_after)},
            ) from error
        
        if not ocr_result:
             # Kadang AI return None kalau API Key salah atau kuota habis
             raise HTTPException(status_code=500, detail="AI tidak memberikan respons yang valid.")

        # 4. Validasi Nama dan relevansi bidang
        validation_info = {
            "is_valid": True,
            "status": "skipped",
            "message": "Validasi dilewati",
            "extracted_name": "-",
            "similarity_score": None,
        }
        
        extracted_name = ocr_result.get("Nama_Lengkap") if jenis == "ijazah" else ocr_result.get("Nama_Peserta")
        
        if target_name:
            validation_result = validate_name_detailed(target_name, extracted_name)
            validation_info = {
                "is_valid": validation_result["is_valid"],
                "status": validation_result["status"],
                "message": validation_result["message"],
                "extracted_name": extracted_name or "-",
                "similarity_score": validation_result["similarity_score"],
            }

        logger.info("Dokumen selesai diproses.")
        relevance_info = validate_it_ds_relevance(ocr_result, jenis)
        document_info = None
        if validation_info["status"] != "invalid":
            shutil.copyfile(temp_filename, stored_path)
            document_info = {
                "fileName": safe_original_name,
                "fileUrl": create_signed_upload_url(stored_filename),
                "contentType": "application/pdf" if is_pdf else ("image/jpeg" if canonical_suffix == ".jpg" else "image/png"),
                "size": stored_path.stat().st_size,
            }

        return {
            "data": ocr_result,
            "validation": validation_info,
            "relevance": relevance_info,
            "document": document_info,
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Terjadi kegagalan saat memproses upload: %s", type(e).__name__)
        raise HTTPException(status_code=500, detail="Terjadi kesalahan internal saat memproses file.")
    finally:
        # Bersihkan file temp
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except:
                pass

# --- ENDPOINT GENERATE DOCX ---
@app.post("/generate-docx")
async def generate_docx(data: CVData):
    try:
        cv_dict = data.model_dump()
        
        raw_language = cv_dict.pop("Language", None)
        language = raw_language if raw_language else "English"
        
        doc = generate_ats_docx(cv_dict, language)
        
        byte_io = io.BytesIO()
        doc.save(byte_io)
        
        nama = cv_dict.get('Personal_Info', {}).get('Nama', '')
        safe_name = re.sub(r"[^A-Za-z0-9_-]", "_", nama)[:80].strip("_") if nama else "User"
        safe_name = safe_name or "User"
        filename = f"CV_{safe_name}_{language}.docx"
        
        # Gunakan Response biasa dan panggil getvalue() untuk mengambil seluruh byte sekaligus
        return Response(
            content=byte_io.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception:
        logger.exception("Gagal membuat dokumen DOCX.")
        raise HTTPException(status_code=500, detail="Gagal membuat dokumen DOCX.")
    
# --- ENDPOINT ENHANCE ---
@app.post("/enhance-cv")
async def enhance_cv(data: CVData):
    try:
        cv_dict = data.model_dump()
        language = cv_dict.pop("Language", "English")
        result = enhance_final_cv_llm(cv_dict, language)
        return result
    except Exception:
        logger.exception("Gagal memproses peningkatan CV.")
        raise HTTPException(status_code=500, detail="Gagal memproses CV dengan AI.")

# --- ENDPOINT GENERATE PDF (DARI DOCX) ---
@app.post("/generate-pdf")
def generate_pdf(data: dict):
    temp_dir = Path(tempfile.mkdtemp(prefix="gencvats_pdf_"))
    docx_path = temp_dir / f"cv_{uuid.uuid4().hex}.docx"

    try:
        doc = generate_ats_docx(data, data.get("Language", "English"))
        doc.save(docx_path)
        pdf_path = convert_docx_to_pdf(docx_path, temp_dir)
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename="CV.pdf",
            background=BackgroundTask(cleanup_files, docx_path, pdf_path, temp_dir),
        )
    except HTTPException:
        cleanup_files(docx_path, temp_dir)
        raise
    except Exception:
        cleanup_files(docx_path, temp_dir)
        logger.exception("Gagal membuat PDF.")
        raise HTTPException(status_code=500, detail="Gagal membuat PDF.")

# --- ENDPOINT PREVIEW PDF (DARI DOCX) ---
@app.post("/preview-pdf")
def preview_pdf(data: dict):
    temp_dir = Path(tempfile.mkdtemp(prefix="gencvats_preview_"))
    docx_path = temp_dir / f"preview_{uuid.uuid4().hex}.docx"

    try:
        doc = generate_ats_docx(data, data.get("Language", "English"))
        doc.save(docx_path)
        pdf_path = convert_docx_to_pdf(docx_path, temp_dir)
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            background=BackgroundTask(cleanup_files, docx_path, pdf_path, temp_dir),
        )
    except HTTPException:
        cleanup_files(docx_path, temp_dir)
        raise
    except Exception:
        cleanup_files(docx_path, temp_dir)
        logger.exception("Gagal membuat preview PDF.")
        raise HTTPException(status_code=500, detail="Gagal membuat preview PDF.")
