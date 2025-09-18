'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail, RefreshCw, Inbox as InboxIcon,
  Send as SendIcon, Star as StarIcon, FileText, AlertTriangle, Trash,
  Bot, Play, BarChart3, Loader2, XCircle,
  Search, MoreVertical, Reply, Forward, User,
  Plus, Archive, Settings, Folder, FolderOpen
} from 'lucide-react';
import { useAuthToken } from '../../hooks/useAuthToken';
import { formatDateUS } from '../../lib/dateUtils';
import GraphService from '../../lib/graphService';
import AutoEmailProcessing from './AutoEmailProcessing';

// Interfaces

interface ProcessedEmail {
  id: string;
  subject: string;
  from: string;
  analysis: {
    shouldReply: boolean;
    priority: 'high' | 'medium' | 'low';
    category: string;
    confidence: number;
    summary?: string;
  };
  response?: string;
  processedAt: Date;
  status: 'processed' | 'error';
  isRead?: boolean;
  isStarred?: boolean;
  bodyPreview?: string;
  receivedDateTime?: string;
  snippet?: string;
}

interface MicrosoftGraphEmail {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  isStarred?: boolean;
  webLink?: string;
  body?: {
    contentType: string;
    content: string;
  };
}

export default function MicrosoftInbox() {
  const { getToken, accounts } = useAuthToken();

  // Estados do AIManager
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'active' | 'error' | 'loading'>('idle');
  const [recentEmails, setRecentEmails] = useState<ProcessedEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Estados do Inbox
  const [selectedEmail, setSelectedEmail] = useState<ProcessedEmail | MicrosoftGraphEmail | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [emailCounts, setEmailCounts] = useState({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
  const [folderEmails, setFolderEmails] = useState<{ [key: string]: MicrosoftGraphEmail[] }>({});
  const [mailFolders, setMailFolders] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState<{ [key: string]: boolean }>({});
  const [folderErrors, setFolderErrors] = useState<{ [key: string]: string }>({});
  const [folderCache, setFolderCache] = useState<{ [key: string]: { data: MicrosoftGraphEmail[], timestamp: number } }>({});
  const [newEmailNotification, setNewEmailNotification] = useState<{ show: boolean, count: number }>({ show: false, count: 0 });
  
  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  // Função para obter ícone dinâmico baseado no tipo de pasta
  const getFolderIcon = (folderId: string, isActive: boolean, isLoading: boolean, hasError: boolean) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (hasError) return <XCircle className="h-4 w-4 text-red-500" />;
    
    const iconProps = { className: "h-4 w-4" };
    
    switch (folderId) {
      case 'inbox':
        return isActive ? <FolderOpen {...iconProps} /> : <InboxIcon {...iconProps} />;
      case 'sent':
        return <SendIcon {...iconProps} />;
      case 'drafts':
        return <FileText {...iconProps} />;
      case 'archive':
        return <Archive {...iconProps} />;
      case 'spam':
        return <AlertTriangle {...iconProps} />;
      case 'trash':
        return <Trash {...iconProps} />;
      default:
        return isActive ? <FolderOpen {...iconProps} /> : <Folder {...iconProps} />;
    }
  };

  // Sidebar navigation items (Outlook style)
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
      label: 'Lixo Eletrônico',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      count: emailCounts.spam
    },
    {
      id: 'trash',
      label: 'Itens Excluídos',
      icon: <Trash className="h-4 w-4" />,
      color: 'text-gray-500',
      count: emailCounts.trash
    }
  ];

  // Mapeamento de pastas do Outlook para IDs do Microsoft Graph
  const getFolderMapping = (folders: any[]) => {
    const mapping: { [key: string]: string } = {};
    
    folders.forEach(folder => {
      const displayName = folder.displayName?.toLowerCase();
      if (displayName?.includes('inbox') || displayName?.includes('caixa de entrada')) {
        mapping.inbox = folder.id;
      } else if (displayName?.includes('sent') || displayName?.includes('enviados')) {
        mapping.sent = folder.id;
      } else if (displayName?.includes('drafts') || displayName?.includes('rascunhos')) {
        mapping.drafts = folder.id;
      } else if (displayName?.includes('archive') || displayName?.includes('arquivo')) {
        mapping.archive = folder.id;
      } else if (displayName?.includes('junk') || displayName?.includes('spam') || displayName?.includes('lixo')) {
        mapping.spam = folder.id;
      } else if (displayName?.includes('deleted') || displayName?.includes('excluídos')) {
        mapping.trash = folder.id;
      }
    });
    
    return mapping;
  };

  // Função para buscar pastas de email
  const fetchMailFolders = async () => {
    if (!getToken) return;
    
    try {
      const token = await getToken();
      const graphService = new GraphService(token);
      const folders = await graphService.getMailFolders();
      setMailFolders(folders.value || []);
      console.log('MicrosoftInbox - Pastas carregadas:', folders.value?.length || 0);
      return folders.value || [];
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao buscar pastas:', error);
      return [];
    }
  };

  // Função para verificar se o cache é válido
  const isCacheValid = (folderKey: string) => {
    const cached = folderCache[folderKey];
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < CACHE_DURATION;
  };

  // Função para buscar emails de uma pasta específica
  const fetchEmailsFromFolder = async (folderId: string, folderKey: string, forceRefresh = false) => {
    if (!getToken || !folderId) return;
    
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && isCacheValid(folderKey)) {
      console.log(`MicrosoftInbox - Usando cache para pasta ${folderKey}`);
      setFolderEmails(prev => ({
        ...prev,
        [folderKey]: folderCache[folderKey].data
      }));
      return folderCache[folderKey].data;
    }
    
    // Marcar pasta como carregando
    setLoadingFolders(prev => ({ ...prev, [folderKey]: true }));
    setFolderErrors(prev => ({ ...prev, [folderKey]: '' }));
    
    try {
      const token = await getToken();
      const graphService = new GraphService(token);
      const emails = await graphService.getEmailsFromFolder(folderId, 50);
      
      const emailData = emails.value || [];
      
      // Atualizar cache
      setFolderCache(prev => ({
        ...prev,
        [folderKey]: {
          data: emailData,
          timestamp: Date.now()
        }
      }));
      
      setFolderEmails(prev => ({
        ...prev,
        [folderKey]: emailData
      }));
      
      console.log(`MicrosoftInbox - Emails da pasta ${folderKey}:`, emailData.length);
      return emailData;
    } catch (error) {
      console.error(`MicrosoftInbox - Erro ao buscar emails da pasta ${folderKey}:`, error);
      setFolderErrors(prev => ({ 
        ...prev, 
        [folderKey]: `Erro ao carregar pasta: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }));
      return [];
    } finally {
      setLoadingFolders(prev => ({ ...prev, [folderKey]: false }));
    }
  };


  // Função para carregar todas as pastas e seus emails
  const loadAllFolders = async () => {
    if (!getToken) return;
    
    setLoadingEmails(true);
    try {
      // Buscar pastas
      const folders = await fetchMailFolders();
      const folderMapping = getFolderMapping(folders);
      
      // Buscar emails de cada pasta SEQUENCIALMENTE para evitar rate limiting
      const newCounts = { inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 };
      
      // Processar pastas uma por vez com delay entre elas
      for (const [key, folderId] of Object.entries(folderMapping)) {
        try {
          console.log(`MicrosoftInbox - Processando pasta ${key}...`);
          
          // Adicionar delay entre requisições para evitar rate limiting
          if (Object.values(newCounts).some(count => count > 0)) {
            console.log('MicrosoftInbox - Aguardando 2 segundos para evitar rate limiting...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de delay
          }
          
          const emails = await fetchEmailsFromFolder(folderId, key, true);
          const count = emails.length;
          
          if (key in newCounts) {
            newCounts[key as keyof typeof newCounts] = count;
          }
          
          console.log(`MicrosoftInbox - Pasta ${key} processada: ${count} emails`);
        } catch (error) {
          console.error(`MicrosoftInbox - Erro ao processar pasta ${key}:`, error);
          if (key in newCounts) {
            newCounts[key as keyof typeof newCounts] = 0;
          }
        }
      }
      
      setEmailCounts(newCounts);
      console.log('MicrosoftInbox - Contadores atualizados:', newCounts);
      
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao carregar pastas:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  // Verificar status do sistema quando o componente carrega
  useEffect(() => {
    console.log('MicrosoftInbox - useEffect executado, accounts.length:', accounts.length);
    
    if (!getToken) {
      console.log('MicrosoftInbox - Dados de autenticação não disponíveis, aguardando...');
      setStatus('idle');
      return;
    }

    if (accounts.length === 0) {
      console.log('MicrosoftInbox - Nenhuma conta encontrada, aguardando...');
      setStatus('idle');
      return;
    }

    // Usuário logado, sistema pronto para uso manual
    console.log('MicrosoftInbox - Usuário logado, sistema pronto');
    setStatus('idle');
    
    // Carregar todas as pastas e emails quando o usuário fizer login
    loadAllFolders();
  }, [getToken, accounts.length]);

  // Polling automático para detectar novos emails
  useEffect(() => {
    if (!getToken || accounts.length === 0) return;

    console.log('MicrosoftInbox - Iniciando polling automático para novos emails...');
    
    // Verificar novos emails a cada 30 segundos
    const pollingInterval = setInterval(async () => {
      try {
        console.log('MicrosoftInbox - Verificando novos emails automaticamente...');
        
        // Buscar apenas emails da caixa de entrada (inbox) para detecção de novos
        const folders = await fetchMailFolders();
        const folderMapping = getFolderMapping(folders);
        const inboxId = folderMapping.inbox;
        
        if (inboxId) {
          const emails = await fetchEmailsFromFolder(inboxId, 'inbox', true);
          const newCount = emails.length;
          const currentCount = emailCounts.inbox || 0;
          
          console.log(`MicrosoftInbox - Emails na inbox: ${newCount} (anterior: ${currentCount})`);
          
          // Se há novos emails, ativar IA automaticamente
          if (newCount > currentCount) {
            const newEmailsCount = newCount - currentCount;
            console.log(`MicrosoftInbox - ${newEmailsCount} novos emails detectados! Ativando IA automaticamente...`);
            
            // Mostrar notificação
            setNewEmailNotification({ show: true, count: newEmailsCount });
            
            // Atualizar contador
            setEmailCounts(prev => ({ ...prev, inbox: newCount }));
            
            // Ativar processamento de IA automaticamente
            await startProcessing();
            
            // Esconder notificação após 5 segundos
            setTimeout(() => {
              setNewEmailNotification({ show: false, count: 0 });
            }, 5000);
          }
        }
      } catch (error) {
        console.error('MicrosoftInbox - Erro no polling automático:', error);
      }
    }, 30000); // 30 segundos

    return () => {
      console.log('MicrosoftInbox - Parando polling automático...');
      clearInterval(pollingInterval);
    };
  }, [getToken, accounts.length, emailCounts.inbox]);

  // Funções do AIManager
  const checkPollingStatus = async () => {
    console.log('MicrosoftInbox - checkPollingStatus iniciado');
    setLoading(true);

    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3001/api/polling-user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MicrosoftInbox - Status recebido:', data);

      if (data.success) {
        setStatus(data.isRunning ? 'active' : 'idle');
        setRecentEmails(data.stats?.recentEmails || []);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao verificar status do polling:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const startProcessing = async () => {
    console.log('MicrosoftInbox - startProcessing iniciado');
    setLoading(true);

    try {
      const token = await getToken();
      console.log('MicrosoftInbox - Token obtido, fazendo requisição...');
      
      const response = await fetch('http://localhost:3001/api/polling-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MicrosoftInbox - Resposta recebida:', data);

      if (data.success) {
        setStatus('active');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao iniciar polling:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const stopProcessing = async () => {
    console.log('MicrosoftInbox - stopProcessing iniciado');
    setLoading(true);

    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3001/api/polling-user', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MicrosoftInbox - Resposta recebida:', data);

      if (data.success) {
        setStatus('idle');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao parar polling:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const testProcessing = async () => {
    console.log('MicrosoftInbox - testProcessing iniciado');
    setLoading(true);

    try {
      const token = await getToken();
      const response = await fetch('http://localhost:3001/api/polling-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('MicrosoftInbox - Resposta do teste recebida:', data);

      if (data.success) {
        setRecentEmails(data.emails || []);
      }
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao testar IA:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSelect = (email: ProcessedEmail | MicrosoftGraphEmail) => {
    setSelectedEmail(email);
  };

  const handleCompose = () => {
    console.log('Compose clicked');
  };

  const handleReply = () => {
    console.log('Reply clicked');
  };

  const handleForward = () => {
    console.log('Forward clicked');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    setSelectedEmail(null);
    
    // Se já temos emails desta pasta carregados, não precisamos buscar novamente
    if (folderEmails[tabId] && folderEmails[tabId].length > 0) {
      return;
    }
    
    // Buscar emails da pasta se ainda não foram carregados
    if (mailFolders.length > 0) {
      const folderMapping = getFolderMapping(mailFolders);
      const folderId = folderMapping[tabId];
      
      if (folderId) {
        await fetchEmailsFromFolder(folderId, tabId);
      } else {
        console.warn(`MicrosoftInbox - Pasta ${tabId} não encontrada no mapeamento`);
      }
    } else {
      // Se não temos as pastas carregadas ainda, carregar todas
      await loadAllFolders();
    }
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return formatDateUS(date.toISOString());
  };

  // Determinar quais emails mostrar baseado na pasta ativa
  const getEmailsToShow = () => {
    // Se temos emails da pasta específica carregados, usar eles
    if (folderEmails[activeTab] && folderEmails[activeTab].length > 0) {
      return folderEmails[activeTab];
    }
    
    // Para outras pastas, usar emails processados pela IA como fallback
    return recentEmails;
  };
  
  const emailsToShow = getEmailsToShow();
  
  const filteredEmails = emailsToShow.filter(email => {
    const subject = email.subject || '';
    const from = (email as MicrosoftGraphEmail).from?.emailAddress?.name || (email as MicrosoftGraphEmail).from?.emailAddress?.address || (email as ProcessedEmail).from || '';
    const snippet = (email as MicrosoftGraphEmail).bodyPreview || (email as ProcessedEmail).analysis?.summary || '';
    
    const matchesSearch = subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         snippet.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && !email.isRead) ||
                         (filter === 'starred' && email.isStarred);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Notificação de novos emails */}
      {newEmailNotification.show && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
          <Mail className="h-5 w-5" />
          <span className="font-medium">
            {newEmailNotification.count} novo{newEmailNotification.count > 1 ? 's' : ''} email{newEmailNotification.count > 1 ? 's' : ''} detectado{newEmailNotification.count > 1 ? 's' : ''}!
          </span>
          <span className="text-sm">IA ativada automaticamente</span>
        </div>
      )}

      {/* Header - Outlook Style */}
      <div className="h-16 bg-blue-600 flex items-center justify-between px-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-8 w-8" />
            <span className="text-xl font-semibold">Outlook</span>
          </div>
        </div>
        
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={loadAllFolders}
            disabled={loadingEmails}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loadingEmails ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 hover:bg-blue-700 rounded-lg transition-colors">
            <Settings className="h-5 w-5" />
          </button>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Outlook Style */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* New Email Button */}
          <div className="p-4">
            <button
              onClick={handleCompose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Novo email
            </button>
          </div>

          {/* AI Assistant - Minimalista */}
          <div className="px-3 pb-3">
            <AutoEmailProcessing />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2">
            {sidebarNavItems.map((item) => {
              const isLoading = loadingFolders[item.id];
              const hasError = folderErrors[item.id];
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-gray-100 disabled:opacity-50 ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={item.color}>
                      {getFolderIcon(item.id, activeTab === item.id, isLoading, !!hasError)}
                    </span>
                    <span className="text-sm">{item.label}</span>
                    {hasError && (
                      <span className="text-xs text-red-500 truncate max-w-20" title={hasError}>
                        Erro
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.count > 0 && (
                      <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* AI Manager Section */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                AI Management
              </div>
              
              <button
                onClick={checkPollingStatus}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors mb-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Status</span>
              </button>

              <button
                onClick={startProcessing}
                disabled={loading || status === 'active'}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors mb-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <Play className="h-4 w-4 text-green-600" />
                <span className="text-sm">Start AI</span>
              </button>

              <button
                onClick={testProcessing}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors mb-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <Bot className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Test AI</span>
              </button>

              {status === 'active' && (
                <button
                  onClick={stopProcessing}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors mb-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Stop AI</span>
                </button>
              )}
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {accounts[0]?.name || 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {accounts[0]?.username || 'user@outlook.com'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Email List */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
            {/* Email List Header */}
            <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={sidebarNavItems.find(item => item.id === activeTab)?.color || 'text-gray-600'}>
                    {getFolderIcon(activeTab, true, loadingFolders[activeTab], !!folderErrors[activeTab])}
                  </span>
                  <h2 className="text-sm font-medium text-gray-900">
                    {sidebarNavItems.find(item => item.id === activeTab)?.label || 'Microsoft Email'}
                  </h2>
                </div>
                {status === 'active' && (
                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>AI Ativo</span>
                  </div>
                )}
                {loadingFolders[activeTab] && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Carregando...</span>
                  </div>
                )}
                {folderErrors[activeTab] && (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <XCircle className="h-3 w-3" />
                    <span>Erro</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'starred')}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="unread">Não lidos</option>
                  <option value="starred">Favoritos</option>
                </select>
              </div>
            </div>

            {loadingFolders[activeTab] ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Carregando pasta...</p>
                </div>
              </div>
            ) : folderErrors[activeTab] ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <XCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar pasta</h3>
                  <p className="text-gray-500 mb-4">{folderErrors[activeTab]}</p>
                  <button
                    onClick={() => {
                      if (mailFolders.length > 0) {
                        const folderMapping = getFolderMapping(mailFolders);
                        const folderId = folderMapping[activeTab];
                        if (folderId) {
                          fetchEmailsFromFolder(folderId, activeTab, true);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filter === 'starred' ? 'Nenhum email favorito' : 'Nenhum email encontrado'}
                  </h3>
                  <p className="text-gray-500">
                    {filter === 'starred' 
                      ? 'Marque emails com estrela para vê-los aqui' 
                      : 'Tente ajustar sua busca ou filtro'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    } ${!email.isRead ? 'bg-blue-50/30 font-semibold' : ''}`}
                    onClick={() => handleEmailSelect(email)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-medium">
                            {(email as MicrosoftGraphEmail).from?.emailAddress?.name?.charAt(0) || 
                             (email as ProcessedEmail).from?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {(email as MicrosoftGraphEmail).from?.emailAddress?.name || 
                             (email as ProcessedEmail).from || 'Unknown'}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatDate((email as ProcessedEmail).processedAt || (email as MicrosoftGraphEmail).receivedDateTime)}
                          </span>
                        </div>
                        <h5 className="text-sm text-gray-900 mb-1 truncate">
                          {email.subject || 'Sem assunto'}
                        </h5>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {(email as MicrosoftGraphEmail).bodyPreview || 
                           (email as ProcessedEmail).analysis?.summary || 
                           'Nenhuma visualização disponível'}
                        </p>
                        {email.isStarred && (
                          <StarIcon className="h-3 w-3 text-yellow-500 mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Viewer */}
          <div className="w-1/2 flex flex-col bg-white">
            {selectedEmail ? (
              <>
                {/* Email Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedEmail.subject || 'Sem assunto'}
                    </h2>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleReply}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Responder"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleForward}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Encaminhar"
                      >
                        <Forward className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-medium">
                        {(selectedEmail as MicrosoftGraphEmail).from?.emailAddress?.name?.charAt(0) || 
                         (selectedEmail as ProcessedEmail).from?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {(selectedEmail as MicrosoftGraphEmail).from?.emailAddress?.name || 
                         (selectedEmail as ProcessedEmail).from || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(selectedEmail as MicrosoftGraphEmail).from?.emailAddress?.address || 
                         'unknown@example.com'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate((selectedEmail as ProcessedEmail).processedAt || (selectedEmail as MicrosoftGraphEmail).receivedDateTime)}
                    </div>
                  </div>
                </div>

                {/* Email Content */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="prose max-w-none text-sm">
                    {(selectedEmail as MicrosoftGraphEmail).body?.content ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: (selectedEmail as MicrosoftGraphEmail).body?.content || '' 
                        }}
                      />
                    ) : (
                      <p className="text-gray-600">
                        {(selectedEmail as MicrosoftGraphEmail).bodyPreview || 
                         (selectedEmail as ProcessedEmail).analysis?.summary || 
                         'Nenhum conteúdo disponível'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Actions */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReply}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Responder
                    </button>
                    <button
                      onClick={handleForward}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                    >
                      Encaminhar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um email para visualizar</h3>
                  <p className="text-gray-500">Escolha um email da lista para ler seu conteúdo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}