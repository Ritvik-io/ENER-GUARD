"""
Unit Tests for Ventilation Aerodynamic Calculations
"""

import pytest
from backend.app.calculations.ventilation_calc import (
    calculate_air_density,
    calculate_pitot_velocity,
    calculate_airway_area,
    calculate_traverse_average,
    evaluate_ventilation_compliance
)

def test_air_density():
    # 20°C, 101325 Pa, 50% RH
    rho = calculate_air_density(20.0, 101325.0, 50.0)
    assert 1.18 < rho < 1.22

def test_pitot_velocity():
    # Delta P = 50 Pa, rho = 1.204 kg/m3
    # V = sqrt(2 * 50 / 1.204) = sqrt(83.056) = 9.11 m/s
    v = calculate_pitot_velocity(50.0, 1.204)
    assert abs(v - 9.11) < 0.05
    
    # Delta P <= 0
    assert calculate_pitot_velocity(0.0, 1.204) == 0.0
    assert calculate_pitot_velocity(-5.0, 1.204) == 0.0

def test_airway_area():
    # Rectangular: 4m x 3m = 12 m2
    assert calculate_airway_area("RECTANGULAR", 4.0, 3.0) == 12.0
    
    # Circular: diameter 2m (radius 1m) -> pi * 1^2 = 3.142 m2
    assert abs(calculate_airway_area("CIRCULAR", 2.0, 2.0) - 3.142) < 0.01

def test_traverse_average():
    # 3 points: 20 Pa, 50 Pa, 80 Pa
    res = calculate_traverse_average([20.0, 50.0, 80.0], 1.204)
    assert res["points_count"] == 3
    assert res["min_velocity_ms"] < res["avg_velocity_ms"] < res["max_velocity_ms"]

def test_ventilation_compliance():
    # Area = 10 m2, Velocity = 5 m/s -> Q = 50 m3/s. Required = 50 m3/s -> 0% deviation, COMPLIANT
    res = evaluate_ventilation_compliance(5.0, 10.0, 50.0)
    assert res["measured_airflow_m3s"] == 50.0
    assert res["airflow_deviation_pct"] == 0.0
    assert res["compliance_status"] == "COMPLIANT"
    
    # Area = 10 m2, Velocity = 3 m/s -> Q = 30 m3/s. Required = 50 m3/s -> -40% deviation, DEFICIT_HAZARD
    res_def = evaluate_ventilation_compliance(3.0, 10.0, 50.0)
    assert res_def["compliance_status"] == "DEFICIT_HAZARD"

