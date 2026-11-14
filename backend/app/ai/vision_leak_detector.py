"""
SafeScout MINE-ENERGY - Computer Vision Pipeline Inspection Subsystem
Uses OpenCV for image anomaly identification:
  - Visible water/moisture leakage detection (HSV wet-specular thresholding)
  - Active drip/spray detection
  - Pipeline corrosion/fracture anomaly segmentation
IMPORTANT:
Clearly distinguishes rule-based heuristic CV detection from trained machine-learning models.
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path
import time

class VisionLeakDetector:
    def __init__(self):
        self.last_frame_gray: Optional[np.ndarray] = None
        self.model_loaded = False
        self.inference_engine_name = "Rule-Based Computer Vision (OpenCV Heuristics)"

    def analyze_image(self, image_np: np.ndarray) -> Dict[str, Any]:
        """
        Analyze camera image frame for visible moisture, pipeline spray, or surface puddles.
        """
        if image_np is None or image_np.size == 0:
            return {
                "detected": False,
                "fault_type": "NONE",
                "confidence": 0.0,
                "detection_method": "RULE_BASED",
                "boxes": [],
                "summary": "Invalid or empty image frame"
            }

        height, width = image_np.shape[:2]
        hsv = cv2.cvtColor(image_np, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)

        # 1. Moisture & Water Puddle Masking (Specular reflection + dark puddle saturation)
        # In mine tunnels, wet floor/pipe surfaces have high specular value with lower saturation
        lower_wet = np.array([0, 0, 180])
        upper_wet = np.array([180, 50, 255])
        specular_mask = cv2.inRange(hsv, lower_wet, upper_wet)

        # 2. Rust & Corrosion Color Masking (Orange/Brown Hue range: 5 to 25)
        lower_rust = np.array([10, 80, 60])
        upper_rust = np.array([25, 255, 200])
        rust_mask = cv2.inRange(hsv, lower_rust, upper_rust)

        # 3. Active Drip / Spray Motion Detection (Frame Differencing)
        motion_score = 0.0
        if self.last_frame_gray is not None and self.last_frame_gray.shape == gray.shape:
            frame_diff = cv2.absdiff(self.last_frame_gray, gray)
            motion_thresh = cv2.threshold(frame_diff, 25, 255, cv2.THRESH_BINARY)[1]
            motion_score = float(np.sum(motion_thresh > 0) / (width * height))
        self.last_frame_gray = gray.copy()

        # Find contours of wet/specular regions
        contours, _ = cv2.findContours(specular_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_boxes = []
        total_defect_area = 0

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 300: # Filter small noise
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = float(w) / max(1, h)
                bounding_boxes.append({
                    "x": int(x), "y": int(y), "w": int(w), "h": int(h),
                    "area_px": int(area), "type": "MOISTURE_OR_WATER_SPRAY"
                })
                total_defect_area += area

        area_pct = round((total_defect_area / (width * height)) * 100.0, 2)
        rust_area_pct = round((np.sum(rust_mask > 0) / (width * height)) * 100.0, 2)

        # Decision Logic
        detected = False
        fault_type = "NORMAL"
        confidence = 0.0
        summary = "No visible pipeline abnormalities detected."

        if motion_score > 0.015 and len(bounding_boxes) > 0:
            detected = True
            fault_type = "WATER_LEAK"
            confidence = round(min(0.88, 0.50 + motion_score * 10.0), 2)
            summary = f"Active spray / dripping detected with motion score {round(motion_score, 3)}."
        elif area_pct > 2.5:
            detected = True
            fault_type = "SUSPECTED_WATER_POOLING"
            confidence = round(min(0.80, 0.45 + (area_pct / 20.0)), 2)
            summary = f"Reflective moisture accumulation ({area_pct}% of surface area) observed."
        elif rust_area_pct > 5.0:
            detected = True
            fault_type = "SURFACE_CORROSION"
            confidence = round(min(0.75, 0.40 + (rust_area_pct / 15.0)), 2)
            summary = f"Localized iron oxidation/corrosion ({rust_area_pct}% area) on pipe exterior."

        return {
            "detected": detected,
            "fault_type": fault_type,
            "confidence": confidence,
            "detection_method": "RULE_BASED (OpenCV Heuristics)",
            "bounding_boxes": bounding_boxes,
            "defect_area_pct": area_pct,
            "rust_area_pct": rust_area_pct,
            "motion_score": round(motion_score, 4),
            "summary": summary,
            "timestamp": time.time()
        }

vision_detector = VisionLeakDetector()

