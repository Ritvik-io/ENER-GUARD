"""
SafeScout MINE-ENERGY - Ventilation Monitoring & Traverse Calculation Router
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
import time

from backend.app.database import get_db
from backend.app.models import VentilationSurvey
from backend.app.schemas import VentilationCalcRequest
from backend.app.calculations.ventilation_calc import (
    calculate_air_density,
    calculate_pitot_velocity,
    calculate_airway_area,
    calculate_traverse_average,
    evaluate_ventilation_compliance
)

router = APIRouter(prefix="/api/ventilation", tags=["Ventilation Monitoring"])

@router.post("/calculate")
async def calculate_ventilation_parameters(req: VentilationCalcRequest):
    """
    Calculate airway cross-sectional area, air density, representative velocity,
    volumetric airflow (Q = A * V), compliance against required setpoints, and fan energy savings.
    """
    # 1. Air density
    rho = calculate_air_density(
        temp_celsius=req.air_temp_c,
        barometric_pressure_pa=req.barometric_pressure_pa,
        relative_humidity_pct=req.relative_humidity_pct
    )

    # 2. Airway area
    area = calculate_airway_area(req.shape, req.width_m, req.height_m)

    # 3. Velocity (Single reading or Traverse average)
    if req.traverse_readings and len(req.traverse_readings) > 0:
        trav_res = calculate_traverse_average(req.traverse_readings, rho)
        avg_v = trav_res["avg_velocity_ms"]
        traverse_info = trav_res
    else:
        avg_v = calculate_pitot_velocity(req.diff_pressure_pa, rho)
        traverse_info = {
            "avg_velocity_ms": avg_v,
            "min_velocity_ms": avg_v,
            "max_velocity_ms": avg_v,
            "points_count": 1,
            "note": "Single-point centerline measurement. Consider multi-point traverse survey for regulatory sign-off."
        }

    # 4. Compliance & Avoidable Energy Assessment
    compliance = evaluate_ventilation_compliance(
        measured_velocity_ms=avg_v,
        airway_area_m2=area,
        required_airflow_m3s=req.required_airflow_m3s,
        fan_electrical_power_kw=req.fan_electrical_power_kw
    )

    return {
        "air_density_kg_m3": rho,
        "airway_area_m2": area,
        "calculated_velocity_ms": avg_v,
        "traverse_summary": traverse_info,
        "compliance": compliance
    }

@router.post("/surveys")
async def save_ventilation_survey(req: VentilationCalcRequest, db: AsyncSession = Depends(get_db)):
    """Save an official multi-point ventilation airway survey to SQLite."""
    calc_res = await calculate_ventilation_parameters(req)
    comp = calc_res["compliance"]
    
    survey_code = f"VENT-{int(time.time())}"
    survey = VentilationSurvey(
        survey_code=survey_code,
        airway_shape=req.shape,
        width_m=req.width_m,
        height_m=req.height_m,
        area_m2=calc_res["airway_area_m2"],
        required_airflow_m3s=req.required_airflow_m3s,
        traverse_points_count=calc_res["traverse_summary"]["points_count"],
        diff_pressure_pa=req.diff_pressure_pa,
        air_density_kg_m3=calc_res["air_density_kg_m3"],
        calculated_velocity_ms=calc_res["calculated_velocity_ms"],
        measured_airflow_m3s=comp["measured_airflow_m3s"],
        airflow_deviation_pct=comp["airflow_deviation_pct"],
        fan_electrical_power_kw=req.fan_electrical_power_kw or 0.0,
        compliance_status=comp["compliance_status"],
        remarks=comp["remarks"]
    )
    db.add(survey)
    await db.commit()
    await db.refresh(survey)
    return survey

@router.get("/surveys")
async def list_ventilation_surveys(db: AsyncSession = Depends(get_db)):
    """Fetch ventilation survey history."""
    result = await db.execute(select(VentilationSurvey).order_by(VentilationSurvey.timestamp.desc()).limit(20))
    return result.scalars().all()

