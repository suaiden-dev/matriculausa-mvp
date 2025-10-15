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
import EmailAgentManagement from './EmailAgentManagement';

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
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [existingAgent, setExistingAgent] = useState(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info', // info, success, warning, error
    confirmText: 'OK',
    cancelText: 'Cancelar',
    onConfirm: null,
    onCancel: null,
    showCancel: false
  });

  useEffect(() => {
    console.log('🚀 Componente montado, carregando configurações...');
    loadConfigurations();
    
    // Carregamento automático após 2 segundos para garantir que tudo foi carregado
    const autoLoadTimeout = setTimeout(() => {
      console.log('🔄 Auto-load timeout: verificando se precisa carregar emails...');
      if (selectedConfig && emails.length === 0) {
        console.log('🔄 Auto-load: carregando emails pois não há emails carregados...');
        loadEmails();
      }
    }, 2000);
    
    return () => clearTimeout(autoLoadTimeout);
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered - selectedConfig:', selectedConfig, 'filter:', filter, 'activeTab:', activeTab);
    if (selectedConfig) {
      console.log('📧 Loading emails for selectedConfig:', selectedConfig);
      loadEmails();
      // Atualizar contadores quando carregar emails (com debounce para evitar spam)
      const timeoutId = setTimeout(() => {
        console.log('📊 Updating email counts...');
        updateEmailCounts();
      }, 500); // 500ms de debounce
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('⚠️ No selectedConfig, skipping loadEmails');
    }
  }, [selectedConfig, filter, activeTab]);

  // Carregar agente existente para a configuração selecionada (apenas um por configuração)
  useEffect(() => {
    const fetchAgent = async () => {
      if (!selectedConfig) {
        setExistingAgent(null);
        return;
      }
      try {
        setLoadingAgent(true);
        const { data, error } = await supabase
          .from('ai_email_agents')
          .select('id, ai_name, is_active, personality, agent_type, updated_at')
          .eq('email_configuration_id', selectedConfig)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        setExistingAgent(data && data.length > 0 ? data[0] : null);
      } catch (err) {
        console.error('Erro ao buscar agente existente:', err);
        setExistingAgent(null);
      } finally {
        setLoadingAgent(false);
      }
    };
    fetchAgent();
  }, [selectedConfig]);

  // Separar useEffect para page para evitar loops
  useEffect(() => {
    if (selectedConfig && page > 1) {
      loadEmails(true);
    }
  }, [page]);

  // Polling automático para detectar novos emails
  useEffect(() => {
    if (!selectedConfig) return;

    console.log('🔄 Iniciando polling automático para detectar novos emails...');
    
    const pollingInterval = setInterval(async () => {
      try {
        console.log('🔄 Polling: verificando novos emails...');
        
        // Verificar se há novos emails comparando com o estado atual
        const { data: currentEmails, error } = await supabase
          .from('received_emails')
          .select('id, received_at')
          .eq('email_config_id', selectedConfig)
          .order('received_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Erro no polling:', error);
          return;
        }

        if (currentEmails && currentEmails.length > 0) {
          const latestEmail = currentEmails[0];
          const currentLatestEmail = emails.length > 0 ? emails[0] : null;
          
          // Se há um email mais recente que o atual, recarregar
          if (!currentLatestEmail || 
              new Date(latestEmail.received_at) > new Date(currentLatestEmail.received_at)) {
            console.log('🔄 Polling: novo email detectado, recarregando...');
            loadEmails();
          }
        }
      } catch (error) {
        console.error('❌ Erro no polling automático:', error);
      }
    }, 30000); // Verificar a cada 30 segundos

    return () => {
      console.log('🔄 Parando polling automático...');
      clearInterval(pollingInterval);
    };
  }, [selectedConfig, emails]);

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
      } else if (data && data.length > 0 && !selectedConfig) {
        // Se não há configId na URL mas há configurações disponíveis, selecionar a primeira
        console.log('🎯 Selecionando primeira configuração disponível:', data[0].id);
        console.log('🎯 Configuração selecionada:', data[0]);
        setSelectedConfig(data[0].id);
        
        // Forçar carregamento de emails após um pequeno delay para garantir que o estado foi atualizado
        setTimeout(() => {
          console.log('🔄 Forçando carregamento de emails após seleção automática...');
          loadEmails();
        }, 100);
      } else {
        console.log('⚠️ Nenhuma configuração selecionada - configId:', configId, 'data.length:', data?.length, 'selectedConfig:', selectedConfig);
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
      // Carregando emails para configuração
      
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Verificar se a configuração existe
      const selectedConfigData = configurations.find(c => c.id === selectedConfig);

      let data = [];
      let error = null;
      const emailsPerPage = 20;
      const currentPage = loadMore ? page : 1;

      // Se for pasta de enviados, consultar tabela sent_emails
      if (activeTab === 'sent') {
        // Carregando emails enviados
        const sentQuery = supabase
          .from('sent_emails')
          .select('*')
          .eq('email_config_id', selectedConfig)
          .order('sent_at', { ascending: false })
          .limit(emailsPerPage * currentPage);

        const { data: sentData, error: sentError } = await sentQuery;
        data = sentData || [];
        error = sentError;

        // Dados de emails enviados carregados

        // Transformar dados de sent_emails para formato compatível com received_emails
        data = data.map(email => {
          // Processando email enviado
          
          // Função para validar e obter data segura
          const getSafeDate = (dateString) => {
            if (!dateString) return null;
            
            const date = new Date(dateString);
            const timestamp = date.getTime();
            
            // Verificar se é uma data válida e não é 1970 (timestamp 0)
            if (isNaN(timestamp) || timestamp === 0 || timestamp < 946684800000) { // 946684800000 = 2000-01-01
              console.warn('📤 Data inválida detectada:', dateString, 'usando fallback');
              return null;
            }
            
            return dateString;
          };
          
          return {
            ...email,
            received_date: getSafeDate(email.sent_at) || getSafeDate(email.created_at) || 'No time specified',
            from_address: selectedConfigData?.email_address, // Email do remetente
            from_name: selectedConfigData?.name, // Nome da configuração
            is_read: true, // Emails enviados são considerados lidos
            is_flagged: false, // Por padrão não marcados
            is_deleted: false,
            is_archived: false,
            is_spam: false,
            // Converter to_addresses array para string para exibição
            to_display: Array.isArray(email.to_addresses) ? email.to_addresses.join(', ') : email.to_addresses
          };
        });
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
          // Aplicando filtro: apenas lidos
        } else if (filter === 'unread') {
          query = query.eq('is_read', false);
          // Aplicando filtro: apenas não lidos
        }

        // Executando query de emails
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

      // Emails carregados com sucesso
      
      if (loadMore) {
        // Adicionar novos emails à lista existente
        // Adicionando emails à lista existente
        setEmails(prevEmails => {
          const newEmails = [...prevEmails, ...data];
          return newEmails;
        });
      } else {
        // Substituir lista de emails
        // Substituindo lista de emails
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

    } catch (error) {
      console.error('❌ Erro ao marcar email como lido:', error);
    }
  };

  const formatDate = (dateString) => {
    // Verificar se é a string de fallback
    if (dateString === 'No time specified') {
      return 'No time specified';
    }
    
    const date = new Date(dateString);
    const timestamp = date.getTime();
    
    // Verificar se é uma data válida
    if (isNaN(timestamp) || timestamp === 0 || timestamp < 946684800000) { // 946684800000 = 2000-01-01
      return 'No time specified';
    }
    
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/New_York'
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        timeZone: 'America/New_York'
      });
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

    } catch (error) {
      console.error('❌ Error updating star status:', error);
    }
  };

  // Archive functionality
  const handleArchiveEmails = async (emailIds = []) => {
    const idsToArchive = emailIds.length > 0 ? emailIds : Array.from(selectedEmails);
    
    if (idsToArchive.length === 0) {
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

    } catch (error) {
      console.error('❌ Error archiving emails:', error);
    }
  };

  // Mark as spam functionality
  const handleMarkAsSpam = async (emailIds = []) => {
    const idsToSpam = emailIds.length > 0 ? emailIds : Array.from(selectedEmails);
    
    if (idsToSpam.length === 0) {
      return;
    }

    showConfirm(
      'Confirmar ação',
      `Marcar ${idsToSpam.length} email(s) como spam?`,
      () => performMarkAsSpam(idsToSpam),
      'warning'
    );
  };

  const performMarkAsSpam = async (idsToSpam) => {
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

    } catch (error) {
      console.error('❌ Error marking as spam:', error);
    }
  };

  // Delete functionality
  const handleDeleteEmails = async (emailIds = []) => {
    const idsToDelete = emailIds.length > 0 ? emailIds : Array.from(selectedEmails);
    
    if (idsToDelete.length === 0) {
      return;
    }

    showConfirm(
      'Confirmar exclusão',
      `Excluir ${idsToDelete.length} email(s)? Esta ação não pode ser desfeita.`,
      () => performDeleteEmails(idsToDelete),
      'error'
    );
  };

  const performDeleteEmails = async (idsToDelete) => {
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

    } catch (error) {
      console.error('❌ Error deleting emails:', error);
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

  // Modal functions - only for confirmations
  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setModalConfig({
      title,
      message,
      type,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        onConfirm();
        setShowModal(false);
      },
      onCancel: () => setShowModal(false),
      showCancel: true
    });
    setShowModal(true);
  };

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
                  title="Back to Email Management"
            >
              <ArrowUturnLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Open menu"
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
                placeholder="Search in email"
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
              title="Close menu"
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
              <span className="font-medium">Compose</span>
            </button>
          </div>

          {/* AI Agent Area: apenas gerenciamento quando já existir agente */}
          <div className="px-4 pb-3">
            {selectedConfig && existingAgent ? (
              <div className="w-full border border-green-200 bg-green-50 text-green-900 px-4 py-3 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{existingAgent.ai_name}</div>
                  <div className="text-xs opacity-80 truncate">
                    {existingAgent.agent_type || 'Agent'} • {existingAgent.personality || 'Personality'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${existingAgent.is_active ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>
                    {existingAgent.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => setShowKnowledgeBase(true)}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ) : null}
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
              <option value="">Select an account</option>
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
              { id: 'inbox', label: 'Inbox', icon: EnvelopeIcon, count: emailCounts.inbox },
              { id: 'starred', label: 'Starred', icon: StarIcon, count: emailCounts.starred },
              { id: 'sent', label: 'Sent', icon: ArrowPathIcon, count: emailCounts.sent },
              { id: 'archive', label: 'Archive', icon: ArchiveBoxIcon, count: emailCounts.archive },
              { id: 'spam', label: 'Spam', icon: ExclamationTriangleIcon, count: emailCounts.spam },
              { id: 'trash', label: 'Trash', icon: TrashIcon, count: emailCounts.trash },
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
                          title="Back to list"
                  >
                    <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
                  </button>
                )}
                <button 
                  onClick={() => handleSelectAll(!selectAll)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title={selectAll ? "Unselect all" : "Select all"}
                >
                  <CheckIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing || !selectedConfig}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Refresh"
                >
                  <ArrowPathIcon className={`h-4 w-4 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={() => handleArchiveEmails()}
                  disabled={selectedEmails.size === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Archive selected emails"
                >
                  <ArchiveBoxIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => handleMarkAsSpam()}
                  disabled={selectedEmails.size === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Mark as spam"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => handleDeleteEmails()}
                  disabled={selectedEmails.size === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                  title="Delete selected emails"
                >
                  <TrashIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {selectedEmails.size > 0 && (
                  <span className="text-sm text-blue-600 font-medium">
                    {selectedEmails.size} selected
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
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
                <span className="text-sm text-gray-500">
                  1-{filteredEmails.length} of {emailCounts[activeTab] || 0}
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
                    {selectedEmail.subject || 'No subject'}
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
                          ? (selectedEmail.to_display || 'Recipient not specified')
                          : (selectedEmail.from_name || selectedEmail.from_address)
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {activeTab === 'sent' 
                          ? `from ${selectedConfigData?.email_address}`
                          : `to ${selectedConfigData?.email_address}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <span className="text-sm text-gray-500 flex-shrink-0 ml-4">
                    {new Date(selectedEmail.received_date).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'America/New_York'
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
                      {selectedEmail.text_content || 'No content available'}
                    </div>
                  )}
                </div>
                
                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <PaperClipIcon className="h-5 w-5 mr-3" />
                      Attachments ({selectedEmail.attachments.length})
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
                                {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
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
                    Reply
                  </button>
                  <button 
                    onClick={() => window.open(`mailto:${selectedEmail.from_address}?subject=Fwd: ${selectedEmail.subject}`)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Forward
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
                      <p className="text-gray-600">Loading emails...</p>
                    </div>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <EnvelopeIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">
                        {searchTerm ? 'No emails found for this search' : selectedConfig ? 'No emails found' : 'Select an account'}
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'Try searching with other terms.' : selectedConfig ? 'Try syncing emails or check the filters.' : 'Choose an email account to view messages.'}
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
                                  ? (email.to_display || 'Recipient not specified')
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
                                {email.subject || 'No subject'}
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
                              Loading...
                            </>
                          ) : (
                            'Load more emails'
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
                        {selectedEmail.subject || 'No subject'}
                      </h2>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button 
                          onClick={() => handleEmailClick(selectedEmail)}
                          className="p-2 hover:bg-gray-100 rounded"
                          title="Expand email"
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
                              ? (selectedEmail.to_display || 'Recipient not specified')
                              : (selectedEmail.from_name || selectedEmail.from_address)
                            }
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {activeTab === 'sent' 
                              ? `from ${selectedConfigData?.email_address}`
                              : `to ${selectedConfigData?.email_address}`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-4">
                        {new Date(selectedEmail.received_date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/New_York'
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
                          {selectedEmail.text_content || 'No content available'}
                        </div>
                      )}
                    </div>
                    
                    {/* Attachments */}
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center">
                          <PaperClipIcon className="h-3 w-3 mr-1" />
                          Attachments ({selectedEmail.attachments.length})
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
                        Reply
                      </button>
                      <button 
                        onClick={() => window.open(`mailto:${selectedEmail.from_address}?subject=Fwd: ${selectedEmail.subject}`)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                      >
                        Forward
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  modalConfig.type === 'error' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  <ExclamationTriangleIcon className={`h-5 w-5 ${
                    modalConfig.type === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalConfig.title}
                </h3>
              </div>

              {/* Modal Body */}
              <div className="mb-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {modalConfig.message}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={modalConfig.onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {modalConfig.cancelText}
                </button>
                <button
                  onClick={modalConfig.onConfirm}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    modalConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                    'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                  }`}
                >
                  {modalConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AI Agent Management Modal (somente edição/gerenciamento no Inbox) */}
      {showKnowledgeBase && existingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden relative">
            <button
              onClick={() => setShowKnowledgeBase(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              title="Close modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <div className="p-6 overflow-y-auto max-h-[90vh]">
              <EmailAgentManagement
                activeEmailConfig={selectedConfig ? {
                  id: selectedConfig,
                  email_address: (configurations.find(c => c.id === selectedConfig) || {}).email_address
                } : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailInbox;