import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, AlertCircle, Filter, ArrowUpRight, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { EnergySummary, InspectionItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const EnergyConservation: React.FC = () => {
  const [summary, setSummary] = useState<EnergySummary | null>(null);
  const [zoneBreakdown, setZoneBreakdown] = useState<any[]>([]);
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sum, zones, items] = await Promise.all([
        api.getEnergySummary(),
        api.getZoneBreakdown(),
        api.getInspections(),
      ]);
      setSummary(sum);
      setZoneBreakdown(zones);
      setInspections(items);
    } catch (e) {
      console.error('Failed to load energy data', e);
    }
  };

  const filteredItems = selectedZone === 'ALL'
    ? inspections
    : inspections.filter((i) => i.zone_name === selectedZone);

  return (
    <div className="space-y-4">
      {/* Top Engineering Principle Alert */}
      <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 shadow flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>
            <strong>ENERGY MEASUREMENT & VERIFICATION (IPMVP Standard):</strong> Potential savings are calculated from real sensor leak physics. Verified achieved savings are confirmed only after post-repair re-inspection.
          </span>
        </div>
      </div>

      {/* High-Level Financial & Energy Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Potential Avoidable Power
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-rose-600">
              {summary ? ((summary.estimated_avoidable_electricity_kwh_day / 24.0).toFixed(2)) : '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">kW (Continuous)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Active unmitigated leaks</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avoidable Daily Electricity
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {summary?.estimated_avoidable_electricity_kwh_day?.toFixed(1) ?? '--'}
            </span>
            <span className="text-xs text-slate-500 ml-1">kWh / day</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Plant baseline penalty</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Potential Annual Savings
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-emerald-600">
              ₹ {summary?.estimated_annual_savings_inr?.toLocaleString() ?? '--'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {summary?.potential_annual_kwh?.toLocaleString()} kWh @ ₹8.50/kWh
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Verified Achieved Savings
          </span>
          <div className="mt-1 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-blue-600">
              {summary?.verified_achieved_savings_kwh?.toFixed(1) ?? '0.0'}
            </span>
            <span className="text-xs text-slate-500 ml-1">kWh (Achieved)</span>
          </div>
          <span className="text-[10px] text-emerald-600 mt-1 block font-semibold">Post-repair certified</span>
        </div>
      </div>

      {/* Zone Energy Breakdown Chart */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
          Energy Conservation Opportunity by Mine / Plant Zone (Potential vs Verified)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="zone_name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="potential_annual_kwh" name="Potential Savings (kWh/yr)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="verified_kwh" name="Verified Achieved (kWh)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Industrial Energy Audit Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Comprehensive Energy Audit & Defect Register
            </h3>
            <p className="text-[11px] text-slate-500">
              Showing {filteredItems.length} audited components across plant infrastructure.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Filter Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded font-medium text-xs"
            >
              <option value="ALL">All Plant Zones</option>
              {Array.from(new Set(inspections.map((i) => i.zone_name))).map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-compact">
            <thead>
              <tr>
                <th>Code</th>
                <th>Equipment ID</th>
                <th>Zone</th>
                <th>Fault Category</th>
                <th>Power Loss (kW)</th>
                <th>Daily Loss (kWh)</th>
                <th>Annual Potential (₹)</th>
                <th>Priority</th>
                <th>Repair Status</th>
                <th>Verified (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="font-bold text-blue-600">{item.inspection_code}</td>
                  <td className="font-semibold text-slate-800">{item.equipment_id}</td>
                  <td className="text-slate-600 font-sans">{item.zone_name}</td>
                  <td>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.fault_type === 'COMPRESSED_AIR_LEAK'
                          ? 'bg-amber-100 text-amber-900'
                          : item.fault_type === 'WATER_LEAK'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {item.fault_type}
                    </span>
                  </td>
                  <td className="text-rose-600 font-bold">{item.estimated_power_loss_kw.toFixed(2)}</td>
                  <td>{item.estimated_energy_loss_kwh_day.toFixed(1)}</td>
                  <td className="text-emerald-700 font-bold">
                    ₹ {item.annual_financial_saving_inr.toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.maintenance_priority.includes('P1')
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.maintenance_priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-sans ${
                        item.repair_status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.repair_status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.repair_status}
                    </span>
                  </td>
                  <td className="text-blue-700 font-bold">{item.verified_saving_kwh.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

