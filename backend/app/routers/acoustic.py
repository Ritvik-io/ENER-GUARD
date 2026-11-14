"""
SafeScout MINE-ENERGY - Compressed Air Leakage & 40 kHz Acoustic Router
"""

from fastapi import APIRouter
from backend.app.schemas import CompressedAirCalcRequest
from backend.app.calculations.compressed_air_calc import (
    calculate_compressed_air_energy_loss,
    ultrasonic_decibel_to_estimated_cfm,
    calculate_orifice_cfm
)
from backend.app.ai.acoustic_analyzer import acoustic_analyzer

router = APIRouter(prefix="/api/acoustic", tags=["Compressed Air Leakage"])

@router.post("/calculate")
async def calculate_compressed_air_leakage(req: CompressedAirCalcRequest):
    """
    Calculate power loss, energy loss (kWh/day), and financial loss (₹/year).
    Clearly reports whether CFM was entered by operator or estimated from uncalibrated ultrasound.
    """
    if req.calibrated_cfm is not None and req.calibrated_cfm > 0:
        cfm = req.calibrated_cfm
        cfm_source = "OPERATOR_VALIDATED"
        is_calibrated = True
        confidence = 0.95
        note = "Validated CFM flow entry."
    else:
        # Acoustic lookup
        ac_res = ultrasonic_decibel_to_estimated_cfm(
            ultrasonic_db_spl=req.ultrasonic_db_spl,
            line_pressure_bar=req.line_pressure_bar,
            is_calibrated=False
        )
        cfm = ac_res["estimated_cfm"] or 0.0
        cfm_source = "UNSCALED_ACOUSTIC_ESTIMATE"
        is_calibrated = ac_res["is_calibrated"]
        confidence = ac_res["confidence"]
        note = ac_res["note"]

    # Compute energy loss
    energy_loss = calculate_compressed_air_energy_loss(
        leakage_flow_cfm=cfm,
        compressor_specific_power_kw_per_cfm=req.compressor_specific_power_kw_per_cfm,
        daily_operating_hours=req.operating_hours_day,
        annual_operating_days=req.operating_days_year,
        electricity_tariff_inr_per_kwh=req.tariff_inr_per_kwh
    )

    return {
        "cfm": cfm,
        "cfm_source": cfm_source,
        "is_calibrated": is_calibrated,
        "confidence": confidence,
        "note": note,
        "energy_impact": energy_loss
    }

@router.post("/orifice_estimate")
async def estimate_orifice_cfm(diameter_mm: float, pressure_bar: float):
    """Calculate theoretical choked orifice discharge CFM."""
    cfm = calculate_orifice_cfm(diameter_mm, pressure_bar)
    return {
        "diameter_mm": diameter_mm,
        "pressure_bar": pressure_bar,
        "orifice_leakage_cfm": cfm
    }

