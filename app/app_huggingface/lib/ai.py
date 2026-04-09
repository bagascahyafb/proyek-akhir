import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from lib.file_process import encode_image

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(ENV_PATH)


class AIConfigurationError(Exception):
    pass


class AIRequestError(Exception):
    pass


@dataclass(frozen=True)
class HFConfig:
    token: str
    model_id: str
    provider: str
    base_url: str

    @property
    def uses_dedicated_endpoint(self) -> bool:
        return bool(self.base_url)

    @property
    def endpoint_host(self) -> str:
        if not self.base_url:
            return ""
        return urlparse(self.base_url).netloc


def load_config() -> HFConfig:
    config = HFConfig(
        token=os.getenv("HF_TOKEN", "").strip(),
        model_id=os.getenv("HF_MODEL_ID", "Qwen/Qwen2.5-VL-7B-Instruct").strip(),
        provider=os.getenv("HF_PROVIDER", "hf-inference").strip() or "hf-inference",
        base_url=os.getenv("HF_BASE_URL", "").strip().rstrip("/"),
    )

    if not config.token:
        raise AIConfigurationError("HF_TOKEN belum diset. Isi file .env atau environment variable terlebih dahulu.")

    if not config.model_id:
        raise AIConfigurationError("HF_MODEL_ID belum diset.")

    if config.model_id.startswith("HF_MODEL_ID="):
        raise AIConfigurationError(
            "Nilai HF_MODEL_ID tidak valid. Isi hanya model ID, misalnya Qwen/Qwen2.5-VL-7B-Instruct."
        )

    if config.base_url and not config.base_url.startswith(("http://", "https://")):
        raise AIConfigurationError("HF_BASE_URL harus berupa URL penuh, misalnya https://<endpoint>.endpoints.huggingface.cloud")

    return config


def get_client(config: HFConfig) -> InferenceClient:
    if config.uses_dedicated_endpoint:
        return InferenceClient(base_url=config.base_url, api_key=config.token)
    return InferenceClient(provider=config.provider, api_key=config.token)


def clean_json_payload(content: Any) -> str:
    if isinstance(content, list):
        content = "".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict) and part.get("type") == "text"
        )
    return str(content).replace("```json", "").replace("```", "").strip()


def parse_json_response(content: Any) -> dict[str, Any]:
    cleaned = clean_json_payload(content)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AIRequestError(f"Respons model bukan JSON valid. Payload diterima: {cleaned[:300]}") from exc


def normalize_empty_values(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: normalize_empty_values(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_empty_values(item) for item in value]
    if isinstance(value, str):
        normalized = value.strip()
        if normalized.lower() in {
            "tidak ditemukan data",
            "tidak ditemukan",
            "not found",
            "n/a",
            "-",
        }:
            return ""
    return value


def build_ocr_prompt(jenis: str) -> str:
    if jenis == "ijazah":
        return """
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
        1. Jika data tidak ditemukan, isi dengan string kosong "".
        2. Jangan mengarang data, akan tetapi jika entitas terdapat typo atau kesalahan penulisan maka perbaiki kesalahannya.
        3. Hanya berikan JSON murni.
        """

    return """
    Lakukan OCR dan Ekstraksi Entitas dari gambar Sertifikat ini.
    Output WAJIB JSON murni dengan keys:
    - "Nama_Peserta": Nama orang yang menerima sertifikat.
    - "Judul_Sertifikat": Nama pelatihan/event.
    - "id_sertifikat" : Nomor sertifikat jika ada.
    - "Lembaga_Penerbit": Organisasi penerbit.
    - "Skill": Daftar skill atau topik utama (pisahkan koma).
    - "Tahun_Sertifikat": Tahun terbit (4 digit, jangan buat dalam bentuk desimal).
    - "Masa_Berlaku": Tahun kadaluarsa (4 digit, jangan buat dalam bentuk desimal, isi string kosong "" jika seumur hidup atau tidak ditemukan).
    - "Tipe_Skill": (Pilih satu dominan: "Hard Skill" atau "Soft Skill")
    - "Kategori": (Pilih satu: "Sertifikasi" atau "Penghargaan")

    Aturan:
    1. Jika data tidak ditemukan, isi dengan string kosong "".
    2. Jangan mengarang data, akan tetapi jika entitas terdapat typo atau kesalahan penulisan maka perbaiki kesalahannya.
    3. Hanya berikan JSON murni.
    """


def create_chat_completion(messages: list[dict[str, Any]], temperature: float, max_tokens: int) -> dict[str, Any]:
    config = load_config()
    client = get_client(config)

    try:
        response = client.chat.completions.create(
            model=config.model_id,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return {
            "content": response.choices[0].message.content,
            "config": config,
        }
    except Exception as exc:
        mode = "dedicated endpoint" if config.uses_dedicated_endpoint else f"provider router ({config.provider})"
        hint = ""
        error_text = str(exc)

        if "404" in error_text and not config.uses_dedicated_endpoint:
            hint = (
                " Model ini tidak tersedia pada router provider saat ini. "
                "Untuk model multimodal Qwen-VL, disarankan memakai Hugging Face Inference Endpoint dedicated "
                "dan mengisi HF_BASE_URL."
            )
        elif "404" in error_text and config.uses_dedicated_endpoint:
            hint = (
                " Dedicated endpoint terhubung, tetapi URL atau route OpenAI-compatible kemungkinan belum cocok. "
                "Pastikan endpoint mendukung /v1/chat/completions."
            )

        raise AIRequestError(f"Gagal memanggil model via {mode}: {exc}.{hint}") from exc


def run_ai_ocr(image, jenis: str):
    base64_img = encode_image(image)
    prompt = build_ocr_prompt(jenis)

    result = create_chat_completion(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}},
                ],
            }
        ],
        temperature=0.1,
        max_tokens=8192,
    )
    return normalize_empty_values(parse_json_response(result["content"]))


def enhance_final_cv_llm(data, language: str = "English"):
    prompt = f"""
    Bertindaklah sebagai Expert CV Resume Writer. Tugasmu adalah memoles (rewrite) konten CV ini agar ATS-Friendly dan Profesional dalam bahasa {language}.

    INPUT DATA (JSON):
    {json.dumps(data)}

    TUGAS:
    1. Perbaiki tata bahasa dan ejaan.
    2. Ubah deskripsi pendidikan, pengalaman, dan proyek menjadi kalimat aksi yang kuat, gunakan metode STAR.
    3. Jangan mengubah fakta, hanya perbaiki cara penyampaiannya.
    4. Terjemahkan konten ke bahasa {language} jika inputnya bahasa lain.
    5. Pada bagian Summary, buat ringkasan singkat 2-4 kalimat yang menonjolkan keahlian dan pencapaian utama.

    OUTPUT:
    Kembalikan JSON yang strukturnya sama persis dengan input, tapi isinya sudah dipoles, jangan mengarang data.
    Hanya output JSON, tanpa teks lain.
    """

    result = create_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=8192,
    )
    return normalize_empty_values(parse_json_response(result["content"]))
