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
            with open(temp_filename, "wb") as f:
                f.write(uploaded_file.getbuffer())
            images = convert_from_path(temp_filename, first_page=1, last_page=1, poppler_path=POPPLER_PATH)
            if os.path.exists(temp_filename): os.remove(temp_filename)
            return images[0] if images else None
        else:
            return Image.open(uploaded_file)
    except Exception as e:
        print(f"Gagal memproses file: {e}")
        return None

def encode_image(pil_image):
    max_size = 1024 
    w, h = pil_image.size
    if w > max_size or h > max_size:
        ratio = max_size / max(w, h)
        pil_image = pil_image.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)
    buffered = io.BytesIO()
    pil_image.convert("RGB").save(buffered, format="JPEG", quality=85)
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def validate_name(target_name, extracted_name, threshold=70):
    if not target_name: return True, "Dilewati (Input Kosong)" 
    if not extracted_name or not isinstance(extracted_name, str): return False, "Format Nama Salah"
    
    clean_extracted = extracted_name.lower().strip()
    if clean_extracted in ["tidak ditemukan data", "tidak ditemukan", "-", ""]: 
        return False, "Nama tidak terdeteksi"
    
    similarity_score = fuzz.token_set_ratio(target_name.lower(), clean_extracted)
    
    if similarity_score >= threshold: return True, f"Valid ({similarity_score}%)"
    elif similarity_score >= 50: return False, f"Meragukan ({similarity_score}%)"
    else: return False, f"Tidak Cocok ({similarity_score}%)"
