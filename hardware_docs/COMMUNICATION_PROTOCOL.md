# SafeScout MINE-ENERGY Communication Protocol Specification

**Protocol Version:** `2.1.0`  
**Baud Rate:** `115200 bps` (ESP32 Serial) / `230400 bps` (LD19 LiDAR) / WebSocket `8000` (FastAPI)

---

## 1. JSON Telemetry Packet (ESP32 -> Backend)

Sent periodically at 10 Hz (every 100ms) over Serial/UART:

```json
{
  "version": "2.1.0",
  "device_id": "safescout_rover_01",
  "timestamp": 1731609600123,
  "heartbeat": 14205,
  "status": {
    "online": true,
    "mode": "manual",
    "emergency_stop": false,
    "battery_voltage_v": 11.85,
    "battery_current_a": 1.42,
    "battery_percentage": 78,
    "temperature_mcu_c": 41.2,
    "wifi_rssi_dbm": -62,
    "watchdog_ok": true
  },
  "environmental": {
    "mq2_raw_adc": 842,
    "mq2_ppm_combustible": 245.5,
    "mq2_calibrated": true,
    "mq8_raw_adc": 410,
    "mq8_ppm_hydrogen": 42.1,
    "mq8_calibrated": true,
    "dht11_temp_c": 26.4,
    "dht11_humidity_pct": 68.2,
    "gas_alarm_state": "NORMAL"
  },
  "ventilation": {
    "sdp31_diff_pressure_pa": 48.75,
    "airway_temp_c": 26.4,
    "calculated_air_velocity_ms": 9.01,
    "pitot_clogged_warning": false
  },
  "acoustic_ultrasonic": {
    "ultrasonic_40khz_raw": 182,
    "ultrasonic_db_spl": 46.8,
    "suspected_leak": false,
    "peak_frequency_hz": 40150
  },
  "pipelines": {
    "compressed_air_pressure_bar": 6.82,
    "water_pipeline_pressure_bar": 3.95,
    "water_flow_rate_lmin": 14.8,
    "water_cumulative_liters": 1284.5,
    "water_temp_c": 22.8
  },
  "navigation_sensors": {
    "hc_sr04_distance_cm": 142.0,
    "left_wheel_ticks": 4810,
    "right_wheel_ticks": 4815,
    "estimated_speed_ms": 0.32
  },
  "alarms": {
    "estop_active": false,
    "combustible_gas_critical": false,
    "hydrogen_gas_critical": false,
    "air_leak_detected": false,
    "water_leak_detected": false,
    "relay_beacon_active": false
  }
}
```

---

## 2. Rover Command Packet (Backend -> ESP32)

Sent as a single-line JSON string followed by `\n`:

### Movement Command (Subject to 500ms Dead-Man Watchdog)
```json
{
  "cmd": "MOVE",
  "vx": 0.5,
  "omega": 0.0,
  "left_pwm": 180,
  "right_pwm": 180,
  "seq": 4510
}
```
*Note: If no subsequent `MOVE` command arrives within 500 ms, the ESP32 automatically shuts down PWM outputs.*

### Emergency Stop (Priority 0)
```json
{
  "cmd": "ESTOP",
  "state": true,
  "source": "DASHBOARD_UI"
}
```

### Reset Emergency Stop
```json
{
  "cmd": "RESET_ESTOP",
  "auth_token": "OPERATOR_OVERRIDE"
}
```

### Relay / Beacon Trigger
```json
{
  "cmd": "SET_ALARM",
  "relay_state": true,
  "reason": "HIGH_METHANE_CONCENTRATION"
}
```

---

## 3. LDROBOT LD19 Binary Serial Protocol

**Baud Rate:** `230400 bps`  
**Frame Length:** 47 Bytes per packet (12 distance measurements per packet)

### Frame Layout:
| Byte Index | Field | Type | Description |
|:---|:---|:---|:---|
| `0` | Header | `uint8` | Fixed `0x54` |
| `1` | VerLen | `uint8` | Fixed `0x2C` (Packet type = 0x2, length = 12 points) |
| `2..3` | Radar Speed | `uint16_t` | Radar rotational speed in degrees per second (little-endian) |
| `4..5` | Start Angle | `uint16_t` | Starting angle in `0.01 deg` (e.g. `34500` = 345.00°) |
| `6..41` | Data Points | `12 x 3 bytes` | 12 points. For point $i$: <br>Byte 0..1: Distance in mm (`uint16_t`) <br>Byte 2: Intensity (`uint8`) |
| `42..43`| End Angle | `uint16_t` | Ending angle in `0.01 deg` |
| `44..45`| Timestamp | `uint16_t` | Millisecond timestamp (0–30000 wrap-around) |
| `46` | CRC8 Checksum | `uint8` | CRC8 calculated over bytes 0 through 45 using polynomial `0x4D` |

---

## 4. WebSocket Feeds

- `ws://localhost:8000/ws/telemetry`: Broadcasts the unified telemetry state at 10 Hz to all connected dashboard pages.
- `ws://localhost:8000/ws/lidar`: Streams 360° completed scan packets (point clouds + robot pose) to the LiDAR mapping page.
- `ws://localhost:8000/ws/control`: Low-latency duplex stream for rover joystick commands and dead-man heartbeats.

