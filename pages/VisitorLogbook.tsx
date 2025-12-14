
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, VisitorRecord } from '../types';
import { 
  Users, Clock, LogOut, Plus, Search, History, 
  MapPin, Phone, X, Loader2, Save, Trash2, RefreshCw
} from 'lucide-react';
import { getVisitorLogs, addVisitorLog, updateVisitorLog, deleteVisitorLog } from '../services/api';
import { VALID_IDS, ASSESSOR_TRANSACTIONS } from '../constants';

interface VisitorLogbookProps {
  user: User;
}

// --- HELPERS ---

const formatDateDisplay = (val: string) => {
  if (!val) return '';
  // Convert ISO string (2025-12-07T16:00:00.000Z) to readable Date
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return val;
};

const formatTimeDisplay = (val: string) => {
  if (!val) return '';
  
  const str = String(val).trim();

  // Handle Google Sheets "1899" Epoch or full ISO strings
  if (str.includes('T') || str.includes('1899-') || str.includes('202')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
  }
  
  // If it's already in 12h format "5:00 PM"
  if (str.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
      return str;
  }

  // If it's 24h format "17:00"
  if (str.match(/^\d{1,2}:\d{2}$/)) {
      const [h, m] = str.split(':');
      const d = new Date();
      d.setHours(parseInt(h), parseInt(m));
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  return val;
};

const VisitorLogbook: React.FC<VisitorLogbookProps> = ({ user }) => {
  // --- STATE ---
  const [records, setRecords] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [historyDate, setHistoryDate] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7)); // YYYY-MM

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const initialForm = {
    lastName: '', firstName: '', middleInitial: '',
    affiliation: '', contactNum: '', 
    idPresented: '', idNumber: '', 
    purpose: '', purposeOther: '',
    // Manual overrides
    manualDate: new Date().toLocaleDateString('en-CA'),
    manualTimeIn: '',
    manualTimeOut: ''
  };
  const [form, setForm] = useState(initialForm);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<VisitorRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getVisitorLogs();
      const sorted = (data || []).filter(d => d.status !== 'DELETED').sort((a, b) => (a.id < b.id ? 1 : -1));
      setRecords(sorted);
    } catch (e) {
      console.error("Failed to load logs", e);
      setError('Unable to connect to the database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchData]);

  // --- DERIVED STATE ---
  
  const activeVisitors = useMemo(() => {
    return records.filter(r => !r.timeOut || r.timeOut.trim() === '');
  }, [records]);

  const historyVisitors = useMemo(() => {
    return records.filter(r => {
      const hasTimeOut = r.timeOut && r.timeOut.trim().length > 0;
      if (!hasTimeOut && r.status !== 'COMPLETED') return false; 

      // Date Filter
      if (historyDate) {
         try {
             // Handle simple date strings and ISO strings
             const dStr = r.dateString.split('T')[0]; // Extract YYYY-MM-DD
             if (!dStr.startsWith(historyDate)) return false;
         } catch (e) { return false; }
      }
      return true;
    });
  }, [records, historyDate]);

  const filteredList = useMemo(() => {
    const list = activeTab === 'ACTIVE' ? activeVisitors : historyVisitors;
    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(r => 
      (r.lastName || '').toLowerCase().includes(lower) || 
      (r.firstName || '').toLowerCase().includes(lower) ||
      (r.affiliation || '').toLowerCase().includes(lower)
    );
  }, [activeTab, activeVisitors, historyVisitors, searchTerm]);

  // --- ACTIONS ---

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, lastName: val }));

    if (val.length > 2) {
      const matches = records.filter(r => (r.lastName || '').toLowerCase().includes(val.toLowerCase()));
      const unique = matches.filter((v, i, a) => a.findIndex(t => (t.firstName === v.firstName && t.lastName === v.lastName)) === i);
      setSuggestions(unique.slice(0, 5));
      setShowSuggestions(unique.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (visitor: VisitorRecord) => {
    setForm(prev => ({
      ...prev,
      lastName: visitor.lastName,
      firstName: visitor.firstName,
      middleInitial: visitor.middleInitial,
      affiliation: visitor.affiliation,
      contactNum: visitor.contactNum,
      idPresented: visitor.idPresented,
      idNumber: visitor.idNumber || '',
    }));
    setShowSuggestions(false);
  };

  const handleTimeIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const now = Date.now();
      const finalPurpose = form.purpose === 'Others' ? form.purposeOther : form.purpose;
      
      // Defaults
      let dateString = new Date().toLocaleDateString('en-CA');
      let timeIn = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      let timeOut = '';
      let status: 'ACTIVE' | 'COMPLETED' = 'ACTIVE';

      // Manual Override Logic
      if (isManualMode) {
        dateString = form.manualDate;
        
        // Manual Time Construction Helper
        const makeTime = (timeStr: string) => {
            if (!timeStr) return '';
            const [h, m] = timeStr.split(':');
            const d = new Date(); 
            d.setHours(Number(h)); 
            d.setMinutes(Number(m));
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };

        if (form.manualTimeIn) timeIn = makeTime(form.manualTimeIn);
        
        if (form.manualTimeOut) {
           timeOut = makeTime(form.manualTimeOut);
           status = 'COMPLETED';
        }
      }

      // Generate a unique ID
      const uniqueId = `V-${now}-${Math.floor(Math.random() * 1000)}`;

      const newRecord: VisitorRecord = {
        id: uniqueId,
        dateString,
        lastName: form.lastName,
        firstName: form.firstName,
        middleInitial: form.middleInitial,
        affiliation: form.affiliation,
        contactNum: form.contactNum,
        idPresented: form.idPresented,
        idNumber: form.idNumber,
        purpose: finalPurpose,
        timeIn,
        timeOut,
        status,
        recordedBy: user.name
      };

      // Optimistic Update
      setRecords(prev => [newRecord, ...prev]);
      
      setIsModalOpen(false);
      setForm(initialForm);
      if (status === 'COMPLETED') setActiveTab('HISTORY');
      else setActiveTab('ACTIVE');

      await addVisitorLog(newRecord);

    } catch (e) {
      alert("Failed to save entry. Please check network.");
      fetchData(); // Revert on failure
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeOut = async (id: string) => {
    if (!confirm("Clock out this visitor now?")) return;
    setProcessingId(id);
    
    try {
      const timeOut = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const status = 'COMPLETED';

      // Optimistic Update
      setRecords(prev => prev.map(r => r.id === id ? { ...r, timeOut, status } : r));
      
      await updateVisitorLog(id, {
        timeOut: timeOut,
        status: status
      });
      
    } catch (e) {
      console.error(e);
      alert("Error updating record.");
      fetchData();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY DELETE this entry from the spreadsheet?")) return;
    setDeletingId(id);

    try {
       // Optimistic Delete
       setRecords(prev => prev.filter(r => r.id !== id));
       await deleteVisitorLog(id);
    } catch (e) {
       console.error(e);
       alert("Error deleting record.");
       fetchData();
    } finally {
       setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* HEADER / STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-600 text-white p-6 rounded-xl shadow-md">
            <h2 className="text-emerald-100 font-bold text-xs uppercase tracking-wider mb-1">Visitors Inside</h2>
            <div className="text-4xl font-extrabold flex items-center">
                <Users className="mr-3 opacity-80" size={32}/>
                {activeVisitors.length}
            </div>
            <p className="text-emerald-100 text-sm mt-2">Currently in premises</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2 flex flex-col md:flex-row justify-between items-center gap-4">
             <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Visitor Logbook System
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full border">v1.2</span>
                </h1>
                <p className="text-gray-500 text-sm">Monitor entry/exit and visitor history</p>
             </div>
             <button 
                onClick={() => { setIsManualMode(false); setIsModalOpen(true); }}
                className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-gray-800 transition flex items-center transform hover:-translate-y-0.5"
             >
                <Plus size={20} className="mr-2" /> Log New Visitor
             </button>
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
         <div className="flex bg-gray-100 p-1 rounded-md">
            <button 
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center ${activeTab === 'ACTIVE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
            >
                <Clock size={16} className="mr-2" /> Active Visitors
                <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{activeVisitors.length}</span>
            </button>
            <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition flex items-center ${activeTab === 'HISTORY' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
                <History size={16} className="mr-2" /> History
            </button>
         </div>

         <div className="flex gap-2 w-full md:w-auto">
            {activeTab === 'HISTORY' && (
                <input 
                   type="month"
                   className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-gray-900 outline-none"
                   value={historyDate}
                   onChange={(e) => setHistoryDate(e.target.value)}
                />
            )}
            <div className="relative flex-grow">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                    placeholder="Search name or affiliation..."
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900 outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={fetchData}
                disabled={loading}
                className="p-2 border border-gray-200 rounded-md bg-white text-gray-500 hover:text-emerald-600 hover:border-emerald-200 transition"
                title="Refresh List"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
         </div>
      </div>

      {/* TABLE VIEW */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
                    <tr>
                        <th className="p-4 w-48">Visitor</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">Purpose</th>
                        <th className="p-4 w-32">Time In</th>
                        <th className="p-4 w-32">Time Out</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500"/></td></tr>
                    ) : error ? (
                        <tr><td colSpan={6} className="p-10 text-center text-red-500 font-bold">{error}</td></tr>
                    ) : filteredList.length === 0 ? (
                        <tr><td colSpan={6} className="p-10 text-center text-gray-400 italic">No records found.</td></tr>
                    ) : (
                        filteredList.map(record => (
                            <tr key={record.id} className="hover:bg-gray-50 transition">
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{record.lastName}, {record.firstName}</div>
                                    <div className="text-xs text-gray-500 font-mono">{formatDateDisplay(record.dateString)}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center text-xs text-gray-600 mb-1">
                                        <MapPin size={12} className="mr-1 text-gray-400" /> {record.affiliation}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-600">
                                        <Phone size={12} className="mr-1 text-gray-400" /> {record.contactNum}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100">
                                        {record.purpose}
                                    </span>
                                </td>
                                <td className="p-4 font-mono text-sm font-bold text-emerald-700">
                                    {formatTimeDisplay(record.timeIn)}
                                </td>
                                <td className="p-4 font-mono text-sm text-gray-600">
                                    {record.timeOut ? formatTimeDisplay(record.timeOut) : (
                                        <span className="text-emerald-500 text-xs font-medium animate-pulse">● Active</span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {activeTab === 'ACTIVE' && (
                                            <button 
                                                onClick={() => handleTimeOut(record.id)}
                                                disabled={processingId === record.id}
                                                className="flex items-center px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-bold text-xs transition shadow-sm"
                                            >
                                                {processingId === record.id ? <Loader2 className="animate-spin" size={14}/> : <><LogOut size={14} className="mr-1"/> Clock Out</>}
                                            </button>
                                        )}
                                        
                                        {/* DELETE BUTTON (Available for both Active and History) */}
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            disabled={deletingId === record.id}
                                            className="flex items-center p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition"
                                            title="Delete Entry"
                                        >
                                            {deletingId === record.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>
      </div>

      {/* ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">
                        {isManualMode ? 'Log Past/Manual Entry' : 'New Visitor Entry'}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-gray-400 hover:text-gray-600"/></button>
                </div>

                <div className="overflow-y-auto p-6 space-y-4">
                    {!isManualMode && (
                         <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center text-xs text-blue-800 border border-blue-100 mb-2">
                            <span>Need to record a past visit?</span>
                            <button onClick={() => setIsManualMode(true)} className="font-bold underline hover:text-blue-900">Switch to Manual Mode</button>
                         </div>
                    )}

                    {isManualMode && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Manual Entry Details</span>
                                <button onClick={() => setIsManualMode(false)} className="text-xs text-red-600 hover:underline">Cancel Manual Mode</button>
                            </div>
                            <input 
                                type="date" className="w-full border rounded p-2 text-sm bg-white text-gray-900 outline-none"
                                value={form.manualDate} onChange={e => setForm({...form, manualDate: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="time" className="border rounded p-2 text-sm bg-white text-gray-900 outline-none" placeholder="Time In" value={form.manualTimeIn} onChange={e => setForm({...form, manualTimeIn: e.target.value})} />
                                <input type="time" className="border rounded p-2 text-sm bg-white text-gray-900 outline-none" placeholder="Time Out" value={form.manualTimeOut} onChange={e => setForm({...form, manualTimeOut: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {/* Autocomplete Name Field */}
                    <div className="relative" ref={suggestionRef}>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                        <input 
                            className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                            value={form.lastName}
                            onChange={handleNameInput}
                            autoComplete="off"
                            placeholder="Type to search history..."
                        />
                        {showSuggestions && (
                            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl rounded-b-md z-20 max-h-40 overflow-y-auto">
                                {suggestions.map((s, i) => (
                                    <div key={i} onClick={() => applySuggestion(s)} className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0">
                                        <div className="font-bold text-sm text-gray-800">{s.lastName}, {s.firstName}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>{s.affiliation}</span> • <span>{s.contactNum}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                            <input className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                                value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">M.I.</label>
                            <input className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                                maxLength={2} value={form.middleInitial} onChange={e => setForm({...form, middleInitial: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Affiliation / Brgy</label>
                            <input className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                                value={form.affiliation} onChange={e => setForm({...form, affiliation: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact No.</label>
                            <input className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                                value={form.contactNum} onChange={e => setForm({...form, contactNum: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Presented</label>
                            <select className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                                value={form.idPresented} onChange={e => setForm({...form, idPresented: e.target.value})}
                            >
                                <option value="">Select ID Type</option>
                                {VALID_IDS.map(id => <option key={id} value={id}>{id}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Number</label>
                            <input className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                                value={form.idNumber} onChange={e => setForm({...form, idNumber: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Purpose of Visit</label>
                        <select className="w-full border-gray-300 rounded-md p-2.5 border outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                             value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})}
                        >
                            <option value="">Select Transaction</option>
                            {ASSESSOR_TRANSACTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {form.purpose === 'Others' && (
                            <input className="mt-2 w-full border-gray-300 rounded-md p-2 border text-sm bg-white text-gray-900" placeholder="Please specify..."
                                value={form.purposeOther} onChange={e => setForm({...form, purposeOther: e.target.value})}
                            />
                        )}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50">
                    <button 
                        onClick={handleTimeIn}
                        disabled={submitting || !form.lastName || !form.purpose}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition flex justify-center items-center"
                    >
                        {submitting ? 'Processing...' : (
                            isManualMode ? <><Save size={18} className="mr-2"/> Save Record</> : <><Clock size={18} className="mr-2"/> Time In Visitor</>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default VisitorLogbook;
