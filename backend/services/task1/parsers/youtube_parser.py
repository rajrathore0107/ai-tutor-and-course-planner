from youtube_transcript_api import YouTubeTranscriptApi
from services.shared.chunker import chunk_by_sections
from typing import List
import re
import logging

logger = logging.getLogger(__name__)


def extract_video_id(url: str) -> str:
    patterns = [r"(?:v=|youtu\.be/|embed/|shorts/)([a-zA-Z0-9_-]{11})"]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract video ID from URL: {url}")


def format_timestamp(seconds: float) -> str:
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


async def parse_youtube(url: str, source_id: str) -> List[dict]:
    video_id = extract_video_id(url)
    ytt = YouTubeTranscriptApi()

    # Try English first, then fall back to any available language
    transcript_list = None
    used_language = "en"

    try:
        transcript_list = list(ytt.fetch(video_id, languages=["en", "en-US", "en-GB"]))
    except Exception:
        try:
            # List all available transcripts and pick the first one
            available = ytt.list(video_id)
            transcript = None

            # Prefer manually created over auto-generated
            try:
                transcript = available.find_manually_created_transcript(
                    [t.language_code for t in available]
                )
            except Exception:
                pass

            if not transcript:
                # Fall back to any generated transcript
                for t in available:
                    transcript = t
                    break

            if not transcript:
                raise ValueError("No transcripts available for this video.")

            used_language = transcript.language_code
            transcript_list = list(transcript.fetch())
            logger.info(f"YouTube '{video_id}': using language '{used_language}'")
        except Exception as e:
            raise ValueError(f"Could not retrieve transcript: {e}")

    if not transcript_list:
        raise ValueError("Transcript is empty for this video.")

    # Group into ~30 second windows
    window_seconds = 30
    sections = []
    current_window = []
    window_start = 0

    for entry in transcript_list:
        if hasattr(entry, 'start'):
            start = entry.start
            text = entry.text.replace("\n", " ").strip()
        else:
            start = entry.get("start", 0)
            text = entry.get("text", "").replace("\n", " ").strip()

        if not current_window:
            window_start = start

        current_window.append(text)

        if start - window_start >= window_seconds:
            sections.append({
                "text": " ".join(current_window),
                "source_type": "youtube",
                "source_id": source_id,
                "source_label": f"Video ({video_id})",
                "video_id": video_id,
                "timestamp": format_timestamp(window_start),
                "timestamp_seconds": str(int(window_start)),
                "url": url,
                "language": used_language,
            })
            current_window = []
            window_start = start

    if current_window:
        sections.append({
            "text": " ".join(current_window),
            "source_type": "youtube",
            "source_id": source_id,
            "source_label": f"Video ({video_id})",
            "video_id": video_id,
            "timestamp": format_timestamp(window_start),
            "timestamp_seconds": str(int(window_start)),
            "url": url,
            "language": used_language,
        })

    chunks = chunk_by_sections(sections)
    logger.info(f"YouTube '{video_id}': {len(chunks)} chunks from {len(sections)} windows, lang={used_language}")
    return chunks


def get_video_metadata(url: str) -> dict:
    video_id = extract_video_id(url)
    return {
        "video_id": video_id,
        "url": url,
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "embed_url": f"https://www.youtube.com/embed/{video_id}",
    }
