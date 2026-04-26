import os
import io
import json
import time
import uuid
import base64
import threading
import numpy as np
import cv2
import urllib.request
import ssl
from datetime import datetime
from flask import Flask, request, jsonify, Response, send_file
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

# ─── Upload folder for processed videos ──────────────────────────────────────
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Load YOLO Model (project-local only) ────────────────────────────────────
PROJECT_DIR = os.path.dirname(__file__)
MODEL_CANDIDATES = [
    os.path.join(PROJECT_DIR, 'best.pt'),
    os.path.join(PROJECT_DIR, 'models', 'best.pt'),
    os.path.join(PROJECT_DIR, 'runs', 'detect', 'ppe_detection_yolov8s', 'train', 'weights', 'best.pt'),
]
MODEL_PATH = next((p for p in MODEL_CANDIDATES if os.path.exists(p)), MODEL_CANDIDATES[-1])
model = None
MIN_CONFIDENCE = 0.55
VIOLATION_CLASSES = ['no-helmet', 'no-vest', 'no-mask', 'no-gloves', 'no-safety-boots']
VIOLATION_MIN_CONFIDENCE = 0.65
LIVE_WINDOW_SECONDS = 30
LIVE_INFER_BACKEND_URL = os.environ.get(
    'LIVE_INFER_BACKEND_URL',
    'http://localhost:5000/api/inferences/live'
)


def _normalize_for_match(label: str) -> str:
    """Remove separators so we can match labels like 'NO-Safety Vest' reliably."""
    return ''.join(ch for ch in str(label).lower() if ch.isalnum())


def canonicalize_class(label: str) -> str:
    """
    Map the model's raw class names to canonical app classes:
    person, helmet, no-helmet, vest, no-vest
    """
    n = _normalize_for_match(label)

    # Person
    if n == 'person':
        return 'person'

    # Helmet / Hardhat
    if 'hardhat' in n or 'helmet' in n:
        if 'no' in n:
            return 'no-helmet'
        return 'helmet'

    # Vest / Safety Vest
    if 'safetyvest' in n or n == 'vest':
        if 'no' in n:
            return 'no-vest'
        return 'vest'

    # Unknown class: keep raw (lowercase) so it can still be rendered
    return str(label).lower()


def load_model():
    global model
    try:
        from ultralytics import YOLO
        model = YOLO(MODEL_PATH)
        print(f"✅ Model loaded from {MODEL_PATH}")
        print(f"   Model class names: {model.names}")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        model = None


# ─── Colors for bounding boxes (BGR for OpenCV) ───────────────────────────────
CLASS_COLORS = {
    'person':    (255, 144, 30),
    'helmet':    (0, 200, 0),
    'no-helmet': (0, 0, 255),
    'vest':      (0, 200, 0),
    'no-vest':   (0, 0, 255),
}


# ─── IoU helper for person-PPE spatial association ────────────────────────────
def iou_overlap(boxA, boxB, threshold=0.2):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    inter_area = max(0, xB - xA) * max(0, yB - yA)
    if inter_area == 0:
        return False
    boxA_area = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    if boxA_area == 0:
        return False
    return (inter_area / float(boxA_area)) > threshold


# ─── Extract training metrics from YOLO checkpoint ────────────────────────────
def _get_model_meta():
    if model is None:
        return {}
    ckpt = getattr(model, 'ckpt', {}) or {}
    names = model.names if hasattr(model, 'names') else {}
    train_metrics = ckpt.get('train_metrics', {})
    train_args = ckpt.get('train_args', {})
    precision = train_metrics.get('metrics/precision(B)')
    recall    = train_metrics.get('metrics/recall(B)')
    mAP50     = train_metrics.get('metrics/mAP50(B)')
    mAP50_95  = train_metrics.get('metrics/mAP50-95(B)')
    f1 = (
        round(2 * precision * recall / (precision + recall), 4)
        if precision and recall and (precision + recall) > 0
        else None
    )
    return {
        'modelPath':   MODEL_PATH,
        'framework':   'YOLOv8 (ultralytics)',
        'classes':     names,
        'numClasses':  len(names),
        'trainMetrics': {
            'precision': round(precision, 4) if precision is not None else None,
            'recall':    round(recall, 4)    if recall    is not None else None,
            'mAP50':     round(mAP50, 4)     if mAP50     is not None else None,
            'mAP50_95':  round(mAP50_95, 4)  if mAP50_95  is not None else None,
            'f1':        f1,
        },
        'trainArgs': {
            'epochs':    train_args.get('epochs'),
            'imgsz':     train_args.get('imgsz'),
            'batch':     train_args.get('batch'),
            'optimizer': train_args.get('optimizer'),
        },
    }


# ─── Draw bounding boxes on BGR image ────────────────────────────────────────
def draw_filtered_boxes(img_bgr, detections):
    annotated = img_bgr.copy()
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        cls_name = det['class_name']
        conf = det['confidence']
        color = CLASS_COLORS.get(cls_name.lower(), (200, 200, 200))
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        label = f"{cls_name} {conf:.2f}"
        font_scale, thickness = 0.55, 2
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
        cv2.putText(annotated, label, (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness)
    return annotated


# ─── Associate PPE detections to each person via IoU ─────────────────────────
def associate_ppe_to_persons(detections):
    persons     = [d for d in detections if d['class_name'].lower() == 'person']
    helmets     = [d for d in detections if d['class_name'].lower() == 'helmet']
    no_helmets  = [d for d in detections if d['class_name'].lower() == 'no-helmet']
    vests       = [d for d in detections if d['class_name'].lower() == 'vest']
    no_vests    = [d for d in detections if d['class_name'].lower() == 'no-vest']

    for p in persons:
        pb = p['bbox']
        p['has_helmet']    = any(iou_overlap(pb, h['bbox']) for h in helmets)
        p['has_no_helmet'] = any(iou_overlap(pb, h['bbox']) for h in no_helmets)
        p['has_vest']      = any(iou_overlap(pb, v['bbox']) for v in vests)
        p['has_no_vest']   = any(iou_overlap(pb, v['bbox']) for v in no_vests)
        p['compliant']     = p['has_helmet'] and p['has_vest']
    return detections


# ─── Resolve YOLO class IDs for a set of allowed class names ─────────────────
def get_class_ids(allowed_classes):
    if not allowed_classes or model is None:
        return None
    allowed = {c.lower() for c in allowed_classes}
    ids = []
    for k, v in model.names.items():
        canon = canonicalize_class(str(v)).lower()
        if canon in allowed:
            ids.append(k)
    return ids if ids else None


# ─────────────────────────────────────────────────────────────────────────────
# STANDARD ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':       'ok',
        'model_loaded': model is not None,
        'model_path':   MODEL_PATH,
        'classes':      dict(model.names) if model else {},
    })


@app.route('/model-info', methods=['GET'])
def model_info():
    return jsonify(_get_model_meta())


@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400

    allowed_classes = None
    raw = request.form.get('allowed_classes')
    if raw:
        try:
            allowed_classes = set(json.loads(raw))
        except Exception:
            pass

    try:
        image_bytes = file.read()
        image  = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_np = np.array(image)

        class_ids = get_class_ids(allowed_classes)
        t_start   = time.perf_counter()
        results   = model(img_np, conf=0.55, classes=class_ids, verbose=False)
        t_end     = time.perf_counter()
        speed     = results[0].speed

        all_detections = []
        for box in results[0].boxes:
            cls_id     = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox       = box.xyxy[0].tolist()
            raw_class_name = model.names.get(cls_id, f'class_{cls_id}')
            class_name = canonicalize_class(raw_class_name)
            all_detections.append({
                'class_id':   cls_id,
                'class_name': class_name,
                'confidence': round(confidence, 4),
                'bbox':       [int(b) for b in bbox],
            })

        # Filter detections by confidence thresholds
        filtered_detections = []
        for det in all_detections:
            conf = det['confidence']
            if conf >= 0.55:
                filtered_detections.append(det)
        all_detections = filtered_detections

        if allowed_classes:
            filtered = [d for d in all_detections if d['class_name'].lower() in allowed_classes]
        else:
            filtered = all_detections

        filtered = associate_ppe_to_persons(filtered)

        class_counts = {}
        for d in filtered:
            class_counts[d['class_name']] = class_counts.get(d['class_name'], 0) + 1

        violations = [d for d in filtered if d['class_name'].lower() in ('no-helmet', 'no-vest')]
        compliant  = [d for d in filtered if d['class_name'].lower() not in ('no-helmet', 'no-vest')]

        img_bgr       = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        annotated_bgr = draw_filtered_boxes(img_bgr, filtered)
        annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
        buf = io.BytesIO()
        Image.fromarray(annotated_rgb).save(buf, format='JPEG', quality=85)
        annotated_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

        return jsonify({
            'success':          True,
            'model_version':    'ppe_yolov8s_best',
            'processing_time_ms': int((t_end - t_start) * 1000),
            'image_size':       {'width': img_np.shape[1], 'height': img_np.shape[0]},
            'detections':       filtered,
            'total_detections': len(filtered),
            'violations':       violations,
            'compliant':        compliant,
            'summary': {
                'total':      len(filtered),
                'violations': len(violations),
                'compliant':  len(compliant),
                'classCounts': class_counts,
            },
            'inferenceTime': {
                'preprocess_ms':  round(speed.get('preprocess', 0), 2),
                'inference_ms':   round(speed.get('inference',  0), 2),
                'postprocess_ms': round(speed.get('postprocess', 0), 2),
                'total_ms':       round((t_end - t_start) * 1000, 2),
            },
            'annotated_image': annotated_b64,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predict-video', methods=['POST'])
def predict_video():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No video selected'}), 400

    allowed_classes = None
    raw = request.form.get('allowed_classes')
    if raw:
        try:
            allowed_classes = set(json.loads(raw))
        except Exception:
            pass

    input_path = os.path.join(UPLOAD_FOLDER, f"input_{uuid.uuid4().hex}.mp4")
    output_name = f"result_{uuid.uuid4().hex}.avi"
    output_path = os.path.join(UPLOAD_FOLDER, output_name)

    try:
        file.save(input_path)
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return jsonify({'error': 'Cannot open video file'}), 400

        fps    = cap.get(cv2.CAP_PROP_FPS) or 20.0
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Use a browser-friendly codec to avoid "video plays but blank" issues.
        # AVI/XVID is widely supported in Chromium on Windows.
        fourcc = cv2.VideoWriter_fourcc(*'XVID')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        if not out.isOpened():
            # Fallback to MJPG in AVI if XVID is not available.
            output_name = f"result_{uuid.uuid4().hex}.avi"
            output_path = os.path.join(UPLOAD_FOLDER, output_name)
            fourcc = cv2.VideoWriter_fourcc(*'MJPG')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        if not out.isOpened():
            # Final fallback to mp4v
            output_name = f"result_{uuid.uuid4().hex}.mp4"
            output_path = os.path.join(UPLOAD_FOLDER, output_name)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        if not out.isOpened():
            cap.release()
            return jsonify({'error': 'Video writer failed to initialize (no compatible codec found)'}), 500

        class_ids        = get_class_ids(allowed_classes)
        frames_processed = 0
        total_violations = 0
        total_detections = 0
        total_compliant  = 0
        total_infer_ms   = 0.0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            frame_t0 = time.perf_counter()
            results  = model(frame, conf=0.55, classes=class_ids, verbose=False)[0]
            frame_t1 = time.perf_counter()

            # Collect detections
            frame_detections = []
            for box in results.boxes:
                cls_id     = int(box.cls[0])
                confidence = float(box.conf[0])
                bbox       = box.xyxy[0].tolist()
                raw_class_name = model.names.get(cls_id, f'class_{cls_id}')
                class_name = canonicalize_class(raw_class_name)
                frame_detections.append({
                    'class_id':   cls_id,
                    'class_name': class_name,
                    'confidence': confidence,
                    'bbox':       [int(b) for b in bbox],
                })

            # Filter by confidence thresholds
            filtered_frame_detections = []
            for det in frame_detections:
                conf = det['confidence']
                if conf >= 0.55:
                    filtered_frame_detections.append(det)

            # Draw filtered boxes
            annotated = draw_filtered_boxes(frame, filtered_frame_detections)
            out.write(annotated)
            frames_processed += 1
            total_infer_ms += (frame_t1 - frame_t0) * 1000.0

            # Count filtered detections
            for det in filtered_frame_detections:
                cls_name = det['class_name'].lower()
                total_detections += 1
                if cls_name in ('no-helmet', 'no-vest'):
                    total_violations += 1
                else:
                    total_compliant += 1

        cap.release()
        out.release()

        return jsonify({
            'success':          True,
            'video_url':        f'/uploads/{output_name}',
            'frames_processed': frames_processed,
            'total_violations': total_violations,
            'total_detections': total_detections,
            'total_compliant':  total_compliant,
            'avg_inference_ms': round((total_infer_ms / frames_processed), 2) if frames_processed else 0.0,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        try:
            os.remove(input_path)
        except Exception:
            pass


@app.route('/uploads/<filename>')
def serve_upload(filename):
    path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
    return send_file(path)


# ─────────────────────────────────────────────────────────────────────────────
# LIVE WEBCAM  (laptop camera, index 0)
# Architecture: capture thread → shared frame buffer → detection thread + MJPEG generator
# ─────────────────────────────────────────────────────────────────────────────

WEBCAM_ACTIVE      = False
webcam_cap         = None
webcam_latest_frame = None
webcam_frame_lock  = threading.Lock()
webcam_detection_log = []
webcam_log_lock    = threading.Lock()
webcam_allowed_classes = None
webcam_last_feed_log_ts = 0.0
webcam_live_buffer = []
webcam_live_buffer_lock = threading.Lock()


def _build_log_entry(person_boxes, helmet_boxes, no_helmet_boxes, vest_boxes, no_vest_boxes):
    ts = datetime.now().strftime('%H:%M:%S')
    if not person_boxes:
        return {'id': str(time.time()), 'timestamp': ts,
                'message': f"{ts} - No person detected", 'category': 'normal'}
    msg        = f"{ts} - 👷 {len(person_boxes)} Person(s) | "
    is_violation = False
    for idx, pb in enumerate(person_boxes):
        has_h  = any(iou_overlap(pb, b) for b in helmet_boxes)
        no_h   = any(iou_overlap(pb, b) for b in no_helmet_boxes)
        has_v  = any(iou_overlap(pb, b) for b in vest_boxes)
        no_v   = any(iou_overlap(pb, b) for b in no_vest_boxes)
        msg   += f"P{idx + 1}: "
        if has_h:   msg += "✅ Helmet "
        elif no_h:  msg += "❌ No Helmet "; is_violation = True
        if has_v:   msg += "✅ Vest"
        elif no_v:  msg += "❌ No Vest";   is_violation = True
        if idx < len(person_boxes) - 1:
            msg += " | "
    return {'id': str(time.time()), 'timestamp': ts,
            'message': msg, 'category': 'violation' if is_violation else 'normal'}


def _extract_boxes(results):
    names   = model.names
    boxes   = results.boxes.xyxy.cpu().numpy()
    classes = results.boxes.cls.cpu().numpy().astype(int)

    person_boxes = []
    helmet_boxes = []
    no_helmet_boxes = []
    vest_boxes = []
    no_vest_boxes = []

    for i, c in enumerate(classes):
        bbox = boxes[i]
        raw_label = names[c]
        canon = canonicalize_class(str(raw_label)).lower()
        if canon == 'person':
            person_boxes.append(bbox)
        elif canon == 'helmet':
            helmet_boxes.append(bbox)
        elif canon == 'no-helmet':
            no_helmet_boxes.append(bbox)
        elif canon == 'vest':
            vest_boxes.append(bbox)
        elif canon == 'no-vest':
            no_vest_boxes.append(bbox)

    return person_boxes, helmet_boxes, no_helmet_boxes, vest_boxes, no_vest_boxes


def _extract_detection_records(results):
    """Extract normalized class + confidence records from one frame result."""
    if model is None or results is None or results.boxes is None:
        return []

    names = model.names
    classes = results.boxes.cls.cpu().numpy().astype(int)
    confidences = results.boxes.conf.cpu().numpy()

    records = []
    for i, cls_id in enumerate(classes):
        raw_label = names.get(int(cls_id), f'class_{int(cls_id)}')
        records.append({
            'class_name': canonicalize_class(str(raw_label)).lower(),
            'confidence': float(confidences[i]),
        })
    return records


def _severity_from_conf(confidence: float) -> str:
    if confidence >= 0.85:
        return 'high'
    if confidence >= 0.75:
        return 'medium'
    return 'low'


def webcam_capture_worker():
    global WEBCAM_ACTIVE, webcam_cap, webcam_latest_frame
    webcam_cap = cv2.VideoCapture(0)
    if not webcam_cap.isOpened():
        print('❌ Cannot open webcam (index 0)')
        WEBCAM_ACTIVE = False
        return
    print('📷 Webcam capture started')
    while WEBCAM_ACTIVE:
        ret, frame = webcam_cap.read()
        if ret:
            with webcam_frame_lock:
                webcam_latest_frame = frame.copy()
        time.sleep(0.033)
    webcam_cap.release()
    webcam_cap = None
    print('🛑 Webcam capture stopped')


def webcam_detection_worker():
    global webcam_detection_log, webcam_latest_frame, webcam_allowed_classes, webcam_live_buffer
    while WEBCAM_ACTIVE:
        if model is None:
            time.sleep(1)
            continue
        with webcam_frame_lock:
            frame = webcam_latest_frame.copy() if webcam_latest_frame is not None else None
        if frame is not None:
            try:
                class_ids = get_class_ids(webcam_allowed_classes)
                results   = model(frame, conf=MIN_CONFIDENCE, classes=class_ids, verbose=False)[0]

                # Accumulate detections for the rolling live aggregation window.
                frame_records = _extract_detection_records(results)
                with webcam_live_buffer_lock:
                    webcam_live_buffer.append(frame_records)

                persons, helmets, no_helmets, vests, no_vests = _extract_boxes(results)
                entry = _build_log_entry(persons, helmets, no_helmets, vests, no_vests)
                with webcam_log_lock:
                    webcam_detection_log.append(entry)
                    if len(webcam_detection_log) > 20:
                        webcam_detection_log.pop(0)
            except Exception as e:
                print(f'Webcam detection error: {e}')
        time.sleep(1)


def webcam_live_aggregate_worker():
    global webcam_live_buffer
    window_start_ts = time.time()

    while True:
        time.sleep(1)
        now_ts = time.time()
        should_flush_window = (now_ts - window_start_ts) >= LIVE_WINDOW_SECONDS
        should_flush_final = (not WEBCAM_ACTIVE) and (now_ts > window_start_ts)
        if not should_flush_window and not should_flush_final:
            if not WEBCAM_ACTIVE:
                break
            continue

        with webcam_live_buffer_lock:
            window_records = list(webcam_live_buffer)
            webcam_live_buffer = []

        window_end_ts = now_ts
        if not window_records:
            window_start_ts = window_end_ts
            if not WEBCAM_ACTIVE:
                break
            continue

        frame_data = []
        flat_records = []
        for frame_records in window_records:
            if not frame_records:
                continue
            flat_records.extend(frame_records)
            persons = sum(1 for r in frame_records if r['class_name'] == 'person')
            raw_violations = sum(1 for r in frame_records 
                                 if r['class_name'] in VIOLATION_CLASSES 
                                 and r['confidence'] >= VIOLATION_MIN_CONFIDENCE)
            violations = min(raw_violations, persons)
            if persons > 0:  # only include frames where someone was visible
                frame_data.append({"persons": persons, "violations": violations})

        total_persons = sum(f["persons"] for f in frame_data)
        total_violations = sum(f["violations"] for f in frame_data)

        if frame_data:
            frame_scores = []
            for f in frame_data:
                if f["persons"] > 0:
                    capped = min(f["violations"], f["persons"])
                    frame_scores.append(((f["persons"] - capped) / f["persons"]) * 100.0)
                else:
                    frame_scores.append(100.0)
            safety_score = round(sum(frame_scores) / len(frame_scores), 2)
        else:
            safety_score = 100.0

        qualifying_violations = [
            d for d in flat_records
            if d['class_name'] in VIOLATION_CLASSES and d['confidence'] >= VIOLATION_MIN_CONFIDENCE
        ]
        max_violation_conf = max((d['confidence'] for d in qualifying_violations), default=0.0)
        severity = _severity_from_conf(max_violation_conf)

        payload = {
            'source_type': 'webcam',
            'window_start': datetime.fromtimestamp(window_start_ts).isoformat(),
            'window_end': datetime.fromtimestamp(window_end_ts).isoformat(),
            'window_seconds': LIVE_WINDOW_SECONDS,
            'total_persons': total_persons,
            'total_violations': total_violations,
            'safety_score': safety_score,
            'severity': severity,
            'violation_classes': VIOLATION_CLASSES,
            'violation_confidence_threshold': VIOLATION_MIN_CONFIDENCE,
            'frames': frame_data,
            'frames_aggregated': len(frame_data),
        }

        try:
            req = urllib.request.Request(
                LIVE_INFER_BACKEND_URL,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                print(f"📤 Live window sent to backend ({resp.status})")
        except Exception as e:
            print(f"⚠️ Failed to post live window to backend: {e}")

        window_start_ts = window_end_ts
        if not WEBCAM_ACTIVE:
            break


def generate_webcam_frames():
    global webcam_last_feed_log_ts
    while WEBCAM_ACTIVE:
        with webcam_frame_lock:
            frame = webcam_latest_frame.copy() if webcam_latest_frame is not None else None
        if frame is None or model is None:
            time.sleep(0.1)
            continue
        try:
            class_ids = get_class_ids(webcam_allowed_classes)
            results   = model(frame, conf=MIN_CONFIDENCE, classes=class_ids, verbose=False)[0]
            annotated = results.plot()

            now_ts = time.time()
            if now_ts - webcam_last_feed_log_ts >= 1.0:
                persons, helmets, no_helmets, vests, no_vests = _extract_boxes(results)
                entry = _build_log_entry(persons, helmets, no_helmets, vests, no_vests)
                with webcam_log_lock:
                    webcam_detection_log.append(entry)
                    if len(webcam_detection_log) > 20:
                        webcam_detection_log.pop(0)
                webcam_last_feed_log_ts = now_ts

            ret, buf  = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'
                       + buf.tobytes() + b'\r\n')
        except Exception as e:
            print(f'Webcam frame error: {e}')
        time.sleep(0.05)


@app.route('/webcam/start', methods=['POST'])
def webcam_start():
    global WEBCAM_ACTIVE, webcam_detection_log, webcam_allowed_classes, webcam_latest_frame, webcam_live_buffer
    if WEBCAM_ACTIVE:
        return jsonify({'status': 'already_running'})
    data = request.get_json(silent=True) or {}
    allowed = data.get('allowed_classes')
    webcam_allowed_classes = set(allowed) if allowed else None
    WEBCAM_ACTIVE      = True
    webcam_detection_log = []
    webcam_latest_frame  = None
    webcam_live_buffer   = []
    threading.Thread(target=webcam_capture_worker,   daemon=True).start()
    threading.Thread(target=webcam_detection_worker, daemon=True).start()
    threading.Thread(target=webcam_live_aggregate_worker, daemon=True).start()
    print(f'🚀 Webcam started | classes: {webcam_allowed_classes or "all"}')
    return jsonify({'status': 'started',
                    'allowed_classes': list(webcam_allowed_classes) if webcam_allowed_classes else 'all'})


@app.route('/webcam/stop', methods=['POST'])
def webcam_stop():
    global WEBCAM_ACTIVE
    WEBCAM_ACTIVE = False
    print('🛑 Webcam stop requested')
    return jsonify({'status': 'stopped'})


@app.route('/webcam/feed')
def webcam_feed():
    if not WEBCAM_ACTIVE:
        return jsonify({'error': 'Webcam not active. Call /webcam/start first.'}), 400
    return Response(generate_webcam_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/webcam/logs')
def webcam_logs():
    with webcam_log_lock:
        logs = list(reversed(webcam_detection_log))
    return jsonify({'logs': logs, 'active': WEBCAM_ACTIVE})


# ─────────────────────────────────────────────────────────────────────────────
# CCTV / IP CAMERA STREAM
# Supports RTSP, HTTP (IP Webcam app), and any OpenCV-compatible URL
# ─────────────────────────────────────────────────────────────────────────────

CCTV_ACTIVE        = False
cctv_cap           = None
cctv_latest_frame  = None
cctv_frame_lock    = threading.Lock()
cctv_detection_log = []
cctv_log_lock      = threading.Lock()
cctv_allowed_classes = None
CCTV_URL           = ''
cctv_last_feed_log_ts = 0.0
cctv_live_buffer      = []
cctv_live_buffer_lock = threading.Lock()


def cctv_capture_worker():
    global CCTV_ACTIVE, cctv_cap, cctv_latest_frame, CCTV_URL
    cctv_cap = cv2.VideoCapture(CCTV_URL)
    if cctv_cap is not None and cctv_cap.isOpened():
        print(f'📡 CCTV capture started (OpenCV): {CCTV_URL}')
        while CCTV_ACTIVE:
            ret, frame = cctv_cap.read()
            if not ret:
                print('[CCTV] Frame read failed, reconnecting...')
                try:
                    cctv_cap.release()
                except Exception:
                    pass
                time.sleep(2)
                if not CCTV_ACTIVE:
                    break
                cctv_cap = cv2.VideoCapture(CCTV_URL)
                if not cctv_cap.isOpened():
                    print('[CCTV] Reconnect failed (OpenCV)')
                    CCTV_ACTIVE = False
                    break
                continue
            with cctv_frame_lock:
                cctv_latest_frame = frame.copy()
            time.sleep(0.033)
        if cctv_cap:
            try:
                cctv_cap.release()
            except Exception:
                pass
        cctv_cap = None
        print('🛑 CCTV capture stopped (OpenCV)')
        return

    # OpenCV can't open this URL (common for HTTP MJPEG streams).
    # Fallback: parse HTTP MJPEG byte stream and decode JPEG frames.
    print(f'❌ Cannot open CCTV via OpenCV, trying MJPEG parsing: {CCTV_URL}')

    # If you ever use HTTPS with self-signed certs, set CCTV_INSECURE_SSL=1 in env.
    insecure = os.environ.get('CCTV_INSECURE_SSL', '0').strip() == '1'
    ssl_ctx = ssl._create_unverified_context() if insecure else None

    try:
        retry = 0
        while CCTV_ACTIVE:
            try:
                req = urllib.request.Request(CCTV_URL, headers={'User-Agent': 'Mozilla/5.0'})
                resp = urllib.request.urlopen(req, timeout=10, context=ssl_ctx) if ssl_ctx else urllib.request.urlopen(req, timeout=10)
                retry = 0
                print('📥 CCTV stream opened (HTTP) - parsing MJPEG...')

                buffer = b''
                while CCTV_ACTIVE:
                    chunk = resp.read(4096)
                    if not chunk:
                        time.sleep(0.2)
                        continue
                    buffer += chunk

                    # Extract all complete JPEG frames from the buffer
                    while True:
                        start = buffer.find(b'\xff\xd8')  # SOI
                        end = buffer.find(b'\xff\xd9')    # EOI
                        if start == -1 or end == -1 or end <= start:
                            break

                        jpg = buffer[start:end + 2]
                        buffer = buffer[end + 2:]

                        arr = np.frombuffer(jpg, dtype=np.uint8)
                        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                        if frame is not None:
                            with cctv_frame_lock:
                                cctv_latest_frame = frame.copy()
                # if CCTV_ACTIVE flipped to False, exit cleanly
                break

            except Exception as e:
                retry += 1
                print(f'[CCTV] MJPEG parsing failed (retry {retry}): {e}')
                time.sleep(2)
                if retry >= 10:
                    # After many failures, stop to avoid infinite reconnect loops.
                    CCTV_ACTIVE = False
                    break

    except Exception as e:
        print(f'[CCTV] MJPEG parser fatal error: {e}')

    print('🛑 CCTV capture stopped (MJPEG parser)')


def cctv_detection_worker():
    global cctv_detection_log, cctv_latest_frame, cctv_allowed_classes, cctv_live_buffer
    while CCTV_ACTIVE:
        if model is None:
            time.sleep(1)
            continue
        with cctv_frame_lock:
            frame = cctv_latest_frame.copy() if cctv_latest_frame is not None else None
        if frame is not None:
            try:
                class_ids = get_class_ids(cctv_allowed_classes)
                results   = model(frame, conf=MIN_CONFIDENCE, classes=class_ids, verbose=False)[0]

                # Accumulate detections for the rolling live aggregation window.
                frame_records = _extract_detection_records(results)
                with cctv_live_buffer_lock:
                    cctv_live_buffer.append(frame_records)

                persons, helmets, no_helmets, vests, no_vests = _extract_boxes(results)
                entry = _build_log_entry(persons, helmets, no_helmets, vests, no_vests)
                with cctv_log_lock:
                    cctv_detection_log.append(entry)
                    if len(cctv_detection_log) > 20:
                        cctv_detection_log.pop(0)
            except Exception as e:
                print(f'[CCTV] Detection error: {e}')
        time.sleep(1)


def cctv_live_aggregate_worker():
    global cctv_live_buffer
    window_start_ts = time.time()

    while True:
        time.sleep(1)
        now_ts = time.time()
        should_flush_window = (now_ts - window_start_ts) >= LIVE_WINDOW_SECONDS
        should_flush_final = (not CCTV_ACTIVE) and (now_ts > window_start_ts)
        if not should_flush_window and not should_flush_final:
            if not CCTV_ACTIVE:
                break
            continue

        with cctv_live_buffer_lock:
            window_records = list(cctv_live_buffer)
            cctv_live_buffer = []

        window_end_ts = now_ts
        if not window_records:
            window_start_ts = window_end_ts
            if not CCTV_ACTIVE:
                break
            continue

        frame_data = []
        flat_records = []
        for frame_records in window_records:
            if not frame_records:
                continue
            flat_records.extend(frame_records)
            persons = sum(1 for r in frame_records if r['class_name'] == 'person')
            raw_violations = sum(1 for r in frame_records
                                 if r['class_name'] in VIOLATION_CLASSES
                                 and r['confidence'] >= VIOLATION_MIN_CONFIDENCE)
            violations = min(raw_violations, persons)
            if persons > 0:  # only include frames where someone was visible
                frame_data.append({'persons': persons, 'violations': violations})

        total_persons = sum(f['persons'] for f in frame_data)
        total_violations = sum(f['violations'] for f in frame_data)

        if frame_data:
            frame_scores = []
            for f in frame_data:
                if f['persons'] > 0:
                    capped = min(f['violations'], f['persons'])
                    frame_scores.append(((f['persons'] - capped) / f['persons']) * 100.0)
                else:
                    frame_scores.append(100.0)
            safety_score = round(sum(frame_scores) / len(frame_scores), 2)
        else:
            safety_score = 100.0

        qualifying_violations = [
            d for d in flat_records
            if d['class_name'] in VIOLATION_CLASSES and d['confidence'] >= VIOLATION_MIN_CONFIDENCE
        ]
        max_violation_conf = max((d['confidence'] for d in qualifying_violations), default=0.0)
        severity = _severity_from_conf(max_violation_conf)

        payload = {
            'source_type': 'cctv',
            'window_start': datetime.fromtimestamp(window_start_ts).isoformat(),
            'window_end': datetime.fromtimestamp(window_end_ts).isoformat(),
            'window_seconds': LIVE_WINDOW_SECONDS,
            'total_persons': total_persons,
            'total_violations': total_violations,
            'safety_score': safety_score,
            'severity': severity,
            'violation_classes': VIOLATION_CLASSES,
            'violation_confidence_threshold': VIOLATION_MIN_CONFIDENCE,
            'frames': frame_data,
            'frames_aggregated': len(frame_data),
        }

        try:
            req = urllib.request.Request(
                LIVE_INFER_BACKEND_URL,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                print(f'📤 [CCTV] Live window sent to backend ({resp.status})')
        except Exception as e:
            print(f'⚠️ [CCTV] Failed to post live window to backend: {e}')

        window_start_ts = window_end_ts
        if not CCTV_ACTIVE:
            break


def generate_cctv_frames():
    global cctv_last_feed_log_ts
    while CCTV_ACTIVE:
        with cctv_frame_lock:
            frame = cctv_latest_frame.copy() if cctv_latest_frame is not None else None
        if frame is None or model is None:
            time.sleep(0.1)
            continue
        try:
            class_ids = get_class_ids(cctv_allowed_classes)
            results   = model(frame, conf=MIN_CONFIDENCE, classes=class_ids, verbose=False)[0]
            annotated = results.plot()

            # Ensure the website's "Real-time Detection Log" reflects what was
            # just processed for the feed (the capture/detection worker may
            # miss frames for some HTTP MJPEG streams).
            now_ts = time.time()
            if now_ts - cctv_last_feed_log_ts >= 1.0:
                persons, helmets, no_helmets, vests, no_vests = _extract_boxes(results)
                entry = _build_log_entry(persons, helmets, no_helmets, vests, no_vests)
                with cctv_log_lock:
                    cctv_detection_log.append(entry)
                    if len(cctv_detection_log) > 20:
                        cctv_detection_log.pop(0)
                cctv_last_feed_log_ts = now_ts

            ret, buf  = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'
                       + buf.tobytes() + b'\r\n')
        except Exception as e:
            print(f'[CCTV] Frame error: {e}')
        time.sleep(0.05)


@app.route('/cctv/start', methods=['POST'])
def cctv_start():
    global CCTV_ACTIVE, cctv_detection_log, cctv_allowed_classes, cctv_latest_frame, CCTV_URL, cctv_live_buffer
    if CCTV_ACTIVE:
        return jsonify({'status': 'already_running'})
    data = request.get_json(silent=True) or {}
    url  = data.get('url', '').strip()
    if not url:
        return jsonify({'error': 'No CCTV URL provided'}), 400
    allowed = data.get('allowed_classes')
    cctv_allowed_classes = set(allowed) if allowed else None
    CCTV_URL             = url
    CCTV_ACTIVE          = True
    cctv_detection_log   = []
    cctv_latest_frame    = None
    cctv_live_buffer     = []
    threading.Thread(target=cctv_capture_worker,        daemon=True).start()
    threading.Thread(target=cctv_detection_worker,      daemon=True).start()
    threading.Thread(target=cctv_live_aggregate_worker, daemon=True).start()
    print(f'🚀 CCTV started: {url} | classes: {cctv_allowed_classes or "all"}')
    return jsonify({'status': 'started', 'url': url})


@app.route('/cctv/stop', methods=['POST'])
def cctv_stop():
    global CCTV_ACTIVE
    CCTV_ACTIVE = False
    print('🛑 CCTV stop requested')
    return jsonify({'status': 'stopped'})


@app.route('/cctv/feed')
def cctv_feed():
    if not CCTV_ACTIVE:
        return jsonify({'error': 'CCTV not active. Call /cctv/start first.'}), 400
    return Response(generate_cctv_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/cctv/logs')
def cctv_logs():
    with cctv_log_lock:
        logs = list(reversed(cctv_detection_log))
    return jsonify({'logs': logs, 'active': CCTV_ACTIVE})


# ─────────────────────────────────────────────────────────────────────────────
# Compatibility aliases (based on README_LiveCCTV_HTTP.md)
# These routes match the naming used in that README.
# ─────────────────────────────────────────────────────────────────────────────

@app.route('/cctv_start', methods=['POST'])
def cctv_start_alias():
    global cctv_allowed_classes, CCTV_URL, CCTV_ACTIVE, cctv_detection_log, cctv_latest_frame, cctv_live_buffer
    data = request.get_json(silent=True) or {}
    # Allow both 'url' and 'camera_url'
    data['url'] = data.get('url') or data.get('camera_url') or ''
    # Reuse the existing handler by calling its logic directly.
    # Keep response shape consistent with README: {status: ...}
    # Note: our existing /cctv/start supports optional allowed_classes too.
    if CCTV_ACTIVE:
        return jsonify({'status': 'already_running'})
    url = str(data.get('url', '')).strip()
    if not url:
        return jsonify({'error': 'No CCTV URL provided'}), 400
    allowed = data.get('allowed_classes')
    cctv_allowed_classes = set(allowed) if allowed else None
    CCTV_URL = url
    CCTV_ACTIVE = True
    cctv_detection_log = []
    cctv_latest_frame = None
    cctv_live_buffer = []
    threading.Thread(target=cctv_capture_worker,        daemon=True).start()
    threading.Thread(target=cctv_detection_worker,      daemon=True).start()
    threading.Thread(target=cctv_live_aggregate_worker, daemon=True).start()
    print(f'🚀 CCTV started (alias): {url} | classes: {cctv_allowed_classes or "all"}')
    return jsonify({'status': 'started'})


@app.route('/cctv_stop', methods=['POST'])
def cctv_stop_alias():
    return cctv_stop()


@app.route('/cctv_feed')
def cctv_feed_alias():
    return cctv_feed()


@app.route('/cctv_detection_log')
def cctv_detection_log_alias():
    data = cctv_logs().get_json()
    # README expects: { "logs": [ ... ] }
    return jsonify({'logs': data.get('logs', []), 'active': data.get('active', False)})


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    load_model()
    print('🚀 AI Inference API starting on port 5001')
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
