import os
import shutil
import subprocess
import tempfile
import traceback
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
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
from lib.ai import run_ai_ocr, enhance_final_cv_llm, validate_it_ds_relevance
from lib.doc_gen import generate_ats_docx
from lib.file_process import validate_name_detailed
from fastapi.responses import FileResponse
import uuid

app = FastAPI()

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
configured_upload_dir = Path(os.getenv("UPLOAD_DIR", "uploaded_files"))
UPLOAD_DIR = configured_upload_dir if configured_upload_dir.is_absolute() else BASE_DIR / configured_upload_dir
UPLOAD_DIR = UPLOAD_DIR.resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
    LLM_Provider: str | None = None


def validate_upload_size(upload_file: UploadFile) -> None:
    file_obj = upload_file.file
    current_position = file_obj.tell()
    file_obj.seek(0, os.SEEK_END)
    file_size = file_obj.tell()
    file_obj.seek(current_position)

    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Ukuran file melebihi batas 5 MB per file."
        )

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
        message = e.stderr.strip() or e.stdout.strip() or str(e)
        raise HTTPException(status_code=500, detail=f"Gagal konversi PDF: {message}")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Konversi PDF timeout.")

    pdf_path = output_dir / f"{docx_path.stem}.pdf"
    if not pdf_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"LibreOffice selesai tanpa menghasilkan PDF. Output: {result.stdout.strip()}",
        )
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
    llm_provider: str = Form(""),
):
    original_filename = file.filename or "uploaded-file"
    safe_original_name = os.path.basename(original_filename)
    file_ext = os.path.splitext(safe_original_name)[1]
    stored_filename = f"{uuid.uuid4().hex}{file_ext}"
    stored_path = UPLOAD_DIR / stored_filename
    temp_filename = f"temp_{uuid.uuid4().hex}_{safe_original_name}"
    try:
        validate_upload_size(file)

        # 1. Simpan file sementara dan salinan untuk preview
        with open(temp_filename, "wb") as f:
            shutil.copyfileobj(file.file, f)
        shutil.copyfile(temp_filename, stored_path)
            
        print(f"📂 Processing: {file.filename} | Type: {file.content_type}")
        
        image_to_process = None
        
        # 2. LOGIC DETEKSI TIPE FILE (LEBIH KUAT)
        filename_lower = safe_original_name.lower()
        is_pdf = (file.content_type == "application/pdf") or (filename_lower.endswith(".pdf"))
        
        if is_pdf:
            print("📄 Detected as PDF")
            try:
                images = convert_from_path(
                    temp_filename, 
                    first_page=1, 
                    last_page=1, 
                    poppler_path=POPPLER_PATH 
                )
                if images: 
                    image_to_process = images[0]
                else:
                    raise Exception("PDF kosong atau tidak bisa dikonversi.")
            except Exception as e:
                print(f"❌ PDF Error: {e}")
                raise HTTPException(status_code=500, detail=f"Gagal baca PDF: {str(e)}")
        else:
            print("🖼️ Detected as Image")
            try:
                img = Image.open(temp_filename)
                img.load() 
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                    
                image_to_process = img
            except Exception as e:
                print(f"❌ Image Error: {e}")
                raise HTTPException(status_code=400, detail=f"File gambar rusak atau format tidak didukung: {str(e)}")
        
        if not image_to_process:
             raise HTTPException(status_code=400, detail="Gagal memproses file (Image object null)")

        # 3. Jalankan AI OCR
        print(f"🤖 Sending to AI ({jenis})...")
        selected_provider = llm_provider.strip().lower() or None
        ocr_result = run_ai_ocr(image_to_process, jenis, selected_provider)
        
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

        print("✅ Done!")
        relevance_info = validate_it_ds_relevance(ocr_result, jenis, selected_provider)
        document_info = {
            "fileName": safe_original_name,
            "fileUrl": f"/uploads/{stored_filename}",
            "contentType": file.content_type or "",
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
        print("🔥 CRITICAL SERVER ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
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
        cv_dict.pop("LLM_Provider", None)
        language = raw_language if raw_language else "English"
        
        doc = generate_ats_docx(cv_dict, language)
        
        byte_io = io.BytesIO()
        doc.save(byte_io)
        
        nama = cv_dict.get('Personal_Info', {}).get('Nama', '')
        safe_name = nama.replace(' ', '_') if nama else "User"
        filename = f"CV_{safe_name}_{language}.docx"
        
        # Gunakan Response biasa dan panggil getvalue() untuk mengambil seluruh byte sekaligus
        return Response(
            content=byte_io.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# --- ENDPOINT ENHANCE ---
@app.post("/enhance-cv")
async def enhance_cv(data: CVData):
    try:
        cv_dict = data.model_dump()
        language = cv_dict.pop("Language", "English")
        llm_provider = cv_dict.pop("LLM_Provider", None)
        result = enhance_final_cv_llm(cv_dict, language, llm_provider)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
