
import React, { useState } from 'react';
import { User } from '../types';
import { FileBadge, Search, Filter, Plus } from 'lucide-react';

interface CertificationsProps {
  user: User;
}

const Certifications: React.FC<CertificationsProps> = ({ user }) => {
  const columns = ['Date', 'Control No.', 'Requestor', 'Type', 'TD Number', 'OR Number', 'Amount'];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
           <h1 className="text-xl font-bold text-gray-900">Certifications</h1>
           <p className="text-sm text-gray-500">Manage issued certified copies and certifications.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
             <FileBadge size={24} className="text-emerald-500"/>
             Issued Certifications
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input type="text" placeholder="Search records..." className="pl-10 pr-4 py-2 border rounded-lg text-sm w-full bg-white text-gray-900 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
            </div>
            <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-sm">
              <Plus size={18} className="mr-2" /> New Entry
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col}</th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-gray-400 italic">
                  No records found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Certifications;
