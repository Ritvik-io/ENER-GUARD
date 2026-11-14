"""
SafeScout MINE-ENERGY - SQLAlchemy ORM Models
"""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, JSON
from datetime import datetime
from backend.app.database import Base

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_code = Column(String(64), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    site_name = Column(String(128), default="Underground Mine Block-4")
    zone_name = Column(String(128), default="Ventilation Trunk A")
    equipment_id = Column(String(128), default="PIPE-AIR-042")
    
    # SLAM Map Coordinates
    location_x = Column(Float, default=0.0)
    location_y = Column(Float, default=0.0)
    heading_deg = Column(Float, default=0.0)
    
    # Visual Evidence
    snapshot_path = Column(String(256), nullable=True)
    
    # Fault Information
    fault_type = Column(String(64), nullable=False)  # COMPRESSED_AIR_LEAK, WATER_LEAK, SLURRY_WEAR, VENTILATION_DEFICIT, GAS_ALARM, NORMAL
    severity = Column(String(32), default="MEDIUM")   # LOW, MEDIUM, HIGH, CRITICAL
    detection_method = Column(String(64), default="RULE_BASED")  # RULE_BASED, ACOUSTIC_FFT, CV_MOISTURE, ML_CLASSIFIER, MANUAL
    confidence_score = Column(Float, default=0.85)
    
    # Sensor Readings at Finding (JSON snapshot)
    measured_values = Column(JSON, default=dict)
    
    # Energy Conservation Impact
    estimated_power_loss_kw = Column(Float, default=0.0)
    estimated_energy_loss_kwh_day = Column(Float, default=0.0)
    potential_annual_saving_kwh = Column(Float, default=0.0)
    annual_financial_saving_inr = Column(Float, default=0.0)
    
    # Maintenance Workflow
    maintenance_priority = Column(String(32), default="P2 - 24 HOURS")
    confirmation_status = Column(String(32), default="SUSPECTED")  # SUSPECTED, CONFIRMED, REJECTED
    repair_status = Column(String(32), default="PENDING")         # PENDING, IN_PROGRESS, REPAIRED, VERIFIED
    verified_saving_kwh = Column(Float, default=0.0)
    operator_remarks = Column(Text, default="")
    repaired_at = Column(DateTime, nullable=True)

class VentilationSurvey(Base):
    __tablename__ = "ventilation_surveys"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    survey_code = Column(String(64), unique=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    zone_name = Column(String(128), default="Shaft 2 Intake")
    airway_shape = Column(String(32), default="ARCH")  # RECTANGULAR, ARCH, CIRCULAR
    width_m = Column(Float, default=4.2)
    height_m = Column(Float, default=3.5)
    area_m2 = Column(Float, default=13.2)
    required_airflow_m3s = Column(Float, default=45.0)
    
    # Measurement & Traverse
    traverse_points_count = Column(Integer, default=1)
    diff_pressure_pa = Column(Float, default=0.0)
    air_density_kg_m3 = Column(Float, default=1.204)
    calculated_velocity_ms = Column(Float, default=0.0)
    measured_airflow_m3s = Column(Float, default=0.0)
    airflow_deviation_pct = Column(Float, default=0.0)
    
    # Fan Power Evaluation
    fan_electrical_power_kw = Column(Float, default=75.0)
    fan_pressure_rise_pa = Column(Float, default=850.0)
    compliance_status = Column(String(32), default="COMPLIANT") # COMPLIANT, DEFICIT, EXCESS
    remarks = Column(Text, default="")

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    battery_voltage_v = Column(Float)
    battery_percentage = Column(Integer)
    mq2_ppm = Column(Float)
    mq8_ppm = Column(Float)
    temp_c = Column(Float)
    humidity_pct = Column(Float)
    sdp31_diff_pressure_pa = Column(Float)
    air_velocity_ms = Column(Float)
    acoustic_db_spl = Column(Float)
    air_pressure_bar = Column(Float)
    water_pressure_bar = Column(Float)
    water_flow_rate_lmin = Column(Float)
    water_temp_c = Column(Float)
    rover_x = Column(Float, default=0.0)
    rover_y = Column(Float, default=0.0)
    rover_heading_deg = Column(Float, default=0.0)
    emergency_stop = Column(Boolean, default=False)
