import httpx
from bs4 import BeautifulSoup
from services.shared.chunker import chunk_text
from typing import List
import re
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EduAssist/1.0; +https://eduassist.ai)",
}


async def parse_url(url: str, source_id: str) -> List[dict]:
    """
    Scrape a public webpage and extract clean text content.
    Returns annotated chunks with URL source metadata.
    """
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(url, headers=HEADERS)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove non-content elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"]):
        tag.decompose()

    # Try to get the page title
    title = ""
    if soup.title:
        title = soup.title.string.strip() if soup.title.string else ""

    # Extract main content — prefer <main> or <article>, fall back to <body>
    main = soup.find("main") or soup.find("article") or soup.find("body")
    if not main:
        main = soup

    # Extract text with some structure preserved
    lines = []
    for element in main.find_all(["h1", "h2", "h3", "h4", "p", "li", "td", "th", "pre", "code", "blockquote"]):
        text = element.get_text(separator=" ", strip=True)
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > 20:  # Skip very short fragments
            lines.append(text)

    full_text = "\n\n".join(lines)

    if not full_text.strip():
        raise ValueError(f"No readable content found at {url}")

    chunks = chunk_text(
        full_text,
        metadata={
            "source_type": "url",
            "source_id": source_id,
            "source_label": title or url,
            "url": url,
        }
    )

    logger.info(f"URL '{url}': {len(chunks)} chunks extracted")
    return chunks


def get_url_display_label(url: str) -> str:
    """Extract a short display label from a URL."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return parsed.netloc or url
