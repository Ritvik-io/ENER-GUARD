"""
SafeScout MINE-ENERGY - Energy Conservation Analysis Router
Keeps potential energy savings strictly separate from verified achieved savings.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, List

from backend.app.database import get_db
from backend.app.models import Inspection, VentilationSurvey

router = APIRouter(prefix="/api/energy", tags=["Energy Conservation"])

@router.get("/summary")
async def get_energy_summary(db: AsyncSession = Depends(get_db)):
    """
    Returns high-level plant energy conservation indicators,
    potential vs verified savings, leak counts, and top priority maintenance items.
    """
    # 1. Fetch all inspections
    insp_res = await db.execute(select(Inspection))
    inspections = insp_res.scalars().all()

    # 2. Fetch latest ventilation survey
    vent_res = await db.execute(select(VentilationSurvey).order_by(VentilationSurvey.timestamp.desc()).limit(1))
    latest_vent = vent_res.scalars().first()

    # Metrics aggregation
    suspected_air_leaks = 0
    suspected_water_leaks = 0
    total_potential_kwh_day = 0.0
    total_potential_annual_kwh = 0.0
    total_potential_annual_inr = 0.0
    total_verified_savings_kwh = 0.0
    daily_water_wastage_liters = 0.0

    high_priority_actions = []

    for item in inspections:
        if item.fault_type == "COMPRESSED_AIR_LEAK":
            suspected_air_leaks += 1
        elif item.fault_type == "WATER_LEAK":
            suspected_water_leaks += 1
            flow_lmin = item.measured_values.get("flow_lmin", 10.0)
            daily_water_wastage_liters += (flow_lmin * 60 * 24)

        # Potential vs Verified
        total_potential_kwh_day += (item.estimated_energy_loss_kwh_day or 0.0)
        total_potential_annual_kwh += (item.potential_annual_saving_kwh or 0.0)
        total_potential_annual_inr += (item.annual_financial_saving_inr or 0.0)
        total_verified_savings_kwh += (item.verified_saving_kwh or 0.0)

        # High priority filter
        if item.maintenance_priority in ["P1 - IMMEDIATE", "P2 - 24 HOURS"] and item.repair_status != "VERIFIED":
            high_priority_actions.append({
                "id": item.id,
                "code": item.inspection_code,
                "equipment": item.equipment_id,
                "zone": item.zone_name,
                "fault": item.fault_type,
                "priority": item.maintenance_priority,
                "power_loss_kw": item.estimated_power_loss_kw,
                "potential_annual_inr": item.annual_financial_saving_inr,
                "status": item.repair_status
            })

    ventilation_status = "NOT_ASSESSED"
    if latest_vent:
        ventilation_status = latest_vent.compliance_status

    return {
        "suspected_compressed_air_leaks": suspected_air_leaks,
        "suspected_water_leaks": suspected_water_leaks,
        "ventilation_status": ventilation_status,
        "estimated_avoidable_electricity_kwh_day": round(total_potential_kwh_day, 1),
        "estimated_annual_savings_inr": round(total_potential_annual_inr, 2),
        "potential_annual_kwh": round(total_potential_annual_kwh, 1),
        "water_wastage_liters_day": round(daily_water_wastage_liters, 1),
        "verified_achieved_savings_kwh": round(total_verified_savings_kwh, 1),
        "high_priority_actions": high_priority_actions[:5],
        "total_active_inspections": len(inspections)
    }

@router.get("/zone_breakdown")
async def get_zone_breakdown(db: AsyncSession = Depends(get_db)):
    """Group energy loss and leak distribution by mine/plant zone."""
    insp_res = await db.execute(select(Inspection))
    inspections = insp_res.scalars().all()

    zones: Dict[str, Dict[str, Any]] = {}
    for item in inspections:
        z = item.zone_name or "General Area"
        if z not in zones:
            zones[z] = {
                "zone_name": z,
                "leak_count": 0,
                "potential_annual_kwh": 0.0,
                "potential_annual_inr": 0.0,
                "verified_kwh": 0.0
            }
        zones[z]["leak_count"] += 1
        zones[z]["potential_annual_kwh"] += (item.potential_annual_saving_kwh or 0.0)
        zones[z]["potential_annual_inr"] += (item.annual_financial_saving_inr or 0.0)
        zones[z]["verified_kwh"] += (item.verified_saving_kwh or 0.0)

    return list(zones.values())

