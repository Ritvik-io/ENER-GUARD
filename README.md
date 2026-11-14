# SafeScout MINE-ENERGY

### AI-Enabled IoT Rover for Mine Safety, Industrial Pipeline Inspection and Energy Conservation

SafeScout MINE-ENERGY is a production-grade, distributed IoT monitoring and autonomous inspection rover system engineered for hazardous underground mines and industrial utility pipeline facilities.

---

## 1. System Architecture

SafeScout operates via a three-tier computing architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       OPERATOR BROWSER                      │
│      React 18 + TypeScript + Vite + Tailwind CSS + Recharts │
│           12 SCADA Pages / 2D SLAM / Dead-Man Teleop        │
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTP / WebSocket (8000)
┌──────────────────────────────▼──────────────────────────────┐
│                    RASPBERRY PI 5 (4 GB)                    │
│   • FastAPI Async Server & SQLAlchemy SQLite Storage        │
│   • LDROBOT LD19 360° LiDAR 2D Occupancy Grid SLAM Engine   │
│   • BNO085 9-DOF IMU Attitude & Orientation Tracking        │
│   • OpenCV Computer Vision (Water Spray & Puddle Detection) │
│   • Energy Conservation Math Engine (Ventilation, Air, Water)│
└──────────────────▲───────────────────────────▲──────────────┘
                   │ USB Serial (115200)       │ Wi-Fi MJPEG
┌──────────────────▼──────────┐      ┌─────────▼──────────────┐
│       ESP32 DevKit V1       │      │       ESP32-CAM        │
│  • Sensirion SDP31 (Pitot)  │      │  • OV2640 Lens Sensor  │
│  • ADS1115 16-Bit I2C ADC   │      │  • /stream MJPEG Feed  │
│  • MQ-2 Combustible Gas     │      │  • /capture Snapshot   │
│  • MQ-8 Hydrogen Gas        │      │  • High-Lumen Flash LED│
│  • 40 kHz Ultrasonic Sensor │      └────────────────────────┘
│  • SEN0257 Air & Water Press│
│  • YF-S201 Water Flow Meter │
│  • HW-095 L298N (4 Motors)  │
│  • Hardware E-Stop (ISR)    │
│  • 500ms Dead-Man Watchdog  │
└─────────────────────────────┘
```

---

## 2. Hardware Wiring & Pinout Summary

The pin assignments respect all ESP32 silicon constraints (avoiding SPI Flash pins GPIO 6–11, resolving ADC2/Wi-Fi conflicts via the ADS1115 16-bit I2C ADC, and implementing resistive 5V-to-3.3V logic translation).

| Module / Sensor | ESP32 Pin / Interface | Signal Conditioning | Function |
|:---|:---|:---|:---|
| **I2C SDA / SCL** | GPIO 21 / GPIO 22 | 4.7kΩ Pull-ups to 3.3V | SDP31 (`0x21`), INA226 (`0x40`), ADS1115 (`0x48`) |
| **ADS1115 AIN0** | ADS1115 Ch 0 | 2kΩ / 3kΩ Voltage Divider | MQ-2 Combustible Gas (300–10000 PPM) |
| **ADS1115 AIN1** | ADS1115 Ch 1 | 2kΩ / 3kΩ Voltage Divider | MQ-8 Hydrogen Gas (100–10000 PPM) |
| **ADS1115 AIN2** | ADS1115 Ch 2 | 10kΩ / 20kΩ Divider (÷1.5) | DFRobot SEN0257 Compressed Air (0–10 bar) |
| **ADS1115 AIN3** | ADS1115 Ch 3 | 10kΩ / 20kΩ Divider (÷1.5) | DFRobot SEN0257 Water Pressure (0–16 bar) |
| **40 kHz Ultrasound** | GPIO 36 (ADC1_CH0) | Direct Envelope from Preamp | Acoustic Leak Detection (dB SPL) |
| **DS18B20 Temp** | GPIO 4 | 4.7kΩ Pull-up to 3.3V | Waterproof Water / Surface Probe |
| **DHT11 Air Sensor** | GPIO 15 | 10kΩ Pull-up to 3.3V | Ambient Airway Temp & Humidity |
| **HC-SR04 Trig/Echo** | GPIO 5 (Trig) / GPIO 18 (Echo) | 1kΩ / 2kΩ Divider on Echo | Front Collision Obstacle Detection |
| **YF-S201 Flow** | GPIO 19 (Interrupt) | 1kΩ / 2kΩ Divider | Water Flow Pulses (450 pulses/L) |
| **Hardware E-Stop** | GPIO 34 (Input-only) | 10kΩ Pull-up, NC contact to GND | Hardware Stop Interrupt (<1ms response) |
| **Alarm Beacon Relay**| GPIO 23 | Active HIGH Transistor Driver | Mine Warning Siren & Strobe |
| **L298N Drive** | GPIO 13, 12, 14, 27 | 3.3V Logic | Motor Direction H-Bridge |
| **L298N PWM Speed** | GPIO 25 (ENA), GPIO 26 (ENB)| LEDC Channels 0 & 1, 5 kHz | Differential Drive Speed (0–255) |

*Full schematic details available in `hardware_docs/WIRING_PINOUT_GUIDE.md`.*

---

## 3. Scientific Energy Conservation Equations

### 3.1 Ventilation Aerodynamics (Bernoulli Pitot-Static Formula)
Air Velocity:
$$V = C_p \sqrt{\frac{2 \Delta P}{\rho}}$$

Volumetric Airflow:
$$Q = A \times V_{\text{avg}}$$

Where:
- $\Delta P$: Differential pressure across Pitot impact and static ports measured by Sensirion SDP31 (Pa).
- $\rho$: Moist air density calculated via ideal gas formulation and vapor pressure:
  $$\rho = \frac{P_{\text{dry}}}{R_{\text{dry}} T} + \frac{P_{\text{vapor}}}{R_{\text{vapor}} T}$$
- $A$: Cross-sectional airway area calculated from mine roadway geometry (Arch, Rectangular, Circular).
- $V_{\text{avg}}$: Weighted multi-point traverse average.

### 3.2 Compressed Air Leakage
Orifice Mass Discharge (ISO 1217 Choked Flow):
$$Q_{\text{CFM}} = 0.354 \cdot C_d \cdot d_{\text{mm}}^2 \cdot (P_{\text{bar}} + 1.013) \cdot \sqrt{\frac{293.15}{T_K}}$$

Compressor Power Penalty:
$$\text{Power Loss (kW)} = \text{Leakage Flow (CFM)} \times \text{Specific Power (kW/CFM)}$$
$$\text{Energy Loss (kWh/day)} = \text{Power Loss (kW)} \times \text{Operating Hours/day}$$
$$\text{Annual Financial Loss (₹)} = \text{Energy Loss/day} \times \text{Operating Days/year} \times \text{Tariff (₹/kWh)}$$

### 3.3 Water & Dewatering Pipeline Losses
$$\text{Daily Water Wastage (m}^3\text{/day)} = \frac{Q_{\text{leak}} (\text{L/min}) \times 60 \times \text{Hours/day}}{1000}$$
$$\text{Pumping Energy Loss (kWh/day)} = \text{Water Wastage (m}^3\text{/day)} \times \text{Pump Specific Energy (kWh/m}^3\text{)}$$

---

## 4. Software Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Canvas 2D SLAM Renderer.
- **Backend**: Python 3.10+ FastAPI, WebSockets, SQLAlchemy async with SQLite, OpenCV, NumPy, ReportLab PDF Engine.
- **Firmware**: C++ Arduino IDE / PlatformIO for ESP32 DevKit V1 and ESP32-CAM.
- **Testing**: Pytest automated suite covering calculations, binary LiDAR parser, and REST APIs.

---

## 5. Quickstart & Installation

### Option A: Running on Raspberry Pi 5 (Automated)

1. Clone repository to `/home/pi/safescout/DASHBOARD`:
   ```bash
   git clone <repo-url> /home/pi/safescout/DASHBOARD
   cd /home/pi/safescout/DASHBOARD
   ```
2. Run the automated installer:
   ```bash
   chmod +x deployment/install_raspberry_pi.sh
   ./deployment/install_raspberry_pi.sh
   ```
3. The dashboard will automatically start via systemd at `http://localhost:8000` (or the Pi's local IP).

### Option B: Running on Workstation (Development / Simulation Mode)

1. **Install Backend Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   pip install pydantic-settings greenlet
   ```
2. **Run Pytest Suite**:
   ```bash
   python -m pytest backend/tests/
   ```
   *Expected: All 17 tests pass.*
3. **Start FastAPI Backend**:
   ```bash
   python backend/run_backend.py
   ```
   *The server starts on port `8000` and automatically switches to explicit `SIMULATION MODE` if hardware serial ports are not connected.*
4. **Run Vite Frontend Development Server**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 6. Flashing Microcontrollers

1. **ESP32 DevKit V1**:
   - Open `firmware/esp32_rover/esp32_rover.ino` in Arduino IDE or VS Code with PlatformIO.
   - Install required libraries: `ArduinoJson`, `Adafruit ADS1X15`, `DHT sensor library`, `OneWire`, `DallasTemperature`, `INA226_WE`.
   - Select board **ESP32 Dev Module** and flash over USB.
2. **ESP32-CAM**:
   - Open `firmware/esp32_cam/esp32_cam.ino`.
   - Update Wi-Fi credentials or connect to the default access point `SafeScout-CAM-AP`.
   - Select board **AI Thinker ESP32-CAM**, set Partition Scheme to **Huge APP (3MB No OTA)**, and flash.

---

## 7. Safety & Dead-Man Control Rules

- **Dead-Man Watchdog**: Movement commands must be sent continuously every 100ms. If commands stop for $>500$ ms, the ESP32 halts all motor PWM outputs immediately.
- **Hardware Emergency Stop**: Priority 0 hard cutoff wired to GPIO 34. Pushing the mushroom button cuts motor power in $<1$ ms and engages the alarm beacon.
- **Statutory Mandate**: The SafeScout application is an inspection tool. It is hard-coded to never control or throttle main mine ventilation fans or plant dewatering valves directly.

