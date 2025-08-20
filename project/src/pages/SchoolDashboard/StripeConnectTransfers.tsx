import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Bell
} from 'lucide-react';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import { StripeConnectPaymentNotifications } from '../../components/StripeConnectPaymentNotifications';

interface Transfer {
  id: string;
  transfer_id: string | null;
  session_id: string;
  payment_intent_id: string;
  application_id: string;
  user_id: string;
  university_id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  destination_account: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_email?: string;
  scholarship_title?: string;
}

const StripeConnectTransfers: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [totalAmount, setTotalAmount] = useState(0);
  const [successfulTransfers, setSuccessfulTransfers] = useState(0);
  const [activeTab, setActiveTab] = useState<'transfers' | 'notifications'>('transfers');

  useEffect(() => {
    if (university?.id) {
      fetchTransfers();
    }
  }, [university?.id, filterStatus]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('stripe_connect_transfers_view')
        .select('*')
        .eq('university_id', university?.id)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Os dados já vêm processados da view
      setTransfers(data || []);

      // Calcular estatísticas
      const total = data?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const successful = data?.filter(t => t.status === 'succeeded').length || 0;
      
      setTotalAmount(total);
      setSuccessfulTransfers(successful);

    } catch (err) {
      console.error('Error fetching transfers:', err);
      setError('Erro ao carregar transferências');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Transferido';
      case 'failed':
        return 'Falhou';
      case 'pending':
        return 'Pendente';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!university) {
    return <div>Carregando universidade...</div>;
  }

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to access Stripe Connect Transfers"
      description="Finish setting up your university profile to view Stripe Connect transfers and payment notifications"
    >
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transferências Stripe Connect
          </h1>
          <p className="text-gray-600">
            Histórico de todas as transferências recebidas via Stripe Connect
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Recebido</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transferências Bem-sucedidas</p>
                <p className="text-2xl font-bold text-gray-900">{successfulTransfers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Transferências</p>
                <p className="text-2xl font-bold text-gray-900">{transfers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('transfers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'transfers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Transferências
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notificações de Pagamentos
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'transfers' ? (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Filtrar por status"
                >
                  <option value="all">Todos</option>
                  <option value="succeeded">Transferidos</option>
                  <option value="failed">Falharam</option>
                  <option value="pending">Pendentes</option>
                </select>
              </div>
            </div>

            {/* Lista de Transferências */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando transferências...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600">{error}</p>
                  <button
                    onClick={fetchTransfers}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : transfers.length === 0 ? (
                <div className="p-8 text-center">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma transferência encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estudante
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bolsa
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transfer ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transfers.map((transfer) => (
                        <tr key={transfer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(transfer.status)}
                              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transfer.status)}`}>
                                {getStatusText(transfer.status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {transfer.student_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {transfer.student_email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {transfer.scholarship_title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatAmount(transfer.amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(transfer.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 font-mono">
                              {transfer.transfer_id ? (
                                <span className="text-green-600">{transfer.transfer_id}</span>
                              ) : (
                                <span className="text-red-600">N/A</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Aba de Notificações */
          <div className="bg-white rounded-lg shadow p-6">
            <StripeConnectPaymentNotifications universityId={university?.id || ''} />
          </div>
        )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default StripeConnectTransfers;
