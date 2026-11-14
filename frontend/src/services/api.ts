/**
 * SafeScout MINE-ENERGY - REST API Client
 */

import { InspectionItem, EnergySummary, SystemSettings } from '../types';

const API_BASE = '/api';

export const api = {
  // Telemetry
  getLiveTelemetry: async () => {
    const res = await fetch(`${API_BASE}/telemetry/live`);
    if (!res.ok) throw new Error('Failed to fetch telemetry');
    return res.json();
  },

  // Rover Control
  moveRover: async (vx: number, omega: number, speed_pct: number = 60) => {
    const res = await fetch(`${API_BASE}/control/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vx, omega, speed_pct })
    });
    return res.json();
  },

  emergencyStop: async () => {
    const res = await fetch(`${API_BASE}/control/estop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: true })
    });
    return res.json();
  },

  resetEmergencyStop: async () => {
    const res = await fetch(`${API_BASE}/control/reset_estop`, {
      method: 'POST'
    });
    return res.json();
  },

  // Camera
  captureSnapshot: async () => {
    const res = await fetch(`${API_BASE}/camera/save_snapshot`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to save snapshot');
    return res.json();
  },

  // LiDAR & SLAM
  getLidarScan: async () => {
    const res = await fetch(`${API_BASE}/lidar/scan`);
    return res.json();
  },

  getSlamMap: async () => {
    const res = await fetch(`${API_BASE}/lidar/map`);
    return res.json();
  },

  clearSlamMap: async () => {
    const res = await fetch(`${API_BASE}/lidar/clear`, { method: 'POST' });
    return res.json();
  },

  // Ventilation
  calculateVentilation: async (data: any) => {
    const res = await fetch(`${API_BASE}/ventilation/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  saveVentilationSurvey: async (data: any) => {
    const res = await fetch(`${API_BASE}/ventilation/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getVentilationSurveys: async () => {
    const res = await fetch(`${API_BASE}/ventilation/surveys`);
    return res.json();
  },

  // Compressed Air
  calculateCompressedAir: async (data: any) => {
    const res = await fetch(`${API_BASE}/acoustic/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Water & Slurry Pipelines
  calculateWaterPipeline: async (data: any) => {
    const res = await fetch(`${API_BASE}/pipeline/water/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  evaluateSlurryLine: async (data: any) => {
    const res = await fetch(`${API_BASE}/pipeline/slurry/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Energy
  getEnergySummary: async (): Promise<EnergySummary> => {
    const res = await fetch(`${API_BASE}/energy/summary`);
    if (!res.ok) throw new Error('Failed to fetch energy summary');
    return res.json();
  },

  getZoneBreakdown: async () => {
    const res = await fetch(`${API_BASE}/energy/zone_breakdown`);
    return res.json();
  },

  // Inspections
  getInspections: async (filter?: { zone?: string; status?: string }): Promise<InspectionItem[]> => {
    const params = new URLSearchParams();
    if (filter?.zone) params.append('zone', filter.zone);
    if (filter?.status) params.append('status', filter.status);
    const res = await fetch(`${API_BASE}/inspections?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch inspections');
    return res.json();
  },

  createInspection: async (data: Partial<InspectionItem>) => {
    const res = await fetch(`${API_BASE}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateInspection: async (id: number, data: Partial<InspectionItem>) => {
    const res = await fetch(`${API_BASE}/inspections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteInspection: async (id: number) => {
    const res = await fetch(`${API_BASE}/inspections/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Settings
  getSettings: async (): Promise<SystemSettings> => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  updateSettings: async (data: Partial<SystemSettings>) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};

