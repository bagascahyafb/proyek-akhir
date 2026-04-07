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
        Lakukan OCR dan Ekstraksi Entitas dari gambar Ijazah ini.
        Output WAJIB JSON murni dengan keys:
        - "OCR_Raw": (Semua teks yang terbaca)
        - "Nama_Lengkap": Nama lengkap pemilik ijazah.
        - "NIM": Nomor Induk Mahasiswa / No Registrasi (Cari angka panjang, jangan NIK/No Ijazah).
        - "Jurusan": Program Studi atau Jurusan.
        - "Gelar": Gelar akademik (Contoh: S.Kom, Ph.D, S. T, Sarjana Teknik, Sarjana Komputer, DLL).
        - "Tahun_Lulus": Tahun kelulusan (4 digit, jangan buat dalam bentuk desimal).
        - "Universitas": Nama Perguruan Tinggi.

        Aturan:
        1. Jika data tidak ditemukan, isi dengan "Tidak Ditemukan Data". 
        2. Jangan mengarang data, akan tetapi jika entitas terdapat typo atau kesalahan penulisan maka perbaiki kesalahannya.
        3. Hanya berikan JSON murni.
        """
    else:
        prompt = """
        Lakukan OCR dan Ekstraksi Entitas dari gambar Sertifikat ini.
        Output WAJIB JSON murni dengan keys:
        - "Nama_Peserta": Nama orang yang menerima sertifikat.
        - "Judul_Sertifikat": Nama pelatihan/event.
        - "id_sertifikat" : Nomor sertifikat jika ada.
        - "Lembaga_Penerbit": Organisasi penerbit.
        - "Skill": Daftar skill atau topik utama (pisahkan koma).
        - "Tahun_Sertifikat": Tahun terbit (4 digit, jangan buat dalam bentuk desimal).
        - "Masa_Berlaku": Tahun kadaluarsa (4 digit, jangan buat dalam bentuk desimal, isi "Tidak Ditemukan Data" jika seumur hidup).
        - "Tipe_Skill": (Pilih satu dominan: "Hard Skill" atau "Soft Skill")
        - "Kategori": (Pilih satu: 'Sertifikasi' atau 'Penghargaan')
        
        Aturan:
        1. Jika data tidak ditemukan, isi dengan teks "Tidak Ditemukan Data". 
        2. Jangan mengarang data, akan tetapi jika entitas terdapat typo atau kesalahan penulisan maka perbaiki kesalahannya.
        3. Hanya berikan JSON murni.  
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
    Bertindaklah sebagai Expert CV Resume Writer. Tugasmu adalah memoles (rewrite) konten CV ini agar ATS-Friendly dan Profesional dalam bahasa {language}.

    INPUT DATA (JSON):
    {json.dumps(data)}

    TUGAS:
    1. Perbaiki tata bahasa dan ejaan.
    2. Ubah deskripsi pendidikan, pengalaman, dan proyek menjadi kalimat aksi yang kuat (Action Verbs), gunakan metode STAR (Situation Task Action Result).
    3. Jangan mengubah fakta (Nama, Tahun, Universitas), hanya perbaiki cara penyampaiannya.
    4. Terjemahkan konten ke bahasa {language} jika inputnya bahasa lain.
    5. Pada bagian Summary, buat ringkasan singkat (2-4 kalimat) yang menonjolkan keahlian dan pencapaian utama.
        * Jangan buat ringkasan yang terlalu umum seperti "Hardworking and dedicated professional seeking a challenging position." Hindari klise.
        * Ambil ringkasan berdasarkan output yang diberikan, jangan buat ringkasan yang tidak relevan dengan pengalaman dan keahlian yang ada. Harus sertakan lama pengalaman kerja dengan mengambil dari bagian Work Experience dan Projects, skill utama, dan pencapaian yang menonjol.
        * Contoh: "5 Years Experienced Software Engineer with a strong background in developing scalable web applications. Proficient in Python and JavaScript, with a proven track record of leading successful projects and improving system performance."
        * Pastikan format output tetap JSON dengan struktur yang sama persis seperti input, hanya isinya yang dipoles.

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