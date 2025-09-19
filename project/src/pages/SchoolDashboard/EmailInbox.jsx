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
  PaperClipIcon,
  ArrowUturnLeftIcon
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
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [hasMoreEmails, setHasMoreEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      loadEmails();
      // Atualizar contadores quando carregar emails
      updateEmailCounts();
    }
  }, [selectedConfig, filter, activeTab]);

  // Separar useEffect para page para evitar loops
  useEffect(() => {
    if (selectedConfig && page > 1) {
      loadEmails(true);
    }
  }, [page]);

  const loadConfigurations = async () => {
    try {
      console.log('🔍 Carregando configurações de email...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Erro de autenticação:', authError);
        throw new Error('Usuário não autenticado');
      }

      console.log('👤 Usuário autenticado:', user.id, user.email);

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
      console.log('📊 Total de configurações encontradas:', data?.length || 0);
      
      // Debug: verificar se dev01@suaiden.com está na lista
      const devConfig = data?.find(c => c.email_address === 'dev01@suaiden.com');
      console.log('🔍 Configuração dev01@suaiden.com encontrada:', devConfig);
      
      setConfigurations(data || []);
      
      // Se configId foi passado via URL, selecionar automaticamente
      if (configId && data?.find(c => c.id === configId)) {
        console.log('🎯 Selecionando configuração via URL:', configId);
        setSelectedConfig(configId);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      setConfigurations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async (loadMore = false) => {
    if (!selectedConfig) {
      console.log('⚠️ Nenhuma configuração selecionada');
      setEmails([]);
      setLoading(false);
      return;
    }

    try {
      console.log('📧 Carregando emails para configuração:', selectedConfig, 'Folder:', activeTab, 'Page:', page, 'LoadMore:', loadMore);
      
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Debug: verificar se a configuração existe
      const selectedConfigData = configurations.find(c => c.id === selectedConfig);
      console.log('🔍 Dados da configuração selecionada:', selectedConfigData);

      let data = [];
      let error = null;
      const emailsPerPage = 20;
      const currentPage = loadMore ? page : 1;

      // Se for pasta de enviados, consultar tabela sent_emails
      if (activeTab === 'sent') {
        console.log('📤 Carregando emails enviados...');
        const sentQuery = supabase
          .from('sent_emails')
          .select('*')
          .eq('email_config_id', selectedConfig)
          .order('sent_at', { ascending: false })
          .limit(emailsPerPage * currentPage);

        const { data: sentData, error: sentError } = await sentQuery;
        data = sentData || [];
        error = sentError;

        // Transformar dados de sent_emails para formato compatível com received_emails
        data = data.map(email => ({
          ...email,
          received_date: email.sent_at, // Usar sent_at como received_date para compatibilidade
          from_address: selectedConfigData?.email_address, // Email do remetente
          from_name: selectedConfigData?.name, // Nome da configuração
          is_read: true, // Emails enviados são considerados lidos
          is_flagged: false, // Por padrão não marcados
          is_deleted: false,
          is_archived: false,
          is_spam: false,
          // Converter to_addresses array para string para exibição
          to_display: Array.isArray(email.to_addresses) ? email.to_addresses.join(', ') : email.to_addresses
        }));
      } else {
        // Para outras pastas, usar received_emails
        let query = supabase
          .from('received_emails')
          .select('*')
          .eq('email_config_id', selectedConfig)
          .order('received_date', { ascending: false })
          .limit(emailsPerPage * currentPage);

        // Apply folder filter based on activeTab
        if (activeTab === 'inbox') {
          // Inbox: emails não arquivados, não deletados e não spam
          query = query.eq('is_archived', false).eq('is_deleted', false);
          console.log('📁 Aplicando filtro de inbox (não arquivados, não deletados)');
        } else if (activeTab === 'starred') {
          // Starred: emails com estrela, não deletados
          query = query.eq('is_flagged', true).eq('is_deleted', false);
          console.log('📁 Aplicando filtro de com estrela');
        } else if (activeTab === 'archive') {
          // Archive: emails arquivados mas não deletados
          query = query.eq('is_archived', true).eq('is_deleted', false);
          console.log('📁 Aplicando filtro de arquivo');
        } else if (activeTab === 'spam') {
          // Spam: emails marcados como spam
          query = query.eq('is_spam', true).eq('is_deleted', false);
          console.log('📁 Aplicando filtro de spam');
        } else if (activeTab === 'trash') {
          // Trash: emails deletados
          query = query.eq('is_deleted', true);
          console.log('📁 Aplicando filtro de lixeira');
        } else {
          // Para outras pastas (drafts), por enquanto mostrar inbox
          query = query.eq('is_archived', false).eq('is_deleted', false);
          console.log('📁 Aplicando filtro padrão (inbox) para pasta:', activeTab);
        }

        // Aplicar filtros apenas para received_emails
        if (filter === 'read') {
          query = query.eq('is_read', true);
          console.log('👁️ Aplicando filtro: apenas lidos');
        } else if (filter === 'unread') {
          query = query.eq('is_read', false);
          console.log('👁️ Aplicando filtro: apenas não lidos');
        }

        console.log('🔍 Executando query de emails...');
        const result = await query;
        data = result.data || [];
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao carregar emails:', error);
        throw error;
      }

      // Verificar se há mais emails para carregar
      const hasMore = data.length === emailsPerPage * currentPage;
      setHasMoreEmails(hasMore);

      console.log('✅ Emails carregados:', data?.length || 0, 'for folder:', activeTab, 'HasMore:', hasMore);
      console.log('📧 Primeiros 3 emails:', data?.slice(0, 3));
      
      if (loadMore) {
        // Adicionar novos emails à lista existente
        setEmails(prevEmails => [...prevEmails, ...data]);
      } else {
        // Substituir lista de emails
        setEmails(data || []);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar emails:', error);
      if (!loadMore) {
        setEmails([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const updateEmailCounts = async () => {
    if (!selectedConfig) return;
    
    try {
      const counts = {
        inbox: 0,
        sent: 0,
        drafts: 0,
        archive: 0,
        spam: 0,
        trash: 0,
        starred: 0
      };

      // Get received emails count
      const { data: receivedData, error: receivedError } = await supabase
        .from('received_emails')
        .select('is_deleted, is_archived, is_flagged, is_spam')
        .eq('email_config_id', selectedConfig);

      if (receivedError) {
        console.error('❌ Erro ao carregar contadores de received_emails:', receivedError);
      } else {
        receivedData?.forEach(email => {
          if (email.is_deleted) {
            counts.trash++;
          } else if (email.is_spam) {
            counts.spam++;
          } else if (email.is_archived) {
            counts.archive++;
          } else {
            counts.inbox++;
          }
          
          // Count starred emails (regardless of folder)
          if (email.is_flagged) {
            counts.starred++;
          }
        });
      }

      // Get sent emails count
      const { data: sentData, error: sentError } = await supabase
        .from('sent_emails')
        .select('id')
        .eq('email_config_id', selectedConfig);

      if (sentError) {
        console.error('❌ Erro ao carregar contadores de sent_emails:', sentError);
      } else {
        counts.sent = sentData?.length || 0;
      }

      setEmailCounts(counts);
      console.log('📊 Email counts updated:', counts);
    } catch (error) {
      console.error('❌ Erro ao atualizar contadores:', error);
    }
  };

  const handleCompose = () => {
    navigate(`/school/dashboard/email/compose?config=${selectedConfig}`);
  };

  // Sidebar navigation items (Gmail style seguindo padrão Microsoft)
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedEmail(null);
    setExpandedView(false);
    setPage(1);
    setSelectedEmails(new Set());
    setSelectAll(false);
    setHasMoreEmails(false);
    
    // Reset filters when changing tabs
    setFilter('all');
    
    // Em mobile, fechar sidebar ao mudar de aba
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    
    console.log('📁 Changed to folder:', tabId);
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    // Em mobile, sempre expandir; em desktop, alternar
    if (window.innerWidth < 1024) {
      setExpandedView(true);
    } else {
      setExpandedView(!expandedView || selectedEmail?.id !== email.id);
    }
    if (!email.is_read) {
      markAsRead(email.id);
    }
  };

  const handleBackToList = () => {
    setExpandedView(false);
    setSelectedEmail(null);
    // Em mobile, fechar sidebar também
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Toggle read/unread status
  const handleToggleReadStatus = async (emailId, currentReadStatus) => {
    try {
      await markAsRead(emailId, !currentReadStatus);
    } catch (error) {
      console.error('❌ Error toggling read status:', error);
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

  const handleLoadMore = async () => {
    if (!selectedConfig || loadingMore) return;
    
    try {
      console.log('📧 Carregando mais emails...');
      setPage(prevPage => prevPage + 1);
      await loadEmails(true);
      console.log('✅ Mais emails carregados');
    } catch (error) {
      console.error('❌ Erro ao carregar mais emails:', error);
      alert('Erro ao carregar mais emails');
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

  // Email selection functions
  const handleSelectEmail = (emailId, checked) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(emailId);
      } else {
        newSet.delete(emailId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEmails(new Set(emails.map(email => email.id)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  // Star/Favorite functionality
  const handleToggleStar = async (emailId, isStarred) => {
    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ is_flagged: !isStarred })
        .eq('id', emailId);

      if (error) throw error;

      // Update local state
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, is_flagged: !isStarred }
            : email
        )
      );

      // Update selected email if it's the same
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, is_flagged: !isStarred } : null);
      }

      console.log('✅ Email star status updated');
    } catch (error) {
      console.error('❌ Error updating star status:', error);
      alert('Erro ao atualizar status de favorito');
    }
  };

  // Archive functionality
  const handleArchiveEmails = async (emailIds = []) => {
    const idsToArchive = emailIds.length > 0 ? emailIds : Array.from(selectedEmails);
    
    if (idsToArchive.length === 0) {
      alert('Selecione emails para arquivar');
      return;
    }

    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ is_archived: true })
        .in('id', idsToArchive);

      if (error) throw error;

      // Remove archived emails from current view
      setEmails(prev => prev.filter(email => !idsToArchive.includes(email.id)));
      setSelectedEmails(new Set());
      setSelectAll(false);
      
      // Update counts
      updateEmailCounts();

      console.log('✅ Emails archived successfully');
      alert(`${idsToArchive.length} email(s) arquivado(s)`);
    } catch (error) {
      console.error('❌ Error archiving emails:', error);
      alert('Erro ao arquivar emails');
    }
  };

  // Mark as spam functionality
  const handleMarkAsSpam = async (emailIds = []) => {
    const idsToSpam = emailIds.length > 0 ? emailIds : Array.from(selectedEmails);
    
    if (idsToSpam.length === 0) {
      alert('Selecione emails para marcar como spam');
      return;
    }

    if (!confirm(`Marcar ${idsToSpam.length} email(s) como spam?`)) {
      return;
    }

    try {
      // Marcar como spam
      const { error } = await supabase
        .from('received_emails')
        .update({ is_spam: true })
        .in('id', idsToSpam);

      if (error) throw error;

      // Remove spam emails from current view
      setEmails(prev => prev.filter(email => !idsToSpam.includes(email.id)));
      setSelectedEmails(new Set());
      setSelectAll(false);
      
      // Update counts
      updateEmailCounts();

      console.log('✅ Emails marked as spam');
      alert(`${idsToSpam.length} email(s) marcado(s) como spam`);
    } catch (error) {
      console.error('❌ Error marking as spam:', error);
      alert('Erro ao marcar como spam');
    }
  };

  // Delete functionality
  const handleDeleteEmails = async (emailIds = []) => {
    const idsToDelete = emailIds.length > 0 ? emailIds : Array.from(selectedEmails);
    
    if (idsToDelete.length === 0) {
      alert('Selecione emails para excluir');
      return;
    }

    if (!confirm(`Excluir ${idsToDelete.length} email(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('received_emails')
        .update({ is_deleted: true })
        .in('id', idsToDelete);

      if (error) throw error;

      // Remove deleted emails from current view
      setEmails(prev => prev.filter(email => !idsToDelete.includes(email.id)));
      setSelectedEmails(new Set());
      setSelectAll(false);
      
      // Update counts
      updateEmailCounts();

      console.log('✅ Emails deleted successfully');
      alert(`${idsToDelete.length} email(s) excluído(s)`);
    } catch (error) {
      console.error('❌ Error deleting emails:', error);
      alert('Erro ao excluir emails');
    }
  };

  // Search functionality
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset pagination when searching
  };

  // Filter emails based on search term
  const filteredEmails = emails.filter(email => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(searchLower) ||
      email.from_name?.toLowerCase().includes(searchLower) ||
      email.from_address?.toLowerCase().includes(searchLower) ||
      email.text_content?.toLowerCase().includes(searchLower)
    );
  });

  const selectedConfigData = configurations.find(c => c.id === selectedConfig);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Gmail Header */}
      <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Back Button + Gmail Logo + Menu Button */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => navigate('/school/dashboard/email')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Voltar para Email Management"
            >
              <ArrowUturnLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Abrir menu"
            >
              <Bars3Icon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl text-gray-700 font-normal">Gmail</span>
            </div>
          </div>

          {/* Center: Search Bar - Hidden on mobile, visible on desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
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

          {/* Mobile Search Button */}
          <button className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Gmail Sidebar - Responsive */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-y-0 lg:left-0 h-screen overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-end p-4 border-b border-gray-200">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Fechar menu"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
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
              { id: 'starred', label: 'Com estrela', icon: StarIcon, count: emailCounts.starred },
              { id: 'sent', label: 'Enviados', icon: ArrowPathIcon, count: emailCounts.sent },
              { id: 'drafts', label: 'Rascunhos', icon: DocumentTextIcon, count: emailCounts.drafts },
              { id: 'archive', label: 'Arquivo', icon: ArchiveBoxIcon, count: emailCounts.archive },
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
                <button 
                  onClick={() => handleSelectAll(!selectAll)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title={selectAll ? "Desmarcar todos" : "Marcar todos"}
                >
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
                <button 
                  onClick={() => handleArchiveEmails()}
                  disabled={selectedEmails.size === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Arquivar emails selecionados"
                >
                  <ArchiveBoxIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => handleMarkAsSpam()}
                  disabled={selectedEmails.size === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Marcar como spam"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => handleDeleteEmails()}
                  disabled={selectedEmails.size === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Excluir emails selecionados"
                >
                  <TrashIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {selectedEmails.size > 0 && (
                  <span className="text-sm text-blue-600 font-medium">
                    {selectedEmails.size} selecionado{selectedEmails.size > 1 ? 's' : ''}
                  </span>
                )}
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
                  1-{filteredEmails.length} de {emailCounts[activeTab] || 0}
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
                        {activeTab === 'sent' 
                          ? (selectedEmail.to_display || 'Destinatário não especificado')
                          : (selectedEmail.from_name || selectedEmail.from_address)
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {activeTab === 'sent' 
                          ? `de ${selectedConfigData?.email_address}`
                          : `para ${selectedConfigData?.email_address}`
                        }
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
              <div className={`${selectedEmail && !expandedView ? 'w-1/2 hidden lg:block' : 'w-full'} overflow-y-auto bg-white border-r border-gray-200`}>
                {loading && page === 1 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
                      <p className="text-gray-600">Carregando emails...</p>
                    </div>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <EnvelopeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">
                        {searchTerm ? 'Nenhum email encontrado para esta pesquisa' : selectedConfig ? 'Nenhum email encontrado' : 'Selecione uma conta'}
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'Tente pesquisar com outros termos.' : selectedConfig ? 'Tente sincronizar os emails ou verifique os filtros.' : 'Escolha uma conta de email para visualizar as mensagens.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredEmails.map((email) => (
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
                        <div className="flex items-start space-x-2 sm:space-x-3 w-full">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={selectedEmails.has(email.id)}
                              onChange={(e) => handleSelectEmail(email.id, e.target.checked)}
                              className="rounded border-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          
                          {/* Mobile Layout */}
                          <div className="flex-1 min-w-0">
                            {/* Top Row: Star, Read/Unread, Sender, Date */}
                            <div className="flex items-center space-x-2 mb-1">
                              {/* Star */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStar(email.id, email.is_flagged);
                                }}
                                className={`${email.is_flagged ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-400 flex-shrink-0`}
                              >
                                {email.is_flagged ? (
                                  <StarSolidIcon className="h-4 w-4" />
                                ) : (
                                  <StarIcon className="h-4 w-4" />
                                )}
                              </button>

                              {/* Read/Unread Toggle */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleReadStatus(email.id, email.is_read);
                                }}
                                className="text-gray-400 hover:text-blue-500 flex-shrink-0"
                                title={email.is_read ? "Marcar como não lido" : "Marcar como lido"}
                              >
                                {email.is_read ? (
                                  <EnvelopeOpenIcon className="h-4 w-4" />
                                ) : (
                                  <EnvelopeIcon className="h-4 w-4" />
                                )}
                              </button>
                              
                              {/* Sender/Recipient - Mobile */}
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm truncate block ${!email.is_read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                  {activeTab === 'sent' 
                                    ? (email.to_display || 'Destinatário não especificado')
                                    : (email.from_name || email.from_address)
                                  }
                                </span>
                              </div>
                              
                              {/* Date and attachments - Mobile */}
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                {email.has_attachments && (
                                  <PaperClipIcon className="h-3 w-3 text-gray-400" />
                                )}
                                <span className="text-xs text-gray-500">
                                  {formatDate(email.received_date)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Subject and Content - Mobile */}
                            <div className="space-y-1">
                              <div className={`text-sm ${!email.is_read ? 'font-bold text-gray-900' : 'text-gray-700'} line-clamp-1`}>
                                {email.subject || 'Sem assunto'}
                              </div>
                              <div className="text-gray-500 text-xs line-clamp-2">
                                {email.text_content?.replace(/\n/g, ' ').substring(0, 100)}...
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Load More */}
                    {filteredEmails.length > 0 && hasMoreEmails && (
                      <div className="p-4 text-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore || loading}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                        >
                          {loadingMore ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            'Carregar mais emails'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Side Email Preview (when not expanded) */}
              {selectedEmail && !expandedView && (
                <div className="w-1/2 hidden lg:flex bg-white flex-col overflow-hidden">
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
                            {activeTab === 'sent' 
                              ? (selectedEmail.to_display || 'Destinatário não especificado')
                              : (selectedEmail.from_name || selectedEmail.from_address)
                            }
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {activeTab === 'sent' 
                              ? `de ${selectedConfigData?.email_address}`
                              : `para ${selectedConfigData?.email_address}`
                            }
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