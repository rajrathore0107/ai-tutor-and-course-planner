import google.generativeai as genai
from config import settings
from typing import AsyncGenerator, Optional
import logging
import json
import re

logger = logging.getLogger(__name__)

# Configure Gemini once
genai.configure(api_key=settings.gemini_api_key)

GENERATION_CONFIG = genai.types.GenerationConfig(
    temperature=0.7,
    top_p=0.95,
    top_k=40,
    max_output_tokens=8192,
)

STRUCTURED_CONFIG = genai.types.GenerationConfig(
    temperature=0.3,  # Lower temp for structured/deterministic output
    top_p=0.9,
    max_output_tokens=32768,  # Large enough for full course plan JSON (5 modules × lessons × resources)
)


def get_model(structured: bool = False, system_instruction: Optional[str] = None) -> genai.GenerativeModel:
    config = STRUCTURED_CONFIG if structured else GENERATION_CONFIG
    return genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=config,
        system_instruction=system_instruction,  # persists across ALL chat turns
    )


async def stream_response(
    prompt: str,
    system_prompt: Optional[str] = None,
    history: Optional[list] = None,
) -> AsyncGenerator[str, None]:
    """Stream a Gemini response token by token as an async generator."""
    # Pass system_instruction so it applies to every turn, including chat history turns
    model = get_model(system_instruction=system_prompt)

    try:
        if history:
            chat = model.start_chat(history=history)
            response = await chat.send_message_async(prompt, stream=True)
        else:
            response = await model.generate_content_async(prompt, stream=True)

        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        logger.error(f"Gemini streaming error: {e}")
        yield f"\n\n[Error generating response: {str(e)}]"


async def generate_structured(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Generate a non-streaming structured response (for JSON output)."""
    model = get_model(structured=True)
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

    try:
        response = await model.generate_content_async(full_prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini structured generation error: {e}")
        raise


def parse_json_response(raw: str) -> dict:
    """Safely parse JSON from LLM response, stripping markdown fences if present."""
    text = raw.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        text = text.strip()

    # If there's still non-JSON text before the object, extract the JSON block
    if not text.startswith("{") and not text.startswith("["):
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            text = match.group(0)

    return json.loads(text.strip())
