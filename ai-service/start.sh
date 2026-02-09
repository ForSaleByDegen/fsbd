#!/bin/sh
# Start Ollama in background, wait for it, optionally pull model, then run API
ollama serve &
sleep 5
ollama pull llava:7b 2>/dev/null || true
exec python3 server.py
