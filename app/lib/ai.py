import json
import logging
import os
from pathlib import Path
from openai import OpenAI, RateLimitError
from dotenv import load_dotenv
from lib.file_process import encode_image

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
logger = logging.getLogger("gencvats.ai")


class AIRateLimitError(Exception):
    def __init__(self, retry_after=20):
        self.retry_after = max(1, min(int(retry_after), 120))
        super().__init__("Groq rate limit exceeded")


def get_secret(name):
    secret_file = os.getenv(f"{name}_FILE")
    if secret_file:
        try:
            return Path(secret_file).read_text(encoding="utf-8").strip()
        except OSError:
            return ""
    return os.getenv(name, "").strip()


def get_client():
    api_key = get_secret("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY belum diatur di environment.")
    return OpenAI(
        base_url=os.getenv("GROQ_BASE_URL", GROQ_BASE_URL),
        api_key=api_key,
    )

def get_model_id():
    model = os.getenv("GROQ_MODEL")
    if not model:
        raise RuntimeError("GROQ_MODEL belum diatur di environment.")
    return model


def _qwen_instruct_options(model_id):
    if model_id in {"qwen/qwen3.6-27b", "qwen/qwen3.8-27b"}:
        return {"reasoning_effort": "none"}
    return {}


def _strict_object_format(name, properties):
    return {
        "type": "json_schema",
        "json_schema": {
            "name": name,
            "strict": True,
            "schema": {
                "type": "object",
                "properties": properties,
                "required": list(properties),
                "additionalProperties": False,
            },
        },
    }


def _parse_json_content(response):
    content = response.choices[0].message.content or ""
    content = content.replace("```json", "").replace("```", "").strip()
    if not content:
        raise ValueError("empty model response")
    parsed = json.loads(content)
    if not isinstance(parsed, dict):
        raise ValueError("model response is not an object")
    return parsed


def _log_ai_failure(operation, error):
    logger.warning(
        "Groq %s gagal: type=%s status=%s code=%s request_id=%s",
        operation,
        type(error).__name__,
        getattr(error, "status_code", None),
        getattr(error, "code", None),
        getattr(error, "request_id", None),
    )


def _get_retry_after(error):
    response = getattr(error, "response", None)
    headers = getattr(response, "headers", {}) or {}
    raw_value = headers.get("retry-after", "20")
    try:
        return max(1, int(float(raw_value)))
    except (TypeError, ValueError):
        return 20

def run_ai_ocr(image, jenis):
    client = get_client()
    model_id = get_model_id()
    base64_img = encode_image(image)
    
    if jenis == "ijazah":
        response_format = _strict_object_format(
            "ijazah_ocr",
            {
                "Nama_Lengkap": {"type": "string"},
                "Jurusan": {"type": "string"},
                "Gelar": {"type": "string"},
                "Tahun_Lulus": {"type": "string"},
                "Universitas": {"type": "string"},
            },
        )
        prompt = """
        Lakukan OCR dan ekstraksi entitas dari gambar ijazah ini.

        Output wajib JSON murni dengan keys:
        - "Nama_Lengkap"
        - "Jurusan"
        - "Gelar"
        - "Tahun_Lulus"
        - "Universitas"

        Aturan:
        Jika data tidak ditemukan, isi "". Jangan mengarang data, tapi perbaiki typo jika jelas salah. Hanya output JSON murni.
        """
    else:
        response_format = _strict_object_format(
            "sertifikat_ocr",
            {
                "Nama_Peserta": {"type": "string"},
                "Judul_Sertifikat": {"type": "string"},
                "id_sertifikat": {"type": "string"},
                "Lembaga_Penerbit": {"type": "string"},
                "Skill": {"type": "string"},
                "Tahun_Sertifikat": {"type": "string"},
                "Masa_Berlaku": {"type": "string"},
                "Tipe_Skill": {"type": "string", "enum": ["Hard Skill", "Soft Skill", ""]},
                "Kategori": {"type": "string", "enum": ["Sertifikasi", "Penghargaan", ""]},
            },
        )
        prompt = """
        
        Lakukan OCR dan ekstraksi entitas dari gambar sertifikat ini.

        Output wajib JSON murni dengan keys:
            - "Nama_Peserta"
            - "Judul_Sertifikat"
            - "id_sertifikat"
            - "Lembaga_Penerbit"
            - "Skill"
            - "Tahun_Sertifikat"
            - "Masa_Berlaku"
            - "Tipe_Skill" ("Hard Skill" / "Soft Skill")
            - "Kategori" ("Sertifikasi" / "Penghargaan")

            Aturan:
            - "Judul_Sertifikat" adalah nama utama sertifikat, penghargaan, kompetisi, pelatihan, ujian, atau pencapaian yang diberikan pada dokumen.
            - Jangan gunakan kata generik seperti: "Certificate", "Sertifikat", "Certificate of Completion", "Certificate of Achievement", atau "Piagam Penghargaan" sebagai Judul_Sertifikat jika ada nama kegiatan/pencapaian yang lebih spesifik.
            - Prioritaskan nama yang paling merepresentasikan isi utama dokumen.

            Contoh:
            - "TABLE MANNER", "TOEFL ITP", "Junior Web Developer", "Juara 1 Lomba UI/UX", "Workshop Keterampilan Digital", Jika data tidak ditemukan, isi "". Jangan mengarang data. Perbaiki typo jika jelas salah.
            - Hanya output JSON murni.
        """

    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}]}],
            temperature=0.1,
            max_tokens=768,
            response_format=response_format,
            **_qwen_instruct_options(model_id),
        )
        return _parse_json_content(response)
    except RateLimitError as e:
        _log_ai_failure("OCR", e)
        raise AIRateLimitError(_get_retry_after(e)) from e
    except Exception as e:
        _log_ai_failure("OCR", e)
        return None

IT_DS_KEYWORDS = [
    "informatika", "sistem informasi", "ilmu komputer", "computer science",
    "information technology", "teknologi informasi", "data science", "data analyst",
    "data analytics", "machine learning", "artificial intelligence", "ai",
    "software", "web developer", "mobile developer", "programming", "coding",
    "database", "sql", "python", "javascript", "java", "cloud", "network",
    "cybersecurity", "security", "ui/ux", "devops", "backend", "frontend",
    "fullstack", "data mining", "big data", "business intelligence",
]

def validate_it_ds_relevance(ocr_result, jenis):
    text = json.dumps(ocr_result, ensure_ascii=False).lower()
    matched_keywords = [keyword for keyword in IT_DS_KEYWORDS if keyword in text]
    if matched_keywords:
        return {
            "is_relevant": True,
            "status": "relevant",
            "confidence": 0.9,
            "reason": f"Terdeteksi kata kunci: {', '.join(matched_keywords[:5])}.",
        }

    return {
        "is_relevant": False,
        "status": "not_relevant",
        "confidence": 0.65,
        "reason": "Tidak ditemukan kata kunci IT atau Data Science pada hasil OCR.",
    }

def enhance_final_cv_llm(data, language="English"):
    client = get_client()
    model_id = get_model_id()
    
    prompt = f"""
    Bertindaklah sebagai Expert CV Resume Writer. Poles konten CV berikut agar ATS-Friendly dan profesional dalam bahasa {language}.

    INPUT JSON:
    {json.dumps(data)}

    TUGAS:
    1. Perbaiki tata bahasa dan ejaan.
    2. Jika deskripsi pendidikan, pengalaman, atau proyek memiliki isi, ubah menjadi kalimat aksi kuat menggunakan metode STAR (Situation, Task, Action, Result). Jika kosong, biarkan kosong dan jangan mengarang data, terutama angka.
    3. Jangan ubah fakta seperti Nama, Tahun, atau Universitas.
    4. Terjemahkan ke bahasa {language} jika diperlukan.
    5. Buat Summary singkat (2–4 kalimat) yang:
    - Menonjolkan skill utama dan pencapaian penting.
    - Tidak klise/generik.
    - Relevan dengan pengalaman dan skill yang tersedia.
    - Menyebutkan lama pengalaman berdasarkan Work Experience dan Projects jika memungkinkan.
    - Contoh:
        "5 Years Experienced Software Engineer with a strong background in developing scalable web applications. Proficient in Python and JavaScript, with a proven track record of leading successful projects and improving system performance."

    Rules:
    Pertahankan struktur JSON input secara IDENTIK. Hanya poles isi teksnya. Jangan mengarang data. Output wajib JSON murni tanpa teks tambahan.
    """
    
    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.001,
            max_tokens=8192,
            response_format={"type": "json_object"},
            **_qwen_instruct_options(model_id),
        )
        return _parse_json_content(response)
    except Exception as e:
        _log_ai_failure("enhance", e)
        return data # Kembalikan data asli kalau error
