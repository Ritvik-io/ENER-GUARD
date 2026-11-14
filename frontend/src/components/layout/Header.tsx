import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Battery, Clock, Wifi } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { useRoverControl } from '../../context/RoverControlContext';

interface HeaderProps {
  currentPageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ currentPageTitle }) => {
  const { telemetry, isConnected, isStale, isSimulated } = useTelemetry();
  const { triggerEStop, resetEStop } = useRoverControl();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isEstop = telemetry?.status.emergency_stop ?? false;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
      {/* Title & Path */}
      <div className="flex items-center space-x-3">
        <h2 className="text-base font-bold text-slate-800 tracking-tight">{currentPageTitle}</h2>
        <span className="text-xs text-slate-400 font-mono">| Block-4 Drift Zone</span>
      </div>

      {/* Critical Status Indicators */}
      <div className="flex items-center space-x-3">
        {/* E-Stop Banner */}
        {isEstop ? (
          <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold shadow animate-pulse">
            <ShieldAlert className="w-4 h-4" />
            <span>EMERGENCY STOP ENGAGED</span>
            <button
              onClick={() => resetEStop()}
              className="ml-2 bg-white text-red-700 px-2 py-0.5 rounded text-[11px] font-bold hover:bg-slate-100 uppercase"
            >
              Clear E-Stop
            </button>
          </div>
        ) : (
          <button
            onClick={() => triggerEStop()}
            className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold shadow transition-colors"
            title="Instant Hardware Motor Power Shutdown"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>E-STOP</span>
          </button>
        )}

        {/* Explicit Simulation Badge */}
        {isSimulated && (
          <div className="flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>SIMULATION MODE</span>
          </div>
        )}

        {/* Stale Data Warning */}
        {isStale && (
          <div className="flex items-center space-x-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded text-xs font-medium">
            <span>STALE TELEMETRY (&gt;2s)</span>
          </div>
        )}

        {/* Battery Indicator */}
        <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-xs font-mono text-slate-700">
          <Battery className={`w-3.5 h-3.5 ${(telemetry?.status.battery_percentage ?? 100) < 25 ? 'text-red-500' : 'text-emerald-600'}`} />
          <span>{telemetry?.status.battery_voltage_v?.toFixed(2) ?? '--'}V</span>
          <span className="text-slate-400">({telemetry?.status.battery_percentage ?? '--'}%)</span>
        </div>

        {/* System Clock */}
        <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeStr}</span>
        </div>
      </div>
    </header>
  );
};

