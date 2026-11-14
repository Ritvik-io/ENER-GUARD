import React, { useState } from 'react';
import { Camera, Download, Maximize2, RefreshCw, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { api } from '../services/api';

export const LiveCamera: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [savedImagePath, setSavedImagePath] = useState<string | null>(null);
  const [equipmentTag, setEquipmentTag] = useState('PIPE-AIR-042');
  const [zoneTag, setZoneTag] = useState('Ventilation Trunk A');

  const handleCapture = async () => {
    setSnapshotLoading(true);
    try {
      const res = await api.captureSnapshot();
      setSavedImagePath(res.filepath);
      setLastAnalysis(res.analysis);
    } catch (e) {
      console.error('Failed to capture snapshot', e);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleSaveToInspection = async () => {
    if (!lastAnalysis) return;
    try {
      await api.createInspection({
        equipment_id: equipmentTag,
        zone_name: zoneTag,
        fault_type: lastAnalysis.detected ? lastAnalysis.fault_type : 'NORMAL',
        severity: lastAnalysis.detected ? 'MEDIUM' : 'LOW',
        detection_method: lastAnalysis.detection_method,
        confidence_score: lastAnalysis.confidence,
        snapshot_path: savedImagePath || '',
        operator_remarks: lastAnalysis.summary,
      });
      alert('Inspection finding tagged and logged to database!');
    } catch (e) {
      console.error('Failed to save finding', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stream & Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">ESP32-CAM OV2640 Industrial Inspection Feed</h2>
          <p className="text-xs text-slate-500 font-mono">Stream Protocol: HTTP MJPEG (multipart/x-mixed-replace)</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCapture}
            disabled={snapshotLoading}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>{snapshotLoading ? 'Analyzing Frame...' : 'Capture Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Main Video View & Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stream Canvas */}
        <div className="lg:col-span-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative aspect-video bg-slate-950 rounded overflow-hidden flex items-center justify-center">
            <img
              src="/api/camera/stream"
              alt="ESP32-CAM Stream"
              className="w-full h-full object-contain"
            />
            {/* Stream HUD */}
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-[11px] font-mono text-emerald-400 border border-slate-700 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE FEED | 640x480 @ 15fps</span>
            </div>
          </div>
        </div>

        {/* Snapshot & AI Analysis Sidebar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
              AI Vision Leak & Anomaly Inspection
            </h3>

            {savedImagePath ? (
              <div className="space-y-3">
                <div className="aspect-video bg-slate-100 rounded overflow-hidden border border-slate-200 relative">
                  <img src={savedImagePath} alt="Snapshot" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-slate-900/70 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                    Captured Snapshot
                  </span>
                </div>

                {lastAnalysis && (
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Anomaly State:</span>
                      <span
                        className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                          lastAnalysis.detected ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {lastAnalysis.fault_type}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Detection Method:</span>
                      <span className="font-mono text-slate-700 text-[11px]">{lastAnalysis.detection_method}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Confidence Score:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {(lastAnalysis.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Defect Area:</span>
                      <span className="font-mono text-slate-900">{lastAnalysis.defect_area_pct}% of surface</span>
                    </div>

                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                      {lastAnalysis.summary}
                    </p>
                  </div>
                )}

                {/* Tag against inspection point */}
                <div className="space-y-2 text-xs pt-1">
                  <div>
                    <label className="text-slate-500 block mb-0.5">Equipment ID:</label>
                    <input
                      type="text"
                      value={equipmentTag}
                      onChange={(e) => setEquipmentTag(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-0.5">Mine Zone:</label>
                    <input
                      type="text"
                      value={zoneTag}
                      onChange={(e) => setZoneTag(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-mono"
                    />
                  </div>
                  <button
                    onClick={handleSaveToInspection}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs transition-colors shadow"
                  >
                    Save to Inspection Logbook
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded text-slate-400">
                <Camera className="w-8 h-8 mb-2 stroke-1" />
                <p className="text-xs">No snapshot captured yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Click "Capture Snapshot" to run OpenCV computer vision leak analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

