import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  FlagIcon,
  TrashIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

const EmailInbox = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const configId = searchParams.get('config');
  
  const [emails, setEmails] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(configId || '');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      loadEmails();
    }
  }, [selectedConfig, filter, page]);

  const loadConfigurations = async () => {
    try {
      console.log('🔍 Carregando configurações de email...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Erro de autenticação:', authError);
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        throw error;
      }

      console.log('✅ Configurações carregadas:', data);
      setConfigurations(data || []);
      
      // Se configId foi passado via URL, selecionar automaticamente
      if (configId && data?.find(c => c.id === configId)) {
        setSelectedConfig(configId);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      setConfigurations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    if (!selectedConfig) {
      setEmails([]);
      setLoading(false);
      return;
    }

    try {
      console.log('📧 Carregando emails para configuração:', selectedConfig);
      setLoading(true);

      let query = supabase
        .from('received_emails')
        .select('*')
        .eq('email_config_id', selectedConfig)
        .eq('is_deleted', false)
        .order('received_date', { ascending: false })
        .limit(20 * page);

      // Aplicar filtros
      if (filter === 'read') {
        query = query.eq('is_read', true);
      } else if (filter === 'unread') {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao carregar emails:', error);
        throw error;
      }

      console.log('✅ Emails carregados:', data?.length || 0);
      setEmails(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedConfig) return;
    
    try {
      console.log('🔄 Sincronizando emails...');
      setSyncing(true);
      
      // Recarregar emails
      await loadEmails();
      
      console.log('✅ Sincronização concluída');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      alert('Erro ao sincronizar emails');
    } finally {
      setSyncing(false);
    }
  };

  const markAsRead = async (emailId, isRead = true) => {
    try {
      console.log('📧 Marcando email como lido:', emailId, isRead);
      
      const { error } = await supabase
        .from('received_emails')
        .update({ is_read: isRead })
        .eq('id', emailId);

      if (error) {
        console.error('❌ Erro ao marcar email:', error);
        throw error;
      }

      // Atualizar estado local
      setEmails(prevEmails => 
        prevEmails.map(email => 
          email.id === emailId ? { ...email, is_read: isRead } : email
        )
      );

      // Atualizar email selecionado se for o mesmo
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, is_read: isRead } : null);
      }

      console.log('✅ Email marcado como lido');
    } catch (error) {
      console.error('❌ Erro ao marcar email como lido:', error);
      alert('Erro ao marcar email como lido');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const selectedConfigData = configurations.find(c => c.id === selectedConfig);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gmail-style Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/school/dashboard/email')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">M</span>
                </div>
                <div>
                  <h1 className="text-xl font-normal text-gray-900">Caixa de entrada</h1>
                  {selectedConfigData && (
                    <p className="text-sm text-gray-500">
                      {selectedConfigData.email_address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/school/dashboard/email/compose?config=${selectedConfig}`)}
                disabled={!selectedConfig}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <PencilSquareIcon className="h-4 w-4" />
                <span>Escrever</span>
              </button>
              
              <button
                onClick={handleSync}
                disabled={syncing || !selectedConfig}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Atualizar"
              >
                <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7rem)]">
          {/* Gmail-style Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
            {/* Account Selector */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conta de email
                </label>
                <select
                  value={selectedConfig}
                  onChange={(e) => {
                    setSelectedConfig(e.target.value);
                    setPage(1);
                    setSelectedEmail(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione uma conta</option>
                  {configurations.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gmail-style Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <nav className="space-y-1 p-2">
                {[
                  { 
                    value: 'all', 
                    label: 'Todas as conversas', 
                    icon: EnvelopeIcon,
                    count: emails.length 
                  },
                  { 
                    value: 'unread', 
                    label: 'Não lidas', 
                    icon: EnvelopeIcon,
                    count: emails.filter(e => !e.is_read).length 
                  },
                  { 
                    value: 'read', 
                    label: 'Lidas', 
                    icon: EnvelopeOpenIcon,
                    count: emails.filter(e => e.is_read).length 
                  }
                ].map(({ value, label, icon: Icon, count }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setFilter(value);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      filter === value 
                        ? 'bg-red-100 text-red-700 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    {selectedConfig && count > 0 && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        filter === value 
                          ? 'bg-red-200 text-red-800' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Gmail-style Email List */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading && page === 1 ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Carregando...</span>
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <EnvelopeIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedConfig ? 'Nenhum email encontrado' : 'Selecione uma conta'}
                </h3>
                <p className="text-gray-500">
                  {selectedConfig ? 'Tente sincronizar os emails ou verifique os filtros.' : 'Escolha uma conta de email para visualizar as mensagens.'}
                </p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {/* Email Items */}
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.is_read) {
                        markAsRead(email.id);
                      }
                    }}
                    className={`relative border-b border-gray-100 cursor-pointer transition-colors hover:shadow-sm ${
                      !email.is_read ? 'bg-white' : 'bg-gray-50'
                    } ${selectedEmail?.id === email.id ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-start space-x-3">
                        {/* Unread indicator */}
                        <div className="flex-shrink-0 pt-1">
                          {!email.is_read ? (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          ) : (
                            <div className="w-2 h-2"></div>
                          )}
                        </div>
                        
                        {/* Email content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm truncate ${
                              !email.is_read ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'
                            }`}>
                              {email.from_name || email.from_address}
                            </p>
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatDate(email.received_date)}
                            </span>
                          </div>
                          
                          <p className={`text-sm mb-1 ${
                            !email.is_read ? 'font-medium text-gray-900' : 'text-gray-700'
                          }`}>
                            {email.subject || '(Sem assunto)'}
                          </p>
                          
                          <p className="text-sm text-gray-600 truncate">
                            {email.text_content || 'Sem prévia disponível'}
                          </p>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(email.id, !email.is_read);
                            }}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={email.is_read ? 'Marcar como não lido' : 'Marcar como lido'}
                          >
                            {email.is_read ? (
                              <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                            ) : (
                              <EnvelopeOpenIcon className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More */}
                {emails.length > 0 && emails.length % 20 === 0 && (
                  <div className="p-4 text-center border-t border-gray-100">
                    <button
                      onClick={() => setPage(prev => prev + 1)}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50"
                    >
                      {loading ? 'Carregando...' : 'Carregar mais emails'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gmail-style Email Preview Panel */}
          {selectedEmail && (
            <div className="w-full lg:w-96 bg-white rounded-lg border border-gray-200 flex flex-col">
              {/* Email Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900 pr-4">
                    {selectedEmail.subject || '(Sem assunto)'}
                  </h2>
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors lg:hidden"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {(selectedEmail.from_name || selectedEmail.from_address).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 truncate">
                          {selectedEmail.from_name || selectedEmail.from_address}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        para {selectedConfigData?.email_address}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 flex-shrink-0">
                      {new Date(selectedEmail.received_date).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })} {new Date(selectedEmail.received_date).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none">
                  {selectedEmail.html_content ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                      className="text-gray-700 leading-relaxed"
                      style={{ 
                        fontSize: '14px',
                        lineHeight: '1.6'
                      }}
                    />
                  ) : (
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ fontSize: '14px' }}>
                      {selectedEmail.text_content || 'Sem conteúdo disponível'}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-4 space-y-2">
                <button
                  onClick={() => navigate(`/school/dashboard/email/compose?config=${selectedConfig}&reply=${selectedEmail.id}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
                >
                  Responder
                </button>
                <button
                  onClick={() => window.open(`mailto:${selectedEmail.from_address}?subject=Re: ${selectedEmail.subject}`)}
                  className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md transition-colors text-sm"
                >
                  Encaminhar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailInbox;
