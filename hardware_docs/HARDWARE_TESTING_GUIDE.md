# SafeScout MINE-ENERGY Hardware Testing & Troubleshooting Guide

This guide describes the step-by-step procedure for verifying hardware integrity, testing individual sensors, bench testing motors, and diagnosing communication faults.

---

## 1. Bench Safety Checklist Before Power-Up

1. **Bench Isolation**: Elevate rover wheels off the test bench surface during initial power-up.
2. **Polarity Verification**: Confirm 12V Li-ion battery leads to L298N VIN and LM2596 buck converter inputs with a digital multimeter before connecting.
3. **Logic Level Verification**:
   - Confirm ESP32 3.3V rail measures $3.30 \pm 0.05$ V.
   - Confirm 5V rail for MQ sensors, HC-SR04, and ADS1115 measures $5.00 \pm 0.1$ V.
   - Confirm resistor dividers on HC-SR04 Echo and YF-S201 output $\le 3.3$ V when triggered.
4. **Emergency Stop Interlock**: Test the physical NC E-Stop button with an ohmmeter (continuity when unpressed, open circuit when pressed).

---

## 2. Sensor Verification Steps

### 2.1 Sensirion SDP31 & Pitot-Static Tube
- **I2C Scan**: Run I2C scanner firmware. SDP31 should respond at address `0x21`.
- **Zero-Point Offset**: In still air with both ports open, differential pressure should be $0.0 \pm 0.5$ Pa.
- **Dynamic Pressure Test**: Blow gently across the impact port of the Pitot tube. Differential pressure should rise to between 20 Pa and 150 Pa. Velocity reading should indicate 5.5 to 15 m/s.

### 2.2 ADS1115 Analog Multiplexer & Gas Sensors
- **I2C Scan**: Address `0x48` must be acknowledged.
- **MQ-2 & MQ-8 Pre-Heat**: MQ sensors require a 24-hour pre-heat burn-in cycle before first precision calibration. Raw ADC should read between 300 and 800 in clean ambient air.
- **DFRobot SEN0257 Pressure Transmitters**:
  - Zero pressure (atmospheric): Output voltage should be $\approx 0.5$ V (divided to $\approx 0.33$ V at ADS1115 AIN2/AIN3).
  - Pressurized to 6 bar: Output voltage rises to $\approx 2.9$ V.

### 2.3 40 kHz Ultrasonic Leakage Detector
- Point a compressed air blowgun or nozzle 2 meters away and crack the valve open.
- The 40 kHz pre-amplifier envelope output should register an acoustic spike from baseline (<30 dB SPL) up to 75–90 dB SPL.

---

## 3. Motor Controller & Dead-Man Watchdog Testing

1. Connect the ESP32 to the PC via USB.
2. Open Serial Monitor at 115200 baud.
3. Send a single move command:
   ```json
   {"cmd":"MOVE","vx":0.4,"omega":0.0,"left_pwm":150,"right_pwm":150}
   ```
4. Verify both motors rotate forward.
5. Wait 600 ms without sending another command:
   - **Pass condition**: Motors MUST stop completely within 500 ms of command cessation.
6. Push the physical E-Stop switch:
   - **Pass condition**: Motors immediately lock up/freewheel, alarm beacon relay energizes, and telemetry flags `emergency_stop: true`.

---

## 4. Raspberry Pi 5 & LD19 LiDAR Testing

1. Check USB serial device enumeration:
   ```bash
   ls -la /dev/ttyUSB*
   ```
2. Verify LD19 LiDAR permissions:
   ```bash
   sudo chmod 666 /dev/ttyUSB0
   ```
3. Run the standalone python test parser:
   ```bash
   python -m backend.tests.test_ld19_parser
   ```
4. Verify continuous 360° point cloud generation at 10 Hz (approx. 450 points per revolution).

---

## 5. Troubleshooting Reference Table

| Symptom | Probable Cause | Diagnostic & Resolution |
|:---|:---|:---|
| Motors fail to stop when joystick released | Dead-man timer ignored or heartbeat loop broken | Check ESP32 timer watchdog in `motor_controller.h`. Ensure heartbeat timeout $\le 500$ ms. |
| MQ-2 / MQ-8 reading stays at max ADC (4095 or 32767) | Missing load resistor or sensor pin shorted to VCC | Check $R_L$ ground connection. Measure voltage at AIN0 with multimeter. |
| SDP31 returns I2C NACK error | Wrong address or missing pull-up resistors | Verify 4.7kΩ pull-up on SDA/SCL. Check address pin ADDR (GND = `0x21`, VDD = `0x22`). |
| LD19 LiDAR not receiving data | Baud rate mismatch or inverted RX/TX | Verify baud rate is set to `230400`. Verify LD19 TX is wired to USB-UART RX. |
| Camera stream drops or stutters | Wi-Fi channel congestion or inadequate 5V power | ESP32-CAM requires 5V @ 2A peak during transmission. Add a 470µF low-ESR capacitor across 5V and GND on the camera board. |

