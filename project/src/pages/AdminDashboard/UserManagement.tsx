import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Crown, 
  Building, 
  GraduationCap, 
  Search, 
  Ban, 
  UserX, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  List,
  Grid3X3,
  UserPlus,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StudentApplicationsView from '../../components/AdminDashboard/StudentApplicationsView';
import FeeManagement from '../../components/AdminDashboard/FeeManagement';

interface UserManagementProps {
  users: any[];
  stats: {
    total: number;
    students: number;
    schools: number;
    admins: number;
    affiliate_admins?: number;
  };
  onSuspend: (userId: string) => void;
  onRefresh?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  stats,
  onSuspend,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'applications' | 'feeManagement'>('applications');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Carregar preferência do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('user-view-mode') as 'grid' | 'list';
    if (saved) setViewMode(saved);
  }, []);

  // Carregar preferência de itens por página
  useEffect(() => {
    const saved = localStorage.getItem('user-items-per-page');
    if (saved) {
      const items = Number(saved);
      if ([10, 20, 50, 100].includes(items)) {
        setItemsPerPage(items);
      }
    }
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('user-view-mode', mode);
  };

  // Salvar preferência de itens por página
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    localStorage.setItem('user-items-per-page', newItemsPerPage.toString());
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Calcular paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Funções de navegação
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  // Gerar array de páginas para exibição
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'affiliate_admin': return UserPlus;
      case 'school': return Building;
      case 'student': return GraduationCap;
      default: return Users;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'affiliate_admin': return 'bg-orange-100 text-orange-800';
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
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Management</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'applications'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5" />
              <span>Application Tracking</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('feeManagement')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'feeManagement'
                ? 'border-[#05294E] text-[#05294E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Fee Management</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
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
                  <p className="text-3xl font-bold text-[#05294E]">{stats.admins}</p>
                </div>
                <div className="w-12 h-12 bg-[#05294E] rounded-xl flex items-center justify-center">
                  <Crown className="h-6 w-6 text-white" />
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
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  aria-label="Filter by role"
                  title="Filter by role"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="school">Universities</option>
                  <option value="admin">Admins</option>
                  <option value="affiliate_admin">Affiliate Admins</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  aria-label="Filter by status"
                  title="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>

                <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1">
                  <button
                    onClick={() => handleViewModeChange('grid')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('list')}
                    className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'list' ? 'bg-white text-[#05294E] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    title="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center text-sm text-slate-600">
              <span className="font-medium">{filteredUsers.length}</span>
              <span className="ml-1">
                user{filteredUsers.length !== 1 ? 's' : ''} found
              </span>
              {totalPages > 1 && (
                <>
                  <span className="mx-2">•</span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Users Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                
                return (
                  <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          user.role === 'admin' ? 'bg-purple-100' : 
                          user.role === 'affiliate_admin' ? 'bg-orange-100' :
                          user.role === 'school' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          <RoleIcon className={`h-6 w-6 ${
                            user.role === 'admin' ? 'text-purple-600' : 
                            user.role === 'affiliate_admin' ? 'text-orange-600' :
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
                      
                      <select
                        value={user.role}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          if (newRole === user.role) return;
                          
                          try {
                            if (newRole === 'affiliate_admin') {
                              const { error } = await supabase.rpc('promote_to_affiliate_admin', {
                                user_email: user.email
                              });
                              if (error) throw error;
                              alert('User promoted to Affiliate Admin successfully!');
                            } else {
                              const { error } = await supabase
                                .from('user_profiles')
                                .update({ role: newRole })
                                .eq('user_id', user.user_id);
                              if (error) throw error;
                              alert(`Role updated to ${newRole} successfully!`);
                            }
                            
                            if (onRefresh) onRefresh();
                          } catch (error: any) {
                            console.error('Error updating role:', error);
                            alert('Failed to update role: ' + error.message);
                          }
                        }}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                        disabled={user.status !== 'active'}
                        title="Change user role"
                      >
                        <option value="student">Student</option>
                        <option value="school">University</option>
                        <option value="admin">Admin</option>
                        <option value="affiliate_admin">Affiliate Admin</option>
                      </select>
                      
                      {user.status === 'active' && !['admin', 'affiliate_admin'].includes(user.role) && (
                        <button
                          onClick={() => onSuspend(user.user_id)}
                          className="bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors"
                          title="Suspend User"
                          aria-label="Suspend user"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Joined</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="px-4 py-2 font-medium text-slate-900">{user.full_name}</td>
                      <td className="px-4 py-2 text-slate-600">{user.email}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>{user.status}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="bg-slate-100 text-slate-700 py-1 px-3 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium"
                            aria-label="View user details"
                            title="View user details"
                          >
                            View
                          </button>
                          {user.status === 'active' && (
                            <select
                              value={user.role}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                if (newRole === user.role) return;
                                
                                try {
                                  if (newRole === 'affiliate_admin') {
                                    const { error } = await supabase.rpc('promote_to_affiliate_admin', {
                                      user_email: user.email
                                    });
                                    if (error) throw error;
                                    alert('User promoted to Affiliate Admin successfully!');
                                  } else {
                                    const { error } = await supabase
                                      .from('user_profiles')
                                      .update({ role: newRole })
                                      .eq('user_id', user.user_id);
                                    if (error) throw error;
                                    alert(`Role updated to ${newRole} successfully!`);
                                  }
                                  
                                  if (onRefresh) onRefresh();
                                } catch (error: any) {
                                  console.error('Error updating role:', error);
                                  alert('Failed to update role: ' + error.message);
                                }
                              }}
                              className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                              disabled={user.status !== 'active'}
                              title="Change user role"
                            >
                              <option value="student">Student</option>
                              <option value="school">University</option>
                              <option value="admin">Admin</option>
                              <option value="affiliate_admin">Affiliate Admin</option>
                            </select>
                          )}
                          
                          {user.status === 'active' && !['admin', 'affiliate_admin'].includes(user.role) && (
                            <button
                              onClick={() => onSuspend(user.user_id)}
                              className="bg-red-100 text-red-700 py-1 px-3 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                              title="Suspend User"
                              aria-label="Suspend user"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {filteredUsers.length > 0 && totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
                  </span>
                  <span className="ml-2">users</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNumber, index) => (
                      <button
                        key={index}
                        onClick={() => goToPage(pageNumber)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNumber
                            ? 'bg-[#05294E] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border transition-colors ${
                      currentPage === totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Last page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    title="Items per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}

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
              <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">User Details</h3>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
                      title="Close"
                    >
                      <UserX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      selectedUser.role === 'admin' ? 'bg-purple-100' : 
                      selectedUser.role === 'affiliate_admin' ? 'bg-orange-100' :
                      selectedUser.role === 'school' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {React.createElement(getRoleIcon(selectedUser.role), {
                        className: `h-8 w-8 ${
                          selectedUser.role === 'admin' ? 'text-purple-600' : 
                          selectedUser.role === 'affiliate_admin' ? 'text-orange-600' :
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-slate-500" />
                          Contact Information
                        </h5>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Mail className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">{selectedUser.email}</span>
                          </div>
                          {selectedUser.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 mr-3 text-slate-400" />
                              <span className="text-slate-600">{selectedUser.phone}</span>
                            </div>
                          )}
                          {selectedUser.country && (
                            <div className="flex items-center text-sm">
                              <MapPin className="h-4 w-4 mr-3 text-slate-400" />
                              <span className="text-slate-600">{selectedUser.country}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4">
                        <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                          <Activity className="h-4 w-4 mr-2 text-slate-500" />
                          Account Information
                        </h5>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Activity className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              Last active {new Date(selectedUser.last_active).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedUser.field_of_interest && (
                        <div className="bg-slate-50 rounded-xl p-4">
                          <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                            <GraduationCap className="h-4 w-4 mr-2 text-slate-500" />
                            Academic Information
                          </h5>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm">
                              <GraduationCap className="h-4 w-4 mr-3 text-slate-400" />
                              <span className="text-slate-600">
                                <span className="font-medium">Field:</span> {selectedUser.field_of_interest}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedUser.status === 'active' && (
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-slate-700">Change Role:</label>
                        <select
                          value={selectedUser.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            if (newRole === selectedUser.role) return;
                            
                            try {
                              if (newRole === 'affiliate_admin') {
                                const { error } = await supabase.rpc('promote_to_affiliate_admin', {
                                  user_email: selectedUser.email
                                });
                                if (error) throw error;
                                alert('User promoted to Affiliate Admin successfully!');
                              } else {
                                const { error } = await supabase
                                  .from('user_profiles')
                                  .update({ role: newRole })
                                  .eq('user_id', selectedUser.user_id);
                                if (error) throw error;
                                alert(`Role updated to ${newRole} successfully!`);
                              }
                              
                              setSelectedUser(null);
                              if (onRefresh) onRefresh();
                            } catch (error: any) {
                              console.error('Error updating role:', error);
                              alert('Failed to update role: ' + error.message);
                            }
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                          title="Change user role"
                        >
                          <option value="student">Student</option>
                          <option value="school">University</option>
                          <option value="admin">Admin</option>
                          <option value="affiliate_admin">Affiliate Admin</option>
                        </select>
                      </div>
                      
                      {!['admin', 'affiliate_admin'].includes(selectedUser.role) && (
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'applications' ? (
        <StudentApplicationsView />
      ) : (
        <FeeManagement />
      )}
    </div>
  );
};

export default UserManagement;