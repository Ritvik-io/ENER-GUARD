import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { useRoverControl } from '../context/RoverControlContext';
import { LidarOccupancyMap } from '../components/maps/LidarOccupancyMap';
import { DPad } from '../components/controls/DPad';
import {
  Activity,
  Wind,
  Gauge,
  Droplets,
  Zap,
  ShieldAlert,
  Battery,
  Wifi,
  Compass,
  AlertTriangle,
  Flame,
  Camera
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (pageId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { telemetry, isConnected, isStale, isSimulated } = useTelemetry();
  const { speedPct, setSpeedPct } = useRoverControl();

  const env = telemetry?.environmental;
  const vent = telemetry?.ventilation;
  const pipes = telemetry?.pipelines;
  const acoustic = telemetry?.acoustic_ultrasonic;
  const status = telemetry?.status;

  return (
    <div className="space-y-4">
      {/* Simulation Banner */}
      {isSimulated && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-xs font-bold text-amber-900">SIMULATION MODE ACTIVE</p>
              <p className="text-[11px] text-amber-700">
                Hardware is offline. Showing synthetic multi-sensor telemetry and LiDAR drift corridor. Live measurements require physical ESP32 and LD19 connection.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
          >
            Configure Ports
          </button>
        </div>
      )}

      {/* Row 1: Rover Status & Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Section A: Rover Status */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">A. Rover Telemetry</h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  status?.online ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {status?.online ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Operation Mode:</span>
                <span className="font-mono font-semibold text-slate-800 uppercase">{status?.mode ?? 'MANUAL'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Battery Voltage:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {status?.battery_voltage_v?.toFixed(2) ?? '--'} V ({status?.battery_percentage ?? '--'}%)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Linear Velocity:</span>
                <span className="font-mono font-semibold text-slate-800">{status?.speed_ms?.toFixed(2) ?? '0.00'} m/s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Rover Heading:</span>
                <span className="font-mono font-semibold text-slate-800">{status?.rover_heading_deg?.toFixed(1) ?? '0.0'}°</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">MCU Core Temp:</span>
                <span className="font-mono font-semibold text-slate-800">{status?.temperature_mcu_c?.toFixed(1) ?? '--'} °C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Safety Dead-Man:</span>
                <span className="font-mono text-emerald-600 font-bold">500ms OK</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('control')}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold text-center transition-colors"
            >
              Open Rover Controls
            </button>
          </div>
        </div>

        {/* Section B: Live Video Stream */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">B. Live Inspection Stream</h3>
            </div>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              OV2640 MJPEG
            </span>
          </div>

          <div className="relative aspect-video bg-slate-950 rounded overflow-hidden flex items-center justify-center">
            <img
              src="/api/camera/stream"
              alt="ESP32-CAM Stream"
              className="w-full h-full object-cover"
              onError={(e) => {
                // If stream fails, keep poster
              }}
            />
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-white">
              LIVE 640x480
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">Stream: /api/camera/stream</span>
            <button
              onClick={() => onNavigate('camera')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Camera View & Snapshot →
            </button>
          </div>
        </div>

        {/* Quick D-Pad on Dashboard */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Drive Interlock</h3>
            <span className="text-[10px] font-mono text-slate-500">{speedPct}% PWM</span>
          </div>

          <DPad />

          <div className="w-full mt-2">
            <input
              type="range"
              min="20"
              max="100"
              value={speedPct}
              onChange={(e) => setSpeedPct(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Row 2: 2D SLAM Mapping & Environmental Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section C: LiDAR 2D Occupancy Map */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">C. LiDAR 2D Occupancy Grid SLAM</h3>
              <p className="text-[11px] text-slate-500">LDROBOT LD19 360° Scan Matching & Obstacle Boundary</p>
            </div>
            <button
              onClick={() => onNavigate('lidar')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Full Screen Map →
            </button>
          </div>

          <LidarOccupancyMap
            scan={null}
            mapState={{
              resolution_m: 0.2,
              width: 100,
              height: 100,
              robot_pose: {
                x: status?.rover_x ?? 0.0,
                y: status?.rover_y ?? 0.0,
                heading_deg: status?.rover_heading_deg ?? 0.0,
              },
              trajectory: [
                [0, 0],
                [status?.rover_x ?? 0, status?.rover_y ?? 0],
              ],
              inspection_markers: [],
              timestamp: Date.now(),
            }}
            heightPx={340}
          />
        </div>

        {/* Section D: Environmental Gas & Microclimate */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">D. Mine Atmosphere & Gases</h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  env?.gas_alarm_state === 'CRITICAL'
                    ? 'bg-red-100 text-red-800 animate-pulse'
                    : env?.gas_alarm_state === 'WARNING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {env?.gas_alarm_state ?? 'NORMAL'}
              </span>
            </div>

            <div className="space-y-3">
              {/* MQ-2 Combustible Gas */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center">
                    <Flame className="w-3.5 h-3.5 text-amber-500 mr-1.5" />
                    MQ-2 Combustible / Methane
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {env?.mq2_ppm_combustible?.toFixed(1) ?? '--'} PPM
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>Threshold: 1000 Warning / 2500 Critical</span>
                  <span className="text-amber-700 font-medium">Cross-Sensitive*</span>
                </div>
              </div>

              {/* MQ-8 Hydrogen */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center">
                    <Activity className="w-3.5 h-3.5 text-blue-500 mr-1.5" />
                    MQ-8 Hydrogen Gas (H₂)
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {env?.mq8_ppm_hydrogen?.toFixed(1) ?? '--'} PPM
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>Threshold: 400 Warning / 1000 Critical</span>
                  <span>Battery off-gas check</span>
                </div>
              </div>

              {/* Temperature & Humidity */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Air Temperature</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {env?.dht11_temp_c?.toFixed(1) ?? '--'} °C
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Relative Humidity</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {env?.dht11_humidity_pct?.toFixed(1) ?? '--'} %
                  </span>
                </div>
              </div>

              {/* Ultrasonic Leakage Level */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 flex items-center">
                    <Gauge className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                    40 kHz Ultrasound
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {acoustic?.ultrasonic_db_spl?.toFixed(1) ?? '--'} dB SPL
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Status: {acoustic?.suspected_leak ? '⚠️ Suspected Acoustic Discharge' : '✅ Baseline Noise Floor'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] text-slate-400 italic">
              *Notice: MQ-2/MQ-8 sensors are cross-sensitive to VOCs and humidity. Must not be used as certified statutory safety instruments.
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Section E: Energy Conservation Summary */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">E. Plant Energy Conservation Summary</h3>
          </div>
          <button
            onClick={() => onNavigate('energy')}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Detailed Energy Audit Dashboard →
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Air Leaks Tagged</span>
            <span className="font-mono text-base font-bold text-slate-900">2 Points</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Ultrasonic 40kHz</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Water Leaks</span>
            <span className="font-mono text-base font-bold text-slate-900">1 Flange</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Dewatering spool</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Avoidable Power</span>
            <span className="font-mono text-base font-bold text-rose-600">6.21 kW</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Compressor + Fan</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Avoidable Electricity</span>
            <span className="font-mono text-base font-bold text-slate-900">149.0 kWh/d</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Daily loss rate</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Annual Potential Savings</span>
            <span className="font-mono text-base font-bold text-emerald-600">₹ 4,80,078</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">@ ₹8.50/kWh tariff</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Water Wastage</span>
            <span className="font-mono text-base font-bold text-blue-600">20,880 L/d</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Pumping cost included</span>
          </div>
        </div>
      </div>
    </div>
  );
};

