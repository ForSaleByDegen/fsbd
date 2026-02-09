# FSBD In-House AI Service (Snap to Compare)

This service replaces Gemini for image analysis. Run it on a machine with a GPU and share the URL with the FSBD team so they can point their app at it.

## Requirements

- **GPU**: NVIDIA GPU with 8GB+ VRAM (e.g. RTX 3070, T4, A10)
- **Ollama**: [Install Ollama](https://ollama.ai) on your machine
- **Python 3.10+** (for the API wrapper)

## Quick Start (for the buddy running this)

### 1. Install Ollama and pull the vision model

```bash
# Install Ollama: https://ollama.ai
# Then pull the vision model (one-time, ~4GB download):
ollama pull llava:7b
```

### 2. Install and run the API server

```bash
cd ai-service
pip install -r requirements.txt
python server.py
```

The server listens on `http://0.0.0.0:8080` by default.

### 3. Expose the server

Your FSBD buddy needs to reach this URL from the internet. Options:

- **Same network**: If they're on your LAN, give them `http://YOUR_IP:8080`
- **ngrok**: `ngrok http 8080` → gives you a public URL like `https://abc123.ngrok.io`
- **Cloud VM**: Run this on a GPU instance (Lambda Labs, RunPod, etc.) and use the instance's public IP + port 8080
- **Reverse proxy**: Put nginx/caddy in front, use HTTPS and a domain

### 4. Send the URL to FSBD

Give them the base URL (e.g. `https://ai.yourdomain.com` or `http://YOUR_IP:8080`). They will set `INHOUSE_AI_URL` in their Vercel env and update their API to call your service instead of Gemini.

## API Contract

**POST** `/api/analyze`

Request:

```json
{
  "image_base64": "base64-encoded image data",
  "mime_type": "image/jpeg",
  "prompt": "You are helping a user list an item..."
}
```

Response (success):

```json
{
  "raw_content": "{\"suggestedTitle\":\"...\", \"itemDescription\":\"...\", ...}"
}
```

Response (error):

```json
{
  "error": "Model failed or image could not be processed."
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port the server listens on |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API URL (if Ollama runs elsewhere) |
| `OLLAMA_MODEL` | `llava:7b` | Vision model name |

## Optional: Run with Docker

```bash
# Requires nvidia-docker. Ollama runs inside the container.
docker build -t fsbd-ai-service .
docker run --gpus all -p 8080:8080 fsbd-ai-service
```

See `Dockerfile` for details.

## Troubleshooting

- **"Connection refused" to Ollama**: Make sure `ollama serve` is running (it usually starts automatically after install).
- **Out of memory**: Use a smaller model: `ollama pull llava:7b-v1.5-q4_0` (quantized, less VRAM).
- **Slow first request**: The model loads on first use; subsequent requests are faster.
