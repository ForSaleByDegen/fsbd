"""
FSBD In-House AI Service - Vision API for Snap to Compare.
Calls Ollama (llava) to analyze images and return structured JSON for listing suggestions.
"""
import base64
import json
import os
import tempfile
import urllib.request
import urllib.error
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="FSBD AI Service")

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llava:7b")

# Must match the prompt expected by find-comps-from-image route
CATEGORIES = "for-sale, digital-assets, services, gigs, housing, community, jobs"
SUBCATEGORIES = "electronics, furniture, vehicles, collectibles, clothing, sports, books, other"

PROMPT = f"""You are helping a user list an item for sale. Look at this image and respond with a JSON object (no markdown, no code blocks) with these exact keys:
- "suggestedTitle": A short listing title (max 80 chars).
- "itemDescription": A 1-2 sentence description (condition, key features). Plain text, no code.
- "suggestedPrice": A price string in SOL (e.g. "0.5") or USD (e.g. "25") — estimate from typical market value.
- "category": One of: {CATEGORIES}. Usually "for-sale".
- "subcategory": For for-sale use one of: {SUBCATEGORIES}. Otherwise "other".
- "searchKeywords": An array of 3-6 search terms, e.g. ["vintage lamp", "brass", "table lamp"].
- "suggestedTokenName": A token name for the item, e.g. "Vintage Lamp Token".
- "suggestedTokenSymbol": 3-6 char ticker, e.g. "VLAMP".
- "suggestedTokenDescription": A 1-sentence marketing blurb for token metadata."""


class AnalyzeRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    prompt: str | None = None


class AnalyzeResponse(BaseModel):
    raw_content: str


class ErrorResponse(BaseModel):
    error: str


def call_ollama(image_base64: str, mime_type: str, prompt: str) -> str | None:
    """Call Ollama vision API and return the model's text response."""
    try:
        img_data = base64.b64decode(image_base64)
    except Exception:
        return None

    with tempfile.NamedTemporaryFile(suffix=Path(mime_type.replace("/", ".")).suffix or ".jpg", delete=False) as f:
        f.write(img_data)
        img_path = f.name

    try:
        # Ollama /api/chat accepts multimodal messages
        body = {
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image_base64},
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            "stream": False,
        }
        req = urllib.request.Request(
            f"{OLLAMA_HOST.rstrip('/')}/api/chat",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
        msg = data.get("message", {})
        return msg.get("content", "").strip()
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode()
            print(f"Ollama error: {e.code} {err_body}")
        except Exception:
            pass
        return None
    except Exception as e:
        print(f"Ollama call failed: {e}")
        return None
    finally:
        try:
            os.unlink(img_path)
        except Exception:
            pass


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    """Analyze an image and return structured JSON string for listing suggestions."""
    prompt = request.prompt or PROMPT
    raw = call_ollama(request.image_base64, request.mime_type, prompt)
    if raw is None:
        raise HTTPException(status_code=502, detail="Model failed or image could not be processed.")
    return AnalyzeResponse(raw_content=raw)


@app.get("/health")
def health():
    """Health check."""
    try:
        req = urllib.request.Request(f"{OLLAMA_HOST.rstrip('/')}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        models = [m.get("name", "") for m in data.get("models", [])]
        if not any(OLLAMA_MODEL in m for m in models):
            return {"status": "warn", "message": f"Model {OLLAMA_MODEL} not found in Ollama"}
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
