import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, MapPin, Eye } from 'lucide-react';
import { LidarScan, OccupancyGridMap, InspectionMarker } from '../../types';

interface LidarOccupancyMapProps {
  scan: LidarScan | null;
  mapState: OccupancyGridMap | null;
  onSelectMarker?: (marker: InspectionMarker) => void;
  heightPx?: number;
}

export const LidarOccupancyMap: React.FC<LidarOccupancyMapProps> = ({
  scan,
  mapState,
  onSelectMarker,
  heightPx = 520,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pan & Zoom Transform
  const [scale, setScale] = useState<number>(45); // pixels per meter
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showRays, setShowRays] = useState<boolean>(true);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);

  // Reset viewport to center on rover
  const handleResetView = useCallback(() => {
    if (canvasRef.current && mapState) {
      setScale(45);
      setPanOffset({
        x: canvasRef.current.width / 2 - mapState.robot_pose.x * 45,
        y: canvasRef.current.height / 2 + mapState.robot_pose.y * 45,
      });
    }
  }, [mapState]);

  // Handle Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setScale((prev) => Math.min(180, Math.max(15, prev * zoomFactor)));
  };

  // Handle Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Render Canvas Map Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to container
    const width = canvas.parentElement?.clientWidth || 800;
    const height = heightPx;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      if (panOffset.x === 0 && panOffset.y === 0) {
        setPanOffset({ x: width / 2, y: height / 2 });
      }
    }

    // 1. Clear Background (Industrial dark blueprint/slate)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Save context for world transform
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);

    // 2. Metric Grid Lines (1 meter intervals)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridRange = 20; // -20m to +20m
    ctx.beginPath();
    for (let i = -gridRange; i <= gridRange; i++) {
      // Vertical lines
      ctx.moveTo(i * scale, -gridRange * scale);
      ctx.lineTo(i * scale, gridRange * scale);
      // Horizontal lines
      ctx.moveTo(-gridRange * scale, i * scale);
      ctx.lineTo(gridRange * scale, i * scale);
    }
    ctx.stroke();

    // Coordinate Axes (X: East, Y: North)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-gridRange * scale, 0);
    ctx.lineTo(gridRange * scale, 0);
    ctx.moveTo(0, -gridRange * scale);
    ctx.lineTo(0, gridRange * scale);
    ctx.stroke();

    // 3. Draw Travel Trajectory Path
    if (showTrajectory && mapState?.trajectory && mapState.trajectory.length > 1) {
      ctx.strokeStyle = '#38bdf8'; // Sky blue
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      mapState.trajectory.forEach(([tx, ty], idx) => {
        const px = tx * scale;
        const py = -ty * scale; // Invert Y for screen coords
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw LiDAR Point Cloud Rays / Obstacles
    const rx = (mapState?.robot_pose.x ?? 0) * scale;
    const ry = -(mapState?.robot_pose.y ?? 0) * scale;

    if (scan?.points && scan.points.length > 0) {
      const headingRad = ((mapState?.robot_pose.heading_deg ?? 0) * Math.PI) / 180;
      const cosH = Math.cos(headingRad);
      const sinH = Math.sin(headingRad);

      scan.points.forEach((pt) => {
        // Transform local point to world
        const wx = (mapState?.robot_pose.x ?? 0) + (pt.x * cosH - pt.y * sinH);
        const wy = (mapState?.robot_pose.y ?? 0) + (pt.x * sinH + pt.y * cosH);
        const px = wx * scale;
        const py = -wy * scale;

        // Draw ray line if enabled
        if (showRays) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)'; // faint blue ray
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(px, py);
          ctx.stroke();
        }

        // Draw obstacle hit point
        ctx.fillStyle = pt.intensity > 180 ? '#f43f5e' : '#fb923c'; // red/orange by reflectivity
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      });
    }

    // 5. Draw Inspection Markers
    if (mapState?.inspection_markers) {
      mapState.inspection_markers.forEach((m) => {
        const mx = m.x * scale;
        const my = -m.y * scale;

        // Outer pulse circle
        ctx.strokeStyle = m.severity === 'CRITICAL' ? '#ef4444' : '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = m.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)';
        ctx.fill();

        // Label
        ctx.font = '10px monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(m.code || 'FINDING', mx + 10, my - 5);
      });
    }

    // 6. Draw Robot Rover Glyph
    ctx.save();
    ctx.translate(rx, ry);
    const headingRad = -((mapState?.robot_pose.heading_deg ?? 0) * Math.PI) / 180;
    ctx.rotate(headingRad);

    // Rover Chassis (Rectangular footprint: 0.45m x 0.35m)
    const cw = 0.45 * scale;
    const ch = 0.35 * scale;
    ctx.fillStyle = '#2563eb'; // Industrial Blue
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 4);
    ctx.fill();
    ctx.stroke();

    // Wheels (4 DC motors)
    ctx.fillStyle = '#0f172a';
    const ww = 0.14 * scale;
    const wh = 0.08 * scale;
    ctx.fillRect(-cw / 2 + 2, -ch / 2 - wh + 2, ww, wh); // Front Left
    ctx.fillRect(cw / 2 - ww - 2, -ch / 2 - wh + 2, ww, wh); // Front Right
    ctx.fillRect(-cw / 2 + 2, ch / 2 - 2, ww, wh); // Rear Left
    ctx.fillRect(cw / 2 - ww - 2, ch / 2 - 2, ww, wh); // Rear Right

    // Direction Pointer Arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cw / 2 + 4, 0);
    ctx.lineTo(cw / 4, -ch / 4);
    ctx.lineTo(cw / 4, ch / 4);
    ctx.closePath();
    ctx.fill();

    // Center LiDAR circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Restore screen coordinate space
    ctx.restore();

    // 7. HUD Overlays (Scale bar, Rover coordinates)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(10, 10, 240, 65);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(10, 10, 240, 65);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('2D OCCUPANCY SLAM (LDROBOT LD19)', 18, 25);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px monospace';
    ctx.fillText(
      `POSE: X=${mapState?.robot_pose.x.toFixed(2) ?? '0.00'}m  Y=${mapState?.robot_pose.y.toFixed(2) ?? '0.00'}m`,
      18,
      44
    );
    ctx.fillText(`HEADING: ${mapState?.robot_pose.heading_deg.toFixed(1) ?? '0.0'}°`, 18, 62);

    // Scale bar in bottom right
    const barLengthM = 2; // 2 meters
    const barPx = barLengthM * scale;
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width - 30 - barPx, height - 20);
    ctx.lineTo(width - 30, height - 20);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${barLengthM} METERS`, width - 30, height - 26);
    ctx.textAlign = 'left';
  }, [scan, mapState, scale, panOffset, showRays, showTrajectory, heightPx]);

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `safescout_slam_map_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="relative rounded border border-slate-700 overflow-hidden bg-slate-900 shadow">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full cursor-grab active:cursor-grabbing block"
      />

      {/* Floating Toolbar Controls */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-slate-800/90 backdrop-blur border border-slate-700 p-1.5 rounded shadow">
        <button
          onClick={() => setScale((s) => Math.min(180, s * 1.25))}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(15, s * 0.8))}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Center on Rover"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <button
          onClick={() => setShowRays(!showRays)}
          title="Toggle LiDAR Rays"
          className={`p-1.5 rounded transition-colors ${showRays ? 'text-blue-400 bg-blue-950/40' : 'text-slate-400 hover:text-white'}`}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={handleExportPNG}
          title="Export Map PNG"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

