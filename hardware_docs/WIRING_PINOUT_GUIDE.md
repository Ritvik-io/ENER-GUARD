# SafeScout MINE-ENERGY Hardware Wiring & GPIO Allocation Guide

## 1. System Hardware Overview

The SafeScout MINE-ENERGY rover utilizes a three-tier distributed processing architecture:
1. **ESP32 DevKit V1 (Main Controller)**: Real-time sensor polling, motor PWM generation, dead-man watchdog timer, hardware E-Stop interrupt, telemetry publishing.
2. **ESP32-CAM**: Dedicated vision coprocessor running OV2640 camera, serving live MJPEG stream (`/stream`) and snapshot capture (`/capture`).
3. **Raspberry Pi 5 (4GB)**: Main mission computer, backend host, 2D SLAM navigation (LD19 LiDAR), BNO085 IMU fusion, AI anomaly inspection, and energy conservation engine.

---

## 2. ESP32 DevKit V1 Verified, Conflict-Free Pin Allocation

### Critical ESP32 Hardware Constraints Respected:
- **GPIO 6–11**: Reserved for internal SPI flash — **NOT USED**.
- **ADC2 Limitation**: ADC2 channels (GPIO 0, 2, 4, 12, 13, 14, 15, 25, 26, 27) cannot be used for analog reads when Wi-Fi is active. Furthermore, ESP32 native ADCs are non-linear and max 3.3V.
- **5V Signal Safety**: Sensors outputting 0–5V (SEN0257, HC-SR04 Echo, YF-S201) are stepped down via precision resistive dividers or read via the ADS1115 16-bit I2C ADC.
- **ADS1115 I2C ADC Solution**: To guarantee laboratory-grade analog measurements and avoid ADC2/Wi-Fi conflicts, an ADS1115 ADC (I2C addr `0x48`) is integrated on the shared I2C bus.

### Pinout Table

| ESP32 Pin | Function / Sensor | Direction / Signal Type | Electrical Interface & Conditioning | Notes / Safeguards |
|:---|:---|:---|:---|:---|
| **GPIO 21** | I2C SDA Bus | Bidirectional | 3.3V Logic, 4.7kΩ pull-up | Connected to ADS1115 (`0x48`), SDP31 (`0x21`), INA226 (`0x40`) |
| **GPIO 22** | I2C SCL Bus | Bidirectional | 3.3V Logic, 4.7kΩ pull-up | Shared clock for all I2C sensors |
| **GPIO 36 (VP)**| 40 kHz Ultrasonic Envelope | Analog Input (ADC1_CH0)| 0 to 3.3V envelope from preamp/bandpass | Dedicated to acoustic leakage peak tracking |
| **GPIO 4**  | DS18B20 Temperature | Digital (OneWire) | 3.3V Logic, 4.7kΩ pull-up to 3.3V | Water/Pipeline surface temperature |
| **GPIO 15** | DHT11 Air Temp / Humidity| Digital (Single-bus) | 3.3V Logic, 10kΩ pull-up | Ambient mine airway temperature & RH |
| **GPIO 5**  | HC-SR04 Trigger | Digital Output | 3.3V Logic | 10µs trigger pulse for front collision guard |
| **GPIO 18** | HC-SR04 Echo | Digital Input | 5V to 3.3V Divider (1kΩ / 2kΩ) | Protects ESP32 GPIO from 5V echo pulse |
| **GPIO 19** | YF-S201 Water Flow | Digital Interrupt | 5V to 3.3V Divider (1kΩ / 2kΩ) | Pulse counter (450 pulses/liter calibration) |
| **GPIO 34** | Hardware E-Stop Input | Digital Input (Input-Only)| External 10kΩ pull-up to 3.3V, NC switch to GND | Hardware interrupt: LOW = STOP IMMEDIATE |
| **GPIO 23** | Alarm Relay & Beacon | Digital Output | 3.3V Logic to Relay Optocoupler/Transistor | Active HIGH triggers beacon & audio siren |
| **GPIO 13** | L298N IN1 (Left Motor A)| Digital Output | 3.3V Logic | Left side forward direction |
| **GPIO 12** | L298N IN2 (Left Motor B)| Digital Output | 3.3V Logic | Left side reverse direction |
| **GPIO 14** | L298N IN3 (Right Motor A)| Digital Output | 3.3V Logic | Right side forward direction |
| **GPIO 27** | L298N IN4 (Right Motor B)| Digital Output | 3.3V Logic | Right side reverse direction |
| **GPIO 25** | L298N ENA (Left PWM) | LEDC PWM Output | Channel 0, 5 kHz, 8-bit resolution | Left speed regulation (0–255) |
| **GPIO 26** | L298N ENB (Right PWM)| LEDC PWM Output | Channel 1, 5 kHz, 8-bit resolution | Right speed regulation (0–255) |
| **GPIO 1 (TX0)**| Serial Telemetry / USB | Serial Output | 115200 Baud to Raspberry Pi USB/UART | JSON telemetry packets |
| **GPIO 3 (RX0)**| Serial Commands / USB | Serial Input | 115200 Baud from Raspberry Pi USB/UART | Dead-man movement & configuration commands |

---

## 3. ADS1115 16-Bit I2C ADC Channel Allocation (Address 0x48)

The ADS1115 provides high-precision differential and single-ended conversion with an onboard programmable gain amplifier (PGA):

| ADS1115 Channel | Connected Sensor | Sensor Range | Signal Conditioning | Output to ADC |
|:---|:---|:---|:---|:---|
| **AIN0** | **MQ-2 Combustible Gas** | 300–10000 ppm LPG/CH4 | Pre-calibrated load resistor $R_L=10k\Omega$, powered at 5V | Voltage divider: 2.0kΩ / 3.0kΩ gives 0–3.0V |
| **AIN1** | **MQ-8 Hydrogen Gas** | 100–10000 ppm H2 | Pre-calibrated load resistor $R_L=10k\Omega$, powered at 5V | Voltage divider: 2.0kΩ / 3.0kΩ gives 0–3.0V |
| **AIN2** | **DFRobot SEN0257 (Air)**| 0 to 1.0 MPa (0–145 PSI)| Industrial 0.5V to 4.5V linear output | 10kΩ / 20kΩ divider (divide by 1.5) gives 0.33V–3.0V |
| **AIN3** | **DFRobot SEN0257 (Water)**| 0 to 1.6 MPa (0–232 PSI)| Industrial 0.5V to 4.5V linear output | 10kΩ / 20kΩ divider (divide by 1.5) gives 0.33V–3.0V |

---

## 4. I2C Bus Topology & Addresses

All I2C devices operate on standard 3.3V logic with 4.7kΩ pull-up resistors on SDA (GPIO 21) and SCL (GPIO 22):

1. **Sensirion SDP31** (`0x21`): Micro-machined differential pressure sensor connected to Pitot-static tube. Dynamic range $\pm 500$ Pa (0.01 Pa resolution).
2. **Texas Instruments INA226** (`0x40`): High-side bi-directional current and bus voltage monitor across a $0.002\Omega$ shunt resistor. Monitors battery pack voltage (9–12.6V) and motor load (0–10A).
3. **Texas Instruments ADS1115** (`0x48`): 4-channel 16-bit analog-to-digital converter.

---

## 5. Raspberry Pi 5 Hardware Interfaces

1. **LDROBOT LD19 360° LiDAR**:
   - Connection: Connected via USB-to-UART bridge to `/dev/ttyUSB0` (or Pi 5 GPIO 14/15 `ttyAMA0`).
   - Baud Rate: `230400 bps`, 8 data bits, no parity, 1 stop bit.
   - Power: 5V @ 500mA from Raspberry Pi 5 USB 3.0 port.
2. **CEVA BNO085 9-DOF IMU**:
   - Connection: Raspberry Pi 5 I2C-1 (Pin 3 SDA / Pin 5 SCL) at address `0x4A` (or UART-RVC mode).
   - Interrupt Pin: Pi 5 GPIO 17 (Pin 11).
   - Rate: 100 Hz fused game-rotation vector (heading, pitch, roll, linear acceleration).
3. **ESP32 Micro-USB / Serial**:
   - Connection: USB port `/dev/ttyUSB1` or `/dev/ttyACM0` at `115200 bps`.

---

## 6. Electrical Safety & Dead-Man Interlock Circuit

1. **Dead-Man Watchdog**:
   - The ESP32 firmware executes a 500 ms hardware timer watchdog.
   - Every movement command received via Serial/WebSocket resets the watchdog timer.
   - If no valid movement packet is received within 500 ms, the motor driver PWM immediately sets to 0 and all directional pins pull LOW.
2. **Hardware Emergency Stop**:
   - Physical Normally Closed (NC) mushroom button wired between GPIO 34 and GND.
   - If pushed (circuit opens) or wire cuts, GPIO 34 is pulled HIGH by 10kΩ resistor, triggering an ISR that cuts motor PWM within 1 ms and latches the alarm relay on GPIO 23.
   - Resetting requires explicit operator clearing on both physical switch and dashboard command.

