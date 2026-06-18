from supabase import create_client, Client
from config import settings
import logging

logger = logging.getLogger(__name__)

_supabase_client: Client | None = None


async def init_supabase():
    global _supabase_client
    _supabase_client = create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase() -> Client:
    if _supabase_client is None:
        raise RuntimeError("Supabase not initialized. Call init_supabase() first.")
    return _supabase_client
