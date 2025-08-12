import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  RefreshCw,
  Plus,
  Settings,
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  Shield,
  X,
  Link,
  Unlink,
  Inbox as InboxIcon,
  Send as SendIcon,
  Star as StarIcon,
  FileText,
  AlertTriangle,
  Trash,
  BookOpen
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useGmail } from '../../hooks/useGmail';
import { useGmailConnection } from '../../hooks/useGmailConnection';
import { useAuth } from '../../hooks/useAuth';
import EmailComposer from '../../components/EmailComposer';
import ReplyComposer from '../../components/ReplyComposer';
import ForwardComposer from '../../components/ForwardComposer';
import EmailList from '../../components/Inbox/EmailList';
import EmailDetail from '../../components/Inbox/EmailDetail';
import EmailTabs from '../../components/Inbox/EmailTabs';
import InboxHeader from '../../components/Inbox/InboxHeader';
import SearchAndFilters from '../../components/Inbox/SearchAndFilters';
import InboxKnowledgeUpload from '../../components/InboxKnowledgeUpload';
import { supabase } from '../../lib/supabase';
import { config } from '../../lib/config';
import { formatDateUS } from '../../lib/dateUtils';
import { Email } from '../../types';
import GmailConnectionManager from '../../components/GmailConnectionManager';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import { useUniversity } from '../../context/UniversityContext';

// Estilos CSS personalizados para scroll das abas e melhor legibilidade
const tabScrollStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .tab-container {
    scroll-behavior: smooth;
  }
  @media (max-width: 640px) {
    .tab-container {
      scroll-snap-type: x mandatory;
    }
    .tab-item {
      scroll-snap-align: start;
    }
  }
  
  /* Melhorar legibilidade de emails grandes */
  .email-content {
    line-height: 1.7;
    font-size: 16px;
  }
  
  .email-content p {
    margin-bottom: 1rem;
  }
  
  .email-content h1, .email-content h2, .email-content h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }
  
  .email-content ul, .email-content ol {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }
  
  .email-content li {
    margin-bottom: 0.25rem;
  }
  
  .email-content blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: #6b7280;
  }
  
  .email-content a {
    color: #05294E;
    text-decoration: underline;
  }
  
  .email-content a:hover {
    color: #041f3f;
  }
  
  /* Estilos para emails HTML - Manter formatação original */
  .email-html-content {
    /* Reset de estilos para não interferir com o HTML do email */
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    font-size: 14px;
  }
  
  .email-html-content * {
    /* Preservar estilos originais do email */
    box-sizing: border-box;
  }
  
  .email-html-content body {
    /* Reset do body do email */
    margin: 0;
    padding: 0;
    font-family: inherit;
    line-height: inherit;
    color: inherit;
    font-size: inherit;
  }
  
  .email-html-content img {
    /* Garantir que imagens sejam responsivas */
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0.5rem 0;
  }
  
  .email-html-content table {
    /* Estilos para tabelas em emails */
    border-collapse: collapse;
    width: 100%;
    margin: 0.5rem 0;
    font-size: inherit;
  }
  
  .email-html-content table td,
  .email-html-content table th {
    border: 1px solid #ddd;
    padding: 0.5rem;
    text-align: left;
    vertical-align: top;
  }
  
  .email-html-content a {
    /* Links em emails HTML */
    color: #0066cc;
    text-decoration: underline;
  }
  
  .email-html-content a:hover {
    color: #004499;
  }
  
  .email-html-content p {
    /* Parágrafos em emails */
    margin: 0.5rem 0;
    line-height: 1.6;
  }
  
  .email-html-content h1,
  .email-html-content h2,
  .email-html-content h3,
  .email-html-content h4,
  .email-html-content h5,
  .email-html-content h6 {
    /* Títulos em emails */
    margin: 1rem 0 0.5rem 0;
    font-weight: 600;
    line-height: 1.3;
  }
  
  .email-html-content h1 { font-size: 1.5rem; }
  .email-html-content h2 { font-size: 1.3rem; }
  .email-html-content h3 { font-size: 1.1rem; }
  .email-html-content h4 { font-size: 1rem; }
  .email-html-content h5 { font-size: 0.9rem; }
  .email-html-content h6 { font-size: 0.8rem; }
  
  .email-html-content ul,
  .email-html-content ol {
    /* Listas em emails */
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  
  .email-html-content li {
    /* Itens de lista em emails */
    margin: 0.25rem 0;
    line-height: 1.5;
  }
  
  .email-html-content blockquote {
    /* Citações em emails */
    border-left: 4px solid #ddd;
    padding-left: 1rem;
    margin: 1rem 0;
    font-style: italic;
    color: #666;
    background-color: #f9f9f9;
    padding: 0.5rem 1rem;
  }
  
  .email-html-content pre {
    /* Código em emails */
    background-color: #f5f5f5;
    padding: 0.75rem;
    border-radius: 4px;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    margin: 0.5rem 0;
    border: 1px solid #ddd;
  }
  
  .email-html-content code {
    background-color: #f5f5f5;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    border: 1px solid #ddd;
  }
  
  .email-html-content div {
    /* Divs em emails */
    margin: 0;
    padding: 0;
  }
  
  .email-html-content span {
    /* Spans em emails */
    font-size: inherit;
    color: inherit;
  }
  
  .email-html-content br {
    /* Quebras de linha em emails */
    display: block;
    content: "";
    margin: 0.25rem 0;
  }
  
  /* Estilos específicos para emails de serviços populares */
  .email-html-content .gmail_quote {
    /* Estilo para citações do Gmail */
    border-left: 2px solid #ccc;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #666;
  }
  
  .email-html-content .gmail_signature {
    /* Assinatura do Gmail */
    border-top: 1px solid #ddd;
    padding-top: 1rem;
    margin-top: 1rem;
    color: #666;
    font-size: 0.9rem;
  }
  
  /* Estilos para emails responsivos */
  @media (max-width: 768px) {
    .email-html-content {
      font-size: 16px; /* Melhor legibilidade em mobile */
    }
    
    .email-html-content table {
      font-size: 14px;
    }
    
    .email-html-content img {
      max-width: 100%;
      height: auto;
    }
  }
  
  /* Estilos para texto simples */
  .email-text-content {
    line-height: 1.7;
    font-size: 16px;
    color: #374151;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  
  /* Wrapper para emails */
  .email-wrapper {
    background: white;
    overflow: hidden;
  }
  
  /* Melhorar espaçamento geral */
  .email-wrapper .email-html-content {
    padding: 0;
  }
  
  .email-wrapper .email-text-content {
    padding: 0;
  }
  
  /* CSS global para remover bordas de emails (versão menos agressiva) */
  .email-html-content table,
  .email-html-content td,
  .email-html-content th {
    border: none !important;
    border-collapse: collapse !important;
    border-spacing: 0 !important;
  }
  
  .email-html-content img {
    border: none !important;
    outline: none !important;
    display: block !important;
    max-width: 100% !important;
    height: auto !important;
  }
  
  .email-html-content a img {
    border: none !important;
    outline: none !important;
    text-decoration: none !important;
  }
  
  /* Remove apenas bordas e sombras, mantém outros estilos */
  .email-html-content * {
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  
  /* Remove backgrounds apenas de elementos específicos (NÃO links) */
  .email-html-content table,
  .email-html-content td,
  .email-html-content th,
  .email-html-content div,
  .email-html-content p,
  .email-html-content span {
    background: transparent !important;
  }
  
  /* Garante que links sejam visíveis */
  .email-html-content a {
    color: inherit !important;
    text-decoration: inherit !important;
    display: inline-block !important;
  }
  
  /* Garante que links com imagens sejam visíveis */
  .email-html-content a img {
    display: block !important;
    max-width: 100% !important;
    height: auto !important;
    border: none !important;
    outline: none !important;
  }
  
  /* Garante que botões e elementos clicáveis sejam visíveis */
  .email-html-content button,
  .email-html-content input[type="button"],
  .email-html-content input[type="submit"] {
    background: inherit !important;
    color: inherit !important;
  }
  
  /* Fallback para imagens que falham */
  .email-html-content .image-placeholder {
    display: none;
    color: #666 !important;
    font-style: italic !important;
    padding: 10px !important;
    background: #f5f5f5 !important;
    border: 1px dashed #ccc !important;
    text-align: center !important;
    margin: 5px 0 !important;
  }
`;

interface EmailTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  labelIds: string[];
  count?: number;
  color?: string;
}

const Inbox: React.FC = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  
  const { connections, activeConnection, loading: isConnecting, connectGmail, disconnectGmail, setActiveConnection, checkConnections } = useGmailConnection();
  const { emails, loading, error, fetchEmails, hasMoreEmails, loadMoreEmails, clearEmails, autoRefreshStatus, checkUnreadEmails } = useGmail();
  
  // Estados para controle do layout
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [composerEmail, setComposerEmail] = useState<any>(null);
  const [replyEmail, setReplyEmail] = useState<Email | null>(null);
  const [forwardEmail, setForwardEmail] = useState<Email | null>(null);
  const [showEmailIntegration, setShowEmailIntegration] = useState(false);
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<any[]>([]);

  // Definição das abas disponíveis
  const emailTabs: EmailTab[] = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: <InboxIcon className="h-4 w-4" />,
      labelIds: ['INBOX'],
      color: 'text-blue-600'
    },
    {
      id: 'sent',
      label: 'Sent',
      icon: <SendIcon className="h-4 w-4" />,
      labelIds: ['SENT'],
      color: 'text-green-600'
    },
    {
      id: 'starred',
      label: 'Starred',
      icon: <StarIcon className="h-4 w-4" />,
      labelIds: ['STARRED'],
      color: 'text-yellow-600'
    },
    {
      id: 'drafts',
      label: 'Drafts',
      icon: <FileText className="h-4 w-4" />,
      labelIds: ['DRAFT'],
      color: 'text-gray-600'
    },
    {
      id: 'spam',
      label: 'Spam',
      icon: <AlertTriangle className="h-4 w-4" />,
      labelIds: ['SPAM'],
      color: 'text-red-600'
    },
    {
      id: 'trash',
      label: 'Trash',
      icon: <Trash className="h-4 w-4" />,
      labelIds: ['TRASH'],
      color: 'text-gray-500'
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      icon: <BookOpen className="h-4 w-4" />,
      labelIds: ['KNOWLEDGE'],
      color: 'text-purple-600'
    },
  ];

  // Função para atualizar contagens de emails
  const updateEmailCounts = useCallback(async (specificEmail?: string) => {
    const emailToUse = specificEmail || activeConnection?.email;
    if (!emailToUse) return;
    
    console.log('📊 Updating email counts for:', emailToUse);
    
    const counts: {[key: string]: number} = {};
    
    for (const tab of emailTabs) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) continue;

        console.log(`🔍 Fetching count for ${tab.label} (${tab.id}) with labelIds:`, tab.labelIds);

        const response = await fetch(`${config.getSupabaseUrl()}/functions/v1/get-gmail-inbox?email=${encodeURIComponent(emailToUse)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            maxResults: 1,
            labelIds: tab.labelIds,
            countOnly: true
          }),
        });

        const result = await response.json();
        console.log(`📊 Result for ${tab.label}:`, result);
        
        if (result.success) {
          counts[tab.id] = result.totalCount || 0;
          console.log(`✅ ${tab.label}: ${counts[tab.id]} emails`);
        } else {
          console.error(`❌ Failed to get count for ${tab.label}:`, result.error);
          counts[tab.id] = 0;
        }
      } catch (error) {
        console.error(`❌ Error fetching count for ${tab.label}:`, error);
        counts[tab.id] = 0;
      }
    }
    
    console.log('📈 Final email counts:', counts);
    setEmailCounts(counts);
  }, [activeConnection?.email]);

  // Verificar parâmetros da URL para mostrar mensagens de status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const error = params.get('error');
    const email = params.get('email');

    if (status === 'success' && email) {
      console.log(`Gmail account ${email} connected successfully!`);
      // Recarregar conexões e definir a nova conta como ativa
      checkConnections().then(() => {
        // Definir a nova conta como ativa
        setActiveConnection(email);
        // Recarregar emails da nova conta
        fetchEmails();
        updateEmailCounts(email);
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        'oauth_failed': 'Failed to connect Gmail. Please try again.',
        'no_code': 'Authorization was cancelled.',
        'config_missing': 'Gmail configuration is missing. Please contact support.',
        'token_exchange_failed': 'Failed to complete Gmail connection.',
        'user_not_found': 'User not found. Please log in again.',
        'save_failed': 'Failed to save Gmail connection.',
        'unexpected_error': 'An unexpected error occurred.'
      };
      
      console.error('Gmail connection error:', errorMessages[error] || 'An error occurred while connecting Gmail.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkConnections, setActiveConnection, fetchEmails, updateEmailCounts]);

  useEffect(() => {
    if (activeConnection) {
      fetchEmails();
    }
  }, [activeConnection, fetchEmails]);

  const handleConnectGmail = async () => {
    try {
      await connectGmail();
    } catch (error) {
      console.error('Error connecting Gmail:', error);
    }
  };





  const handleRefresh = () => {
    if (activeConnection) {
      fetchEmails();
    }
  };

  const handleCheckUnreadEmails = () => {
    if (activeConnection) {
      checkUnreadEmails();
    }
  };

  const handleSearch = () => {
    if (activeConnection) {
      fetchEmails({ query: searchTerm });
    }
  };

  const handleCompose = () => {
    if (!activeConnection) return;
    setComposerEmail(null);
    setReplyEmail(null);
    setForwardEmail(null);
    setIsComposing(true);
    setIsReplying(false);
    setIsForwarding(false);
    setSelectedEmail(null);
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      console.log('Email sent successfully!');
      setIsComposing(false);
      setIsReplying(false);
      setIsForwarding(false);
      setComposerEmail(null);
      setReplyEmail(null);
      setForwardEmail(null);
      fetchEmailsForTab(activeTab);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const handleForwardEmail = () => {
    console.log('📧 Inbox handleForwardEmail: Called with selectedEmail:', {
      id: selectedEmail?.id,
      from: selectedEmail?.from,
      subject: selectedEmail?.subject
    });
    
    if (selectedEmail) {
      setForwardEmail(selectedEmail);
      setIsForwarding(true);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'low': return 'text-blue-500';
      default: return 'text-slate-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateUS(dateString);
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.snippet.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && !email.isRead) ||
                         (filter === 'starred' && (email as any).isStarred);
    
    return matchesSearch && matchesFilter;
  });

  const handleLoadMore = async () => {
    if (hasMoreEmails) {
      try {
        await loadMoreEmails();
      } catch (error) {
        console.error('Error loading more emails:', error);
      }
    }
  };

  const fetchEmailsForTab = useCallback(async (tabId: string) => {
    const tab = emailTabs.find(t => t.id === tabId);
    if (tab && activeConnection) {
      await fetchEmails({ labelIds: tab.labelIds, maxResults: 50 });
    }
  }, [activeConnection, fetchEmails]);

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    setSelectedEmail(null);
    await fetchEmailsForTab(tabId);
  };

  const handleReply = (email: Email) => {
    console.log('📧 Inbox handleReply: email received:', {
      id: email.id,
      from: email.from,
      subject: email.subject,
      hasHtmlBody: !!email.htmlBody,
      hasBody: !!email.body,
      htmlBodyLength: email.htmlBody?.length || 0,
      bodyLength: email.body?.length || 0,
      htmlBodyPreview: email.htmlBody?.substring(0, 100) + '...',
      bodyPreview: email.body?.substring(0, 100) + '...'
    });
    setReplyEmail(email);
    setIsReplying(true);
  };

  useEffect(() => {
    console.log('🔄 Inbox useEffect: activeConnection or activeTab changed');
    console.log('🔄 activeConnection:', activeConnection?.email);
    console.log('🔄 activeTab:', activeTab);
    
    if (activeConnection && activeTab) {
      console.log('🔄 Calling fetchEmailsForTab for:', activeTab);
      fetchEmailsForTab(activeTab);
    }
  }, [activeConnection?.email, activeTab, fetchEmailsForTab]);

  useEffect(() => {
    console.log('🔄 Inbox useEffect: activeConnection changed');
    console.log('🔄 activeConnection:', activeConnection?.email);
    
    if (activeConnection) {
      console.log('🔄 Calling updateEmailCounts for:', activeConnection.email);
      updateEmailCounts(activeConnection.email);
    }
  }, [activeConnection?.email, updateEmailCounts]);

  // PRIMEIRO: Verificar se o perfil está completo ANTES de qualquer outra verificação
  // Se perfil não estiver completo, mostrar o guard ANTES de qualquer verificação de email
  if (university?.profile_completed !== true) {
    return (
      <ProfileCompletionGuard 
        isProfileCompleted={university?.profile_completed}
        title="Profile setup required"
        description="Complete your university profile to start creating and managing scholarships"
      >
        {/* Este conteúdo nunca será renderizado porque o guard sempre mostrará a tela de setup */}
        <div></div>
      </ProfileCompletionGuard>
    );
  }

  // Se mostrar integração de email, renderizar a página de integração
  if (showEmailIntegration) {
    return (
      <div className="h-full bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] px-6 py-4 rounded-2xl mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Email Integration</h1>
                  <p className="text-white/80 text-sm">Connect your email accounts to get started</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailIntegration(false)}
                className="bg-white/20 text-white px-3 py-2 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Inbox</span>
              </button>
            </div>
          </div>

          {/* Email Provider Connections */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-[#D0151C]" />
                <h2 className="text-lg font-semibold text-slate-900">Email Provider Connections</h2>
        </div>
              <button 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Email provider settings"
                aria-label="Email provider settings"
              >
                <Settings className="h-4 w-4" />
              </button>
      </div>
            
            <p className="text-slate-600 mb-6">Connect your email accounts for AI-powered email features only.</p>
            
            <div className="space-y-4">
              {/* Google (Gmail) Connection */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
            </div>
                              <div>
                    <p className="font-medium text-slate-900">Google (Gmail)</p>
                    <p className="text-sm text-slate-500">
                      {activeConnection 
                        ? `Connected (${connections.length} account${connections.length > 1 ? 's' : ''})`
                        : 'Not connected'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {activeConnection ? (
                    <button
                      onClick={() => setShowManageConnections(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Manage Connections</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectGmail}
                      disabled={isConnecting}
                      className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#041f3f] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Microsoft (Outlook) Connection */}
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">M</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Microsoft (Outlook)</p>
                    <p className="text-sm text-slate-500">Not connected</p>
                  </div>
                </div>
                <button
                  disabled
                  className="bg-[#05294E] text-white px-4 py-2 rounded-lg opacity-50 cursor-not-allowed flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Connect</span>
                </button>
              </div>
            </div>
          </div>

          {/* Benefits of Email Integration */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Benefits of Email Integration</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-slate-700">Centralized email management</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-slate-700">AI-powered response suggestions</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-slate-700">Automatic email categorization</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-slate-700">Real-time notifications</span>
              </div>
            </div>
          </div>
          
          {/* Secure Connection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Secure Connection</h2>
            </div>
            
            <p className="text-slate-700">
              Your email credentials are securely stored and encrypted. We only access the permissions you authorize.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se não estiver conectado, mostrar tela de conexão
  if (!activeConnection) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Gmail</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Connect your Gmail account to send and receive emails directly from your dashboard. 
              This will allow you to manage all your university communications in one place.
            </p>
            <button
              onClick={handleConnectGmail}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Link className="w-5 h-5" />
              Connect Gmail Account
            </button>
            <div className="mt-6 text-sm text-gray-500">
              <p>🔒 Your data is secure and encrypted</p>
              <p>📧 Only email access is requested</p>
              <p>🔄 You can disconnect anytime</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Se chegou até aqui, o perfil está completo e a conexão Gmail está ativa
  // Renderizar a interface principal do Inbox
  return (
      <div className="min-h-screen bg-gray-50">
        <style>{tabScrollStyles}</style>
        <div className="min-h-screen flex flex-col">
          {/* Main Inbox Container - Ocupando toda a tela */}
          <div className="flex-1 bg-white overflow-hidden flex flex-col min-h-0">
            {/* Header */}
            <InboxHeader
              activeTab={activeTab}
              loading={loading}
              filteredEmails={filteredEmails}
              emailCounts={emailCounts}
              onCompose={handleCompose}
              onShowEmailIntegration={() => setShowEmailIntegration(true)}
              onShowManageConnections={() => setShowManageConnections(true)}
              connection={activeConnection}
              onAccountChange={(email) => {
                console.log('🔄 Inbox: onAccountChange called with:', email);
                console.log('🔄 Inbox: Current activeConnection before change:', activeConnection?.email);
                
                // Mudar para a nova conta
                setActiveConnection(email);
                
                console.log('🔄 Inbox: Account changed to:', email);
                console.log('🔄 Inbox: Refreshing page to load new account emails...');
                
                // Refresh da página para carregar os emails da nova conta
                window.location.reload();
              }}
            />

        {/* Search and Filters */}
            <SearchAndFilters
              searchTerm={searchTerm}
              filter={filter}
              onSearchChange={setSearchTerm}
              onFilterChange={setFilter}
              onSearch={handleSearch}
            />

            {/* Email Tabs Navigation */}
            <EmailTabs
              tabs={emailTabs}
              activeTab={activeTab}
              emailCounts={emailCounts}
              loading={loading}
              onTabChange={handleTabChange}
              onRefresh={() => {
                fetchEmailsForTab(activeTab);
                updateEmailCounts(activeConnection?.email);
              }}
              onCheckUnread={handleCheckUnreadEmails}
              checkUnreadStatus={autoRefreshStatus}
            />

            {/* Email Content - Layout Expandido */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
              {/* Email List */}
              <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto bg-white flex flex-col">
                <EmailList
                  emails={filteredEmails}
                  selectedEmail={selectedEmail}
                  loading={loading}
                  error={error}
                  searchTerm={searchTerm}
                  activeTab={activeTab}
                  hasMoreEmails={hasMoreEmails}
                  emailCounts={emailCounts}
                  onEmailSelect={handleEmailSelect}
                  onLoadMore={handleLoadMore}
                  getPriorityColor={getPriorityColor}
                  getPriorityIcon={getPriorityIcon}
                  formatDate={formatDate}
              />
            </div>
            
              {/* Email Detail - Mais espaço para conteúdo */}
              <div className="flex-1 flex flex-col bg-white min-h-0">
                {activeTab === 'knowledge' ? (
                  <div className="flex-1 p-6 overflow-y-auto">
                    <InboxKnowledgeUpload
                      universityId={user?.university_id || university?.id || '09a32358-9210-4da7-b465-556ed429d82a'}
                      onDocumentsChange={setKnowledgeDocuments}
                      existingDocuments={knowledgeDocuments}
                    />
                  </div>
                ) : (
                  <EmailDetail
                    email={selectedEmail}
                    onReply={handleReply}
                    onForward={handleForwardEmail}
                    formatDate={formatDate}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Email Composer for new emails only */}
          <EmailComposer
            isOpen={isComposing}
            onClose={() => setIsComposing(false)}
            onSend={handleSendEmail}
            originalEmail={composerEmail}
          />

          {/* Reply Composer */}
          <ReplyComposer
            isOpen={isReplying}
            onClose={() => setIsReplying(false)}
            onSend={handleSendEmail}
            originalEmail={replyEmail!}
          />

          {/* Forward Composer */}
          <ForwardComposer
            isOpen={isForwarding}
            onClose={() => setIsForwarding(false)}
            onSend={handleSendEmail}
            originalEmail={forwardEmail!}
          />

                  {/* Manage Connections Modal */}
          {showManageConnections && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Manage Email Connections</h3>
                  <button
                    onClick={() => setShowManageConnections(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close manage connections modal"
                    aria-label="Close manage connections modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <GmailConnectionManager />
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowManageConnections(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
      </div>
  );
};

export default Inbox; 