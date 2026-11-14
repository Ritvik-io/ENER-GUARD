"""
SafeScout MINE-ENERGY - Telemetry Router & WebSocket Broadcast
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
from backend.app.hardware.hardware_manager import hardware_manager

logger = logging.getLogger("safescout.telemetry_router")
router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])

@router.get("/live")
async def get_live_telemetry():
    """Retrieve current unified sensor telemetry state."""
    return hardware_manager.get_telemetry()

@router.websocket("/ws")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    WebSocket streaming 10 Hz telemetry to frontend dashboards.
    Includes stale-data indicator and explicit simulation badge.
    """
    await websocket.accept()
    logger.info("Client connected to telemetry WebSocket.")
    try:
        while True:
            data = hardware_manager.get_telemetry()
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(0.1) # 10 Hz rate
    except WebSocketDisconnect:
        logger.info("Client disconnected from telemetry WebSocket.")
    except Exception as e:
        logger.error(f"WebSocket telemetry error: {e}")

