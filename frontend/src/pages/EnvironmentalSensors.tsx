import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import {
  Activity,
  Flame,
  Thermometer,
  Droplets,
  AlertTriangle,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const EnvironmentalSensors: React.FC = () => {
  const { telemetry } = useTelemetry();
  const env = telemetry?.environmental;

  const [gasHistory, setGasHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!env) return;
    const now = new Date();
    const timeStr = `${now.getMinutes()}:${now.getSeconds()}`;
    setGasHistory((prev) => [
      ...prev.slice(-25),
      {
        time: timeStr,
        mq2: env.mq2_ppm_combustible,
        mq8: env.mq8_ppm_hydrogen,
        temp: env.dht11_temp_c,
      },
    ]);
  }, [env?.mq2_ppm_combustible, env?.mq8_ppm_hydrogen]);

  return (
    <div className="space-y-4">
      {/* Statutory Cross-Sensitivity Notice */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded shadow-sm flex items-start space-x-2.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-amber-900">STATUTORY MINING SAFETY & CROSS-SENSITIVITY DISCLAIMER</p>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            MQ-series tin dioxide semiconductor sensors (MQ-2 and MQ-8) exhibit broad cross-sensitivity to airborne VOCs, humidity fluctuations, and carbon monoxide.
            They are utilized on SafeScout for secondary screening and leak localization. Under statutory mining regulations, they must <strong>never</strong> replace certified flameproof infrared or catalytic methane detectors.
          </p>
        </div>
      </div>

      {/* Sensor Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MQ-2 Combustible / Methane */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center">
              <Flame className="w-4 h-4 text-amber-500 mr-1.5" />
              MQ-2 Combustible Gas
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                (env?.mq2_ppm_combustible ?? 0) > 2500
                  ? 'bg-red-100 text-red-800'
                  : (env?.mq2_ppm_combustible ?? 0) > 1000
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {(env?.mq2_ppm_combustible ?? 0) > 2500 ? 'CRITICAL' : (env?.mq2_ppm_combustible ?? 0) > 1000 ? 'WARNING' : 'NORMAL'}
            </span>
          </div>

          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {env?.mq2_ppm_combustible?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">PPM</span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Raw ADS1115 ADC:</span>
              <span className="font-mono text-slate-800 font-semibold">{env?.mq2_raw_adc ?? '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>Calibration Status:</span>
              <span className="font-mono text-emerald-600 font-semibold">
                {env?.mq2_calibrated ? 'CALIBRATED (RL=10k)' : 'UNCALIBRATED'}
              </span>
            </div>
          </div>
        </div>

        {/* MQ-8 Hydrogen */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center">
              <Activity className="w-4 h-4 text-blue-500 mr-1.5" />
              MQ-8 Hydrogen Gas (H₂)
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                (env?.mq8_ppm_hydrogen ?? 0) > 1000
                  ? 'bg-red-100 text-red-800'
                  : (env?.mq8_ppm_hydrogen ?? 0) > 400
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {(env?.mq8_ppm_hydrogen ?? 0) > 1000 ? 'CRITICAL' : (env?.mq8_ppm_hydrogen ?? 0) > 400 ? 'WARNING' : 'NORMAL'}
            </span>
          </div>

          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {env?.mq8_ppm_hydrogen?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">PPM</span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Raw ADS1115 ADC:</span>
              <span className="font-mono text-slate-800 font-semibold">{env?.mq8_raw_adc ?? '--'}</span>
            </div>
            <div className="flex justify-between">
              <span>Application:</span>
              <span className="font-mono text-slate-800">Battery Charging Station</span>
            </div>
          </div>
        </div>

        {/* DHT11 Temperature */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center">
              <Thermometer className="w-4 h-4 text-rose-500 mr-1.5" />
              Airway Temperature
            </span>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              NOMINAL
            </span>
          </div>

          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {env?.dht11_temp_c?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">°C</span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Sensor Interface:</span>
              <span className="font-mono text-slate-800">GPIO 15 (Single-bus)</span>
            </div>
            <div className="flex justify-between">
              <span>Mine Thermal Comfort:</span>
              <span className="font-mono text-emerald-600 font-semibold">&lt; 30.0 °C</span>
            </div>
          </div>
        </div>

        {/* DHT11 Relative Humidity */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center">
              <Droplets className="w-4 h-4 text-sky-500 mr-1.5" />
              Relative Humidity
            </span>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
              OPTIMAL
            </span>
          </div>

          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {env?.dht11_humidity_pct?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">% RH</span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Moist Air Density Rho:</span>
              <span className="font-mono text-slate-800 font-semibold">1.204 kg/m³</span>
            </div>
            <div className="flex justify-between">
              <span>Ventilation Correction:</span>
              <span className="font-mono text-slate-800">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Sensor Trend Chart */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
          Real-Time Gas Concentration & Temperature Telemetry (Last 25 Samples)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gasHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
              <Line type="monotone" dataKey="mq2" name="MQ-2 Combustible (PPM)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mq8" name="MQ-8 Hydrogen (PPM)" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

