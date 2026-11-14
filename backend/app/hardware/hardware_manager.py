"""
SafeScout MINE-ENERGY - Hardware Orchestrator & Manager
Coordinates physical serial streams (ESP32 & LD19 LiDAR) or simulated test provider.
"""

import asyncio
import logging
import threading
import time
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.app.hardware.esp32_serial import ESP32SerialManager
from backend.app.hardware.ld19_lidar import LD19PacketParser
from backend.app.hardware.bno085_imu import BNO085Driver
from backend.app.hardware.mock_hardware import simulator_instance

logger = logging.getLogger("safescout.hardware")

class HardwareManager:
    def __init__(self):
        self.simulation_mode = settings.FORCE_SIMULATION_MODE
        self.esp32 = ESP32SerialManager()
        self.lidar_parser = LD19PacketParser()
        self.imu = BNO085Driver()
        self.latest_telemetry: Dict[str, Any] = {}
        self.latest_scan: Dict[str, Any] = {}
        self.running = False
        self.worker_thread: Optional[threading.Thread] = None

    def start(self):
        self.running = True
        # Register serial callback
        self.esp32.register_callback(self._on_esp32_telemetry)
        self.esp32.start()

        # Start background polling & simulation loop
        self.worker_thread = threading.Thread(target=self._hardware_loop, daemon=True)
        self.worker_thread.start()
        logger.info("Hardware Manager initialized.")

    def stop(self):
        self.running = False
        self.esp32.stop()

    def _on_esp32_telemetry(self, data: Dict[str, Any]):
        """Called when actual hardware sends a serial packet."""
        data["is_simulated"] = False
        self.latest_telemetry = data
        self.simulation_mode = False

    def _hardware_loop(self):
        while self.running:
            try:
                # Check if real hardware is connected and active
                if self.esp32.is_connected and not self.esp32.is_stale():
                    # Real hardware active
                    self.simulation_mode = False
                else:
                    # No active real hardware or forced simulation
                    self.simulation_mode = True
                    sim_telem = simulator_instance.generate_telemetry_packet()
                    self.latest_telemetry = sim_telem

                # Generate or forward LiDAR scan
                if self.lidar_parser.last_scan:
                    self.latest_scan = self.lidar_parser.last_scan
                else:
                    self.latest_scan = simulator_instance.generate_lidar_scan()

            except Exception as e:
                logger.error(f"Error in hardware manager loop: {e}")

            time.sleep(0.1) # 10 Hz cycle

    def set_simulation_mode(self, enabled: bool):
        self.simulation_mode = enabled
        if enabled:
            logger.info("Switched to explicit SIMULATION MODE")
        else:
            logger.info("Switched to LIVE HARDWARE MODE")

    def send_movement(self, vx: float, omega: float, speed_pct: int = 60) -> bool:
        if self.simulation_mode:
            simulator_instance.set_movement(vx, omega)
            return True
        return self.esp32.send_movement(vx, omega, speed_pct)

    def trigger_estop(self) -> bool:
        simulator_instance.trigger_estop(True)
        if self.esp32.is_connected:
            return self.esp32.emergency_stop()
        return True

    def reset_estop(self) -> bool:
        simulator_instance.trigger_estop(False)
        if self.esp32.is_connected:
            return self.esp32.reset_estop()
        return True

    def get_telemetry(self) -> Dict[str, Any]:
        if not self.latest_telemetry:
            return simulator_instance.generate_telemetry_packet()
        return self.latest_telemetry

    def get_lidar_scan(self) -> Dict[str, Any]:
        if not self.latest_scan:
            return simulator_instance.generate_lidar_scan()
        return self.latest_scan

hardware_manager = HardwareManager()

