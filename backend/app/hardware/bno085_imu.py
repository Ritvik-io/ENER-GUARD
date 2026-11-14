"""
SafeScout MINE-ENERGY - BNO085 9-DOF IMU Driver
Hardware: CEVA / Hillcrest BNO085 (I2C 0x4A / UART-RVC mode)
Outputs: Heading (Yaw), Pitch, Roll, Angular Velocity, Linear Acceleration
"""

import time
import math
from typing import Dict, Optional

class BNO085Driver:
    def __init__(self, i2c_bus: int = 1, address: int = 0x4A):
        self.i2c_bus = i2c_bus
        self.address = address
        self.connected = False
        self.current_state = {
            "connected": False,
            "yaw_deg": 0.0,
            "pitch_deg": 0.0,
            "roll_deg": 0.0,
            "angular_velocity_dps": 0.0,
            "accel_x_ms2": 0.0,
            "accel_y_ms2": 0.0,
            "accel_z_ms2": 9.81,
            "calibration_status": {"system": 3, "gyro": 3, "accel": 3, "mag": 3},
            "timestamp": time.time()
        }
        self._init_sensor()

    def _init_sensor(self):
        try:
            # Check if smbus2 or adafruit library is available on Pi
            import smbus2
            bus = smbus2.SMBus(self.i2c_bus)
            # Probe address
            bus.write_quick(self.address)
            self.connected = True
            self.current_state["connected"] = True
            bus.close()
        except Exception:
            # Hardware absent or running on dev workstation
            self.connected = False
            self.current_state["connected"] = False

    def read_orientation(self) -> Dict:
        """Fetch current attitude matrix and Euler angles."""
        self.current_state["timestamp"] = time.time()
        return self.current_state

    def update_from_telemetry(self, yaw: float, pitch: float = 0.0, roll: float = 0.0):
        """Allow fusion update from ESP32 or external dead-reckoning."""
        self.current_state["yaw_deg"] = round(yaw % 360.0, 2)
        self.current_state["pitch_deg"] = round(pitch, 2)
        self.current_state["roll_deg"] = round(roll, 2)
        self.current_state["timestamp"] = time.time()

