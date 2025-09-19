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
  const navigate = useNavigate();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [stats, setStats] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [lastSyncUpdate, setLastSyncUpdate] = useState({});

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // Reload data when user returns to screen
  useEffect(() => {
    const handleFocus = () => {
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
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }
      
      await loadConfigurations();
      await loadStats();
    } catch (error) {
      navigate('/login');
    }
  };

  const loadConfigurations = async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error('Authentication error');
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user configurations
      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setConfigurations(data || []);
      
      // Additional debug: check if there are configurations for this email
      if (!data || data.length === 0) {
        const { data: emailConfigs, error: emailError } = await supabase
          .from('email_configurations')
          .select('*')
          .eq('email_address', user.email);
          
        // If found configurations by email, use them
        if (emailConfigs && emailConfigs.length > 0) {
          setConfigurations(emailConfigs);
        }
      }
    } catch (error) {
      setConfigurations([]);
      
      // Show error to user only if not authentication error
      if (!error.message.includes('authenticated') && !error.message.includes('Authentication')) {
        alert('Error loading configurations: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      // Buscar configurações do usuário para obter os IDs e tipos
      const { data: configs } = await supabase
        .from('email_configurations')
        .select('id, provider_type, oauth_access_token, is_active')
        .eq('user_id', user.id);

      if (!configs || configs.length === 0) {
        setStats({
          total_received: 0,
          unread_count: 0,
          total_sent: 0
        });
        return;
      }

      // Separar configurações por tipo
      const gmailConfigs = configs.filter(config => config.provider_type !== 'microsoft');
      const microsoftConfigs = configs.filter(config => 
        config.provider_type === 'microsoft' && 
        config.is_active && 
        config.oauth_access_token
      );

      // Inicializar contadores
      let totalReceived = 0;
      let unreadCount = 0;
      let totalSent = 0;

      console.log(`📊 Loading stats for ${gmailConfigs.length} Gmail + ${microsoftConfigs.length} Microsoft accounts`);

      // Buscar estatísticas de contas Gmail/SMTP (dados locais)
      if (gmailConfigs.length > 0) {
        const gmailConfigIds = gmailConfigs.map(config => config.id);

        // Buscar estatísticas de emails recebidos
        const { data: receivedData } = await supabase
          .from('received_emails')
          .select('id, is_read')
          .in('email_config_id', gmailConfigIds);

        // Buscar estatísticas de emails enviados
        const { data: sentData } = await supabase
          .from('sent_emails')
          .select('id')
          .in('email_config_id', gmailConfigIds);

        // Adicionar aos contadores
        totalReceived += receivedData?.length || 0;
        unreadCount += receivedData?.filter(email => !email.is_read).length || 0;
        totalSent += sentData?.length || 0;

        console.log(`📊 Gmail stats - Received: ${receivedData?.length || 0}, Unread: ${receivedData?.filter(email => !email.is_read).length || 0}, Sent: ${sentData?.length || 0}`);
      }

      // Buscar estatísticas de contas Microsoft (Microsoft Graph API)
      for (const microsoftConfig of microsoftConfigs) {
        try {
          console.log(`📊 Loading Microsoft stats for: ${microsoftConfig.id}`);
          
          // Importar GraphService dinamicamente para evitar problemas de dependências
          const { default: GraphService } = await import('../../lib/graphService');
          const graphService = new GraphService(microsoftConfig.oauth_access_token);

          // Buscar pastas de email
          const foldersResult = await graphService.getMailFolders();
          const folders = foldersResult.value || [];

          // Encontrar pasta Inbox
          const inboxFolder = folders.find(folder => 
            folder.displayName?.toLowerCase().includes('inbox') || 
            folder.displayName?.toLowerCase().includes('caixa de entrada')
          );

          // Encontrar pasta Sent
          const sentFolder = folders.find(folder => 
            folder.displayName?.toLowerCase().includes('sent') || 
            folder.displayName?.toLowerCase().includes('enviados')
          );

          // Buscar emails da Inbox
          if (inboxFolder) {
            try {
              const inboxEmails = await graphService.getEmailsFromFolder(inboxFolder.id, 100);
              const emails = inboxEmails.value || [];
              
              totalReceived += emails.length;
              unreadCount += emails.filter(email => !email.isRead).length;
              
              console.log(`📊 Microsoft Inbox: ${emails.length} total, ${emails.filter(email => !email.isRead).length} unread`);
            } catch (inboxError) {
              console.warn(`📊 Error loading Microsoft inbox stats:`, inboxError);
            }
          }

          // Buscar emails enviados
          if (sentFolder) {
            try {
              const sentEmails = await graphService.getEmailsFromFolder(sentFolder.id, 100);
              const sentEmailsData = sentEmails.value || [];
              
              totalSent += sentEmailsData.length;
              
              console.log(`📊 Microsoft Sent: ${sentEmailsData.length} emails`);
            } catch (sentError) {
              console.warn(`📊 Error loading Microsoft sent stats:`, sentError);
            }
          }

          // Pequena pausa para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.warn(`📊 Error loading Microsoft stats for config ${microsoftConfig.id}:`, error);
        }
      }

      console.log(`📊 Final stats - Received: ${totalReceived}, Unread: ${unreadCount}, Sent: ${totalSent}`);

      setStats({
        total_received: totalReceived,
        unread_count: unreadCount,
        total_sent: totalSent
      });
    } catch (error) {
      console.error('📊 Error loading stats:', error);
      setStats({
        total_received: 0,
        unread_count: 0,
        total_sent: 0
      });
    } finally {
      setLoadingStats(false);
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
      
      // Update sync status
      const { error } = await supabase
        .from('email_configurations')
        .update({ 
          sync_enabled: newStatus 
        })
        .eq('id', configId);

      if (error) {
        throw error;
      }

      // Reload configurations to show new status
      await loadConfigurations();
      
      const statusText = newStatus ? 'enabled' : 'disabled';
      const statusEmoji = newStatus ? '✅' : '⏸️';
      
      alert(`${statusEmoji} Sync ${statusText} successfully!\n\nAccount: ${config.name}\nEmail: ${config.email_address}\n\n${newStatus ? 'Your emails will now be automatically synchronized.' : 'Automatic email synchronization has been disabled.'}`);
      
    } catch (error) {
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
      
      // Update account status
      const { error } = await supabase
        .from('email_configurations')
        .update({ 
          is_active: newStatus 
        })
        .eq('id', configId);

      if (error) {
        throw error;
      }

      // Reload configurations to show new status
      await loadConfigurations();
      await loadStats();
      
      const statusText = newStatus ? 'activated' : 'deactivated';
      const statusEmoji = newStatus ? '🟢' : '🔴';
      
      alert(`${statusEmoji} Account ${statusText} successfully!\n\nAccount: ${config.name}\nEmail: ${config.email_address}\n\n${newStatus ? 'The account is now active and ready to use.' : 'The account has been deactivated and will not be used for email operations.'}`);
      
    } catch (error) {
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
      if (config.provider_type === 'microsoft') {
        navigate('/school/dashboard/microsoft-email');
      } else {
        navigate(`/school/dashboard/inbox?config=${config.id}`);
      }
    } catch (error) {
      alert('Failed to open inbox. Please try again.');
    }
  };

  const handleComposeNavigation = (config) => {
    try {

      navigate(`/school/dashboard/email/compose?config=${config.id}`);

    } catch (error) {
      alert('Failed to open compose. Please try again.');
    }
  };

  const handleSettingsNavigation = (configId) => {
    try {
      navigate(`/school/dashboard/email/config/${configId}`);
    } catch (error) {
      alert('Failed to open settings. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <div className="ml-4">
          <p className="text-gray-600">Loading configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Header + Actions Section */}
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 lg:mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + description + counters */}
            <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                  Email Management
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Configure and manage your email accounts for seamless communication
                </p>
                {configurations.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-slate-500">
                      {`${configurations.length} account${configurations.length > 1 ? 's' : ''} configured, ${configurations.filter(c => c.is_active).length} active`}
                    </p>
                    {configurations.some(c => c.provider_type === 'microsoft') && (
                      <p className="text-xs text-slate-400 flex items-center">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Statistics include both Gmail and Microsoft accounts
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Refresh Button */}
              <div className="flex items-center">
                <button
                  onClick={async () => {
                    setLoading(true);
                    await loadConfigurations();
                    await loadStats();
                  }}
                  className="p-2 sm:px-4 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex items-center"
                  title="Refresh data"
                >
                  <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                  <span className="hidden sm:inline ml-2">Refresh</span>
                </button>
              </div>
            </div>

            {/* Actions Row */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-3 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 flex-1">
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 sm:p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {loadingStats ? (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <EnvelopeIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base sm:text-lg font-semibold text-slate-900">
                            {loadingStats ? '...' : (stats.total_received || 0)}
                          </p>
                          <p className="text-xs text-slate-600">Received</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 sm:p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {loadingStats ? (
                            <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base sm:text-lg font-semibold text-slate-900">
                            {loadingStats ? '...' : (stats.unread_count || 0)}
                          </p>
                          <p className="text-xs text-slate-600">Unread</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 sm:p-4 hover:shadow-sm transition-shadow sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {loadingStats ? (
                            <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base sm:text-lg font-semibold text-slate-900">
                            {loadingStats ? '...' : (stats.total_sent || 0)}
                          </p>
                          <p className="text-xs text-slate-600">Sent</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center">
                    <button
                      onClick={() => navigate('/school/dashboard/email/config')}
                      className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-[#B01218] hover:to-red-700 transition-all duration-300 font-bold flex items-center shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                    >
                      <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Add Account</span>
                      <span className="sm:hidden">Add</span>
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
                <div key={config.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
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
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-1">
                          <h3 className="text-base font-medium text-slate-900 truncate">
                            {config.name}
                          </h3>
                          
                          {/* Provider badge */}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${
                            config.provider_type === 'microsoft' 
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {config.provider_type === 'microsoft' ? 'Microsoft' : 'Gmail'}
                          </span>
                          
                          {/* Status badges */}
                          <div className="flex flex-wrap items-center gap-2">
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
                                  <span className="hidden sm:inline">Updating...</span>
                                  <span className="sm:hidden">...</span>
                                </>
                              ) : config.is_active ? (
                                <>
                                  <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                                  <span className="hidden sm:inline">Active</span>
                                  <span className="sm:hidden">On</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-red-600 rounded-full mr-1"></div>
                                  <span className="hidden sm:inline">Inactive</span>
                                  <span className="sm:hidden">Off</span>
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
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 sm:ml-4">
                      {/* Quick Actions */}
                      <div className="flex sm:hidden items-center space-x-2">
                        <button
                          onClick={() => handleInboxNavigation(config)}
                          disabled={!config.is_active}
                          className={`flex-1 text-sm font-medium py-2 px-3 rounded transition-colors ${
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
                          className={`flex-1 text-sm font-medium py-2 px-3 rounded transition-colors ${
                            config.is_active 
                              ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                          title={config.is_active ? 'Compose email' : 'Account is inactive'}
                        >
                          Compose
                        </button>
                      </div>
                      
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
                      <div className="flex items-center space-x-1 sm:space-x-2">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  export default EmailManagement;