
import React, { useState, useEffect } from 'react';
import { User, DTRRecord, Holiday } from '../types';
import { getDTRLogs, saveDTRRecord, getHolidays, saveHoliday, deleteHoliday } from '../services/api';
import { Clock, Download, Briefcase, Plane, CalendarPlus, X, AlertCircle, Shield, List, Trash2, Edit2, Save } from 'lucide-react';
import { STAFF_CREDENTIALS } from '../constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceProps {
  user: User;
}

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dtrRecords, setDtrRecords] = useState<DTRRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'my_dtr'>('daily');

  // Date State for DTR View
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Export State
  const [paperSize, setPaperSize] = useState<'letter' | 'a4' | 'legal'>('letter');
  const [processing, setProcessing] = useState(false);

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOBModal, setShowOBModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showHolidayListModal, setShowHolidayListModal] = useState(false);
  const [showEditDTRModal, setShowEditDTRModal] = useState(false);

  // Form States
  const [leaveForm, setLeaveForm] = useState({ type: 'Vacation Leave', start: '', end: '', reason: '' });
  const [obForm, setObForm] = useState({ location: '', start: '', end: '', purpose: '' });
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'Regular', remarks: '' });
  
  // Manual Edit State
  const [editingDTR, setEditingDTR] = useState<DTRRecord | null>(null);

  const isDev = user.role === 'DEVELOPER';

  // Helper to separate staff groups
  const provincialStaffId = 'prov_01';
  const regularStaff = STAFF_CREDENTIALS.filter(s => s.id !== provincialStaffId);
  const provincialStaff = STAFF_CREDENTIALS.find(s => s.id === provincialStaffId);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dtr, hols] = await Promise.all([getDTRLogs(), getHolidays()]);
      setDtrRecords(dtr);
      // Ensure holidays are valid array
      setHolidays(hols || []);
    } catch (e) {
      console.error("Failed to fetch DTR data");
    } finally {
      setLoading(false);
    }
  };

  const getRecordId = (userId: string, dateStr: string) => `${dateStr}_${userId}`;

  // Helper: Convert 24h to 12h
  const formatTime = (time: string | undefined) => {
    if (!time || time === 'HOLIDAY') return time || '';
    // Check if already 12h
    if (time.toLowerCase().includes('m')) return time;
    
    const [h, m] = time.split(':');
    if (!h || !m) return time;
    
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
        const data = await fetch(url);
        const blob = await data.blob();
        return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => resolve(reader.result as string);
        });
    } catch (e) {
        return "";
    }
  }

  // --- LOGIC: TIME VALIDATION ---
  const handlePunch = async (type: 'AM' | 'PM') => {
    if (processing) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Time Windows (in minutes)
    const amStart = 6 * 60 + 30; // 6:30 AM
    const amEnd = 11 * 60 + 30;  // 11:30 AM
    const pmStart = 12 * 60 + 10; // 12:10 PM
    const pmEnd = 15 * 60;       // 3:00 PM

    if (type === 'AM') {
        if (currentMinutes < amStart || currentMinutes > amEnd) {
            alert("AM Clock-in is only available between 6:30 AM and 11:30 AM.");
            return;
        }
    } else {
        if (currentMinutes < pmStart || currentMinutes > pmEnd) {
            alert("PM Clock-in is only available between 12:10 PM and 3:00 PM.");
            return;
        }
    }

    setProcessing(true);

    try {
      const todayString = new Date().toLocaleDateString('en-CA');
      // Store in standard 24h format for consistent logic/sorting
      const timeString = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); 
      const id = getRecordId(user.id, todayString);
      
      const existing = dtrRecords.find(r => r.id === id);
      
      let newRecord: DTRRecord;

      if (existing) {
        newRecord = { ...existing };
      } else {
        newRecord = {
          id,
          staffId: user.id,
          staffName: user.name,
          dateString: todayString,
          amIn: '',
          amOut: '',
          pmIn: '',
          pmOut: '',
          remarks: '',
          isHoliday: 'false'
        };
      }

      if (type === 'AM') {
        if (newRecord.amIn) {
          alert("You have already clocked in for AM.");
          setProcessing(false);
          return;
        }
        newRecord.amIn = timeString;
        newRecord.amOut = "12:00"; // Auto-set
      } else {
        if (newRecord.pmIn) {
          alert("You have already clocked in for PM.");
          setProcessing(false);
          return;
        }
        newRecord.pmIn = timeString;
        newRecord.pmOut = "17:00"; // Auto-set (5 PM)
      }

      await saveDTRRecord(newRecord);
      await fetchData();
      alert(`Success! ${type} IN recorded at ${formatTime(timeString)}.`);
    } catch (e) {
      console.error(e);
      alert("Failed to save DTR. Please check connection.");
    } finally {
      setProcessing(false);
    }
  };

  // --- LOGIC: BATCH UPDATES (Leave/OB) ---
  const handleBatchUpdate = async (type: 'LEAVE' | 'OB') => {
    setProcessing(true);
    try {
        const start = new Date(type === 'LEAVE' ? leaveForm.start : obForm.start);
        const end = new Date(type === 'LEAVE' ? leaveForm.end : obForm.end);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            alert("Invalid date range.");
            setProcessing(false);
            return;
        }

        // Iterate dates
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            // Skip weekends
            if (d.getDay() === 0 || d.getDay() === 6) continue;

            const dateStr = d.toLocaleDateString('en-CA');
            const id = getRecordId(user.id, dateStr);
            const existing = dtrRecords.find(r => r.id === id);
            
            const remarks = type === 'LEAVE' 
                ? `${leaveForm.type.toUpperCase()} - ${leaveForm.reason}`
                : `OB: ${obForm.location} - ${obForm.purpose}`;

            // Leaves blank time, OB standard time
            const timeInAM = type === 'OB' ? '08:00' : '';
            const timeOutAM = type === 'OB' ? '12:00' : '';
            const timeInPM = type === 'OB' ? '13:00' : '';
            const timeOutPM = type === 'OB' ? '17:00' : '';

            const record: DTRRecord = {
                id,
                staffId: user.id,
                staffName: user.name,
                dateString: dateStr,
                amIn: existing?.amIn || timeInAM,
                amOut: existing?.amOut || timeOutAM,
                pmIn: existing?.pmIn || timeInPM,
                pmOut: existing?.pmOut || timeOutPM,
                remarks: existing?.remarks ? `${existing.remarks} | ${remarks}` : remarks,
                isHoliday: 'false'
            };
            
            await saveDTRRecord(record);
        }
        
        await fetchData();
        setShowLeaveModal(false);
        setShowOBModal(false);
        alert(`${type} filed successfully.`);
    } catch (e) {
        alert("Error saving records.");
    } finally {
        setProcessing(false);
    }
  };

  // --- LOGIC: HOLIDAYS ---
  const handleSaveHoliday = async () => {
      if (!holidayForm.date || !holidayForm.name) return;
      setProcessing(true);
      try {
          const newHol: Holiday = {
              id: Date.now().toString(),
              dateString: holidayForm.date,
              name: holidayForm.name,
              type: holidayForm.type as any,
              remarks: holidayForm.remarks // Include Remarks
          };
          await saveHoliday(newHol);
          await fetchData();
          setShowHolidayModal(false);
          setHolidayForm({ date: '', name: '', type: 'Regular', remarks: '' });
          alert("Holiday set successfully. It will now reflect in DTRs.");
      } catch (e) {
          alert("Error saving holiday.");
      } finally {
          setProcessing(false);
      }
  };

  const handleDeleteHoliday = async (id: string) => {
      if(!confirm("Delete this holiday?")) return;
      setProcessing(true);
      try {
          await deleteHoliday(id);
          await fetchData();
      } catch (e) {
          alert("Failed to delete holiday");
      } finally {
          setProcessing(false);
      }
  };

  // --- LOGIC: MANUAL DTR EDIT ---
  const openEditDTR = (date: Date) => {
      const dateString = date.toLocaleDateString('en-CA');
      const id = getRecordId(user.id, dateString);
      const existing = dtrRecords.find(r => r.id === id);
      
      const record: DTRRecord = existing ? { ...existing } : {
          id,
          staffId: user.id,
          staffName: user.name,
          dateString,
          amIn: '',
          amOut: '',
          pmIn: '',
          pmOut: '',
          remarks: '',
          isHoliday: 'false'
      };
      
      setEditingDTR(record);
      setShowEditDTRModal(true);
  };

  const handleSaveDTREdit = async () => {
      if (!editingDTR) return;
      setProcessing(true);
      try {
          await saveDTRRecord(editingDTR);
          await fetchData();
          setShowEditDTRModal(false);
          setEditingDTR(null);
          alert("Record updated successfully.");
      } catch (e) {
          alert("Failed to update DTR record.");
      } finally {
          setProcessing(false);
      }
  };

  // --- LOGIC: PDF ---
  const handleExportPDF = async () => {
    setProcessing(true);
    try {
      // 1. Setup Document
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: paperSize });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // 2. Layout Constants - STANDARD FORM SIZE
      const dtrWidth = 85; 
      const gap = 10; 
      const margin = 10;
      
      const availableWidth = pageWidth - (margin * 2);
      let numCopies = Math.floor((availableWidth + gap) / (dtrWidth + gap));
      if (numCopies < 1) numCopies = 1;
      
      const totalBlockWidth = (numCopies * dtrWidth) + ((numCopies - 1) * gap);
      const startXBase = (pageWidth - totalBlockWidth) / 2;
      
      let logoBase64 = null;
      try {
        const logoUrl = 'https://lh3.googleusercontent.com/d/1S7VKW-nIhOwDLDZOXDXgX9w6gCw2OR09';
        logoBase64 = await getBase64FromUrl(logoUrl);
      } catch (e) {
        console.warn("Could not load logo for PDF");
      }

      const targets = [STAFF_CREDENTIALS.find(s => s.id === user.id)!];

      targets.forEach((staff, index) => {
        if (index > 0) doc.addPage();
        
        for (let i = 0; i < numCopies; i++) {
            const startX = startXBase + (i * (dtrWidth + gap));
            const centerX = startX + (dtrWidth / 2);
            let cursorY = 10;

            if (logoBase64 && logoBase64.length > 100) {
                const imgDim = 50; 
                const imgX = centerX - (imgDim / 2);
                const imgY = (pageHeight / 2) - (imgDim / 2);

                doc.saveGraphicsState();
                const gState = new (doc as any).GState({ opacity: 0.2 });
                doc.setGState(gState);
                doc.addImage(logoBase64, 'PNG', imgX, imgY, imgDim, imgDim);
                doc.restoreGraphicsState();
            }

            doc.setFontSize(7); 
            doc.setFont('helvetica', 'normal');
            doc.text("CIVIL SERVICE FORM NO. 48", startX, cursorY);
            
            cursorY += 4; 
            doc.setFontSize(12); 
            doc.setFont('helvetica', 'bold'); 
            doc.text("DAILY TIME RECORD", centerX, cursorY, { align: 'center' });
            
            cursorY += 5; 
            doc.setLineWidth(0.4);
            doc.line(startX + 5, cursorY + 1, startX + dtrWidth - 5, cursorY + 1); 
            
            doc.setFontSize(10);
            doc.text("----- " + staff.name.toUpperCase() + " -----", centerX, cursorY, { align: 'center' });
            
            cursorY += 4; 
            doc.setFontSize(7); 
            doc.setFont('helvetica', 'normal'); 
            doc.text("(Name)", centerX, cursorY, { align: 'center' });
            
            cursorY += 6;
            const monthStr = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
            
            doc.text(`For the month of: ${monthStr}`, startX, cursorY);
            doc.text(`Official hours for arrival`, startX + (dtrWidth * 0.55), cursorY);
            
            cursorY += 3; 
            doc.text(`and departure`, startX + (dtrWidth * 0.55) + 5, cursorY);
            
            cursorY += 3;
            doc.text(`Regular Days: _____________`, startX + (dtrWidth * 0.55), cursorY);
            
            cursorY += 3;
            doc.text(`Saturdays: _____________`, startX + (dtrWidth * 0.55), cursorY);
            cursorY += 2;

            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const tableBody = [];
            const staffRecords = dtrRecords.filter(r => r.staffId === staff.id);

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(selectedYear, selectedMonth, day);
                const dateString = date.toLocaleDateString('en-CA');
                const rec = staffRecords.find(r => r.dateString === dateString);
                
                // --- HOLIDAY LOGIC (PDF) ---
                // Trim logic added to ensure matches against GSheets data
                const holiday = holidays.find(h => h.dateString.trim() === dateString.trim());
                
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                
                let rowData: any[] = [];

                if (holiday) {
                    const holidayText = holiday.remarks 
                        ? `${holiday.name.toUpperCase()} (${holiday.remarks})`
                        : holiday.name.toUpperCase();

                    rowData = [
                        day,
                        { 
                            content: holidayText, 
                            colSpan: 6, 
                            styles: { 
                                halign: 'center', 
                                textColor: [220, 38, 38], 
                                fontStyle: 'bold', 
                                fillColor: [255, 255, 255] 
                            } 
                        }
                    ];
                } else if (isWeekend) {
                     rowData = [
                        day,
                        { content: dayName, colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', textColor: [100, 100, 100] } }
                     ];
                } else if (rec?.remarks?.includes('LEAVE')) {
                     rowData = [
                        day,
                        { content: rec.remarks.toUpperCase(), colSpan: 6, styles: { halign: 'center', textColor: [234, 88, 12] } }
                     ];
                } else if (rec?.remarks?.includes('OB')) {
                     rowData = [
                        day,
                        { content: 'OFFICIAL BUSINESS', colSpan: 6, styles: { halign: 'center', textColor: [88, 28, 135] } }
                     ];
                } else {
                    let amIn = rec?.amIn || '';
                    let amOut = rec?.amOut || '';
                    let pmIn = rec?.pmIn || '';
                    let pmOut = rec?.pmOut || '';
                    
                    const isLateAM = amIn > '08:00';
                    const isLatePM = pmIn > '13:00';
                    
                    rowData = [
                        day,
                        { content: formatTime(amIn), styles: isLateAM ? { textColor: [220, 38, 38], fontStyle: 'bold' } : {} },
                        formatTime(amOut),
                        { content: formatTime(pmIn), styles: isLatePM ? { textColor: [220, 38, 38], fontStyle: 'bold' } : {} },
                        formatTime(pmOut),
                        '', 
                        '' 
                    ];
                }
                tableBody.push(rowData);
            }

            autoTable(doc, {
                startX: startX, 
                startY: cursorY,
                head: [
                    [
                        { content: 'Day', rowSpan: 2, styles: {valign:'middle', halign:'center'} }, 
                        { content: 'A.M.', colSpan: 2, styles: {halign:'center'} }, 
                        { content: 'P.M.', colSpan: 2, styles: {halign:'center'} }, 
                        { content: 'Undertime', colSpan: 2, styles: {halign:'center'} }
                    ],
                    ['Arr', 'Dep', 'Arr', 'Dep', 'Hrs', 'Min']
                ],
                body: tableBody,
                theme: 'plain',
                styles: { 
                    fontSize: 7.5, 
                    cellPadding: 0.6, 
                    lineColor: [0,0,0], 
                    lineWidth: 0.1, 
                    textColor: [0,0,0], 
                    font: 'helvetica',
                    halign: 'center'
                },
                headStyles: { 
                    fillColor: [255,255,255], 
                    textColor: [0,0,0], 
                    fontStyle: 'bold', 
                    lineWidth: 0.1, 
                    halign: 'center' 
                },
                columnStyles: { 
                    0: { cellWidth: 8 },  
                    1: { cellWidth: 12.8 }, 
                    2: { cellWidth: 12.8 }, 
                    3: { cellWidth: 12.8 }, 
                    4: { cellWidth: 12.8 }, 
                    5: { cellWidth: 10 }, 
                    6: { cellWidth: 10 } 
                },
                margin: { left: startX },
                tableWidth: dtrWidth,
                minCellHeight: 3.8
            });

            const finalY = (doc as any).lastAutoTable?.finalY + 4 || cursorY + 120;
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.text("I certify on my honor that the above is a true and correct report...", startX, finalY, { maxWidth: dtrWidth });
            
            const sigY = finalY + 12;
            doc.setLineWidth(0.4);
            doc.line(startX + 10, sigY, startX + dtrWidth - 10, sigY);
            
            doc.setFontSize(9); 
            doc.setFont('helvetica', 'bold');
            doc.text(staff.name.toUpperCase(), centerX, sigY + 4, { align: 'center' });
            
            doc.setFontSize(7); 
            doc.setFont('helvetica', 'italic'); 
            doc.text("Verified as to the prescribed office hours:", startX, sigY + 10);
            
            const chargeY = sigY + 20;
            doc.line(startX + 10, chargeY, startX + dtrWidth - 10, chargeY);
            
            doc.setFontSize(9); 
            doc.setFont('helvetica', 'bold');
            doc.text("In Charge", centerX, chargeY + 4, { align: 'center' });
        }
      });

      doc.save(`DTR_${user.name}.pdf`);
    } catch (e) { 
        console.error(e); 
        alert("PDF Error: Please ensure you have a stable connection for the logo."); 
    } finally { 
        setProcessing(false); 
    }
  };

  // --- RENDERERS ---

  const renderDashboardDaily = () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const presentToday = dtrRecords.filter(r => r.dateString === todayStr && r.amIn && r.staffId !== provincialStaffId);
    const provRecord = provincialStaff ? dtrRecords.find(r => r.staffId === provincialStaff.id && r.dateString === todayStr) : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Clock size={20} className="mr-2 text-emerald-600"/> Who is In Today? (Municipal)</h3>
                    {presentToday.length === 0 ? <p className="text-gray-400">No one has clocked in yet.</p> : (
                        <div className="space-y-3">
                            {presentToday.map(r => (
                                <div key={r.staffId} className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                                    <span className="font-bold text-gray-800">{r.staffName}</span>
                                    <div className="text-sm">
                                        <span className="text-emerald-700 font-mono font-bold mr-2">AM: {formatTime(r.amIn)}</span>
                                        {r.pmIn && <span className="text-blue-700 font-mono font-bold">PM: {formatTime(r.pmIn)}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Shield size={20} className="mr-2 text-blue-600"/> Provincial Personnel Log</h3>
                    {provRecord && (provRecord.amIn || provRecord.pmIn) ? (
                         <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="font-bold text-gray-900">{provincialStaff?.name}</span>
                            <div className="text-sm">
                                {provRecord.amIn && <span className="text-blue-700 font-mono font-bold mr-2">AM: {formatTime(provRecord.amIn)}</span>}
                                {provRecord.pmIn && <span className="text-indigo-700 font-mono font-bold">PM: {formatTime(provRecord.pmIn)}</span>}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400 italic text-sm">No log entry for provincial personnel today.</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center h-fit">
                 <h3 className="font-bold text-gray-700 mb-4">My Attendance Actions</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handlePunch('AM')} disabled={processing} className="p-4 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 font-bold transition">AM IN</button>
                    <button onClick={() => handlePunch('PM')} disabled={processing} className="p-4 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-bold transition">PM IN</button>
                    <button onClick={() => setShowLeaveModal(true)} className="p-4 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 font-bold transition flex flex-col items-center"><Briefcase size={20} className="mb-1"/> File Leave</button>
                    <button onClick={() => setShowOBModal(true)} className="p-4 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 font-bold transition flex flex-col items-center"><Plane size={20} className="mb-1"/> File O.B.</button>
                 </div>
                 {isDev && (
                     <div className="mt-4 flex gap-2">
                        <button onClick={() => setShowHolidayModal(true)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-bold border border-gray-300 flex items-center justify-center">
                            <CalendarPlus size={16} className="mr-2"/> Add Holiday
                        </button>
                        <button onClick={() => setShowHolidayListModal(true)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-bold border border-gray-300 flex items-center justify-center">
                            <List size={16} className="mr-2"/> View DB
                        </button>
                     </div>
                 )}
            </div>
        </div>
    )
  };

  const renderDashboardWeekly = () => {
     // ... weekly implementation
     const today = new Date();
     const startOfWeek = new Date(today);
     startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
     const weekDates = Array.from({length: 5}, (_, i) => {
         const d = new Date(startOfWeek);
         d.setDate(startOfWeek.getDate() + i);
         return d;
     });

     return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <h3 className="font-bold text-gray-700 mb-4">Weekly Summary (Mon-Fri) - Municipal Staff</h3>
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 text-left">
                        <th className="p-3 border">Staff</th>
                        {weekDates.map(d => <th key={d.toString()} className="p-3 border">{d.toLocaleDateString('en-US', {weekday: 'short', month:'short', day:'numeric'})}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {regularStaff.map(staff => (
                        <tr key={staff.id}>
                            <td className="p-3 border font-bold text-gray-700">{staff.name}</td>
                            {weekDates.map(d => {
                                const ds = d.toLocaleDateString('en-CA');
                                const rec = dtrRecords.find(r => r.staffId === staff.id && r.dateString === ds);
                                // Determine first holiday match with trimmed string check
                                const hol = holidays.find(h => h.dateString.trim() === ds);
                                
                                let content = <span className="text-gray-300">-</span>;
                                if (hol) content = <span className="text-red-500 font-bold text-xs">HOL</span>;
                                else if (rec?.amIn || rec?.pmIn) content = <span className="text-emerald-600 font-bold">✔</span>;
                                else if (rec?.remarks?.includes('LEAVE')) content = <span className="text-orange-500 font-bold text-xs">LEAVE</span>;
                                else if (rec?.remarks?.includes('OB')) content = <span className="text-purple-500 font-bold text-xs">OB</span>;
                                
                                return <td key={ds} className="p-3 border text-center">{content}</td>
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
     );
  };

  const renderDashboardMonthly = () => {
      return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-4">Monthly Attendance Count ({new Date().toLocaleString('default',{month:'long'})}) - Municipal Staff</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regularStaff.map(staff => {
                      const count = dtrRecords.filter(r => r.staffId === staff.id && r.dateString.startsWith(`${selectedYear}-${String(selectedMonth+1).padStart(2, '0')}`) && (r.amIn || r.pmIn)).length;
                      return (
                          <div key={staff.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="font-medium text-gray-700">{staff.name}</span>
                              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-sm">{count} Days</span>
                          </div>
                      )
                  })}
              </div>
          </div>
      )
  };

  const renderMyDTR = () => {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const rows = [];
      const staffRecords = dtrRecords.filter(r => r.staffId === user.id);
      
      for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(selectedYear, selectedMonth, day);
          const dateString = date.toLocaleDateString('en-CA');
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(); 
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const rec = staffRecords.find(r => r.dateString === dateString);
          
          // Apply First Found Holiday - ROBUST MATCHING
          const holiday = holidays.find(h => h.dateString.trim() === dateString.trim());
          
          const rowBaseProps = {
              key: day,
              className: "text-center h-8 text-xs cursor-pointer hover:bg-blue-50 transition",
              onClick: () => openEditDTR(date)
          };

          if (holiday) {
             const holidayText = holiday.remarks 
                ? `${holiday.name.toUpperCase()} (${holiday.remarks})`
                : holiday.name.toUpperCase();

             rows.push(
                <tr {...rowBaseProps}>
                    <td className="border p-1 font-bold w-12">{day}</td>
                    <td className="border p-1 text-red-600 font-bold uppercase tracking-widest text-[10px]" colSpan={6}>
                        <div className="flex justify-center">
                            <span className="bg-white px-3 py-0.5 rounded-full border border-red-100 shadow-sm relative -top-0">
                                {holidayText}
                            </span>
                        </div>
                    </td>
                </tr>
             );
          } else if (isWeekend) {
             rows.push(
                <tr {...rowBaseProps} className="text-center h-8 text-xs bg-gray-50 hover:bg-blue-50">
                    <td className="border p-1 font-bold w-12">{day}</td>
                    <td className="border p-1 text-gray-400 font-bold" colSpan={6}>{dayName}</td>
                </tr>
             );
          } else if (rec?.remarks?.includes('LEAVE')) {
             rows.push(
                <tr {...rowBaseProps} className="text-center h-8 text-xs bg-orange-50 hover:bg-orange-100">
                    <td className="border p-1 font-bold w-12">{day}</td>
                    <td className="border p-1 text-orange-600 font-bold" colSpan={6}>{rec.remarks.toUpperCase()}</td>
                </tr>
             );
          } else if (rec?.remarks?.includes('OB')) {
             rows.push(
                <tr {...rowBaseProps} className="text-center h-8 text-xs bg-purple-50 hover:bg-purple-100">
                    <td className="border p-1 font-bold w-12">{day}</td>
                    <td className="border p-1 text-purple-600 font-bold" colSpan={6}>OFFICIAL BUSINESS</td>
                </tr>
             );
          } else {
              let amIn = rec?.amIn || '';
              let amOut = rec?.amOut || '';
              let pmIn = rec?.pmIn || '';
              let pmOut = rec?.pmOut || '';
              
              rows.push(
                <tr {...rowBaseProps}>
                    <td className="border p-1 font-bold w-12">{day}</td>
                    <td className={`border p-1 font-mono w-20 ${amIn > '08:00' ? 'text-red-600 font-bold' : ''}`}>{formatTime(amIn)}</td>
                    <td className="border p-1 font-mono w-20">{formatTime(amOut)}</td>
                    <td className={`border p-1 font-mono w-20 ${pmIn > '13:00' ? 'text-red-600 font-bold' : ''}`}>{formatTime(pmIn)}</td>
                    <td className="border p-1 font-mono w-20">{formatTime(pmOut)}</td>
                    <td className="border p-1 font-mono w-12"></td>
                    <td className="border p-1 font-mono w-12"></td>
                </tr>
              );
          }
      }

      return (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-2">
                       <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))} className="border p-2 rounded text-sm bg-white text-gray-900">
                           {Array.from({length:12},(_,i)=><option key={i} value={i}>{new Date(0,i).toLocaleString('default',{month:'long'})}</option>)}
                       </select>
                       <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="border p-2 rounded text-sm bg-white text-gray-900">
                           <option value={2024}>2024</option>
                           <option value={2025}>2025</option>
                           <option value={2026}>2026</option>
                           <option value={2027}>2027</option>
                       </select>
                  </div>
                  <div className="flex gap-2">
                      <select value={paperSize} onChange={e=>setPaperSize(e.target.value as any)} className="border p-2 rounded text-sm bg-white text-gray-900">
                          <option value="letter">Short (Letter)</option><option value="a4">A4</option><option value="legal">Long (Legal)</option>
                      </select>
                      <button onClick={handleExportPDF} disabled={processing} className="px-4 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-900 transition flex items-center text-sm">
                          <Download size={16} className="mr-2"/> Download PDF
                      </button>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 table-fixed max-w-2xl mx-auto">
                      <thead>
                          <tr className="bg-gray-100 text-xs">
                              <th className="border p-2 w-12" rowSpan={2}>Day</th>
                              <th className="border p-2" colSpan={2}>A.M.</th>
                              <th className="border p-2" colSpan={2}>P.M.</th>
                              <th className="border p-2" colSpan={2}>Undertime</th>
                          </tr>
                          <tr className="bg-gray-50 text-xs">
                              <th className="border p-1">Arrival</th><th className="border p-1">Departure</th>
                              <th className="border p-1">Arrival</th><th className="border p-1">Departure</th>
                              <th className="border p-1">Hrs</th><th className="border p-1">Min</th>
                          </tr>
                      </thead>
                      <tbody>{rows}</tbody>
                  </table>
                  <p className="text-center text-xs text-gray-400 mt-4 italic">Click on any row to manually edit the record.</p>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
           <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><Clock size={24}/></div>
           <div>
              <h1 className="text-xl font-bold text-gray-900">Attendance System</h1>
              <p className="text-xs text-gray-500">{currentTime.toLocaleString('en-US', { weekday: 'long', month:'long', day:'numeric', hour:'numeric', minute:'numeric', hour12: true })}</p>
           </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg mt-4 md:mt-0">
           <button onClick={()=>setActiveTab('daily')} className={`px-3 py-1.5 rounded text-sm font-bold ${activeTab==='daily'?'bg-white shadow text-emerald-600':'text-gray-500'}`}>Daily</button>
           <button onClick={()=>setActiveTab('weekly')} className={`px-3 py-1.5 rounded text-sm font-bold ${activeTab==='weekly'?'bg-white shadow text-emerald-600':'text-gray-500'}`}>Weekly</button>
           <button onClick={()=>setActiveTab('monthly')} className={`px-3 py-1.5 rounded text-sm font-bold ${activeTab==='monthly'?'bg-white shadow text-emerald-600':'text-gray-500'}`}>Monthly</button>
           <button onClick={()=>setActiveTab('my_dtr')} className={`px-3 py-1.5 rounded text-sm font-bold ${activeTab==='my_dtr'?'bg-white shadow text-emerald-600':'text-gray-500'}`}>My DTR</button>
        </div>
      </div>

      {activeTab === 'daily' && renderDashboardDaily()}
      {activeTab === 'weekly' && renderDashboardWeekly()}
      {activeTab === 'monthly' && renderDashboardMonthly()}
      {activeTab === 'my_dtr' && renderMyDTR()}

      {/* MODAL: LEAVE */}
      {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                  <button onClick={() => setShowLeaveModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h3 className="font-bold text-lg mb-4 flex items-center text-orange-600"><Briefcase size={20} className="mr-2"/> File Leave Application</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Leave Type</label>
                          <select className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm, type: e.target.value})}>
                              <option>Vacation Leave</option><option>Sick Leave</option><option>Maternity Leave</option><option>Paternity Leave</option><option>Special Privilege Leave</option><option>Mandatory Forced Leave</option>
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Start Date</label><input type="date" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={leaveForm.start} onChange={e=>setLeaveForm({...leaveForm, start: e.target.value})}/></div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase">End Date</label><input type="date" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={leaveForm.end} onChange={e=>setLeaveForm({...leaveForm, end: e.target.value})}/></div>
                      </div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Reason</label><input type="text" placeholder="Optional remarks" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm, reason: e.target.value})}/></div>
                      
                      <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 flex items-start">
                         <AlertCircle size={14} className="mt-0.5 mr-1 flex-shrink-0"/>
                         Dates marked will be recorded as LEAVE in the DTR.
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                          <button onClick={()=>setShowLeaveModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold text-sm hover:bg-gray-300">Cancel</button>
                          <button onClick={()=>handleBatchUpdate('LEAVE')} disabled={processing} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold text-sm hover:bg-emerald-700">Submit Application</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: OB */}
      {showOBModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                  <button onClick={() => setShowOBModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h3 className="font-bold text-lg mb-4 flex items-center text-purple-600"><Plane size={20} className="mr-2"/> Official Business (OB)</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Destination / Location</label><input type="text" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={obForm.location} onChange={e=>setObForm({...obForm, location: e.target.value})}/></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-gray-500 uppercase">Start Date</label><input type="date" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={obForm.start} onChange={e=>setObForm({...obForm, start: e.target.value})}/></div>
                          <div><label className="text-xs font-bold text-gray-500 uppercase">End Date</label><input type="date" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={obForm.end} onChange={e=>setObForm({...obForm, end: e.target.value})}/></div>
                      </div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Purpose</label><input type="text" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={obForm.purpose} onChange={e=>setObForm({...obForm, purpose: e.target.value})}/></div>
                      
                      <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 flex items-start">
                         <AlertCircle size={14} className="mt-0.5 mr-1 flex-shrink-0"/>
                         Dates marked will appear as OB in the DTR.
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                          <button onClick={()=>setShowOBModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold text-sm hover:bg-gray-300">Cancel</button>
                          <button onClick={()=>handleBatchUpdate('OB')} disabled={processing} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold text-sm hover:bg-emerald-700">Record O.B.</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: HOLIDAY (DEV ONLY) */}
      {showHolidayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                  <button onClick={() => setShowHolidayModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h3 className="font-bold text-lg mb-4 flex items-center text-red-600"><CalendarPlus size={20} className="mr-2"/> Set Holiday</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Holiday Name</label><input type="text" placeholder="e.g. Rizal Day" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={holidayForm.name} onChange={e=>setHolidayForm({...holidayForm, name: e.target.value})}/></div>
                      <div><label className="text-xs font-bold text-gray-500 uppercase">Date</label><input type="date" className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={holidayForm.date} onChange={e=>setHolidayForm({...holidayForm, date: e.target.value})}/></div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                          <select className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" value={holidayForm.type} onChange={e=>setHolidayForm({...holidayForm, type: e.target.value})}>
                              <option>Regular</option>
                              <option>Special Non-Working</option>
                          </select>
                      </div>
                      
                      {/* NEW: Remarks / Memo No */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase">Remarks / Memorandum No.</label>
                          <input 
                              type="text" 
                              placeholder="e.g. Memo No. 123-2024" 
                              className="w-full border p-2 rounded focus:ring-emerald-500 outline-none bg-white text-gray-900" 
                              value={holidayForm.remarks} 
                              onChange={e=>setHolidayForm({...holidayForm, remarks: e.target.value})}
                          />
                      </div>

                      <div className="bg-red-50 p-3 rounded text-xs text-red-800 flex items-start">
                         <AlertCircle size={14} className="mt-0.5 mr-1 flex-shrink-0"/>
                         This will mark this date as HOLIDAY for ALL employees.
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                          <button onClick={()=>setShowHolidayModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold text-sm hover:bg-gray-300">Cancel</button>
                          <button onClick={handleSaveHoliday} disabled={processing} className="px-4 py-2 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700">Set Holiday</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: HOLIDAY DATABASE LIST */}
      {showHolidayListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800 flex items-center"><List size={20} className="mr-2"/> Holiday Database</h3>
                      <button onClick={() => setShowHolidayListModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="p-0 overflow-y-auto flex-grow">
                      <table className="min-w-full text-sm text-left">
                          <thead className="bg-gray-100 text-gray-600 sticky top-0">
                              <tr>
                                  <th className="p-3">Date</th>
                                  <th className="p-3">Name</th>
                                  <th className="p-3">Type</th>
                                  <th className="p-3">Remarks</th>
                                  <th className="p-3 text-right">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {holidays.length === 0 ? (
                                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">No holidays recorded.</td></tr>
                              ) : (
                                  holidays.sort((a,b) => b.dateString.localeCompare(a.dateString)).map(h => (
                                      <tr key={h.id} className="hover:bg-gray-50">
                                          <td className="p-3 font-mono">{h.dateString}</td>
                                          <td className="p-3 font-bold">{h.name}</td>
                                          <td className="p-3"><span className={`text-[10px] uppercase px-2 py-1 rounded ${h.type === 'Regular' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{h.type}</span></td>
                                          <td className="p-3 text-gray-500 italic">{h.remarks || '-'}</td>
                                          <td className="p-3 text-right">
                                              <button 
                                                  onClick={() => handleDeleteHoliday(h.id)} 
                                                  className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                                  title="Delete Holiday"
                                              >
                                                  <Trash2 size={16}/>
                                              </button>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: MANUAL DTR EDIT */}
      {showEditDTRModal && editingDTR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fadeIn">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                  <button onClick={() => setShowEditDTRModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  <h3 className="font-bold text-lg mb-4 flex items-center text-gray-800">
                      <Edit2 size={20} className="mr-2 text-blue-600"/> 
                      Edit DTR: {new Date(editingDTR.dateString).toLocaleDateString()}
                  </h3>
                  
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">AM Arrival</label>
                              <input 
                                type="time" className="w-full border rounded p-1 text-sm bg-white text-gray-900"
                                value={editingDTR.amIn || ''}
                                onChange={e => setEditingDTR({...editingDTR, amIn: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">AM Departure</label>
                              <input 
                                type="time" className="w-full border rounded p-1 text-sm bg-white text-gray-900"
                                value={editingDTR.amOut || ''}
                                onChange={e => setEditingDTR({...editingDTR, amOut: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PM Arrival</label>
                              <input 
                                type="time" className="w-full border rounded p-1 text-sm bg-white text-gray-900"
                                value={editingDTR.pmIn || ''}
                                onChange={e => setEditingDTR({...editingDTR, pmIn: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PM Departure</label>
                              <input 
                                type="time" className="w-full border rounded p-1 text-sm bg-white text-gray-900"
                                value={editingDTR.pmOut || ''}
                                onChange={e => setEditingDTR({...editingDTR, pmOut: e.target.value})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                          <textarea 
                              className="w-full border border-gray-300 rounded p-2 text-sm bg-white text-gray-900 h-20"
                              placeholder="e.g. Leave, OB, Official Time..."
                              value={editingDTR.remarks || ''}
                              onChange={e => setEditingDTR({...editingDTR, remarks: e.target.value})}
                          />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => setShowEditDTRModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold text-sm hover:bg-gray-300">Cancel</button>
                          <button onClick={handleSaveDTREdit} disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 flex items-center">
                              <Save size={16} className="mr-2"/> Save Changes
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Attendance;
