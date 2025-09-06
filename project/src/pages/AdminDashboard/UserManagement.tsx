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
  UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // 20 itens por página para melhor visualização

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
    setCurrentPage(1); // Reset para primeira página
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
      // Se temos poucas páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Se temos muitas páginas, mostrar uma janela deslizante
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Ajustar se estamos no final
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
                          // Usar a função RPC para affiliate admin
                          const { error } = await supabase.rpc('promote_to_affiliate_admin', {
                            user_email: user.email
                          });
                          if (error) throw error;
                          alert('User promoted to Affiliate Admin successfully!');
                        } else {
                          // Atualizar role diretamente
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
                                // Usar a função RPC para affiliate admin
                                const { error } = await supabase.rpc('promote_to_affiliate_admin', {
                                  user_email: user.email
                                });
                                if (error) throw error;
                                alert('User promoted to Affiliate Admin successfully!');
                              } else {
                                // Atualizar role diretamente
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
            {/* Informações da paginação */}
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length}
              </span>
              <span className="ml-2">
                users
              </span>
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center gap-2">
              {/* Botão Primeira Página */}
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

              {/* Botão Página Anterior */}
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

              {/* Números das páginas */}
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

              {/* Botão Próxima Página */}
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

              {/* Botão Última Página */}
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

            {/* Seletor de itens por página */}
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
              {/* Header com informações básicas */}
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

              {/* Grid principal com informações organizadas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Coluna Esquerda */}
                <div className="space-y-4">
                  {/* Informações de Contato */}
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

                  {/* Informações da Conta */}
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
                      {selectedUser.updated_at && (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            Last updated {new Date(selectedUser.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedUser.avatar_url && (
                        <div className="flex items-center text-sm">
                          <div className="w-8 h-8 rounded-full bg-slate-200 mr-3 flex items-center justify-center">
                            <img 
                              src={selectedUser.avatar_url} 
                              alt="Avatar" 
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <UserX className="w-4 h-4 text-slate-400 hidden" />
                          </div>
                          <span className="text-slate-600">
                            <span className="font-medium">Avatar:</span> Available
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status de Pagamentos */}
                  {(selectedUser.is_application_fee_paid !== undefined || selectedUser.has_paid_selection_process_fee !== undefined || selectedUser.is_scholarship_fee_paid !== undefined) && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <List className="h-4 w-4 mr-2 text-slate-500" />
                        Payment Status
                      </h5>
                      <div className="space-y-3">
                        {selectedUser.is_application_fee_paid !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Application Fee</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.is_application_fee_paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedUser.is_application_fee_paid ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                        {selectedUser.has_paid_selection_process_fee !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Selection Process Fee</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.has_paid_selection_process_fee ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedUser.has_paid_selection_process_fee ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                        {selectedUser.is_scholarship_fee_paid !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Scholarship Fee</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.is_scholarship_fee_paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedUser.is_scholarship_fee_paid ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                        {selectedUser.has_paid_college_enrollment_fee !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">College Enrollment Fee</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.has_paid_college_enrollment_fee ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedUser.has_paid_college_enrollment_fee ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                        {selectedUser.has_paid_i20_control_fee !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">I-20 Control Fee</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.has_paid_i20_control_fee ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedUser.has_paid_i20_control_fee ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        )}
                        {selectedUser.i20_control_fee_due_date && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">I-20 Fee Due Date</span>
                            <span className="text-slate-600 font-medium">
                              {new Date(selectedUser.i20_control_fee_due_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna Direita */}
                <div className="space-y-4">

                  {/* Informações Acadêmicas */}
                  {(selectedUser.field_of_interest || selectedUser.academic_level || selectedUser.gpa || selectedUser.english_proficiency) && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <GraduationCap className="h-4 w-4 mr-2 text-slate-500" />
                        Academic Information
                      </h5>
                      <div className="space-y-3">
                    {selectedUser.field_of_interest && (
                      <div className="flex items-center text-sm">
                            <GraduationCap className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Field:</span> {selectedUser.field_of_interest}
                            </span>
                      </div>
                    )}
                        {selectedUser.academic_level && (
                          <div className="flex items-center text-sm">
                            <GraduationCap className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Level:</span> {selectedUser.academic_level}
                            </span>
                  </div>
                        )}
                        {selectedUser.gpa && (
                          <div className="flex items-center text-sm">
                            <GraduationCap className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">GPA:</span> {selectedUser.gpa}
                            </span>
                </div>
                        )}
                        {selectedUser.english_proficiency && (
                          <div className="flex items-center text-sm">
                            <GraduationCap className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">English:</span> {selectedUser.english_proficiency}
                            </span>
              </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Informações Específicas do Estudante */}
                  {selectedUser.role === 'student' && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <GraduationCap className="h-4 w-4 mr-2 text-slate-500" />
                        Student Specific Information
                      </h5>
                      <div className="space-y-3">
                        {selectedUser.student_process_type && (
                          <div className="flex items-center text-sm">
                            <GraduationCap className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Process Type:</span> 
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                selectedUser.student_process_type === 'initial' ? 'bg-blue-100 text-blue-800' :
                                selectedUser.student_process_type === 'transfer' ? 'bg-green-100 text-green-800' :
                                selectedUser.student_process_type === 'change_of_status' ? 'bg-purple-100 text-purple-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {selectedUser.student_process_type === 'initial' ? 'Initial Student' :
                                 selectedUser.student_process_type === 'transfer' ? 'Transfer Student' :
                                 selectedUser.student_process_type === 'change_of_status' ? 'Change of Status' :
                                 selectedUser.student_process_type}
                              </span>
                            </span>
                          </div>
                        )}
                        {selectedUser.seller_referral_code && (
                          <div className="flex items-center text-sm">
                            <UserPlus className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Seller Referral:</span> {selectedUser.seller_referral_code}
                            </span>
                          </div>
                        )}
                        {selectedUser.university_id && (
                          <div className="flex items-center text-sm">
                            <Building className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">University ID:</span> {selectedUser.university_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informações Específicas da Universidade */}
                  {selectedUser.role === 'school' && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <Building className="h-4 w-4 mr-2 text-slate-500" />
                        University Specific Information
                      </h5>
                      <div className="space-y-3">
                        {selectedUser.university_id && (
                          <div className="flex items-center text-sm">
                            <Building className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">University ID:</span> {selectedUser.university_id}
                            </span>
                          </div>
                        )}
                        {selectedUser.country && (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Location:</span> {selectedUser.country}
                            </span>
                          </div>
                        )}
                        {selectedUser.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Contact Phone:</span> {selectedUser.phone}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center text-sm">
                          <Activity className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Account Status:</span> 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.status === 'active' ? 'bg-green-100 text-green-800' :
                              selectedUser.status === 'inactive' ? 'bg-slate-100 text-slate-800' :
                              selectedUser.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {selectedUser.status}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informações Específicas do Admin */}
                  {selectedUser.role === 'admin' && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <Crown className="h-4 w-4 mr-2 text-slate-500" />
                        Admin Specific Information
                      </h5>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <Crown className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Admin Level:</span> System Administrator
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Activity className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Permissions:</span> Full System Access
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Admin Since:</span> {new Date(selectedUser.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informações Específicas do Affiliate Admin */}
                  {selectedUser.role === 'affiliate_admin' && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <UserPlus className="h-4 w-4 mr-2 text-slate-500" />
                        Affiliate Admin Information
                      </h5>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <UserPlus className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Affiliate Level:</span> Regional Administrator
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Activity className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Status:</span> 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800`}>
                              Active Affiliate
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-3 text-slate-400" />
                          <span className="text-slate-600">
                            <span className="font-medium">Affiliate Since:</span> {new Date(selectedUser.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {selectedUser.country && (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Territory:</span> {selectedUser.country}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status de Documentos */}
                  {(selectedUser.documents_status || selectedUser.documents_uploaded !== undefined) && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <List className="h-4 w-4 mr-2 text-slate-500" />
                        Documents Status
                      </h5>
                      <div className="space-y-3">
                        {selectedUser.documents_status && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Documents Status</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.documents_status === 'approved' ? 'bg-green-100 text-green-800' :
                              selectedUser.documents_status === 'rejected' ? 'bg-red-100 text-red-800' :
                              selectedUser.documents_status === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {selectedUser.documents_status}
                            </span>
                          </div>
                        )}
                        {selectedUser.documents_uploaded !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Documents Uploaded</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.documents_uploaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedUser.documents_uploaded ? 'Yes' : 'No'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informações de Matrícula */}
                  {(selectedUser.enrollment_status || selectedUser.selected_scholarship_id) && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <GraduationCap className="h-4 w-4 mr-2 text-slate-500" />
                        Enrollment Information
                      </h5>
                      <div className="space-y-3">
                        {selectedUser.enrollment_status && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Enrollment Status</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedUser.enrollment_status === 'enrolled' ? 'bg-green-100 text-green-800' :
                              selectedUser.enrollment_status === 'rejected' ? 'bg-red-100 text-red-800' :
                              selectedUser.enrollment_status === 'waitlisted' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {selectedUser.enrollment_status}
                            </span>
                          </div>
                        )}
                        {selectedUser.selected_scholarship_id && (
                          <div className="flex items-center text-sm">
                            <GraduationCap className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Selected Scholarship:</span> {selectedUser.selected_scholarship_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informações do Stripe */}
                  {(selectedUser.stripe_customer_id || selectedUser.stripe_payment_intent_id) && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <List className="h-4 w-4 mr-2 text-slate-500" />
                        Payment System
                      </h5>
                      <div className="space-y-3">
                        {selectedUser.stripe_customer_id && (
                          <div className="flex items-center text-sm">
                            <span className="text-slate-600">
                              <span className="font-medium">Stripe Customer ID:</span> {selectedUser.stripe_customer_id}
                            </span>
                          </div>
                        )}
                        {selectedUser.stripe_payment_intent_id && (
                          <div className="flex items-center text-sm">
                            <span className="text-slate-600">
                              <span className="font-medium">Payment Intent ID:</span> {selectedUser.stripe_payment_intent_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informações de Referência e Afiliação */}
                  {(selectedUser.seller_referral_code || selectedUser.role === 'affiliate_admin') && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center">
                        <UserPlus className="h-4 w-4 mr-2 text-slate-500" />
                        Referral & Affiliation
                      </h5>
                      <div className="space-y-3">
                        {selectedUser.seller_referral_code && (
                          <div className="flex items-center text-sm">
                            <UserPlus className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Seller Code:</span> {selectedUser.seller_referral_code}
                            </span>
                          </div>
                        )}
                        {selectedUser.role === 'affiliate_admin' && (
                          <div className="flex items-center text-sm">
                            <Crown className="h-4 w-4 mr-3 text-slate-400" />
                            <span className="text-slate-600">
                              <span className="font-medium">Affiliate Admin:</span> Active
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações do usuário */}
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
                            // Usar a função RPC para affiliate admin
                            const { error } = await supabase.rpc('promote_to_affiliate_admin', {
                              user_email: selectedUser.email
                            });
                            if (error) throw error;
                            alert('User promoted to Affiliate Admin successfully!');
                          } else {
                            // Atualizar role diretamente
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
                      className="bg-red-600 text-white py-3 px-6 rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center self-start"
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
  );
};

export default UserManagement;