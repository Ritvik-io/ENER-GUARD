"""
SafeScout MINE-ENERGY - ESP32 Serial Communication Manager
Handles bi-directional communication, JSON framing, dead-man watchdog commands, and connection health.
"""

import json
import logging
import threading
import time
from typing import Callable, Optional, Dict, Any
import serial
from backend.app.config import settings

logger = logging.getLogger("safescout.esp32_serial")

class ESP32SerialManager:
    def __init__(self, port: Optional[str] = None, baud_rate: int = 115200):
        self.port = port or settings.ESP32_SERIAL_PORT
        self.baud_rate = baud_rate
        self.serial_conn: Optional[serial.Serial] = None
        self.is_connected = False
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.last_telemetry: Optional[Dict[str, Any]] = None
        self.last_packet_time: float = 0.0
        self.telemetry_callbacks: list[Callable[[Dict[str, Any]], None]] = []
        self.lock = threading.Lock()
        self.command_seq = 0

    def register_callback(self, callback: Callable[[Dict[str, Any]], None]):
        self.telemetry_callbacks.append(callback)

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._communication_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.close()
            except Exception:
                pass
        self.is_connected = False

    def _communication_loop(self):
        while self.running:
            try:
                if not self.serial_conn or not self.serial_conn.is_open:
                    logger.info(f"Attempting connection to ESP32 on {self.port} @ {self.baud_rate}...")
                    self.serial_conn = serial.Serial(self.port, self.baud_rate, timeout=1.0)
                    self.is_connected = True
                    logger.info(f"Connected to ESP32 on {self.port}")

                line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    if line.startswith('{') and line.endswith('}'):
                        try:
                            data = json.loads(line)
                            self.last_telemetry = data
                            self.last_packet_time = time.time()
                            self.is_connected = True
                            
                            # Dispatch to listeners
                            for cb in self.telemetry_callbacks:
                                try:
                                    cb(data)
                                except Exception as e:
                                    logger.error(f"Callback error: {e}")
                        except json.JSONDecodeError:
                            pass
            except (serial.SerialException, OSError) as e:
                self.is_connected = False
                if self.serial_conn:
                    try:
                        self.serial_conn.close()
                    except Exception:
                        pass
                    self.serial_conn = None
                time.sleep(2.0)
            except Exception as e:
                logger.error(f"Unexpected serial loop error: {e}")
                time.sleep(1.0)

    def send_command(self, cmd_dict: Dict[str, Any]) -> bool:
        """Send JSON command to ESP32 over serial."""
        if not self.serial_conn or not self.serial_conn.is_open:
            return False
        try:
            with self.lock:
                msg = json.dumps(cmd_dict) + "\n"
                self.serial_conn.write(msg.encode('utf-8'))
                self.serial_conn.flush()
                return True
        except Exception as e:
            logger.error(f"Failed to send serial command: {e}")
            return False

    def send_movement(self, vx: float, omega: float, speed_pct: int = 60) -> bool:
        """
        Convert velocity (vx, omega) into differential left/right PWM [-255, 255].
        Subject to dead-man watchdog timer on ESP32!
        """
        max_pwm = int((speed_pct / 100.0) * 255)
        # Differential steering kinematics
        left = vx * max_pwm - (omega * max_pwm * 0.5)
        right = vx * max_pwm + (omega * max_pwm * 0.5)
        
        left_pwm = int(max(-255, min(255, left)))
        right_pwm = int(max(-255, min(255, right)))

        self.command_seq += 1
        return self.send_command({
            "cmd": "MOVE",
            "vx": round(vx, 2),
            "omega": round(omega, 2),
            "left_pwm": left_pwm,
            "right_pwm": right_pwm,
            "seq": self.command_seq
        })

    def emergency_stop(self) -> bool:
        """Send priority-0 Emergency Stop."""
        return self.send_command({
            "cmd": "ESTOP",
            "source": "BACKEND_API"
        })

    def reset_estop(self) -> bool:
        """Send reset E-Stop command."""
        return self.send_command({
            "cmd": "RESET_ESTOP",
            "auth_token": "OPERATOR_CONFIRMED"
        })

    def is_stale(self) -> bool:
        """Check if telemetry data has timed out (> 1.5 seconds)."""
        return (time.time() - self.last_packet_time) > 1.5

