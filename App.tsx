
import React, { useState, useEffect } from 'react';
import { Assessment, User } from './types';
import { getAssessments, login, logout, getCurrentUser } from './services/api';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TaxRoll from './pages/TaxRoll';
import AddAssessment from './pages/AddAssessment';
import About from './pages/About';
import DeveloperPanel from './pages/DeveloperPanel';
import Attendance from './pages/Attendance';
import OfficeManagement from './pages/OfficeManagement';
import VisitorLogbook from './pages/VisitorLogbook'; // Import new component
import { LogIn, X, Loader2, User as UserIcon, Lock, ArrowLeft } from 'lucide-react';
import { STAFF_CREDENTIALS } from './constants';

const App: React.FC = () => {
  // Navigation State (Simple Router)
  const [currentPath, setCurrentPath] = useState('/');
  
  // Data State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getAssessments();
      setAssessments(data);
    } catch (error) {
      console.error("Failed to load assessments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !passwordInput) return;
    
    setIsLoggingIn(true);
    setLoginError('');

    const userData = await login(selectedStaffId, passwordInput);
    
    if (userData) {
      setUser(userData);
      setIsLoginOpen(false);
      resetLoginState();
    } else {
      setLoginError('Incorrect password. Please try again.');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setCurrentPath('/');
  };

  const resetLoginState = () => {
    setSelectedStaffId(null);
    setPasswordInput('');
    setLoginError('');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
          <p className="text-gray-500 font-medium">Loading Assessment Records...</p>
        </div>
      );
    }

    switch(currentPath) {
      case '/': 
        return <Dashboard assessments={assessments} />;
      case '/tax-roll':
        return <TaxRoll assessments={assessments} user={user} onDataChange={fetchData} />;
      case '/add':
        if (!user || !['MODERATOR', 'OPERATOR', 'DEVELOPER'].includes(user.role)) return <AccessDenied />;
        return <AddAssessment user={user} onSuccess={() => { setCurrentPath('/tax-roll'); fetchData(); }} />;
      case '/developer':
        if (user?.role !== 'DEVELOPER') return <AccessDenied />;
        return <DeveloperPanel />;
      case '/attendance':
        if (!user) return <AccessDenied />;
        return <Attendance user={user} />;
      
      // Office Management Routes
      case '/visitor-log':
        if (!user) return <AccessDenied />;
        // --- CHANGE: Use VisitorLogbook component ---
        return <VisitorLogbook user={user} />; 
      case '/certifications':
        if (!user) return <AccessDenied />;
        // --- CHANGE: OfficeManagement handles these views ---
        return <OfficeManagement user={user} view="CERTIFICATION" />;
      case '/transactions':
        if (!user) return <AccessDenied />;
        return <OfficeManagement user={user} view="TRANSACTION" />;
      case '/reports':
        if (!user) return <AccessDenied />;
        return <OfficeManagement user={user} view="REPORTS" />;

      case '/about':
        return <About />;
      default:
        return <Dashboard assessments={assessments} />;
    }
  };

  const selectedStaffMember = STAFF_CREDENTIALS.find(s => s.id === selectedStaffId);

  return (
    <Layout 
      user={user} 
      onLoginClick={() => { setIsLoginOpen(true); resetLoginState(); }} 
      onLogoutClick={handleLogout}
      currentPath={currentPath}
      onNavigate={setCurrentPath}
    >
      {renderContent()}

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden relative flex flex-col max-h-[90vh]">
            
            <button onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
              <X size={24} />
            </button>

            {/* Header */}
            <div className="bg-emerald-600 p-6 text-white text-center flex-shrink-0">
              <LogIn className="mx-auto mb-2" size={40} />
              <h2 className="text-2xl font-bold">Staff Portal</h2>
              <p className="text-emerald-100">Select your account to sign in</p>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
              
              {!selectedStaffId ? (
                // VIEW 1: STAFF GRID
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {STAFF_CREDENTIALS.map((staff) => (
                    <button 
                      key={staff.id}
                      onClick={() => setSelectedStaffId(staff.id)}
                      className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md transition-all group"
                    >
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500 mb-3 group-hover:bg-emerald-200 group-hover:text-emerald-700 transition-colors">
                        {staff.initials}
                      </div>
                      <div className="text-center">
                        <h3 className="font-bold text-gray-900 text-sm">{staff.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{staff.position}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                // VIEW 2: PASSWORD ENTRY
                <div className="max-w-md mx-auto">
                  <button 
                    onClick={() => { setSelectedStaffId(null); setLoginError(''); }}
                    className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                  >
                    <ArrowLeft size={18} className="mr-1" />
                    Back to Directory
                  </button>

                  <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                      {selectedStaffMember?.initials}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedStaffMember?.name}</h3>
                    <p className="text-gray-500">{selectedStaffMember?.position}</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Enter Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                          type="password" 
                          required
                          autoFocus
                          placeholder="Password"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white text-gray-900"
                          value={passwordInput}
                          onChange={e => setPasswordInput(e.target.value)}
                        />
                      </div>
                      {loginError && (
                        <p className="text-red-500 text-sm mt-2 flex items-center">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                          {loginError}
                        </p>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      disabled={isLoggingIn}
                      className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingIn ? 'Verifying...' : 'Unlock Account'}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-red-500 mb-4 bg-red-50 p-6 rounded-full">
            <X size={48} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
        <p className="text-gray-500 max-w-md">You do not have permission to view this page. Please log in with an authorized account.</p>
    </div>
);

export default App;
