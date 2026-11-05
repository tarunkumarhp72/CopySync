import logging
from collections.abc import AsyncIterator
from pathlib import Path
from typing import BinaryIO

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

CHUNK_SIZE = 64 * 1024  # 64 KB streaming chunks to maintain < 500 MiB RAM


class StorageService:
    def __init__(self) -> None:
        self.backend = settings.STORAGE_BACKEND
        self.supabase_url = settings.SUPABASE_STORAGE_URL.rstrip("/")
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.api_key = settings.SUPABASE_STORAGE_KEY
        self.upload_dir = Path(settings.UPLOAD_DIR).resolve()
        if self.backend == "local":
            self.upload_dir.mkdir(parents=True, exist_ok=True)

    def get_public_url(self, storage_key: str) -> str:
        if self.backend == "supabase":
            return f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{storage_key}"
        return f"/uploads/images/{storage_key}"

    async def upload_stream(self, file_obj: BinaryIO, storage_key: str, content_type: str) -> str:
        """Stream image data in chunks directly to Supabase Storage or local disk without buffering in RAM."""
        if self.backend == "supabase":
            upload_url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{storage_key}"
            headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            }

            async def chunk_stream() -> AsyncIterator[bytes]:
                file_obj.seek(0)
                while True:
                    chunk = file_obj.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    yield chunk

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(upload_url, content=chunk_stream(), headers=headers)
                if response.status_code not in (200, 201):
                    logger.error(
                        "Supabase storage upload failed: status=%s, body=%s",
                        response.status_code,
                        response.text,
                    )
                    raise RuntimeError(f"Storage upload failed: {response.text}")

            return self.get_public_url(storage_key)

        # Local fallback
        path = self.upload_dir / storage_key
        file_obj.seek(0)
        with path.open("wb") as f:
            while True:
                chunk = file_obj.read(CHUNK_SIZE)
                if not chunk:
                    break
                f.write(chunk)
        return self.get_public_url(storage_key)

    async def delete_object(self, storage_key: str) -> None:
        """Delete an image object from storage."""
        if self.backend == "supabase":
            delete_url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{storage_key}"
            headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                try:
                    await client.delete(delete_url, headers=headers)
                except Exception as exc:
                    logger.warning("Failed to delete storage object %s: %s", storage_key, exc)
            return

        path = self.upload_dir / storage_key
        path.unlink(missing_ok=True)


storage_service = StorageService()
