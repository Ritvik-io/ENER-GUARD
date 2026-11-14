import React, { useState } from 'react';
import { FileText, Download, FileSpreadsheet, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';

export const Reports: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadCSV = () => {
    setDownloading('csv');
    window.location.href = '/api/reports/csv';
    setTimeout(() => setDownloading(null), 1500);
  };

  const handleDownloadPDF = () => {
    setDownloading('pdf');
    window.location.href = '/api/reports/pdf';
    setTimeout(() => setDownloading(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Audit Documentation & Official Report Generation</h2>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Export certified engineering energy conservation audits and mine safety reports.
          </p>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Executive Audit Report */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Official PDF Energy Audit & Safety Report
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Formatted multi-page PDF generated via ReportLab containing executive summaries, potential vs verified savings breakdown, statutory ventilation compliance notes, and full defect registers suitable for plant management and external auditors.
            </p>

            <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Executive energy savings summary table (₹ / kWh)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Statutory ventilation airflow & velocity verification</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Sign-off block for Mine Manager & Energy Auditor</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading === 'pdf'}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{downloading === 'pdf' ? 'Compiling PDF...' : 'Download Official PDF Report'}</span>
          </button>
        </div>

        {/* CSV Raw Data Export */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              CSV Raw Telemetry & Finding Data Export
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Complete tabular export of all sensor readings, SLAM map coordinates, power losses, CFM flow rates, and maintenance tags compatible with Microsoft Excel, PowerBI, and enterprise ERP/SAP maintenance modules.
            </p>

            <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Raw 2D SLAM metric coordinates for CAD/GIS mapping</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Individual component power loss in kW & kWh/day</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>UTF-8 standard CSV encoding with full timestamp history</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={downloading === 'csv'}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{downloading === 'csv' ? 'Exporting CSV...' : 'Export Complete CSV Dataset'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

