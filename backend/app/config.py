"""
SafeScout MINE-ENERGY - Application Configuration
"""

from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict
from typing import Optional
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
SNAPSHOTS_DIR = DATA_DIR / "snapshots"
SNAPSHOTS_DIR.mkdir(exist_ok=True)
REPORTS_DIR = DATA_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="allow")

    APP_NAME: str = "SafeScout MINE-ENERGY"
    APP_VERSION: str = "2.1.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR}/safescout.db"
    
    # Serial Communication Ports
    ESP32_SERIAL_PORT: str = Field(default="COM3" if os.name == "nt" else "/dev/ttyUSB1")
    ESP32_BAUD_RATE: int = 115200
    
    LD19_SERIAL_PORT: str = Field(default="COM4" if os.name == "nt" else "/dev/ttyUSB0")
    LD19_BAUD_RATE: int = 230400
    
    BNO085_I2C_BUS: int = 1
    BNO085_I2C_ADDR: int = 0x4A
    
    # Camera Stream URL (ESP32-CAM default IP or localhost simulator)
    ESP32_CAM_STREAM_URL: str = "http://192.168.4.1/stream"
    ESP32_CAM_CAPTURE_URL: str = "http://192.168.4.1/capture"
    
    # Hardware Simulator Switch
    FORCE_SIMULATION_MODE: bool = False
    
    # Tariffs & Economic Constants (Indian Industrial Standards)
    ELECTRICITY_TARIFF_INR_PER_KWH: float = 8.50  # ₹ 8.50 / kWh
    WATER_TARIFF_INR_PER_M3: float = 45.00        # ₹ 45.00 / m³
    COMPRESSOR_SPECIFIC_POWER_KW_PER_CFM: float = 0.20 # 0.20 kW/CFM for screw compressor at 7 bar
    PUMP_SPECIFIC_ENERGY_KWH_PER_M3: float = 0.65       # 0.65 kWh/m³ for industrial dewatering
    
    # Operational Constants
    ANNUAL_OPERATING_DAYS: int = 350
    DAILY_OPERATING_HOURS: float = 24.0
    
    # Environmental & Ventilation Constants
    STANDARD_AIR_DENSITY: float = 1.204  # kg/m³ at 20°C and 101.325 kPa

settings = Settings()
