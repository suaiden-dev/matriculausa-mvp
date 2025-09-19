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
  FunnelIcon,
  Cog6ToothIcon,
  UserIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  CheckIcon,
  StarIcon,
  ClockIcon,
  TagIcon,
  XMarkIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
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
  const [expandedView, setExpandedView] = useState(false);
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

  // Sidebar navigation items (Gmail style seguindo padrão Microsoft)
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedEmail(null);
    setExpandedView(false);
    
    // Para Gmail, todos os emails ficam na "inbox"
    // Podemos filtrar por diferentes critérios se necessário
    if (tabId === 'inbox') {
      setFilter('all');
    } else if (tabId === 'unread') {
      setFilter('unread');
    }
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setExpandedView(true);
    if (!email.is_read) {
      markAsRead(email.id);
    }
  };

  const handleBackToList = () => {
    setExpandedView(false);
    setSelectedEmail(null);
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
    <div className="h-screen flex flex-col bg-white">
      {/* Gmail Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Menu + Gmail Logo */}
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Bars3Icon className="h-6 w-6 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xl text-gray-700 font-normal">Gmail</span>
            </div>
          </div>

          {/* Center: Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar no email"
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-12 py-3 bg-gray-100 hover:bg-white hover:shadow-md focus:bg-white focus:shadow-md border-0 rounded-full text-base focus:outline-none transition-all"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full">
                <FunnelIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Right: Settings + User */}
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Cog6ToothIcon className="h-6 w-6 text-gray-600" />
            </button>
            <button className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Gmail Sidebar - Always visible */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Compose Button */}
          <div className="p-4">
            <button
              onClick={() => navigate(`/school/dashboard/email/compose?config=${selectedConfig}`)}
              disabled={!selectedConfig}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full flex items-center space-x-3 transition-colors shadow-sm hover:shadow-md"
            >
              <PencilSquareIcon className="h-5 w-5" />
              <span className="font-medium">Escrever</span>
            </button>
          </div>

          {/* Account Selector */}
          <div className="px-4 mb-4">
            <select
              value={selectedConfig}
              onChange={(e) => {
                setSelectedConfig(e.target.value);
                setPage(1);
                setSelectedEmail(null);
                setExpandedView(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Selecione uma conta</option>
              {configurations.map(config => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gmail Navigation */}
          <nav className="px-2 flex-1 overflow-y-auto">
            {[
              { id: 'inbox', label: 'Caixa de entrada', icon: EnvelopeIcon, count: emailCounts.inbox },
              { id: 'starred', label: 'Com estrela', icon: StarIcon, count: 0 },
              { id: 'snoozed', label: 'Adiados', icon: ClockIcon, count: 0 },
              { id: 'sent', label: 'Enviados', icon: ArrowPathIcon, count: emailCounts.sent },
              { id: 'drafts', label: 'Rascunhos', icon: DocumentTextIcon, count: emailCounts.drafts },
              { id: 'spam', label: 'Spam', icon: ExclamationTriangleIcon, count: emailCounts.spam },
              { id: 'trash', label: 'Lixeira', icon: TrashIcon, count: emailCounts.trash },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full text-left px-4 py-2 rounded-r-full mb-1 flex items-center justify-between transition-colors ${
                  activeTab === item.id
                    ? 'bg-red-100 text-red-800 font-medium'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span className="text-sm text-gray-600">{item.count}</span>
                )}
              </button>
            ))}

            {/* Labels Section */}
            <div className="px-2 mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 font-medium">Marcadores</span>
                <button className="text-gray-400 hover:text-gray-600">
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {['Importante', 'Trabalho', 'Personal'].map((label) => (
                  <button
                    key={label}
                    className="w-full text-left px-4 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-r-full flex items-center space-x-3"
                  >
                    <TagIcon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {expandedView && (
                  <button
                    onClick={handleBackToList}
                    className="p-2 hover:bg-gray-100 rounded mr-2"
                    title="Voltar para lista"
                  >
                    <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
                  </button>
                )}
                <button className="p-2 hover:bg-gray-100 rounded">
                  <CheckIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing || !selectedConfig}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Atualizar"
                >
                  <ArrowPathIcon className={`h-4 w-4 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <ArchiveBoxIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <ExclamationTriangleIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <TrashIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="unread">Não lidos</option>
                  <option value="read">Lidos</option>
                </select>
                <span className="text-sm text-gray-500">
                  1-{emails.length} de {emailCounts.inbox}
                </span>
              </div>
            </div>
          </div>

          {/* Content Area - List and/or Email */}
          {expandedView && selectedEmail ? (
            /* Expanded Email View - Full Width */
            <div className="flex-1 bg-white flex flex-col overflow-hidden">
              {/* Email Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <h1 className="text-2xl font-normal text-gray-900 flex-1 mr-4 leading-tight">
                    {selectedEmail.subject || 'Sem assunto'}
                  </h1>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <StarIcon className="h-5 w-5 text-gray-400" />
                    </button>
                    <button
                      onClick={handleBackToList}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-red-700">
                        {(selectedEmail.from_name || selectedEmail.from_address).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">
                        {selectedEmail.from_name || selectedEmail.from_address}
                      </p>
                      <p className="text-sm text-gray-500">
                        para {selectedConfigData?.email_address}
                      </p>
                    </div>
                  </div>
                  
                  <span className="text-sm text-gray-500 flex-shrink-0 ml-4">
                    {new Date(selectedEmail.received_date).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              
              {/* Email Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-lg max-w-none">
                  {selectedEmail.html_content ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                      className="text-gray-700 leading-relaxed break-words"
                    />
                  ) : (
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                      {selectedEmail.text_content || 'Sem conteúdo disponível'}
                    </div>
                  )}
                </div>
                
                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <PaperClipIcon className="h-5 w-5 mr-3" />
                      Anexos ({selectedEmail.attachments.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedEmail.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <DocumentTextIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {attachment.filename}
                              </p>
                              <p className="text-xs text-gray-500">
                                {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Tamanho desconhecido'}
                              </p>
                            </div>
                          </div>
                          <button className="text-blue-600 hover:text-blue-700 font-medium flex-shrink-0 ml-4 px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reply Actions */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => navigate(`/school/dashboard/email/compose?config=${selectedConfig}&reply=${selectedEmail.id}`)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Responder
                  </button>
                  <button 
                    onClick={() => window.open(`mailto:${selectedEmail.from_address}?subject=Fwd: ${selectedEmail.subject}`)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Encaminhar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Email List Container */
            <div className="flex-1 flex overflow-hidden">
              {/* Email List */}
              <div className={`${selectedEmail && !expandedView ? 'w-1/2' : 'w-full'} overflow-y-auto bg-white border-r border-gray-200`}>
                {loading && page === 1 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
                      <p className="text-gray-600">Carregando emails...</p>
                    </div>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <EnvelopeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">
                        {selectedConfig ? 'Nenhum email encontrado' : 'Selecione uma conta'}
                      </h3>
                      <p className="text-gray-500">
                        {selectedConfig ? 'Tente sincronizar os emails ou verifique os filtros.' : 'Escolha uma conta de email para visualizar as mensagens.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => handleEmailClick(email)}
                        className={`px-4 py-3 cursor-pointer transition-colors hover:shadow-sm border-l-4 ${
                          selectedEmail?.id === email.id && !expandedView
                            ? 'bg-blue-50 border-l-blue-500'
                            : !email.is_read
                            ? 'bg-white border-l-transparent font-medium'
                            : 'bg-white border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3 w-full">
                          {/* Checkbox */}
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {/* Star */}
                          <div className="flex-shrink-0">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-yellow-400"
                            >
                              <StarIcon className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {/* Sender */}
                          <div className="w-40 flex-shrink-0">
                            <span className={`text-sm truncate block ${!email.is_read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                              {email.from_name || email.from_address}
                            </span>
                          </div>
                          
                          {/* Subject and Content */}
                          <div className="flex-1 min-w-0 mr-2">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${!email.is_read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                {email.subject || 'Sem assunto'}
                              </span>
                              <span className="text-gray-500 text-sm flex-shrink-0">-</span>
                              <span className="text-gray-500 text-sm truncate">
                                {email.text_content?.replace(/\n/g, ' ').substring(0, 80)}...
                              </span>
                            </div>
                          </div>
                          
                          {/* Date and attachments */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {email.has_attachments && (
                              <PaperClipIcon className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-500 w-16 text-right">
                              {formatDate(email.received_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Load More */}
                    {emails.length > 0 && emails.length % 20 === 0 && (
                      <div className="p-4 text-center">
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

              {/* Side Email Preview (when not expanded) */}
              {selectedEmail && !expandedView && (
                <div className="w-1/2 bg-white flex flex-col overflow-hidden">
                  {/* Email Header */}
                  <div className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-normal text-gray-900 truncate mr-4">
                        {selectedEmail.subject || 'Sem assunto'}
                      </h2>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button 
                          onClick={() => handleEmailClick(selectedEmail)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title="Expandir email"
                        >
                          <ArrowPathIcon className="h-4 w-4 text-gray-400 rotate-45" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <StarIcon className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          onClick={handleBackToList}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <XMarkIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-red-700">
                            {(selectedEmail.from_name || selectedEmail.from_address).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {selectedEmail.from_name || selectedEmail.from_address}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            para {selectedConfigData?.email_address}
                          </p>
                        </div>
                      </div>
                      
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-4">
                        {new Date(selectedEmail.received_date).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Email Content */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                      {selectedEmail.html_content ? (
                        <div 
                          dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                          className="text-gray-700 leading-relaxed break-words text-sm"
                        />
                      ) : (
                        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed break-words text-sm">
                          {selectedEmail.text_content || 'Sem conteúdo disponível'}
                        </div>
                      )}
                    </div>
                    
                    {/* Attachments */}
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center">
                          <PaperClipIcon className="h-3 w-3 mr-1" />
                          Anexos ({selectedEmail.attachments.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedEmail.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                            >
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <DocumentTextIcon className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 truncate">
                                    {attachment.filename}
                                  </p>
                                </div>
                              </div>
                              <button className="text-blue-600 hover:text-blue-700 font-medium flex-shrink-0 ml-2">
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Reply Actions */}
                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => navigate(`/school/dashboard/email/compose?config=${selectedConfig}&reply=${selectedEmail.id}`)}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        Responder
                      </button>
                      <button 
                        onClick={() => window.open(`mailto:${selectedEmail.from_address}?subject=Fwd: ${selectedEmail.subject}`)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                      >
                        Encaminhar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailInbox;