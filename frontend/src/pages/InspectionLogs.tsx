import React, { useState, useEffect } from 'react';
import { ClipboardList, Image, MapPin, CheckCircle, Clock, Trash2, Edit3, X } from 'lucide-react';
import { api } from '../services/api';
import { InspectionItem } from '../types';

export const InspectionLogs: React.FC = () => {
  const [inspections, setInspections] = useState<InspectionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InspectionItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('PENDING');
  const [editConfirmation, setEditConfirmation] = useState<string>('CONFIRMED');
  const [verifiedKwh, setVerifiedKwh] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const items = await api.getInspections();
      setInspections(items);
    } catch (e) {
      console.error('Failed to load inspections', e);
    }
  };

  const handleOpenModal = (item: InspectionItem) => {
    setSelectedItem(item);
    setEditStatus(item.repair_status);
    setEditConfirmation(item.confirmation_status);
    setVerifiedKwh(item.verified_saving_kwh);
    setRemarks(item.operator_remarks);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      await api.updateInspection(selectedItem.id, {
        repair_status: editStatus as any,
        confirmation_status: editConfirmation as any,
        verified_saving_kwh: verifiedKwh,
        operator_remarks: remarks,
      });
      alert('Inspection finding updated successfully!');
      setSelectedItem(null);
      loadInspections();
    } catch (e) {
      console.error('Update error', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this inspection record from the permanent audit log?')) {
      await api.deleteInspection(id);
      loadInspections();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Autonomous Rover Inspection Logbook & History</h2>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Persistent SQLite Database records with SLAM coordinate tags and photographic evidence.
          </p>
        </div>

        <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded font-semibold border border-slate-200">
          {inspections.length} Total Audit Records
        </span>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-compact">
            <thead>
              <tr>
                <th>Code</th>
                <th>Timestamp (UTC)</th>
                <th>Equipment Tag</th>
                <th>Zone / Route</th>
                <th>SLAM (X, Y)</th>
                <th>Fault Category</th>
                <th>Severity</th>
                <th>Method</th>
                <th>Confirmation</th>
                <th>Maintenance Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((item) => (
                <tr key={item.id}>
                  <td className="font-bold text-blue-600">{item.inspection_code}</td>
                  <td className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</td>
                  <td className="font-semibold text-slate-800">{item.equipment_id}</td>
                  <td className="text-slate-600 font-sans">{item.zone_name}</td>
                  <td className="font-mono text-slate-500">
                    ({item.location_x.toFixed(1)}m, {item.location_y.toFixed(1)}m)
                  </td>
                  <td>
                    <span className="font-bold text-[11px] text-slate-800">{item.fault_type}</span>
                  </td>
                  <td>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : item.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="text-[10px] text-slate-500 font-sans">{item.detection_method}</td>
                  <td>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.confirmation_status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.confirmation_status}
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
                  <td>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                        title="Edit / Review"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Workflow Edit Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">
                Inspection Finding Details — {selectedItem.inspection_code}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              {selectedItem.snapshot_path && (
                <div className="aspect-video bg-slate-100 rounded overflow-hidden border border-slate-200">
                  <img src={selectedItem.snapshot_path} alt="Defect" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Equipment ID:</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedItem.equipment_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mine Zone:</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedItem.zone_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estimated Power Loss:</span>
                  <span className="font-bold text-rose-600 font-mono">{selectedItem.estimated_power_loss_kw} kW</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Annual Potential Savings:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    ₹ {selectedItem.annual_financial_saving_inr.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Confirmation Status:</label>
                <select
                  value={editConfirmation}
                  onChange={(e) => setEditConfirmation(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                >
                  <option value="SUSPECTED">SUSPECTED (Awaiting Human Inspection)</option>
                  <option value="CONFIRMED">CONFIRMED (Valid Fault)</option>
                  <option value="REJECTED">REJECTED (False Positive)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Maintenance Repair Status:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                >
                  <option value="PENDING">PENDING (Work Order Staged)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Technicians on site)</option>
                  <option value="REPAIRED">REPAIRED (Maintenance complete)</option>
                  <option value="VERIFIED">VERIFIED (Post-repair leak checked & certified)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Verified Energy Savings Achieved (kWh):</label>
                <input
                  type="number"
                  step="10"
                  value={verifiedKwh}
                  onChange={(e) => setVerifiedKwh(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1 font-semibold">Operator / Maintenance Notes:</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

