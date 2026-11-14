import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Droplets, AlertTriangle, ShieldAlert, Activity, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const WaterSlurryPipelines: React.FC = () => {
  const { telemetry } = useTelemetry();
  const pipes = telemetry?.pipelines;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'WATER' | 'SLURRY'>('WATER');

  // Water Form State
  const [serviceType, setServiceType] = useState('Mine dewatering');
  const [leakFlowLmin, setLeakFlowLmin] = useState<number>(pipes?.water_flow_rate_lmin ?? 14.5);
  const [pumpSpecEnergy, setPumpSpecEnergy] = useState<number>(0.65); // kWh/m3
  const [waterTariff, setWaterTariff] = useState<number>(45.0); // ₹/m3
  const [waterResults, setWaterResults] = useState<any>(null);

  // Slurry Form State
  const [pipeSchedule, setPipeSchedule] = useState('Sch 80 Extra Strong');
  const [nominalThicknessMm, setNominalThicknessMm] = useState<number>(12.0);
  const [residualThicknessMm, setResidualThicknessMm] = useState<number>(5.5);
  const [slurryResults, setSlurryResults] = useState<any>(null);

  const handleWaterCalc = async () => {
    try {
      const res = await api.calculateWaterPipeline({
        leakage_flow_lmin: leakFlowLmin,
        pump_specific_energy_kwh_per_m3: pumpSpecEnergy,
        water_tariff_inr_per_m3: waterTariff,
        service_type: serviceType,
      });
      setWaterResults(res);
    } catch (e) {
      console.error('Water calc error', e);
    }
  };

  const handleSlurryCalc = async () => {
    try {
      const res = await api.evaluateSlurryLine({
        pipe_schedule: pipeSchedule,
        nominal_wall_thickness_mm: nominalThicknessMm,
        measured_wall_thickness_mm: residualThicknessMm,
      });
      setSlurryResults(res);
    } catch (e) {
      console.error('Slurry calc error', e);
    }
  };

  useEffect(() => {
    handleWaterCalc();
    handleSlurryCalc();
  }, [leakFlowLmin, pumpSpecEnergy, waterTariff, nominalThicknessMm, residualThicknessMm]);

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-lg">
        <button
          onClick={() => setActiveTab('WATER')}
          className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'WATER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>Industrial Water Distribution & Dewatering</span>
        </button>
        <button
          onClick={() => setActiveTab('SLURRY')}
          className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'SLURRY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Abrasive Slurry Tailings Pipelines</span>
        </button>
      </div>

      {activeTab === 'WATER' ? (
        <div className="space-y-4">
          {/* Live Sensor Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Water Line Pressure (SEN0257)
              </span>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-slate-900">
                  {pipes?.water_pipeline_pressure_bar?.toFixed(2) ?? '--'}
                </span>
                <span className="text-xs text-slate-500 ml-1">bar (gauge)</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">ADS1115 AIN3 (0-16 bar)</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Water Flow Rate (YF-S201)
              </span>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-blue-600">
                  {pipes?.water_flow_rate_lmin?.toFixed(1) ?? '--'}
                </span>
                <span className="text-xs text-slate-500 ml-1">L/min</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">GPIO 19 Pulse Interrupt</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Cumulative Water Volume
              </span>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-emerald-600">
                  {pipes?.water_cumulative_liters?.toFixed(0) ?? '--'}
                </span>
                <span className="text-xs text-slate-500 ml-1">Liters</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Running total</span>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Water Temperature (DS18B20)
              </span>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-mono font-bold text-slate-900">
                  {pipes?.water_temp_c?.toFixed(1) ?? '--'}
                </span>
                <span className="text-xs text-slate-500 ml-1">°C</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">GPIO 4 Waterproof Probe</span>
            </div>
          </div>

          {/* Water Leakage & Pumping Calculation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Water Service & Leak Configuration
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">Industrial Application:</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                  >
                    <option value="Mine dewatering">Mine dewatering</option>
                    <option value="Dust suppression">Dust suppression</option>
                    <option value="Cooling water">Cooling water</option>
                    <option value="Industrial water distribution">Industrial water distribution</option>
                    <option value="Paper mills">Paper mills</option>
                    <option value="Textile mills">Textile mills</option>
                    <option value="Water treatment plants">Water treatment plants</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Measured Leak Rate (L/min):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={leakFlowLmin}
                    onChange={(e) => setLeakFlowLmin(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Pump Specific Energy (kWh/m³):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={pumpSpecEnergy}
                    onChange={(e) => setPumpSpecEnergy(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Water Tariff (₹/m³):</label>
                  <input
                    type="number"
                    step="5"
                    value={waterTariff}
                    onChange={(e) => setWaterTariff(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Output */}
            <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
                  Water Wastage & Pumping Power Penalty
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Daily Wastage</span>
                    <span className="font-mono text-base font-bold text-blue-600">
                      {waterResults?.daily_wastage_m3?.toFixed(2) ?? '--'} m³/day
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Annual Volume Lost</span>
                    <span className="font-mono text-base font-bold text-slate-900">
                      {waterResults?.annual_wastage_m3?.toLocaleString() ?? '--'} m³/yr
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Daily Pumping Energy</span>
                    <span className="font-mono text-base font-bold text-rose-600">
                      {waterResults?.daily_pumping_kwh?.toFixed(2) ?? '--'} kWh/day
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Total Annual Cost</span>
                    <span className="font-mono text-base font-bold text-emerald-600">
                      ₹ {waterResults?.total_annual_cost_inr?.toLocaleString() ?? '--'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Raw Water Loss Financial Cost:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹ {waterResults?.water_cost_inr?.toLocaleString() ?? '--'} / year
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avoidable Pumping Power Cost:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹ {waterResults?.energy_cost_inr?.toLocaleString() ?? '--'} / year
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Slurry Tab */
        <div className="space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded shadow-sm text-xs">
            <p className="font-bold text-amber-900">SLURRY SERVICE INTEGRITY WARNING</p>
            <p className="text-amber-800 mt-0.5">
              Abrasive mineral slurry piping operates under severe erosive wear. Standard water pressure transducers must <strong>never</strong> be placed in direct contact with slurry.
              Measurements must be sourced from non-intrusive ultrasonic thickness gauges or diaphragm-sealed slurry instruments.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Slurry Pipe Wall Gauging
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">Nominal Wall Thickness (mm):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={nominalThicknessMm}
                    onChange={(e) => setNominalThicknessMm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">Measured Residual Thickness (mm):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={residualThicknessMm}
                    onChange={(e) => setResidualThicknessMm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
                  Mechanical Integrity & Rupture Risk Analysis
                </h3>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Wall Thickness Loss:</span>
                    <span className="font-mono font-bold text-rose-600 text-sm">
                      {slurryResults?.wall_loss_pct ?? '--'}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Risk Assessment:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {slurryResults?.risk_level ?? '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Recommended Action:</span>
                    <span className="text-slate-700 font-medium">
                      {slurryResults?.recommended_action ?? '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

