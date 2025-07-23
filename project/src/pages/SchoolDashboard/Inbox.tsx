import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, 
  Search, 
  Filter, 
  MoreVertical, 
  Reply, 
  Forward, 
  Trash2, 
  Archive, 
  Star, 
  StarOff,
  Send,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Paperclip,
  Eye,
  EyeOff,
  Settings,

  AlertCircle,
  CheckCircle,
  X,
  Link,
  Unlink,
  ChevronUp,
  ChevronDown,
  Clock,
  MessageSquare,
  FileText,
  Shield,
  ArrowLeft,
  ExternalLink,
  Inbox as InboxIcon,
  Send as SendIcon,
  Star as StarIcon,
  AlertTriangle,
  Archive as ArchiveIcon,
  Trash,
  Tag
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useGmail } from '../../hooks/useGmail';
import { useGmailConnection } from '../../hooks/useGmailConnection';
import { useAuth } from '../../hooks/useAuth';
import EmailComposer from '../../components/EmailComposer';
import { supabase } from '../../lib/supabase';

// Estilos CSS personalizados para scroll das abas
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
`;

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  snippet: string;
  body: string; // Conteúdo completo do email
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  priority: 'high' | 'normal' | 'low';
  labels?: string[];
  avatar?: string;
}

// Definição das abas/pastas disponíveis
interface EmailTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  labelIds: string[];
  count?: number;
  color?: string;
}

const Inbox: React.FC = () => {
  const { emails, loading, error, fetchEmails, sendEmail, clearError, isConnected, loadMoreEmails, hasMoreEmails } = useGmail();
  const { connection, connectGmail, disconnectGmail, checkConnection } = useGmailConnection();
  const { user } = useAuth();
  const location = useLocation();
  
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [hasEmailConnection, setHasEmailConnection] = useState(false);
  const [composerEmail, setComposerEmail] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [templateResponses, setTemplateResponses] = useState(false);
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [showEmailIntegration, setShowEmailIntegration] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('inbox');
  const [emailCounts, setEmailCounts] = useState<{[key: string]: number}>({});
  const [loadingMore, setLoadingMore] = useState(false);

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
      id: 'archive',
      label: 'Archive',
      icon: <ArchiveIcon className="h-4 w-4" />,
      labelIds: ['CATEGORY_PERSONAL'],
      color: 'text-purple-600'
    }
  ];

  // Verificar parâmetros da URL para mostrar mensagens de status
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const error = params.get('error');
    const email = params.get('email');

    if (status === 'success' && email) {
      setStatusMessage({
        type: 'success',
        message: `Gmail account ${email} connected successfully!`
      });
      // Limpar URL
      window.history.replaceState({}, '', location.pathname);
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
      
      setStatusMessage({
        type: 'error',
        message: errorMessages[error] || 'An error occurred while connecting Gmail.'
      });
      // Limpar URL
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  useEffect(() => {
    if (isConnected) {
      fetchEmails();
      setHasEmailConnection(true);
    } else {
      setHasEmailConnection(false);
    }
  }, [isConnected, fetchEmails]);

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      await connectGmail();
    } catch (error) {
      console.error('Error connecting Gmail:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
      setHasEmailConnection(false);
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
    }
  };

  const handleRefresh = () => {
    if (isConnected) {
      fetchEmails();
    }
  };

  const handleSearch = () => {
    if (isConnected) {
      fetchEmails({ query: searchTerm });
    }
  };

  const handleCompose = () => {
    if (!isConnected) {
      return;
    }
    setIsComposing(true);
    setSelectedEmail(null);
  };

  const handleSendEmail = async (emailData: any) => {
    try {
      const result = await sendEmail(emailData);
      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Email sent successfully!'
        });
    setIsComposing(false);
    setComposerEmail(null);
        // Refresh emails to show the sent email
        fetchEmailsForTab(activeTab);
      } else {
        setStatusMessage({
          type: 'error',
          message: result.error || 'Failed to send email'
        });
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: 'An error occurred while sending email'
      });
    }
  };

  const handleForwardEmail = () => {
    if (selectedEmail) {
      // Preparar dados para forward
      const forwardData = {
        to: '',
        subject: `Fwd: ${selectedEmail.subject}`,
        body: `\n\n---------- Forwarded message ----------\nFrom: ${selectedEmail.from}\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body || selectedEmail.snippet}`,
        htmlBody: `
          <div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 20px 0; color: #666;">
            <p><strong>---------- Forwarded message ----------</strong></p>
            <p><strong>From:</strong> ${selectedEmail.from}</p>
            <p><strong>Date:</strong> ${selectedEmail.date}</p>
            <p><strong>Subject:</strong> ${selectedEmail.subject}</p>
            <br>
            <div>${selectedEmail.body || selectedEmail.snippet}</div>
          </div>
        `
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
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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

  // Função para carregar mais emails
  const handleLoadMore = async () => {
    if (hasMoreEmails && !loadingMore) {
      setLoadingMore(true);
      try {
        await loadMoreEmails();
      } catch (error) {
        console.error('Error loading more emails:', error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  // Função para buscar emails de uma aba específica
  const fetchEmailsForTab = async (tabId: string) => {
    const tab = emailTabs.find(t => t.id === tabId);
    if (tab && connection) {
      await fetchEmails({ labelIds: tab.labelIds, maxResults: 50 });
    }
  };

  // Função para trocar de aba
  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    setSelectedEmail(null); // Limpar email selecionado ao trocar de aba
    await fetchEmailsForTab(tabId);
  };

  // Buscar emails quando a aba ativa mudar
  useEffect(() => {
    if (connection && activeTab) {
      fetchEmailsForTab(activeTab);
    }
  }, [connection, activeTab]);

  // Função para atualizar contadores de emails
  const updateEmailCounts = async () => {
    if (!connection) return;
    
    const counts: {[key: string]: number} = {};
    
    // Buscar contadores para cada aba
    for (const tab of emailTabs) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) continue;

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-gmail-inbox`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            maxResults: 1, // Apenas para contar
            labelIds: tab.labelIds,
            countOnly: true
          }),
        });

        const result = await response.json();
        if (result.success) {
          counts[tab.id] = result.totalCount || 0;
        }
      } catch (error) {
        console.error(`Error fetching count for ${tab.label}:`, error);
        counts[tab.id] = 0;
      }
    }
    
    setEmailCounts(counts);
  };

  // Atualizar contadores quando conectar
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
  if (!isConnected) {
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
      <style>{tabScrollStyles}</style> {/* Aplicar estilos CSS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
      {statusMessage && (
          <div className={`mb-6 p-4 rounded-xl border-l-4 ${
          statusMessage.type === 'success' 
              ? 'bg-green-50 border-green-400' 
              : 'bg-red-50 border-red-400'
        }`}>
            <div className="flex items-center">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                statusMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {statusMessage.message}
                </p>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
                className={`text-sm ${
                  statusMessage.type === 'success' 
                    ? 'text-green-600 hover:text-green-500' 
                    : 'text-red-600 hover:text-red-500'
                }`}
                title="Dismiss message"
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

        {/* Main Inbox Container */}
        <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">
                    {emailTabs.find(t => t.id === activeTab)?.label || 'Inbox'}
                  </h1>
                  <p className="text-white/80 text-xs sm:text-sm">
                    {loading ? 'Loading...' : (
                      <>
                        {filteredEmails.length > 0 ? (
                          <>
                            {filteredEmails.length} message{filteredEmails.length !== 1 ? 's' : ''}
                            {emailCounts[activeTab] && emailCounts[activeTab] > filteredEmails.length && 
                              ` of ${emailCounts[activeTab]} total`
                            }
                          </>
                        ) : (
                          'No messages'
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={handleCompose}
                  disabled={!isConnected}
                  className="bg-white text-[#05294E] px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center space-x-1 sm:space-x-2 disabled:opacity-50 text-sm sm:text-base"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Compose</span>
                  <span className="sm:hidden">New</span>
                </button>
                <button 
                  onClick={() => setShowEmailIntegration(true)}
                  className="bg-white/20 text-white px-2 sm:px-3 py-2 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Manage Connections</span>
                  <span className="sm:hidden">Settings</span>
                </button>
                <button 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Email provider settings"
                  aria-label="Email provider settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

      {/* Search and Filters */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
            />
          </div>
          
              <div className="flex items-center space-x-1 sm:space-x-2">
            <select
              value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'starred')}
                  className="px-2 sm:px-3 py-2 text-sm sm:text-base border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              title="Filter emails"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="starred">Starred</option>
            </select>
                <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors" title="Filter emails">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

          {/* Email Tabs Navigation */}
          <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide flex-1 min-w-0 tab-container">
                {(() => {
                  // Filtrar abas que devem ser mostradas
                  const visibleTabs = emailTabs.filter(tab => {
                    // Sempre mostrar a aba ativa
                    if (activeTab === tab.id) return true;
                    // Mostrar outras abas apenas se tiverem emails
                    return emailCounts[tab.id] && emailCounts[tab.id] > 0;
                  });

                  // Se nenhuma aba ficou visível, mostrar pelo menos a aba ativa
                  const tabsToShow = visibleTabs.length > 0 ? visibleTabs : emailTabs.filter(tab => tab.id === activeTab);

                  return tabsToShow.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 tab-item ${
                        activeTab === tab.id
                          ? 'bg-[#05294E] text-white shadow-md'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title={`View ${tab.label} emails`}
                      aria-label={`View ${tab.label} emails`}
                    >
                      <span className={activeTab === tab.id ? 'text-white' : tab.color}>
                        {tab.icon}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span className="sm:hidden">{tab.label.charAt(0)}</span>
                        {emailCounts[tab.id] && emailCounts[tab.id] > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ml-1 ${
                            activeTab === tab.id 
                              ? 'bg-white/20 text-white' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {emailCounts[tab.id] > 999 ? `${(emailCounts[tab.id] / 1000).toFixed(1)}k` : emailCounts[tab.id]}
                          </span>
                        )}
                      </div>
                    </button>
                  ));
                })()}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={() => {
                  fetchEmailsForTab(activeTab);
                  updateEmailCounts();
                }}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                title="Refresh emails"
                aria-label="Refresh emails"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Email Content */}
          <div className="flex flex-col lg:flex-row h-[calc(100vh-280px)]">
        {/* Email List */}
            <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
                  <span className="ml-2 text-slate-600">Loading emails...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                  <span className="ml-2 text-red-600">{error}</span>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Mail className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No emails found</h3>
                  <p className="text-slate-500">
                    {searchTerm ? 'Try adjusting your search terms' : `No emails in ${emailTabs.find(t => t.id === activeTab)?.label}`}
                  </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                      className={`p-3 sm:p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedEmail?.id === email.id ? 'bg-blue-50 border-r-2 border-[#05294E]' : ''
                  } ${!email.isRead ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setSelectedEmail(email)}
                >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="flex-shrink-0">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-full flex items-center justify-center">
                            <span className="text-white text-xs sm:text-sm font-semibold">{email.from.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                            <p className={`font-medium text-xs sm:text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>{email.from}</p>
                        <div className="flex items-center space-x-1">
                              <span className="text-xs text-slate-500">{formatDate(email.date)}</span>
                              {email.hasAttachments && <Paperclip className="h-3 w-3 text-slate-400" />}
                            </div>
                          </div>
                          <p className={`text-xs sm:text-sm truncate mt-1 ${!email.isRead ? 'font-semibold' : ''}`}>{email.subject}</p>
                          <p className="text-xs text-slate-500 truncate mt-1">{email.snippet}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs ${getPriorityColor(email.priority)}`}>{getPriorityIcon(email.priority)} {email.priority}</span>
                            <button className="text-slate-400 hover:text-yellow-500 transition-colors">
                              {(email as any).isStarred ? <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-3 w-3 sm:h-4 sm:w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMoreEmails && (
                    <div className="p-4 text-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="bg-[#05294E] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#041f3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto"
                      >
                        {loadingMore ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span>{loadingMore ? 'Loading...' : 'Load More Emails'}</span>
                      </button>
                      <p className="text-xs text-slate-500 mt-2">
                        Showing {filteredEmails.length} of {emailCounts[activeTab] || 'many'} emails
                      </p>
                    </div>
                  )}
            </div>
          )}
        </div>

            {/* Email Detail */}
        <div className="flex-1 flex flex-col">
          {selectedEmail ? (
            <>
                  <div className="p-4 sm:p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{selectedEmail.subject}</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-slate-600">
                          <div className="flex items-center space-x-2"><User className="h-4 w-4" /><span>{selectedEmail.from}</span></div>
                          <div className="flex items-center space-x-2"><Calendar className="h-4 w-4" /><span>{formatDate(selectedEmail.date)}</span></div>
                          {selectedEmail.hasAttachments && <div className="flex items-center space-x-2"><Paperclip className="h-4 w-4" /><span>Has attachments</span></div>}
                    </div>
                  </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                          onClick={() => {
                            setComposerEmail(selectedEmail);
                            setIsComposing(true);
                          }}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Reply to email"
                          aria-label="Reply to email"
                        >
                          <Reply className="h-4 w-4" />
                    </button>
                    <button
                          onClick={handleForwardEmail}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Forward email"
                          aria-label="Forward email"
                    >
                          <Forward className="h-4 w-4" />
                    </button>
                        <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Archive email">
                          <Archive className="h-4 w-4" />
                    </button>
                        <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Delete email">
                          <Trash2 className="h-4 w-4" />
                    </button>
                        <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="More options">
                          <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
                  <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                <div className="prose max-w-none">
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                        {selectedEmail.body || selectedEmail.snippet}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <button
                        onClick={() => {
                          setComposerEmail(selectedEmail);
                          setIsComposing(true);
                        }}
                        className="bg-[#05294E] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold hover:bg-[#041f3f] transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                      >
                        <Reply className="h-4 w-4" />
                        <span>Reply</span>
                      </button>
                      <button 
                        onClick={handleForwardEmail}
                        className="bg-white text-[#05294E] border border-[#05294E] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold hover:bg-[#05294E] hover:text-white transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                      >
                        <Forward className="h-4 w-4" />
                        <span>Forward</span>
                      </button>
                </div>
              </div>
            </>
          ) : (
                <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                    <Mail className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">Select an email to read</h3>
                    <p className="text-slate-500">Choose an email from the list to view its contents</p>
              </div>
            </div>
          )}
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