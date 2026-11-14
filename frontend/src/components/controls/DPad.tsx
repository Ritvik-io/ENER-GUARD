import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Square, ShieldAlert } from 'lucide-react';
import { useRoverControl } from '../../context/RoverControlContext';

export const DPad: React.FC = () => {
  const { sendManualMove, stopRover, triggerEStop, activeDirection, isMoving } = useRoverControl();

  const handleStart = (vx: number, omega: number) => {
    sendManualMove(vx, omega);
  };

  const handleEnd = () => {
    stopRover();
  };

  return (
    <div className="flex flex-col items-center select-none">
      <div className="grid grid-cols-3 gap-2 w-48 h-48 p-2 bg-slate-200/80 rounded-xl border border-slate-300 shadow-inner">
        {/* Top Empty */}
        <div />

        {/* Forward */}
        <button
          onMouseDown={() => handleStart(1.0, 0.0)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={() => handleStart(1.0, 0.0)}
          onTouchEnd={handleEnd}
          className={`flex items-center justify-center rounded-lg border shadow transition-all ${
            activeDirection?.includes('FORWARD')
              ? 'bg-blue-600 text-white border-blue-700 shadow-inner'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 active:bg-blue-600 active:text-white'
          }`}
          title="Forward (W / Up)"
        >
          <ChevronUp className="w-7 h-7" />
        </button>

        {/* Top-Right Empty */}
        <div />

        {/* Left */}
        <button
          onMouseDown={() => handleStart(0.0, -1.0)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={() => handleStart(0.0, -1.0)}
          onTouchEnd={handleEnd}
          className={`flex items-center justify-center rounded-lg border shadow transition-all ${
            activeDirection?.includes('LEFT')
              ? 'bg-blue-600 text-white border-blue-700 shadow-inner'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 active:bg-blue-600 active:text-white'
          }`}
          title="Turn Left (A / Left)"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        {/* Center Emergency Stop Button */}
        <button
          onClick={() => triggerEStop()}
          className="flex flex-col items-center justify-center bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg border border-red-700 shadow transition-all font-bold text-[10px]"
          title="Emergency Stop (Spacebar)"
        >
          <ShieldAlert className="w-5 h-5 mb-0.5" />
          <span>STOP</span>
        </button>

        {/* Right */}
        <button
          onMouseDown={() => handleStart(0.0, 1.0)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={() => handleStart(0.0, 1.0)}
          onTouchEnd={handleEnd}
          className={`flex items-center justify-center rounded-lg border shadow transition-all ${
            activeDirection?.includes('RIGHT')
              ? 'bg-blue-600 text-white border-blue-700 shadow-inner'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 active:bg-blue-600 active:text-white'
          }`}
          title="Turn Right (D / Right)"
        >
          <ChevronRight className="w-7 h-7" />
        </button>

        {/* Bottom Empty */}
        <div />

        {/* Reverse */}
        <button
          onMouseDown={() => handleStart(-1.0, 0.0)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={() => handleStart(-1.0, 0.0)}
          onTouchEnd={handleEnd}
          className={`flex items-center justify-center rounded-lg border shadow transition-all ${
            activeDirection?.includes('BACKWARD')
              ? 'bg-blue-600 text-white border-blue-700 shadow-inner'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 active:bg-blue-600 active:text-white'
          }`}
          title="Backward (S / Down)"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        {/* Bottom-Right Empty */}
        <div />
      </div>

      <p className="mt-2 text-[11px] font-mono text-slate-500 text-center">
        Dead-man watchdog active. Movement halts immediately upon release.
      </p>
    </div>
  );
};

