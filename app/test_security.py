import hashlib
import hmac
import io
import os
import tempfile
import time
import unittest
from pathlib import Path

os.environ["APP_ENV"] = "production"
os.environ["GROQ_API_KEY"] = "test-key"
os.environ["GROQ_MODEL"] = "test-model"

_upload_dir = tempfile.TemporaryDirectory(prefix="gencvats_security_test_")
os.environ["UPLOAD_DIR"] = _upload_dir.name

from fastapi import UploadFile
from fastapi.testclient import TestClient

import api


class SecuritySmokeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(api.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        _upload_dir.cleanup()

    def setUp(self):
        with api._rate_lock:
            api._global_requests.clear()
            api._global_hourly_requests.clear()
            api._client_requests.clear()

    def test_health_and_production_docs(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "provider": "groq"})
        self.assertEqual(self.client.get("/docs").status_code, 404)
        self.assertEqual(self.client.get("/openapi.json").status_code, 404)

    def test_upload_signature_validation(self):
        image = UploadFile(filename="photo.jpg", file=io.BytesIO(b"\xff\xd8\xff" + b"data"))
        self.assertEqual(api.validate_upload(image), ("image", ".jpg"))

        invalid = UploadFile(filename="payload.exe", file=io.BytesIO(b"MZ" + b"data"))
        with self.assertRaises(api.HTTPException) as error:
            api.validate_upload(invalid)
        self.assertEqual(error.exception.status_code, 400)

    def test_signed_upload_url(self):
        filename = f"{'a' * 32}.jpg"
        file_path = Path(_upload_dir.name) / filename
        file_path.write_bytes(b"\xff\xd8\xffdata")

        response = self.client.get(api.create_signed_upload_url(filename))
        self.assertEqual(response.status_code, 200)

        expires = int(time.time()) + 60
        payload = f"gencvats-upload:{filename}:{expires}".encode()
        signature = hmac.new(api.UPLOAD_SIGNING_KEY, payload, hashlib.sha256).hexdigest()
        tampered_signature = signature[:-1] + ("0" if signature[-1] != "0" else "1")
        tampered = self.client.get(
            f"/uploads/{filename}?expires={expires}&signature={tampered_signature}"
        )
        self.assertEqual(tampered.status_code, 404)

    def test_rate_limit(self):
        original_client_limit = api.RATE_LIMIT_PER_CLIENT
        original_global_limit = api.RATE_LIMIT_GLOBAL
        api.RATE_LIMIT_PER_CLIENT = 2
        api.RATE_LIMIT_GLOBAL = 10
        try:
            headers = {"x-forwarded-for": "203.0.113.10"}
            self.assertEqual(self.client.post("/enhance-cv", json={}, headers=headers).status_code, 422)
            self.assertEqual(self.client.post("/enhance-cv", json={}, headers=headers).status_code, 422)
            limited = self.client.post("/enhance-cv", json={}, headers=headers)
            self.assertEqual(limited.status_code, 429)
            self.assertIn("Retry-After", limited.headers)
        finally:
            api.RATE_LIMIT_PER_CLIENT = original_client_limit
            api.RATE_LIMIT_GLOBAL = original_global_limit

    def test_hourly_global_rate_limit(self):
        original_client_limit = api.RATE_LIMIT_PER_CLIENT
        original_global_limit = api.RATE_LIMIT_GLOBAL
        original_hourly_limit = api.RATE_LIMIT_GLOBAL_HOURLY
        api.RATE_LIMIT_PER_CLIENT = 10
        api.RATE_LIMIT_GLOBAL = 10
        api.RATE_LIMIT_GLOBAL_HOURLY = 2
        try:
            self.assertTrue(api.check_rate_limit("client-a")[0])
            self.assertTrue(api.check_rate_limit("client-b")[0])
            allowed, retry_after = api.check_rate_limit("client-c")
            self.assertFalse(allowed)
            self.assertGreater(retry_after, 0)
        finally:
            api.RATE_LIMIT_PER_CLIENT = original_client_limit
            api.RATE_LIMIT_GLOBAL = original_global_limit
            api.RATE_LIMIT_GLOBAL_HOURLY = original_hourly_limit


if __name__ == "__main__":
    unittest.main()
