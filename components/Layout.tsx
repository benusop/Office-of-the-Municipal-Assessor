
import React, { useState, useEffect } from 'react';
import { 
  Search, LogIn, LogOut, 
  LayoutDashboard, ScrollText, FilePlus, Info, Shield, LucideIcon, Menu, X, Clock,
  Users, FileBadge, ArrowRightLeft, FileBarChart
} from 'lucide-react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface DesktopDockItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  restricted?: boolean;
  isActive: boolean;
  onClick: (path: string) => void;
  color?: string;
}

const DesktopDockItem: React.FC<DesktopDockItemProps> = ({ icon: Icon, label, path, restricted, isActive, onClick, color }) => {
  if (restricted) return null;
  
  return (
    <button
      onClick={() => onClick(path)}
      className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex-shrink-0
        ${isActive 
          ? 'bg-emerald-100 text-emerald-600 shadow-lg' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-emerald-600 hover:shadow-md'
        }`}
    >
      <Icon size={22} className={color && !isActive ? color : ''} />
      
      {/* Tooltip Label (Right side) */}
      <span className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl transform -translate-x-2 group-hover:translate-x-0 z-50">
        {label}
        {/* Arrow */}
        <span className="absolute top-1/2 -left-1 -mt-1 border-4 border-transparent border-r-gray-900"></span>
      </span>
      
      {/* Active Indicator (Dot) */}
      {isActive && (
        <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm"></span>
      )}
    </button>
  );
};

interface MobileMenuItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  restricted?: boolean;
  index: number;
  isActive: boolean;
  onClick: (path: string) => void;
}

const MobileMenuItem: React.FC<MobileMenuItemProps> = ({ icon: Icon, label, path, restricted, index, isActive, onClick }) => {
  if (restricted) return null;

  return (
    <button
      onClick={() => onClick(path)}
      style={{ transitionDelay: `${index * 50}ms` }}
      className={`flex items-center gap-3 p-3 w-full rounded-xl transition-all duration-300 transform
        ${isActive ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}
      `}
    >
      <div className={`p-2 rounded-full ${isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100'}`}>
        <Icon size={20} />
      </div>
      <span className="text-sm">{label}</span>
    </button>
  );
};

const LiveClock = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex flex-col items-end mr-6 border-r border-gray-200 pr-6">
      <div className="text-lg font-bold text-gray-900 font-mono leading-none">
        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">
        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ 
  children, user, onLoginClick, onLogoutClick, currentPath, onNavigate 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const canAccessAdd = (role?: UserRole) => ['MODERATOR', 'OPERATOR', 'DEVELOPER'].includes(role || '');
  const canAccessDev = (role?: UserRole) => role === 'DEVELOPER';

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: ScrollText, label: "Tax Roll", path: "/tax-roll" },
    { icon: FilePlus, label: "Add Assessment", path: "/add", restricted: canAccessAdd(user?.role) === false },
    { icon: Clock, label: "Attendance", path: "/attendance", restricted: !user },
    
    // Office Management Modules
    { icon: Users, label: "Visitor Log", path: "/visitor-log", restricted: !user, color: "text-blue-400" },
    { icon: FileBadge, label: "Certifications", path: "/certifications", restricted: !user, color: "text-emerald-400" },
    { icon: ArrowRightLeft, label: "Transactions", path: "/transactions", restricted: !user, color: "text-purple-400" },
    
    // Combined Reports
    { icon: FileBarChart, label: "Reports", path: "/reports", restricted: !user, color: "text-orange-400" },

    { icon: Shield, label: "Developer", path: "/developer", restricted: canAccessDev(user?.role) === false },
    { icon: Info, label: "About", path: "/about" },
  ];

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative font-sans">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo Section */}
            <div className="flex-shrink-0 flex items-center cursor-pointer group" onClick={() => onNavigate('/')}>
              <div className="relative flex items-center justify-center w-12 h-12 mr-3 transform group-hover:scale-105 transition-transform duration-300">
                <img 
                  src="https://lh3.googleusercontent.com/d/1S7VKW-nIhOwDLDZOXDXgX9w6gCw2OR09" 
                  alt="LGU Pagalungan Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 text-sm md:text-base leading-tight tracking-tight">
                  Office of the Municipal Assessor
                </span>
                <span className="text-emerald-600 text-[10px] font-extrabold uppercase tracking-widest">
                  Pagalungan
                </span>
              </div>
            </div>

            {/* Right Side: Clock, Auth, Menu */}
            <div className="flex items-center gap-4">
              
              {/* Added Live Clock Component */}
              <LiveClock />

              {user ? (
                <div className="flex items-center gap-3 pl-4 md:border-l md:border-gray-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                    <p className="text-xs text-emerald-600 font-medium">{user.position}</p>
                  </div>
                  <button 
                    onClick={onLogoutClick}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={onLoginClick}
                  className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm shadow-sm transition-all hover:shadow-md"
                >
                  <LogIn size={18} className="mr-2" />
                  Staff Login
                </button>
              )}

              <button 
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        
        {/* Desktop Dock (Sidebar) - Added z-30 to stack above standard content */}
        <aside className="hidden md:flex flex-col gap-4 sticky top-24 h-fit z-30">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1">
            {menuItems.map((item) => (
              <DesktopDockItem
                key={item.path}
                {...item}
                isActive={currentPath === item.path}
                onClick={handleNavigate}
              />
            ))}
          </div>
        </aside>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-xl z-30 p-4 animate-fadeIn max-h-[85vh] overflow-y-auto">
             <div className="space-y-1">
                {menuItems.map((item, idx) => (
                  <MobileMenuItem
                    key={item.path}
                    {...item}
                    index={idx}
                    isActive={currentPath === item.path}
                    onClick={handleNavigate}
                  />
                ))}
             </div>
             {user && (
               <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.position}</p>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-grow min-w-0">
           {children}
        </main>
      </div>
      
    </div>
  );
};

export default Layout;
