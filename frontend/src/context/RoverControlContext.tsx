/**
 * SafeScout MINE-ENERGY - Dead-Man Rover Control Context & Gamepad Loop
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

interface RoverControlContextType {
  speedPct: number;
  setSpeedPct: (speed: number) => void;
  isMoving: boolean;
  gamepadConnected: boolean;
  activeDirection: string | null;
  sendManualMove: (vx: number, omega: number) => Promise<void>;
  stopRover: () => Promise<void>;
  triggerEStop: () => Promise<void>;
  resetEStop: () => Promise<void>;
}

const RoverControlContext = createContext<RoverControlContextType>({
  speedPct: 60,
  setSpeedPct: () => {},
  isMoving: false,
  gamepadConnected: false,
  activeDirection: null,
  sendManualMove: async () => {},
  stopRover: async () => {},
  triggerEStop: async () => {},
  resetEStop: async () => {},
});

export const RoverControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [speedPct, setSpeedPct] = useState<number>(60);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [gamepadConnected, setGamepadConnected] = useState<boolean>(false);
  const [activeDirection, setActiveDirection] = useState<string | null>(null);

  const activeKeysRef = useRef<Set<string>>(new Set());
  const controlLoopTimer = useRef<any>(null);

  const sendManualMove = useCallback(async (vx: number, omega: number) => {
    try {
      await api.moveRover(vx, omega, speedPct);
      setIsMoving(vx !== 0 || omega !== 0);
    } catch (e) {
      console.error('Movement command error', e);
    }
  }, [speedPct]);

  const stopRover = useCallback(async () => {
    try {
      await api.moveRover(0, 0, 0);
      setIsMoving(false);
      setActiveDirection(null);
    } catch (e) {
      console.error('Stop error', e);
    }
  }, []);

  const triggerEStop = useCallback(async () => {
    try {
      await api.emergencyStop();
      setIsMoving(false);
      setActiveDirection(null);
    } catch (e) {
      console.error('E-Stop error', e);
    }
  }, []);

  const resetEStop = useCallback(async () => {
    try {
      await api.resetEmergencyStop();
    } catch (e) {
      console.error('Reset E-Stop error', e);
    }
  }, []);

  // Keyboard Dead-Man Watchdog Controller
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd', ' '].includes(key)) {
        e.preventDefault();
        
        if (key === ' ') {
          triggerEStop();
          return;
        }

        activeKeysRef.current.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeysRef.current.delete(key);
      if (activeKeysRef.current.size === 0) {
        stopRover();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Continuous 100ms dead-man dispatch loop while keys are held
    controlLoopTimer.current = setInterval(() => {
      const keys = activeKeysRef.current;
      if (keys.size === 0) return;

      let vx = 0;
      let omega = 0;
      let dir = '';

      if (keys.has('arrowup') || keys.has('w')) {
        vx += 1.0;
        dir = 'FORWARD';
      }
      if (keys.has('arrowdown') || keys.has('s')) {
        vx -= 1.0;
        dir = 'BACKWARD';
      }
      if (keys.has('arrowleft') || keys.has('a')) {
        omega -= 1.0;
        dir = dir ? `${dir}_LEFT` : 'LEFT';
      }
      if (keys.has('arrowright') || keys.has('d')) {
        omega += 1.0;
        dir = dir ? `${dir}_RIGHT` : 'RIGHT';
      }

      if (vx !== 0 || omega !== 0) {
        setActiveDirection(dir);
        sendManualMove(vx, omega);
      }
    }, 100);

    // Gamepad API listener
    const onGamepadConnected = () => setGamepadConnected(true);
    const onGamepadDisconnected = () => setGamepadConnected(false);
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
      clearInterval(controlLoopTimer.current);
    };
  }, [sendManualMove, stopRover, triggerEStop]);

  return (
    <RoverControlContext.Provider
      value={{
        speedPct,
        setSpeedPct,
        isMoving,
        gamepadConnected,
        activeDirection,
        sendManualMove,
        stopRover,
        triggerEStop,
        resetEStop,
      }}
    >
      {children}
    </RoverControlContext.Provider>
  );
};

export const useRoverControl = () => useContext(RoverControlContext);

