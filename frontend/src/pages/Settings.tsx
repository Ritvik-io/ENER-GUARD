import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Cpu, Radio, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    esp32_port: 'COM3',
    esp32_baud: 115200,
    ld19_port: 'COM4',
    ld19_baud: 230400,
    camera_stream_url: 'http://192.168.4.1/stream',
    simulation_mode: false,
    electricity_tariff_inr: 8.50,
    water_tariff_inr: 45.00,
    compressor_kw_cfm: 0.20,
    pump_kwh_m3: 0.65,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      alert('System configuration and hardware ports saved successfully!');
    } catch (e) {
      console.error('Save settings error', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Hardware Communication & System Settings</h2>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Configure serial ports, baud rates, network endpoints, tariffs, and simulation overrides.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-bold shadow"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Hardware Ports Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
          Hardware Interface Ports & Baud Rates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-600 block mb-1 font-semibold">ESP32 Rover Serial Port:</label>
            <input
              type="text"
              value={settings.esp32_port}
              onChange={(e) => setSettings({ ...settings, esp32_port: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              placeholder="/dev/ttyUSB1 or COM3"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Raspberry Pi USB or DevKit UART</span>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">ESP32 Baud Rate:</label>
            <select
              value={settings.esp32_baud}
              onChange={(e) => setSettings({ ...settings, esp32_baud: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
            >
              <option value="115200">115200 bps (Standard)</option>
              <option value="9600">9600 bps</option>
              <option value="230400">230400 bps</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">LDROBOT LD19 LiDAR Port:</label>
            <input
              type="text"
              value={settings.ld19_port}
              onChange={(e) => setSettings({ ...settings, ld19_port: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              placeholder="/dev/ttyUSB0 or COM4"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">LD19 LiDAR Baud Rate:</label>
            <input
              type="number"
              disabled
              value={settings.ld19_baud}
              className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded font-mono text-xs text-slate-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Fixed at 230400 bps by LDROBOT silicon</span>
          </div>

          <div className="md:col-span-2">
            <label className="text-slate-600 block mb-1 font-semibold">ESP32-CAM MJPEG Video Stream URL:</label>
            <input
              type="text"
              value={settings.camera_stream_url}
              onChange={(e) => setSettings({ ...settings, camera_stream_url: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              placeholder="http://192.168.4.1/stream"
            />
          </div>
        </div>
      </div>

      {/* Economics & Tariffs */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
          Industrial Tariffs & Specific Power Coefficients
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-600 block mb-1 font-semibold">Electricity Tariff (₹ / kWh):</label>
            <input
              type="number"
              step="0.1"
              value={settings.electricity_tariff_inr}
              onChange={(e) => setSettings({ ...settings, electricity_tariff_inr: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">Raw Industrial Water Tariff (₹ / m³):</label>
            <input
              type="number"
              step="1"
              value={settings.water_tariff_inr}
              onChange={(e) => setSettings({ ...settings, water_tariff_inr: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">Compressor Specific Power (kW / CFM):</label>
            <input
              type="number"
              step="0.01"
              value={settings.compressor_kw_cfm}
              onChange={(e) => setSettings({ ...settings, compressor_kw_cfm: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard: 0.18 - 0.22 kW/CFM at 7 bar</span>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-semibold">Pump Specific Energy (kWh / m³):</label>
            <input
              type="number"
              step="0.05"
              value={settings.pump_kwh_m3}
              onChange={(e) => setSettings({ ...settings, pump_kwh_m3: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Simulation Mode Toggle Card */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Hardware Simulation Mode Toggle
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            When enabled, the backend generates high-fidelity synthetic physics and mine corridor LiDAR scans without hardware attached.
          </p>
        </div>

        <button
          onClick={() => setSettings({ ...settings, simulation_mode: !settings.simulation_mode })}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded font-bold text-xs transition-colors ${
            settings.simulation_mode
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-slate-100 text-slate-700 border border-slate-300'
          }`}
        >
          <span>{settings.simulation_mode ? 'ENABLED (SIMULATION)' : 'DISABLED (LIVE HW)'}</span>
        </button>
      </div>
    </div>
  );
};

