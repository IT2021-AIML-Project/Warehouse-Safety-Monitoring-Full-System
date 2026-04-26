---
title: PPE Detection AI - Warehouse Safety
emoji: 🦺
colorFrom: blue
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# 🦺 PPE Detection AI - Warehouse Safety Monitoring System

AI-powered Personal Protective Equipment (PPE) detection API using YOLOv8.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check & model status |
| `/model-info` | GET | Model metadata & training metrics |
| `/predict` | POST | Detect PPE in a single image |
| `/predict-video` | POST | Detect PPE in a video file |

## Usage Example

```bash
# Health check
curl https://YOUR-SPACE.hf.space/health

# Image prediction
curl -X POST -F "image=@test.jpg" https://YOUR-SPACE.hf.space/predict
```
