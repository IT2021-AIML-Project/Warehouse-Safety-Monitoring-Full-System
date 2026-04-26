# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile for Hugging Face Spaces – PPE Detection AI Inference API
# ─────────────────────────────────────────────────────────────────────────────
# Hugging Face Spaces Docker SDK expects the app to listen on port 7860.
# Base image: Python 3.10 slim (small footprint, fast build).
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.10-slim

# ── System dependencies required by OpenCV (headless) ────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ── Create a non-root user (Hugging Face requirement) ────────────────────────
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# ── Set working directory ────────────────────────────────────────────────────
WORKDIR /home/user/app

# ── Copy requirements first (Docker layer caching) ───────────────────────────
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy application code and model weights ──────────────────────────────────
COPY --chown=user:user inference_api.py .
COPY --chown=user:user best.pt .

# ── Create uploads directory for video processing ────────────────────────────
RUN mkdir -p /home/user/app/uploads

# ── Expose Hugging Face Spaces default port ──────────────────────────────────
EXPOSE 7860

# ── Environment variables ────────────────────────────────────────────────────
# Hugging Face Spaces requires port 7860
ENV PORT=7860
# Backend URL – set this in Hugging Face Space settings → Variables
ENV LIVE_INFER_BACKEND_URL="http://localhost:5000/api/inferences/live"

# ── Start the Flask inference API ────────────────────────────────────────────
CMD ["python", "inference_api.py"]
