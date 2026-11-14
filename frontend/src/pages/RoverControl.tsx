import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { useRoverControl } from '../context/RoverControlContext';
import { DPad } from '../components/controls/DPad';
import {
  Gamepad2,
  ShieldAlert,
  Sliders,
  Wifi,
  AlertTriangle,
  Zap,
  Gauge,
  Info,
  CheckCircle2,
  Octagon
} from 'lucide-react';

export const RoverControl: React.FC = () => {
  const { telemetry, isConnected, isStale } = useTelemetry();
  const {
    speedPct,
    setSpeedPct,
    isMoving,
    activeDirection,
    gamepadConnected,
    triggerEStop,
    resetEStop,
  } = useRoverControl();

  const [mode, setMode] = useState<'MANUAL' | 'AUTONOMOUS'>('MANUAL');
  const isEstop = telemetry?.status.emergency_stop ?? false;

  return (
    <div className="space-y-4">
      {/* Safety Notice & E-Stop Interlock Alert */}
      <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Octagon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-900">SAFETY INTERLOCK & DEAD-MAN PROTOCOL</p>
            <p className="text-[11px] text-red-700">
              Hardware dead-man timer will halt all motors if movement heartbeats cease for &gt;500ms.
              Emergency Stop overrides all commands immediately. Never use this system to command stationary mine infrastructure.
            </p>
          </div>
        </div>
        {isEstop ? (
          <button
            onClick={() => resetEStop()}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold shadow hover:bg-red-700 uppercase"
          >
            Clear E-Stop
          </button>
        ) : (
          <button
            onClick={() => triggerEStop()}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold shadow hover:bg-red-700 uppercase"
          >
            Trigger E-Stop
          </button>
        )}
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Drive Controller (DPad + Speed) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Industrial Dead-Man D-Pad
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                isMoving ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isMoving ? `MOVING (${activeDirection})` : 'MOTORS IDLE'}
            </span>
          </div>

          <DPad />

          {/* Speed Regulation Slider */}
          <div className="w-full mt-6 space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center">
                <Sliders className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Motor Drive Power (PWM Limit)
              </span>
              <span className="font-mono font-bold text-blue-600 text-sm">{speedPct}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={speedPct}
              onChange={(e) => setSpeedPct(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>CRAWL (20%)</span>
              <span>NORMAL (60%)</span>
              <span>MAX (100%)</span>
            </div>
          </div>
        </div>

        {/* Operational Mode & Telemetry Status */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Operation Mode & Interlocks</h3>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                HW-095 L298N
              </span>
            </div>

            <div className="space-y-3">
              {/* Mode Toggle */}
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <label className="text-xs font-semibold text-slate-700 block mb-2">Control Authority:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('MANUAL')}
                    className={`py-2 text-xs font-bold rounded border transition-colors ${
                      mode === 'MANUAL'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    MANUAL TELEOP
                  </button>
                  <button
                    onClick={() => setMode('AUTONOMOUS')}
                    className={`py-2 text-xs font-bold rounded border transition-colors ${
                      mode === 'AUTONOMOUS'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    AUTONOMOUS PATROL
                  </button>
                </div>
              </div>

              {/* Hardware Link Indicators */}
              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dead-Man Watchdog:</span>
                  <span className="font-mono text-emerald-600 font-bold">ARMED (500ms)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hardware E-Stop Line:</span>
                  <span className={`font-mono font-bold ${isEstop ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isEstop ? 'TRIGGERED (OPEN)' : 'CLOSED (NORMAL)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Obstacle Distance (HC-SR04):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {telemetry?.navigation_sensors.hc_sr04_distance_cm?.toFixed(1) ?? '--'} cm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">USB Gamepad Controller:</span>
                  <span className={`font-mono font-semibold ${gamepadConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {gamepadConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800">
            <span className="font-bold block mb-1">Emergency Rule:</span>
            On loss of serial communication, the ESP32 cuts PWM to zero independent of this web console.
          </div>
        </div>

        {/* Keyboard Shortcut Reference Guide */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Keyboard & Gamepad Mapping</h3>
              <Info className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-600">Forward Drive</span>
                <span className="font-mono px-2 py-0.5 bg-white border border-slate-300 rounded font-bold shadow-sm">
                  W / Up Arrow
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-600">Reverse Drive</span>
                <span className="font-mono px-2 py-0.5 bg-white border border-slate-300 rounded font-bold shadow-sm">
                  S / Down Arrow
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-600">Differential Left Turn</span>
                <span className="font-mono px-2 py-0.5 bg-white border border-slate-300 rounded font-bold shadow-sm">
                  A / Left Arrow
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-600">Differential Right Turn</span>
                <span className="font-mono px-2 py-0.5 bg-white border border-slate-300 rounded font-bold shadow-sm">
                  D / Right Arrow
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                <span className="text-red-700 font-bold">Hard Emergency Stop</span>
                <span className="font-mono px-2 py-0.5 bg-red-600 text-white rounded font-bold shadow-sm">
                  SPACEBAR
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            Keys must be actively held down. Rover halts the instant keys are released.
          </p>
        </div>
      </div>
    </div>
  );
};

