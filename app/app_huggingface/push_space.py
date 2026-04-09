from pathlib import Path

from dotenv import dotenv_values
from huggingface_hub import HfApi


BASE_DIR = Path(__file__).resolve().parent
SPACE_REPO_ID = "bagascahyafb/gencvats-backend"
IGNORE_PATTERNS = [
    ".env",
    "__pycache__/*",
    "*.pyc",
    "uvicorn*.log",
    "temp_*",
    ".git/*",
    ".venv/*",
    "venv/*",
]


def main() -> None:
    env_path = BASE_DIR / ".env"
    config = dotenv_values(env_path)
    token = (config.get("HF_TOKEN") or "").strip()

    if not token:
        raise SystemExit(f"HF_TOKEN tidak ditemukan di {env_path}")

    api = HfApi(token=token)
    api.upload_folder(
        repo_id=SPACE_REPO_ID,
        repo_type="space",
        folder_path=str(BASE_DIR),
        path_in_repo=".",
        ignore_patterns=IGNORE_PATTERNS,
    )
    print(f"Upload selesai ke Space: {SPACE_REPO_ID}")


if __name__ == "__main__":
    main()
