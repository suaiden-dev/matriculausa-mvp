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
// emailService removido - funcionalidade desabilitada
import { supabase } from '../../lib/supabase';

const Inbox = () => {
  const navigate = useNavigate();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

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
      console.error('Auth check failed:', error);
      navigate('/login');
    }
  };

  const loadConfigurations = async () => {
    // Interface apenas - funcionalidade removida
    setConfigurations([]);
    setLoading(false);
  };

  const loadStats = async () => {
    // Interface apenas - funcionalidade removida
    setStats({});
  };

  const handleSync = async (configId) => {
    // Interface apenas - funcionalidade removida
    alert('Funcionalidade de sincronização foi removida. Esta é apenas uma interface visual.');
  };

  const handleDelete = async (configId) => {
    // Interface apenas - funcionalidade removida
    alert('Funcionalidade de exclusão foi removida. Esta é apenas uma interface visual.');
  };

  const toggleSync = async (configId, currentStatus) => {
    // Interface apenas - funcionalidade removida
    alert('Funcionalidade de alteração foi removida. Esta é apenas uma interface visual.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            Gerenciamento de Emails
          </h1>
          <p className="text-gray-600 mt-2">
            Configure suas contas de email para envio e recebimento automático
          </p>
        </div>
        
        <button
          onClick={() => navigate('/school/dashboard/email/inbox/config')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Nova Configuração
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Emails Recebidos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total_received || 0}
              </p>
            </div>
          </div>
                  </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">!</span>
                      </div>
                    </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Não Lidos</p>
              <p className="text-2xl font-semibold text-orange-600">
                {stats.unread_count || 0}
              </p>
            </div>
          </div>
                </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
                  <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">↗</span>
                    </div>
                  </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Emails Enviados</p>
              <p className="text-2xl font-semibold text-green-600">
                {stats.total_sent || 0}
              </p>
            </div>
          </div>
          </div>
              </div>
            
      {/* Configurations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Configurações de Email
          </h2>
                  </div>
                  
        {configurations.length === 0 ? (
          <div className="text-center py-12">
            <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhuma configuração encontrada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando sua primeira configuração de email.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/school/dashboard/inbox/config')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Nova Configuração
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {configurations.map((config) => (
              <div key={config.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {config.name}
                      </h3>
                      
                      {config.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircleIcon className="h-3 w-3 mr-1" />
                          Inativo
                        </span>
                      )}

                      {config.sync_enabled && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Sync Ativo
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {config.email_address}
                    </p>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      <p>SMTP: {config.smtp_host}:{config.smtp_port}</p>
                      <p>IMAP: {config.imap_host}:{config.imap_port}</p>
                      {config.last_sync_at && (
                        <p className="mt-1">
                          Última sincronização: {new Date(config.last_sync_at).toLocaleString('pt-BR')}
                        </p>
                      )}
            </div>
          </div>

                  <div className="flex items-center gap-2">
                    {/* Quick Actions */}
                    <div className="flex gap-2 mr-4">
                      <button
                        onClick={() => navigate(`/school/dashboard/inbox?config=${config.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver Emails
                      </button>
                      
                      <button
                        onClick={() => navigate(`/school-dashboard/email/compose?config=${config.id}`)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Compor
                      </button>
                    </div>

                    {/* Sync Button */}
                    <button
                      onClick={() => handleSync(config.id)}
                      disabled={syncing[config.id]}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
                      title="Sincronizar agora"
                    >
                      <ArrowPathIcon 
                        className={`h-5 w-5 ${syncing[config.id] ? 'animate-spin' : ''}`} 
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
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.sync_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.sync_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </label>

                    {/* Settings Button */}
                    <button
                      onClick={() => navigate(`/school-dashboard/email/config/${config.id}`)}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                      title="Configurações"
                    >
                      <Cog6ToothIcon className="h-5 w-5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                      title="Excluir"
                    >
                      <TrashIcon className="h-5 w-5" /> 
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

export default Inbox; 