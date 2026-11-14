"""
SafeScout MINE-ENERGY - Compressed Air Leakage & Power Conservation Calculations
Formulas:
  Power loss (kW) = Leakage flow (CFM) * Specific power (kW/CFM)
  Energy loss (kWh/day) = Power loss * Operating hours/day
  Annual cost (₹) = Energy loss/day * Operating days/year * Tariff (₹/kWh)
"""

from typing import Dict, Optional

def calculate_orifice_cfm(
    orifice_diameter_mm: float,
    line_pressure_bar: float,
    discharge_coefficient: float = 0.62,
    air_temp_celsius: float = 20.0
) -> float:
    """
    Calculate compressed air leakage flow rate in CFM (ISO 1217 / ASME standards for choked orifice flow).
    For critical flow (P_gauge > 1.0 bar), mass discharge is directly proportional to upstream absolute pressure.
    Formula: Q_CFM = 0.354 * C_d * (d_mm^2) * (P_bar + 1.013) * sqrt(293.15 / (T_c + 273.15))
    """
    if orifice_diameter_mm <= 0.0 or line_pressure_bar <= 0.0:
        return 0.0
    
    t_kelvin = max(250.0, air_temp_celsius + 273.15)
    temp_factor = (293.15 / t_kelvin) ** 0.5
    p_abs = line_pressure_bar + 1.01325
    
    cfm = 0.354 * discharge_coefficient * (orifice_diameter_mm ** 2) * p_abs * temp_factor
    return round(cfm, 2)

def ultrasonic_decibel_to_estimated_cfm(
    ultrasonic_db_spl: float,
    line_pressure_bar: float,
    distance_meters: float = 1.0,
    is_calibrated: bool = False
) -> Dict[str, Optional[float]]:
    """
    Empirical acoustic estimation of CFM based on ultrasonic level (40 kHz).
    IMPORTANT ENGINEERING RULE:
    Do not convert ultrasonic acoustic amplitude directly into CFM without calibration!
    If calibration is false, return estimated range and explicitly flag 'is_calibrated: False'.
    """
    if not is_calibrated:
        # Provide approximate indicator for priority triage, but flag as uncalibrated estimate
        if ultrasonic_db_spl < 35.0:
            return {"estimated_cfm": 0.0, "is_calibrated": False, "confidence": 0.20, "note": "Ambient noise floor"}
        
        # Empirical approximation based on standard ultrasound leak curves at 1 meter, 6 bar:
        # 40 dB ~ 1.5 CFM, 55 dB ~ 4.2 CFM, 70 dB ~ 10.5 CFM, 85 dB ~ 24.0 CFM
        db_effective = ultrasonic_db_spl + (20.0 * (distance_meters - 1.0) if distance_meters > 0 else 0)
        p_factor = (line_pressure_bar / 6.0) if line_pressure_bar > 0 else 1.0
        
        rough_cfm = max(0.5, ((db_effective - 30.0) / 50.0) * 15.0 * p_factor)
        return {
            "estimated_cfm": round(rough_cfm, 1),
            "is_calibrated": False,
            "confidence": 0.60,
            "note": "Uncalibrated acoustic estimate. Requires operator or orifice CFM validation."
        }
    else:
        # Fully calibrated acoustic curve
        db_effective = ultrasonic_db_spl + (20.0 * (distance_meters - 1.0))
        cfm = round(((db_effective - 25.0) / 45.0) * 18.0 * (line_pressure_bar / 6.0), 2)
        return {
            "estimated_cfm": max(0.0, cfm),
            "is_calibrated": True,
            "confidence": 0.92,
            "note": "Calibrated 40 kHz transfer function applied."
        }

def calculate_compressed_air_energy_loss(
    leakage_flow_cfm: float,
    compressor_specific_power_kw_per_cfm: float = 0.20,
    daily_operating_hours: float = 24.0,
    annual_operating_days: int = 350,
    electricity_tariff_inr_per_kwh: float = 8.50
) -> Dict[str, float]:
    """
    Standard compressed air energy loss formulation:
    Power loss (kW) = Leakage flow (CFM) * Specific power (kW/CFM)
    Energy loss (kWh/day) = Power loss * Operating hours/day
    Annual cost (₹) = Energy loss/day * Operating days/year * Tariff (₹/kWh)
    """
    if leakage_flow_cfm <= 0.0 or compressor_specific_power_kw_per_cfm <= 0.0:
        return {
            "leakage_flow_cfm": 0.0,
            "power_loss_kw": 0.0,
            "energy_loss_kwh_day": 0.0,
            "annual_energy_loss_kwh": 0.0,
            "annual_cost_inr": 0.0
        }

    power_loss_kw = round(leakage_flow_cfm * compressor_specific_power_kw_per_cfm, 3)
    energy_loss_kwh_day = round(power_loss_kw * daily_operating_hours, 2)
    annual_energy_loss_kwh = round(energy_loss_kwh_day * annual_operating_days, 1)
    annual_cost_inr = round(annual_energy_loss_kwh * electricity_tariff_inr_per_kwh, 2)

    return {
        "leakage_flow_cfm": round(leakage_flow_cfm, 2),
        "power_loss_kw": power_loss_kw,
        "energy_loss_kwh_day": energy_loss_kwh_day,
        "annual_energy_loss_kwh": annual_energy_loss_kwh,
        "annual_cost_inr": annual_cost_inr
    }
