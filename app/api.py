import os
import shutil
import traceback
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
from pdf2image import convert_from_path
from PIL import Image
# Import library logic
from lib.ai import run_ai_ocr, enhance_final_cv_llm
from lib.doc_gen import generate_ats_docx
from lib.file_process import validate_name

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- KONFIGURASI PATH POPPLER ---
BASE_DIR = os.getcwd()
# Sesuaikan path ini jika perlu
POPPLER_PATH = os.path.join(BASE_DIR, "bin", "poppler-25.07.0", "Library", "bin")

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

# --- ENDPOINT OCR (PERBAIKAN HANDLING FILE) ---
@app.post("/extract-ocr")
async def extract_ocr(
    file: UploadFile = File(...), 
    jenis: str = Form(...),
    target_name: str = Form("") 
):
    temp_filename = f"temp_{file.filename}"
    try:
        # 1. Simpan file sementara
        with open(temp_filename, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        print(f"📂 Processing: {file.filename} | Type: {file.content_type}")
        
        image_to_process = None
        
        # 2. LOGIC DETEKSI TIPE FILE (LEBIH KUAT)
        filename_lower = file.filename.lower()
        is_pdf = (file.content_type == "application/pdf") or (filename_lower.endswith(".pdf"))
        
        if is_pdf:
            print("📄 Detected as PDF")
            try:
                # Cek Path Poppler
                if not os.path.exists(POPPLER_PATH):
                    raise Exception(f"Poppler path not found: {POPPLER_PATH}")

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
        ocr_result = run_ai_ocr(image_to_process, jenis)
        
        if not ocr_result:
             # Kadang AI return None kalau API Key salah atau kuota habis
             raise HTTPException(status_code=500, detail="AI tidak memberikan respons yang valid.")

        # 4. Validasi Nama
        validation_info = {
            "is_valid": True,
            "message": "Validasi dilewati",
            "extracted_name": "-"
        }
        
        extracted_name = ocr_result.get("Nama_Lengkap") if jenis == "ijazah" else ocr_result.get("Nama_Peserta")
        
        if target_name and extracted_name:
            is_valid, msg = validate_name(target_name, extracted_name)
            validation_info = { "is_valid": is_valid, "message": msg, "extracted_name": extracted_name }

        print("✅ Done!")
        return { "data": ocr_result, "validation": validation_info }

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
        safe_name = nama.replace(' ', '_') if nama else "User"
        filename = f"CV_{safe_name}_{language}.docx"
        
        # --- PERBAIKAN DI SINI ---
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
        result = enhance_final_cv_llm(cv_dict, language)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))