from supabase import Client, create_client
import uuid

from app.core.config import settings

_client: Client | None = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise RuntimeError(
                "SUPABASE_URL / SUPABASE_KEY are not set - add them to backend/.env to enable file storage"
            )
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


class StorageService:
    """Centralized Supabase Storage access for course material files."""

    def __init__(self, bucket: str | None = None):
        self.bucket = bucket or settings.supabase_storage_bucket

    @property
    def client(self) -> Client:
        return get_supabase_client()

    def upload_file(self, file_bytes: bytes, filename: str, folder: str, content_type: str) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        object_path = f"{folder}/{uuid.uuid4().hex}.{ext}"
        self.client.storage.from_(self.bucket).upload(
            object_path,
            file_bytes,
            {"content-type": content_type or "application/octet-stream"},
        )
        return object_path

    def get_file_url(self, object_path: str) -> str:
        if self._bucket_is_public():
            return self.client.storage.from_(self.bucket).get_public_url(object_path)
        return self.get_signed_url(object_path)

    def get_signed_url(self, object_path: str, expires_in: int = 3600) -> str:
        response = self.client.storage.from_(self.bucket).create_signed_url(object_path, expires_in)
        if isinstance(response, dict):
            signed_url = response.get("signedURL") or response.get("signed_url")
        else:
            signed_url = getattr(response, "signed_url", None) or getattr(response, "signedURL", None)
        if not signed_url:
            raise RuntimeError("Unable to create a viewing URL for this material")
        return signed_url

    def delete_file(self, object_path: str) -> None:
        self.client.storage.from_(self.bucket).remove([object_path])

    def replace_file(self, old_object_path: str, file_bytes: bytes, filename: str, folder: str, content_type: str) -> str:
        new_path = self.upload_file(file_bytes, filename, folder, content_type)
        try:
            self.delete_file(old_object_path)
        except Exception:
            pass
        return new_path

    def download_file(self, object_path: str) -> bytes:
        return self.client.storage.from_(self.bucket).download(object_path)

    def _bucket_is_public(self) -> bool:
        try:
            bucket = self.client.storage.get_bucket(self.bucket)
        except Exception:
            return False

        if isinstance(bucket, dict):
            return bool(bucket.get("public"))
        return bool(getattr(bucket, "public", False))


storage_service = StorageService()


def upload_file(file_bytes: bytes, filename: str, folder: str, content_type: str) -> str:
    """Uploads a file and returns its storage path (bucket-relative)."""
    return storage_service.upload_file(file_bytes, filename, folder, content_type)


def get_public_url(object_path: str) -> str:
    return get_supabase_client().storage.from_(settings.supabase_storage_bucket).get_public_url(object_path)


def get_file_url(object_path: str) -> str:
    return storage_service.get_file_url(object_path)


def get_signed_url(object_path: str, expires_in: int = 3600) -> str:
    return storage_service.get_signed_url(object_path, expires_in)


def delete_file(object_path: str) -> None:
    storage_service.delete_file(object_path)


def replace_file(old_object_path: str, file_bytes: bytes, filename: str, folder: str, content_type: str) -> str:
    return storage_service.replace_file(old_object_path, file_bytes, filename, folder, content_type)


def download_file(object_path: str) -> bytes:
    return storage_service.download_file(object_path)
