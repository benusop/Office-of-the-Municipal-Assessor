
import React, { useState, useMemo } from 'react';
import { Assessment } from '../types';
import { CalendarRange, BarChart3, TrendingUp, Download, Building2, Map as MapIcon, Tractor } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  assessments: Assessment[];
}

const getCreationDate = (a: Assessment) => {
    // If ID is a timestamp (13 digits), use it. Otherwise assume old data (Jan 1, 2020)
    if (/^\d{13}$/.test(a.id)) {
        return new Date(parseInt(a.id));
    }
    return new Date('2020-01-01');
};

const formatCurrency = (val: number) => `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Reports: React.FC<ReportsProps> = ({ assessments }) => {
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'QUARTERLY' | 'YEAREND'>('MONTHLY');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  // --- FILTERS ---
  const filteredData = useMemo(() => {
      if (activeTab === 'MONTHLY') {
          return assessments.filter(a => {
              const d = getCreationDate(a);
              return d.getFullYear() === year && d.getMonth() === month;
          });
      } else if (activeTab === 'QUARTERLY') {
          return assessments.filter(a => {
              const d = getCreationDate(a);
              const q = Math.floor(d.getMonth() / 3) + 1;
              return d.getFullYear() === year && q === quarter;
          });
      } else {
          // Year End Logic handled separately in renderer
          return assessments; 
      }
  }, [assessments, activeTab, year, month, quarter]);

  // --- EXPORT ---
  const handleExport = () => {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`${activeTab} REPORT - ${year}`, 14, 20);
      
      const tableData = filteredData.map(a => [
          a.td_Number,
          a.owner_name,
          a.td_Kind,
          a.td_Class,
          formatCurrency(a.assessed_Value)
      ]);

      autoTable(doc, {
          startY: 30,
          head: [['TD Number', 'Owner', 'Kind', 'Class', 'AV']],
          body: tableData,
      });
      doc.save(`Report_${activeTab}_${year}.pdf`);
  };

  const SummaryCard = ({ title, value, color }: { title: string, value: string, color: string }) => (
      <div className={`p-6 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between h-32`}>
          <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">{title}</h3>
          <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
      </div>
  );

  const renderMonthly = () => {
      const totalAV = filteredData.reduce((acc, curr) => acc + (curr.assessed_Value || 0), 0);
      const totalMV = filteredData.reduce((acc, curr) => acc + (curr.market_Value || 0), 0);

      return (
          <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SummaryCard title="Parcels Added" value={filteredData.length.toString()} color="text-gray-900" />
                  <SummaryCard title="Total Assessed Value" value={formatCurrency(totalAV)} color="text-emerald-600" />
                  <SummaryCard title="Total Market Value" value={formatCurrency(totalMV)} color="text-blue-600" />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-sm text-gray-700">
                      New Assessments for {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </div>
                  <table className="min-w-full text-sm text-left">
                      <thead className="bg-white text-gray-500">
                          <tr>
                              <th className="p-4">TD Number</th>
                              <th className="p-4">Owner</th>
                              <th className="p-4">Kind/Class</th>
                              <th className="p-4 text-right">Assessed Value</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredData.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-400">No records added this month.</td></tr> : 
                            filteredData.map(a => (
                              <tr key={a.id} className="hover:bg-gray-50">
                                  <td className="p-4 font-mono">{a.td_Number}</td>
                                  <td className="p-4 font-bold">{a.owner_name}</td>
                                  <td className="p-4 text-gray-600">{a.td_Kind} - {a.td_Class}</td>
                                  <td className="p-4 text-right font-mono font-bold text-emerald-700">{formatCurrency(a.assessed_Value)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  const renderYearEnd = () => {
      const prevTotal = assessments.filter(a => getCreationDate(a) < new Date(`${year}-01-01`));
      const addedThisYear = assessments.filter(a => {
          const d = getCreationDate(a);
          return d.getFullYear() === year;
      });

      const kinds = ['Land', 'Building', 'Machinery'];
      
      const getStats = (dataset: Assessment[], kind: string) => {
          const filtered = dataset.filter(a => (a.td_Kind || 'Land') === kind);
          const count = filtered.length;
          const av = filtered.reduce((acc, c) => acc + (c.assessed_Value || 0), 0);
          return { count, av };
      };

      return (
          <div className="space-y-6 animate-fadeIn">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-6">Year End Consolidated Report ({year})</h2>
                  <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border-collapse border border-gray-200">
                          <thead className="bg-gray-100">
                              <tr>
                                  <th className="border p-3 w-1/4">Property Kind</th>
                                  <th className="border p-3 text-center" colSpan={2}>Previous Year Total (Until Dec 31, {year-1})</th>
                                  <th className="border p-3 text-center" colSpan={2}>Added This Year ({year})</th>
                                  <th className="border p-3 text-center" colSpan={2}>Grand Total</th>
                              </tr>
                              <tr className="bg-gray-50 text-xs uppercase">
                                  <th className="border p-2"></th>
                                  <th className="border p-2 text-center">Count</th>
                                  <th className="border p-2 text-right">Assessed Value</th>
                                  <th className="border p-2 text-center">Count</th>
                                  <th className="border p-2 text-right">Assessed Value</th>
                                  <th className="border p-2 text-center">Count</th>
                                  <th className="border p-2 text-right">Assessed Value</th>
                              </tr>
                          </thead>
                          <tbody>
                              {kinds.map(kind => {
                                  const prev = getStats(prevTotal, kind);
                                  const added = getStats(addedThisYear, kind);
                                  return (
                                      <tr key={kind} className="hover:bg-gray-50">
                                          <td className="border p-3 font-bold flex items-center">
                                              {kind === 'Land' && <MapIcon size={16} className="mr-2 text-emerald-600"/>}
                                              {kind === 'Building' && <Building2 size={16} className="mr-2 text-blue-600"/>}
                                              {kind === 'Machinery' && <Tractor size={16} className="mr-2 text-orange-600"/>}
                                              {kind}
                                          </td>
                                          <td className="border p-3 text-center text-gray-500">{prev.count}</td>
                                          <td className="border p-3 text-right font-mono text-gray-500">{formatCurrency(prev.av)}</td>
                                          
                                          <td className="border p-3 text-center font-bold text-blue-600">+{added.count}</td>
                                          <td className="border p-3 text-right font-mono font-bold text-blue-600">{formatCurrency(added.av)}</td>
                                          
                                          <td className="border p-3 text-center font-extrabold text-gray-900">{prev.count + added.count}</td>
                                          <td className="border p-3 text-right font-mono font-extrabold text-gray-900">{formatCurrency(prev.av + added.av)}</td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 mb-20">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div>
             <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
             <p className="text-sm text-gray-500">Generate statistical reports of assessment data.</p>
          </div>
          <button onClick={handleExport} className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-bold text-sm shadow-sm">
             <Download size={18} className="mr-2" /> Export Report
          </button>
       </div>

       {/* Controls */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
             <button 
                onClick={() => setActiveTab('MONTHLY')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'MONTHLY' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <CalendarRange size={18} className="mr-2" /> Monthly
             </button>
             <button 
                onClick={() => setActiveTab('QUARTERLY')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'QUARTERLY' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <BarChart3 size={18} className="mr-2" /> Quarterly
             </button>
             <button 
                onClick={() => setActiveTab('YEAREND')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'YEAREND' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <TrendingUp size={18} className="mr-2" /> Year End
             </button>
          </div>

          <div className="flex gap-2">
              <select value={year} onChange={e => setYear(Number(e.target.value))} className="border p-2 rounded text-sm font-bold bg-white text-gray-900">
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
              </select>
              
              {activeTab === 'MONTHLY' && (
                  <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border p-2 rounded text-sm bg-white text-gray-900">
                      {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('default', {month: 'long'})}</option>)}
                  </select>
              )}

              {activeTab === 'QUARTERLY' && (
                  <select value={quarter} onChange={e => setQuarter(Number(e.target.value))} className="border p-2 rounded text-sm bg-white text-gray-900">
                      <option value={1}>1st Quarter (Jan-Mar)</option>
                      <option value={2}>2nd Quarter (Apr-Jun)</option>
                      <option value={3}>3rd Quarter (Jul-Sep)</option>
                      <option value={4}>4th Quarter (Oct-Dec)</option>
                  </select>
              )}
          </div>
       </div>

       {activeTab === 'MONTHLY' && renderMonthly()}
       {activeTab === 'QUARTERLY' && renderMonthly()} {/* Quarterly essentially reuses Monthly view style but filters differently */}
       {activeTab === 'YEAREND' && renderYearEnd()}
    </div>
  );
};

export default Reports;
