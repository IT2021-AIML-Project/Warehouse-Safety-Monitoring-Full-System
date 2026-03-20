from ultralytics import YOLO
import os

base = os.path.dirname(os.path.abspath(__file__))

m1 = YOLO(os.path.join(base, 'yolo26n.pt'))
print("=== yolo26n.pt classes ===")
print(m1.names)

m2 = YOLO(os.path.join(base, 'yolov8s.pt'))
print("=== yolov8s.pt classes ===")
print(m2.names)
