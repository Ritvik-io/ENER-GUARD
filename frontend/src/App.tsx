import React, { useState } from 'react';
import { TelemetryProvider } from './context/TelemetryContext';
import { RoverControlProvider } from './context/RoverControlContext';
import { Sidebar, navItems } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Pages
import { Dashboard } from './pages/Dashboard';
import { LiveCamera } from './pages/LiveCamera';
import { RoverControl } from './pages/RoverControl';
import { LidarMapping } from './pages/LidarMapping';
import { EnvironmentalSensors } from './pages/EnvironmentalSensors';
import { VentilationMonitoring } from './pages/VentilationMonitoring';
import { CompressedAirLeakage } from './pages/CompressedAirLeakage';
import { WaterSlurryPipelines } from './pages/WaterSlurryPipelines';
import { EnergyConservation } from './pages/EnergyConservation';
import { InspectionLogs } from './pages/InspectionLogs';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  const getPageTitle = () => {
    const item = navItems.find((i) => i.id === currentPage);
    return item ? item.label : 'SafeScout MINE-ENERGY';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={(pageId) => setCurrentPage(pageId)} />;
      case 'camera':
        return <LiveCamera />;
      case 'control':
        return <RoverControl />;
      case 'lidar':
        return <LidarMapping />;
      case 'environmental':
        return <EnvironmentalSensors />;
      case 'ventilation':
        return <VentilationMonitoring />;
      case 'acoustic':
        return <CompressedAirLeakage />;
      case 'pipeline':
        return <WaterSlurryPipelines />;
      case 'energy':
        return <EnergyConservation />;
      case 'inspections':
        return <InspectionLogs />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={(pageId) => setCurrentPage(pageId)} />;
    }
  };

  return (
    <TelemetryProvider>
      <RoverControlProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
          {/* Dark Navy Sidebar */}
          <Sidebar currentPage={currentPage} onSelectPage={(p) => setCurrentPage(p)} />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <Header currentPageTitle={getPageTitle()} />

            {/* Scrollable Page Body */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/90">
              <div className="max-w-7xl mx-auto">
                {renderPage()}
              </div>
            </main>
          </div>
        </div>
      </RoverControlProvider>
    </TelemetryProvider>
  );
};

export default App;

