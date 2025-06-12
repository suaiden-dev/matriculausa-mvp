import React, { useState } from 'react';
import { 
  Users, 
  Crown, 
  Building, 
  GraduationCap, 
  Search, 
  Filter, 
  Ban, 
  UserX, 
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface UserManagementProps {
  users: any[];
  stats: {
    total: number;
    students: number;
    schools: number;
    admins: number;
  };
  onSuspend: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  stats,
  onSuspend
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'school': return Building;
      case 'student': return GraduationCap;
      default: return Users;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'school': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-slate-100 text-slate-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Students</p>
              <p className="text-3xl font-bold text-green-600">{stats.students}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Universities</p>
              <p className="text-3xl font-bold text-blue-600">{stats.schools}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Admins</p>
              <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="school">Universities</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center text-sm text-slate-600">
          <span className="font-medium">{filteredUsers.length}</span>
          <span className="ml-1">
            user{filteredUsers.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => {
          const RoleIcon = getRoleIcon(user.role);
          
          return (
            <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    user.role === 'admin' ? 'bg-purple-100' : 
                    user.role === 'school' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    <RoleIcon className={`h-6 w-6 ${
                      user.role === 'admin' ? 'text-purple-600' : 
                      user.role === 'school' ? 'text-blue-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{user.full_name}</h3>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                  {user.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Role</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                
                {user.country && (
                  <div className="flex items-center text-sm text-slate-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {user.country}
                  </div>
                )}
                
                {user.field_of_interest && (
                  <div className="flex items-center text-sm text-slate-600">
                    <Activity className="h-4 w-4 mr-2" />
                    {user.field_of_interest}
                  </div>
                )}
                
                <div className="flex items-center text-sm text-slate-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedUser(user)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  View Details
                </button>
                
                {user.status === 'active' && user.role !== 'admin' && (
                  <button
                    onClick={() => onSuspend(user.user_id)}
                    className="bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors"
                    title="Suspend User"
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
          <p className="text-slate-500">
            {searchTerm ? `No users match "${searchTerm}"` : 'No users registered yet'}
          </p>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
                >
                  <UserX className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  selectedUser.role === 'admin' ? 'bg-purple-100' : 
                  selectedUser.role === 'school' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {React.createElement(getRoleIcon(selectedUser.role), {
                    className: `h-8 w-8 ${
                      selectedUser.role === 'admin' ? 'text-purple-600' : 
                      selectedUser.role === 'school' ? 'text-blue-600' : 'text-green-600'
                    }`
                  })}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900">{selectedUser.full_name}</h4>
                  <p className="text-slate-600">{selectedUser.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-slate-900 mb-3">Contact Information</h5>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="text-slate-600">{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-slate-600">{selectedUser.phone}</span>
                      </div>
                    )}
                    {selectedUser.country && (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-slate-600">{selectedUser.country}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-slate-900 mb-3">Account Information</h5>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="text-slate-600">
                        Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Activity className="h-4 w-4 mr-2 text-slate-400" />
                      <span className="text-slate-600">
                        Last active {new Date(selectedUser.last_active).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedUser.field_of_interest && (
                      <div className="flex items-center text-sm">
                        <GraduationCap className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-slate-600">{selectedUser.field_of_interest}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedUser.status === 'active' && selectedUser.role !== 'admin' && (
                <div className="flex space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      onSuspend(selectedUser.user_id);
                      setSelectedUser(null);
                    }}
                    className="bg-red-600 text-white py-3 px-6 rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;