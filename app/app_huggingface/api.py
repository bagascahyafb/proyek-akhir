import io
import os
import shutil
import traceback
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from pdf2image import convert_from_path
from PIL import Image
from dotenv import load_dotenv
from lib.ai import AIConfigurationError, AIRequestError, enhance_final_cv_llm, load_config, run_ai_ocr
from lib.doc_gen import generate_ats_docx
from lib.file_process import validate_name

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent
load_dotenv(APP_DIR / ".env")

app = FastAPI()

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
ALLOW_ORIGINS = ["*"] if CORS_ORIGINS.strip() == "*" else [origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOCAL_POPPLER_PATH = PROJECT_ROOT / "bin" / "poppler-25.07.0" / "Library" / "bin"
POPPLER_PATH = str(LOCAL_POPPLER_PATH) if LOCAL_POPPLER_PATH.exists() else None


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


def validate_upload_size(upload_file: UploadFile) -> None:
    file_obj = upload_file.file
    current_position = file_obj.tell()
    file_obj.seek(0, os.SEEK_END)
    file_size = file_obj.tell()
    file_obj.seek(current_position)

    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Ukuran file melebihi batas 5 MB per file.")


@app.get("/")
async def root():
    return {"service": "app_huggingface", "status": "ok"}


@app.get("/health")
async def health():
    config = load_config()
    return {
        "status": "ok",
        "service": "app_huggingface",
        "provider": config.provider,
        "model": config.model_id,
        "using_dedicated_endpoint": config.uses_dedicated_endpoint,
        "endpoint_host": config.endpoint_host or None,
    }


@app.post("/extract-ocr")
async def extract_ocr(
    file: UploadFile = File(...),
    jenis: str = Form(...),
    target_name: str = Form(""),
):
    temp_filename = f"temp_{file.filename}"
    try:
        validate_upload_size(file)

        with open(temp_filename, "wb") as handle:
            shutil.copyfileobj(file.file, handle)

        filename_lower = file.filename.lower()
        is_pdf = (file.content_type == "application/pdf") or filename_lower.endswith(".pdf")

        if is_pdf:
            convert_kwargs = {
                "pdf_path": temp_filename,
                "first_page": 1,
                "last_page": 1,
            }
            if POPPLER_PATH:
                convert_kwargs["poppler_path"] = POPPLER_PATH
            images = convert_from_path(**convert_kwargs)
            if not images:
                raise HTTPException(status_code=400, detail="PDF kosong atau tidak bisa dikonversi.")
            image_to_process = images[0]
        else:
            try:
                image_to_process = Image.open(temp_filename)
                image_to_process.load()
                if image_to_process.mode in ("RGBA", "P"):
                    image_to_process = image_to_process.convert("RGB")
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"File gambar rusak atau format tidak didukung: {exc}",
                ) from exc

        try:
            ocr_result = run_ai_ocr(image_to_process, jenis)
        except AIConfigurationError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except AIRequestError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        if not ocr_result:
            raise HTTPException(status_code=500, detail="AI tidak memberikan respons yang valid.")

        validation_info = {
            "is_valid": True,
            "message": "Validasi dilewati",
            "extracted_name": "-",
        }

        extracted_name = ocr_result.get("Nama_Lengkap") if jenis == "ijazah" else ocr_result.get("Nama_Peserta")
        if target_name and extracted_name:
            is_valid, message = validate_name(target_name, extracted_name)
            validation_info = {
                "is_valid": is_valid,
                "message": message,
                "extracted_name": extracted_name,
            }

        return {"data": ocr_result, "validation": validation_info}
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error: {exc}") from exc
    finally:
        if os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except OSError:
                pass


@app.post("/generate-docx")
async def generate_docx(data: CVData):
    try:
        cv_dict = data.model_dump()
        language = cv_dict.pop("Language", None) or "English"

        doc = generate_ats_docx(cv_dict, language)
        byte_io = io.BytesIO()
        doc.save(byte_io)

        nama = cv_dict.get("Personal_Info", {}).get("Nama", "")
        safe_name = nama.replace(" ", "_") if nama else "User"
        filename = f"CV_{safe_name}_{language}.docx"

        return Response(
            content=byte_io.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/enhance-cv")
async def enhance_cv(data: CVData):
    try:
        cv_dict = data.model_dump()
        language = cv_dict.pop("Language", "English")
        try:
            return enhance_final_cv_llm(cv_dict, language)
        except AIConfigurationError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except AIRequestError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc
