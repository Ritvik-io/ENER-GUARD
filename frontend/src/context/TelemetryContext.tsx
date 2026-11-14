/**
 * SafeScout MINE-ENERGY - Telemetry Context & Live WebSocket Feed
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { RoverTelemetry } from '../types';

interface TelemetryContextType {
  telemetry: RoverTelemetry | null;
  isConnected: boolean;
  isStale: boolean;
  isSimulated: boolean;
  lastHeartbeatTime: number;
}

const TelemetryContext = createContext<TelemetryContextType>({
  telemetry: null,
  isConnected: false,
  isStale: false,
  isSimulated: false,
  lastHeartbeatTime: 0,
});

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [telemetry, setTelemetry] = useState<RoverTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const lastPacketRef = useRef<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: any;
    let staleChecker: any;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsStale(false);
        lastPacketRef.current = Date.now();
      };

      ws.onmessage = (event) => {
        try {
          const data: RoverTelemetry = JSON.parse(event.data);
          setTelemetry(data);
          lastPacketRef.current = Date.now();
          setIsStale(false);
        } catch (e) {
          console.error('Failed to parse telemetry frame', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWebSocket();

    // Stale data watchdog (checks every 500ms)
    staleChecker = setInterval(() => {
      if (Date.now() - lastPacketRef.current > 2000) {
        setIsStale(true);
      }
    }, 500);

    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(staleChecker);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const isSimulated = telemetry?.is_simulated ?? false;

  return (
    <TelemetryContext.Provider
      value={{
        telemetry,
        isConnected,
        isStale,
        isSimulated,
        lastHeartbeatTime: lastPacketRef.current,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => useContext(TelemetryContext);

