import React from 'react';
import {
  LayoutDashboard,
  Video,
  Gamepad2,
  Radar,
  Activity,
  Wind,
  Gauge,
  Droplets,
  Zap,
  ClipboardList,
  FileText,
  Settings,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

interface SidebarProps {
  currentPage: string;
  onSelectPage: (page: string) => void;
}

export const navItems = [
  { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
  { id: 'camera', label: '2. Live Camera', icon: Video },
  { id: 'control', label: '3. Rover Control', icon: Gamepad2 },
  { id: 'lidar', label: '4. LiDAR Mapping', icon: Radar },
  { id: 'environmental', label: '5. Environmental Sensors', icon: Activity },
  { id: 'ventilation', label: '6. Ventilation Monitoring', icon: Wind },
  { id: 'acoustic', label: '7. Compressed-Air Leakage', icon: Gauge },
  { id: 'pipeline', label: '8. Water & Slurry Pipelines', icon: Droplets },
  { id: 'energy', label: '9. Energy Conservation', icon: Zap },
  { id: 'inspections', label: '10. Inspection Logs', icon: ClipboardList },
  { id: 'reports', label: '11. Reports', icon: FileText },
  { id: 'settings', label: '12. Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const { isConnected, isStale, isSimulated, telemetry } = useTelemetry();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen select-none border-r border-slate-800 flex-shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
            SS
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide">SafeScout MINE-ENERGY</h1>
            <p className="text-[10px] text-slate-400 leading-tight">Intelligent Mine & Industrial Energy Monitoring</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 text-xs rounded transition-colors font-medium text-left ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Hardware Link Status */}
      <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">ESP32 Rover Link:</span>
          <div className="flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                !isConnected
                  ? 'bg-red-500'
                  : isStale
                  ? 'bg-amber-400'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span className="font-mono font-medium text-slate-200">
              {!isConnected ? 'OFFLINE' : isStale ? 'STALE' : 'ONLINE'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Data Feed:</span>
          <span
            className={`font-mono px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
              isSimulated
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {isSimulated ? 'SIMULATED' : 'LIVE HW'}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-400">
          <span>Battery:</span>
          <span className="font-mono text-slate-200 font-semibold">
            {telemetry?.status.battery_voltage_v.toFixed(2) ?? '--'} V ({telemetry?.status.battery_percentage ?? '--'}%)
          </span>
        </div>
      </div>
    </aside>
  );
};

