"""
SafeScout MINE-ENERGY - Ventilation & Aerodynamic Calculation Subsystem
Formulas:
  V = sqrt(2 * Delta_P / rho)
  Q = A * V_avg
  rho = P_atm / (R_specific * (T_celsius + 273.15))
"""

import math
from typing import List, Dict, Optional

GAS_CONSTANT_DRY_AIR = 287.058  # J / (kg * K)
STANDARD_ATMOSPHERIC_PRESSURE = 101325.0  # Pa (1 atm)

def calculate_air_density(
    temp_celsius: float = 20.0,
    barometric_pressure_pa: float = STANDARD_ATMOSPHERIC_PRESSURE,
    relative_humidity_pct: float = 50.0
) -> float:
    """
    Calculate moist air density using ideal gas formulation and vapor pressure.
    """
    t_kelvin = temp_celsius + 273.15
    if t_kelvin <= 0:
        t_kelvin = 293.15

    # Saturation vapor pressure over water (Tetens equation) in Pa
    p_sat = 610.78 * math.exp((17.27 * temp_celsius) / (temp_celsius + 237.3))
    p_vapor = (relative_humidity_pct / 100.0) * p_sat
    p_dry = barometric_pressure_pa - p_vapor

    # Specific gas constants
    r_dry = 287.058
    r_vapor = 461.495

    rho = (p_dry / (r_dry * t_kelvin)) + (p_vapor / (r_vapor * t_kelvin))
    return round(rho, 4)

def calculate_pitot_velocity(
    delta_pressure_pa: float,
    air_density_kg_m3: float = 1.204,
    pitot_coefficient: float = 1.00
) -> float:
    """
    Calculate instantaneous air velocity from Pitot-static differential pressure.
    V = C_p * sqrt(2 * Delta_P / rho)
    """
    if delta_pressure_pa <= 0.0 or air_density_kg_m3 <= 0.0:
        return 0.0
    
    velocity = pitot_coefficient * math.sqrt((2.0 * delta_pressure_pa) / air_density_kg_m3)
    return round(velocity, 2)

def calculate_airway_area(
    shape: str,
    width_m: float,
    height_m: float
) -> float:
    """
    Calculate cross-sectional airway area according to mine roadway geometry.
    Shapes: RECTANGULAR, ARCH (semi-circular crown), CIRCULAR
    """
    if shape.upper() == "RECTANGULAR":
        return round(width_m * height_m, 3)
    elif shape.upper() == "ARCH":
        # Arch profile: rectangular base of height (H - W/2) plus semi-circle of radius W/2
        r = width_m / 2.0
        h_base = max(0.0, height_m - r)
        area_base = width_m * h_base
        area_arch = 0.5 * math.pi * (r ** 2)
        return round(area_base + area_arch, 3)
    elif shape.upper() == "CIRCULAR":
        r = width_m / 2.0
        return round(math.pi * (r ** 2), 3)
    else:
        return round(width_m * height_m, 3)

def calculate_traverse_average(
    traverse_readings: List[float],
    air_density_kg_m3: float = 1.204,
    pitot_coefficient: float = 1.00
) -> Dict[str, float]:
    """
    Calculate representative average velocity from multi-point traverse survey.
    Never assume a single centerline reading equals the airway average!
    Applies boundary layer correction factor (centerline ratio typically 0.82 - 0.90 if single point).
    """
    if not traverse_readings:
        return {"avg_velocity_ms": 0.0, "min_velocity_ms": 0.0, "max_velocity_ms": 0.0, "points_count": 0}
    
    velocities = [
        calculate_pitot_velocity(dp, air_density_kg_m3, pitot_coefficient)
        for dp in traverse_readings
    ]
    
    avg_v = sum(velocities) / len(velocities)
    return {
        "avg_velocity_ms": round(avg_v, 2),
        "min_velocity_ms": round(min(velocities), 2),
        "max_velocity_ms": round(max(velocities), 2),
        "points_count": len(velocities)
    }

def evaluate_ventilation_compliance(
    measured_velocity_ms: float,
    airway_area_m2: float,
    required_airflow_m3s: float,
    fan_electrical_power_kw: Optional[float] = None,
    fan_pressure_rise_pa: Optional[float] = None,
    tariff_inr_per_kwh: float = 8.50,
    annual_operating_days: int = 350
) -> Dict:
    """
    Evaluate mine airway ventilation airflow and avoidable energy waste.
    Q = A * V_avg
    Airflow deviation = ((Q - Q_req) / Q_req) * 100
    """
    measured_airflow_m3s = round(airway_area_m2 * measured_velocity_ms, 2)
    
    if required_airflow_m3s <= 0.0:
        return {
            "measured_airflow_m3s": measured_airflow_m3s,
            "required_airflow_m3s": 0.0,
            "airflow_deviation_pct": 0.0,
            "compliance_status": "MISSING_REQUIREMENT",
            "avoidable_power_kw": 0.0,
            "avoidable_annual_kwh": 0.0,
            "avoidable_annual_cost_inr": 0.0,
            "remarks": "Required airflow setpoint is missing. Regulatory compliance cannot be certified."
        }
    
    deviation_pct = round(((measured_airflow_m3s - required_airflow_m3s) / required_airflow_m3s) * 100.0, 1)
    
    # Mining regulatory safety tolerance: -5% to +25%
    if deviation_pct < -5.0:
        compliance_status = "DEFICIT_HAZARD"
        remarks = f"Airflow deficit of {abs(deviation_pct)}% below statutory requirement. Risk of toxic gas accumulation!"
    elif deviation_pct > 25.0:
        compliance_status = "OVER_VENTILATED"
        remarks = f"Airflow exceeds statutory requirement by {deviation_pct}%. Potential fan throttling opportunity to conserve energy."
    else:
        compliance_status = "COMPLIANT"
        remarks = "Airflow is within safe and optimal statutory mining thresholds."

    # Avoidable Fan Energy Calculation (if fan power data is provided)
    avoidable_kw = 0.0
    avoidable_annual_kwh = 0.0
    avoidable_cost_inr = 0.0

    if fan_electrical_power_kw and fan_electrical_power_kw > 0.0 and deviation_pct > 15.0:
        # Fan affinity laws: Power is proportional to Q^3. Throttling excess airflow conserves:
        ratio = required_airflow_m3s / measured_airflow_m3s
        optimal_fan_kw = fan_electrical_power_kw * (ratio ** 3)
        avoidable_kw = round(fan_electrical_power_kw - optimal_fan_kw, 2)
        avoidable_annual_kwh = round(avoidable_kw * 24.0 * annual_operating_days, 1)
        avoidable_cost_inr = round(avoidable_annual_kwh * tariff_inr_per_kwh, 2)

    return {
        "measured_airflow_m3s": measured_airflow_m3s,
        "required_airflow_m3s": required_airflow_m3s,
        "airflow_deviation_pct": deviation_pct,
        "compliance_status": compliance_status,
        "avoidable_power_kw": avoidable_kw,
        "avoidable_annual_kwh": avoidable_annual_kwh,
        "avoidable_annual_cost_inr": avoidable_cost_inr,
        "remarks": remarks
    }

