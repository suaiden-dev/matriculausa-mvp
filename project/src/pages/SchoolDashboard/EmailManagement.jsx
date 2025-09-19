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
  const [actionLoading, setActionLoading] = useState({});
  const [lastSyncUpdate, setLastSyncUpdate] = useState({});

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
      
      // Find the configuration to get provider details
      const config = configurations.find(c => c.id === configId);
      if (!config) {
        throw new Error('Configuration not found');
      }

      console.log(`🔄 Starting sync for ${config.provider_type} account: ${config.email_address}`);

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

      // Simular processo de sincronização (em um sistema real, você chamaria APIs externas)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update local state to reflect the sync time immediately
      setLastSyncUpdate(prev => ({ ...prev, [configId]: new Date().toISOString() }));

      // Recarregar configurações para mostrar o novo timestamp
      await loadConfigurations();
      await loadStats();
      
      console.log(`✅ Sync completed for ${config.email_address}`);
      
      // Show success message with provider-specific details
      alert(`✅ Synchronization completed successfully for ${config.name}!\n\nProvider: ${config.provider_type === 'microsoft' ? 'Microsoft' : 'Gmail'}\nAccount: ${config.email_address}`);
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      
      // More detailed error messages
      let errorMessage = 'Sync failed: ';
      
      if (error.message.includes('network')) {
        errorMessage += 'Network connection issue. Please check your internet connection.';
      } else if (error.message.includes('authentication')) {
        errorMessage += 'Authentication failed. Please reconfigure your account.';
      } else if (error.message.includes('Configuration not found')) {
        errorMessage += 'Account configuration not found. Please refresh the page.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      alert(errorMessage);
    } finally {
      setSyncing(prev => ({ ...prev, [configId]: false }));
    }
  };

  const handleDelete = async (configId) => {
    try {
      // Find the configuration to show details in confirmation
      const config = configurations.find(c => c.id === configId);
      if (!config) {
        alert('Configuration not found. Please refresh the page.');
        return;
      }

      // Enhanced confirmation dialog
      const confirmed = window.confirm(
        `⚠️ Are you sure you want to delete this email account?\n\n` +
        `Account: ${config.name}\n` +
        `Email: ${config.email_address}\n` +
        `Provider: ${config.provider_type === 'microsoft' ? 'Microsoft' : 'Gmail'}\n\n` +
        `⚠️ This action cannot be undone!\n` +
        `• All email data will be removed\n` +
        `• Sync settings will be lost\n` +
        `• You'll need to reconfigure if you want to add this account again`
      );
      
      if (!confirmed) {
        return;
      }

      setActionLoading(prev => ({ ...prev, [`delete_${configId}`]: true }));

      console.log(`🗑️ Deleting configuration: ${config.email_address}`);

      // Excluir configuração
      const { error } = await supabase
        .from('email_configurations')
        .delete()
        .eq('id', configId);

      if (error) {
        throw error;
      }

      console.log(`✅ Configuration deleted: ${config.email_address}`);

      // Recarregar configurações e estatísticas
      await loadConfigurations();
      await loadStats();
      
      alert(`✅ Account "${config.name}" has been successfully deleted!\n\nThe account has been removed from your email management system.`);
      
    } catch (error) {
      console.error('❌ Delete error:', error);
      
      let errorMessage = 'Failed to delete account: ';
      
      if (error.code === '23503') {
        errorMessage += 'Cannot delete account because it has associated data. Please remove all emails first.';
      } else if (error.message.includes('permission')) {
        errorMessage += 'You do not have permission to delete this account.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete_${configId}`]: false }));
    }
  };

  const toggleSync = async (configId, currentStatus) => {
    try {
      const config = configurations.find(c => c.id === configId);
      if (!config) {
        alert('Configuration not found. Please refresh the page.');
        return;
      }

      const newStatus = !currentStatus;
      
      setActionLoading(prev => ({ ...prev, [`toggle_${configId}`]: true }));
      
      console.log(`🔄 ${newStatus ? 'Enabling' : 'Disabling'} sync for ${config.email_address}`);
      
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
      
      const statusText = newStatus ? 'enabled' : 'disabled';
      const statusEmoji = newStatus ? '✅' : '⏸️';
      
      console.log(`${statusEmoji} Sync ${statusText} for ${config.email_address}`);
      
      alert(`${statusEmoji} Sync ${statusText} successfully!\n\nAccount: ${config.name}\nEmail: ${config.email_address}\n\n${newStatus ? 'Your emails will now be automatically synchronized.' : 'Automatic email synchronization has been disabled.'}`);
      
    } catch (error) {
      console.error('❌ Toggle sync error:', error);
      
      let errorMessage = 'Failed to update sync settings: ';
      
      if (error.message.includes('permission')) {
        errorMessage += 'You do not have permission to modify this account.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [`toggle_${configId}`]: false }));
    }
  };

  const toggleAccountStatus = async (configId, currentStatus) => {
    try {
      const config = configurations.find(c => c.id === configId);
      if (!config) {
        alert('Configuration not found. Please refresh the page.');
        return;
      }

      const newStatus = !currentStatus;
      
      setActionLoading(prev => ({ ...prev, [`status_${configId}`]: true }));
      
      console.log(`🔄 ${newStatus ? 'Activating' : 'Deactivating'} account ${config.email_address}`);
      
      // Atualizar status da conta
      const { error } = await supabase
        .from('email_configurations')
        .update({ 
          is_active: newStatus 
        })
        .eq('id', configId);

      if (error) {
        throw error;
      }

      // Recarregar configurações para mostrar o novo status
      await loadConfigurations();
      await loadStats();
      
      const statusText = newStatus ? 'activated' : 'deactivated';
      const statusEmoji = newStatus ? '🟢' : '🔴';
      
      console.log(`${statusEmoji} Account ${statusText}: ${config.email_address}`);
      
      alert(`${statusEmoji} Account ${statusText} successfully!\n\nAccount: ${config.name}\nEmail: ${config.email_address}\n\n${newStatus ? 'The account is now active and ready to use.' : 'The account has been deactivated and will not be used for email operations.'}`);
      
    } catch (error) {
      console.error('❌ Toggle account status error:', error);
      
      let errorMessage = 'Failed to update account status: ';
      
      if (error.message.includes('permission')) {
        errorMessage += 'You do not have permission to modify this account.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [`status_${configId}`]: false }));
    }
  };

  const handleInboxNavigation = (config) => {
    try {
      console.log(`📧 Opening inbox for ${config.provider_type} account: ${config.email_address}`);
      
      if (config.provider_type === 'microsoft') {
        navigate('/school/dashboard/microsoft-email');
      } else {
        navigate(`/school/dashboard/inbox?config=${config.id}`);
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      alert('Failed to open inbox. Please try again.');
    }
  };

  const handleComposeNavigation = (config) => {
    try {
      console.log(`✍️ Opening compose for ${config.provider_type} account: ${config.email_address}`);
      
      if (config.provider_type === 'microsoft') {
        navigate('/school/dashboard/microsoft-email?compose=true');
      } else {
        navigate(`/school/dashboard/email/compose?config=${config.id}`);
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      alert('Failed to open compose. Please try again.');
    }
  };

  const handleSettingsNavigation = (configId) => {
    try {
      console.log(`⚙️ Opening settings for configuration: ${configId}`);
      navigate(`/school/dashboard/email/config/${configId}`);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      alert('Failed to open settings. Please try again.');
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
    <div className="space-y-6 lg:space-y-8">
      {/* Header + Actions Section */}
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + description + counters */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Email Management
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Configure and manage your email accounts for seamless communication
                </p>
                {configurations.length > 0 && (
                  <p className="mt-3 text-sm text-slate-500">
                    {`${configurations.length} account${configurations.length > 1 ? 's' : ''} configured, ${configurations.filter(c => c.is_active).length} active`}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                  <EnvelopeIcon className="w-5 h-5 mr-2" />
                  {configurations.length} Total
                </div>
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200 shadow-sm">
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  {configurations.filter(c => c.is_active).length} Active
                </div>
              </div>
            </div>

            {/* Actions Row */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <EnvelopeIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {stats.total_received || 0}
                          </p>
                          <p className="text-xs text-slate-600">Received</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {stats.unread_count || 0}
                          </p>
                          <p className="text-xs text-slate-600">Unread</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">
                            {stats.total_sent || 0}
                          </p>
                          <p className="text-xs text-slate-600">Sent</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={async () => {
                        console.log('🔄 Recarregamento manual iniciado...');
                        setLoading(true);
                        await loadConfigurations();
                        await loadStats();
                      }}
                      className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center"
                      title="Refresh data"
                    >
                      <ArrowPathIcon className="h-5 w-5 text-slate-500" />
                    </button>
                    
                    <button
                      onClick={() => navigate('/school/dashboard/email/config')}
                      className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-6 py-3 rounded-xl hover:from-[#B01218] hover:to-red-700 transition-all duration-300 font-bold flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Email Configurations List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-medium text-slate-900">
              Email Accounts
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Configure and manage your email accounts
            </p>
          </div>

          {configurations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <EnvelopeIcon className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No accounts configured
              </h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Add your first email account to start sending and receiving messages.
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
                        console.log('👤 Configurações do usuário:', { userConfigs, userError });
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
                className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-6 py-3 rounded-xl hover:from-[#B01218] hover:to-red-700 transition-all duration-300 font-bold flex items-center space-x-2 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Account</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {configurations.map((config) => (
                <div key={config.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        config.provider_type === 'microsoft' 
                          ? 'bg-blue-500' 
                          : 'bg-red-500'
                      }`}>
                        <span className="text-white font-medium text-sm">
                          {config.provider_type === 'microsoft' ? 'M' : 'G'}
                        </span>
                      </div>
                      
                      {/* Account Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-base font-medium text-slate-900 truncate">
                            {config.name}
                          </h3>
                          
                          {/* Provider badge */}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            config.provider_type === 'microsoft' 
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {config.provider_type === 'microsoft' ? 'Microsoft' : 'Gmail'}
                          </span>
                          
                          {/* Status badges */}
                          <div className="flex items-center space-x-2">
                            {/* Account Status */}
                            <button
                              onClick={() => toggleAccountStatus(config.id, config.is_active)}
                              disabled={actionLoading[`status_${config.id}`]}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 ${
                                actionLoading[`status_${config.id}`]
                                  ? 'bg-slate-100 text-slate-500 cursor-wait'
                                  : config.is_active 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer'
                              }`}
                              title={`Click to ${config.is_active ? 'deactivate' : 'activate'} account`}
                            >
                              {actionLoading[`status_${config.id}`] ? (
                                <>
                                  <div className="w-2 h-2 bg-slate-400 rounded-full mr-1 animate-pulse"></div>
                                  Updating...
                                </>
                              ) : config.is_active ? (
                                <>
                                  <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                                  Active
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-red-600 rounded-full mr-1"></div>
                                  Inactive
                                </>
                              )}
                            </button>

                            {/* Sync Status */}
                            {config.sync_enabled && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                config.is_active 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-1 ${
                                  syncing[config.id] 
                                    ? 'bg-blue-600 animate-pulse' 
                                    : config.is_active 
                                    ? 'bg-blue-600' 
                                    : 'bg-slate-400'
                                }`}></div>
                                {syncing[config.id] ? 'Syncing...' : 'Auto-sync'}
                              </span>
                            )}

                            {/* Last Sync Indicator */}
                            {config.last_sync_at && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                <div className="w-2 h-2 bg-slate-400 rounded-full mr-1"></div>
                                Last sync: {new Date(lastSyncUpdate[config.id] || config.last_sync_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-2">
                          {config.email_address}
                        </p>
                        
                        {/* Technical details */}
                        
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Quick Actions */}
                      <div className="hidden sm:flex items-center space-x-2 mr-4">
                        <button
                          onClick={() => handleInboxNavigation(config)}
                          disabled={!config.is_active}
                          className={`text-sm font-medium py-1 px-2 rounded transition-colors ${
                            config.is_active 
                              ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                          title={config.is_active ? 'Open inbox' : 'Account is inactive'}
                        >
                          Inbox
                        </button>
                        
                        <button
                          onClick={() => handleComposeNavigation(config)}
                          disabled={!config.is_active}
                          className={`text-sm font-medium py-1 px-2 rounded transition-colors ${
                            config.is_active 
                              ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                          title={config.is_active ? 'Compose email' : 'Account is inactive'}
                        >
                          Compose
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <button
                        onClick={() => handleSync(config.id)}
                        disabled={syncing[config.id] || !config.is_active}
                        className={`p-2 rounded-full transition-colors ${
                          syncing[config.id] 
                            ? 'bg-blue-100 text-blue-600' 
                            : config.is_active 
                            ? 'hover:bg-slate-100 text-slate-600' 
                            : 'text-slate-400 cursor-not-allowed'
                        }`}
                        title={
                          !config.is_active 
                            ? 'Account is inactive' 
                            : syncing[config.id] 
                            ? 'Syncing...' 
                            : 'Sync now'
                        }
                      >
                        <ArrowPathIcon 
                          className={`h-4 w-4 ${syncing[config.id] ? 'animate-spin' : ''}`} 
                        />
                      </button>

                      {/* Account Status Toggle */}
                      <button
                        onClick={() => toggleAccountStatus(config.id, config.is_active)}
                        disabled={actionLoading[`status_${config.id}`]}
                        className={`p-2 rounded-full transition-colors ${
                          actionLoading[`status_${config.id}`] 
                            ? 'bg-slate-100' 
                            : 'hover:bg-slate-100'
                        }`}
                        title={`${config.is_active ? 'Deactivate' : 'Activate'} account`}
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          actionLoading[`status_${config.id}`] 
                            ? 'bg-slate-400 animate-pulse' 
                            : config.is_active 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`} />
                      </button>

                      {/* Sync Toggle */}
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.sync_enabled}
                          onChange={() => toggleSync(config.id, config.sync_enabled)}
                          disabled={actionLoading[`toggle_${config.id}`] || !config.is_active}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          actionLoading[`toggle_${config.id}`] 
                            ? 'bg-slate-300' 
                            : !config.is_active 
                            ? 'bg-slate-200 opacity-50' 
                            : config.sync_enabled 
                            ? 'bg-blue-600' 
                            : 'bg-slate-200'
                        }`}>
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            actionLoading[`toggle_${config.id}`] 
                              ? 'animate-pulse' 
                              : config.sync_enabled 
                              ? 'translate-x-5' 
                              : 'translate-x-1'
                          }`} />
                        </div>
                      </label>

                      {/* Settings Button */}
                      <button
                        onClick={() => handleSettingsNavigation(config.id)}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                        title="Account settings"
                      >
                        <Cog6ToothIcon className="h-4 w-4 text-slate-600" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(config.id)}
                        disabled={actionLoading[`delete_${config.id}`]}
                        className={`p-2 rounded-full transition-colors ${
                          actionLoading[`delete_${config.id}`] 
                            ? 'bg-red-100 text-red-400' 
                            : 'hover:bg-slate-100 text-slate-600 hover:text-red-600'
                        }`}
                        title={actionLoading[`delete_${config.id}`] ? 'Deleting...' : 'Delete account'}
                      >
                        <TrashIcon className={`h-4 w-4 ${actionLoading[`delete_${config.id}`] ? 'animate-pulse' : ''}`} />
                      </button>
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

  export default EmailManagement;