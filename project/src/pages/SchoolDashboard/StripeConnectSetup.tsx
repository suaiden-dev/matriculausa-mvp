import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Shield,
  DollarSign,
  Info
} from 'lucide-react';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

interface StripeConnectStatus {
  is_connected: boolean;
  account_id?: string;
  account_name?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_completed: boolean;
}

const StripeConnectSetup: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (university) {
      fetchStripeConnectStatus();
    }
  }, [university]);

  const fetchStripeConnectStatus = async () => {
    if (!university) return;

    try {
      const { data, error } = await supabase
        .from('university_fee_configurations')
        .select('*')
        .eq('university_id', university.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Stripe Connect status:', error);
        return;
      }

      if (data) {
        setConnectStatus({
          is_connected: !!data.stripe_connect_account_id,
          account_id: data.stripe_connect_account_id,
          account_name: data.stripe_account_name,
          charges_enabled: data.stripe_charges_enabled || false,
          payouts_enabled: data.stripe_payouts_enabled || false,
          requirements_completed: data.stripe_requirements_completed || false
        });
      } else {
        setConnectStatus({
          is_connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          requirements_completed: false
        });
      }
    } catch (error) {
      console.error('Error fetching Stripe Connect status:', error);
    }
  };

  const initiateStripeConnect = async () => {
    if (!university) return;

    setLoading(true);
    setError(null);

    try {
      // Chamar edge function para iniciar o processo de Stripe Connect
      const { data, error } = await supabase.functions.invoke('initiate-stripe-connect', {
        body: {
          university_id: university.id,
          return_url: `${window.location.origin}/school/dashboard/stripe-connect/callback`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirecionar para o Stripe para autorização
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível obter URL de autorização do Stripe');
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao conectar com Stripe');
    } finally {
      setLoading(false);
    }
  };

  const refreshStripeStatus = async () => {
    if (!university) return;

    setLoading(true);
    try {
      // Chamar edge function para atualizar status
      const { data, error } = await supabase.functions.invoke('refresh-stripe-connect-status', {
        body: { university_id: university.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar status local
      await fetchStripeConnectStatus();
    } catch (error: any) {
      setError(error.message || 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const disconnectStripe = async () => {
    if (!university || !connectStatus?.is_connected) return;

    if (!confirm('Tem certeza que deseja desconectar sua conta Stripe? Isso desabilitará as transferências automáticas.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('disconnect-stripe-connect', {
        body: { university_id: university.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar status local
      await fetchStripeConnectStatus();
    } catch (error: any) {
      setError(error.message || 'Erro ao desconectar Stripe');
    } finally {
      setLoading(false);
    }
  };

  if (!university) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to access Stripe Connect"
      description="Finish setting up your university profile to connect with Stripe and receive payments"
    >
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Configuração do Stripe Connect
            </h1>
            <p className="text-gray-600">
              Conecte sua conta Stripe para receber pagamentos de application fees automaticamente
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Status da Conexão
              </h2>
              <button
                onClick={refreshStripeStatus}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {connectStatus?.is_connected ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <span className="text-green-700 font-medium">
                    Conta Stripe Conectada
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">ID da Conta</span>
                    </div>
                    <p className="text-sm text-gray-600 font-mono">
                      {connectStatus.account_id}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Status</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {connectStatus.charges_enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm text-gray-600">
                          {connectStatus.charges_enabled ? 'Cobranças habilitadas' : 'Cobranças pendentes'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {connectStatus.payouts_enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm text-gray-600">
                          {connectStatus.payouts_enabled ? 'Transferências habilitadas' : 'Transferências pendentes'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={disconnectStripe}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
                  >
                    Desconectar Conta
                  </button>
                  <a
                    href="https://dashboard.stripe.com/connect/accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Abrir Dashboard Stripe</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma conta Stripe conectada
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Conecte sua conta Stripe para receber pagamentos de application fees automaticamente. 
                  Você será redirecionado para o Stripe para autorizar a conexão.
                </p>
                <button
                  onClick={initiateStripeConnect}
                  disabled={loading}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                  <span>Conectar com Stripe</span>
                </button>
              </div>
            )}
          </div>

          {/* Benefits Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Benefícios do Stripe Connect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Transferências Automáticas</h3>
                <p className="text-sm text-gray-600">
                  Receba application fees diretamente na sua conta bancária
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Segurança Total</h3>
                <p className="text-sm text-gray-600">
                  Sua conta Stripe, seus dados, seu controle total
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Info className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Transparência</h3>
                <p className="text-sm text-gray-600">
                  Acompanhe todos os pagamentos no seu dashboard Stripe
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700 font-medium">Erro</span>
              </div>
              <p className="text-red-600 mt-2">{error}</p>
            </div>
          )}
        </div>
      </div>
    </ProfileCompletionGuard>
  );
};

export default StripeConnectSetup;
