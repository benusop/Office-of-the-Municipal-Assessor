import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { getAllUsers, updateUserRole } from '../services/api';
import { User as UserIcon, Settings } from 'lucide-react';

const DeveloperPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (confirm(`Change this user's role to ${newRole}?`)) {
      await updateUserRole(userId, newRole as UserRole);
      loadUsers();
    }
  };

  if (loading) return <div className="text-center p-10">Loading User Database...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 bg-gray-900 text-white rounded-lg">
            <Settings size={24} />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Control Panel</h1>
            <p className="text-gray-500">Manage user permissions and system access.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-700">Registered Users</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Info</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                        <UserIcon size={20} />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                        <div className="text-sm text-gray-500">{u.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${u.role === 'DEVELOPER' ? 'bg-purple-100 text-purple-800' : 
                                      u.role === 'MODERATOR' ? 'bg-red-100 text-red-800' :
                                      u.role === 'OPERATOR' ? 'bg-blue-100 text-blue-800' :
                                      'bg-green-100 text-green-800'}`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {u.role === 'GUEST' ? 'View & Comment' : 
                                 u.role === 'DEVELOPER' ? 'Full System Control' : 'View, Edit, Comment'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <select 
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    className="border border-gray-300 rounded px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="GUEST">Guest</option>
                                    <option value="OPERATOR">Operator</option>
                                    <option value="MODERATOR">Moderator</option>
                                    <option value="DEVELOPER">Developer</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPanel;