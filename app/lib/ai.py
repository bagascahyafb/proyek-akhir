import json
from openai import OpenAI
from lib.file_process import encode_image

LM_STUDIO_URL = "http://127.0.0.1:1234/v1"
API_KEY = "lm-studio"
MODEL_ID = "qwen/qwen3-vl-4b" 

def get_client():
    return OpenAI(base_url=LM_STUDIO_URL, api_key=API_KEY)

def run_ai_ocr(image, jenis):
    client = get_client()
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
            model=MODEL_ID,
            messages=[{"role": "user", "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}]}],
            temperature=0.1, max_tokens=8192,
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        return None

def enhance_final_cv_llm(data, language="English"):
    client = get_client()
    
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
            model=MODEL_ID,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.001, max_tokens=8192,
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"Gagal melakukan enhance AI: {e}")
        return data # Kembalikan data asli kalau error