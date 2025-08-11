import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search,
  Filter,
  RefreshCw,
  Ban,
  Unlock,
  User,
  Activity,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface SuspiciousUser {
  id: string;
  email: string;
  fullName: string;
  affiliateCode: string;
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
  lastActivity: string;
  status: 'active' | 'suspended' | 'flagged';
  flags: string[];
}

interface BlockedCode {
  id: string;
  code: string;
  userId: string;
  userEmail: string;
  blockedAt: string;
  blockedBy: string;
  reason: string;
}

const MatriculaRewardsModeration: React.FC = () => {
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUser[]>([]);
  const [blockedCodes, setBlockedCodes] = useState<BlockedCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadModerationData();
    }
  }, [user]);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar usuários suspeitos
      const { data: suspiciousData, error: suspiciousError } = await supabase
        .rpc('get_suspicious_users');

      if (suspiciousError) throw suspiciousError;

      // Carregar códigos bloqueados
      const { data: blockedData, error: blockedError } = await supabase
        .rpc('get_blocked_affiliate_codes');

      if (blockedError) throw blockedError;

      setSuspiciousUsers(suspiciousData || []);
      setBlockedCodes(blockedData || []);

    } catch (err) {
      console.error('Error loading moderation data:', err);
      setError('Erro ao carregar dados de moderação');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .rpc('moderate_matricula_user', { 
          user_id: userId, 
          action: 'block',
          admin_user_id: user?.id 
        });

      if (error) throw error;

      // Recarregar dados
      await loadModerationData();
    } catch (err) {
      console.error('Error blocking user:', err);
      setError('Erro ao bloquear usuário');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .rpc('moderate_matricula_user', { 
          user_id: userId, 
          action: 'unblock',
          admin_user_id: user?.id 
        });

      if (error) throw error;

      // Recarregar dados
      await loadModerationData();
    } catch (err) {
      console.error('Error unblocking user:', err);
      setError('Erro ao desbloquear usuário');
    }
  };

  const filteredSuspiciousUsers = suspiciousUsers.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.affiliateCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa de privilégios de administrador para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados de moderação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <Shield className="h-6 w-6 mr-2 text-purple-600" />
              Moderação do Sistema
            </h2>
            <p className="text-slate-600 mt-1">Gerencie usuários suspeitos e códigos bloqueados</p>
          </div>
          
          <button 
            onClick={loadModerationData}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Usuários Suspeitos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Usuários Suspeitos
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Usuários com comportamento suspeito ou alta taxa de conversão anômala
          </p>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por email, nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label="Filtrar por status"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="flagged">Marcado</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Indicações</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Conversão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredSuspiciousUsers.map((suspiciousUser) => (
                <tr key={suspiciousUser.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{suspiciousUser.fullName}</div>
                      <div className="text-sm text-slate-500">{suspiciousUser.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {suspiciousUser.affiliateCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {suspiciousUser.totalReferrals}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {suspiciousUser.conversionRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      suspiciousUser.status === 'active' ? 'bg-green-100 text-green-800' :
                      suspiciousUser.status === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {suspiciousUser.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {suspiciousUser.status === 'suspended' && <Ban className="h-3 w-3 mr-1" />}
                      {suspiciousUser.status === 'flagged' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {suspiciousUser.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="text-purple-600 hover:text-purple-900"
                        aria-label="Ver detalhes do usuário"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {suspiciousUser.status === 'active' ? (
                        <button 
                          onClick={() => handleBlockUser(suspiciousUser.id, 'Comportamento suspeito')}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Bloquear usuário"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUnblockUser(suspiciousUser.id)}
                          className="text-green-600 hover:text-green-900"
                          aria-label="Desbloquear usuário"
                        >
                          <Unlock className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Códigos Bloqueados */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <Ban className="h-5 w-5 mr-2 text-red-600" />
            Códigos Bloqueados
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Códigos de afiliados que foram bloqueados por violação de políticas
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bloqueado Em</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bloqueado Por</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Motivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {blockedCodes.map((blockedCode) => (
                <tr key={blockedCode.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {blockedCode.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{blockedCode.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(blockedCode.blockedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {blockedCode.blockedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {blockedCode.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleUnblockUser(blockedCode.userId)}
                      className="text-green-600 hover:text-green-900"
                      aria-label="Desbloquear código"
                    >
                      <Unlock className="h-4 w-4" />
                    </button>
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

export default MatriculaRewardsModeration; 