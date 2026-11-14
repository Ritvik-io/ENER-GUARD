"""
SafeScout MINE-ENERGY - Rover Control & Safety Interlocks Router
Priority 0: Emergency Stop & Dead-Man Control Watchdog
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import json
import logging
from backend.app.schemas import RoverMoveCommand, EStopCommand
from backend.app.hardware.hardware_manager import hardware_manager

logger = logging.getLogger("safescout.control_router")
router = APIRouter(prefix="/api/control", tags=["Rover Control"])

@router.post("/move")
async def move_rover(cmd: RoverMoveCommand):
    """
    Dispatch movement velocity (vx, omega) to rover.
    Protected by dead-man watchdog: stops automatically after 500ms.
    """
    success = hardware_manager.send_movement(cmd.vx, cmd.omega, cmd.speed_pct)
    return {"status": "SUCCESS" if success else "FAILED", "command": cmd.dict()}

@router.post("/estop")
async def trigger_emergency_stop(cmd: EStopCommand = EStopCommand()):
    """
    Priority 0: Hard Emergency Stop.
    Immediately shuts down motor PWM, activates alarm relay, and latches stop state.
    """
    success = hardware_manager.trigger_estop()
    logger.warning("EMERGENCY STOP TRIGGERED VIA REST API!")
    return {"status": "EMERGENCY_STOP_ENGAGED", "success": success}

@router.post("/reset_estop")
async def reset_emergency_stop():
    """
    Operator clearance for Emergency Stop.
    Requires physical switch to be closed.
    """
    success = hardware_manager.reset_estop()
    return {"status": "ESTOP_RESET", "success": success}

@router.websocket("/ws")
async def websocket_control_endpoint(websocket: WebSocket):
    """
    Duplex WebSocket for real-time gamepad/joystick control.
    Enforces continuous dead-man heartbeat.
    """
    await websocket.accept()
    logger.info("Control WebSocket connected.")
    try:
        while True:
            msg_text = await websocket.receive_text()
            try:
                cmd_data = json.loads(msg_text)
                cmd_type = cmd_data.get("type", "MOVE")
                
                if cmd_type == "MOVE":
                    vx = float(cmd_data.get("vx", 0.0))
                    omega = float(cmd_data.get("omega", 0.0))
                    speed_pct = int(cmd_data.get("speed_pct", 60))
                    hardware_manager.send_movement(vx, omega, speed_pct)
                elif cmd_type == "ESTOP":
                    hardware_manager.trigger_estop()
                elif cmd_type == "RESET_ESTOP":
                    hardware_manager.reset_estop()
                    
                # Echo ack
                await websocket.send_text(json.dumps({"ack": True, "seq": cmd_data.get("seq", 0)}))
            except Exception as e:
                logger.error(f"Error handling control message: {e}")
    except WebSocketDisconnect:
        # Client disconnect: immediately halt rover for dead-man safety!
        hardware_manager.send_movement(0.0, 0.0, 0)
        logger.info("Control WebSocket disconnected. Rover halted.")

