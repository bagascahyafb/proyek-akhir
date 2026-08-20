import json
import os
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
from lib.file_process import encode_image

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEFAULT_PROVIDER = "local"
LOCAL_LLM_BASE_URL = "http://127.0.0.1:1234/v1"
LOCAL_LLM_API_KEY = "lm-studio"
LOCAL_LLM_MODEL = "qwen/qwen3-vl-4b"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

def get_llm_provider():
    return os.getenv("LLM_PROVIDER", DEFAULT_PROVIDER).strip().lower()

def get_client(provider=None):
    selected_provider = (provider or get_llm_provider()).strip().lower()

    if selected_provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY belum diatur di environment.")
        return OpenAI(
            base_url=os.getenv("GROQ_BASE_URL", GROQ_BASE_URL),
            api_key=api_key,
        )

    return OpenAI(
        base_url=os.getenv("LOCAL_LLM_BASE_URL", LOCAL_LLM_BASE_URL),
        api_key=os.getenv("LOCAL_LLM_API_KEY", LOCAL_LLM_API_KEY),
    )

def get_model_id(provider=None):
    selected_provider = (provider or get_llm_provider()).strip().lower()
    if selected_provider == "groq":
        model = os.getenv("GROQ_MODEL")
        if not model:
            raise RuntimeError("GROQ_MODEL belum diatur di environment.")
        return model

    return os.getenv("LOCAL_LLM_MODEL", LOCAL_LLM_MODEL)

def run_ai_ocr(image, jenis, provider=None):
    provider = provider or get_llm_provider()
    client = get_client(provider)
    model_id = get_model_id(provider)
    base64_img = encode_image(image)
    
    if jenis == "ijazah":
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
            temperature=0.1, max_tokens=8192,
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
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

def validate_it_ds_relevance(ocr_result, jenis, provider=None):
    text = json.dumps(ocr_result, ensure_ascii=False).lower()
    matched_keywords = [keyword for keyword in IT_DS_KEYWORDS if keyword in text]
    if matched_keywords:
        return {
            "is_relevant": True,
            "status": "relevant",
            "confidence": 0.9,
            "reason": f"Terdeteksi kata kunci: {', '.join(matched_keywords[:5])}.",
        }

    provider = provider or get_llm_provider()
    client = get_client(provider)
    model_id = get_model_id(provider)
    prompt = f"""
    Klasifikasikan apakah data OCR dokumen {jenis} berikut relevan untuk bidang IT dan Data Science.

    Anggap relevan jika berkaitan dengan informatika, sistem informasi, ilmu komputer, software engineering,
    data science, machine learning, AI, cybersecurity, cloud, jaringan, database, UI/UX, pemrograman,
    data analytics, atau skill teknologi digital yang dekat dengan bidang tersebut.

    DATA OCR:
    {json.dumps(ocr_result, ensure_ascii=False)}

    Output wajib JSON murni dengan keys:
    - "is_relevant": boolean
    - "confidence": number antara 0 dan 1
    - "reason": string singkat dalam Bahasa Indonesia
    """

    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.001,
            max_tokens=512,
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(content)
        is_relevant = bool(parsed.get("is_relevant"))
        return {
            "is_relevant": is_relevant,
            "status": "relevant" if is_relevant else "not_relevant",
            "confidence": parsed.get("confidence"),
            "reason": parsed.get("reason") or "AI tidak memberi alasan rinci.",
        }
    except Exception as e:
        return {
            "is_relevant": False,
            "status": "unknown",
            "confidence": None,
            "reason": "Validasi relevansi IT & Data Science tidak dapat dipastikan.",
        }

def enhance_final_cv_llm(data, language="English", provider=None):
    provider = provider or get_llm_provider()
    client = get_client(provider)
    model_id = get_model_id(provider)
    
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
            temperature=0.001, max_tokens=8192,
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"Gagal melakukan enhance AI: {e}")
        return data # Kembalikan data asli kalau error
