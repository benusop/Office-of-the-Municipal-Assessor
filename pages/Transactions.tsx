import React, { useState, useEffect } from 'react';
import { User, Transaction, TransactionUpdate, VisitorRecord, Assessment } from '../types';
import { getTransactions, saveTransaction, getVisitorLogs, getAssessments } from '../services/api';
import { summarizeTransactionNotes, proofreadText } from '../services/ai';
import { 
  ArrowRightLeft, Plus, Search, LayoutGrid, List as ListIcon, 
  Sparkles, X, CheckCircle2, Edit3, MapPin, Printer, FileText,
  Trash2, RotateCcw, AlertTriangle, MessageSquarePlus
} from 'lucide-react';
import { ASSESSOR_TRANSACTIONS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TransactionsProps {
  user: User;
}

// Helper: Peso Formatter
const formatPeso = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
    }).format(amount);
};

const Transactions: React.FC<TransactionsProps> = ({ user }) => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // Store ALL
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transData, assessData] = await Promise.all([
        getTransactions(),
        getAssessments()
      ]);
      setAllTransactions(transData);
      setAssessments(assessData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Filter: Recycle Bin vs Active
  // 2. Filter: Search Term (Check multiple fields)
  // 3. Sort: Latest First (ID descending YYYYMMDD-XXX)
  const displayedTransactions = allTransactions
    .filter(t => {
        const isDeleted = t.isDeleted === true; // Strict check
        if (showRecycleBin && !isDeleted) return false;
        if (!showRecycleBin && isDeleted) return false;

        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return (
            (t.clientName || '').toLowerCase().includes(lower) ||
            (t.transactionType || '').toLowerCase().includes(lower) ||
            (t.id || '').toLowerCase().includes(lower) ||
            (t.aiSummary || '').toLowerCase().includes(lower) ||
            (t.tags || []).some(tag => tag.toLowerCase().includes(lower))
        );
    })
    .sort((a, b) => b.id.localeCompare(a.id)); // Latest ID first (YYYYMMDD...)

  const handleDelete = async (t: Transaction) => {
      if (!confirm("Are you sure you want to move this transaction to the Recycle Bin?")) return;
      
      const updated = { ...t, isDeleted: true };
      // Optimistic update
      setAllTransactions(prev => prev.map(x => x.id === t.id ? updated : x));
      await saveTransaction(updated);
  };

  const handleRestore = async (t: Transaction) => {
      const updated = { ...t, isDeleted: false };
      setAllTransactions(prev => prev.map(x => x.id === t.id ? updated : x));
      await saveTransaction(updated);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
           <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ArrowRightLeft className="text-purple-600" /> 
              {showRecycleBin ? 'Recycle Bin' : 'Transaction Management'}
           </h1>
           <p className="text-sm text-gray-500">
               {showRecycleBin ? 'View and restore deleted records' : 'Track and manage office requests'}
           </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search transactions..." 
                className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full bg-white text-gray-900 outline-none focus:ring-emerald-500 focus:border-emerald-500" 
              />
           </div>
           
           <div className="bg-gray-100 p-1 rounded-lg flex">
              <button 
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded ${viewMode === 'GRID' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}
              >
                <ListIcon size={20} />
              </button>
           </div>

           <button 
             onClick={() => setShowRecycleBin(!showRecycleBin)}
             className={`p-2 rounded-lg border flex items-center justify-center transition ${showRecycleBin ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
             title={showRecycleBin ? "View Active" : "Recycle Bin"}
           >
             {showRecycleBin ? <ArrowRightLeft size={20} /> : <Trash2 size={20} />}
           </button>

           {!showRecycleBin && (
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold text-sm shadow-sm whitespace-nowrap"
                >
                    <Plus size={18} className="mr-2" /> New Request
                </button>
           )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading transactions...</div>
      ) : displayedTransactions.length === 0 ? (
        <div className="text-center py-20 text-gray-400 italic bg-white rounded-xl border border-gray-200 border-dashed">
            {showRecycleBin ? 'Recycle bin is empty.' : 'No transactions found.'}
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {displayedTransactions.map(t => (
             <TransactionCard 
                key={t.id} 
                transaction={t} 
                onClick={() => setSelectedTransaction(t)}
                isRecycleBin={showRecycleBin}
                onRestore={() => handleRestore(t)}
             />
           ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
              <thead className="bg-gray-50">
                 <tr>
                    <th className="px-6 py-3 font-medium text-gray-500 uppercase">Control No.</th>
                    <th className="px-6 py-3 font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 font-medium text-gray-500 uppercase">Last Update</th>
                    {showRecycleBin && <th className="px-6 py-3 font-medium text-gray-500 uppercase">Action</th>}
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                 {displayedTransactions.map(t => (
                    <tr 
                      key={t.id} 
                      onClick={() => setSelectedTransaction(t)} 
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                       <td className="px-6 py-4 font-mono text-xs text-gray-500 font-bold">{t.id}</td>
                       <td className="px-6 py-4 font-bold text-gray-800">{t.clientName}</td>
                       <td className="px-6 py-4 text-gray-600">{t.transactionType}</td>
                       <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                       <td className="px-6 py-4 text-gray-500">{new Date(t.lastUpdated).toLocaleDateString()}</td>
                       {showRecycleBin && (
                           <td className="px-6 py-4">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleRestore(t); }}
                                 className="text-emerald-600 hover:text-emerald-800 font-bold text-xs"
                               >
                                 Restore
                               </button>
                           </td>
                       )}
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <CreateTransactionModal 
            user={user}
            assessments={assessments}
            existingTransactions={allTransactions}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); fetchData(); }}
        />
      )}

      {/* DETAILS MODAL */}
      {selectedTransaction && (
        <TransactionDetailModal 
            transaction={selectedTransaction}
            user={user}
            isRecycleBin={showRecycleBin}
            onClose={() => setSelectedTransaction(null)}
            onUpdate={() => { setSelectedTransaction(null); fetchData(); }}
            onDelete={() => { setSelectedTransaction(null); handleDelete(selectedTransaction); }}
            onRestore={() => { setSelectedTransaction(null); handleRestore(selectedTransaction); }}
        />
      )}

    </div>
  );
};

// --- SUBCOMPONENTS ---

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let color = 'bg-gray-100 text-gray-600';
    if (status === 'PROCESSING') color = 'bg-blue-100 text-blue-700';
    if (status === 'COMPLETED') color = 'bg-emerald-100 text-emerald-700';
    if (status === 'CANCELLED') color = 'bg-red-100 text-red-700';
    if (status === 'PENDING') color = 'bg-yellow-100 text-yellow-800';
    
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{status}</span>;
};

const TransactionCard: React.FC<{ 
    transaction: Transaction, 
    onClick: () => void, 
    isRecycleBin?: boolean,
    onRestore?: () => void
}> = ({ transaction, onClick, isRecycleBin, onRestore }) => (
    <div onClick={onClick} className={`bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer flex flex-col h-full ${isRecycleBin ? 'opacity-75' : ''}`}>
        <div className="flex justify-between items-start mb-3">
            <StatusBadge status={transaction.status} />
            <span className="text-xs text-gray-400 font-mono font-bold">{transaction.id}</span>
        </div>
        <h3 className="font-bold text-lg text-gray-900 mb-1">{transaction.clientName}</h3>
        <p className="text-sm text-purple-600 font-medium mb-3">{transaction.transactionType}</p>
        
        <div className="flex-grow">
            <p className="text-sm text-gray-600 line-clamp-3 mb-4 bg-gray-50 p-2 rounded border border-gray-100">
                {transaction.aiSummary || transaction.rawNotes}
            </p>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
            {transaction.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded uppercase font-bold tracking-wider">
                    {tag}
                </span>
            ))}
        </div>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
             <span>Updated {new Date(transaction.lastUpdated).toLocaleDateString()}</span>
             {isRecycleBin ? (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onRestore?.(); }}
                    className="flex items-center text-emerald-600 font-bold hover:underline"
                 >
                     <RotateCcw size={12} className="mr-1"/> Restore
                 </button>
             ) : (
                 <span className="flex items-center"><Edit3 size={12} className="mr-1"/> Details</span>
             )}
        </div>
    </div>
);

// --- MODALS ---

const CreateTransactionModal: React.FC<{ 
    user: User, 
    assessments: Assessment[], 
    existingTransactions: Transaction[],
    onClose: () => void, 
    onSuccess: () => void 
}> = ({ user, assessments, existingTransactions, onClose, onSuccess }) => {
    const [form, setForm] = useState({ clientName: '', contact: '', type: '', typeOther: '', rawNotes: '' });
    const [generating, setGenerating] = useState(false);
    const [aiResult, setAiResult] = useState<{ summary: string, tags: string[] } | null>(null);
    
    // Visitor Lookup
    const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
    const [filteredVisitors, setFilteredVisitors] = useState<VisitorRecord[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingVisitors, setIsLoadingVisitors] = useState(true);

    // Tax Roll Search
    const [taxSearch, setTaxSearch] = useState('');
    const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

    useEffect(() => {
        const loadVisitors = async () => {
            try {
                const data = await getVisitorLogs();
                // Filter recent visitors and sort by ID desc
                setVisitors(data.filter(v => v.status !== 'DELETED').sort((a,b) => b.id.localeCompare(a.id)));
            } catch (e) {
                console.error("Failed to load visitors for autocomplete", e);
            } finally {
                setIsLoadingVisitors(false);
            }
        };
        loadVisitors();
    }, []);

    // Effect for Tax Roll Search
    useEffect(() => {
        if (taxSearch.length > 2) {
            const lower = taxSearch.toLowerCase();
            const matches = assessments.filter(a => 
                (a.td_Number && a.td_Number.toLowerCase().includes(lower)) ||
                (a.owner_name && a.owner_name.toLowerCase().includes(lower))
            ).slice(0, 5);
            setFilteredAssessments(matches);
        } else {
            setFilteredAssessments([]);
        }
    }, [taxSearch, assessments]);

    const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setForm({ ...form, clientName: val });

        if (val.length > 0 && visitors.length > 0) {
            const matches = visitors.filter(v => 
                (v.lastName || '').toLowerCase().includes(val.toLowerCase()) || 
                (v.firstName || '').toLowerCase().includes(val.toLowerCase())
            );
            
            // Deduplicate based on name
            const unique = matches.filter((v, i, a) => 
                a.findIndex(t => (t.firstName === v.firstName && t.lastName === v.lastName)) === i
            );
            
            setFilteredVisitors(unique.slice(0, 5));
            setShowSuggestions(unique.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleVisitorSelect = (visitor: VisitorRecord) => {
        const fullName = `${visitor.firstName || ''} ${visitor.lastName || ''}`.trim();
        const affiliationNote = visitor.affiliation ? `Affiliation: ${visitor.affiliation}` : '';
        const notes = form.rawNotes ? `${form.rawNotes}\n${affiliationNote}` : affiliationNote;
        
        let type = '';
        if (visitor.purpose && ASSESSOR_TRANSACTIONS.includes(visitor.purpose)) {
            type = visitor.purpose;
        } else {
            type = 'Others';
        }

        setForm({
            ...form,
            clientName: fullName,
            contact: visitor.contactNum || '',
            type: type,
            rawNotes: notes
        });
        setShowSuggestions(false);
    };

    const handleLinkAssessment = (assessment: Assessment) => {
        setSelectedAssessment(assessment);
        setTaxSearch(''); // clear search input
        setFilteredAssessments([]);
        
        // Append to notes with FORMATTED monetary values
        const avFormatted = formatPeso(assessment.assessed_Value);
        const tdInfo = `\n\n[Linked Property]\nTD No: ${assessment.td_Number}\nOwner: ${assessment.owner_name}\nLocation: ${assessment.td_barangay}\nAV: ${avFormatted}`;
        setForm(prev => ({ ...prev, rawNotes: prev.rawNotes + tdInfo }));
    };

    const handleAnalyze = async () => {
        if (!form.rawNotes) return;
        setGenerating(true);
        const result = await summarizeTransactionNotes(form.rawNotes);
        setAiResult(result);
        setGenerating(false);
    };

    const handleSubmit = async () => {
        if (!form.clientName || !form.type || (!aiResult && !form.rawNotes)) {
            alert("Please fill in required fields.");
            return;
        }
        
        const typeFinal = form.type === 'Others' ? form.typeOther : form.type;
        const now = new Date();
        
        // --- ID GENERATION LOGIC: YYYYMMDD-XXX ---
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const prefix = `${yyyy}${mm}${dd}`;
        
        // Find how many transactions exist for today
        const todayCount = existingTransactions.filter(t => t.id.startsWith(prefix)).length;
        const suffix = String(todayCount + 1).padStart(3, '0');
        const newId = `${prefix}-${suffix}`;

        const newTrans: Transaction = {
            id: newId,
            clientName: form.clientName,
            contactInfo: form.contact,
            transactionType: typeFinal,
            rawNotes: form.rawNotes,
            aiSummary: aiResult?.summary || form.rawNotes,
            tags: aiResult?.tags || [],
            status: 'PENDING',
            updates: [],
            dateCreated: now.toISOString(),
            lastUpdated: now.getTime(),
            createdBy: user.name,
            isDeleted: false
        };

        await saveTransaction(newTrans);
        onSuccess();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-900">New Transaction Request</h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Visitor Search */}
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Client Name (Search Visitor)
                            {isLoadingVisitors && <span className="ml-2 text-xs font-normal text-gray-400">(Loading directory...)</span>}
                        </label>
                        <div className="relative">
                            <input 
                                className="w-full border p-2 pl-8 rounded text-sm bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500" 
                                value={form.clientName} 
                                onChange={handleNameInput}
                                placeholder="Type to search from Visitor Log..."
                                autoComplete="off"
                            />
                            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                        </div>
                        {showSuggestions && (
                            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl rounded-b-md z-20 max-h-40 overflow-y-auto mt-1">
                                {filteredVisitors.map((v, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => handleVisitorSelect(v)} 
                                        className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0"
                                    >
                                        <div className="font-bold text-sm text-gray-800">{v.lastName}, {v.firstName}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span className="flex items-center"><MapPin size={10} className="mr-1"/> {v.affiliation}</span>
                                            <span>• {v.dateString}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Info</label>
                            <input className="w-full border p-2 rounded text-sm bg-white text-gray-900" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transaction Type</label>
                            <select className="w-full border p-2 rounded text-sm bg-white text-gray-900" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                                <option value="">Select Type</option>
                                {ASSESSOR_TRANSACTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    {form.type === 'Others' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Specify Type</label>
                            <input className="w-full border p-2 rounded text-sm bg-white text-gray-900" value={form.typeOther} onChange={e => setForm({...form, typeOther: e.target.value})} />
                        </div>
                    )}

                    {/* --- TAX ROLL SEARCH INTEGRATION --- */}
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center">
                            <FileText size={12} className="mr-1" />
                            Related Tax Declaration (Optional)
                        </label>
                        
                        {selectedAssessment ? (
                            <div className="flex items-center justify-between bg-white p-2 border border-emerald-200 rounded text-sm">
                                <div>
                                    <span className="font-bold text-emerald-700 block">{selectedAssessment.td_Number}</span>
                                    <div className="text-xs text-gray-500 flex items-center justify-between gap-4">
                                        <span>{selectedAssessment.owner_name}</span>
                                        <span className="font-mono text-emerald-600">{formatPeso(selectedAssessment.assessed_Value)}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedAssessment(null)} className="text-red-500 hover:text-red-700">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input 
                                    className="w-full border p-2 pr-8 rounded text-sm bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500" 
                                    placeholder="Search by TD No. or Owner Name..."
                                    value={taxSearch}
                                    onChange={e => setTaxSearch(e.target.value)}
                                />
                                <Search className="absolute right-2.5 top-2.5 text-gray-400" size={14} />
                                
                                {filteredAssessments.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-xl rounded-b-md z-20 max-h-40 overflow-y-auto mt-1">
                                        {filteredAssessments.map((a) => (
                                            <div 
                                                key={a.id} 
                                                onClick={() => handleLinkAssessment(a)} 
                                                className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <div className="font-bold text-sm text-gray-800">{a.td_Number}</div>
                                                <div className="text-xs text-gray-500 flex items-center justify-between">
                                                    <span>{a.owner_name}</span>
                                                    <span className="text-emerald-600 font-medium">Select</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
                            Raw Exchange Notes
                            <span className="text-[10px] text-emerald-600 flex items-center"><Sparkles size={10} className="mr-1"/> AI Powered</span>
                        </label>
                        <textarea 
                            className="w-full border p-2 rounded text-sm h-24 mb-2 bg-white text-gray-900" 
                            placeholder="Enter detailed notes from client interaction..."
                            value={form.rawNotes}
                            onChange={e => setForm({...form, rawNotes: e.target.value})}
                        />
                        <button 
                            onClick={handleAnalyze} 
                            disabled={generating || !form.rawNotes}
                            className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-bold hover:bg-emerald-100 flex justify-center items-center"
                        >
                            {generating ? <><Sparkles className="animate-spin mr-2" size={14}/> Analyzing...</> : <><Sparkles className="mr-2" size={14}/> Analyze & Summarize</>}
                        </button>
                    </div>

                    {aiResult && (
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 animate-fadeIn">
                            <h3 className="text-xs font-bold text-emerald-800 uppercase mb-1">AI Summary</h3>
                            <p className="text-sm text-gray-800 mb-2">{aiResult.summary}</p>
                            <div className="flex flex-wrap gap-1">
                                {aiResult.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-700 text-[10px] rounded uppercase font-bold">{tag}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold text-sm">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-purple-600 text-white rounded font-bold text-sm hover:bg-purple-700">Create Transaction</button>
                </div>
            </div>
        </div>
    );
};

const TransactionDetailModal: React.FC<{ 
    transaction: Transaction, 
    user: User, 
    isRecycleBin?: boolean, 
    onClose: () => void, 
    onUpdate: () => void,
    onDelete: () => void,
    onRestore: () => void
}> = ({ transaction, user, isRecycleBin, onClose, onUpdate, onDelete, onRestore }) => {
    const isFinished = transaction.status === 'COMPLETED' || transaction.status === 'CANCELLED';
    
    // Update State
    const [updateText, setUpdateText] = useState('');
    const [newStatus, setNewStatus] = useState(transaction.status);
    const [processing, setProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'HISTORY'>('DETAILS');
    const [isFollowUp, setIsFollowUp] = useState(false);

    const handleProofread = async () => {
        if (!updateText) return;
        setProcessing(true);
        const fixed = await proofreadText(updateText);
        setUpdateText(fixed);
        setProcessing(false);
    };

    const handleUpdate = async () => {
        if (!updateText && newStatus === transaction.status && !isFollowUp) return;

        setProcessing(true);
        const now = Date.now();
        
        let finalStatus = newStatus;
        let type: 'UPDATE' | 'STATUS_CHANGE' = 'UPDATE';
        
        // Special Follow Up Handling
        if (isFollowUp) {
            finalStatus = 'PROCESSING'; // Re-open the case
            type = 'STATUS_CHANGE'; 
        } else if (finalStatus !== transaction.status) {
            type = 'STATUS_CHANGE';
        }

        const notePrefix = isFollowUp ? "[FOLLOW UP CASE] " : "";

        const update: TransactionUpdate = {
            timestamp: now,
            authorName: user.name,
            note: notePrefix + updateText,
            type,
            previousStatus: transaction.status,
            newStatus: finalStatus
        };

        const updatedTrans = {
            ...transaction,
            status: finalStatus,
            lastUpdated: now,
            updates: [update, ...transaction.updates] // Prepend (Latest first)
        };

        await saveTransaction(updatedTrans);
        setProcessing(false);
        onUpdate();
        setIsFollowUp(false); // Reset mode
    };

    const handleGenerateReport = async () => {
        const doc = new jsPDF();
        
        // --- HEADER ---
        const centerX = 105;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("Republic of the Philippines", centerX, 15, { align: 'center' });
        doc.text("Province of Maguindanao del Sur", centerX, 20, { align: 'center' });
        doc.text("Municipality of Pagalungan", centerX, 25, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("OFFICE OF THE MUNICIPAL ASSESSOR", centerX, 32, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(20, 36, 190, 36);

        // --- TITLE ---
        doc.setFontSize(16);
        doc.text("TRANSACTION REPORT", centerX, 48, { align: 'center' });

        // --- DETAILS ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        let y = 60;
        doc.text(`Control No:`, 20, y);
        doc.setFont('helvetica', 'bold');
        doc.text(transaction.id, 50, y);
        
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Client Name:`, 20, y);
        doc.setFont('helvetica', 'bold');
        doc.text(transaction.clientName, 50, y);

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Date Filed:`, 20, y);
        doc.text(new Date(transaction.dateCreated).toLocaleDateString(), 50, y);
        
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Trans. Type:`, 20, y);
        doc.text(transaction.transactionType, 50, y);

        y += 6;
        doc.text(`Status:`, 20, y);
        doc.text(transaction.status, 50, y);

        // --- SUMMARY SECTION (No Raw Notes) ---
        y += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("Executive Summary / Details", 20, y);
        
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Only use AI Summary as requested
        const content = transaction.aiSummary;
        const splitText = doc.splitTextToSize(content, 170);
        doc.text(splitText, 20, y);
        
        y += (splitText.length * 5) + 10;

        // --- HISTORY LOG (With Follow Up Stacking) ---
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("Transaction History", 20, y);
        
        y += 8;
        
        // Reverse array for report (Oldest first) usually looks better for a timeline, 
        // but table usually shows latest top. Let's stick to standard table.
        // But for "stacking", maybe we visually separate follow ups? 
        // AutoTable handles rows well.
        
        const historyData = transaction.updates.map(u => {
            const isFollowUp = u.note.includes("[FOLLOW UP CASE]");
            const cleanNote = u.note.replace("[FOLLOW UP CASE]", "").trim();
            const actionLabel = isFollowUp ? "FOLLOW UP / RE-OPEN" : (u.type === 'STATUS_CHANGE' ? `Status: ${u.newStatus}` : 'Update');
            
            return [
                new Date(u.timestamp).toLocaleString(),
                u.authorName,
                actionLabel,
                cleanNote
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['Timestamp', 'Staff', 'Action', 'Notes']],
            body: historyData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [5, 150, 105] }, // Emerald header
            margin: { left: 20, right: 20 },
            // Highlight Follow Up rows
            didParseCell: (data) => {
                if (data.section === 'body' && (data.row.raw as string[])[2].includes("FOLLOW UP")) {
                     data.cell.styles.fillColor = [255, 237, 213]; // Light Orange for follow ups
                     data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // --- SIGNATURE BLOCK ---
        const finalY = (doc as any).lastAutoTable?.finalY + 30 || y + 30;
        
        // Prevent signature from falling off page
        if (finalY > 250) {
            doc.addPage();
            doc.text("Approved By:", 20, 20);
        } else {
            doc.text("Approved By:", 20, finalY);
        }

        const sigY = finalY > 250 ? 40 : finalY + 20;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("ESTRELLA C. SERNA, MPS", 20, sigY);
        doc.setFont('helvetica', 'normal');
        doc.text("Municipal Assessor", 20, sigY + 5);

        doc.save(`Transaction_${transaction.id}.pdf`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className={`p-5 border-b flex justify-between items-start ${isRecycleBin ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={transaction.status} />
                            <span className="text-xs text-gray-400 font-mono font-bold">#{transaction.id}</span>
                            {isRecycleBin && <span className="text-red-600 font-bold text-xs border border-red-200 bg-red-100 px-2 rounded">DELETED</span>}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{transaction.clientName}</h2>
                        <p className="text-sm text-gray-500">{transaction.transactionType} • {transaction.contactInfo}</p>
                    </div>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Body */}
                <div className="flex-grow overflow-y-auto p-0">
                    
                    {/* Summary Section */}
                    <div className="p-6 bg-white border-b border-gray-100">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-4">
                            <h3 className="text-xs font-bold text-emerald-800 uppercase mb-2 flex items-center"><Sparkles size={12} className="mr-1"/> AI Summary</h3>
                            <p className="text-sm text-gray-800 leading-relaxed">{transaction.aiSummary}</p>
                            <div className="flex gap-2 mt-3">
                                {transaction.tags.map(t => <span key={t} className="text-[10px] font-bold uppercase bg-white text-emerald-700 px-2 py-1 rounded border border-emerald-200">{t}</span>)}
                            </div>
                        </div>
                        
                        <details className="text-xs text-gray-500 cursor-pointer">
                            <summary className="hover:text-gray-700 font-medium">View Raw Notes</summary>
                            <p className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 italic whitespace-pre-wrap">{transaction.rawNotes}</p>
                        </details>
                    </div>

                    {/* Recycle Bin Message */}
                    {isRecycleBin && (
                        <div className="p-6 bg-red-50 text-center">
                            <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                            <h3 className="font-bold text-red-700">This record is in the Recycle Bin</h3>
                            <p className="text-sm text-red-600 mb-4">You cannot edit this record unless you restore it.</p>
                            <button 
                                onClick={onRestore}
                                className="px-4 py-2 bg-emerald-600 text-white rounded font-bold text-sm shadow hover:bg-emerald-700"
                            >
                                <RotateCcw size={16} className="inline mr-2"/> Restore Transaction
                            </button>
                        </div>
                    )}

                    {/* Active Controls */}
                    {!isRecycleBin && (
                        <>
                            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
                                <button onClick={() => setActiveTab('DETAILS')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'DETAILS' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Actions & Updates</button>
                                <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'HISTORY' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>History Log ({transaction.updates.length})</button>
                            </div>

                            <div className="p-6">
                                {activeTab === 'HISTORY' ? (
                                    <div className="space-y-6 relative border-l-2 border-gray-100 ml-3 pl-6">
                                        {transaction.updates.map((u, i) => (
                                            <div key={i} className="relative">
                                                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white ${u.note.includes('FOLLOW UP') ? 'bg-orange-500' : (u.type === 'STATUS_CHANGE' ? 'bg-purple-500' : 'bg-gray-400')}`}></div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-gray-700">{u.authorName}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {new Date(u.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {u.type === 'STATUS_CHANGE' && (
                                                    <div className="text-xs font-bold text-purple-600 mb-1">
                                                        {u.note.includes('FOLLOW UP') ? 'FOLLOW UP CASE OPENED' : `Changed status from ${u.previousStatus} to ${u.newStatus}`}
                                                    </div>
                                                )}
                                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">{u.note}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Standard Update vs Follow Up Logic */}
                                        {!isFinished || isFollowUp ? (
                                            <div className="space-y-4 animate-fadeIn">
                                                {isFollowUp && (
                                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm text-orange-800 font-bold flex items-center mb-2">
                                                        <MessageSquarePlus size={16} className="mr-2"/>
                                                        Adding a Follow-up Case (Will Re-open Transaction)
                                                    </div>
                                                )}
                                                
                                                {!isFollowUp && (
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Set Status</label>
                                                            <select 
                                                                className="w-full border p-2 rounded text-sm bg-white text-gray-900"
                                                                value={newStatus}
                                                                onChange={e => setNewStatus(e.target.value as any)}
                                                            >
                                                                <option value="PENDING">PENDING</option>
                                                                <option value="PROCESSING">PROCESSING</option>
                                                                <option value="COMPLETED">COMPLETED</option>
                                                                <option value="CANCELLED">CANCELLED</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
                                                        {isFollowUp ? 'Follow-up Details / Problem' : 'Update Note / Remarks'}
                                                        <button onClick={handleProofread} disabled={!updateText} className="text-emerald-600 flex items-center hover:underline">
                                                            <Sparkles size={12} className="mr-1"/> AI Proofread
                                                        </button>
                                                    </label>
                                                    <textarea 
                                                        className={`w-full border p-2 rounded text-sm h-24 bg-white text-gray-900 ${isFollowUp ? 'border-orange-300 ring-2 ring-orange-100' : ''}`}
                                                        placeholder={isFollowUp ? "Describe the new problem or follow-up request..." : "Describe progress or reason for status change..."}
                                                        value={updateText}
                                                        onChange={e => setUpdateText(e.target.value)}
                                                    />
                                                </div>

                                                <div className="flex gap-2">
                                                    {isFollowUp && (
                                                        <button 
                                                            onClick={() => setIsFollowUp(false)}
                                                            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded font-bold text-sm hover:bg-gray-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={handleUpdate}
                                                        disabled={processing || (!updateText && newStatus === transaction.status && !isFollowUp)}
                                                        className={`flex-1 py-2 rounded font-bold text-sm flex justify-center items-center text-white ${isFollowUp ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                                                    >
                                                        {processing ? 'Processing...' : (isFollowUp ? 'Submit Follow Up' : 'Submit Update')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                                                <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
                                                <h3 className="font-bold text-gray-900">Transaction Finalized</h3>
                                                <p className="text-sm text-gray-500 mb-6">No further updates can be made to this record unless you add a follow-up.</p>
                                                
                                                <div className="flex justify-center gap-3">
                                                    {transaction.status === 'COMPLETED' && (
                                                        <button 
                                                            onClick={handleGenerateReport}
                                                            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-900 inline-flex items-center shadow-sm"
                                                        >
                                                            <Printer size={16} className="mr-2"/> Generate Full Report
                                                        </button>
                                                    )}
                                                    
                                                    <button 
                                                        onClick={() => { setIsFollowUp(true); setUpdateText(''); }}
                                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition inline-flex items-center shadow-sm"
                                                    >
                                                        <MessageSquarePlus size={16} className="mr-2"/> Add Follow Up Case
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Delete Button (Always visible at bottom) */}
                                        <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
                                             <button 
                                                onClick={onDelete}
                                                className="text-xs text-red-500 hover:text-red-700 flex items-center hover:underline"
                                             >
                                                <Trash2 size={12} className="mr-1"/> Delete Transaction (Move to Recycle Bin)
                                             </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transactions;