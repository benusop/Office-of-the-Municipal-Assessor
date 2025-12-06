
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Assessment, User } from '../types';
import { BARANGAYS, KINDS, CLASSES, STATUSES, CERTIFYING_OFFICERS } from '../constants';
import { Search as SearchIcon, X, ChevronDown, Check, ArrowUpDown, LayoutGrid, List as ListIcon, Download, Printer, PenLine, Save, AlertCircle } from 'lucide-react';
import { updateAssessment } from '../services/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TaxRollProps {
  assessments: Assessment[];
  user: User | null;
  onDataChange: () => void;
}

interface AssessmentCardProps {
  assessment: Assessment;
  onClick: (assessment: Assessment) => void;
}

type SortOption = 'default' | 'owner' | 'td_number';
type ViewMode = 'grid' | 'list';

// --- Formatters ---
const formatMoney = (val: number | undefined | null) => {
  const num = val || 0;
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// PDF Safe Money Formatter (Standard fonts don't support Peso sign)
const formatMoneyPdf = (val: number | undefined | null) => {
  const num = val || 0;
  return `P ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatArea = (val: number | undefined | null) => {
  const num = val || 0;
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} Ha`;
};

const cleanString = (str: string | undefined | null) => String(str || '').trim().toLowerCase();

const getStatusStyles = (status: string) => {
  const s = cleanString(status);
  
  if (s === 'taxable') return 'bg-emerald-600 text-white';
  if (s === 'exempt' || s === 'exempted') return 'bg-yellow-400 text-yellow-900';
  if (s === 'cancelled') return 'bg-red-600 text-white';
  if (s === 'duplicate') return 'bg-orange-500 text-white';
  if (s === 'no data') return 'bg-gray-500 text-white';
  
  return 'bg-red-700 text-white';
};

const FilterDropdown = ({ 
    label, 
    options, 
    selected, 
    onChange 
  }: { 
    label: string, 
    options: string[], 
    selected: string[], 
    onChange: (selected: string[]) => void 
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    const toggleOption = (option: string) => {
      if (selected.includes(option)) {
        onChange(selected.filter(s => s !== option));
      } else {
        onChange([...selected, option]);
      }
    };
  
    return (
      <div className="relative" ref={dropdownRef}>
          <button 
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors ${selected.length > 0 ? 'border-emerald-500 ring-1 ring-emerald-500 text-emerald-700 font-medium' : 'border-gray-300 text-gray-600'}`}
          >
              <span className="truncate block mr-2 text-gray-700">
                  {selected.length === 0 ? label : `${label} (${selected.length})`}
              </span>
              <ChevronDown size={16} className={selected.length > 0 ? 'text-emerald-600' : 'text-gray-400'} />
          </button>
  
          {isOpen && (
              <div className="absolute z-20 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {options.map(opt => (
                      <div 
                          key={opt} 
                          className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                          onClick={() => toggleOption(opt)}
                      >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${selected.includes(opt) ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'}`}>
                              {selected.includes(opt) && <Check size={12} className="text-white" />}
                          </div>
                          <span className={`text-sm ${selected.includes(opt) ? 'text-emerald-900 font-medium' : 'text-gray-700'}`}>{opt}</span>
                      </div>
                  ))}
              </div>
          )}
      </div>
    )
  };

const AssessmentCard: React.FC<AssessmentCardProps> = ({ assessment, onClick }) => {
  const statusStyles = getStatusStyles(assessment.td_Status);

  return (
    <div 
      onClick={() => onClick(assessment)}
      className={`${statusStyles} rounded-xl shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col h-full`}
    >
      <div className="p-4 flex-grow">
          <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono opacity-80 truncate">{assessment.td_Number}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black bg-opacity-20 whitespace-nowrap">
                  {assessment.td_Status || 'No Data'}
              </span>
          </div>
          <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2">{assessment.owner_name}</h3>
          <div className="text-sm opacity-90 space-y-1">
              <p>Kind: {assessment.td_Kind}</p>
              <p>Class: {assessment.td_Class}</p>
          </div>
      </div>
      <div className="bg-black bg-opacity-10 p-3 flex justify-between items-center">
          <span className="text-xs font-medium uppercase tracking-wider opacity-75">Assessed Value</span>
          <span className="font-bold font-mono">{formatMoney(assessment.assessed_Value)}</span>
      </div>
    </div>
  );
};

const TaxRoll: React.FC<TaxRollProps> = ({ assessments, user, onDataChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>([]);
  const [selectedKinds, setSelectedKinds] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  // Default Sort set to 'td_number'
  const [sortBy, setSortBy] = useState<SortOption>('td_number');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Assessment>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Export State
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [certifyingOfficer, setCertifyingOfficer] = useState(CERTIFYING_OFFICERS[0]);
  const [exporting, setExporting] = useState(false);
  
  // PDF Export reference
  const printRef = useRef<HTMLDivElement>(null);

  const canEdit = user && ['OPERATOR', 'MODERATOR', 'DEVELOPER'].includes(user.role);

  const filteredSortedData = useMemo(() => {
    let data = [...assessments];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(a => 
        (a.td_Number && String(a.td_Number).toLowerCase().includes(lower)) ||
        (a.owner_name && String(a.owner_name).toLowerCase().includes(lower)) ||
        (a.lot_No && String(a.lot_No).toLowerCase().includes(lower)) ||
        (a.title_No && String(a.title_No).toLowerCase().includes(lower))
      );
    }

    // Robust Filtering
    if (selectedBarangays.length > 0) {
      data = data.filter(a => selectedBarangays.some(f => cleanString(f) === cleanString(a.td_barangay)));
    }
    if (selectedKinds.length > 0) {
      data = data.filter(a => selectedKinds.some(f => cleanString(f) === cleanString(a.td_Kind)));
    }
    if (selectedClasses.length > 0) {
      data = data.filter(a => selectedClasses.some(f => cleanString(f) === cleanString(a.td_Class)));
    }
    if (selectedStatuses.length > 0) {
        data = data.filter(a => {
            const s = cleanString(a.td_Status);
            if (selectedStatuses.includes('Taxable') && s === 'taxable') return true;
            if (selectedStatuses.includes('Exempt') && (s === 'exempt' || s === 'exempted') ) return true;
            if (selectedStatuses.includes('Cancelled') && s === 'cancelled') return true;
            if (selectedStatuses.includes('Others')) {
                if (s !== 'taxable' && s !== 'exempt' && s !== 'exempted' && s !== 'cancelled') return true;
            }
            return false;
        });
    }

    if (sortBy === 'owner') {
        data.sort((a, b) => (a.owner_name || '').localeCompare(b.owner_name || ''));
    } else if (sortBy === 'td_number') {
        data.sort((a, b) => {
            const aNum = a.td_Number || '';
            const bNum = b.td_Number || '';
            return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    return data;
  }, [assessments, searchTerm, selectedBarangays, selectedKinds, selectedClasses, selectedStatuses, sortBy]);

  const handleExportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSESSMENT TAX ROLL', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const barangayText = selectedBarangays.length > 0 
        ? `Barangay: ${selectedBarangays.join(', ')}` 
        : 'All Barangays';
      doc.text(barangayText, 105, 28, { align: 'center' });
      
      doc.text('Municipality of Pagalungan', 105, 34, { align: 'center' });
      doc.text('Maguindanao del Sur', 105, 40, { align: 'center' });

      // Table
      const tableColumn = ["TD Number", "Barangay", "Land Owner", "Kind", "Class", "Area (Ha)", "Assessed Value"];
      const tableRows = filteredSortedData.map(a => [
        a.td_Number,
        a.td_barangay,
        a.owner_name,
        a.td_Kind,
        a.td_Class,
        formatArea(a.land_Area),
        formatMoneyPdf(a.assessed_Value)
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }, // Emerald color
        styles: { fontSize: 8 },
        margin: { top: 50 },
      });

      // Nothing Follows
      const finalY = (doc as any).lastAutoTable?.finalY || 60;
      doc.text('(Nothing follows)', 105, finalY + 10, { align: 'center' });

      doc.save('Tax_Roll_Report.pdf');
    } catch (e) {
      console.error("PDF Export failed", e);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPNG = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2 });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `TaxDec_${selectedAssessment?.td_Number || 'Record'}.png`;
      link.click();
      setShowExportDialog(false);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setExporting(false);
    }
  };

  // Edit Handlers
  const handleEditClick = () => {
    if (selectedAssessment) {
      setEditForm({ ...selectedAssessment });
      setIsEditing(true);
      setShowExportDialog(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      setEditForm(prev => ({
          ...prev,
          [name]: type === 'number' ? parseFloat(value) : value
      }));
  };

  const handleSaveEdit = async () => {
      if (!selectedAssessment || !editForm) return;
      setIsSaving(true);
      try {
          // Optimistic update for UI, but rely on API
          await updateAssessment(selectedAssessment.id, editForm);
          await onDataChange(); // Refresh list
          
          // Update local selected view
          setSelectedAssessment({ ...selectedAssessment, ...editForm } as Assessment);
          setIsEditing(false);
          alert('Record updated successfully!');
      } catch (e) {
          console.error(e);
          alert('Failed to update record in the database.');
      } finally {
          setIsSaving(false);
      }
  };

  const EditInput = ({ label, name, type = "text", step }: { label: string, name: keyof Assessment, type?: string, step?: string }) => (
      <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
          {name === 'td_barangay' ? (
              <select name={name} value={String(editForm[name] || '')} onChange={handleEditChange} className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900">
                  {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
          ) : name === 'td_Kind' ? (
              <select name={name} value={String(editForm[name] || '')} onChange={handleEditChange} className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900">
                  {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
          ) : name === 'td_Class' ? (
              <select name={name} value={String(editForm[name] || '')} onChange={handleEditChange} className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900">
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          ) : name === 'td_Status' ? (
              <select name={name} value={String(editForm[name] || '')} onChange={handleEditChange} className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
          ) : (
              <input 
                  type={type} 
                  name={name} 
                  value={type === 'number' ? (editForm[name] as number) : (editForm[name] as string) || ''}
                  onChange={handleEditChange}
                  step={step}
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900"
              />
          )}
      </div>
  );

  return (
    <div className="space-y-6">
      
      {/* Controls Header */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row justify-between items-start md:items-center">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Tax Roll</h1>
           <p className="text-sm text-gray-500">Manage and view assessment records.</p>
        </div>
        
        <div className="flex space-x-2">
           <div className="flex bg-gray-200 p-1 rounded-lg">
               <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 <LayoutGrid size={20} />
               </button>
               <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 <ListIcon size={20} />
               </button>
           </div>
           
           {viewMode === 'list' && (
             <button 
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm"
             >
                <Download size={18} className="mr-2" />
                {exporting ? 'Generating...' : 'Export PDF'}
             </button>
           )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-4">
        <div className="relative">
            <SearchIcon className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Search by TD Number, Owner, Lot No. or Title No."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <FilterDropdown 
                label="Barangay" 
                options={BARANGAYS} 
                selected={selectedBarangays} 
                onChange={setSelectedBarangays} 
            />
            <FilterDropdown 
                label="Kind" 
                options={KINDS} 
                selected={selectedKinds} 
                onChange={setSelectedKinds} 
            />
            <FilterDropdown 
                label="Class" 
                options={CLASSES} 
                selected={selectedClasses} 
                onChange={setSelectedClasses} 
            />
            <FilterDropdown 
                label="Status" 
                options={['Taxable', 'Exempt', 'Cancelled', 'Others']} 
                selected={selectedStatuses} 
                onChange={setSelectedStatuses} 
            />
            
            <div className="relative">
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500 appearance-none text-gray-700"
                >
                    <option value="td_number">Sort by TD No.</option>
                    <option value="owner">Sort by Owner</option>
                    <option value="default">Default Sort</option>
                </select>
                <ArrowUpDown size={16} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
        </div>
      </div>
      
      {/* Results Info */}
      <div className="flex justify-between items-center text-sm text-gray-500 px-1">
        <span>Showing <strong>{filteredSortedData.length}</strong> records</span>
      </div>

      {/* CONTENT: Grid or List */}
      {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {filteredSortedData.map(assessment => (
              <AssessmentCard 
                key={assessment.id} 
                assessment={assessment} 
                onClick={(a) => { setSelectedAssessment(a); setIsEditing(false); }}
              />
            ))}
            {filteredSortedData.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">
                    <p>No records found matching your filters.</p>
                </div>
            )}
          </div>
      ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden pb-20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TD Number</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Land Owner</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kind</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Area (Ha)</th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Assessed Value</th>
                   </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                   {filteredSortedData.map((assessment) => {
                      // Row Styling based on Status
                      const status = cleanString(assessment.td_Status);
                      let rowClass = "hover:bg-gray-50 cursor-pointer transition-colors";
                      let textClass = "text-gray-900";
                      
                      // Using subtle background tints for rows
                      if (status === 'taxable') rowClass += " bg-emerald-50/30 hover:bg-emerald-50";
                      else if (status === 'exempt' || status === 'exempted') rowClass += " bg-yellow-50/30 hover:bg-yellow-50";
                      else if (status === 'cancelled') {
                          rowClass += " bg-red-50/30 hover:bg-red-50";
                          textClass = "text-red-900";
                      }
                      else rowClass += " bg-gray-50/30 hover:bg-gray-100";

                      return (
                        <tr key={assessment.id} className={rowClass} onClick={() => { setSelectedAssessment(assessment); setIsEditing(false); }}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${textClass}`}>{assessment.td_Number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.td_barangay}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>{assessment.owner_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.td_Kind}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.td_Class}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatArea(assessment.land_Area)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono text-right ${textClass}`}>{formatMoney(assessment.assessed_Value)}</td>
                        </tr>
                      );
                   })}
                </tbody>
              </table>
              {filteredSortedData.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <p>No records found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
      )}

      {/* DETAIL MODAL - Updated to z-[100] to cover sticky header */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden my-8 relative">
            
            <button 
              onClick={() => setSelectedAssessment(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition"
            >
              <X size={20} />
            </button>

            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
              
              {!isEditing ? (
                  // --- VIEW MODE ---
                  <div ref={printRef} id="tax-declaration-preview" className="p-8 bg-white text-gray-900 relative min-h-[800px]">
                    
                    {/* Watermark Background */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                        <img 
                            src="https://lh3.googleusercontent.com/d/1S7VKW-nIhOwDLDZOXDXgX9w6gCw2OR09" 
                            alt="Watermark" 
                            className="w-3/5 opacity-20 object-contain"
                            referrerPolicy="no-referrer"
                        />
                    </div>

                    {/* Content Wrapper to sit above watermark */}
                    <div className="relative z-10">
                        {/* Header */}
                        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                        <h1 className="text-2xl font-bold uppercase tracking-widest text-gray-900">Tax Declaration of Real Properties</h1>
                        <p className="text-sm font-serif mt-2">Republic of the Philippines</p>
                        <p className="text-sm font-serif">Province of Maguindanao del Sur</p>
                        <p className="text-sm font-serif font-bold">Municipality of Pagalungan</p>
                        </div>

                        {/* Main Grid Info */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8 text-sm">
                        
                        <div className="space-y-4">
                            <div className="border-b border-gray-300 pb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase block">TD Number</span>
                            <span className="font-mono text-lg font-bold">{selectedAssessment.td_Number}</span>
                            </div>
                            <div className="border-b border-gray-300 pb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase block">Owner</span>
                            <span className="text-lg font-bold">{selectedAssessment.owner_name}</span>
                            </div>
                            <div className="border-b border-gray-300 pb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase block">Address / Location</span>
                            <span className="text-base">{selectedAssessment.td_barangay}, Pagalungan</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="border-b border-gray-300 pb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase block">Property Kind</span>
                            <span className="text-lg font-bold">{selectedAssessment.td_Kind}</span>
                            </div>
                            <div className="border-b border-gray-300 pb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase block">Classification</span>
                            <span className="text-lg font-bold">{selectedAssessment.td_Class}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                            <div className="border-b border-gray-300 pb-1">
                                <span className="text-xs font-bold text-gray-500 uppercase block">Lot No.</span>
                                <span className="font-mono">{selectedAssessment.lot_No || 'N/A'}</span>
                            </div>
                            <div className="border-b border-gray-300 pb-1">
                                <span className="text-xs font-bold text-gray-500 uppercase block">Title No.</span>
                                <span className="font-mono">{selectedAssessment.title_No || 'N/A'}</span>
                            </div>
                            </div>
                        </div>

                        </div>

                        {/* Valuation Table */}
                        <div className="mb-8 border border-gray-800">
                        <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-800 text-center py-2 font-bold text-xs uppercase tracking-wider">
                            <div className="border-r border-gray-800">Area (Ha)</div>
                            <div className="border-r border-gray-800">Market Value</div>
                            <div className="border-r border-gray-800">Assessed Value</div>
                            <div>Tax Due</div>
                        </div>
                        <div className="grid grid-cols-4 text-center py-4 text-sm font-mono">
                            <div className="border-r border-gray-200 flex items-center justify-center">{formatArea(selectedAssessment.land_Area)}</div>
                            <div className="border-r border-gray-200 flex items-center justify-center">{formatMoney(selectedAssessment.market_Value)}</div>
                            <div className="border-r border-gray-200 flex items-center justify-center font-bold">{formatMoney(selectedAssessment.assessed_Value)}</div>
                            <div className="flex items-center justify-center font-bold">{formatMoney(selectedAssessment.tax_Due)}</div>
                        </div>
                        </div>

                        {/* Status & Effectivity */}
                        <div className="flex justify-between items-center mb-10 p-4 bg-gray-50 border border-gray-200 rounded">
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
                                <div className="font-bold text-lg">{selectedAssessment.td_Status}</div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-500 uppercase">Effectivity Year</span>
                                <div className="font-bold text-lg">{selectedAssessment.td_Effectivity}</div>
                            </div>
                            {selectedAssessment.td_Cancelled && (
                            <div>
                                <span className="text-xs font-bold text-red-500 uppercase">Cancelled By</span>
                                <div className="font-bold text-red-700">{selectedAssessment.td_Cancelled}</div>
                            </div>
                            )}
                        </div>

                        {/* Legal Text */}
                        <div className="text-justify text-[10px] leading-relaxed text-gray-600 mb-12 italic border-t pt-4">
                        <p className="mb-2">
                            "This declaration shall serve as notice to the abovementioned declarant in pursuance of Section 223 of R.A. 7160, otherwise known as the Local Government Code of 1991, for which the due process provision on real property tax assessment under Section 226 of the said Code may be availed."
                        </p>
                        <p>
                            "This declaration is also for real property taxation purposes only and the valuation indicated herein are based on the schedule of unit market values prepared for the purpose and duly enacted an Ordinance by the Sangguniang Panlungsod under Ordinance No. 335 Series 2012. It does not and cannot by itself alone confer any ownership or legal title to the property."
                        </p>
                        </div>

                        {/* Signatories */}
                        <div className="grid grid-cols-2 gap-12 mt-12 pt-8">
                        <div className="text-center">
                            <div className="mb-8">
                                <div className="font-bold text-sm uppercase mb-6">SGD</div>
                                <div className="font-bold text-base uppercase">ESTRELLA C. SERNA, MPS</div>
                                <div className="h-px bg-gray-900 w-3/4 mx-auto mt-1 mb-2"></div>
                                <div className="font-bold text-xs uppercase">Municipal Assessor</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="mb-8">
                                <div className="font-bold text-sm uppercase mb-6">SGD</div>
                                <div className="font-bold text-base uppercase">SADRUDDIN A. MASUKAT, REA</div>
                                <div className="h-px bg-gray-900 w-3/4 mx-auto mt-1 mb-2"></div>
                                <div className="font-bold text-xs uppercase">Provincial Assessor</div>
                            </div>
                        </div>
                        </div>

                        {/* Certified True Copy Stamp (Conditional Render for Print) */}
                        {showExportDialog && (
                            <div className="mt-12 pt-4 border-t-2 border-gray-900 border-dashed">
                                <div className="flex justify-center mb-8">
                                    <div className="text-center font-bold uppercase text-sm border-2 border-gray-900 px-4 py-1 rounded">
                                        Certified True Copy
                                    </div>
                                </div>
                                <div className="flex flex-col items-center mt-4">
                                    <div className="text-center">
                                        <p className="font-bold uppercase text-sm">{certifyingOfficer.name}</p>
                                        <div className="h-px bg-gray-900 w-full my-1"></div>
                                        <p className="text-[10px] uppercase font-bold">{certifyingOfficer.position}</p>
                                        <p className="text-[10px] mt-1">Date: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                  </div>
              ) : (
                  // --- EDIT MODE ---
                  <div className="p-8 bg-white">
                      <div className="flex items-center space-x-3 mb-6 border-b pb-4">
                          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                              <PenLine size={24} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-gray-900">Modify Assessment Record</h2>
                              <p className="text-sm text-gray-500">Updating record for {selectedAssessment.td_Number}</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                          <div className="md:col-span-2">
                              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide border-b border-gray-100 pb-2 mb-4">Identification</h3>
                          </div>
                          <EditInput label="Owner Name" name="owner_name" />
                          <EditInput label="TD Number" name="td_Number" />
                          <EditInput label="Barangay" name="td_barangay" />
                          <EditInput label="Lot Number" name="lot_No" />
                          <EditInput label="Title Number" name="title_No" />

                          <div className="md:col-span-2 mt-4">
                              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide border-b border-gray-100 pb-2 mb-4">Classification & Valuation</h3>
                          </div>
                          <EditInput label="Property Kind" name="td_Kind" />
                          <EditInput label="Classification" name="td_Class" />
                          <EditInput label="Area (Hectares)" name="land_Area" type="number" step="0.0001" />
                          <EditInput label="Market Value" name="market_Value" type="number" />
                          <EditInput label="Assessed Value" name="assessed_Value" type="number" />
                          <EditInput label="Tax Due" name="tax_Due" type="number" />

                          <div className="md:col-span-2 mt-4">
                              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide border-b border-gray-100 pb-2 mb-4">Status & Meta</h3>
                          </div>
                          <EditInput label="Status" name="td_Status" />
                          <EditInput label="Effectivity Year" name="td_Effectivity" type="number" />
                          <EditInput label="Cancelled By" name="td_Cancelled" />
                          <EditInput label="Previous TD" name="td_Previous" />
                      </div>
                      
                      <div className="mt-8 bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-sm text-blue-800">
                          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                          <p>
                              Updates made here will be reflected directly in the database (Google Sheet). Please ensure all monetary values and names are correct before saving.
                          </p>
                      </div>
                  </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
               <div className="text-xs text-gray-400">
                  Record ID: {selectedAssessment.id}
               </div>
               
               <div className="flex space-x-3">
                 {isEditing ? (
                    // Edit Mode Actions
                    <>
                       <button 
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded hover:bg-gray-300 transition"
                          disabled={isSaving}
                       >
                          Cancel
                       </button>
                       <button 
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded hover:bg-emerald-700 transition flex items-center shadow-sm"
                       >
                          {isSaving ? <span className="animate-pulse">Saving...</span> : (
                             <>
                                <Save size={16} className="mr-2" />
                                Save Changes
                             </>
                          )}
                       </button>
                    </>
                 ) : (
                    // View Mode Actions
                    <>
                      {/* Edit Button (Only for Auth Users) */}
                      {canEdit && !showExportDialog && (
                         <button 
                            onClick={handleEditClick}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded hover:bg-gray-50 transition flex items-center"
                         >
                            <PenLine size={16} className="mr-2" />
                            Modify Record
                         </button>
                      )}

                      {!showExportDialog ? (
                        <button 
                            onClick={() => setShowExportDialog(true)}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded hover:bg-emerald-700 transition flex items-center"
                        >
                            <Printer size={16} className="mr-2" />
                            Export Certified Copy
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2 animate-fadeIn">
                            <select 
                                className="text-sm border-gray-300 rounded p-2 border bg-white text-gray-900"
                                value={certifyingOfficer.name}
                                onChange={(e) => {
                                    const officer = CERTIFYING_OFFICERS.find(o => o.name === e.target.value);
                                    if (officer) setCertifyingOfficer(officer);
                                }}
                            >
                                {CERTIFYING_OFFICERS.map(o => (
                                    <option key={o.name} value={o.name}>{o.name} - {o.position}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleExportPNG}
                                disabled={exporting}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition"
                            >
                                {exporting ? 'Saving...' : 'Download PNG'}
                            </button>
                            <button 
                                onClick={() => setShowExportDialog(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-bold rounded hover:bg-gray-400 transition"
                            >
                                Cancel
                            </button>
                        </div>
                      )}
                    </>
                 )}
               </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TaxRoll;
