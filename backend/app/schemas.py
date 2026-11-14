"""
SafeScout MINE-ENERGY - Pydantic Schemas & Data Contracts
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==========================================
# 1. Telemetry Schemas
# ==========================================
class StatusSchema(BaseModel):
    online: bool = True
    mode: str = "manual"
    emergency_stop: bool = False
    battery_voltage_v: float = 12.0
    battery_current_a: float = 1.0
    battery_percentage: int = 80
    temperature_mcu_c: float = 40.0
    wifi_rssi_dbm: int = -60
    watchdog_ok: bool = True
    rover_x: float = 0.0
    rover_y: float = 0.0
    rover_heading_deg: float = 0.0
    speed_ms: float = 0.0

class EnvironmentalSchema(BaseModel):
    mq2_raw_adc: int = 500
    mq2_ppm_combustible: float = 250.0
    mq2_calibrated: bool = True
    mq8_raw_adc: int = 400
    mq8_ppm_hydrogen: float = 40.0
    mq8_calibrated: bool = True
    dht11_temp_c: float = 25.0
    dht11_humidity_pct: float = 60.0
    gas_alarm_state: str = "NORMAL"

class VentilationSchema(BaseModel):
    sdp31_diff_pressure_pa: float = 45.0
    airway_temp_c: float = 25.0
    calculated_air_velocity_ms: float = 8.65
    pitot_clogged_warning: bool = False

class AcousticSchema(BaseModel):
    ultrasonic_40khz_raw: int = 150
    ultrasonic_db_spl: float = 42.0
    suspected_leak: bool = False
    peak_frequency_hz: int = 40000

class PipelineSchema(BaseModel):
    compressed_air_pressure_bar: float = 7.0
    water_pipeline_pressure_bar: float = 4.0
    water_flow_rate_lmin: float = 15.0
    water_cumulative_liters: float = 1000.0
    water_temp_c: float = 22.0

class TelemetryPayload(BaseModel):
    version: str = "2.1.0"
    device_id: str = "safescout_rover_01"
    is_simulated: bool = False
    simulation_badge: Optional[str] = None
    timestamp: int
    heartbeat: int
    status: StatusSchema
    environmental: EnvironmentalSchema
    ventilation: VentilationSchema
    acoustic_ultrasonic: AcousticSchema
    pipelines: PipelineSchema
    alarms: Dict[str, Any]

# ==========================================
# 2. Control Schemas
# ==========================================
class RoverMoveCommand(BaseModel):
    vx: float = Field(default=0.0, ge=-1.0, le=1.0)
    omega: float = Field(default=0.0, ge=-1.0, le=1.0)
    speed_pct: int = Field(default=60, ge=10, le=100)

class EStopCommand(BaseModel):
    state: bool = True
    reason: Optional[str] = "Operator Emergency Button"

# ==========================================
# 3. Calculation & Engineering Schemas
# ==========================================
class VentilationCalcRequest(BaseModel):
    width_m: float = 4.0
    height_m: float = 3.0
    shape: str = "RECTANGULAR"  # RECTANGULAR, ARCH, CIRCULAR
    diff_pressure_pa: float = 50.0
    air_temp_c: float = 20.0
    barometric_pressure_pa: float = 101325.0
    relative_humidity_pct: float = 50.0
    required_airflow_m3s: float = 45.0
    traverse_readings: Optional[List[float]] = None
    fan_electrical_power_kw: Optional[float] = 75.0

class CompressedAirCalcRequest(BaseModel):
    ultrasonic_db_spl: float = 68.0
    line_pressure_bar: float = 6.5
    calibrated_cfm: Optional[float] = None
    compressor_specific_power_kw_per_cfm: float = 0.20
    operating_hours_day: float = 24.0
    operating_days_year: int = 350
    tariff_inr_per_kwh: float = 8.50

class WaterPipelineCalcRequest(BaseModel):
    leakage_flow_lmin: float = 12.0
    service_type: str = "Mine dewatering"
    line_pressure_bar: float = 4.5
    operating_hours_day: float = 24.0
    operating_days_year: int = 350
    water_tariff_inr_per_m3: float = 45.00
    pump_specific_energy_kwh_per_m3: float = 0.65
    tariff_inr_per_kwh: float = 8.50

class SlurryEvaluationRequest(BaseModel):
    pipe_schedule: str = "Sch 80"
    nominal_wall_thickness_mm: float = 12.0
    measured_wall_thickness_mm: float = 6.5
    slurry_specific_gravity: float = 1.35
    line_pressure_bar: float = 8.0
    has_visible_spill: bool = False

# ==========================================
# 4. Inspection Schemas
# ==========================================
class InspectionCreate(BaseModel):
    site_name: str = "Underground Mine Block-4"
    zone_name: str = "Ventilation Trunk A"
    equipment_id: str = "PIPE-AIR-042"
    location_x: float = 0.0
    location_y: float = 0.0
    heading_deg: float = 0.0
    fault_type: str  # COMPRESSED_AIR_LEAK, WATER_LEAK, SLURRY_WEAR, VENTILATION_DEFICIT, GAS_ALARM, NORMAL
    severity: str = "MEDIUM"
    detection_method: str = "RULE_BASED"
    confidence_score: float = 0.85
    measured_values: Dict[str, Any] = {}
    estimated_power_loss_kw: float = 0.0
    estimated_energy_loss_kwh_day: float = 0.0
    potential_annual_saving_kwh: float = 0.0
    annual_financial_saving_inr: float = 0.0
    maintenance_priority: str = "P2 - 24 HOURS"
    operator_remarks: Optional[str] = ""

class InspectionUpdate(BaseModel):
    confirmation_status: Optional[str] = None # SUSPECTED, CONFIRMED, REJECTED
    repair_status: Optional[str] = None       # PENDING, IN_PROGRESS, REPAIRED, VERIFIED
    verified_saving_kwh: Optional[float] = None
    operator_remarks: Optional[str] = None

class InspectionResponse(InspectionCreate):
    id: int
    inspection_code: str
    timestamp: datetime
    snapshot_path: Optional[str] = None
    confirmation_status: str
    repair_status: str
    verified_saving_kwh: float
    repaired_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# 5. Settings & Config Schemas
# ==========================================
class HardwareSettingsSchema(BaseModel):
    esp32_port: str
    esp32_baud: int
    ld19_port: str
    ld19_baud: int
    camera_stream_url: str
    simulation_mode: bool
    electricity_tariff_inr: float
    water_tariff_inr: float
    compressor_kw_cfm: float
    pump_kwh_m3: float
