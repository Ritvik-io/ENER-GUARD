import React, { useState, useEffect, useRef } from 'react';
import { Radar, Download, Trash2, MapPin, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from 'lucide-react';
import { LidarOccupancyMap } from '../components/maps/LidarOccupancyMap';
import { LidarScan, OccupancyGridMap, InspectionMarker } from '../types';
import { api } from '../services/api';

export const LidarMapping: React.FC = () => {
  const [scan, setScan] = useState<LidarScan | null>(null);
  const [mapState, setMapState] = useState<OccupancyGridMap | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<InspectionMarker | null>(null);
  const [newMarkerTag, setNewMarkerTag] = useState('Pinhole Air Leak');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to LiDAR WebSocket stream
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/lidar`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.scan) setScan(data.scan);
        if (data.map) setMapState(data.map);
      } catch (e) {
        console.error('Error parsing lidar WS', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleClearMap = async () => {
    if (window.confirm('Reset 2D SLAM grid map and clear trajectory history?')) {
      await api.clearSlamMap();
    }
  };

  const handleAddMarker = async () => {
    if (!mapState) return;
    try {
      await api.createInspection({
        site_name: 'Underground Mine Block-4',
        zone_name: 'Main Haulage Way',
        equipment_id: 'PIPE-MARKER',
        location_x: mapState.robot_pose.x,
        location_y: mapState.robot_pose.y,
        heading_deg: mapState.robot_pose.heading_deg,
        fault_type: 'COMPRESSED_AIR_LEAK',
        severity: 'MEDIUM',
        operator_remarks: newMarkerTag,
      });
      alert('Inspection location marker pinned to SLAM map!');
    } catch (e) {
      console.error('Error creating marker', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Map Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Radar className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">2D Occupancy Grid SLAM & Localization</h2>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Sensor: LDROBOT LD19 360° TOF LiDAR | Rate: 10 Hz | Resolution: 0.05m Log-Odds
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddMarker}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold shadow"
          >
            <MapPin className="w-4 h-4" />
            <span>Pin Finding at Rover Pose</span>
          </button>
          <button
            onClick={handleClearMap}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded text-xs font-medium"
          >
            <Trash2 className="w-4 h-4 text-slate-500" />
            <span>Clear Map</span>
          </button>
        </div>
      </div>

      {/* Main Full-Scale Canvas Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <LidarOccupancyMap
            scan={scan}
            mapState={mapState}
            onSelectMarker={(m) => setSelectedMarker(m)}
            heightPx={620}
          />
        </div>

        {/* SLAM Metrics & Inspection Points Inspector */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
              SLAM Navigation State
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Robot Pose X:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {mapState?.robot_pose.x.toFixed(3) ?? '0.000'} m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Robot Pose Y:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {mapState?.robot_pose.y.toFixed(3) ?? '0.000'} m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Heading (Yaw):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {mapState?.robot_pose.heading_deg.toFixed(1) ?? '0.0'}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">LiDAR Motor Speed:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {scan?.speed_rpm?.toFixed(0) ?? '600'} RPM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Ray Points:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {scan?.point_count ?? 0} pts/rev
                  </span>
                </div>
              </div>

              {/* Tagged Location Markers */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-1.5">Pinned Inspection Points:</h4>
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {mapState?.inspection_markers && mapState.inspection_markers.length > 0 ? (
                    mapState.inspection_markers.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold font-mono text-slate-900 block">{m.code}</span>
                          <span className="text-slate-500 font-mono">
                            ({m.x.toFixed(1)}m, {m.y.toFixed(1)}m)
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            m.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.fault}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No inspection markers pinned on map yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-blue-50 rounded border border-blue-200 text-[11px] text-blue-900 flex items-start space-x-1.5">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              2D LiDAR SLAM map coordinates are automatically attached to all leakage findings for maintenance team routing.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

