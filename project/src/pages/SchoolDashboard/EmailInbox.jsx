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
import { 
  Mail, 
  Search, 
  RefreshCw, 
  Settings, 
  User, 
  Plus,
  InboxIcon,
  SendIcon,
  FileText,
  Archive,
  AlertTriangle,
  Trash,
  Folder,
  FolderOpen,
  Loader2,
  XCircle,
  Star,
  Reply,
  Forward,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [emailCounts, setEmailCounts] = useState({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
  const [activeTab, setActiveTab] = useState('inbox');

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      loadEmails();
      // Atualizar contadores quando carregar emails
      updateEmailCounts();
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

  const updateEmailCounts = async () => {
    if (!selectedConfig) return;
    
    try {
      const { data, error } = await supabase
        .from('received_emails')
        .select('is_read')
        .eq('email_config_id', selectedConfig)
        .eq('is_deleted', false);

      if (error) {
        console.error('❌ Erro ao carregar contadores:', error);
        return;
      }

      const counts = {
        inbox: data?.length || 0,
        sent: 0, // Gmail inbox não tem separação de enviados
        drafts: 0,
        archive: 0,
        spam: 0,
        trash: 0
      };

      setEmailCounts(counts);
    } catch (error) {
      console.error('❌ Erro ao atualizar contadores:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCompose = () => {
    navigate(`/school/dashboard/email/compose?config=${selectedConfig}`);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedEmail(null);
    
    // Para Gmail, todos os emails ficam na "inbox"
    // Podemos filtrar por diferentes critérios se necessário
    if (tabId === 'inbox') {
      setFilter('all');
    } else if (tabId === 'unread') {
      setFilter('unread');
    }
  };

  // Sidebar navigation items (Gmail style seguindo padrão Microsoft)
  const sidebarNavItems = [
    {
      id: 'inbox',
      label: 'Caixa de Entrada',
      icon: <InboxIcon className="h-4 w-4" />,
      color: 'text-blue-600',
      count: emailCounts.inbox
    },
    {
      id: 'sent',
      label: 'Itens Enviados',
      icon: <SendIcon className="h-4 w-4" />,
      color: 'text-gray-600',
      count: emailCounts.sent
    },
    {
      id: 'drafts',
      label: 'Rascunhos',
      icon: <FileText className="h-4 w-4" />,
      color: 'text-gray-600',
      count: emailCounts.drafts
    },
    {
      id: 'archive',
      label: 'Arquivo Morto',
      icon: <Archive className="h-4 w-4" />,
      color: 'text-gray-600',
      count: emailCounts.archive
    },
    {
      id: 'spam',
      label: 'Spam',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      count: emailCounts.spam
    },
    {
      id: 'trash',
      label: 'Lixeira',
      icon: <Trash className="h-4 w-4" />,
      color: 'text-gray-500',
      count: emailCounts.trash
    }
  ];

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
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar Navigation (Microsoft Style) */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header com botão Novo Email */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => navigate(`/school/dashboard/email/compose?config=${selectedConfig}`)}
            disabled={!selectedConfig}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">Novo Email</span>
          </button>
        </div>

        {/* Account Selector */}
        <div className="p-4 border-b border-gray-200">
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

        {/* Navegação Microsoft Style */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-2">
            {sidebarNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 flex items-center justify-between transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={item.color}>{item.icon}</span>
                  <span className={`text-sm font-medium ${
                    activeTab === item.id ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {item.label}
                  </span>
                </div>
                {item.count > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer com info da conta */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Mail className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">Gmail</p>
              <p className="text-xs text-gray-500 truncate">
                {selectedConfigData?.email_address || 'Nenhuma conta'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Área principal (Microsoft Layout) */}
      <div className="flex-1 flex flex-col">
        {/* Cabeçalho com busca e controles */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar emails..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3 ml-4">
              <button
                onClick={handleSync}
                disabled={syncing || !selectedConfig}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Sincronizar"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
              
              <div className="flex items-center space-x-2">
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="unread">Não lidos</option>
                  <option value="read">Lidos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal (Lista de emails + Preview) */}
        <div className="flex-1 flex">
          {/* Lista de emails (Microsoft Card Style) */}
          <div className={`${selectedEmail ? 'w-1/3' : 'flex-1'} border-r border-gray-200 bg-white overflow-y-auto`}>
            {loading && page === 1 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">Carregando emails...</p>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {selectedConfig ? 'Nenhum email encontrado' : 'Selecione uma conta'}
                  </h3>
                  <p className="text-gray-500">
                    {selectedConfig ? 'Tente sincronizar os emails ou verifique os filtros.' : 'Escolha uma conta de email para visualizar as mensagens.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      if (!email.is_read) {
                        markAsRead(email.id);
                      }
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedEmail?.id === email.id
                        ? 'bg-blue-50 border-r-2 border-blue-500'
                        : 'hover:bg-gray-50'
                    } ${!email.is_read ? 'bg-blue-25' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${!email.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm truncate ${!email.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {email.from_name || email.from_address}
                          </h4>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDate(email.received_date)}
                          </span>
                        </div>
                        
                        <h5 className={`text-sm mb-1 truncate ${!email.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {email.subject || 'Sem assunto'}
                        </h5>
                        
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {email.text_content?.replace(/\n/g, ' ').substring(0, 100)}...
                        </p>
                        
                        {email.has_attachments && (
                          <div className="flex items-center mt-2">
                            <Paperclip className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500">Anexo</span>
                          </div>
                        )}
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

          {/* Visualização do email selecionado (Microsoft Style) */}
          {selectedEmail && (
            <div className="flex-1 bg-white flex flex-col">
              {/* Cabeçalho do email */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedEmail.subject || 'Sem assunto'}
                  </h2>
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-red-700">
                        {(selectedEmail.from_name || selectedEmail.from_address).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedEmail.from_name || selectedEmail.from_address}
                      </p>
                      <p className="text-xs text-gray-500">
                        para {selectedConfigData?.email_address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {new Date(selectedEmail.received_date).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} às {new Date(selectedEmail.received_date).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              
              {/* Corpo do email */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  {selectedEmail.html_content ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                      className="text-gray-700 leading-relaxed"
                    />
                  ) : (
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedEmail.text_content || 'Sem conteúdo disponível'}
                    </div>
                  )}
                </div>
                
                {/* Anexos */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Anexos ({selectedEmail.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedEmail.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {attachment.filename}
                              </p>
                              <p className="text-xs text-gray-500">
                                {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Tamanho desconhecido'}
                              </p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Ações do email (Microsoft Style) */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => navigate(`/school/dashboard/email/compose?config=${selectedConfig}&reply=${selectedEmail.id}`)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Reply className="h-4 w-4" />
                    <span>Responder</span>
                  </button>
                  <button 
                    onClick={() => window.open(`mailto:${selectedEmail.from_address}?subject=Fwd: ${selectedEmail.subject}`)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Forward className="h-4 w-4" />
                    <span>Encaminhar</span>
                  </button>
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Trash className="h-4 w-4" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailInbox;
