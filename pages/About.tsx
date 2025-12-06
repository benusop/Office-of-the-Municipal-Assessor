
import React from 'react';

const About: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 mb-16">
      
      {/* Introduction */}
      <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Office of the Municipal Assessor – Pagalungan</h1>
        <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
          The Office of the Municipal Assessor system is a centralized digital platform designed to modernize the operations of Pagalungan. 
          It streamlines the management of tax declarations, provides real-time insights into property assessments, and ensures transparent access 
          to public records while maintaining data integrity through role-based security.
        </p>
      </section>

      {/* MVG Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-600 text-white p-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition duration-300">
          <h2 className="text-2xl font-bold mb-4">Mission</h2>
          <p className="opacity-90 leading-relaxed">To provide accurate, fair, and efficient real property assessment services that support the financial stability and development of Pagalungan.</p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-emerald-600 transform hover:-translate-y-1 transition duration-300">
          <h2 className="text-2xl font-bold text-emerald-800 mb-4">Vision</h2>
          <p className="text-gray-600 leading-relaxed">A model Municipal Assessor’s Office characterized by digital innovation, professional integrity, and excellent public service.</p>
        </div>
        <div className="bg-gray-800 text-white p-8 rounded-xl shadow-lg transform hover:-translate-y-1 transition duration-300">
          <h2 className="text-2xl font-bold mb-4">Goal</h2>
          <p className="opacity-90 leading-relaxed">To achieve 100% digitalization of assessment records and ensure timely and accurate tax declaration processing.</p>
        </div>
      </section>

      {/* Organizational Structure */}
      <section className="bg-white p-10 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-10 border-b pb-4 text-center">Organizational Structure</h2>
        
        {/* Officials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <OfficialCard 
                name="Hon. Abdila G. Mamasabulod, Al Hadj" 
                position="Municipal Mayor" 
            />
            <OfficialCard 
                name="Sadruddin A. Masukat, REA" 
                position="Provincial Assessor" 
            />
        </div>

        {/* Head of Office */}
        <div className="flex justify-center mb-16">
             <div className="w-full max-w-md">
                 <StaffMember name="Estrella C. Serna, MPS" position="Municipal Assessor" highlight />
             </div>
        </div>

        {/* Regular Employees */}
        <div className="mb-12">
            <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-6 border-l-4 border-emerald-500 pl-4">Regular Employees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <StaffMember name="Maqdoum T. Mamogcat" position="LAOO III" />
                <StaffMember name="Al-Benladin A. Hadji Usop" position="Tax Mapper II" />
                <StaffMember name="Vilma S. Timan" position="Book Binder III" />
                <StaffMember name="Norhan G. Dalos" position="Assessment Clerk I" />
            </div>
        </div>

        {/* Detailed Employees */}
        <div className="mb-12">
            <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-6 border-l-4 border-emerald-500 pl-4">Detailed in the Office of the Municipal Assessor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <StaffMember name="Debora P. Maongko" position="Adm. Asst. V" />
                <StaffMember name="Mustapha D. Lintongan" position="Adm. Asst. II" />
                <StaffMember name="Bert P. Ayunan" position="Adm. Aid V" />
            </div>
        </div>

        {/* Casual Employees */}
        <div>
            <h3 className="text-lg font-bold text-gray-500 uppercase tracking-wider mb-6 border-l-4 border-emerald-500 pl-4">Casual Employees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <StaffMember name="Gutan M. Malingco" position="Casual" />
                <StaffMember name="Al-Micdad L. Mohammad" position="Casual" />
            </div>
        </div>

      </section>
    </div>
  );
};

const OfficialCard = ({ name, position }: { name: string, position: string }) => (
    <div className="bg-emerald-50 p-6 rounded-lg text-center border border-emerald-100">
        <h3 className="font-bold text-xl text-gray-900">{name}</h3>
        <p className="text-emerald-700 font-bold uppercase tracking-wide text-sm mt-2">{position}</p>
    </div>
);

const StaffMember = ({ name, position, highlight }: { name: string, position: string, highlight?: boolean }) => (
    <div className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${highlight ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50'}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 ${highlight ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {name.charAt(0)}
        </div>
        <div>
            <h4 className={`font-bold ${highlight ? 'text-lg text-gray-900' : 'text-gray-800'}`}>{name}</h4>
            <p className={`text-sm font-medium ${highlight ? 'text-emerald-700' : 'text-gray-500'}`}>{position}</p>
        </div>
    </div>
);

export default About;
