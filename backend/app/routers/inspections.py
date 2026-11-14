"""
SafeScout MINE-ENERGY - Inspection Findings & Defect Logbook Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from typing import List, Optional
import time
from datetime import datetime

from backend.app.database import get_db
from backend.app.models import Inspection
from backend.app.schemas import InspectionCreate, InspectionUpdate, InspectionResponse
from backend.app.robotics.slam_engine import slam_engine

router = APIRouter(prefix="/api/inspections", tags=["Inspections"])

@router.post("", response_model=InspectionResponse)
async def create_inspection_finding(data: InspectionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new industrial inspection record and tag location on SLAM map."""
    inspection_code = f"INSP-{int(time.time())}"
    
    # Instantiate record
    record = Inspection(
        inspection_code=inspection_code,
        timestamp=datetime.utcnow(),
        site_name=data.site_name,
        zone_name=data.zone_name,
        equipment_id=data.equipment_id,
        location_x=data.location_x,
        location_y=data.location_y,
        heading_deg=data.heading_deg,
        fault_type=data.fault_type,
        severity=data.severity,
        detection_method=data.detection_method,
        confidence_score=data.confidence_score,
        measured_values=data.measured_values,
        estimated_power_loss_kw=data.estimated_power_loss_kw,
        estimated_energy_loss_kwh_day=data.estimated_energy_loss_kwh_day,
        potential_annual_saving_kwh=data.potential_annual_saving_kwh,
        annual_financial_saving_inr=data.annual_financial_saving_inr,
        maintenance_priority=data.maintenance_priority,
        confirmation_status="SUSPECTED",
        repair_status="PENDING",
        verified_saving_kwh=0.0,
        operator_remarks=data.operator_remarks or ""
    )

    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Tag on SLAM engine
    slam_engine.add_inspection_marker({
        "id": record.id,
        "code": record.inspection_code,
        "x": record.location_x,
        "y": record.location_y,
        "fault": record.fault_type,
        "severity": record.severity
    })

    return record

@router.get("", response_model=List[InspectionResponse])
async def list_inspections(
    site: Optional[str] = None,
    zone: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Query inspection logbook with zone, site, and confirmation status filters."""
    query = select(Inspection).order_by(Inspection.timestamp.desc())
    if site:
        query = query.where(Inspection.site_name == site)
    if zone:
        query = query.where(Inspection.zone_name == zone)
    if status:
        query = query.where(Inspection.confirmation_status == status)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{inspection_id}", response_model=InspectionResponse)
async def get_inspection(inspection_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch specific inspection details."""
    record = await db.get(Inspection, inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    return record

@router.patch("/{inspection_id}", response_model=InspectionResponse)
async def update_inspection(
    inspection_id: int,
    data: InspectionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Operator status confirmation, repair workflow sign-off, and verified savings entry.
    """
    record = await db.get(Inspection, inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found")

    if data.confirmation_status is not None:
        record.confirmation_status = data.confirmation_status
    if data.repair_status is not None:
        record.repair_status = data.repair_status
        if data.repair_status == "VERIFIED":
            record.repaired_at = datetime.utcnow()
    if data.verified_saving_kwh is not None:
        record.verified_saving_kwh = data.verified_saving_kwh
    if data.operator_remarks is not None:
        record.operator_remarks = data.operator_remarks

    await db.commit()
    await db.refresh(record)
    return record

@router.delete("/{inspection_id}")
async def delete_inspection(inspection_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an inspection finding."""
    record = await db.get(Inspection, inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    await db.delete(record)
    await db.commit()
    return {"status": "DELETED", "id": inspection_id}

