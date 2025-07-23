import React, { useState, useEffect } from 'react';
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
  Trash
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useGmail } from '../../hooks/useGmail';
import { useGmailConnection } from '../../hooks/useGmailConnection';
import { useAuth } from '../../hooks/useAuth';
import EmailComposer from '../../components/EmailComposer';
import EmailList from '../../components/Inbox/EmailList';
import EmailDetail from '../../components/Inbox/EmailDetail';
import EmailTabs from '../../components/Inbox/EmailTabs';
import InboxHeader from '../../components/Inbox/InboxHeader';
import SearchAndFilters from '../../components/Inbox/SearchAndFilters';
import { supabase } from '../../lib/supabase';
import { formatDateUS } from '../../lib/dateUtils';
import { Email } from '../../types';

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
    border-radius: 8px;
    overflow: hidden;
  }
  
  /* Melhorar espaçamento geral */
  .email-wrapper .email-html-content {
    padding: 0;
  }
  
  .email-wrapper .email-text-content {
    padding: 0;
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
  const { connection, loading: isConnecting, connectGmail, disconnectGmail } = useGmailConnection();
  const { emails, loading, error, fetchEmails, hasMoreEmails, loadMoreEmails } = useGmail();
  
  // Estados para controle do layout
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [composerEmail, setComposerEmail] = useState<any>(null);
  const [showEmailIntegration, setShowEmailIntegration] = useState(false);
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});

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

  ];

  // Verificar parâmetros da URL para mostrar mensagens de status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const error = params.get('error');
    const email = params.get('email');

    if (status === 'success' && email) {
      console.log(`Gmail account ${email} connected successfully!`);
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
  }, []);

  useEffect(() => {
    if (connection) {
      fetchEmails();
    }
  }, [connection, fetchEmails]);

  const handleConnectGmail = async () => {
    try {
      await connectGmail();
    } catch (error) {
      console.error('Error connecting Gmail:', error);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
    }
  };

  const handleRefresh = () => {
    if (connection) {
      fetchEmails();
    }
  };

  const handleSearch = () => {
    if (connection) {
      fetchEmails({ query: searchTerm });
    }
  };

  const handleCompose = () => {
    if (!connection) return;
    setIsComposing(true);
    setSelectedEmail(null);
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      console.log('Email sent successfully!');
    setIsComposing(false);
    setComposerEmail(null);
      fetchEmailsForTab(activeTab);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const handleForwardEmail = () => {
    if (selectedEmail) {
      const forwardData = {
        to: '',
        subject: `Fwd: ${selectedEmail.subject}`,
        body: `\n\n---------- Forwarded message ----------\nFrom: ${selectedEmail.from}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body || selectedEmail.snippet}`
      };
      
      setComposerEmail(forwardData);
      setIsComposing(true);
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

  const fetchEmailsForTab = async (tabId: string) => {
    const tab = emailTabs.find(t => t.id === tabId);
    if (tab && connection) {
      await fetchEmails({ labelIds: tab.labelIds, maxResults: 50 });
    }
  };

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    setSelectedEmail(null);
    await fetchEmailsForTab(tabId);
  };

  const handleReply = (email: Email) => {
    setComposerEmail(email);
    setIsComposing(true);
  };

  const updateEmailCounts = async () => {
    if (!connection) return;
    
    const counts: {[key: string]: number} = {};
    
    for (const tab of emailTabs) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) continue;

        console.log(`🔍 Fetching count for ${tab.label} (${tab.id}) with labelIds:`, tab.labelIds);

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-gmail-inbox`, {
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
  };

  useEffect(() => {
    if (connection && activeTab) {
      fetchEmailsForTab(activeTab);
    }
  }, [connection, activeTab]);

  useEffect(() => {
    if (connection) {
      updateEmailCounts();
    }
  }, [connection]);

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
                      {connection ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {connection && (
                    <button
                      onClick={handleDisconnectGmail}
                      className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Disconnect
                    </button>
                  )}
                  <button
                    onClick={handleConnectGmail}
                    disabled={isConnecting || !!connection}
                    className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#041f3f] transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{connection ? 'Connected' : 'Connect'}</span>
                  </button>
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
  if (!connection) {
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
            connection={connection}
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
              updateEmailCounts();
            }}
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
              <EmailDetail
                email={selectedEmail}
                onReply={handleReply}
                onForward={handleForwardEmail}
                formatDate={formatDate}
              />
            </div>
          </div>
        </div>

        {/* Email Composer */}
        <EmailComposer
          isOpen={isComposing}
          onClose={() => setIsComposing(false)}
          onSend={handleSendEmail}
          originalEmail={composerEmail}
        />

        {/* Manage Connections Modal */}
        {showManageConnections && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    
              <div className="space-y-6">
                {/* Current Connection Status */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Connection</h4>
                  {connection ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-full flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{connection.email}</p>
                            <p className="text-sm text-gray-500">Gmail Account</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-600 font-medium">Connected</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Connected since: {new Date(connection.created_at).toLocaleDateString()}</p>
                        <p>Last updated: {new Date(connection.updated_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Mail className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">No email account connected</p>
            </div>
          )}
        </div>

                {/* Connection Actions */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Actions</h4>
                  
                  {connection ? (
                    <div className="space-y-3">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh Connection</span>
                    </button>
                      
                    <button
                        onClick={handleDisconnectGmail}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                      >
                        <Unlink className="w-4 h-4" />
                        <span>Disconnect Gmail</span>
                    </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGmail}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                    >
                      <Link className="w-4 h-4" />
                      <span>Connect Gmail Account</span>
                    </button>
                  )}
                  </div>

                {/* Connection Info */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">About Email Connections</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Your email data is encrypted and secure</li>
                    <li>• Only email access is requested (no other permissions)</li>
                    <li>• You can disconnect anytime</li>
                    <li>• Connection is used only for this dashboard</li>
                  </ul>
                </div>
              </div>

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