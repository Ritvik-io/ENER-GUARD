"""
SafeScout MINE-ENERGY - Water & Slurry Pipeline Inspection Router
"""

from fastapi import APIRouter
from backend.app.schemas import WaterPipelineCalcRequest, SlurryEvaluationRequest
from backend.app.calculations.water_slurry_calc import (
    calculate_water_leakage_and_energy,
    evaluate_slurry_pipeline_risk,
    SUPPORTED_WATER_SERVICES,
    SLURRY_DEFECT_TYPES
)

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline Inspection"])

@router.get("/services")
async def get_supported_services():
    return {
        "water_services": SUPPORTED_WATER_SERVICES,
        "slurry_defects": SLURRY_DEFECT_TYPES
    }

@router.post("/water/calculate")
async def calculate_water_pipeline_leakage(req: WaterPipelineCalcRequest):
    """
    Calculate water volume loss (m3/day), pumping energy loss (kWh/day),
    and annual financial cost (₹).
    """
    res = calculate_water_leakage_and_energy(
        leakage_flow_lmin=req.leakage_flow_lmin,
        pump_specific_energy_kwh_per_m3=req.pump_specific_energy_kwh_per_m3,
        daily_operating_hours=req.operating_hours_day,
        annual_operating_days=req.operating_days_year,
        water_tariff_inr_per_m3=req.water_tariff_inr_per_m3,
        electricity_tariff_inr_per_kwh=req.tariff_inr_per_kwh,
        service_type=req.service_type
    )
    return res

@router.post("/slurry/evaluate")
async def evaluate_slurry_line(req: SlurryEvaluationRequest):
    """
    Slurry pipeline mechanical integrity, ultrasonic wall thinning loss %, and blowout risk.
    """
    res = evaluate_slurry_pipeline_risk(
        pipe_schedule=req.pipe_schedule,
        nominal_wall_thickness_mm=req.nominal_wall_thickness_mm,
        measured_residual_wall_thickness_mm=req.measured_wall_thickness_mm,
        slurry_specific_gravity=req.slurry_specific_gravity,
        line_pressure_bar=req.line_pressure_bar,
        has_visible_spill=req.has_visible_spill
    )
    return res

