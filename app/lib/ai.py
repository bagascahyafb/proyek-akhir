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
        Ekstrak data Ijazah ke JSON. Keys: "Nama_Lengkap", "Universitas", "Jurusan", "Gelar", "Tahun_Lulus", "IPK".
        Jika tidak ada, isi "Tidak Ditemukan".
        """
    else:
        prompt = """
        Ekstrak data Sertifikat ke JSON.
        Keys: 
        - "Nama_Peserta"
        - "Judul_Sertifikat"
        - "Lembaga_Penerbit"
        - "Tahun_Sertifikat"
        - "Skill": (daftar skill utama, pisah koma)
        - "Tipe_Skill": (Pilih satu dominan: "Hard Skill" atau "Soft Skill")
        - "Kategori": (Pilih satu: 'Sertifikasi' atau 'Penghargaan')
        
        Jika sertifikat penghargaan/lomba, masukkan ke Kategori 'Penghargaan'.
        """

    try:
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=[{"role": "user", "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}]}],
            temperature=0.1, max_tokens=1024,
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        return None

def enhance_final_cv_llm(data, language="English"):
    client = get_client()
    
    prompt = f"""
    Bertindaklah sebagai Expert CV Resume Writer. Tugasmu adalah memoles (rewrite) konten CV ini agar ATS-Friendly dan Profesional dalam bahasa {language}.
    
    INPUT DATA (JSON):
    {json.dumps(data)}
    
    TUGAS:
    1. Perbaiki tata bahasa dan ejaan.
    2. Ubah deskripsi pengalaman/proyek menjadi kalimat aksi yang kuat (Action Verbs), gunakan metode STAR (Situation Task Action Result).
    3. Pastikan Summary menarik dan profesional.
    4. Jangan mengubah fakta (Nama, Tahun, Universitas), hanya perbaiki cara penyampaiannya.
    5. Terjemahkan konten ke bahasa {language} jika inputnya bahasa lain.
    
    OUTPUT:
    Kembalikan JSON yang strukturnya SAMA PERSIS dengan input, tapi isinya sudah dipoles, jangan mengarang data.
    Hanya output JSON, tanpa teks lain.
    """
    
    try:
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        content = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"Gagal melakukan enhance AI: {e}")
        return data # Kembalikan data asli kalau error