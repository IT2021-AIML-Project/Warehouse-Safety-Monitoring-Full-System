import os
import io
import json
import time
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

# ─── Load YOLO Model ────────────────────────────────────────
# Use the custom-trained PPE detection model (Person, Helmet, No-Helmet, Vest, No-Vest)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'runs', 'detect', 'ppe_detection_yolov8s', 'train', 'weights', 'best.pt')
model = None

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


# Colors for bounding box drawing (RGB format - PIL uses RGB)
CLASS_COLORS = {
    'person':    (30, 144, 255),    # dodger blue
    'helmet':    (0, 200, 0),       # green
    'no-helmet': (255, 0, 0),       # red
    'vest':      (0, 200, 0),       # green
    'no-vest':   (255, 0, 0),       # red
}

def draw_filtered_boxes(img_np, detections):
    """Draw bounding boxes only for the given (filtered) detections."""
    annotated = img_np.copy()
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        cls_name = det['class_name']
        conf = det['confidence']
        color = CLASS_COLORS.get(cls_name.lower(), (200, 200, 200))

        # Draw box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        # Draw label
        label = f"{cls_name} {conf:.2f}"
        font_scale = 0.6
        thickness = 2
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
        cv2.putText(annotated, label, (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), thickness)

    return annotated


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'model_path': MODEL_PATH,
        'classes': dict(model.names) if model else {}
    })

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 503

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400

    # Parse allowed classes from request (sent by backend based on zone PPE items)
    allowed_classes = None
    allowed_classes_raw = request.form.get('allowed_classes', None)
    if allowed_classes_raw:
        try:
            allowed_classes = set(json.loads(allowed_classes_raw))
            print(f"🎯 Filtering to classes: {allowed_classes}")
        except Exception as e:
            print(f"⚠️ Failed to parse allowed_classes: {e}")

    try:
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_np = np.array(image)

        # Run inference with lower confidence for better PPE detection
        start_time = time.time()
        results = model(img_np, conf=0.15)
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Parse ALL detections using model's own class names
        all_detections = []
        result = results[0]

        for box in result.boxes:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            # Use the model's actual class name mapping
            class_name = model.names.get(cls_id, f'class_{cls_id}')

            all_detections.append({
                'class_id': cls_id,
                'class_name': class_name,
                'confidence': round(confidence, 4),
                'bbox': [int(b) for b in bbox]
            })

        print(f"📊 Total detections (all classes): {len(all_detections)}")
        for d in all_detections:
            print(f"   → {d['class_name']} ({d['confidence']:.2f})")

        # Filter detections to only include allowed classes (if specified)
        if allowed_classes:
            filtered_detections = [
                d for d in all_detections
                if d['class_name'].lower() in allowed_classes
            ]
            print(f"🔍 After filtering: {len(filtered_detections)} detections")
        else:
            filtered_detections = all_detections

        # Generate annotated image with ONLY the filtered detections
        # Convert to BGR for OpenCV drawing, then back to RGB for PIL
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        annotated_bgr = draw_filtered_boxes(img_bgr, filtered_detections)
        annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
        annotated_pil = Image.fromarray(annotated_rgb)

        # Convert annotated image to base64
        buffer = io.BytesIO()
        annotated_pil.save(buffer, format='JPEG', quality=85)
        annotated_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        response = {
            'success': True,
            'model_version': 'ppe_yolov8s_best',
            'processing_time_ms': processing_time_ms,
            'image_size': {
                'width': img_np.shape[1],
                'height': img_np.shape[0]
            },
            'detections': filtered_detections,
            'total_detections': len(filtered_detections),
            'annotated_image': annotated_base64
        }

        return jsonify(response)

    except Exception as e:
        print(f"Inference error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    load_model()
    print("🚀 AI Inference API starting on port 5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
