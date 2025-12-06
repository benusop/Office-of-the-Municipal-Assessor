
export type UserRole = 'GUEST' | 'OPERATOR' | 'MODERATOR' | 'DEVELOPER';

export interface User {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
  position?: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorId?: string; // If logged in
  contactInfo?: string;
  text: string;
  timestamp: number;
  isDeveloperReply: boolean;
  parentId?: string; // For replies
}

export interface Assessment {
  id: string;
  // Identifiers
  td_Number: string;
  owner_name: string;
  td_barangay: string;
  lot_No: string;
  title_No: string;
  
  // Classification
  td_Kind: 'Land' | 'Building' | 'Machinery';
  td_Class: 'Residential' | 'Agricultural' | 'Commercial' | 'Industrial' | 'Mineral' | 'Timberland' | 'Government' | 'Educational' | 'Religious' | 'Others';
  
  // Values
  land_Area: number; // Hectares
  market_Value: number;
  assessed_Value: number;
  tax_Due: number;
  
  // Meta
  td_Effectivity: number; // Year
  td_Previous: string;
  td_Cancelled: string;
  td_Status: 'Taxable' | 'Cancelled' | 'Exempt' | 'Duplicate' | 'No Data' | 'Others';
  
  // System
  createdBy: {
    userId: string;
    name: string;
  };
  comments: Comment[];
}

export interface DTRRecord {
  id: string; // Format: YYYY-MM-DD_staffId
  staffId: string;
  staffName: string;
  dateString: string; // YYYY-MM-DD
  amIn: string; // HH:mm
  amOut: string; // HH:mm (Auto 12:00)
  pmIn: string; // HH:mm
  pmOut: string; // HH:mm (Auto 17:00)
  remarks: string;
  isHoliday: string; // "true" or "false"
}

export interface Holiday {
  id: string;
  dateString: string; // YYYY-MM-DD
  name: string;
  type: 'Regular' | 'Special Non-Working';
  remarks?: string; // For Memorandum No.
}

export interface AttendanceLog {
  id: string;
  staffId: string;
  staffName: string;
  action: 'TIME_IN' | 'TIME_OUT';
  timestamp: number;
  dateString: string;
}

export interface VisitorRecord {
  id: string;
  dateString: string;
  lastName: string;
  firstName: string;
  middleInitial: string;
  affiliation: string; // Organization or Barangay
  contactNum: string;
  email?: string;
  idPresented: string; // Type of ID
  idNumber: string; // ID Number
  purpose: string;
  timeIn: string; // HH:mm AM/PM
  timeOut: string; // HH:mm AM/PM
  status: 'ACTIVE' | 'COMPLETED' | 'DELETED';
  recordedBy?: string; // Staff name who added the entry
}

// Chart Data Types
export interface ChartData {
  name: string;
  value: number;
}
