"""
SafeScout MINE-ENERGY - LiDAR Mapping & 2D SLAM Router
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
import asyncio
import json
import logging
import cv2
import numpy as np
from backend.app.hardware.hardware_manager import hardware_manager
from backend.app.robotics.slam_engine import slam_engine

logger = logging.getLogger("safescout.lidar_router")
router = APIRouter(prefix="/api/lidar", tags=["LiDAR Mapping"])

@router.get("/scan")
async def get_latest_scan():
    """Retrieve raw 360-degree point cloud from LD19 LiDAR."""
    return hardware_manager.get_lidar_scan()

@router.get("/map")
async def get_occupancy_grid():
    """Retrieve processed 2D SLAM occupancy grid map."""
    scan = hardware_manager.get_lidar_scan()
    telem = hardware_manager.get_telemetry()
    status = telem.get("status", {})
    
    # Process scan into SLAM
    points = scan.get("points", [])
    x = status.get("rover_x", 0.0)
    y = status.get("rover_y", 0.0)
    heading = status.get("rover_heading_deg", 0.0)
    
    if points:
        slam_engine.process_scan(points, x, y, heading)
        
    return slam_engine.get_map_state()

@router.post("/clear")
async def clear_slam_map():
    """Reset occupancy grid map and robot trajectory."""
    slam_engine.clear_map()
    return {"status": "MAP_CLEARED"}

@router.get("/export/png")
async def export_map_png():
    """Export current 2D occupancy grid as high-resolution PNG image."""
    prob = 1.0 - (1.0 / (1.0 + np.exp(slam_engine.grid)))
    img = np.full(prob.shape, 128, dtype=np.uint8)
    img[prob > 0.65] = 0    # Obstacles
    img[prob < 0.35] = 255  # Free space

    # Draw trajectory trail
    for i in range(len(slam_engine.trajectory) - 1):
        p1 = slam_engine.world_to_grid(*slam_engine.trajectory[i])
        p2 = slam_engine.world_to_grid(*slam_engine.trajectory[i + 1])
        cv2.line(img, p1, p2, (200), 1)

    # Encode to PNG
    success, encoded = cv2.imencode(".png", img)
    if not success:
        return Response(content=b"", media_type="image/png")
    return Response(content=encoded.tobytes(), media_type="image/png")

@router.websocket("/ws")
async def websocket_lidar_endpoint(websocket: WebSocket):
    """WebSocket streaming 360-degree point clouds and SLAM map updates."""
    await websocket.accept()
    logger.info("LiDAR WebSocket client connected.")
    try:
        while True:
            scan = hardware_manager.get_lidar_scan()
            telem = hardware_manager.get_telemetry()
            status = telem.get("status", {})
            
            points = scan.get("points", [])
            x = status.get("rover_x", 0.0)
            y = status.get("rover_y", 0.0)
            heading = status.get("rover_heading_deg", 0.0)
            
            if points:
                slam_engine.process_scan(points, x, y, heading)
                
            payload = {
                "scan": scan,
                "map": slam_engine.get_map_state()
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(0.1) # 10 Hz rate
    except WebSocketDisconnect:
        logger.info("LiDAR WebSocket disconnected.")
    except Exception as e:
        logger.error(f"LiDAR WS error: {e}")

