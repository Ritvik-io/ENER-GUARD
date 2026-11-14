"""
SafeScout MINE-ENERGY - ESP32-CAM MJPEG Video & Snapshot Proxy
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import asyncio
import cv2
import httpx
import numpy as np
import time
from pathlib import Path
from backend.app.config import settings, SNAPSHOTS_DIR
from backend.app.ai.vision_leak_detector import vision_detector

router = APIRouter(prefix="/api/camera", tags=["Camera"])

async def generate_simulated_stream():
    """Generates synthetic camera frames when ESP32-CAM is offline or in simulation mode."""
    frame_idx = 0
    while True:
        frame_idx += 1
        # Create an industrial inspection view (dark tunnel with industrial pipelines)
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img[:] = (35, 38, 42) # Dark background

        # Draw simulated pipeline (large pipe across center)
        cv2.rectangle(img, (0, 180), (640, 300), (90, 100, 110), -1)
        cv2.rectangle(img, (0, 180), (640, 190), (120, 130, 140), -1) # Highlight
        cv2.line(img, (280, 180), (280, 300), (60, 70, 80), 4) # Pipe Flange
        cv2.line(img, (300, 180), (300, 300), (60, 70, 80), 4)

        # Draw smaller water line above
        cv2.rectangle(img, (0, 80), (640, 120), (50, 90, 140), -1)

        # Draw simulated moisture or puddle
        if (frame_idx // 30) % 2 == 0:
            # Active simulated water drip / specular puddle
            cv2.ellipse(img, (290, 380), (70, 25), 0, 0, 360, (180, 200, 220), -1)
            cv2.circle(img, (290, 260 + (frame_idx % 20) * 5), 3, (200, 220, 255), -1)

        # HUD Overlay
        cv2.putText(img, "SAFESCOUT MINE-ENERGY - ROVER CAM [SIMULATED]", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 220, 255), 2)
        cv2.putText(img, time.strftime("%Y-%m-%d %H:%M:%S UTC"), (20, 450),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        cv2.putText(img, f"FRAME: {frame_idx} | RES: 640x480", (430, 450),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Encode to JPEG
        _, jpeg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        await asyncio.sleep(0.066) # ~15 FPS

@router.get("/stream")
async def get_camera_stream():
    """Proxy real ESP32-CAM MJPEG stream or fallback to simulated stream."""
    try:
        # Check if live camera responds
        async with httpx.AsyncClient(timeout=1.0) as client:
            resp = await client.get(settings.ESP32_CAM_STREAM_URL)
            if resp.status_code == 200:
                async def stream_proxy():
                    async with httpx.AsyncClient() as c:
                        async with c.stream("GET", settings.ESP32_CAM_STREAM_URL) as r:
                            async for chunk in r.aiter_bytes():
                                yield chunk
                return StreamingResponse(stream_proxy(), media_type="multipart/x-mixed-replace; boundary=frame")
    except Exception:
        pass

    # Fallback to simulated industrial video stream
    return StreamingResponse(
        generate_simulated_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.get("/capture")
async def capture_snapshot():
    """Capture single JPEG frame from camera."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(settings.ESP32_CAM_CAPTURE_URL)
            if resp.status_code == 200:
                return Response(content=resp.content, media_type="image/jpeg")
    except Exception:
        pass

    # Generate synthetic snapshot
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (35, 38, 42)
    cv2.rectangle(img, (0, 180), (640, 300), (90, 100, 110), -1)
    cv2.line(img, (290, 180), (290, 300), (60, 70, 80), 4)
    cv2.putText(img, "SAFESCOUT SNAPSHOT [SIMULATED]", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(img, time.strftime("%Y-%m-%d %H:%M:%S"), (20, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    _, jpeg = cv2.imencode('.jpg', img)
    return Response(content=jpeg.tobytes(), media_type="image/jpeg")

@router.post("/save_snapshot")
async def save_inspection_snapshot():
    """
    Save camera snapshot to disk, execute OpenCV leak/anomaly vision analysis, and return findings.
    """
    filename = f"snapshot_{int(time.time())}.jpg"
    filepath = SNAPSHOTS_DIR / filename

    # Grab frame
    resp = await capture_snapshot()
    img_bytes = resp.body
    with open(filepath, "wb") as f:
        f.write(img_bytes)

    # Decode and run OpenCV analysis
    nparr = np.frombuffer(img_bytes, np.uint8)
    img_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    cv_analysis = vision_detector.analyze_image(img_cv)

    return {
        "status": "SAVED",
        "filename": filename,
        "filepath": f"/snapshots/{filename}",
        "analysis": cv_analysis
    }

