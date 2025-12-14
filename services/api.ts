import { Assessment, User, UserRole, DTRRecord, Holiday, VisitorRecord, Transaction } from '../types';
import { STAFF_CREDENTIALS } from '../constants';

// --- CONFIGURATION ---

// Google Apps Script Web App URL
// Ensure this matches your latest deployment ID from Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxms8UEGMmSZqbmjM1y1B8z_w-3XCDnNolrOwf2iGvDmgZfp_GyTNvuwZZ2Y6sCNpWk/exec';

// LocalStorage Keys (Only for Session persistence, not Data persistence)
const CURRENT_USER_KEY = 'pagalungan_current_user';

// Sheet Name Constants
const SHEET_NAMES = {
  ASSESSMENTS: 'Assessments', 
  ATTENDANCE: 'Attendance',
  HOLIDAYS: 'Holidays',
  VISITOR_LOG: 'VisitorLog',
  TRANSACTIONS: 'Transactions'
};

// --- HELPERS ---

/**
 * Generic fetch wrapper for Google Apps Script Web App
 */
const fetchGoogleScript = async (action: string, sheet: string, data?: any) => {
  if (!GOOGLE_SCRIPT_URL) {
    console.error("Google Script URL is not configured.");
    throw new Error("API Configuration Error");
  }

  try {
    let url = `${GOOGLE_SCRIPT_URL}`;
    const options: RequestInit = {
      redirect: "follow",
      cache: "no-store", // CRITICAL: Forces browser/Vercel to never cache the response
    };

    if (action === 'read') {
      // GET Request
      // CACHE BUSTER: Add _t timestamp to prevent Vercel/Browser caching
      url += `?action=read&sheet=${sheet}&_t=${new Date().getTime()}`;
      options.method = 'GET';
    } else {
      // POST Request (Create/Update/Delete)
      options.method = 'POST';
      options.body = JSON.stringify({
        action,
        sheet,
        data
      });
      // Content-Type is intentionally omitted to avoid CORS Preflight (OPTIONS) issues with GAS
    }

    const response = await fetch(url, options);
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (action === 'read') return []; // Return empty if response is invalid HTML
      throw new Error("Invalid API response format");
    }

    const json = await response.json();

    if (json.status === 'error') {
      console.error(`[API Error] Sheet: ${sheet}`, json.message);
      // Return empty array for read operations on missing sheets to prevent app crash
      if (action === 'read') return []; 
      throw new Error(json.message);
    }

    return json.data;
  } catch (error) {
    console.error(`API Network Error (${action} on ${sheet}):`, error);
    // STRICT MODE: Do not return mock data. Return empty or throw.
    if (action === 'read') return [];
    throw error;
  }
};

const parseJSON = (str: unknown, fallback: unknown) => {
  if (!str) return fallback;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

const parseNumber = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// --- AUTH SERVICES ---

export const getAllUsers = async (): Promise<User[]> => {
  // Returns hardcoded staff credentials for the Directory
  return STAFF_CREDENTIALS.map(staff => ({
    id: staff.id,
    name: staff.name,
    email: `${staff.initials.toLowerCase()}@pagalungan.gov.ph`,
    role: staff.role as UserRole,
    position: staff.position
  }));
};

export const login = async (staffId: string, password: string): Promise<User | null> => {
  const staff = STAFF_CREDENTIALS.find(s => s.id === staffId && s.password === password);
  if (staff) {
    const user: User = {
      id: staff.id,
      name: staff.name,
      email: `${staff.initials.toLowerCase()}@pagalungan.gov.ph`,
      role: staff.role as UserRole,
      position: staff.position
    };
    // We persist the session to localStorage so refresh doesn't logout the user
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = async () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const updateUserRole = async (userId: string, role: UserRole) => {
  console.log(`Role update for ${userId} to ${role}`);
  return true;
};

// --- ASSESSMENT SERVICES ---

export const getAssessments = async (): Promise<Assessment[]> => {
  const rawData = await fetchGoogleScript('read', SHEET_NAMES.ASSESSMENTS);
  
  if (!Array.isArray(rawData)) return [];

  return rawData.map((item: any) => ({
    id: String(item.id),
    td_Number: item.td_Number,
    owner_name: item.owner_name,
    td_barangay: item.td_barangay,
    lot_No: item.lot_No,
    title_No: item.title_No,
    td_Kind: item.td_Kind,
    td_Class: item.td_Class,
    land_Area: parseNumber(item.land_Area),
    market_Value: parseNumber(item.market_Value),
    assessed_Value: parseNumber(item.assessed_Value),
    tax_Due: parseNumber(item.tax_Due),
    td_Effectivity: parseNumber(item.td_Effectivity),
    td_Previous: item.td_Previous,
    td_Cancelled: item.td_Cancelled,
    td_Status: item.td_Status,
    createdBy: parseJSON(item.createdBy, { userId: 'system', name: 'System' }),
    comments: parseJSON(item.comments, [])
  }));
};

export const addAssessment = async (assessment: Omit<Assessment, 'id' | 'comments'>) => {
  const newId = Date.now().toString();
  const newRecord = {
    ...assessment,
    id: newId,
    comments: [],
    // Stringify objects before sending to Google Sheets
    createdBy: JSON.stringify(assessment.createdBy), 
  };
  
  const payload = {
    ...newRecord,
    comments: '[]'
  };

  await fetchGoogleScript('create', SHEET_NAMES.ASSESSMENTS, payload);
  return newRecord;
};

export const updateAssessment = async (id: string, updates: Partial<Assessment>) => {
  const payload: any = { ...updates, id };
  
  if (updates.createdBy) payload.createdBy = JSON.stringify(updates.createdBy);
  if (updates.comments) payload.comments = JSON.stringify(updates.comments);

  await fetchGoogleScript('update', SHEET_NAMES.ASSESSMENTS, payload);
};

// --- DTR SERVICES ---

export const getDTRLogs = async (): Promise<DTRRecord[]> => {
  const data = await fetchGoogleScript('read', SHEET_NAMES.ATTENDANCE);
  return Array.isArray(data) ? data : [];
};

export const saveDTRRecord = async (record: DTRRecord) => {
  const allRecords = await getDTRLogs();
  const exists = allRecords.find(r => String(r.id) === String(record.id));

  if (exists) {
    await fetchGoogleScript('update', SHEET_NAMES.ATTENDANCE, record);
  } else {
    await fetchGoogleScript('create', SHEET_NAMES.ATTENDANCE, record);
  }
};

// --- HOLIDAY SERVICES ---

export const getHolidays = async (): Promise<Holiday[]> => {
  const data = await fetchGoogleScript('read', SHEET_NAMES.HOLIDAYS);
  return Array.isArray(data) ? data : [];
};

export const saveHoliday = async (holiday: Holiday) => {
  await fetchGoogleScript('create', SHEET_NAMES.HOLIDAYS, holiday);
};

export const deleteHoliday = async (id: string) => {
  await fetchGoogleScript('delete', SHEET_NAMES.HOLIDAYS, { id: String(id) });
};

// --- VISITOR SERVICES ---

export const getVisitorLogs = async (): Promise<VisitorRecord[]> => {
  const data = await fetchGoogleScript('read', SHEET_NAMES.VISITOR_LOG);
  return Array.isArray(data) ? data : [];
};

export const addVisitorLog = async (visitor: VisitorRecord) => {
  await fetchGoogleScript('create', SHEET_NAMES.VISITOR_LOG, visitor);
};

export const updateVisitorLog = async (id: string, updates: Partial<VisitorRecord>) => {
  // Ensure ID is a string to prevent numeric misinterpretation by Google Sheets
  await fetchGoogleScript('update', SHEET_NAMES.VISITOR_LOG, { ...updates, id: String(id) });
};

export const deleteVisitorLog = async (id: string) => {
  // Uses 'delete' action to physically remove row. 
  // Requires backend to support action='delete' by finding the row with matching ID.
  await fetchGoogleScript('delete', SHEET_NAMES.VISITOR_LOG, { id: String(id) });
};

// --- TRANSACTION SERVICES ---

export const getTransactions = async (): Promise<Transaction[]> => {
  const rawData = await fetchGoogleScript('read', SHEET_NAMES.TRANSACTIONS);
  if (!Array.isArray(rawData)) return [];

  return rawData.map((item: any) => ({
    ...item,
    tags: parseJSON(item.tags, []),
    updates: parseJSON(item.updates, []),
    lastUpdated: parseNumber(item.lastUpdated),
    isDeleted: item.isDeleted === true || item.isDeleted === 'true'
  }));
};

export const saveTransaction = async (transaction: Transaction) => {
  const payload = {
    ...transaction,
    tags: JSON.stringify(transaction.tags),
    updates: JSON.stringify(transaction.updates)
  };
  
  const all = await getTransactions();
  const exists = all.find(t => t.id === transaction.id);
  
  if (exists) {
    await fetchGoogleScript('update', SHEET_NAMES.TRANSACTIONS, payload);
  } else {
    await fetchGoogleScript('create', SHEET_NAMES.TRANSACTIONS, payload);
  }
};