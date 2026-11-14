"""
SafeScout MINE-ENERGY - FastAPI Main Application Entrypoint
Title: SafeScout MINE-ENERGY
Subtitle: Intelligent Mine & Industrial Energy Monitoring System
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
from datetime import datetime, timezone

from backend.app.config import settings, SNAPSHOTS_DIR, DATA_DIR
from backend.app.database import init_db, AsyncSessionLocal
from backend.app.models import Inspection, VentilationSurvey
from backend.app.hardware.hardware_manager import hardware_manager

# Import Routers
from backend.app.routers import (
    telemetry,
    control,
    lidar,
    camera,
    ventilation,
    acoustic,
    pipeline,
    energy,
    inspections,
    reports,
    settings as settings_router
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("safescout.main")

async def seed_initial_data():
    """Seed initial realistic engineering audit findings if database is fresh."""
    async with AsyncSessionLocal() as session:
        from sqlalchemy.future import select
        res = await session.execute(select(Inspection))
        existing = res.scalars().all()
        if not existing:
            logger.info("Seeding initial industrial inspection findings...")
            sample_records = [
                Inspection(
                    inspection_code="INSP-2026-001",
                    site_name="Underground Mine Block-4",
                    zone_name="Main Dewatering Pump Station",
                    equipment_id="PUMP-DEWAT-01",
                    location_x=2.4,
                    location_y=-1.2,
                    heading_deg=45.0,
                    fault_type="WATER_LEAK",
                    severity="HIGH",
                    detection_method="RULE_BASED (Flow Deviation & Specular Wetness)",
                    confidence_score=0.88,
                    measured_values={"flow_lmin": 14.5, "line_pressure_bar": 4.2},
                    estimated_power_loss_kw=0.57,
                    estimated_energy_loss_kwh_day=13.68,
                    potential_annual_saving_kwh=4788.0,
                    annual_financial_saving_inr=77382.0,
                    maintenance_priority="P2 - 24 HOURS",
                    confirmation_status="CONFIRMED",
                    repair_status="PENDING",
                    verified_saving_kwh=0.0,
                    operator_remarks="Flange packing leak on 4-inch discharge spool. Replacement gasket staged."
                ),
                Inspection(
                    inspection_code="INSP-2026-002",
                    site_name="Underground Mine Block-4",
                    zone_name="Compressed Air Header East",
                    equipment_id="VALVE-AIR-104",
                    location_x=6.8,
                    location_y=1.5,
                    heading_deg=90.0,
                    fault_type="COMPRESSED_AIR_LEAK",
                    severity="MEDIUM",
                    detection_method="ACOUSTIC_FFT_SNR_RULE",
                    confidence_score=0.82,
                    measured_values={"ultrasonic_db": 68.5, "line_pressure_bar": 6.8, "cfm": 7.2},
                    estimated_power_loss_kw=1.44,
                    estimated_energy_loss_kwh_day=34.56,
                    potential_annual_saving_kwh=12096.0,
                    annual_financial_saving_inr=102816.0,
                    maintenance_priority="P2 - 24 HOURS",
                    confirmation_status="CONFIRMED",
                    repair_status="PENDING",
                    verified_saving_kwh=0.0,
                    operator_remarks="Audible leak at isolation ball valve stem packing."
                ),
                Inspection(
                    inspection_code="INSP-2026-003",
                    site_name="Underground Mine Block-4",
                    zone_name="Ventilation Trunk A",
                    equipment_id="AIRWAY-DRIFT-02",
                    location_x=-3.2,
                    location_y=4.5,
                    heading_deg=180.0,
                    fault_type="VENTILATION_DEFICIT",
                    severity="HIGH",
                    detection_method="BERNOULLI_PITOT_SURVEY",
                    confidence_score=0.92,
                    measured_values={"air_velocity_ms": 1.8, "diff_pressure_pa": 2.1, "area_m2": 12.0},
                    estimated_power_loss_kw=4.20,
                    estimated_energy_loss_kwh_day=100.8,
                    potential_annual_saving_kwh=35280.0,
                    annual_financial_saving_inr=299880.0,
                    maintenance_priority="P1 - IMMEDIATE",
                    confirmation_status="CONFIRMED",
                    repair_status="IN_PROGRESS",
                    verified_saving_kwh=0.0,
                    operator_remarks="Regulator door damaged, starving Sub-level 3 of required airflow."
                ),
                Inspection(
                    inspection_code="INSP-2026-004",
                    site_name="Underground Mine Block-4",
                    zone_name="Slurry Tailings Pipeline Trunk",
                    equipment_id="SLURRY-TAIL-08",
                    location_x=12.1,
                    location_y=3.2,
                    heading_deg=120.0,
                    fault_type="SLURRY_WEAR",
                    severity="HIGH",
                    detection_method="ULTRASONIC_WALL_GAUGE",
                    confidence_score=0.90,
                    measured_values={"residual_thickness_mm": 4.2, "nominal_thickness_mm": 12.0, "loss_pct": 65.0},
                    estimated_power_loss_kw=0.0,
                    estimated_energy_loss_kwh_day=0.0,
                    potential_annual_saving_kwh=0.0,
                    annual_financial_saving_inr=0.0,
                    maintenance_priority="P1 - IMMEDIATE",
                    confirmation_status="CONFIRMED",
                    repair_status="PENDING",
                    verified_saving_kwh=0.0,
                    operator_remarks="Severe invert erosion on 200mm slurry pipe. Immediate rotation/replacement needed."
                )
            ]
            for rec in sample_records:
                session.add(rec)
            await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SafeScout MINE-ENERGY Backend Engine...")
    await init_db()
    await seed_initial_data()
    hardware_manager.start()
    yield
    # Shutdown
    logger.info("Shutting down SafeScout MINE-ENERGY Backend Engine...")
    hardware_manager.stop()

app = FastAPI(
    title="SafeScout MINE-ENERGY API",
    description="Backend API for AI-Enabled IoT Rover for Mine Safety, Pipeline Inspection & Energy Conservation",
    version="2.1.0",
    lifespan=lifespan
)

# Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directories for Snapshots
app.mount("/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")

# Include Routers
app.include_router(telemetry.router)
app.include_router(control.router)
app.include_router(lidar.router)
app.include_router(camera.router)
app.include_router(ventilation.router)
app.include_router(acoustic.router)
app.include_router(pipeline.router)
app.include_router(energy.router)
app.include_router(inspections.router)
app.include_router(reports.router)
app.include_router(settings_router.router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "system": "SafeScout MINE-ENERGY",
        "version": "2.1.0",
        "simulation_mode": hardware_manager.simulation_mode,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# Mount static frontend build if present
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
