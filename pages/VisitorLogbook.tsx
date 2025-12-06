
import React, { useState, useEffect, useRef } from 'react';
import { User, VisitorRecord } from '../types';
import { 
  Users, Clock, Plus, X, UserCheck, LogOut, Printer, Loader2, Search, History, Save, Download, Trash2, Calendar
} from 'lucide-react';
import { VALID_IDS, ASSESSOR_TRANSACTIONS } from '../constants';
import { getVisitorLogs, addVisitorLog, updateVisitorLog, deleteVisitorLog } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface VisitorLogbookProps {
  user: User;
}

const VisitorLogbook: React.FC<VisitorLogbookProps> = ({ user }) => {
  // --- STATE ---
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'LOGBOOK'>('CURRENT');
  const isDeveloper = user.role === 'DEVELOPER';
  
  // Actions
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [manualTimeOuts, setManualTimeOuts] = useState<Record<string, string>>({});

  // Past/Historical Entry Mode
  const [isPastEntry, setIsPastEntry] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Autocomplete
  const [suggestions, setSuggestions] = useState<VisitorRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Form
  const initialForm = {
    lastName: '', firstName: '', middleInitial: '',
    affiliation: '', contactNum: '', email: '',
    idPresented: '', idOther: '', idNumber: '',
    purpose: '', purposeOther: '',
    // Past Entry Fields
    pastDate: new Date().toLocaleDateString('en-CA'),
    pastTimeIn: '08:00',
    pastTimeOut: '17:00'
  };
  const [formData, setFormData] = useState(initialForm);

  // --- LIFECYCLE ---
  useEffect(() => {
    fetchData();
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getVisitorLogs();
      // Filter out deleted items and sort
      const validData = data.filter(v => v.status !== 'DELETED');
      validData.sort((a, b) => (String(a.id) < String(b.id) ? 1 : -1));
      setVisitors(validData);
    } catch (e) {
      console.error("Fetch Error", e);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: FILTERING (THE TAB SYSTEM) ---
  const currentVisitors = visitors.filter(v => (!v.timeOut || v.timeOut.trim() === '') && v.status === 'ACTIVE');
  
  const logbookVisitors = visitors.filter(v => {
    // Must have a timeOut or be explicitly completed
    if (v.status === 'COMPLETED') return true;
    if (v.status === 'ACTIVE' && v.timeOut && v.timeOut.trim() !== '') return true;
    return false;
  });

  // Apply Date Filter only to Logbook View
  const filteredLogbook = logbookVisitors.filter(v => {
    const d = new Date(v.dateString);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  // Apply Search to whichever list is active
  const displayedVisitors = (activeTab === 'CURRENT' ? currentVisitors : filteredLogbook).filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.lastName.toLowerCase().includes(term) ||
      v.firstName.toLowerCase().includes(term) ||
      v.affiliation.toLowerCase().includes(term)
    );
  });

  // --- HELPERS ---
  const convertTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
  };

  // --- ACTIONS ---

  const handleTimeIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const now = new Date();
    // Generate ID
    const id = `V-${now.getTime()}`; 
    
    // Determine Date/Time based on mode
    let dateString, timeIn, timeOut, status;

    if (isPastEntry) {
      dateString = formData.pastDate;
      timeIn = convertTo12Hour(formData.pastTimeIn);
      timeOut = convertTo12Hour(formData.pastTimeOut);
      status = 'COMPLETED';
    } else {
      dateString = now.toLocaleDateString('en-CA');
      timeIn = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      timeOut = '';
      status = 'ACTIVE';
    }

    const finalPurpose = formData.purpose === 'Others' ? formData.purposeOther : formData.purpose;
    const finalID = formData.idPresented === 'Others' ? formData.idOther : formData.idPresented;

    const newRecord: VisitorRecord = {
      id,
      dateString,
      lastName: formData.lastName,
      firstName: formData.firstName,
      middleInitial: formData.middleInitial,
      affiliation: formData.affiliation,
      contactNum: formData.contactNum,
      email: formData.email,
      idPresented: finalID,
      idNumber: formData.idNumber,
      purpose: finalPurpose,
      timeIn,
      timeOut,
      status: status as any,
      recordedBy: user.name
    };

    try {
      setVisitors(prev => [newRecord, ...prev]); // Optimistic Add
      setShowModal(false);
      setFormData(initialForm);
      setIsPastEntry(false);
      
      // If adding a past record, switch to logbook tab to see it
      if (isPastEntry) setActiveTab('LOGBOOK');
      else setActiveTab('CURRENT'); 
      
      await addVisitorLog(newRecord);
    } catch (error) {
      alert("Failed to save. Check connection.");
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeOut = async (id: string) => {
    const rawTime = manualTimeOuts[id];
    if (!rawTime) {
      alert("Please enter a Time Out value.");
      return;
    }

    const formattedTime = convertTo12Hour(rawTime);

    if (!confirm(`Confirm Time Out at ${formattedTime}? This will move the visitor to the Logbook.`)) return;

    setProcessingIds(prev => new Set(prev).add(id));

    // OPTIMISTIC UPDATE:
    setVisitors(prev => prev.map(v => 
      String(v.id) === String(id) ? { ...v, timeOut: formattedTime, status: 'COMPLETED' } : v
    ));

    try {
      await updateVisitorLog(id, { timeOut: formattedTime, status: 'COMPLETED' });
      // Clear manual input state for this ID
      setManualTimeOuts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      console.error(error);
      alert("Failed to update. Reverting...");
      fetchData();
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
    
    setProcessingIds(prev => new Set(prev).add(id));
    
    // Optimistic Remove
    setVisitors(prev => prev.filter(v => v.id !== id));

    try {
      await deleteVisitorLog(id);
    } catch (error) {
      alert("Failed to delete record.");
      fetchData();
    } finally {
       setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const monthStr = new Date(filterYear, filterMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

    doc.setFontSize(18);
    doc.text("Visitor Logbook Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${monthStr}`, 14, 26);
    doc.text(`Generated by: ${user.name}`, 14, 30);

    const rows = filteredLogbook.map(v => [
      v.dateString, v.timeIn, `${v.lastName}, ${v.firstName}`, v.affiliation, v.purpose, v.timeOut, v.recordedBy
    ]);

    autoTable(doc, {
      head: [['Date', 'Time In', 'Name', 'Affiliation', 'Purpose', 'Time Out', 'Staff']],
      body: rows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }
    });

    doc.save(`VisitorLog_${monthStr}.pdf`);
  };

  const handleExportCSV = () => {
    const dataToExport = (activeTab === 'CURRENT' ? currentVisitors : filteredLogbook).map(v => ({
        Date: v.dateString,
        Name: `${v.lastName}, ${v.firstName} ${v.middleInitial}`,
        Affiliation: v.affiliation,
        Purpose: v.purpose,
        'ID Presented': v.idPresented,
        'ID Number': v.idNumber,
        'Contact Number': v.contactNum,
        'Time In': v.timeIn,
        'Time Out': v.timeOut || 'N/A',
        'Recorded By': v.recordedBy,
    }));

    if (dataToExport.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(dataToExport[0]);
    const csvRows = [
        headers.join(','), // Header
        ...dataToExport.map(row => headers.map(fieldName => {
            const val = (row as any)[fieldName] || '';
            // Escape quotes and wrap in quotes to handle commas
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VisitorLog_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- AUTOCOMPLETE ---
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, lastName: val }));
    
    if (val.length > 1) {
      const matches = visitors.filter(v => v.lastName.toLowerCase().includes(val.toLowerCase()));
      const unique = matches.filter((v, i, self) => 
        i === self.findIndex(t => t.lastName === v.lastName && t.firstName === v.firstName)
      );
      setSuggestions(unique.slice(0, 5));
      setShowSuggestions(unique.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (v: VisitorRecord) => {
    setFormData(prev => ({
      ...prev,
      lastName: v.lastName,
      firstName: v.firstName,
      middleInitial: v.middleInitial,
      affiliation: v.affiliation,
      contactNum: v.contactNum,
      email: v.email || '',
      idPresented: v.idPresented,
      idNumber: v.idNumber || '',
    }));
    setShowSuggestions(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-emerald-600" size={28} /> 
            Visitor Logbook
          </h1>
          <p className="text-sm text-gray-500">Manage daily visitors and view history</p>
        </div>
        
        {/* TAB SWITCHER */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('CURRENT')}
                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'CURRENT' 
                    ? 'bg-white shadow-md text-emerald-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Clock size={18} className="mr-2"/> Current Visitors
                <span className="ml-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">
                    {currentVisitors.length}
                </span>
            </button>
            <button 
                onClick={() => setActiveTab('LOGBOOK')}
                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'LOGBOOK' 
                    ? 'bg-white shadow-md text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <History size={18} className="mr-2"/> Visitor Logbook
            </button>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
             
             {activeTab === 'CURRENT' && (
                 <button 
                    onClick={() => { setShowModal(true); setIsPastEntry(false); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition"
                 >
                    <Plus size={20} /> New Entry
                 </button>
             )}
             
             {/* Shared Search */}
             <div className="relative flex-grow md:flex-grow-0">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400"/>
                <input 
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search name..."
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500 w-full md:w-64 bg-white text-gray-900"
                />
             </div>
             
             {activeTab === 'LOGBOOK' && (
                 <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <span className="text-xs font-bold text-gray-500 uppercase">Archive Period:</span>
                    <select 
                      value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                      className="py-2 px-3 border border-gray-300 rounded-lg text-sm outline-none cursor-pointer hover:bg-gray-50 bg-white text-gray-900"
                    >
                      {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{new Date(0,i).toLocaleString('default',{month:'long'})}</option>)}
                    </select>
                    <select 
                      value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                      className="py-2 px-3 border border-gray-300 rounded-lg text-sm outline-none cursor-pointer hover:bg-gray-50 bg-white text-gray-900"
                    >
                      <option value={2024}>2024</option><option value={2025}>2025</option>
                    </select>
                    <div className="flex gap-2">
                        <button 
                          onClick={handleExportCSV} 
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-bold inline-flex items-center gap-2 shadow-sm"
                        >
                          <Download size={16}/> CSV
                        </button>
                        <button 
                          onClick={handleExportPDF} 
                          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-bold inline-flex items-center gap-2 shadow-sm"
                        >
                          <Printer size={16}/> Print Report
                        </button>
                        {/* Only allow adding past records in Logbook view or allow universally? Usually just 'New Entry' button exists */}
                        <button 
                             onClick={() => { setShowModal(true); setIsPastEntry(true); }}
                             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold inline-flex items-center gap-2 shadow-sm"
                        >
                           <Plus size={16} /> Past Entry
                        </button>
                    </div>
                 </div>
             )}
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
               <tr>
                 <th className="p-4 border-b">Date</th>
                 <th className="p-4 border-b">Visitor Name</th>
                 <th className="p-4 border-b">Purpose</th>
                 <th className="p-4 border-b">Time In</th>
                 <th className="p-4 border-b">Time Out</th>
                 <th className="p-4 border-b text-right">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 text-sm">
               {loading ? (
                 <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500"/></td></tr>
               ) : displayedVisitors.length === 0 ? (
                 <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">No {activeTab === 'CURRENT' ? 'current visitors' : 'records'} found.</td></tr>
               ) : (
                 displayedVisitors.map(v => (
                     <tr key={v.id} className="hover:bg-gray-50 group transition-colors">
                        <td className="p-4 align-top whitespace-nowrap text-gray-500">
                            {v.dateString}
                        </td>
                        <td className="p-4 align-top">
                           <div className="font-bold text-gray-800">{v.lastName}, {v.firstName} {v.middleInitial}</div>
                           <div className="text-xs text-gray-500">{v.affiliation}</div>
                           <div className="text-[10px] text-gray-400 mt-1">{v.contactNum}</div>
                        </td>
                        <td className="p-4 align-top">
                           <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                             {v.purpose}
                           </span>
                        </td>
                        <td className="p-4 align-top">
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                {v.timeIn}
                            </span>
                        </td>
                        <td className="p-4 align-top">
                            {activeTab === 'CURRENT' ? (
                                <input 
                                    type="time"
                                    className="border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-gray-900"
                                    value={manualTimeOuts[v.id] || ''}
                                    onChange={(e) => setManualTimeOuts(prev => ({ ...prev, [v.id]: e.target.value }))}
                                />
                            ) : (
                                <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-1 rounded">
                                    {v.timeOut}
                                </span>
                            )}
                        </td>
                        <td className="p-4 align-top text-right">
                           {activeTab === 'CURRENT' ? (
                             <button
                               onClick={() => handleTimeOut(v.id)}
                               disabled={processingIds.has(v.id)}
                               className={`ml-auto flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                                 processingIds.has(v.id) 
                                 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                 : 'bg-emerald-600 text-white hover:bg-emerald-700'
                               }`}
                               title="Save Time Out"
                             >
                                {processingIds.has(v.id) ? <Loader2 size={14} className="animate-spin"/> : <><Save size={14}/> Save</>}
                             </button>
                           ) : (
                             <div className="flex items-center justify-end gap-2">
                                <div className="text-xs text-gray-400 italic">Completed</div>
                                {isDeveloper && (
                                    <button 
                                        onClick={() => handleDelete(v.id)}
                                        disabled={processingIds.has(v.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                                        title="Delete Log (Developer Only)"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                             </div>
                           )}
                        </td>
                     </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* NEW ENTRY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-900">
                    {isPastEntry ? 'Log Historical / Past Entry' : 'New Visitor Entry'}
                 </h2>
                 <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X/></button>
              </div>

              <div className="px-6 pt-4">
                  {/* Mode Toggle */}
                  <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-200 hover:bg-gray-100">
                      <input 
                        type="checkbox" 
                        checked={isPastEntry} 
                        onChange={(e) => setIsPastEntry(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Log as a <strong>Past / Completed</strong> Entry</span>
                  </label>
              </div>

              <form onSubmit={handleTimeIn} className="p-6 space-y-5 pt-4">
                 
                 {/* PAST ENTRY DATE/TIME FIELDS */}
                 {isPastEntry && (
                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3 animate-fadeIn">
                        <h3 className="text-xs font-bold text-blue-700 uppercase flex items-center"><Calendar size={14} className="mr-1"/> Historical Data Details</h3>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Visit</label>
                            <input 
                                type="date"
                                required
                                className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900"
                                value={formData.pastDate}
                                onChange={e => setFormData({...formData, pastDate: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time In</label>
                                <input 
                                    type="time" required
                                    className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900"
                                    value={formData.pastTimeIn}
                                    onChange={e => setFormData({...formData, pastTimeIn: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Out</label>
                                <input 
                                    type="time" required
                                    className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900"
                                    value={formData.pastTimeOut}
                                    onChange={e => setFormData({...formData, pastTimeOut: e.target.value})}
                                />
                            </div>
                        </div>
                     </div>
                 )}

                 {/* Name */}
                 <div className="space-y-3">
                    <div className="relative" ref={suggestionRef}>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                       <input 
                         required 
                         className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                         value={formData.lastName} onChange={handleNameChange} autoComplete="off"
                       />
                       {showSuggestions && (
                         <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl rounded-md mt-1 z-20 max-h-40 overflow-y-auto">
                           {suggestions.map((s, i) => (
                             <div key={i} onClick={() => selectSuggestion(s)} className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0">
                               <div className="font-bold text-gray-800">{s.lastName}, {s.firstName}</div>
                               <div className="text-xs text-gray-500">{s.affiliation}</div>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       <div className="col-span-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                          <input 
                            required 
                            className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                            value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">M.I.</label>
                          <input 
                            className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                            maxLength={2}
                            value={formData.middleInitial} onChange={e => setFormData({...formData, middleInitial: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 {/* Contact */}
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Affiliation / Brgy</label>
                       <input 
                         required 
                         className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                         value={formData.affiliation} onChange={e => setFormData({...formData, affiliation: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact No.</label>
                       <input 
                         required 
                         className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                         value={formData.contactNum} onChange={e => setFormData({...formData, contactNum: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* ID */}
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Presented</label>
                       <select 
                          required 
                          className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                          value={formData.idPresented} onChange={e => setFormData({...formData, idPresented: e.target.value})}
                       >
                          <option value="">Select ID</option>
                          {VALID_IDS.map(id => <option key={id} value={id}>{id}</option>)}
                       </select>
                       {formData.idPresented === 'Others' && (
                          <input 
                            placeholder="Specify ID" 
                            className="mt-2 w-full border border-gray-300 rounded p-2 text-sm text-gray-900 bg-white"
                            value={formData.idOther} onChange={e => setFormData({...formData, idOther: e.target.value})}
                          />
                       )}
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Number</label>
                       <input 
                         required 
                         className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                         value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* Purpose */}
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purpose</label>
                    <select 
                       required 
                       className="w-full border border-gray-300 rounded p-2.5 text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                       value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})}
                    >
                       <option value="">Select Transaction</option>
                       {ASSESSOR_TRANSACTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {formData.purpose === 'Others' && (
                       <input 
                         placeholder="Specify Purpose" 
                         className="mt-2 w-full border border-gray-300 rounded p-2 text-sm text-gray-900 bg-white"
                         value={formData.purposeOther} onChange={e => setFormData({...formData, purposeOther: e.target.value})}
                       />
                    )}
                 </div>

                 <button 
                   type="submit" disabled={submitting}
                   className={`w-full mt-4 text-white font-bold py-3 rounded-lg shadow flex justify-center items-center gap-2 transition ${isPastEntry ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                 >
                    {submitting ? 'Processing...' : (
                        isPastEntry ? <><Save size={18}/> SAVE PAST ENTRY</> : <><Clock size={18}/> CONFIRM TIME IN</>
                    )}
                 </button>

              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default VisitorLogbook;
