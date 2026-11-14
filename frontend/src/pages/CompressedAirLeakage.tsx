import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Gauge, Zap, AlertTriangle, MapPin, Calculator, Save, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';

export const CompressedAirLeakage: React.FC = () => {
  const { telemetry } = useTelemetry();
  const acoustic = telemetry?.acoustic_ultrasonic;
  const pipes = telemetry?.pipelines;

  // Audit Parameters
  const [pipelineId, setPipelineId] = useState('PIPE-AIR-084');
  const [linePressureBar, setLinePressureBar] = useState<number>(pipes?.compressed_air_pressure_bar ?? 6.8);
  const [ultrasonicDb, setUltrasonicDb] = useState<number>(acoustic?.ultrasonic_db_spl ?? 68.0);
  const [calibratedCfm, setCalibratedCfm] = useState<number | ''>('');
  const [specificPowerKw, setSpecificPowerKw] = useState<number>(0.20); // kW/CFM
  const [operatingHoursDay, setOperatingHoursDay] = useState<number>(24.0);
  const [operatingDaysYear, setOperatingDaysYear] = useState<number>(350);
  const [electricityTariff, setElectricityTariff] = useState<number>(8.50);

  // Results
  const [calcData, setCalcData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!acoustic) return;
    const now = new Date();
    setHistory((prev) => [
      ...prev.slice(-30),
      {
        time: `${now.getMinutes()}:${now.getSeconds()}`,
        db: acoustic.ultrasonic_db_spl,
        pressure: pipes?.compressed_air_pressure_bar ?? 6.8,
      },
    ]);
  }, [acoustic?.ultrasonic_db_spl]);

  const handleCalculate = async () => {
    try {
      const res = await api.calculateCompressedAir({
        ultrasonic_db_spl: ultrasonicDb,
        line_pressure_bar: linePressureBar,
        calibrated_cfm: calibratedCfm === '' ? null : Number(calibratedCfm),
        compressor_specific_power_kw_per_cfm: specificPowerKw,
        operating_hours_day: operatingHoursDay,
        operating_days_year: operatingDaysYear,
        tariff_inr_per_kwh: electricityTariff,
      });
      setCalcData(res);
    } catch (e) {
      console.error('Calculation error', e);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [ultrasonicDb, linePressureBar, calibratedCfm, specificPowerKw]);

  const handleTagLeakToMap = async () => {
    if (!calcData) return;
    const energy = calcData.energy_impact;
    try {
      await api.createInspection({
        equipment_id: pipelineId,
        zone_name: 'Compressed Air Trunk Line',
        location_x: telemetry?.status.rover_x ?? 0.0,
        location_y: telemetry?.status.rover_y ?? 0.0,
        heading_deg: telemetry?.status.rover_heading_deg ?? 0.0,
        fault_type: 'COMPRESSED_AIR_LEAK',
        severity: ultrasonicDb > 75 ? 'HIGH' : 'MEDIUM',
        detection_method: calcData.is_calibrated ? 'OPERATOR_CALIBRATED_CFM' : 'ACOUSTIC_FFT_SNR_RULE',
        confidence_score: calcData.confidence,
        measured_values: {
          ultrasonic_db: ultrasonicDb,
          line_pressure_bar: linePressureBar,
          flow_cfm: calcData.cfm,
        },
        estimated_power_loss_kw: energy.power_loss_kw,
        estimated_energy_loss_kwh_day: energy.energy_loss_kwh_day,
        potential_annual_saving_kwh: energy.annual_energy_loss_kwh,
        annual_financial_saving_inr: energy.annual_cost_inr,
        maintenance_priority: 'P2 - 24 HOURS',
        operator_remarks: `Acoustic leak detected at ${pipelineId}. Flow: ${calcData.cfm} CFM.`,
      });
      alert('Compressed air leak logged and tagged onto 2D SLAM map!');
    } catch (e) {
      console.error('Error logging leak', e);
    }
  };

  const energy = calcData?.energy_impact;

  return (
    <div className="space-y-4">
      {/* Acoustic Calibration Disclaimer */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded shadow-sm flex items-start space-x-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-amber-900">ACOUSTIC LEAK FLOW CALIBRATION PRINCIPLE</p>
          <p className="text-amber-800 mt-0.5">
            Ultrasonic decibels (dB SPL) measure acoustic emission at 40 kHz, which is influenced by orifice geometry, surface turbulence, and distance.
            Decibel amplitude is <strong>never converted directly into volumetric CFM</strong> without certified transfer calibration or operator entry.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            40 kHz Acoustic Signal Level
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {acoustic?.ultrasonic_db_spl?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">dB SPL</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Baseline: ~32 dB (Ambient)</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Air Line Pressure (SEN0257)
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-blue-600">
              {pipes?.compressed_air_pressure_bar?.toFixed(2) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">bar (gauge)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">ADS1115 AIN2 Transducer</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Estimated / Calibrated Leak Flow
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-rose-600">
              {calcData?.cfm?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">CFM</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{calcData?.cfm_source ?? 'ESTIMATE'}</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Potential Annual Energy Loss
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-emerald-600">
              ₹ {energy?.annual_cost_inr?.toLocaleString() ?? '--'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{energy?.annual_energy_loss_kwh?.toLocaleString()} kWh/yr</span>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Acoustic Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Real-Time 40 kHz Acoustic Envelope & Line Pressure Trend
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '12px' }} />
                <Line type="monotone" dataKey="db" name="Ultrasound Level (dB)" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pressure" name="Line Pressure (bar)" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Audit Parameters & Tagging */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Air Audit Parameter Configuration
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-slate-600 block mb-1">Pipeline ID / Tag:</label>
              <input
                type="text"
                value={pipelineId}
                onChange={(e) => setPipelineId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 block mb-1">Ultrasonic Level (dB):</label>
                <input
                  type="number"
                  value={ultrasonicDb}
                  onChange={(e) => setUltrasonicDb(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Validated CFM (Optional):</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Leave empty for est."
                  value={calibratedCfm}
                  onChange={(e) => setCalibratedCfm(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-600 block mb-1">Spec. Power (kW/CFM):</label>
                <input
                  type="number"
                  step="0.01"
                  value={specificPowerKw}
                  onChange={(e) => setSpecificPowerKw(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Tariff (₹/kWh):</label>
                <input
                  type="number"
                  step="0.5"
                  value={electricityTariff}
                  onChange={(e) => setElectricityTariff(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleTagLeakToMap}
              className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow flex items-center justify-center space-x-1.5"
            >
              <MapPin className="w-4 h-4" />
              <span>Tag Leak & Location to SLAM Map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

