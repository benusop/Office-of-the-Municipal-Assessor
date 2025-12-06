
import React, { useState, useEffect } from 'react';
import { User, Assessment } from '../types';
import { BARANGAYS, KINDS, CLASSES, STATUSES } from '../constants';
import { addAssessment } from '../services/api';

interface AddAssessmentProps {
  user: User;
  onSuccess: () => void;
}

interface FormInputProps {
  label: string;
  name: keyof Assessment;
  type?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  value?: string | number;
}

const REVISION_MAP: Record<string, string> = {
  '1995': 'A',
  '2017': 'B',
  '2028': 'C',
};

const AddAssessment: React.FC<AddAssessmentProps> = ({ user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // TD Number Construction State
  const [revisionYear, setRevisionYear] = useState('2017'); 
  const [tdSuffix, setTdSuffix] = useState(''); // The 4 digit number

  const [formData, setFormData] = useState<Partial<Assessment>>({
    td_Number: '', 
    td_Status: 'Taxable',
    td_Effectivity: new Date().getFullYear(),
    assessed_Value: 0,
    market_Value: 0,
    land_Area: 0,
    tax_Due: 0,
    td_Kind: 'Land', // Default
    td_Class: 'Residential', // Default
    td_barangay: BARANGAYS[0] // Default to Poblacion (01)
  });

  // --- AUTO-CONSTRUCT TD NUMBER ---
  useEffect(() => {
    // 1. Get GR Code (A, B, C)
    const grCode = REVISION_MAP[revisionYear] || 'B';

    // 2. Get Barangay Code (01-12)
    // We assume BARANGAYS array order matches the codes: 0=Poblacion(01), 11=Linandangan(12)
    const brgyIndex = BARANGAYS.indexOf(formData.td_barangay || '');
    const brgyCode = (brgyIndex + 1).toString().padStart(2, '0');

    // 3. Construct Full String: GR-BRGYXXXX (No dash after Brgy)
    const fullTd = `${grCode}-${brgyCode}${tdSuffix}`;

    setFormData(prev => ({ ...prev, td_Number: fullTd }));
  }, [revisionYear, formData.td_barangay, tdSuffix]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow numbers and max 4 chars
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      setTdSuffix(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (tdSuffix.length !== 4) {
        alert("Please enter a complete 4-digit TD series number.");
        return;
    }

    setLoading(true);
    
    try {
      const payload: Omit<Assessment, 'id' | 'comments'> = {
        td_Number: formData.td_Number || '',
        owner_name: formData.owner_name || '',
        td_barangay: formData.td_barangay || '',
        lot_No: formData.lot_No || '',
        title_No: formData.title_No || '',
        td_Kind: (formData.td_Kind as Assessment['td_Kind']) || 'Land',
        td_Class: (formData.td_Class as Assessment['td_Class']) || 'Others',
        land_Area: formData.land_Area || 0,
        market_Value: formData.market_Value || 0,
        assessed_Value: formData.assessed_Value || 0,
        tax_Due: formData.tax_Due || 0,
        td_Effectivity: formData.td_Effectivity || new Date().getFullYear(),
        td_Previous: formData.td_Previous || '',
        td_Cancelled: formData.td_Cancelled || '',
        td_Status: (formData.td_Status as Assessment['td_Status']) || 'Taxable',
        
        createdBy: {
          userId: user.id,
          name: user.name
        }
      };

      await addAssessment(payload);
      alert(`Assessment Record (${payload.td_Number}) Added Successfully!`);
      onSuccess(); 
    } catch (error) {
      alert('Failed to save record.');
    } finally {
      setLoading(false);
    }
  };

  // Derived values for display
  const currentGrCode = REVISION_MAP[revisionYear];
  const currentBrgyIndex = BARANGAYS.indexOf(formData.td_barangay || '');
  const currentBrgyCode = (currentBrgyIndex + 1).toString().padStart(2, '0');

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
      <div className="mb-6 pb-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Add New Assessment</h1>
        <p className="text-gray-500">New Tax Declaration Record Entry</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* STEP 1: INITIAL SETUP (Kind -> Revision -> Location) */}
        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
            <h3 className="text-sm font-bold uppercase text-emerald-800 mb-4 tracking-wider flex items-center">
                <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">1</span>
                Property Setup & TD Construction
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. KIND */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Property Kind</label>
                    <select 
                        name="td_Kind" 
                        className="w-full border-gray-300 rounded-md shadow-sm p-3 border bg-white text-gray-900 font-medium focus:ring-emerald-500 focus:border-emerald-500" 
                        required 
                        onChange={handleChange} 
                        value={formData.td_Kind}
                    >
                        {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>

                {/* 2. REVISION YEAR */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">General Revision (GR)</label>
                    <div className="relative">
                        <select 
                            value={revisionYear} 
                            onChange={(e) => setRevisionYear(e.target.value)}
                            className="w-full border-gray-300 rounded-md shadow-sm p-3 border bg-white text-gray-900 font-medium focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="1995">GR 1995 (Code A)</option>
                            <option value="2017">GR 2017 (Code B)</option>
                            <option value="2028">GR 2028 (Code C)</option>
                        </select>
                        <div className="absolute right-3 top-3 bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded">
                            Code: {currentGrCode}
                        </div>
                    </div>
                </div>

                {/* 3. BARANGAY */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location (Barangay)</label>
                    <div className="relative">
                        <select 
                            name="td_barangay" 
                            className="w-full border-gray-300 rounded-md shadow-sm p-3 border bg-white text-gray-900 font-medium focus:ring-emerald-500 focus:border-emerald-500" 
                            required 
                            onChange={handleChange} 
                            value={formData.td_barangay}
                        >
                            {BARANGAYS.map((b, idx) => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <div className="absolute right-3 top-3 bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded">
                            Code: {currentBrgyCode}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. TD NUMBER DISPLAY */}
            <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200 shadow-inner flex flex-col md:flex-row items-center justify-center gap-4">
                <div className="text-gray-500 text-sm font-medium">Generated TD Number:</div>
                <div className="flex items-center">
                    <div className="bg-gray-100 border border-gray-300 text-gray-500 font-mono text-2xl font-bold px-3 py-2 rounded-l-lg border-r-0 select-none">
                        {currentGrCode}-{currentBrgyCode}
                    </div>
                    <input 
                        type="text"
                        placeholder="0000"
                        maxLength={4}
                        value={tdSuffix}
                        onChange={handleSuffixChange}
                        className="w-32 bg-white border border-gray-300 text-gray-900 font-mono text-2xl font-bold px-3 py-2 rounded-r-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none tracking-widest text-center"
                        autoFocus
                    />
                </div>
                {tdSuffix.length < 4 && <div className="text-red-500 text-xs font-bold animate-pulse">Enter 4 digits</div>}
            </div>
        </div>

        {/* STEP 2: DETAILS */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold uppercase text-gray-800 mb-4 tracking-wider flex items-center">
             <span className="bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">2</span>
             Owner & Property Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             <FormInput 
                label="Owner Name" 
                name="owner_name" 
                required 
                onChange={handleChange} 
                value={formData.owner_name}
                placeholder="Last Name, First Name M.I."
            />
            <FormInput 
                label="Effectivity Year" 
                name="td_Effectivity" 
                type="number" 
                required 
                onChange={handleChange} 
                value={formData.td_Effectivity} 
            />
             <FormInput label="Lot Number" name="lot_No" required onChange={handleChange} value={formData.lot_No} />
             <FormInput label="Title Number" name="title_No" required onChange={handleChange} value={formData.title_No} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Classification</label>
              <select name="td_Class" className="w-full border-gray-300 rounded-md shadow-sm p-2 border bg-white text-gray-900" required onChange={handleChange} value={formData.td_Class}>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
             <FormInput label="Area (Hectares)" name="land_Area" type="number" step="0.0001" required onChange={handleChange} value={formData.land_Area} />
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
              <select name="td_Status" className="w-full border-gray-300 rounded-md shadow-sm p-2 border bg-white text-gray-900" required onChange={handleChange} value={formData.td_Status}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* STEP 3: VALUATION */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold uppercase text-gray-800 mb-4 tracking-wider flex items-center">
             <span className="bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">3</span>
             Valuation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <FormInput label="Market Value (₱)" name="market_Value" type="number" required onChange={handleChange} value={formData.market_Value} />
             <FormInput label="Assessed Value (₱)" name="assessed_Value" type="number" required onChange={handleChange} value={formData.assessed_Value} />
             <FormInput label="Tax Due (₱)" name="tax_Due" type="number" required onChange={handleChange} value={formData.tax_Due} />
          </div>
        </div>

        {/* STEP 4: OPTIONAL META */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold uppercase text-gray-800 mb-4 tracking-wider flex items-center">
             <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">4</span>
             Optional Meta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Previous TD (Optional)" name="td_Previous" onChange={handleChange} value={formData.td_Previous} />
            <FormInput label="Cancelled By (Optional)" name="td_Cancelled" onChange={handleChange} value={formData.td_Cancelled} />
          </div>
        </div>

        <div className="flex justify-end pt-4">
            <button 
                type="submit" 
                disabled={loading || tdSuffix.length !== 4}
                className={`px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 hover:-translate-y-1 transition-all transform ${loading || tdSuffix.length !== 4 ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
            >
                {loading ? 'Saving Record...' : 'Save Assessment Record'}
            </button>
        </div>
      </form>
    </div>
  );
};

const FormInput: React.FC<FormInputProps> = ({ label, name, type = "text", required, step, onChange, value, placeholder }) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
        <input 
            type={type} 
            name={name} 
            required={required} 
            step={step}
            onChange={onChange}
            value={value}
            placeholder={placeholder}
            className="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500 bg-white text-gray-900"
        />
    </div>
);

export default AddAssessment;
