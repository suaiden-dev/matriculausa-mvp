import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  EnvelopeIcon, 
  PlusIcon, 
  Cog6ToothIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const EmailManagement = () => {
  console.log('🎬 EmailManagement componente renderizado');
  
  const navigate = useNavigate();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    console.log('🚀 EmailManagement useEffect executado');
    checkAuthAndLoad();
  }, []);

  // Recarregar dados quando o usuário retornar à tela
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Foco na janela detectado, recarregando...');
      if (!loading) {
        loadConfigurations();
        loadStats();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading]);

  const checkAuthAndLoad = async () => {
    try {
      console.log('🔐 Verificando autenticação...');
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Usuário autenticado:', user?.id, user?.email);
      
      if (!user) {
        console.log('❌ Usuário não autenticado, redirecionando para login');
        navigate('/login');
        return;
      }
      
      console.log('✅ Usuário autenticado, carregando configurações...');
      await loadConfigurations();
      await loadStats();
    } catch (error) {
      console.error('❌ Erro na verificação de auth:', error);
      navigate('/login');
    }
  };

  const loadConfigurations = async () => {
    try {
      console.log('🔍 Iniciando carregamento de configurações...');
      
      // Obter o usuário atual
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      console.log('👤 Dados de autenticação:', { user: user?.id, email: user?.email, authError });
      
      if (authError) {
        console.error('❌ Erro de autenticação:', authError);
        throw new Error('Erro de autenticação');
      }
      
      if (!user) {
        console.error('❌ Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      console.log('🔍 Buscando configurações para o usuário:', user.id, 'email:', user.email);

      // Buscar configurações do usuário
      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('📊 Resultado da consulta:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ Erro na consulta:', error);
        throw error;
      }

      console.log('✅ Configurações encontradas:', data);
      setConfigurations(data || []);
      
      // Debug adicional: verificar se há configurações para este email
      if (!data || data.length === 0) {
        console.log('⚠️ Nenhuma configuração encontrada por user_id. Verificando se há configurações para este email...');
        
        const { data: emailConfigs, error: emailError } = await supabase
          .from('email_configurations')
          .select('*')
          .eq('email_address', user.email);
          
        console.log('📧 Configurações por email:', { emailConfigs, emailError });
        
        // Se encontrou configurações por email, usar elas
        if (emailConfigs && emailConfigs.length > 0) {
          console.log('✅ Usando configurações encontradas por email');
          setConfigurations(emailConfigs);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      setConfigurations([]);
      
      // Mostrar erro para o usuário apenas se não for erro de autenticação
      if (!error.message.includes('autenticado') && !error.message.includes('autenticação')) {
        alert('Erro ao carregar configurações: ' + (error.message || 'Erro desconhecido'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // Buscar configurações do usuário para obter os IDs
      const { data: configs } = await supabase
        .from('email_configurations')
        .select('id')
        .eq('user_id', user.id);

      if (!configs || configs.length === 0) {
        setStats({
          total_received: 0,
          unread_count: 0,
          total_sent: 0
        });
        return;
      }

      const configIds = configs.map(config => config.id);

      // Buscar estatísticas de emails recebidos
      const { data: receivedData } = await supabase
        .from('received_emails')
        .select('id, is_read')
        .in('email_config_id', configIds);

      // Buscar estatísticas de emails enviados
      const { data: sentData } = await supabase
        .from('sent_emails')
        .select('id')
        .in('email_config_id', configIds);

      // Calcular estatísticas
      const totalReceived = receivedData?.length || 0;
      const unreadCount = receivedData?.filter(email => !email.is_read).length || 0;
      const totalSent = sentData?.length || 0;

      setStats({
        total_received: totalReceived,
        unread_count: unreadCount,
        total_sent: totalSent
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStats({
        total_received: 0,
        unread_count: 0,
        total_sent: 0
      });
    }
  };

  const handleSync = async (configId) => {
    try {
      setSyncing(prev => ({ ...prev, [configId]: true }));

      // Atualizar timestamp da última sincronização
      const { error } = await supabase
        .from('email_configurations')
        .update({ 
          last_sync_at: new Date().toISOString() 
        })
        .eq('id', configId);

      if (error) {
        throw error;
      }

      // Recarregar configurações para mostrar o novo timestamp
      await loadConfigurations();
      
      alert('Sincronização iniciada com sucesso!');
    } catch (error) {
      console.error('Erro na sincronização:', error);
      alert('Erro ao iniciar sincronização: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSyncing(prev => ({ ...prev, [configId]: false }));
    }
  };

  const handleDelete = async (configId) => {
    try {
      // Confirmar exclusão
      const confirmed = window.confirm(
        'Tem certeza que deseja excluir esta configuração de email? Esta ação não pode ser desfeita.'
      );
      
      if (!confirmed) {
        return;
      }

      // Excluir configuração
      const { error } = await supabase
        .from('email_configurations')
        .delete()
        .eq('id', configId);

      if (error) {
        throw error;
      }

      // Recarregar configurações e estatísticas
      await loadConfigurations();
      await loadStats();
      
      alert('Configuração excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir configuração:', error);
      alert('Erro ao excluir configuração: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const toggleSync = async (configId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      
      // Atualizar status de sincronização
      const { error } = await supabase
        .from('email_configurations')
        .update({ 
          sync_enabled: newStatus 
        })
        .eq('id', configId);

      if (error) {
        throw error;
      }

      // Recarregar configurações para mostrar o novo status
      await loadConfigurations();
      
      const statusText = newStatus ? 'habilitada' : 'desabilitada';
      alert(`Sincronização ${statusText} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar sincronização:', error);
      alert('Erro ao alterar sincronização: ' + (error.message || 'Erro desconhecido'));
    }
  };

  if (loading) {
    console.log('⏳ Mostrando tela de carregamento...');
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        <div className="ml-4">
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gmail-style Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">M</span>
              </div>
              <div>
                <h1 className="text-xl font-normal text-gray-900">Email</h1>
                <p className="text-sm text-gray-500">
                  Gerencie suas contas de email
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={async () => {
                  console.log('🔄 Recarregamento manual iniciado...');
                  setLoading(true);
                  await loadConfigurations();
                  await loadStats();
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Atualizar"
              >
                <ArrowPathIcon className="h-5 w-5 text-gray-600" />
              </button>
              
              <button
                onClick={() => navigate('/school/dashboard/email/config')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Adicionar conta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Gmail-style Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <EnvelopeIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.total_received || 0}
                </p>
                <p className="text-sm text-gray-600">Emails recebidos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.unread_count || 0}
                </p>
                <p className="text-sm text-gray-600">Não lidos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.total_sent || 0}
                </p>
                <p className="text-sm text-gray-600">Emails enviados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gmail-style Configurations List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              Contas de email
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure e gerencie suas contas de email
            </p>
          </div>

          {configurations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma conta configurada
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Adicione sua primeira conta de email para começar a enviar e receber mensagens.
              </p>
              
              {/* Debug info - apenas em desenvolvimento */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left max-w-lg mx-auto">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Info:</h4>
                  <p className="text-xs text-yellow-700">
                    Verifique o console do navegador para logs detalhados sobre a busca de configurações.
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Se você criou uma configuração mas ela não aparece aqui, pode ser um problema de autenticação ou RLS.
                  </p>
                  <button
                    onClick={async () => {
                      console.log('🔧 Teste de debug iniciado...');
                      const { data: { user } } = await supabase.auth.getUser();
                      console.log('👤 Usuário atual:', user);
                      
                      // Testar consulta direta
                      const { data, error } = await supabase
                        .from('email_configurations')
                        .select('*');
                      console.log('📊 Todas as configurações:', { data, error });
                      
                      // Testar consulta por user_id
                      if (user) {
                        const { data: userConfigs, error: userError } = await supabase
                          .from('email_configurations')
                          .select('*')
                          .eq('user_id', user.id);
                        console.log('� Configurações do usuário:', { userConfigs, userError });
                      }
                    }}
                    className="mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                  >
                    Teste de Debug
                  </button>
                </div>
              )}
              
              <button
                onClick={() => navigate('/school/dashboard/email/config')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-colors flex items-center space-x-2 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Adicionar conta</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {configurations.map((config) => (
                <div key={config.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm">
                          {config.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Account Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-base font-medium text-gray-900 truncate">
                            {config.name}
                          </h3>
                          
                          {/* Status badges */}
                          <div className="flex items-center space-x-2">
                            {config.is_active ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                Inativa
                              </span>
                            )}

                            {config.sync_enabled && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Sincronização ativa
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {config.email_address}
                        </p>
                        
                        {/* Technical details */}
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span>SMTP: {config.smtp_host}:{config.smtp_port}</span>
                            <span>IMAP: {config.imap_host}:{config.imap_port}</span>
                          </div>
                          {config.last_sync_at && (
                            <p>
                              Última sincronização: {new Date(config.last_sync_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Quick Actions */}
                      <div className="hidden sm:flex items-center space-x-2 mr-4">
                        <button
                          onClick={() => navigate(`/school/dashboard/email/inbox?config=${config.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium py-1 px-2 rounded hover:bg-blue-50 transition-colors"
                        >
                          Caixa de entrada
                        </button>
                        
                        <button
                          onClick={() => navigate(`/school/dashboard/email/compose?config=${config.id}`)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium py-1 px-2 rounded hover:bg-green-50 transition-colors"
                        >
                          Escrever
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <button
                        onClick={() => handleSync(config.id)}
                        disabled={syncing[config.id]}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                        title="Sincronizar agora"
                      >
                        <ArrowPathIcon 
                          className={`h-4 w-4 text-gray-600 ${syncing[config.id] ? 'animate-spin' : ''}`} 
                        />
                      </button>

                      {/* Sync Toggle */}
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.sync_enabled}
                          onChange={() => toggleSync(config.id, config.sync_enabled)}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config.sync_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${config.sync_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </label>

                      {/* Settings Button */}
                      <button
                        onClick={() => navigate(`/school/dashboard/email/config/${config.id}`)}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Configurações"
                      >
                        <Cog6ToothIcon className="h-4 w-4 text-gray-600" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="Excluir"
                      >
                        <TrashIcon className="h-4 w-4 text-gray-600 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailManagement;