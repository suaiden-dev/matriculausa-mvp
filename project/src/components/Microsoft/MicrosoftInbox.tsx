'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, RefreshCw, Inbox as InboxIcon,
  Send as SendIcon, Star as StarIcon, FileText, AlertTriangle, Trash,
  Bot, Play, Loader2, XCircle,
  Search, MoreVertical, Reply, Forward, User,
  Plus, Archive, Folder, FolderOpen, BookOpen,
  Send, X, Paperclip, Save
} from 'lucide-react';
import { useAuthToken } from '../../hooks/useAuthToken';
import { useMicrosoftConnection } from '../../hooks/useMicrosoftConnection';
import { formatDateUS } from '../../lib/dateUtils';
import GraphService from '../../lib/graphService';
import MicrosoftAccountSelector from './MicrosoftAccountSelector';
import EmailKnowledgeManagement from '../../pages/SchoolDashboard/EmailKnowledgeManagement';
import EmailAgentManagement from '../../pages/SchoolDashboard/EmailAgentManagement';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';

// Função para extrair email do token MSAL
const getEmailFromToken = async (token: string): Promise<string> => {
  try {
    // Fazer requisição para Microsoft Graph para obter informações do usuário
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao obter dados do usuário: ${response.status}`);
    }

    const userData = await response.json();
    return userData.mail || userData.userPrincipalName || 'unknown@microsoft.com';
  } catch (error) {
    console.error('Erro ao obter email do token:', error);
    return 'unknown@microsoft.com';
  }
};

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
  // Hook para gerenciar múltiplas conexões Microsoft (usado pelo MicrosoftAccountSelector)
  const { activeConnection, connections } = useMicrosoftConnection();
  // Hook para obter o universityId
  const { university } = useUniversity();
  

  // Estados do AIManager
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'active' | 'error' | 'loading'>('idle');
  const [recentEmails, setRecentEmails] = useState<ProcessedEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);

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

  // Função para buscar pastas de email
  const fetchMailFolders = async () => {
    if (!getToken) return;
    
    try {
      // Usar token da conta ativa se disponível; senão usar MSAL
      let token;
      if (activeConnection?.access_token) {
        // Using saved token for folders
        token = activeConnection.access_token;
      } else {
        // No saved token found, using MSAL fallback
        token = await getToken();
      }
      
      // Verificar se o token é válido
      if (!token) {
        throw new Error('Token de acesso não disponível');
      }
      
      // Criar GraphService com refresh token e config ID para renovação automática
      const graphService = new GraphService(
        token, 
        activeConnection?.refresh_token, 
        activeConnection?.id
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
        console.log('🔄 Token expirado detectado ao buscar pastas, tentando renovação...');
        // Tentar renovar token
        try {
          const newToken = await getToken();
          if (newToken) {
            console.log('✅ Token renovado, tentando novamente...');
            const graphService = new GraphService(newToken);
            const folders = await graphService.getMailFolders();
            setMailFolders(folders.value || []);
            return folders.value || [];
          }
        } catch (renewError) {
          console.error('❌ Falha ao renovar token:', renewError);
        }
      }
      
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
  const fetchEmailsFromFolder = useCallback(async (folderId: string, folderKey: string, forceRefresh = false) => {
    if (!getToken || !folderId) return;
    
    // Verificar cache se não for refresh forçado
    if (!forceRefresh && isCacheValid(folderKey)) {
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
      // Usar token da conta ativa se disponível; senão usar MSAL
      let token;
      if (activeConnection?.access_token) {
        console.log(`MicrosoftInbox - Usando token salvo para ${folderKey}`);
        token = activeConnection.access_token;
      } else {
        console.log(`MicrosoftInbox - Nenhum token salvo encontrado para ${folderKey}. Fallback para MSAL.`);
        token = await getToken();
      }
      
      // Verificar se o token é válido
      if (!token) {
        throw new Error('Token de acesso não disponível');
      }
      
      // Criar GraphService com refresh token e config ID para renovação automática
      const graphService = new GraphService(
        token, 
        activeConnection?.refresh_token, 
        activeConnection?.id
      );
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
      
      console.log(`📧 MicrosoftInbox - Salvando ${emailData.length} emails para pasta ${folderKey}`);
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
        console.log('🔄 Token inválido/expirado detectado, silenciando erro...');
        // Não mostrar erro para o usuário para evitar confusão
        setFolderErrors(prev => ({ 
          ...prev, 
          [folderKey]: '' 
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
    }
  }, [getToken, activeConnection?.access_token, folderCache, isCacheValid]);


  // Função para carregar todas as pastas e seus emails
  const loadAllFolders = useCallback(async () => {
    if (!getToken) return;
    
    setLoadingEmails(true);
    try {
      // Iniciando loadAllFolders
      // Buscar pastas
      const folders = await fetchMailFolders();
      
      if (folders.length === 0) {
        // Nenhuma pasta encontrada
        setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
        return;
      }
      
      const folderMapping = getFolderMapping(folders);
      console.log('🔄 MicrosoftInbox - Mapeamento de pastas:', folderMapping);
      
      // Buscar emails de cada pasta SEQUENCIALMENTE para evitar rate limiting
      const newCounts = { inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 };
      
      // Processar pastas uma por vez com delay entre elas
      for (const [key, folderId] of Object.entries(folderMapping)) {
        try {
          console.log(`🔄 MicrosoftInbox - Processando pasta ${key} (${folderId})`);
          
          // Adicionar delay entre requisições para evitar rate limiting
          if (Object.values(newCounts).some(count => count > 0)) {
            console.log('⏳ MicrosoftInbox - Aguardando delay entre requisições...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Reduzido para 1 segundo
          }
          
          const emails = await fetchEmailsFromFolder(folderId, key, true);
          const count = emails.length;
          console.log(`📧 MicrosoftInbox - Pasta ${key}: ${count} emails`);
          
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
      
      console.log('📊 MicrosoftInbox - Contadores finais:', newCounts);
      setEmailCounts(newCounts);
      
    } catch (error) {
      console.error('MicrosoftInbox - Erro ao carregar pastas:', error);
    } finally {
      setLoadingEmails(false);
    }
  }, [getToken, activeConnection?.email_address, fetchMailFolders, fetchEmailsFromFolder]);

  // Recarregar emails quando activeConnection muda (otimizado para evitar loops)
  useEffect(() => {
    if (activeConnection && activeConnection.access_token) {
      // Limpar cache e recarregar apenas uma vez
      setFolderCache({});
      setFolderEmails({});
      setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
      
      // Usar setTimeout para evitar loops
      const timeoutId = setTimeout(() => {
        loadAllFolders();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else if (activeConnection && !activeConnection.access_token) {
      // Tentar obter token via MSAL apenas uma vez
      if (getToken) {
        getToken().then(() => {
          loadAllFolders();
        }).catch(error => {
          console.error('Erro ao obter token:', error);
        });
      }
    }
  }, [activeConnection?.email_address]); // Removido access_token das dependências para evitar loops

  // Verificar status do sistema quando o componente carrega
  useEffect(() => {
    // console.log('MicrosoftInbox - useEffect executado, accounts.length:', accounts.length);
    
    if (!getToken) {
      setStatus('idle');
      return;
    }

    if (accounts.length === 0) {
      setStatus('idle');
      return;
    }

    // Usuário logado, sistema pronto para uso manual
    setStatus('idle');
    
    // Carregar todas as pastas e emails quando o usuário fizer login
    loadAllFolders();
    
    // Iniciar polling automático quando o usuário faz login
    startProcessing();
  }, [getToken, accounts.length]);

  // Polling automático para detectar novos emails
  useEffect(() => {
    if (!getToken || accounts.length === 0) return;

    
    // Verificar novos emails a cada 5 minutos (reduzido para evitar spam)
    const pollingInterval = setInterval(async () => {
      try {
        // Buscar apenas emails da caixa de entrada (inbox) para detecção de novos
        const folders = await fetchMailFolders();
        const folderMapping = getFolderMapping(folders);
        const inboxId = folderMapping.inbox;
        
        if (inboxId) {
          const emails = await fetchEmailsFromFolder(inboxId, 'inbox', true);
          const newCount = emails.length;
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
          console.log('🔄 Token expirado detectado, tentando renovação...');
          
          try {
            // Tentar renovar token
            const newToken = await getToken();
            console.log('✅ Token renovado com sucesso');
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
  }, [getToken, accounts.length, emailCounts.inbox]);

  // Funções do AIManager

  const startProcessing = async () => {
    setLoading(true);

    try {
      console.log('🔄 MicrosoftInbox - Iniciando processamento real...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ Usuário não encontrado');
        setStatus('error');
        return;
      }

      // Buscar configuração existente
      const { data: existingConfig, error: fetchError } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider_type', 'microsoft')
        .eq('is_active', true)
        .single();

      if (fetchError || !existingConfig) {
        console.error('❌ Configuração Microsoft não encontrada:', fetchError);
        setStatus('error');
        return;
      }

      console.log('✅ Configuração encontrada:', existingConfig);
      setStatus('active');
    } catch (error) {
      console.error('❌ Erro ao iniciar processamento:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const stopProcessing = async () => {
    console.log('🔄 MicrosoftInbox - Parando processamento real...');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('❌ Usuário não encontrado');
        setStatus('error');
        return;
      }

      // Desativar configuração existente
      const { data, error } = await supabase
        .from('email_configurations')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('provider_type', 'microsoft')
        .select();

      if (error) {
        console.error('❌ Erro ao desativar configuração:', error);
        throw error;
      }

      console.log('✅ Processamento parado com sucesso:', data);
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
    console.log('🧪 MicrosoftInbox - Abrindo chatbot de teste...');
    
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
        throw new Error('Configuração Microsoft não encontrada. Conecte sua conta primeiro.');
      }

      // Verificar se há pelo menos uma configuração ativa
      const activeConfig = microsoftConfigs.find(config => config.is_active);
      if (!activeConfig) {
        throw new Error('Conta Microsoft desconectada. Reconecte sua conta primeiro.');
      }


      // Verificar se há agente de IA configurado (mais flexível)
      const { data: aiConfigs, error: aiError } = await supabase
        .from('ai_configurations')
        .select('*')
        .eq('university_id', user.id)
        .eq('is_active', true);

      if (aiError) {
        console.error('❌ Erro ao buscar agente de IA:', aiError);
        // Continuar mesmo sem agente - modo demo
        console.log('⚠️ Agente de IA não encontrado, continuando em modo demo');
      }

      // Inicializar chatbot com mensagem de boas-vindas
      const welcomeMessage = aiConfigs && aiConfigs.length > 0 
        ? 'Hello! I am your email AI. How can I help you today? You can ask me questions about scholarships, enrollment processes, or any other university-related questions.'
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
      alert(`❌ Erro: ${error.message}\n\n💡 Solução: Reconecte sua conta Microsoft primeiro.`);
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
      console.log('🤖 Enviando mensagem para Gemini API...');
      
      // Chamar Edge Function para processar com Gemini
      const { data: result, error } = await supabase.functions.invoke('email-queue-worker', {
        body: {
          message: chatInput.trim(),
          userId: (await supabase.auth.getUser()).data.user?.id,
          chatbotMode: true,
          sessionId: sessionId
        }
      });

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        
        // Verificar se é erro de limite atingido
        if (error.message?.includes('Daily prompt limit reached') || error.message?.includes('429')) {
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai' as const,
            message: '🚫 You have reached the limit of 5 prompts per session. Please try again tomorrow or contact support to increase your limit.',
            timestamp: new Date()
          };
          setChatMessages(prev => [...prev, aiMessage]);
          return;
        }
        
        throw new Error(`AI Error: ${error.message}`);
      }

      console.log('✅ Resposta da Gemini:', result);

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
        message: result?.response || result?.analysis?.summary || 'Sorry, I could not process your message.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      
      // Fallback para resposta simulada se Gemini falhar
      const fallbackResponses = [
        "Entendo sua pergunta! Com base nas informações que tenho, posso ajudá-lo com isso. Você gostaria de mais detalhes?",
        "Excelente pergunta! Vou analisar isso para você. Deixe-me verificar as informações mais recentes.",
        "Posso ajudá-lo com essa questão. Baseado no meu conhecimento sobre bolsas de estudo, aqui está o que posso te dizer...",
        "Ótima pergunta! Vou processar essa informação e dar uma resposta detalhada para você.",
        "Entendo! Deixe-me analisar sua pergunta e fornecer a melhor resposta possível."
      ];

      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        message: `⚠️ Modo demo: ${randomResponse}`,
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
    console.log('📧 MicrosoftInbox - Abrindo compositor de email...');
    setShowComposeModal(true);
  };

  // Função para forçar recarregamento completo
  const forceReload = async () => {
    console.log('🔄 MicrosoftInbox - Forçando recarregamento completo...');
    
    // Limpar todos os estados
    setFolderCache({});
    setFolderEmails({});
    setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
    setFolderErrors({});
    setMailFolders([]);
    
    // Aguardar um pouco e recarregar
    setTimeout(() => {
      console.log('🔄 MicrosoftInbox - Iniciando recarregamento após limpeza...');
      loadAllFolders();
    }, 500);
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

      {/* Header - Outlook Style */}
      <div className="h-16 bg-blue-600 flex items-center justify-between px-6 text-white m-0 p-0 -mt-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-8 w-8" />
            <span className="text-xl font-semibold">Outlook</span>
            {/* {connections.length > 1 && (
              <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {connections.length} contas
              </div>
            )} */}
          </div>
        </div>
        
        <div className="flex-1 max-w-2xl mx-8">
          <div className="relative">
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

        <div className="flex items-center gap-4">
          {/* Account selector for multiple Microsoft accounts */}
          {connections && connections.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-100">Account:</span>
              <select
                value={activeConnection?.id || ''}
                onChange={(e) => {
                  const selectedConnection = connections.find(conn => conn.id === e.target.value);
                  if (selectedConnection) {
                    // Update active connection in localStorage
                    localStorage.setItem('active_microsoft_connection', JSON.stringify(selectedConnection));
                    // Reload the page to refresh the connection
                    window.location.reload();
                  }
                }}
                className="bg-blue-500 text-white text-sm px-3 py-1 rounded-lg border border-blue-400 focus:ring-2 focus:ring-blue-300 focus:outline-none"
              >
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.email_address}
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
              {activeConnection?.email_address?.split('@')[0] || accounts[0]?.name || 'User'}
            </span>
          </div>
          
          {/* <MicrosoftAccountSelector onAccountChange={(email) => {
            console.log('Account changed to:', email);
            // Limpar cache e recarregar emails quando a conta muda
            setFolderCache({});
            setFolderEmails({});
            setEmailCounts({ inbox: 0, sent: 0, drafts: 0, archive: 0, spam: 0, trash: 0 });
            loadAllFolders();
          }} /> */}
          <button 
            onClick={loadAllFolders}
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
                  {activeConnection?.email_address?.split('@')[0] || accounts[0]?.name || 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {activeConnection?.email_address || accounts[0]?.username || 'user@outlook.com'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* Email List */}
          <div className="flex-1 border-r border-gray-200 flex flex-col bg-white">
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
          <div className="flex-1 flex flex-col bg-white">
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
                 <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
                  <div className="flex items-center p-6 border-b">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Bot className="h-5 w-5 text-green-600" />
                        Create AI Agent for Emails
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Configure your AI agent and add documents to the knowledge base
                      </p>
                    </div>
                  </div>
                   <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                     <EmailAgentManagement />
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
                         disabled={isChatLoading || (usageInfo && usageInfo.remaining_prompts === 0)}
                       />
                       <button
                         onClick={sendChatMessage}
                         disabled={!chatInput.trim() || isChatLoading || (usageInfo && usageInfo.remaining_prompts === 0)}
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

             {/* Email Compose Modal */}
             {showComposeModal && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                 <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                   {/* Header */}
                   <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                         <Send className="h-6 w-6" />
                       </div>
                       <div>
                         <h2 className="text-lg font-semibold">New Email</h2>
                         <p className="text-sm text-blue-100">Compose and send email</p>
                       </div>
                     </div>
                     <button
                       onClick={() => setShowComposeModal(false)}
                       className="text-white hover:text-blue-200 transition-colors"
                     >
                       <X className="h-6 w-6" />
                     </button>
                   </div>

                   {/* Compose Form */}
                   <div className="flex-1 overflow-y-auto p-6">
                     <div className="space-y-4">
                       {/* To Field */}
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Para
                         </label>
                         <input
                           type="email"
                           placeholder="Digite o email do destinatário"
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                       </div>

                       {/* Subject Field */}
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Assunto
                         </label>
                         <input
                           type="text"
                           placeholder="Digite o assunto do email"
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                       </div>

                       {/* Body Field */}
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Mensagem
                         </label>
                         <textarea
                           placeholder="Digite sua mensagem aqui..."
                           rows={10}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                         />
                       </div>
                     </div>
                   </div>

                   {/* Footer */}
                   <div className="p-4 border-t bg-gray-50">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                           <Paperclip className="h-5 w-5" />
                         </button>
                         <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                           <Save className="h-5 w-5" />
                         </button>
                       </div>
                       <div className="flex items-center gap-3">
                         <button
                           onClick={() => setShowComposeModal(false)}
                           className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                         >
                           Cancelar
                         </button>
                         <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                           <Send className="h-4 w-4" />
                           Enviar
                         </button>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
    </div>
  );
}