"""
SafeScout MINE-ENERGY - Water & Slurry Pipeline Conservation Calculations
Formulas:
  Water wastage (m³/day) = Leakage flow (L/min) * 60 * Operating hours/day / 1000
  Pumping energy loss (kWh/day) = Water wastage (m³/day) * Pump specific energy (kWh/m³)
"""

from typing import Dict, Optional

SUPPORTED_WATER_SERVICES = [
    "Mine dewatering",
    "Dust suppression",
    "Cooling water",
    "Industrial water distribution",
    "Paper mills",
    "Textile mills",
    "Water treatment plants"
]

SLURRY_DEFECT_TYPES = [
    "Abrasive Wall Thinning / Erosion",
    "Flange Gasket Extrusion",
    "Pipe Liner Delamination",
    "Localized Cavitation Pitting",
    "Slurry Spraying Pin-hole",
    "Support Sag & Joint Misalignment"
]

def calculate_water_leakage_and_energy(
    leakage_flow_lmin: float,
    pump_specific_energy_kwh_per_m3: float = 0.65,
    daily_operating_hours: float = 24.0,
    annual_operating_days: int = 350,
    water_tariff_inr_per_m3: float = 45.00,
    electricity_tariff_inr_per_kwh: float = 8.50,
    service_type: str = "Mine dewatering"
) -> Dict[str, float]:
    """
    Calculate water volume lost and associated pumping energy waste:
    Water wastage (m³/day) = Leakage flow (L/min) * 60 * Operating hours/day / 1000
    Pumping energy loss (kWh/day) = Water wastage (m³/day) * Pump specific energy (kWh/m³)
    """
    if leakage_flow_lmin <= 0.0:
        return {
            "leakage_flow_lmin": 0.0,
            "daily_wastage_m3": 0.0,
            "annual_wastage_m3": 0.0,
            "daily_pumping_kwh": 0.0,
            "annual_pumping_kwh": 0.0,
            "water_cost_inr": 0.0,
            "energy_cost_inr": 0.0,
            "total_annual_cost_inr": 0.0,
            "service_type": service_type
        }

    daily_wastage_m3 = round((leakage_flow_lmin * 60.0 * daily_operating_hours) / 1000.0, 2)
    annual_wastage_m3 = round(daily_wastage_m3 * annual_operating_days, 1)

    daily_pumping_kwh = round(daily_wastage_m3 * pump_specific_energy_kwh_per_m3, 2)
    annual_pumping_kwh = round(daily_pumping_kwh * annual_operating_days, 1)

    annual_water_cost_inr = round(annual_wastage_m3 * water_tariff_inr_per_m3, 2)
    annual_energy_cost_inr = round(annual_pumping_kwh * electricity_tariff_inr_per_kwh, 2)
    total_annual_cost_inr = round(annual_water_cost_inr + annual_energy_cost_inr, 2)

    return {
        "leakage_flow_lmin": round(leakage_flow_lmin, 2),
        "daily_wastage_m3": daily_wastage_m3,
        "annual_wastage_m3": annual_wastage_m3,
        "daily_pumping_kwh": daily_pumping_kwh,
        "annual_pumping_kwh": annual_pumping_kwh,
        "water_cost_inr": annual_water_cost_inr,
        "energy_cost_inr": annual_energy_cost_inr,
        "total_annual_cost_inr": total_annual_cost_inr,
        "service_type": service_type
    }

def evaluate_slurry_pipeline_risk(
    pipe_schedule: str,
    nominal_wall_thickness_mm: float,
    measured_residual_wall_thickness_mm: float,
    slurry_specific_gravity: float = 1.35,
    line_pressure_bar: float = 8.0,
    has_visible_spill: bool = False
) -> Dict:
    """
    Slurry pipeline mechanical integrity and wear evaluation.
    Slurry lines operate with high abrasive wear and dynamic solids loading.
    Standard water sensors are never rated for abrasive slurry service!
    """
    if nominal_wall_thickness_mm <= 0:
        return {"error": "Invalid nominal wall thickness"}

    loss_pct = ((nominal_wall_thickness_mm - measured_residual_wall_thickness_mm) / nominal_wall_thickness_mm) * 100.0
    loss_pct = round(max(0.0, loss_pct), 1)

    # API 570 / ASME B31.11 Slurry Transportation Piping thresholds
    if has_visible_spill or loss_pct > 60.0:
        risk_level = "CRITICAL_RUPTURE_RISK"
        priority = "P1 - IMMEDIATE"
        action = "Isolate line immediately. Severe slurry blowout risk with environmental containment failure."
    elif loss_pct > 35.0:
        risk_level = "HIGH_WEAR"
        priority = "P2 - 24 HOURS"
        action = "Schedule spool piece rotation (180 deg) or clamp installation during next shift change."
    elif loss_pct > 20.0:
        risk_level = "MODERATE_EROSION"
        priority = "P3 - SCHEDULED SHUTDOWN"
        action = "Flag for ultrasonic thickness gauging re-inspection in 30 days."
    else:
        risk_level = "NORMAL_CONDITION"
        priority = "P4 - MONITOR"
        action = "Routine inspection within acceptable design wear allowance."

    return {
        "wall_loss_pct": loss_pct,
        "residual_thickness_mm": round(measured_residual_wall_thickness_mm, 2),
        "risk_level": risk_level,
        "maintenance_priority": priority,
        "recommended_action": action,
        "sensor_note": "Inspection performed using non-intrusive ultrasonic gauge and certified slurry plant transmitter."
    }

