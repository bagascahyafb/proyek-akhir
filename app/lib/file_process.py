from pdf2image import convert_from_path
from PIL import Image
import io
import os
import base64
from thefuzz import fuzz

def get_poppler_path():
    configured_poppler_path = os.getenv("POPPLER_PATH")
    if configured_poppler_path:
        return configured_poppler_path

    local_poppler_path = os.path.join(
        os.getcwd(), "bin", "poppler-25.07.0", "Library", "bin"
    )
    return local_poppler_path if os.path.exists(local_poppler_path) else None

def process_uploaded_file(uploaded_file):
    try:
        if uploaded_file.type == "application/pdf":
            temp_filename = f"temp_{uploaded_file.name}"
            with open(temp_filename, "wb") as f:
                f.write(uploaded_file.getbuffer())
            images = convert_from_path(
                temp_filename,
                first_page=1,
                last_page=1,
                poppler_path=get_poppler_path(),
            )
            if os.path.exists(temp_filename): os.remove(temp_filename)
            return images[0] if images else None
        else:
            return Image.open(uploaded_file)
    except Exception as e:
        print(f"Gagal memproses file: {e}")
        return None

def encode_image(pil_image):
    max_size = 5120 
    w, h = pil_image.size
    if w > max_size or h > max_size:
        ratio = max_size / max(w, h)
        pil_image = pil_image.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)
    buffered = io.BytesIO()
    pil_image.convert("RGB").save(buffered, format="JPEG", quality=85)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def validate_name_detailed(target_name, extracted_name):
    if not target_name:
        return {
            "is_valid": True,
            "status": "skipped",
            "message": "Validasi dilewati (Nama referensi kosong).",
            "similarity_score": None,
        }

    if not extracted_name or not isinstance(extracted_name, str):
        return {
            "is_valid": False,
            "status": "invalid",
            "message": "Nama pada dokumen tidak terbaca dengan benar.",
            "similarity_score": None,
        }

    clean_extracted = extracted_name.lower().strip()
    if clean_extracted in ["tidak ditemukan data", "tidak ditemukan", "-", ""]:
        return {
            "is_valid": False,
            "status": "invalid",
            "message": "Nama tidak terdeteksi pada dokumen.",
            "similarity_score": None,
        }

    similarity_score = fuzz.token_set_ratio(target_name.lower(), clean_extracted)
    if similarity_score > 70:
        return {
            "is_valid": True,
            "status": "valid",
            "message": f"Data sesuai dengan kemiripan {similarity_score}% dengan nama referensi.",
            "similarity_score": similarity_score,
        }

    if 50 <= similarity_score <= 70:
        return {
            "is_valid": False,
            "status": "warning",
            "message": f"Data Meragukan dengan kemiripan {similarity_score}% dengan nama referensi. Periksa kembali data yang diekstrak.",
            "similarity_score": similarity_score,
        }

    return {
        "is_valid": False,
        "status": "invalid",
        "message": f"Data Tidak sesuai dengan kemiripan {similarity_score}% dengan nama referensi.",
        "similarity_score": similarity_score,
    }


def validate_name(target_name, extracted_name):
    result = validate_name_detailed(target_name, extracted_name)
    return result["is_valid"], result["message"]
