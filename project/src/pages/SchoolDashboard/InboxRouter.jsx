import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import EmailInbox from './EmailInbox'; // Gmail inbox
import MicrosoftInbox from '../../components/Microsoft/MicrosoftInbox'; // Microsoft inbox com tokens salvos

const InboxRouter = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configId = searchParams.get('config');
  
  const [loading, setLoading] = useState(true);
  const [providerType, setProviderType] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!configId) {
      // Se não há configId, redireciona para a lista de configurações
      navigate('/school/dashboard/email');
      return;
    }
    
    loadConfigurationInfo();
  }, [configId]);

  const loadConfigurationInfo = async () => {
    try {
      // Loading configuration info
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Erro de autenticação:', authError);
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('id, provider_type, name, email_address, is_active')
        .eq('id', configId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar configuração:', error);
        setError('Configuração não encontrada');
        return;
      }

      if (!data) {
        console.error('❌ Configuração não encontrada');
        setError('Configuração não encontrada');
        return;
      }

      if (!data.is_active) {
        setError('Esta configuração está inativa');
        return;
      }

      // Configuration loaded
      setProviderType(data.provider_type);
      
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      setError('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando caixa de entrada...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/school/dashboard/email')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar para lista de contas
          </button>
        </div>
      </div>
    );
  }

  // Renderizar o inbox apropriado baseado no provider
  if (providerType === 'microsoft') {
    return <MicrosoftInbox />;
  } else if (providerType === 'gmail') {
    return <EmailInbox />;
  } else {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-yellow-600 text-2xl">❓</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tipo não suportado</h2>
          <p className="text-gray-600 mb-6">
            O tipo de provedor "{providerType}" não é suportado por esta versão.
          </p>
          <button
            onClick={() => navigate('/school/dashboard/email')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Voltar para lista de contas
          </button>
        </div>
      </div>
    );
  }
};

export default InboxRouter;