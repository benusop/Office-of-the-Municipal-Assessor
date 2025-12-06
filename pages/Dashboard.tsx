import React, { useMemo } from 'react';
import { Assessment } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { COLORS } from '../constants';
import { FileText, Calculator, Landmark, LucideIcon, Building2, Tractor, Map as MapIcon } from 'lucide-react';

interface DashboardProps {
  assessments: Assessment[];
}

interface StatCardProps {
  title: string;
  value: string;
  colorClass: string;
  subText?: string;
  icon?: LucideIcon;
}

interface KindStatData {
  total: number;
  taxable: number;
  exempt: number;
  cancelled: number;
  others: number;
}

const PALETTE = [
  '#059669', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Green
  '#6366F1', // Indigo
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#84CC16', // Lime
  '#06B6D4', // Cyan
];

const Dashboard: React.FC<DashboardProps> = ({ assessments }) => {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const stats = useMemo(() => {
    const total = assessments.length;
    const byBarangay: Record<string, number> = {};
    
    const statusCounts = { Taxable: 0, Exempt: 0, Cancelled: 0, Others: 0 };
    const kindStats: Record<string, KindStatData> = {
      Land: { total: 0, taxable: 0, exempt: 0, cancelled: 0, others: 0 },
      Building: { total: 0, taxable: 0, exempt: 0, cancelled: 0, others: 0 },
      Machinery: { total: 0, taxable: 0, exempt: 0, cancelled: 0, others: 0 }
    };
    
    let sumTaxable = 0;
    let sumExempt = 0;
    let sumOthers = 0;
    let sumTaxDue = 0;

    assessments.forEach(a => {
      const rawStatus = a.td_Status || 'No Data';
      const statusLower = rawStatus.trim().toLowerCase();
      
      // Normalize Kind to Title Case to match keys
      let kind = 'Land';
      const rawKind = (a.td_Kind || '').toLowerCase();
      if (rawKind === 'building') kind = 'Building';
      if (rawKind === 'machinery') kind = 'Machinery';

      // 1. Barangay Count
      const brgy = a.td_barangay || 'Unknown';
      byBarangay[brgy] = (byBarangay[brgy] || 0) + 1;
      
      // 2. Kind Count & Breakdown
      // Robust check to ensure kind exists in keys, default to Land if unknown
      const targetKind = kindStats[kind] ? kind : 'Land';
      
      kindStats[targetKind].total++;
      if (statusLower === 'taxable') kindStats[targetKind].taxable++;
      else if (statusLower === 'exempt' || statusLower === 'exempted') kindStats[targetKind].exempt++;
      else if (statusLower === 'cancelled') kindStats[targetKind].cancelled++;
      else kindStats[targetKind].others++;
      

      // 3. Status Buckets & Monetary Logic
      const val = a.assessed_Value || 0;
      const taxDue = a.tax_Due || 0;

      if (statusLower === 'taxable') {
        statusCounts.Taxable++;
        sumTaxable += val;
        sumTaxDue += taxDue;
      } else if (statusLower === 'exempt' || statusLower === 'exempted') {
        statusCounts.Exempt++;
        sumExempt += val;
      } else if (statusLower === 'cancelled') {
        statusCounts.Cancelled++;
        sumOthers += val;
      } else {
        statusCounts.Others++;
        sumOthers += val;
      }
    });

    return {
      total,
      byBarangay: Object.entries(byBarangay).map(([name, value]) => ({ name, value })),
      byStatus: [
        { name: 'Taxable', value: statusCounts.Taxable, color: COLORS.charts.primary },
        { name: 'Exempted', value: statusCounts.Exempt, color: COLORS.charts.secondary },
        { name: 'Cancelled', value: statusCounts.Cancelled, color: COLORS.charts.tertiary },
        { name: 'Others', value: statusCounts.Others, color: '#6b7280' }
      ].filter(item => item.value > 0),
      kindStats, 
      sumTaxable,
      sumExempt,
      sumOthers,
      sumTaxDue
    };
  }, [assessments]);

  const formatCurrency = (val: number) => `₱${val.toLocaleString()}`;

  const StatCard: React.FC<StatCardProps> = ({ title, value, colorClass, subText, icon: Icon }) => {
    const getBgClass = (textClass: string) => textClass.replace('text-', 'bg-').replace('600', '100');

    return (
      <div className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
          {subText && <p className="text-gray-400 text-[10px] mb-2">{subText}</p>}
          <div className={`text-2xl font-bold ${colorClass} truncate`}>{value}</div>
        </div>
        {Icon && (
          <div className={`p-3 rounded-full bg-opacity-10 ${getBgClass(colorClass)}`}>
              <Icon className={colorClass} size={24} />
          </div>
        )}
      </div>
    );
  };

  const KindStatDetails = ({ label, data, icon: Icon, color }: { label: string, data: KindStatData, icon: LucideIcon, color: string }) => {
    const getBgClass = (textClass: string) => textClass.replace('text-', 'bg-').replace('600', '50');
    
    // Safety check in case data is missing
    if (!data) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1 min-w-[200px]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">{label}</h3>
                    <div className={`text-4xl font-extrabold mt-1 ${color}`}>{data.total}</div>
                </div>
                <div className={`p-2 rounded-lg ${getBgClass(color)} ${color}`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[10px] border-t border-gray-100 pt-3">
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{data.taxable}</span>
                    <span className="text-gray-400">Taxable</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{data.exempt}</span>
                    <span className="text-gray-400">Exempt</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{data.cancelled}</span>
                    <span className="text-gray-400">Cancel</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{data.others}</span>
                    <span className="text-gray-400">Others</span>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <span className="text-sm text-gray-500">Real-time assessment metrics</span>
      </div>

      {/* Record Volume & Breakdown */}
      <div className="flex flex-col lg:flex-row gap-6">
         <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 flex flex-col justify-between text-white lg:w-1/4">
            <div>
                <h2 className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-2">Total Assessments</h2>
                <div className="text-6xl font-extrabold">{stats.total.toLocaleString()}</div>
                <p className="text-emerald-100 text-sm mt-2 opacity-80">Records in Database</p>
            </div>
            <div className="mt-8 pt-4 border-t border-emerald-500/30 flex items-center text-sm font-medium">
                <FileText className="mr-2" size={18} />
                <span>View Tax Roll</span>
            </div>
         </div>

         <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
             <KindStatDetails label="Land" data={stats.kindStats.Land} icon={MapIcon} color="text-emerald-600" />
             <KindStatDetails label="Building" data={stats.kindStats.Building} icon={Building2} color="text-blue-600" />
             <KindStatDetails label="Machinery" data={stats.kindStats.Machinery} icon={Tractor} color="text-orange-600" />
         </div>
      </div>

      {/* Financial Overview */}
      <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Annual Tax Due" 
              subText={`As of ${currentDate}`}
              value={formatCurrency(stats.sumTaxDue)} 
              colorClass="text-blue-600"
              icon={Calculator}
            />
            <StatCard title="Taxable Assessed Value" value={formatCurrency(stats.sumTaxable)} colorClass="text-emerald-600" icon={Landmark} />
            <StatCard title="Exempt Assessed Value" value={formatCurrency(stats.sumExempt)} colorClass="text-yellow-600" />
            <StatCard title="Other/Cancelled Value" value={formatCurrency(stats.sumOthers)} colorClass="text-red-600" />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Assessments by Barangay</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byBarangay} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {stats.byBarangay.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
             <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">By Status</h3>
             <div className="flex-grow min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                       {stats.byStatus.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} />
                       ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '11px'}} />
                  </PieChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;