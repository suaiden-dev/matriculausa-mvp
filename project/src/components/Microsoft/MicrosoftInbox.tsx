'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mail, RefreshCw, Inbox as InboxIcon,
  Send as SendIcon, Star as StarIcon, FileText, AlertTriangle, Trash,
  Bot, Play, Loader2, XCircle,
  Search, MoreVertical, Reply, Forward, User,
  Plus, Archive, Folder, FolderOpen,
  X
} from 'lucide-react';
// import { useAuthToken } from '../../hooks/useAuthToken'; // Removido - usando GraphService diretamente
import { useMicrosoftConnection } from '../../hooks/useMicrosoftConnection';
import { formatDateUS } from '../../lib/dateUtils';
import { GraphService } from '../../lib/services/GraphService';
import EmailAgentManagement from '../../pages/SchoolDashboard/EmailAgentManagement';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import MicrosoftConnectionStatus from '../MicrosoftConnectionStatus';


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
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('config');
  
  // const { getToken, accounts } = useAuthToken(); // Removido - usando GraphService diretamente
  // Hook para gerenciar múltiplas conexões Microsoft (usado pelo MicrosoftAccountSelector)
  const { activeConnection, connections, setActiveConnection } = useMicrosoftConnection();
  // Hook para obter o universityId
  const { university } = useUniversity();
  

  // Estados do AIManager
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'active' | 'error' | 'loading'>('idle');
  const [recentEmails] = useState<ProcessedEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'forward'>('compose');
  const [composeData, setComposeData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    message: ''
  });

  // Estados para responsividade mobile
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  

  // Estados para controle de requisições (SIMPLIFICADO)
  const [isLoadingData, setIsLoadingData] = useState(false);

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
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  
  // Estados para o chatbot de teste
  const [showTestChat, setShowTestChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    message: string;
    timestamp: Date;
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [usageInfo, setUsageInfo] = useState<{prompts_used: number, max_prompts: number, remaining_prompts: number} | null>(null);
  
  // Cache simples - 10 minutos
  const CACHE_DURATION = 10 * 60 * 1000;

  // Função para obter ícone dinâmico baseado no tipo de pasta
  const getFolderIcon = (folderId: string, isActive: boolean, isLoading: boolean, hasError: boolean) => {
    if (isLoading) return <Loader2 className="h-3 w-3 animate-spin" />;
    if (hasError) return <XCircle className="h-3 w-3 text-red-500" />;
    
    const iconProps = { className: "h-3 w-3" };
    
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
      label: 'Inbox',
      icon: <InboxIcon className="h-4 w-4" />,
      color: 'text-blue-600',
      count: emailCounts.inbox
    },
    {
      id: 'sent',
      label: 'Sent Items',
      icon: <SendIcon className="h-4 w-4" />,
      color: 'text-gray-600',
      count: emailCounts.sent
    },
    {
      id: 'drafts',
      label: 'Drafts',
      icon: <FileText className="h-4 w-4" />,
      color: 'text-gray-600',
      count: emailCounts.drafts
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: <Archive className="h-4 w-4" />,
      color: 'text-gray-600',
      count: emailCounts.archive
    },
    {
      id: 'spam',
      label: 'Junk Email',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      count: emailCounts.spam
    },
    {
      id: 'trash',
      label: 'Deleted Items',
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

  // Função para buscar pastas de email (SIMPLIFICADA)
  const fetchMailFolders = async () => {
    if (!activeConnection || isLoadingData) return;
    
    setIsLoadingData(true);
    
    try {
      // 🔄 SINCRONIZAR TOKENS ANTES DA CHAMADA
      const tokensSynced = await syncTokensFromDatabase();
      
      if (!tokensSynced) {
        throw new Error('Tokens não sincronizados - aguardando renovação');
      }

      // Verificar se há uma conexão ativa válida
      if (!activeConnection?.access_token) {
        throw new Error('No active Microsoft connection found');
      }
      
      
      // Verificar se é uma conta Microsoft (não Gmail)
      if (!activeConnection.email_address.includes('@outlook.com') && 
          !activeConnection.email_address.includes('@hotmail.com') && 
          !activeConnection.email_address.includes('@live.com') &&
          !activeConnection.email_address.includes('@microsoft.com')) {
        throw new Error('This is not a Microsoft account. Use @outlook.com, @hotmail.com, @live.com or @microsoft.com accounts');
      }
      
      // Verificar se o token não está expirado (básico)
      if (activeConnection.access_token.length < 100) {
        throw new Error('Access token appears invalid - account needs to be reconnected');
      }
      
      // Criar GraphService com os dados da conexão ativa
      const graphService = new GraphService(
        activeConnection.access_token, 
        activeConnection.refresh_token, 
        activeConnection.id
      );
      const folders = await graphService.getMailFolders();
      setMailFolders(folders.value || []);
      return folders.value || [];
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao buscar pastas:', error);
      
      // Verificar se é erro de token expirado
      if (error instanceof Error && (
        error.message.includes('token') || 
        error.message.includes('expired') || 
        error.message.includes('unauthorized') ||
        error.message.includes('401')
      )) {
        // Token renewal is handled by GraphService automatically
        console.log('🔄 Token renewal will be handled by GraphService');
      }
      
      return [];
    } finally {
      setIsLoadingData(false);
    }
  };

  // Função para verificar se o cache é válido
  const isCacheValid = (folderKey: string) => {
    const cached = folderCache[folderKey];
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < CACHE_DURATION;
  };

  // Função removida - lógica complexa desnecessária

  // Função para buscar emails de uma pasta específica
  const fetchEmailsFromFolder = useCallback(async (folderId: string, folderKey: string, forceRefresh = false) => {
    if (!folderId || isLoadingData) return;
    
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && isCacheValid(folderKey)) {
      setFolderEmails(prev => ({
        ...prev,
        [folderKey]: folderCache[folderKey].data
      }));
      return folderCache[folderKey].data;
    }
    
    setIsLoadingData(true);
    
    // Marcar pasta como carregando
    setLoadingFolders(prev => ({ ...prev, [folderKey]: true }));
    setFolderErrors(prev => ({ ...prev, [folderKey]: '' }));
    
    try {
      // 🔄 SINCRONIZAR TOKENS ANTES DA CHAMADA
      const tokensSynced = await syncTokensFromDatabase();
      
      if (!tokensSynced) {
        throw new Error('Tokens não sincronizados - aguardando renovação');
      }

      // Sempre usar a activeConnection atual
      if (!activeConnection?.access_token) {
        throw new Error('No active Microsoft connection found');
      }
      
      
      // Verificar se é uma conta Microsoft (não Gmail)
      if (!activeConnection.email_address.includes('@outlook.com') && 
          !activeConnection.email_address.includes('@hotmail.com') && 
          !activeConnection.email_address.includes('@live.com') &&
          !activeConnection.email_address.includes('@microsoft.com')) {
        throw new Error('This is not a Microsoft account. Use @outlook.com, @hotmail.com, @live.com or @microsoft.com accounts');
      }
      
      // Verificar se o token não está expirado (básico)
      if (activeConnection.access_token.length < 100) {
        throw new Error('Access token appears invalid - account needs to be reconnected');
      }
      
      // Criar GraphService com os dados da conexão ativa
      const graphService = new GraphService(
        activeConnection.access_token, 
        activeConnection.refresh_token, 
        activeConnection.id
      );
      const emails = await graphService.getEmailsFromFolder(folderId, 50);
      
      const emailData = emails?.value || [];
      
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
      
      return emailData;
    } catch (error) {
      console.error(`MicrosoftInbox - Erro ao buscar emails da pasta ${folderKey}:`, error);
      
      // Verificar se é erro de token expirado ou inválido
      if (error instanceof Error && (
        error.message.includes('token') || 
        error.message.includes('expired') || 
        error.message.includes('unauthorized') ||
        error.message.includes('401') ||
        error.message.includes('Token inválido') ||
        error.message.includes('invalid_token')
      )) {
        // Mostrar mensagem clara para o usuário
        setFolderErrors(prev => ({ 
          ...prev, 
          [folderKey]: '🔐 Microsoft account disconnected. Click "Connect Microsoft" to reconnect.' 
        }));
      } else {
        setFolderErrors(prev => ({ 
          ...prev, 
          [folderKey]: `Error loading folder: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }));
      }
      return [];
    } finally {
      setLoadingFolders(prev => ({ ...prev, [folderKey]: false }));
      setIsLoadingData(false);
    }
  }, [activeConnection?.access_token, folderCache, isCacheValid]);


  // Função para carregar todas as pastas e seus emails
  const loadAllFolders = useCallback(async () => {
    if (!activeConnection) return;
    
    setLoadingEmails(true);
    try {
      // Iniciando loadAllFolders
      // Buscar pastas
      const folders = await fetchMailFolders();
      
      if (!folders || folders.length === 0) {
        // Nenhuma pasta encontrada
        setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
        return;
      }
      
      const folderMapping = getFolderMapping(folders || []);
      
      // Buscar emails de cada pasta SEQUENCIALMENTE para evitar rate limiting
      const newCounts = { inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 };
      
      // Processar pastas uma por vez com delay entre elas
      for (const [key, folderId] of Object.entries(folderMapping)) {
        try {
          
          // Adicionar delay entre requisições para evitar rate limiting
          if (Object.values(newCounts).some(count => count > 0)) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Reduzido para 1 segundo
          }
          
          const emails = await fetchEmailsFromFolder(folderId, key, true);
          const count = emails?.length || 0;
          
          if (key in newCounts) {
            newCounts[key as keyof typeof newCounts] = count;
          }
          
        } catch (error) {
          console.error(`MicrosoftInbox - Erro ao processar pasta ${key}:`, error);
          if (key in newCounts) {
            newCounts[key as keyof typeof newCounts] = 0;
          }
        }
      }
      
      setEmailCounts(newCounts);
      
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao carregar pastas:', error);
    } finally {
      setLoadingEmails(false);
    }
  }, [activeConnection?.email_address, fetchMailFolders, fetchEmailsFromFolder]);

  // Carregamento único quando a conexão é estabelecida (sem loops)
  useEffect(() => {
    if (activeConnection && activeConnection.access_token && !isLoadingData) {
      console.log('📧 MicrosoftInbox: Carregamento único iniciado...');
      
      // Limpar cache e recarregar apenas uma vez
      setFolderCache({});
      setFolderEmails({});
      setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
      
      // Carregar emails uma única vez
      loadAllFolders();
    }
  }, [activeConnection?.email_address]); // Apenas quando a conexão muda, sem loadAllFolders nas dependências


  // Função para verificar o status da IA para a conta ativa

  // Sincronizar tokens com o banco de dados (versão simplificada)
  const syncTokensFromDatabase = async () => {
    if (!activeConnection) {
      console.log('❌ Nenhuma conta ativa para sincronizar tokens');
      return false;
    }

    try {
      // Verificar se temos tokens válidos na conexão ativa
      if (!activeConnection.access_token || activeConnection.access_token.length < 100) {
        return false;
      }

      if (!activeConnection.refresh_token || activeConnection.refresh_token.length < 50) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('❌ Erro ao verificar tokens:', error);
      return false;
    }
  };

  const checkAIStatus = async () => {
    if (!activeConnection) {
      setStatus('idle');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('idle');
        return;
      }

      // Verificar se há configuração para esta conta específica
      const { data: configs, error } = await supabase
        .from('email_configurations')
        .select('ai_processing, created_at, email_address')
        .eq('user_id', user.id)
        .eq('provider_type', 'microsoft')
        .eq('email_address', activeConnection.email_address) // Específico para esta conta
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && configs && configs.length > 0) {
        const config = configs[0];
        if (config.ai_processing === true) {
          setStatus('active');
        } else {
          setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error('Erro ao verificar status da IA:', error);
      setStatus('idle');
    }
  };

  // Escutar eventos de atualização de conexão Microsoft
  useEffect(() => {
    const handleMicrosoftConnectionUpdate = () => {
      // Apenas recarregar se há uma conexão ativa
      if (activeConnection) {
        // Verificar status da IA para a nova conta
        checkAIStatus();
        
        // Limpar cache e recarregar
        setFolderCache({});
        setFolderEmails({});
        setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
        setFolderErrors({});
        // DESABILITADO: Recarregamento automático
        // setTimeout(() => {
        //   loadAllFolders();
        // }, 500);
      }
    };

    window.addEventListener('microsoft-connection-updated', handleMicrosoftConnectionUpdate);
    
    return () => {
      window.removeEventListener('microsoft-connection-updated', handleMicrosoftConnectionUpdate);
    };
  }, [activeConnection]);



  // Verificar status da IA quando a conta ativa muda
  useEffect(() => {
    if (activeConnection) {
      checkAIStatus();
    }
  }, [activeConnection?.email_address]);

  // Detectar tamanho da tela para responsividade
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 🔄 Polling automático removido - sincronização apenas quando necessário

  // Verificar status do sistema quando o componente carrega
  useEffect(() => {
    
    // Token handling moved to GraphService
    setStatus('idle');

    // Verificar status da IA para a conta ativa
    if (activeConnection) {
      checkAIStatus();
    } else {
      setStatus('idle');
    }
    
    // DESABILITADO: Carregamento automático
    // loadAllFolders();
    
    // Iniciar polling automático quando o usuário faz login
    startProcessing();
  }, [activeConnection]);

  // Verificar se deve abrir modal de AI Agents automaticamente
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openAI') === 'true') {
      setShowKnowledgeBase(true);
      // Limpar o parâmetro da URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Processar configId da URL para selecionar a conta correta
  // Processar configId APENAS na primeira carga (não sobrescrever seleção manual)
  useEffect(() => {
    if (configId && connections.length > 0) {
      // Encontrar a conexão correspondente ao configId
      const targetConnection = connections.find(conn => conn.id === configId);
      
      if (targetConnection) {
        // APENAS mudar se não há conta ativa (primeira carga)
        if (!activeConnection) {
          setActiveConnection(targetConnection.email_address);
        }
      }
    }
  }, [configId, connections]); // Removido setActiveConnection e activeConnection das dependências

  // REMOVIDO: Carregamento forçado (causa loops infinitos e sobrecarga)

  // Polling automático para detectar novos emails
  useEffect(() => {
    // Token handling moved to GraphService

    
    // Verificar novos emails a cada 5 minutos (reduzido para evitar spam)
    const pollingInterval = setInterval(async () => {
      try {
        // Buscar apenas emails da caixa de entrada (inbox) para detecção de novos
        const folders = await fetchMailFolders();
        const folderMapping = getFolderMapping(folders || []);
        const inboxId = folderMapping.inbox;
        
        if (inboxId) {
          const emails = await fetchEmailsFromFolder(inboxId, 'inbox', true);
          const newCount = emails?.length || 0;
          const currentCount = emailCounts.inbox || 0;
          
          // Se há novos emails, ativar IA automaticamente
          if (newCount > currentCount) {
            const newEmailsCount = newCount - currentCount;
            
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
      } catch (error: any) {
        console.error('MicrosoftInbox - Erro no polling automático:', error);
        
        // Verificar se é erro de token expirado
        if (error.message?.includes('token') || 
            error.message?.includes('expired') || 
            error.message?.includes('unauthorized') ||
            error.status === 401) {
          
          try {
            // Tentar renovar token
            // Token handling moved to GraphService
          } catch (renewError) {
            console.error('❌ Falha ao renovar token:', renewError);
            // Mostrar notificação para o usuário fazer login novamente
            setNewEmailNotification({ 
              show: true, 
              count: 0
            });
          }
        }
      }
    }, 300000); // 🚨 MODO CONSERVADOR: 5 minutos (era 2min)

    return () => {
      clearInterval(pollingInterval);
    };
  }, [emailCounts.inbox]);

  // Funções do AIManager

  const startProcessing = async () => {
    setLoading(true);

    try {
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus('error');
        return;
      }

      // Buscar configuração específica para a conta ativa
      if (!activeConnection) {
        setStatus('error');
        return;
      }

      const { data: existingConfigs, error: fetchError } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider_type', 'microsoft')
        .eq('email_address', activeConnection.email_address) // Específico para esta conta
        .limit(1);

      if (fetchError || !existingConfigs || existingConfigs.length === 0) {
        console.error('❌ Configuração Microsoft não encontrada para esta conta:', fetchError);
        setStatus('error');
        return;
      }

      // Ativar IA para esta conta específica
      const { error: updateError } = await supabase
        .from('email_configurations')
        .update({ ai_processing: true })
        .eq('user_id', user.id)
        .eq('provider_type', 'microsoft')
        .eq('email_address', activeConnection.email_address);

      if (updateError) {
        console.error('❌ Erro ao ativar IA para esta conta:', updateError);
        setStatus('error');
        return;
      }

      setStatus('active');
    } catch (error) {
      console.error('❌ Erro ao iniciar processamento:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const stopProcessing = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ Usuário não encontrado');
        setStatus('error');
        return;
      }

      // Desativar configuração específica para esta conta
      if (!activeConnection) {
        console.error('❌ Nenhuma conta ativa selecionada');
        setStatus('error');
        return;
      }

      const { error } = await supabase
        .from('email_configurations')
        .update({ ai_processing: false })
        .eq('user_id', user.id)
        .eq('provider_type', 'microsoft')
        .eq('email_address', activeConnection.email_address) // Específico para esta conta
        .select();

      if (error) {
        console.error('❌ Erro ao desativar configuração:', error);
        throw error;
      }

      setStatus('idle');
    } catch (error) {
      console.error('❌ Erro ao parar processamento:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Test AI - Abrir chatbot de teste
  const testProcessing = async () => {
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se há configuração Microsoft ativa (mais flexível)
      const { data: microsoftConfigs, error: configError } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider_type', 'microsoft');

      if (configError) {
        console.error('❌ Erro ao buscar configurações:', configError);
        throw new Error('Erro ao verificar configurações Microsoft');
      }

      if (!microsoftConfigs || microsoftConfigs.length === 0) {
        throw new Error('Microsoft configuration not found. Connect your account first.');
      }

      // Verificar se há pelo menos uma configuração ativa
      const activeConfig = microsoftConfigs.find(config => config.is_active);
      if (!activeConfig) {
        throw new Error('Microsoft account disconnected. Reconnect your account first.');
      }


      // 🆕 Verificar se há agente de IA Microsoft configurado
      const { data: aiConfigs, error: aiError } = await supabase
        .from('microsoft_ai_agents')
        .select('*')
        .eq('university_id', university?.id || user.id)
        .eq('is_active', true);

      if (aiError) {
        console.error('❌ Erro ao buscar agente de IA:', aiError);
        // Continuar mesmo sem agente - modo demo
      }

      console.log('✅ [testProcessing] Agentes encontrados:', aiConfigs);

      // Inicializar chatbot com mensagem de boas-vindas
      const welcomeMessage = aiConfigs && aiConfigs.length > 0 
        ? `Hello! I am ${aiConfigs[0].ai_name}, your email AI assistant at ${aiConfigs[0].company_name}. How can I help you today? You can ask me questions about scholarships, enrollment processes, or any other university-related questions.`
        : 'Hello! I am your email AI in demonstration mode. How can I help you today? You can ask me questions about scholarships, enrollment processes, or any other university-related questions.';

      setChatMessages([{
        id: '1',
        type: 'ai',
        message: welcomeMessage,
        timestamp: new Date()
      }]);
      
      // Abrir modal do chatbot
      setShowTestChat(true);
      
    } catch (error) {
      console.error('❌ Erro ao abrir chatbot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`❌ Error: ${errorMessage}\n\n💡 Solution: Reconnect your Microsoft account first.`);
    }
  };

  // Função para enviar mensagem no chatbot
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      message: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      console.log('📤 [sendChatMessage] Enviando para email-queue-worker:', {
        message: chatInput.trim(),
        userId,
        chatbotMode: true,
        sessionId
      });

      // Chamar Edge Function para processar com Gemini
      const { data: result, error } = await supabase.functions.invoke('email-queue-worker', {
        body: {
          message: chatInput.trim(),
          userId: userId,
          chatbotMode: true,
          sessionId: sessionId
        }
      });

      console.log('📥 [sendChatMessage] Resposta recebida:', { result, error });

      if (error) {
        console.error('❌ [sendChatMessage] Erro da Edge Function:', error);
        console.log('🔍 [sendChatMessage] Detalhes do erro:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Verificar se é erro de limite atingido (429 Too Many Requests)
        const isLimitError = error.message?.includes('Daily prompt limit reached') || 
            error.message?.includes('429') || 
            error.message?.includes('Too Many Requests') ||
            error.status === 429 ||
            error.name?.includes('FunctionsHttpError');
            
        console.log('🔍 [sendChatMessage] Verificando se é erro de limite:', isLimitError);
        
        if (isLimitError) {
          console.log('🚫 [sendChatMessage] LIMITE ATINGIDO - Bloqueando interface');
          
          // Atualizar usageInfo para mostrar limite atingido
          console.log('🔄 [sendChatMessage] Atualizando usageInfo para limite atingido');
          setUsageInfo({
            prompts_used: 5,
            max_prompts: 5,
            remaining_prompts: 0
          });
          console.log('✅ [sendChatMessage] usageInfo atualizado:', { prompts_used: 5, max_prompts: 5, remaining_prompts: 0 });
          
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai' as const,
            message: '🚫 You have reached the limit of 5 messages per day. The limit will reset in 24 hours.',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, aiMessage]);
          return;
        }
        
        // Fallback: Se for qualquer erro 429, tratar como limite
        if (error.status === 429 || error.message?.includes('429')) {
          console.log('🚫 [sendChatMessage] FALLBACK - Detectando erro 429 como limite');
          setUsageInfo({
            prompts_used: 5,
            max_prompts: 5,
            remaining_prompts: 0
          });
          
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai' as const,
            message: '🚫 You have reached the limit of 5 messages per day. The limit will reset in 24 hours.',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, aiMessage]);
          return;
        }
        
        // Erro genérico discreto com mais detalhes no console
        console.error('❌ [sendChatMessage] Detalhes do erro:', {
          message: error.message,
          details: error
        });
        
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          message: 'Sorry, I was unable to process your message at the moment. Please try again.',
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        return;
      }

      // Atualizar informações de uso se disponíveis
      if (result?.usage) {
        setUsageInfo({
          prompts_used: result.usage.prompts_used,
          max_prompts: result.usage.max_prompts,
          remaining_prompts: result.usage.remaining_prompts
        });
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        message: result?.response || 'Sorry, I was unable to process your message.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        message: 'Sorry, I was unable to process your message at the moment. Please try again.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Função para fechar o chatbot
  const closeTestChat = () => {
    setShowTestChat(false);
    setChatMessages([]);
    setChatInput('');
  };

  const handleEmailSelect = (email: ProcessedEmail | MicrosoftGraphEmail) => {
    setSelectedEmail(email);
  };

  const handleCompose = () => {
    // Abrir modal de compose completo (como na página principal)
    setComposeMode('compose');
    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      message: ''
    });
    setShowComposeModal(true);
  };

  const [_composeNotice, setComposeNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [_showComposeSuccessModal, setShowComposeSuccessModal] = useState(false);

  const handleSendEmail = async () => {
    if (!composeData.to.trim() || !composeData.subject.trim() || !composeData.message.trim()) {
      setComposeNotice({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    if (!activeConnection) {
      setComposeNotice({ type: 'error', message: 'Microsoft account not connected. Please connect your Microsoft account first.' });
      return;
    }

    try {
      console.log('📤 Sending email via Microsoft Graph from inbox...');
      
      // Create GraphService with the active connection
      const graphService = new GraphService(activeConnection.access_token);
      
      // Prepare recipients
      const toRecipients = composeData.to.split(',').map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));

      const ccRecipients = composeData.cc ? composeData.cc.split(',').map(email => ({
        emailAddress: {
          address: email.trim()
        }
      })) : [];

      const bccRecipients = composeData.bcc ? composeData.bcc.split(',').map(email => ({
        emailAddress: {
          address: email.trim()
        }
      })) : [];

      // Create email message
      const emailMessage = {
        subject: composeData.subject,
        body: {
          contentType: 'HTML',
          content: composeData.message.replace(/\n/g, '<br>')
        },
        toRecipients: toRecipients,
        ccRecipients: ccRecipients,
        bccRecipients: bccRecipients
      };

      // Send email
      await graphService.sendEmail(emailMessage);
      
      console.log('✅ Email sent successfully from inbox');
      setComposeNotice(null);
      setShowComposeSuccessModal(true);
      
      // Reset form and close modal
      setComposeData({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        message: ''
      });
      setShowComposeModal(false);
      
      // Optionally refresh emails
      // await loadEmails();
      
    } catch (error) {
      console.error('❌ Error sending email from inbox:', error);
      setComposeNotice({ type: 'error', message: 'Erro ao enviar email: ' + (error instanceof Error ? error.message : 'Erro desconhecido') });
    }
  };

  // Exibir toast se vier state da navegação (ex.: pós-envio do compose)
  useEffect(() => {
    try {
      const nav = (window as any).history?.state;
      const st = nav && nav.usr && nav.usr.toast ? nav.usr.toast : null;
      if (st?.message) {
        setComposeNotice({ type: st.type || 'success', message: st.message });
        setTimeout(() => setComposeNotice(null), 4000);
        // limpar state para não reaparecer em refresh
        history.replaceState({ ...history.state, usr: {} }, document.title);
      }
    } catch {}
  }, []);


  const handleReply = () => {
    if (!selectedEmail) return;
    
    const email = selectedEmail as MicrosoftGraphEmail;
    const fromEmail = email.from?.emailAddress?.address || email.from?.emailAddress?.name || '';
    const subject = email.subject || '';
    
    setComposeMode('reply');
    setComposeData({
      to: fromEmail,
      cc: '',
      bcc: '',
      subject: subject.startsWith('Re: ') ? subject : `Re: ${subject}`,
      message: '' // Campo vazio para o usuário escrever sua resposta
    });
    
    // Fechar email viewer no mobile para não sobrepor o modal
    if (isMobile) {
      setSelectedEmail(null);
    }
    
    setShowComposeModal(true);
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    
    const email = selectedEmail as MicrosoftGraphEmail;
    const subject = email.subject || '';
    
    setComposeMode('forward');
    setComposeData({
      to: '',
      cc: '',
      bcc: '',
      subject: subject.startsWith('Fwd: ') ? subject : `Fwd: ${subject}`,
      message: `\n\n---------- Forwarded message ---------\nFrom: ${email.from?.emailAddress?.name || email.from?.emailAddress?.address}\nDate: ${formatDate(email.receivedDateTime)}\nSubject: ${subject}\n\n${email.bodyPreview || ''}`
    });
    
    // Fechar email viewer no mobile para não sobrepor o modal
    if (isMobile) {
      setSelectedEmail(null);
    }
    
    setShowComposeModal(true);
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
      // DESABILITADO: Carregamento automático
      console.log('⚠️ Pastas não carregadas - use o botão refresh para carregar');
      // await loadAllFolders();
    }
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return formatDateUS(date.toISOString());
  };

  // Determinar quais emails mostrar baseado na pasta ativa
  const getEmailsToShow = () => {
    // Debug log removido
    
    // Se temos emails da pasta específica carregados, usar eles
    if (folderEmails[activeTab] && folderEmails[activeTab].length > 0) {
      // Usando emails da pasta específica
      return folderEmails[activeTab];
    }
    
    // Para outras pastas, usar emails processados pela IA como fallback
    // Usando fallback para emails
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
    <div className="h-screen flex flex-col bg-gray-50 m-0 p-0 -mt-8">
      {/* Connection Status */}
      <MicrosoftConnectionStatus onReconnect={() => {
        // Recarregar dados após reconexão
        loadAllFolders();
      }} />
      
      {/* New emails notification */}
      {newEmailNotification.show && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
          <Mail className="h-5 w-5" />
          <span className="font-medium">
            {newEmailNotification.count} new{newEmailNotification.count > 1 ? 's' : ''} email{newEmailNotification.count > 1 ? 's' : ''} detected!
          </span>
          <span className="text-sm">AI activated automatically</span>
        </div>
      )}

      {/* Header - Responsive Outlook Style */}
      <div className="h-16 bg-blue-600 flex items-center justify-between px-4 md:px-6 text-white m-0 p-0 -mt-8">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 md:h-8 md:w-8" />
            <span className="text-lg md:text-xl font-semibold">Outlook</span>
          </div>
        </div>
        
        {/* Search bar - hidden on mobile, visible on desktop */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-white text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile search button */}
          {isMobile && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {/* Account selector for multiple Microsoft accounts */}
          {connections && connections.length > 1 && (
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xs text-blue-100 hidden md:inline">Account:</span>
              <select
                value={activeConnection?.email_address || ''}
                onChange={(e) => {
                  const selectedConnection = connections.find(conn => conn.email_address === e.target.value);
                  
                  if (selectedConnection) {
                    // Update active connection using the hook's setActiveConnection method
                    setActiveConnection(selectedConnection.email_address);
                    
                    // Aguardar um pouco para a mudança ser processada
                    setTimeout(() => {
                      // Refresh da página para garantir que tudo seja reinicializado corretamente
                      window.location.reload();
                    }, 500);
                  }
                }}
                className="bg-white text-gray-700 text-xs md:text-sm px-2 md:px-3 py-1 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-300 focus:outline-none hover:bg-gray-50 max-w-32 md:max-w-none"
              >
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.email_address}>
                    {isMobile ? connection.email_address.split('@')[0] : connection.email_address}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* User name display */}
          <div className="flex items-center gap-2 text-white">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium">
              {activeConnection?.email_address?.split('@')[0] || 'User'}
            </span>
          </div>
          
          {/* <MicrosoftAccountSelector onAccountChange={(email) => {
            // Limpar cache e recarregar emails quando a conta muda
            setFolderCache({});
            setFolderEmails({});
            setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
            loadAllFolders();
          }} /> */}
          <button 
            onClick={() => {
              console.log('🔄 Refresh manual - carregando emails...');
              loadAllFolders();
            }}
            disabled={loadingEmails}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            title="Refresh emails"
          >
            <RefreshCw className={`h-5 w-5 ${loadingEmails ? 'animate-spin' : ''}`} />
          </button>
          {/* <button className="p-2 hover:bg-blue-700 rounded-lg transition-colors">
            <Settings className="h-5 w-5" />
          </button>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="h-5 w-5" />
          </div> */}
        </div>
      </div>

      {/* Mobile Search Modal */}
      {isMobile && showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="bg-white p-4 m-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Search</h3>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notificação de Reconexão */}
      {Object.values(folderErrors).some(error => error.includes('desconectada')) && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Microsoft Account Disconnected:</strong> Your Microsoft account has been disconnected. 
                <button 
                  onClick={() => window.location.href = '/school/dashboard/email/management'}
                  className="ml-2 text-yellow-800 underline hover:text-yellow-900"
                >
                  Click here to reconnect
                </button>
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Main Content - Responsive */}
      <div className="flex-1 flex min-h-0">
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Responsive */}
        <div className={`${isMobile ? (sidebarOpen ? 'fixed left-0 top-0 h-full w-64 z-50' : 'hidden') : 'w-64'} bg-white border-r border-gray-200 flex-col transition-all duration-300`}>
          {/* Mobile Close Button */}
          {isMobile && (
            <div className="flex justify-end p-4 border-b border-gray-200">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          )}
          
          {/* New Email Button */}
          <div className="p-4">
            <button
              onClick={handleCompose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              New email
            </button>
          </div>

                {/* Create AI Agent Button */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setShowKnowledgeBase(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Bot className="h-4 w-4" />
                    Create AI Agent
                  </button>
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
                  {activeConnection?.email_address?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {activeConnection?.email_address || 'user@outlook.com'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - Responsive */}
        <div className={`flex-1 flex min-h-0 ${isMobile ? 'w-full' : ''}`}>
          {/* Email List - Always visible */}
          <div className="flex-1 border-r border-gray-200 flex flex-col bg-white">
            {/* Mobile Tab Navigation Removed - Using Sidebar Instead */}

            {/* Email List Header - Responsive */}
            <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
              {isMobile ? (
                <div className="flex items-center gap-2">
                  <span className={sidebarNavItems.find(item => item.id === activeTab)?.color || 'text-gray-600'}>
                    {getFolderIcon(activeTab, true, loadingFolders[activeTab], !!folderErrors[activeTab])}
                  </span>
                  <h2 className="text-sm font-medium text-gray-900">
                    {sidebarNavItems.find(item => item.id === activeTab)?.label || 'Microsoft Email'}
                  </h2>
                  {emailCounts[activeTab as keyof typeof emailCounts] > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {emailCounts[activeTab as keyof typeof emailCounts]}
                    </span>
                  )}
                </div>
              ) : (
                <>
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
                        <span>Loading...</span>
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
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="starred">Starred</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {loadingFolders[activeTab] ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading folder...</p>
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
                    className={`${isMobile ? 'p-2' : 'p-3'} border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    } ${!email.isRead ? 'bg-blue-50/30 font-semibold' : ''}`}
                    onClick={() => handleEmailSelect(email)}
                  >
                    <div className={`flex items-start ${isMobile ? 'gap-2' : 'gap-3'}`}>
                      <div className="flex-shrink-0">
                        <div className={`${isMobile ? 'w-5 h-5' : 'w-8 h-8'} bg-blue-100 rounded-full flex items-center justify-center`}>
                          <span className={`text-blue-600 ${isMobile ? 'text-xs' : 'text-xs'} font-medium`}>
                            {(email as MicrosoftGraphEmail).from?.emailAddress?.name?.charAt(0) || 
                             (email as ProcessedEmail).from?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900 truncate`}>
                            {(email as MicrosoftGraphEmail).from?.emailAddress?.name || 
                             (email as ProcessedEmail).from || 'Unknown'}
                          </h4>
                          <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>
                            {isMobile ? 
                              formatDate((email as ProcessedEmail).processedAt || (email as MicrosoftGraphEmail).receivedDateTime).split(' ')[0] :
                              formatDate((email as ProcessedEmail).processedAt || (email as MicrosoftGraphEmail).receivedDateTime)
                            }
                          </span>
                        </div>
                        <h5 className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-900 mb-1 truncate`}>
                          {email.subject || 'Sem assunto'}
                        </h5>
                        <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-600 ${isMobile ? 'line-clamp-1' : 'line-clamp-2'}`}>
                          {(email as MicrosoftGraphEmail).bodyPreview || 
                           (email as ProcessedEmail).analysis?.summary || 
                           'Nenhuma visualização disponível'}
                        </p>
                        {email.isStarred && (
                          <StarIcon className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3'} text-yellow-500 mt-1`} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Viewer - Desktop only */}
          <div className="hidden md:flex flex-1 flex flex-col bg-white">
            {selectedEmail ? (
              <>
                {/* Email Header - Responsive */}
                <div className="p-3 md:p-4 border-b border-gray-200">
                  {/* Mobile Back Button */}
                  {isMobile && (
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => setSelectedEmail(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-gray-900">Back to emails</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
                      {selectedEmail.subject || 'Sem assunto'}
                    </h2>
                    <div className={`flex items-center gap-1 ${isMobile ? 'hidden' : ''}`}>
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
                      <div className="text-gray-600 whitespace-pre-wrap">
                        {(selectedEmail as MicrosoftGraphEmail).bodyPreview || 
                         (selectedEmail as ProcessedEmail).analysis?.summary || 
                         'Nenhum conteúdo disponível'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Actions - Responsive */}
                <div className="p-3 md:p-4 border-t border-gray-200">
                  {/* Mobile Action Buttons */}
                  {isMobile && (
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <button
                        onClick={handleReply}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Reply className="h-4 w-4" />
                        <span className="text-sm">Reply</span>
                      </button>
                      <button
                        onClick={handleForward}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Forward className="h-4 w-4" />
                        <span className="text-sm">Forward</span>
                      </button>
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-2 ${isMobile ? 'hidden' : ''}`}>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an email to view</h3>
                  <p className="text-gray-500">Choose an email from the list to read its content</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

             {/* AI Agent Creation Modal */}
             {showKnowledgeBase && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                 <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden relative">
                   {/* Botão X no canto superior direito do modal */}
                   <button
                     onClick={() => setShowKnowledgeBase(false)}
                     className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100 z-10"
                     title="Close modal"
                   >
                     <X className="h-5 w-5" />
                   </button>
                   
                   <div className="p-6 overflow-y-auto max-h-[90vh]">
                     <EmailAgentManagement 
                       activeEmailConfig={activeConnection ? {
                         id: activeConnection.id,
                         email_address: activeConnection.email_address
                       } : undefined}
                     />
                   </div>
                 </div>
               </div>
             )}

             {/* Test AI Chatbot Modal */}
             {showTestChat && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                 <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                   {/* Header */}
                   <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
                         <Bot className="h-6 w-6" />
                       </div>
                       <div>
                         <h2 className="text-lg font-semibold">AI Test</h2>
                         <p className="text-sm text-blue-100">Demonstration chatbot</p>
                       </div>
                     </div>
                     <button
                       onClick={closeTestChat}
                       className="text-white hover:text-blue-200 transition-colors"
                     >
                       <XCircle className="h-6 w-6" />
                     </button>
                   </div>

                   {/* Chat Messages */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                     {chatMessages.map((message) => (
                       <div
                         key={message.id}
                         className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                       >
                         <div
                           className={`max-w-[80%] rounded-lg px-4 py-2 ${
                             message.type === 'user'
                               ? 'bg-blue-600 text-white'
                               : 'bg-white text-gray-800 border border-blue-200 shadow-sm'
                           }`}
                         >
                           <p className="text-sm">{message.message}</p>
                           <p className="text-xs opacity-70 mt-1">
                             {message.timestamp.toLocaleTimeString()}
                           </p>
                         </div>
                       </div>
                     ))}
                     
                     {isChatLoading && (
                       <div className="flex justify-start">
                         <div className="bg-white text-gray-800 border border-blue-200 shadow-sm rounded-lg px-4 py-2">
                           <div className="flex items-center gap-2">
                             <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                             <span className="text-sm">AI is thinking...</span>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Usage Info */}
                   {usageInfo && (
                     <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                       <div className="flex items-center justify-between text-xs text-blue-700">
                         <span>Prompts used: {usageInfo.prompts_used}/{usageInfo.max_prompts}</span>
                         <span className="font-medium">
                           {usageInfo.remaining_prompts > 0 
                             ? `${usageInfo.remaining_prompts} remaining`
                             : 'Limit reached'
                           }
                         </span>
                       </div>
                       <div className="w-full bg-blue-200 rounded-full h-1 mt-1">
                         <div 
                           className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                           style={{ width: `${(usageInfo.prompts_used / usageInfo.max_prompts) * 100}%` }}
                         />
                       </div>
                     </div>
                   )}

                   {/* Chat Input */}
                   <div className="p-4 border-t bg-white">
                     <div className="flex gap-2">
                       <input
                         type="text"
                         value={chatInput}
                         onChange={(e) => setChatInput(e.target.value)}
                         onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                         placeholder={usageInfo && usageInfo.remaining_prompts === 0 ? "Limit reached - try again tomorrow" : "Type your message..."}
                         className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                           usageInfo && usageInfo.remaining_prompts === 0 
                             ? 'border-red-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                             : 'border-blue-300'
                         }`}
                         disabled={isChatLoading || (usageInfo?.remaining_prompts === 0)}
                       />
                       <button
                         onClick={sendChatMessage}
                         disabled={!chatInput.trim() || isChatLoading || (usageInfo?.remaining_prompts === 0)}
                         className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                           usageInfo && usageInfo.remaining_prompts === 0
                             ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                             : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                         }`}
                       >
                         {isChatLoading ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                           <SendIcon className="h-4 w-4" />
                         )}
                         Send
                       </button>
                     </div>
                     <p className={`text-xs mt-2 ${
                       usageInfo && usageInfo.remaining_prompts === 0 
                         ? 'text-red-500 font-medium' 
                         : 'text-gray-500'
                     }`}>
                       {usageInfo && usageInfo.remaining_prompts === 0 
                         ? '🚫 Daily limit reached. Try again tomorrow or contact support to increase your limit.'
                         : '💡 Tip: Ask questions about scholarships, enrollment or university processes'
                       }
                     </p>
                   </div>
                 </div>
               </div>
             )}

             {/* Email Compose Modal - Original Design */}
             {showComposeModal && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                   {/* Header - Clean Design */}
                   <div className="flex items-center justify-between p-6 border-b border-gray-200">
                     <div className="flex items-center gap-4">
                       <button
                         onClick={() => setShowComposeModal(false)}
                         className="text-gray-600 hover:text-gray-800 transition-colors"
                       >
                         <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                         </svg>
                       </button>
                       <div>
                         <h2 className="text-2xl font-bold text-gray-900">
                           {composeMode === 'reply' ? 'Reply Message' : 
                            composeMode === 'forward' ? 'Forward Message' : 
                            'New Message'}
                         </h2>
                         <p className="text-sm text-gray-600">From: Microsoft Account ({activeConnection?.email_address || 'user@outlook.com'})</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <select className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700">
                         <option>Microsoft Account</option>
                       </select>
                       <button
                         onClick={() => setShowComposeModal(false)}
                         className="text-gray-600 hover:text-gray-800 transition-colors p-2"
                       >
                         <X className="h-5 w-5" />
                       </button>
                     </div>
                   </div>

                   {/* Compose Form - Original Layout */}
                   <div className="flex-1 overflow-y-auto p-6">
                     <div className="space-y-4">
                       {/* To Field */}
                       <div className="flex items-center gap-4">
                         <label className="w-16 text-sm font-medium text-gray-700">To</label>
                         <div className="flex-1">
                           <input
                             type="email"
                             value={composeData.to}
                             onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                             placeholder="recipient@email.com"
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           />
                         </div>
                       </div>

                       {/* Recipient Options */}
                       <div className="flex gap-4 ml-20">
                         <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ Add recipient</button>
                         <button 
                           onClick={() => setComposeData(prev => ({ ...prev, cc: prev.cc ? '' : 'cc@email.com' }))}
                           className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                         >
                           + CC
                         </button>
                         <button 
                           onClick={() => setComposeData(prev => ({ ...prev, bcc: prev.bcc ? '' : 'bcc@email.com' }))}
                           className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                         >
                           + BCC
                         </button>
                       </div>

                       {/* CC Field */}
                       {composeData.cc && (
                         <div className="flex items-center gap-4">
                           <label className="w-16 text-sm font-medium text-gray-700">CC</label>
                           <div className="flex-1">
                             <input
                               type="email"
                               value={composeData.cc}
                               onChange={(e) => setComposeData(prev => ({ ...prev, cc: e.target.value }))}
                               placeholder="cc@email.com"
                               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                             />
                           </div>
                         </div>
                       )}

                       {/* BCC Field */}
                       {composeData.bcc && (
                         <div className="flex items-center gap-4">
                           <label className="w-16 text-sm font-medium text-gray-700">BCC</label>
                           <div className="flex-1">
                             <input
                               type="email"
                               value={composeData.bcc}
                               onChange={(e) => setComposeData(prev => ({ ...prev, bcc: e.target.value }))}
                               placeholder="bcc@email.com"
                               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                             />
                           </div>
                         </div>
                       )}

                       {/* Subject Field */}
                       <div className="flex items-center gap-4">
                         <label className="w-16 text-sm font-medium text-gray-700">Subject</label>
                         <div className="flex-1">
                           <input
                             type="text"
                             value={composeData.subject}
                             onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                             placeholder="Email subject"
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           />
                         </div>
                       </div>

                       {/* Message Body */}
                       <div>
                         <textarea
                           value={composeData.message}
                           onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                           placeholder="Type your message here..."
                           rows={12}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                         />
                       </div>
                     </div>
                   </div>

                   {/* Footer - Original Design */}
                   <div className="p-6 border-t border-gray-200">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <button className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                           ► Advanced: Add HTML content
                         </button>
                       </div>
                       <div className="flex items-center gap-4">
                         <div className="flex items-center gap-3">
                           <button
                             onClick={() => setShowComposeModal(false)}
                             className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                           >
                             Cancel
                           </button>
                           <button 
                             onClick={handleSendEmail}
                             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                           >
                             Send
                           </button>
                         </div>
                         <div className="text-sm text-gray-500">
                           {composeData.message.length} characters
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}

      {/* Mobile Email Viewer Modal */}
      {isMobile && selectedEmail && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full flex flex-col">
            {/* Mobile Email Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-900">Back to emails</span>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">
                  {selectedEmail.subject || 'Sem assunto'}
                </h2>
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
                    {formatDate((selectedEmail as ProcessedEmail).processedAt || (selectedEmail as MicrosoftGraphEmail).receivedDateTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Email Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="prose max-w-none text-sm">
                {(selectedEmail as MicrosoftGraphEmail).body?.content ? (
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: (selectedEmail as MicrosoftGraphEmail).body?.content || '' 
                    }}
                  />
                ) : (
                  <div className="text-gray-600 whitespace-pre-wrap">
                    {(selectedEmail as MicrosoftGraphEmail).bodyPreview || 
                     (selectedEmail as ProcessedEmail).analysis?.summary || 
                     'Nenhum conteúdo disponível'}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Email Actions */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReply}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  <span className="text-sm">Reply</span>
                </button>
                <button
                  onClick={handleForward}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Forward className="h-4 w-4" />
                  <span className="text-sm">Forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button Removed - Sidebar Always Visible */}

    </div>
  );
}

// Export default já declarado na linha 65