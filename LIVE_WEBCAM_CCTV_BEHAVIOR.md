# Live Webcam & CCTV Behavior (Current)

This document describes the current runtime behavior from AI inference input (webcam/CCTV) to backend DB persistence and Live Compliance Dashboard rendering.

## 1) End-to-End Data Flow

1. AI service runs in `AI Componant/inference_api.py` on port 5001.
2. Webcam and CCTV workers detect objects and build rolling live windows.
3. Every completed window (default 30s) is POSTed to backend: `http://localhost:5000/api/inferences/live`.
4. Backend route `POST /api/inferences/live` stores live records in MongoDB `Inference`.
5. Live dashboard polls backend summary and inference data, then renders cards/charts.

## 2) Webcam Behavior

### Start/Stop/Feed/Logs Endpoints
- `POST /webcam/start`
- `POST /webcam/stop`
- `GET /webcam/feed` (multipart MJPEG stream)
- `GET /webcam/logs`

### Processing Model
- Capture worker reads local camera index `0`.
- Detection worker runs YOLO at ~1-second cadence on latest frame.
- Detection log keeps latest 20 entries in memory (`webcam_detection_log`).
- Feed worker also refreshes log entries for UI stream consistency.

### Live Window Aggregation
- Window length: `LIVE_WINDOW_SECONDS = 30`.
- Buffer: `webcam_live_buffer` accumulates per-frame detection records.
- At window close, payload is posted with:
  - `source_type: webcam`
  - `total_persons`, `total_violations`, `safety_score`, `severity`
  - frame-level aggregates

### Stop Behavior (Current)
- On stop, webcam now triggers a **final partial window flush** if data exists.
- This prevents short sessions from being dropped before DB save.

## 3) CCTV Behavior

### Start/Stop/Feed/Logs Endpoints
Primary routes:
- `POST /cctv/start`
- `POST /cctv/stop`
- `GET /cctv/feed`
- `GET /cctv/logs`

Compatibility aliases:
- `POST /cctv_start`
- `POST /cctv_stop`
- `GET /cctv_feed`
- `GET /cctv_detection_log`

### Capture Strategy
- First tries OpenCV capture (`cv2.VideoCapture(CCTV_URL)`).
- If OpenCV fails, falls back to HTTP MJPEG byte parsing and JPEG decode.
- HTTPS self-signed streams can use `CCTV_INSECURE_SSL=1`.

### Processing Model
- Detection worker runs ~1-second cadence on latest frame.
- In-memory detection log (`cctv_detection_log`) capped to latest 20 entries.
- Feed worker also updates logs once per second for stream/log alignment.

### Live Window Aggregation
- Same 30-second rolling window model as webcam.
- Posts payload to backend with `source_type: cctv`.

### Stop Behavior (Current)
- On stop, CCTV now triggers a **final partial window flush** if data exists.
- This addresses the prior short-session data loss pattern.

## 4) Backend DB Persistence Behavior

### API Surface
Routes mounted under `/api/inferences`:
- `POST /live` (save live window)
- `GET /summary` (last 15-minute summary)
- `GET /hourly` (per-hour report)
- `GET /range` (date range report)
- `GET /export/csv`

### Save Logic
`saveLiveWindow` currently:
- Validates `source_type` in `{webcam, cctv}`.
- Uses `timestamp` if provided, otherwise `new Date()`.
- Saves to `Inference`:
  - `source_type`, `zone_id`, `timestamp`, `total_persons`, `total_violations`
  - `processing_time_ms = 0`, `model_version = live-window`, `camera_id = null`
- Optional `violation_details` are inserted into `Violation` if provided.

### Important Current Detail
- AI payload sends `window_start/window_end` and `frames`.
- `Inference` schema does **not** define these fields.
- With Mongoose default strict mode, undefined fields are not persisted.
- So DB currently stores window-level totals, not full frame/window metadata.

## 5) Live Dashboard Behavior

Dashboard component: `frontend/src/pages/LiveComplianceDashboard/index.jsx`

### Data Fetching
- Summary poll every 15s via `GET /api/inferences/summary?since=<now-15m>`.
- Window chart data poll every 30s via `GET /api/inferences` and filters to `source_type in [webcam, cctv]`.

### Rendering Rules
- Live status shown as online if `last_updated` is within 60 seconds.
- Last 12 live records are graphed (violations over time).
- Safety score computation caps violations to persons per record.
- Empty frames are treated as fully compliant in score calculations.

## 6) Why CCTV Could Show Stream/Logs But No Dashboard Update (Previously)

Previous behavior:
- Session stopped before a full 30s window ended.
- Stop path cleared live buffer immediately.
- Aggregator then had no records to post.
- Result: dashboard/log stream looked active, but DB got no live window row.

Current behavior:
- Stop no longer wipes buffer before aggregation flush.
- Final partial window is posted, so short runs can appear in DB/dashboard.

## 7) Operational Notes

- `[mjpeg] overread` logs are decoder warnings from MJPEG streams; they do not always mean DB save failure.
- If dashboard remains stale, check for AI-side post failures:
  - `⚠️ Failed to post live window to backend`
  - `⚠️ [CCTV] Failed to post live window to backend`
- Ensure backend is reachable at configured `LIVE_INFER_BACKEND_URL`.

## 8) Relevant Files

- `AI Componant/inference_api.py`
- `backend/routes/liveInferenceRoutes.js`
- `backend/controllers/liveInferenceController.js`
- `backend/models/Inference.js`
- `frontend/src/services/api.js`
- `frontend/src/pages/LiveComplianceDashboard/index.jsx`
