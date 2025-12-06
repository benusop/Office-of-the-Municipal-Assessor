import React, { useState } from 'react';
import { User } from '../types';
import { 
  FileBadge, ArrowRightLeft, CalendarRange, 
  BarChart3, TrendingUp, Search, Filter, Plus, Download
} from 'lucide-react';

export type OfficeViewType = 'CERTIFICATION' | 'TRANSACTION' | 'REPORTS';

interface OfficeManagementProps {
  user: User;
  view: OfficeViewType;
}

const OfficeManagement: React.FC<OfficeManagementProps> = ({ user, view }) => {
  
  const renderContent = () => {
    switch (view) {
      case 'CERTIFICATION':
        return <div className="max-w-7xl mx-auto"><TableTemplate title="Certifications Issued" columns={['Date', 'Control No.', 'Requestor', 'Type', 'TD Number', 'OR Number', 'Amount']} /></div>;
      case 'TRANSACTION':
        return <div className="max-w-7xl mx-auto"><TableTemplate title="Office Transactions" columns={['Date', 'Trans ID', 'Client', 'Transaction Type', 'Status', 'Processor']} /></div>;
      case 'REPORTS':
        return <div className="max-w-7xl mx-auto"><ReportsHub /></div>;
      default:
        return <div>Select a module</div>;
    }
  };

  return (
    <div className="space-y-6 mb-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
        <h1 className="text-xl font-bold text-gray-900">Office Management</h1>
        <p className="text-sm text-gray-500">Administrative Record System</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
        User: {user.name}
        </div>
      </div>
      
      {renderContent()}
    </div>
  );
};

// --- Templates ---

const TableTemplate = ({ title, columns }: { title: string, columns: string[] }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
         {title === 'Certifications Issued' && <FileBadge size={24} className="text-emerald-500"/>}
         {title === 'Office Transactions' && <ArrowRightLeft size={24} className="text-purple-500"/>}
         {title}
      </h2>
      <div className="flex gap-2 w-full sm:w-auto">
        <div className="relative flex-grow sm:flex-grow-0">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input type="text" placeholder="Search records..." className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600"><Filter size={20} /></button>
        <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-sm">
          <Plus size={18} className="mr-2" /> New Entry
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Empty State for Template */}
          <tr>
            <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-400 italic">
              No records found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ReportsHub = () => {
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'QUARTERLY' | 'YEAREND'>('MONTHLY');

  return (
    <div className="space-y-6">
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-center">
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
       </div>

       {activeTab === 'MONTHLY' && <ReportTemplate title="Monthly Accomplishment Report" period="Month" icon={CalendarRange} color="text-emerald-600" />}
       {activeTab === 'QUARTERLY' && <ReportTemplate title="Quarterly Assessment Report" period="Quarter" icon={BarChart3} color="text-blue-600" />}
       {activeTab === 'YEAREND' && <ReportTemplate title="Year End Report" period="Year" icon={TrendingUp} color="text-red-600" />}
    </div>
  );
};

const ReportTemplate = ({ title, period, icon: Icon, color }: { title: string, period: string, icon: any, color: string }) => (
  <div className="space-y-6 animate-fadeIn">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Icon size={24} className={color}/>
            {title}
        </h2>
        <p className="text-sm text-gray-500">Generate and view reports for the selected {period.toLowerCase()}.</p>
      </div>
      <button className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-bold text-sm shadow-sm">
        <Download size={18} className="mr-2" /> Export Report
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Total Processed</h3>
        <div className="text-3xl font-bold text-gray-900">0</div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Pending Actions</h3>
        <div className="text-3xl font-bold text-orange-600">0</div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Completion Rate</h3>
        <div className="text-3xl font-bold text-emerald-600">0%</div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-64 flex items-center justify-center bg-gray-50 border-dashed">
      <p className="text-gray-400 font-medium">Chart Visualization Placeholder</p>
    </div>
  </div>
);

export default OfficeManagement;
