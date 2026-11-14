"""
SafeScout MINE-ENERGY - System Settings & Configuration Router
"""

from fastapi import APIRouter
from backend.app.config import settings
from backend.app.schemas import HardwareSettingsSchema
from backend.app.hardware.hardware_manager import hardware_manager

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=HardwareSettingsSchema)
async def get_system_settings():
    return HardwareSettingsSchema(
        esp32_port=settings.ESP32_SERIAL_PORT,
        esp32_baud=settings.ESP32_BAUD_RATE,
        ld19_port=settings.LD19_SERIAL_PORT,
        ld19_baud=settings.LD19_BAUD_RATE,
        camera_stream_url=settings.ESP32_CAM_STREAM_URL,
        simulation_mode=hardware_manager.simulation_mode,
        electricity_tariff_inr=settings.ELECTRICITY_TARIFF_INR_PER_KWH,
        water_tariff_inr=settings.WATER_TARIFF_INR_PER_M3,
        compressor_kw_cfm=settings.COMPRESSOR_SPECIFIC_POWER_KW_PER_CFM,
        pump_kwh_m3=settings.PUMP_SPECIFIC_ENERGY_KWH_PER_M3
    )

@router.post("")
async def update_system_settings(cfg: HardwareSettingsSchema):
    settings.ESP32_SERIAL_PORT = cfg.esp32_port
    settings.ESP32_BAUD_RATE = cfg.esp32_baud
    settings.LD19_SERIAL_PORT = cfg.ld19_port
    settings.LD19_BAUD_RATE = cfg.ld19_baud
    settings.ESP32_CAM_STREAM_URL = cfg.camera_stream_url
    settings.ELECTRICITY_TARIFF_INR_PER_KWH = cfg.electricity_tariff_inr
    settings.WATER_TARIFF_INR_PER_M3 = cfg.water_tariff_inr
    settings.COMPRESSOR_SPECIFIC_POWER_KW_PER_CFM = cfg.compressor_kw_cfm
    settings.PUMP_SPECIFIC_ENERGY_KWH_PER_M3 = cfg.pump_kwh_m3

    hardware_manager.set_simulation_mode(cfg.simulation_mode)
    return {"status": "UPDATED", "settings": cfg}

