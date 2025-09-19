import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MicrosoftEmailIntegration from '../../components/Microsoft/MicrosoftEmailIntegration';
import MsalProviderWrapper from '../../providers/MsalProvider';
import { Mail, ArrowLeft, Settings, Zap } from 'lucide-react';

interface EmailConfig {
  id: string;
  name: string;
  email_address: string;
  provider_type: 'gmail' | 'microsoft';
  is_active: boolean;
}

const UnifiedEmailInterface = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const compose = searchParams.get('compose') === 'true';
  
  const [loading, setLoading] = useState(true);
  const [userConfigs, setUserConfigs] = useState<EmailConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<EmailConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserConfigurations();
  }, []);

  const loadUserConfigurations = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate('/login');
        return;
      }

      const { data: configs, error } = await supabase
        .from('email_configurations')
        .select('id, name, email_address, provider_type, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        setError('Erro ao carregar configurações de email');
        return;
      }

      if (!configs || configs.length === 0) {
        setError('Nenhuma conta de email ativa encontrada');
        return;
      }

      setUserConfigs(configs);
      // Selecionar a primeira configuração como padrão
      setSelectedConfig(configs[0]);
      
    } catch (error) {
      console.error('Erro inesperado:', error);
      setError('Erro inesperado ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando suas contas de email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
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
            Voltar para configurações
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header unificado */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/school/dashboard/email')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Email Unificado
                </h1>
                <p className="text-sm text-gray-500">
                  {selectedConfig ? `${selectedConfig.name} (${selectedConfig.provider_type === 'microsoft' ? 'Microsoft' : 'Gmail'})` : 'Gerenciar emails'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Seletor de conta */}
              {userConfigs.length > 1 && (
                <select
                  value={selectedConfig?.id || ''}
                  onChange={(e) => {
                    const config = userConfigs.find(c => c.id === e.target.value);
                    setSelectedConfig(config || null);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {userConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} ({config.provider_type === 'microsoft' ? 'Microsoft' : 'Gmail'})
                    </option>
                  ))}
                </select>
              )}
              
              <button
                onClick={() => navigate('/school/dashboard/email/config')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Configurações"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedConfig ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione uma conta
            </h3>
            <p className="text-gray-500 mb-6">
              Escolha uma das suas contas de email para continuar
            </p>
          </div>
        ) : selectedConfig.provider_type === 'microsoft' ? (
          // Interface Microsoft (envolvida no MsalProvider)
          <MsalProviderWrapper>
            <MicrosoftEmailIntegration />
          </MsalProviderWrapper>
        ) : (
          // Interface Gmail adaptada com visual similar ao Microsoft
          <GmailInterfaceAdapted config={selectedConfig} showCompose={compose} />
        )}
      </main>
    </div>
  );
};

// Componente Gmail com visual adaptado para se parecer com Microsoft
const GmailInterfaceAdapted: React.FC<{ config: EmailConfig; showCompose: boolean }> = ({ config }) => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGmailEmails();
  }, [config.id]);

  const loadGmailEmails = async () => {
    try {
      // Carregar emails do Gmail da tabela received_emails
      const { data, error } = await supabase
        .from('received_emails')
        .select('*')
        .eq('email_config_id', config.id)
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Erro ao carregar emails Gmail:', error);
        return;
      }

      setEmails(data || []);
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando emails do Gmail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl">
      {/* Gmail interface adaptada */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gmail - {config.name}</h2>
              <p className="text-sm text-gray-600">{config.email_address}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-600">IMAP/SMTP</span>
          </div>
        </div>
      </div>

      {/* Lista de emails */}
      <div className="p-6">
        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum email encontrado
            </h3>
            <p className="text-gray-500">
              Os emails aparecerão aqui conforme chegarem na sua caixa de entrada
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email: any) => (
              <div
                key={email.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-900">
                        {email.from_name || email.from_address}
                      </span>
                      {!email.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    <h4 className="font-medium text-gray-800 mb-1">
                      {email.subject || '(Sem assunto)'}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {email.text_content || email.html_content?.replace(/<[^>]*>/g, '') || 'Conteúdo não disponível'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    {new Date(email.received_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedEmailInterface;