from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Gemini
    gemini_api_key: str

    # Supabase
    supabase_url: str
    supabase_anon_key: str

    # App
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    max_upload_size_mb: int = 50
    chunk_size: int = 400
    chunk_overlap: int = 50
    top_k_results: int = 5

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()