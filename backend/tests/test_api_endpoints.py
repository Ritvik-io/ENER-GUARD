"""
Unit & Integration Tests for SafeScout FastAPI Endpoints
"""

import pytest
from starlette.testclient import TestClient
from backend.app.main import app

def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "HEALTHY"
        assert data["system"] == "SafeScout MINE-ENERGY"

def test_telemetry_live():
    with TestClient(app) as client:
        response = client.get("/api/telemetry/live")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "environmental" in data
        assert "ventilation" in data
        assert "pipelines" in data

def test_ventilation_calculate():
    with TestClient(app) as client:
        payload = {
            "width_m": 4.0,
            "height_m": 3.0,
            "shape": "RECTANGULAR",
            "diff_pressure_pa": 50.0,
            "air_temp_c": 20.0,
            "required_airflow_m3s": 45.0
        }
        response = client.post("/api/ventilation/calculate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["airway_area_m2"] == 12.0
        assert data["calculated_velocity_ms"] > 8.0
        assert "compliance" in data

def test_compressed_air_calculate():
    with TestClient(app) as client:
        payload = {
            "ultrasonic_db_spl": 72.0,
            "line_pressure_bar": 6.5,
            "compressor_specific_power_kw_per_cfm": 0.20
        }
        response = client.post("/api/acoustic/calculate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_calibrated"] is False
        assert data["cfm"] > 0
        assert data["energy_impact"]["power_loss_kw"] > 0

def test_energy_summary():
    with TestClient(app) as client:
        response = client.get("/api/energy/summary")
        assert response.status_code == 200
        data = response.json()
        assert "suspected_compressed_air_leaks" in data
        assert "estimated_annual_savings_inr" in data
        assert "high_priority_actions" in data
