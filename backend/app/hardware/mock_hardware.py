"""
SafeScout MINE-ENERGY - Hardware Simulation Mode Provider
Provides realistic synthetic physics, LiDAR point clouds, and multi-sensor telemetry.
CRITICAL SAFETY & INTEGRITY REQUIREMENT:
All simulated data packets are explicitly labeled with `is_simulated: true` and `simulation_badge: 'SIMULATION MODE'`.
The application NEVER presents simulated data as live hardware measurements!
"""

import math
import random
import time
from typing import Dict, Any, List

class HardwareSimulator:
    def __init__(self):
        self.is_simulated = True
        self.sim_time = 0.0
        self.heartbeat = 0
        
        # Rover Simulated State
        self.x = 0.0
        self.y = 0.0
        self.heading_deg = 0.0
        self.speed_ms = 0.0
        self.battery_voltage = 12.4
        self.battery_pct = 92
        self.estop = False
        self.mode = "manual"
        
        # Environmental Base Values
        self.ambient_temp = 24.5
        self.ambient_humidity = 64.0
        self.mq2_ppm_base = 320.0
        self.mq8_ppm_base = 45.0
        
        # Pipeline Pressures
        self.air_pressure_bar = 7.10
        self.water_pressure_bar = 4.20
        self.water_flow_lmin = 16.5
        self.cumulative_water_liters = 3450.0
        
        # Ventilation (Pitot-Static)
        self.diff_pressure_pa = 52.4  # Gives ~9.3 m/s air velocity
        
        # 40 kHz Acoustic Ultrasound
        self.ultrasonic_db = 38.0
        self.simulated_leak_active = False

    def trigger_estop(self, state: bool = True):
        self.estop = state

    def set_movement(self, vx: float, omega: float):
        if self.estop:
            self.speed_ms = 0.0
            return
        self.speed_ms = vx
        self.heading_deg = (self.heading_deg + (omega * 5.0)) % 360.0
        rad = math.radians(self.heading_deg)
        self.x += vx * 0.1 * math.cos(rad)
        self.y += vx * 0.1 * math.sin(rad)

    def generate_telemetry_packet(self) -> Dict[str, Any]:
        """Generate 10 Hz telemetry with realistic subtle sensor noise."""
        self.sim_time += 0.1
        self.heartbeat += 1
        
        # Battery slow discharge
        self.battery_voltage = max(10.2, self.battery_voltage - 0.00005)
        self.battery_pct = int(((self.battery_voltage - 9.6) / 3.0) * 100)

        # Micro-fluctuations
        noise_dp = random.uniform(-1.2, 1.2)
        cur_dp = max(0.0, self.diff_pressure_pa + noise_dp)
        air_velocity = round(math.sqrt((2.0 * cur_dp) / 1.204), 2)

        # Acoustic leak oscillation
        leak_boost = 32.0 if self.simulated_leak_active else (25.0 if math.sin(self.sim_time * 0.2) > 0.85 else 0.0)
        ultrasound_db = round(self.ultrasonic_db + leak_boost + random.uniform(-1.5, 1.5), 1)
        suspected_leak = ultrasound_db > 62.0

        # Gas fluctuations
        gas_noise = random.uniform(-15.0, 15.0)
        mq2_ppm = round(max(200.0, self.mq2_ppm_base + (80.0 if suspected_leak else 0.0) + gas_noise), 1)
        mq8_ppm = round(max(20.0, self.mq8_ppm_base + random.uniform(-3.0, 3.0)), 1)

        # Water cumulative
        self.cumulative_water_liters += (self.water_flow_lmin / 600.0)

        return {
            "version": "2.1.0",
            "device_id": "SIMULATOR_MINE_ROVER_01",
            "is_simulated": True,
            "simulation_badge": "SIMULATION MODE",
            "timestamp": int(time.time() * 1000),
            "heartbeat": self.heartbeat,
            "status": {
                "online": True,
                "mode": self.mode,
                "emergency_stop": self.estop,
                "battery_voltage_v": round(self.battery_voltage, 2),
                "battery_current_a": round(1.2 + abs(self.speed_ms) * 2.5, 2),
                "battery_percentage": self.battery_pct,
                "temperature_mcu_c": round(39.5 + random.uniform(-0.3, 0.3), 1),
                "wifi_rssi_dbm": -58,
                "watchdog_ok": True,
                "rover_x": round(self.x, 3),
                "rover_y": round(self.y, 3),
                "rover_heading_deg": round(self.heading_deg, 1),
                "speed_ms": round(self.speed_ms, 2)
            },
            "environmental": {
                "mq2_raw_adc": int(mq2_ppm * 3.4),
                "mq2_ppm_combustible": mq2_ppm,
                "mq2_calibrated": True,
                "mq8_raw_adc": int(mq8_ppm * 8.2),
                "mq8_ppm_hydrogen": mq8_ppm,
                "mq8_calibrated": True,
                "dht11_temp_c": round(self.ambient_temp + random.uniform(-0.2, 0.2), 1),
                "dht11_humidity_pct": round(self.ambient_humidity + random.uniform(-0.5, 0.5), 1),
                "gas_alarm_state": "WARNING" if mq2_ppm > 1000.0 else "NORMAL"
            },
            "ventilation": {
                "sdp31_diff_pressure_pa": round(cur_dp, 2),
                "airway_temp_c": round(self.ambient_temp, 1),
                "calculated_air_velocity_ms": air_velocity,
                "pitot_clogged_warning": False
            },
            "acoustic_ultrasonic": {
                "ultrasonic_40khz_raw": int(ultrasound_db * 35),
                "ultrasonic_db_spl": ultrasound_db,
                "suspected_leak": suspected_leak,
                "peak_frequency_hz": 40120 if suspected_leak else 39800
            },
            "pipelines": {
                "compressed_air_pressure_bar": round(self.air_pressure_bar - (0.4 if suspected_leak else 0.0) + random.uniform(-0.05, 0.05), 2),
                "water_pipeline_pressure_bar": round(self.water_pressure_bar + random.uniform(-0.04, 0.04), 2),
                "water_flow_rate_lmin": round(self.water_flow_lmin + random.uniform(-0.3, 0.3), 2),
                "water_cumulative_liters": round(self.cumulative_water_liters, 2),
                "water_temp_c": 21.4
            },
            "navigation_sensors": {
                "hc_sr04_distance_cm": round(max(20.0, 180.0 + random.uniform(-5.0, 5.0)), 1),
                "left_wheel_ticks": self.heartbeat * 12,
                "right_wheel_ticks": self.heartbeat * 12,
                "estimated_speed_ms": round(abs(self.speed_ms), 2)
            },
            "alarms": {
                "estop_active": self.estop,
                "combustible_gas_critical": mq2_ppm > 2500.0,
                "hydrogen_gas_critical": mq8_ppm > 1000.0,
                "air_leak_detected": suspected_leak,
                "water_leak_detected": False,
                "relay_beacon_active": self.estop or (mq2_ppm > 2500.0)
            }
        }

    def generate_lidar_scan(self) -> Dict[str, Any]:
        """Generate realistic 360-degree LiDAR scan inside an underground mine drift (tunnel)."""
        points = []
        tunnel_width = 3.6  # 3.6 meters wide
        num_points = 360

        for i in range(num_points):
            angle_deg = float(i)
            rad = math.radians(angle_deg)
            cos_a = math.cos(rad)
            sin_a = math.sin(rad)

            # Raycast against a simulated corridor with side walls at y = +/- 1.8m
            # and obstacles/pipes at intervals
            dist = 6.0 # default horizon
            if abs(sin_a) > 0.05:
                # Distance to side walls
                wall_y = (tunnel_width / 2.0) if sin_a > 0 else (-tunnel_width / 2.0)
                d_wall = wall_y / sin_a
                if d_wall > 0:
                    dist = min(dist, d_wall)

            # Add end bulkhead / obstacle
            if abs(cos_a) > 0.1:
                end_x = 5.0 if cos_a > 0 else -4.0
                d_end = end_x / cos_a
                if d_end > 0:
                    dist = min(dist, d_end)

            # Simulated pipeline running along the left wall
            if 30 <= angle_deg <= 75 and dist > 1.2:
                dist = min(dist, 1.45 + random.uniform(-0.03, 0.03))

            # Add measurement noise and intensity
            dist = max(0.1, dist + random.uniform(-0.02, 0.02))
            intensity = random.randint(160, 240)

            x = dist * cos_a
            y = dist * sin_a

            points.append({
                "angle_deg": round(angle_deg, 1),
                "distance_m": round(dist, 3),
                "intensity": intensity,
                "x": round(x, 3),
                "y": round(y, 3)
            })

        return {
            "timestamp": time.time(),
            "sensor": "LDROBOT_LD19_SIMULATED",
            "is_simulated": True,
            "speed_rpm": 600.0,
            "point_count": len(points),
            "points": points,
            "robot_pose": {
                "x": round(self.x, 3),
                "y": round(self.y, 3),
                "heading_deg": round(self.heading_deg, 1)
            }
        }

simulator_instance = HardwareSimulator()

