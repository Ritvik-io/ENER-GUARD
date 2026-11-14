"""
Unit Tests for Energy Conservation Calculations
"""

import pytest
from backend.app.calculations.compressed_air_calc import (
    calculate_orifice_cfm,
    calculate_compressed_air_energy_loss,
    ultrasonic_decibel_to_estimated_cfm
)
from backend.app.calculations.water_slurry_calc import (
    calculate_water_leakage_and_energy,
    evaluate_slurry_pipeline_risk
)

def test_orifice_cfm_calculation():
    # 2mm orifice at 6 bar
    cfm = calculate_orifice_cfm(2.0, 6.0)
    assert cfm > 3.0 and cfm < 8.0
    
    # 0mm orifice
    assert calculate_orifice_cfm(0, 6.0) == 0.0

def test_compressed_air_power_and_financials():
    # 10 CFM leak at 0.20 kW/CFM, 24h/day, 350 days, 8.50 INR/kWh
    res = calculate_compressed_air_energy_loss(
        leakage_flow_cfm=10.0,
        compressor_specific_power_kw_per_cfm=0.20,
        daily_operating_hours=24.0,
        annual_operating_days=350,
        electricity_tariff_inr_per_kwh=8.50
    )
    
    # Power = 10 * 0.20 = 2.0 kW
    assert res["power_loss_kw"] == 2.0
    # Daily kWh = 2.0 * 24 = 48.0 kWh/day
    assert res["energy_loss_kwh_day"] == 48.0
    # Annual kWh = 48 * 350 = 16,800 kWh
    assert res["annual_energy_loss_kwh"] == 16800.0
    # Annual Cost = 16800 * 8.50 = 142,800 INR
    assert res["annual_cost_inr"] == 142800.0

def test_uncalibrated_ultrasound_disclaimer():
    # Uncalibrated 70 dB reading
    res = ultrasonic_decibel_to_estimated_cfm(70.0, 6.0, is_calibrated=False)
    assert res["is_calibrated"] is False
    assert "Uncalibrated" in res["note"]

def test_water_leakage_and_pumping_energy():
    # 10 L/min leak, 0.65 kWh/m3 pump specific energy, 24h, 350 days
    # Daily volume = 10 * 60 * 24 / 1000 = 14.4 m3/day
    res = calculate_water_leakage_and_energy(
        leakage_flow_lmin=10.0,
        pump_specific_energy_kwh_per_m3=0.65,
        daily_operating_hours=24.0,
        annual_operating_days=350,
        water_tariff_inr_per_m3=45.0,
        electricity_tariff_inr_per_kwh=8.50
    )
    
    assert res["daily_wastage_m3"] == 14.4
    # Daily pumping = 14.4 * 0.65 = 9.36 kWh/day
    assert res["daily_pumping_kwh"] == 9.36
    # Annual water volume = 14.4 * 350 = 5040.0 m3
    assert res["annual_wastage_m3"] == 5040.0
    # Annual water cost = 5040 * 45 = 226,800 INR
    assert res["water_cost_inr"] == 226800.0
    # Annual pumping energy = 9.36 * 350 = 3276.0 kWh
    assert res["annual_pumping_kwh"] == 3276.0
    # Annual energy cost = 3276 * 8.50 = 27846 INR
    assert res["energy_cost_inr"] == 27846.0
    # Total cost = 226800 + 27846 = 254646 INR
    assert res["total_annual_cost_inr"] == 254646.0

def test_slurry_pipeline_risk():
    # 50% wall thickness loss
    res = evaluate_slurry_pipeline_risk("Sch 80", 12.0, 5.0)
    assert res["wall_loss_pct"] == 58.3
    assert res["risk_level"] == "HIGH_WEAR"

