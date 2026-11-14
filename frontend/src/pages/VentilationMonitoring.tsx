import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Wind, Gauge, Calculator, CheckCircle2, AlertTriangle, Save, History, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

export const VentilationMonitoring: React.FC = () => {
  const { telemetry } = useTelemetry();
  const vent = telemetry?.ventilation;

  // Form Inputs for Mine Airway
  const [shape, setShape] = useState<string>('ARCH');
  const [widthM, setWidthM] = useState<number>(4.2);
  const [heightM, setHeightM] = useState<number>(3.5);
  const [requiredQ, setRequiredQ] = useState<number>(45.0); // m3/s statutory requirement
  const [fanKw, setFanKw] = useState<number>(75.0);

  // Multi-Point Traverse Readings
  const [traversePoints, setTraversePoints] = useState<number[]>([42.5, 48.0, 52.4, 46.8]);
  const [newTraverseVal, setNewTraverseVal] = useState<number>(vent?.sdp31_diff_pressure_pa ?? 48.0);

  // Calculation Results
  const [calcResult, setCalcResult] = useState<any>(null);
  const [surveys, setSurveys] = useState<any[]>([]);

  const handleCalculate = async () => {
    try {
      const res = await api.calculateVentilation({
        width_m: widthM,
        height_m: heightM,
        shape: shape,
        diff_pressure_pa: vent?.sdp31_diff_pressure_pa ?? 48.0,
        required_airflow_m3s: requiredQ,
        traverse_readings: traversePoints,
        fan_electrical_power_kw: fanKw,
      });
      setCalcResult(res);
    } catch (e) {
      console.error('Calculation error', e);
    }
  };

  useEffect(() => {
    handleCalculate();
    api.getVentilationSurveys().then(setSurveys).catch(console.error);
  }, []);

  const handleSaveSurvey = async () => {
    try {
      await api.saveVentilationSurvey({
        width_m: widthM,
        height_m: heightM,
        shape: shape,
        diff_pressure_pa: vent?.sdp31_diff_pressure_pa ?? 48.0,
        required_airflow_m3s: requiredQ,
        traverse_readings: traversePoints,
        fan_electrical_power_kw: fanKw,
      });
      alert('Official ventilation airway survey committed to database!');
      api.getVentilationSurveys().then(setSurveys);
    } catch (e) {
      console.error('Save survey error', e);
    }
  };

  const addTraversePoint = () => {
    if (newTraverseVal > 0) {
      setTraversePoints([...traversePoints, newTraverseVal]);
    }
  };

  const comp = calcResult?.compliance;

  return (
    <div className="space-y-4">
      {/* Strict Safety Interlock Disclaimer */}
      <div className="bg-slate-900 text-white p-3.5 rounded-lg border border-slate-800 shadow flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-amber-300">CRITICAL STATUTORY SAFETY MANDATE:</span>
            <p className="text-slate-300 mt-0.5">
              SafeScout is an autonomous inspection rover. The system <strong>never</strong> decreases mine ventilation fan speeds automatically.
              All energy optimization opportunities require manual ventilation officer sign-off.
            </p>
          </div>
        </div>
      </div>

      {/* Row 1: Live Sensirion SDP31 & Pitot Velocity Readouts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Pitot Differential Pressure
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {vent?.sdp31_diff_pressure_pa?.toFixed(2) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">Pa (N/m²)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Sensirion SDP31 (I²C 0x21)</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Calculated Velocity (Bernoulli)
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-blue-600">
              {vent?.calculated_air_velocity_ms?.toFixed(2) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">m/s</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">V = √(2·ΔP / ρ)</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Airway Cross-Section Area
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {calcResult?.airway_area_m2?.toFixed(2) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">m²</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{shape} Profile ({widthM}m x {heightM}m)</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Volumetric Flow Rate (Q)
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-emerald-600">
              {comp?.measured_airflow_m3s?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">m³/s</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Q = A × V_avg</span>
        </div>
      </div>

      {/* Row 2: Airway Parameters & Traverse Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Airway Dimension Configuration */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Airway Geometry & Compliance Target
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-slate-600 block mb-1">Roadway Profile:</label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium"
              >
                <option value="ARCH">ARCH (Semi-Circular Crown)</option>
                <option value="RECTANGULAR">RECTANGULAR</option>
                <option value="CIRCULAR">CIRCULAR (Vent Duct)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 block mb-1">Width (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={widthM}
                  onChange={(e) => setWidthM(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Height (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={heightM}
                  onChange={(e) => setHeightM(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-600 block mb-1">Statutory Airflow Requirement (m³/s):</label>
              <input
                type="number"
                step="1"
                value={requiredQ}
                onChange={(e) => setRequiredQ(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1">Main Fan Electrical Power (kW):</label>
              <input
                type="number"
                step="5"
                value={fanKw}
                onChange={(e) => setFanKw(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              />
            </div>

            <button
              onClick={handleCalculate}
              className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow transition-colors"
            >
              Re-Calculate Aerodynamic Model
            </button>
          </div>
        </div>

        {/* Multi-Point Traverse Survey Station */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Multi-Point Traverse Survey
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              {traversePoints.length} Point(s) Recorded
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-tight">
            Do not assume a single Pitot measurement represents the complete airway cross-section. Record readings at multiple traverse depths across the roadway.
          </p>

          <div className="flex space-x-2">
            <input
              type="number"
              step="0.1"
              value={newTraverseVal}
              onChange={(e) => setNewTraverseVal(Number(e.target.value))}
              placeholder="Diff Pressure (Pa)"
              className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
            />
            <button
              onClick={addTraversePoint}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded"
            >
              Add Point
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded border border-slate-200">
            {traversePoints.map((pt, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs py-0.5 border-b border-slate-200 last:border-0 font-mono">
                <span className="text-slate-500">Traverse Point #{idx + 1}:</span>
                <span className="font-bold text-slate-800">{pt.toFixed(2)} Pa</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveSurvey}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow transition-colors flex items-center justify-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Commit Survey to Database</span>
          </button>
        </div>

        {/* Aerodynamic Compliance & Fan Energy Audit */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Compliance & Fan Energy Assessment
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  comp?.compliance_status === 'COMPLIANT'
                    ? 'bg-emerald-100 text-emerald-800'
                    : comp?.compliance_status === 'OVER_VENTILATED'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {comp?.compliance_status ?? 'ANALYZING'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Statutory Airflow Setpoint:</span>
                <span className="font-mono font-bold text-slate-800">{requiredQ.toFixed(1)} m³/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Measured Roadway Airflow:</span>
                <span className="font-mono font-bold text-slate-800">{comp?.measured_airflow_m3s?.toFixed(1) ?? '--'} m³/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Airflow Deviation:</span>
                <span className="font-mono font-bold text-blue-600">{comp?.airflow_deviation_pct ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Avoidable Fan Power:</span>
                <span className="font-mono font-bold text-rose-600">{comp?.avoidable_power_kw ?? 0} kW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Potential Annual Fan Savings:</span>
                <span className="font-mono font-bold text-emerald-600">
                  ₹ {comp?.avoidable_annual_cost_inr?.toLocaleString() ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-4 p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600">
              <span className="font-semibold block mb-0.5">Ventilation Officer Remark:</span>
              {comp?.remarks}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

