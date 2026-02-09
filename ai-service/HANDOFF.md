# Handoff: Run the FSBD AI Service

**For:** Your buddy with GPU  
**From:** FSBD team  
**Goal:** Run our in-house vision AI so we don't depend on Gemini anymore.

## How to share this

Zip the entire `ai-service` folder and send it to your buddy (email, Slack, etc.). Or share the repo and point them to the `ai-service` folder. Everything they need is inside.

## What Your Buddy Needs

1. A machine with an **NVIDIA GPU** (8GB+ VRAM — RTX 3070, T4, A10, etc.)
2. **Ollama** installed: https://ollama.ai

## Steps (5 minutes)

### 1. Copy this folder

Zip or clone the `ai-service` folder and send it to your buddy. It contains:
- `server.py` — API that wraps Ollama
- `requirements.txt` — Python deps
- `README.md` — full docs

### 2. On the GPU machine, run:

**Option A — Python (recommended for quick setup):**

```bash
# Install Ollama (if not already): https://ollama.ai
ollama pull llava:7b

cd ai-service
pip install -r requirements.txt
python server.py
```

**Option B — Docker (needs nvidia-docker):**

```bash
cd ai-service
docker build -t fsbd-ai .
docker run --gpus all -p 8080:8080 fsbd-ai
```

The server listens on port 8080.

### 3. Expose the URL

Your buddy needs to give us a URL we can call from the internet:

- **Option A — Same machine / LAN:** `http://THEIR_IP:8080`
- **Option B — ngrok:** Run `ngrok http 8080`, send us the HTTPS URL
- **Option C — Cloud GPU (RunPod, Lambda, etc.):** Use the instance IP + port 8080

### 4. Send us the URL

Example: `https://ai.example.com` or `http://1.2.3.4:8080`

We will set `INHOUSE_AI_URL` in our Vercel env and switch our app to use your service instead of Gemini.

## Quick Test

```bash
# Health check
curl http://localhost:8080/health

# Test analyze (needs a real base64 image; replace IMAGE_B64)
curl -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_base64":"IMAGE_B64","mime_type":"image/jpeg"}'
```

## If Something Breaks

- **Ollama not found:** Run `ollama serve` in another terminal
- **Out of memory:** Use `ollama pull llava:7b-v1.5-q4_0` (smaller model) and set `OLLAMA_MODEL=llava:7b-v1.5-q4_0`
- **Port in use:** Set `PORT=9000` (or any free port) before `python server.py`
