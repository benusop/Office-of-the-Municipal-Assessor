

export const BARANGAYS = [
  'Poblacion', 'Bagoenged', 'Buliok', 'Dalgan', 'Damalasak', 'Galakit', 
  'Inug-ug', 'Kalbugan', 'Kilangan', 'Kudal', 'Layog', 'Linandangan'
];

export const KINDS = ['Land', 'Building', 'Machinery'];

export const CLASSES = [
  'Residential', 'Agricultural', 'Commercial', 'Industrial', 'Mineral', 
  'Timberland', 'Government', 'Educational', 'Religious', 'Others'
];

export const STATUSES = [
  'Taxable', 'Cancelled', 'Exempt', 'Duplicate', 'No Data', 'Others'
];

export const CERTIFYING_OFFICERS = [
  { name: 'Maqdoum T. Mamogcat', position: 'LAOO III' },
  { name: 'Al-Benladin A. Hadji Usop', position: 'Tax Mapper II' },
  { name: 'Vilma S. Timan', position: 'Book Binder III' },
  { name: 'Norhan G. Dalos', position: 'Assessment Clerk I' },
  { name: 'Debora P. Maongko', position: 'Adm. Asst. V' },
  { name: 'Mustapha D. Lintongan', position: 'Adm. Asst. II' },
  { name: 'Bert P. Ayunan', position: 'Adm. Aid V' }
];

export const VALID_IDS = [
  'PhilSys ID (National ID)',
  'Passport',
  "Driver's License",
  'UMID',
  'PRC ID',
  'Voter\'s ID / Certification',
  'TIN ID',
  'PhilHealth ID',
  'Postal ID',
  'Senior Citizen ID',
  'PWD ID',
  'Solo Parent ID',
  'Pantawid Pamilya (4Ps) ID',
  'Barangay ID',
  'Student ID (Current)',
  'Employee/Company ID',
  'Others'
];

export const ASSESSOR_TRANSACTIONS = [
  'Issuance of Tax Declaration (Certified Copy)',
  'Certificate of No Improvement',
  'Certificate of Land Holdings',
  'Certificate of Property Holdings',
  'Verification of Property Location',
  'Transfer of Ownership',
  'Re-assessment / Revision',
  'Cancellation of Assessment',
  'Submission of Sworn Statement',
  'Annotation of Mortgage/Bailbond',
  'Payment Verification',
  'Research / Inquiry',
  'Others'
];

// Employee Credentials for Login System
// Roles: 
// DEVELOPER: Tax Mapper II, Municipal Assessor, Provincial Personnel
// MODERATOR: Everyone else
export const STAFF_CREDENTIALS = [
  // Developers
  { id: 'emp_005', name: 'Al-Benladin A. Hadji Usop', position: 'Tax Mapper II', password: 'admin', initials: 'AH', role: 'DEVELOPER' },
  { id: 'emp_003', name: 'Estrella C. Serna, MPS', position: 'Municipal Assessor', password: 'mun', initials: 'ES', role: 'DEVELOPER' },
  { id: 'prov_01', name: 'Provincial Personnel', position: 'Provincial Staff', password: 'admin', initials: 'PP', role: 'DEVELOPER' },
  
  // Moderators
  { id: 'emp_002', name: 'Sadruddin A. Masukat, REA', position: 'Provincial Assessor', password: 'prov', initials: 'SM', role: 'MODERATOR' },
  { id: 'emp_004', name: 'Maqdoum T. Mamogcat', position: 'LAOO III', password: 'laoo', initials: 'MM', role: 'MODERATOR' },
  { id: 'emp_006', name: 'Vilma S. Timan', position: 'Book Binder III', password: 'binder', initials: 'VT', role: 'MODERATOR' },
  { id: 'emp_007', name: 'Norhan G. Dalos', position: 'Assessment Clerk I', password: 'clerk', initials: 'ND', role: 'MODERATOR' },
  { id: 'emp_008', name: 'Debora P. Maongko', position: 'Adm. Asst. V', password: 'admin5', initials: 'DM', role: 'MODERATOR' },
  { id: 'emp_009', name: 'Mustapha D. Lintongan', position: 'Adm. Asst. II', password: 'admin2', initials: 'ML', role: 'MODERATOR' },
  { id: 'emp_010', name: 'Bert P. Ayunan', position: 'Adm. Aid V', password: 'aid5', initials: 'BA', role: 'MODERATOR' },
  { id: 'emp_011', name: 'Gutan M. Malingco', position: 'Casual', password: 'casual', initials: 'GM', role: 'MODERATOR' },
  { id: 'emp_012', name: 'Al-Micdad L. Mohammad', position: 'Casual', password: 'casual', initials: 'AM', role: 'MODERATOR' },
];

export const COLORS = {
  primary: '#059669', // Emerald 600
  secondary: '#DC2626', // Red 600
  neutral: '#F3F4F6', // Gray 100
  charts: {
    primary: '#059669',
    secondary: '#EAB308', // Yellow
    tertiary: '#DC2626',
    quaternary: '#3B82F6', // Blue
    quinary: '#8B5CF6', // Purple
  }
};
