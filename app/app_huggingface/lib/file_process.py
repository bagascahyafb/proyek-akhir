from pdf2image import convert_from_path
from PIL import Image
import io
import os
import base64
from thefuzz import fuzz

POPPLER_PATH = r"PROYEK-AKHIR/bin/poppler-25.07.0/Library/bin"


def process_uploaded_file(uploaded_file):
    try:
        if uploaded_file.type == "application/pdf":
            temp_filename = f"temp_{uploaded_file.name}"
            with open(temp_filename, "wb") as handle:
                handle.write(uploaded_file.getbuffer())
            images = convert_from_path(
                temp_filename,
                first_page=1,
                last_page=1,
                poppler_path=POPPLER_PATH,
            )
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
            return images[0] if images else None
        return Image.open(uploaded_file)
    except Exception as exc:
        print(f"Gagal memproses file: {exc}")
        return None


def encode_image(pil_image):
    max_size = 1024
    width, height = pil_image.size
    if width > max_size or height > max_size:
        ratio = max_size / max(width, height)
        pil_image = pil_image.resize((int(width * ratio), int(height * ratio)), Image.LANCZOS)
    buffered = io.BytesIO()
    pil_image.convert("RGB").save(buffered, format="JPEG", quality=85)
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def validate_name(target_name, extracted_name, threshold=70):
    if not target_name:
        return True, "Dilewati (Input Kosong)"
    if not extracted_name or not isinstance(extracted_name, str):
        return False, "Format Nama Salah"

    clean_extracted = extracted_name.lower().strip()
    if clean_extracted in ["tidak ditemukan data", "tidak ditemukan", "-", ""]:
        return False, "Nama tidak terdeteksi"

    similarity_score = fuzz.token_set_ratio(target_name.lower(), clean_extracted)

    if similarity_score >= threshold:
        return True, f"Valid ({similarity_score}%)"
    if similarity_score >= 50:
        return False, f"Meragukan ({similarity_score}%)"
    return False, f"Tidak Cocok ({similarity_score}%)"
