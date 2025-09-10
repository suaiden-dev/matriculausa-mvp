import React, { useState, useEffect, useCallback } from 'react';
import { Search, Users, UserPlus, X, Crown, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import SellerRegistrationLinkGenerator from '../../components/SellerRegistrationLinkGenerator';
import SellerRegistrationsManager from '../../components/SellerRegistrationsManager';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';
  created_at: string;
  phone?: string;
  country?: string;
  isSeller?: boolean;
  hasInactiveAffiliateCode?: boolean;
}

const SellerManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [promotingUser, setPromotingUser] = useState<string | null>(null);
  const [demotingUser, setDemotingUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'management' | 'registration' | 'pending'>('management');

  const [currentPage, setCurrentPage] = useState(1);
  const { user: currentUser } = useAuth();

  // Constantes de paginação
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar todos os usuários
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        throw new Error(`Failed to load users: ${usersError.message}`);
      }

      // Buscar sellers reais da tabela sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select('*')
        .eq('is_active', true);

      if (sellersError) {
        console.error('Error loading sellers:', sellersError);
        throw new Error(`Failed to load sellers: ${sellersError.message}`);
      }

      // Processar dados - só é seller se estiver na tabela sellers
      const processedUsers = (usersData || []).map(user => {
        // Verificar se o usuário é um seller real (está na tabela sellers)
        const isRealSeller = sellersData?.some(seller => 
          seller.user_id === user.user_id
        ) || false;

        return {
          ...user,
          isSeller: isRealSeller,
          hasInactiveAffiliateCode: false // Removido o sistema antigo de affiliate_codes
        };
      });

      setUsers(processedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const promoteToSeller = async (userId: string, userName: string) => {
    try {
      setPromotingUser(userId);

      // Buscar o user_profile_id pelo user_id
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('user_id', userId)
        .single();

      if (profileError || !userProfile) {
        throw new Error('User profile not found');
      }

      // Usar a nova função create_seller_from_user_profile
      const { error: createError } = await supabase.rpc('create_seller_from_user_profile', {
        user_profile_id: userProfile.id
      });

      if (createError) {
        throw createError;
      }

      // Buscar dados do affiliate admin atual
      const { data: affiliateAdmin } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('user_id', currentUser?.id)
        .single();

      // Buscar dados do seller criado
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('referral_code, commission_rate')
        .eq('user_id', userId)
        .single();

      // Enviar notificação para admin sobre criação do seller
      try {
        const adminNotificationPayload = {
          tipo_notf: "Novo seller criado",
          email_admin: "admin@matriculausa.com", // Email fixo do admin
          nome_admin: "Admin MatriculaUSA",
          email_seller: userProfile.email,
          nome_seller: userProfile.full_name || userName,
          email_affiliate_admin: affiliateAdmin?.email || "",
          nome_affiliate_admin: affiliateAdmin?.full_name || "Affiliate Admin",
          o_que_enviar: `O affiliate admin ${affiliateAdmin?.full_name || "Affiliate Admin"} promoveu ${userProfile.full_name || userName} a seller. Código de referência: ${sellerData?.referral_code || "N/A"}`,
          seller_id: userId,
          referral_code: sellerData?.referral_code || "",
          commission_rate: sellerData?.commission_rate || 0.1,
          created_by: "affiliate_admin"
        };

        console.log('📧 [SellerCreation] Enviando notificação para admin:', adminNotificationPayload);

        const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(adminNotificationPayload),
        });

        if (adminNotificationResponse.ok) {
          console.log('✅ [SellerCreation] Notificação para admin enviada com sucesso!');
        } else {
          console.warn('⚠️ [SellerCreation] Erro ao enviar notificação para admin:', adminNotificationResponse.status);
        }
      } catch (notificationError) {
        console.error('❌ [SellerCreation] Erro ao enviar notificação para admin:', notificationError);
      }

      // Enviar notificação para o seller sobre sua criação
      try {
        const sellerNotificationPayload = {
          tipo_notf: "Você foi promovido a seller",
          email_seller: userProfile.email,
          nome_seller: userProfile.full_name || userName,
          email_affiliate_admin: affiliateAdmin?.email || "",
          nome_affiliate_admin: affiliateAdmin?.full_name || "Affiliate Admin",
          o_que_enviar: `Parabéns! Você foi promovido a seller pelo affiliate admin ${affiliateAdmin?.full_name || "Affiliate Admin"}. Seu código de referência é: ${sellerData?.referral_code || "N/A"}. Use este código para indicar alunos e ganhar comissões!`,
          seller_id: userId,
          referral_code: sellerData?.referral_code || "",
          commission_rate: sellerData?.commission_rate || 0.1,
          dashboard_link: "/seller/dashboard"
        };

        console.log('📧 [SellerCreation] Enviando notificação para seller:', sellerNotificationPayload);

        const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sellerNotificationPayload),
        });

        if (sellerNotificationResponse.ok) {
          console.log('✅ [SellerCreation] Notificação para seller enviada com sucesso!');
        } else {
          console.warn('⚠️ [SellerCreation] Erro ao enviar notificação para seller:', sellerNotificationResponse.status);
        }
      } catch (notificationError) {
        console.error('❌ [SellerCreation] Erro ao enviar notificação para seller:', notificationError);
      }

      // Recarregar usuários
      await loadAllUsers();
    } catch (error: any) {
      console.error('Error promoting user:', error);
      alert(`Error promoting user: ${error.message}`);
    } finally {
      setPromotingUser(null);
    }
  };

  const demoteFromSeller = async (userId: string) => {
    try {
      setDemotingUser(userId);

      // Buscar o seller_id pelo user_id
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (sellerError || !seller) {
        throw new Error('Seller not found');
      }

      // Desativar o seller
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ is_active: false })
        .eq('id', seller.id);

      if (updateError) {
        throw updateError;
      }

      // Recarregar usuários
      await loadAllUsers();
    } catch (error: any) {
      console.error('Error demoting seller:', error);
      alert(`Error demoting seller: ${error.message}`);
    } finally {
      setDemotingUser(null);
    }
  };

  // Filtrar usuários baseado na busca e filtros
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterRole === 'all' || 
      (filterRole === 'seller' && user.isSeller) ||
      (filterRole === 'non-seller' && !user.isSeller) ||
      user.role === filterRole;

    return matchesSearch && matchesFilter;
  });

  // Cálculos de paginação
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset da página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (role: string, isSeller: boolean) => {
    if (isSeller) return 'bg-green-100 text-green-800';
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'school': return 'bg-purple-100 text-purple-800';
      case 'affiliate_admin': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string, isSeller: boolean) => {
    if (isSeller) return 'Seller';
    switch (role) {
      case 'student': return 'Student';
      case 'school': return 'School';
      case 'affiliate_admin': return 'Affiliate Admin';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('management')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'management'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Gerenciar Sellers
            </button>
            <button
              onClick={() => setActiveTab('registration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'registration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Gerar Links de Registro
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck className="w-4 h-4 inline mr-2" />
              Registros Pendentes
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'management' && (
            <>
              {/* Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-500">Total Users</p>
                      <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <UserPlus className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-500">Sellers</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {users.filter(u => u.isSeller).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Crown className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-500">Students</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {users.filter(u => u.role === 'student').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-slate-500">Available to Promote</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {users.filter(u => !u.isSeller && u.role === 'student').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      aria-label="Filter users by role"
                    >
                      <option value="all">All Users</option>
                      <option value="student">Students</option>
                      <option value="school">Schools</option>
                      <option value="seller">Current Sellers</option>
                      <option value="non-seller">Non-Sellers</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-slate-700">
                                    {user.full_name?.charAt(0) || user.email.charAt(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">
                                  {user.full_name || 'No Name'}
                                </div>
                                <div className="text-sm text-slate-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role, user.isSeller || false)}`}>
                              {getRoleLabel(user.role, user.isSeller || false)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {user.isSeller ? (
                              <button
                                onClick={() => demoteFromSeller(user.user_id)}
                                disabled={demotingUser === user.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {demotingUser === user.id ? 'Demoting...' : 'Demote'}
                              </button>
                            ) : user.role === 'student' ? (
                              <button
                                onClick={() => promoteToSeller(user.user_id, user.full_name || user.email)}
                                disabled={promotingUser === user.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                {promotingUser === user.id ? 'Promoting...' : 'Promote to Seller'}
                              </button>
                            ) : (
                              <span className="text-slate-400">
                                <X className="h-3 w-3 mr-1" />
                                Cannot Promote
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {paginatedUsers.length === 0 && filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
                    <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
                  </div>
                )}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-200">
                    {/* Informações da página centralizadas */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="text-sm text-slate-500">
                        Page {currentPage} of {totalPages}
                      </div>
                    </div>
                    
                    {/* Controles de navegação centralizados */}
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </button>
                      
                      {/* Números das páginas */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNumber;
                          if (totalPages <= 5) {
                            pageNumber = i + 1;
                          } else if (currentPage <= 3) {
                            pageNumber = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNumber = totalPages - 4 + i;
                          } else {
                            pageNumber = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => goToPage(pageNumber)}
                              className={`inline-flex items-center px-3 py-1 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                currentPage === pageNumber
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                          <>
                            <span className="px-2 text-slate-500">...</span>
                            <button
                              onClick={() => goToPage(totalPages)}
                              className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'registration' && (
            <SellerRegistrationLinkGenerator />
          )}

          {activeTab === 'pending' && (
            <SellerRegistrationsManager />
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerManagement;
