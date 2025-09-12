import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  RefreshCw,
  CheckCircle,
  Shield,
  X,
  Link,
  Inbox as InboxIcon,
  Send as SendIcon,
  Star as StarIcon,
  FileText,
  AlertTriangle,
  Trash,
  BookOpen,
  Calendar,
  Send
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGmail } from '../../hooks/useGmail';
import { useGmailConnection } from '../../hooks/useGmailConnection';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { config } from '../../lib/config';
import { formatDateUS } from '../../lib/dateUtils';
import { Email } from '../../types';
import { useUniversity } from '../../context/UniversityContext';
import { AnimatedSection } from '../../components/ui/AnimatedSection';

// Estilos CSS personalizados para scroll das abas e melhor legibilidade

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
  
  const { connections, activeConnection, loading: isConnecting, connectGmail, setActiveConnection, checkConnections } = useGmailConnection();
  const { emails, loading, error, fetchEmails, hasMoreEmails, loadMoreEmails, autoRefreshStatus, checkUnreadEmails } = useGmail();
  
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
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    email: '',
    preferredDate: '',
    message: 'I want to automate my emails with AI to improve student communication efficiency and reduce response time.'
  });
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<any[]>([]);

  // Preencher email da universidade automaticamente
  useEffect(() => {
    if (university?.contact?.email) {
      setMeetingForm(prev => ({
        ...prev,
        email: university.contact.email
      }));
    }
  }, [university]);

  // Função para enviar webhook de agendamento
  const handleSendMeetingRequest = async () => {
    try {
      const payload = {
        tipo_notf: 'ai_email_activation_request',
        email: meetingForm.email,
        preferred_date: meetingForm.preferredDate,
        message: meetingForm.message,
        university_name: university?.name || 'Unknown University',
        user_id: user?.id,
        timestamp: new Date().toISOString(),
        to_email: 'admin@suaiden.com',
        to_name: 'Admin Suaiden'
      };

      // Enviar para webhook
      const response = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Fechar modal silenciosamente - sucesso implícito
        setShowMeetingModal(false);
        setMeetingForm({
          email: '',
          preferredDate: '',
          message: 'I want to automate my emails with AI to improve student communication efficiency and reduce response time.'
        });
      } else {
        // Em caso de erro, apenas fechar o modal
        setShowMeetingModal(false);
      }
    } catch (error) {
      console.error('Error sending meeting request:', error);
      // Em caso de erro, apenas fechar o modal
      setShowMeetingModal(false);
    }
  };

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

  const handleSendEmail = async () => {
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

  // Renderizar modal se estiver aberto
  if (showMeetingModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-[#05294E]" />
              Schedule AI Demo
            </h2>
            <button
              onClick={() => setShowMeetingModal(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6 text-slate-600" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSendMeetingRequest(); }} className="p-6 space-y-6">
            {/* University Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Mail className="inline h-4 w-4 mr-2" />
                University Email *
              </label>
              <input
                type="email"
                value={meetingForm.email}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all"
                placeholder="university@example.com"
                required
              />
            </div>

            {/* Preferred Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-2" />
                Preferred Date *
              </label>
              <input
                type="date"
                value={meetingForm.preferredDate}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all"
                required
              />
              <p className="mt-2 text-sm text-slate-500">
                We'll contact you to confirm the exact time
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <FileText className="inline h-4 w-4 mr-2" />
                What you want to achieve with AI
              </label>
              <textarea
                value={meetingForm.message}
                onChange={(e) => setMeetingForm(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent transition-all resize-none"
                placeholder="Tell us about your email automation needs..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#05294E] text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-[#041f3d] transition-colors flex items-center justify-center"
            >
              <Send className="h-5 w-5 mr-2" />
              Send Request
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Email AI Activation Page - Contact Required
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hero Section */}
        <AnimatedSection direction="up" delay={0.1}>
          <div className="pt-20 pb-16 text-center border-b border-slate-100">
            <motion.div 
              className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-8"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <Mail className="h-8 w-8 text-white" />
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-slate-900 mb-6 tracking-tight">
              AI-Powered
              <br />
              <span className="font-bold">Email Management</span>
            </h1>
            
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed mb-12 font-light">
              Transform your university's email communication with our advanced AI system that automatically 
              processes, categorizes, and responds to student inquiries.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.button
                onClick={() => setShowMeetingModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-slate-900 text-white px-8 py-4 rounded-none font-medium text-lg hover:bg-slate-800 transition-colors border-2 border-slate-900 min-w-[200px]"
              >
                Schedule Meeting
              </motion.button>
              <motion.button
                onClick={() => window.open("mailto:support@matricula.usa.com?subject=AI Email Management Activation&body=Hi, I'm interested in activating AI-powered email management for my university. Please provide more information about setup and pricing.")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="border-2 border-slate-900 text-slate-900 px-8 py-4 rounded-none font-medium text-lg hover:bg-slate-900 hover:text-white transition-colors min-w-[200px]"
              >
                Contact Us
              </motion.button>
            </div>
          </div>
        </AnimatedSection>

        {/* Features Section */}
        <AnimatedSection direction="up" delay={0.2}>
          <div className="py-20 border-b border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
              
              <motion.div 
                className="space-y-8"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">AI-Powered Responses</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    Automatically generate intelligent responses to student inquiries using advanced AI technology.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="space-y-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Smart Categorization</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    Automatically categorize and prioritize emails based on content, urgency, and student type.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="space-y-8"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Automated Workflows</h3>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    Set up automated email sequences and follow-ups to improve student engagement and response times.
                  </p>
                </div>
              </motion.div>

            </div>
          </div>
        </AnimatedSection>

        {/* How AI Works Section */}
        <AnimatedSection direction="up" delay={0.3}>
          <div className="py-20 border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              <motion.h2 
                className="text-3xl lg:text-4xl font-light text-slate-900 text-center mb-16 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                How AI Transforms Your <span className="font-bold">Email Management</span>
              </motion.h2>
              
              {/* AI Features Details */}
              <div className="space-y-16">
                <motion.div 
                  className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="order-2 lg:order-1">
                    <h3 className="text-2xl font-bold text-slate-900 mb-6">Intelligent Processing</h3>
                    <div className="space-y-4 text-slate-600">
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-slate-900 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                        <span>AI analyzes email content and context automatically</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-slate-900 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                        <span>Smart categorization by application type and urgency</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-slate-900 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                        <span>Automatic response suggestions based on university policies</span>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 lg:order-2 bg-slate-50 p-8 border-l-4 border-slate-900">
                    <Shield className="h-8 w-8 text-slate-900 mb-4" />
                    <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">01</div>
                    <div className="text-lg font-medium text-slate-900">Processing Phase</div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="bg-slate-50 p-8 border-l-4 border-slate-900">
                    <CheckCircle className="h-8 w-8 text-slate-900 mb-4" />
                    <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">02</div>
                    <div className="text-lg font-medium text-slate-900">Automation Phase</div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-6">Automated Workflows</h3>
                    <div className="space-y-4 text-slate-600">
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-slate-900 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                        <span><strong>Auto-responses</strong> for common student inquiries</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-slate-900 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                        <span>Follow-up sequences for incomplete applications</span>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-slate-900 rounded-full mt-2 mr-4 flex-shrink-0"></div>
                        <span>Priority routing based on student status and urgency</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

            </div>
          </div>
        </AnimatedSection>

        {/* Workflow Process */}
        <AnimatedSection direction="up" delay={0.4}>
          <div className="py-20 border-b border-slate-100">
            <motion.h3 
              className="text-3xl lg:text-4xl font-light text-slate-900 text-center mb-16 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="font-bold">AI-Powered</span> Email Workflow
            </motion.h3>
            
            <div className="max-w-4xl mx-auto">
              <div className="space-y-12">
                
                <motion.div 
                  className="flex flex-col md:flex-row items-start gap-8"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-none flex items-center justify-center text-2xl font-bold">
                      01
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-xl font-bold text-slate-900 mb-3">Contact & Setup</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Contact our team to activate AI email management and configure your university's specific needs.
                    </p>
                  </div>
                </motion.div>

                <div className="w-px h-12 bg-slate-200 mx-8"></div>

                <motion.div 
                  className="flex flex-col md:flex-row items-start gap-8"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-none flex items-center justify-center text-2xl font-bold">
                      02
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-xl font-bold text-slate-900 mb-3">AI Processing</h4>
                    <p className="text-slate-600 leading-relaxed">
                      AI automatically analyzes, categorizes, and generates intelligent responses to student emails.
                    </p>
                  </div>
                </motion.div>

                <div className="w-px h-12 bg-slate-200 mx-8"></div>

                <motion.div 
                  className="flex flex-col md:flex-row items-start gap-8"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-none flex items-center justify-center text-2xl font-bold">
                      03
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-xl font-bold text-slate-900 mb-3">Smart Management</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Access AI-powered dashboard with automated workflows and intelligent email management.
                    </p>
                  </div>
                </motion.div>

              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* AI Example Section */}
        <AnimatedSection direction="up" delay={0.5}>
          <div className="py-20 border-b border-slate-100">
            <div className="max-w-3xl mx-auto text-center">
              <motion.h3 
                className="text-3xl font-light text-slate-900 mb-12 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                AI in <span className="font-bold">Action</span>
              </motion.h3>
              
              <div className="bg-slate-50 p-12 border-l-4 border-slate-900">
                <div className="space-y-8">
                  <motion.div 
                    className="text-left"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">Student Email</div>
                    <div className="text-lg font-medium text-slate-900">"What documents do I need for admission?"</div>
                  </motion.div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-slate-300"></div>
                  </div>
                  
                  <motion.div 
                    className="text-left"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">AI Analysis</div>
                    <div className="text-lg font-medium text-slate-900">AI analyzes request and generates personalized response</div>
                  </motion.div>
                  
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-slate-300"></div>
                  </div>
                  
                  <motion.div 
                    className="text-left"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">University Response</div>
                    <div className="text-lg font-medium text-slate-900">University reviews and sends AI-generated response</div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
            
        {/* Benefits Section */}
        <AnimatedSection direction="up" delay={0.6}>
          <div className="py-20">
            <motion.h3 
              className="text-3xl lg:text-4xl font-light text-slate-900 text-center mb-16 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Why Choose <span className="font-bold">AI-Powered Email Management?</span>
            </motion.h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="border-l-4 border-slate-900 pl-6">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 flex items-center">
                    <Shield className="h-5 w-5 mr-3" />
                    AI Automation
                  </h4>
                  <p className="text-slate-600">
                    Reduce manual email handling by 80% with intelligent AI responses and automated workflows.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="border-l-4 border-slate-900 pl-6">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-3" />
                    Faster Response Times
                  </h4>
                  <p className="text-slate-600">
                    Respond to student inquiries in minutes instead of hours with AI-generated responses.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="border-l-4 border-slate-900 pl-6">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 flex items-center">
                    <RefreshCw className="h-5 w-5 mr-3" />
                    Smart Categorization
                  </h4>
                  <p className="text-slate-600">
                    Automatically prioritize and route emails based on content analysis and student status.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="border-l-4 border-slate-900 pl-6">
                  <h4 className="text-xl font-bold text-slate-900 mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-3" />
                    Consistent Quality
                  </h4>
                  <p className="text-slate-600">
                    Maintain consistent, professional responses while reducing staff workload and training time.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>

        {/* Final CTA */}
        <AnimatedSection direction="up" delay={0.7}>
          <div className="py-20 bg-slate-50 border-t border-slate-100">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h3 
                className="text-3xl lg:text-4xl font-light text-slate-900 mb-8 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                Ready to Transform Your <span className="font-bold">Email Management?</span>
              </motion.h3>
              
              <motion.p 
                className="text-xl text-slate-600 mb-12 font-light"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Join leading universities using AI to streamline student communication and improve response efficiency.
              </motion.p>

              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <motion.button
                  onClick={() => setShowMeetingModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-slate-900 text-white px-10 py-4 rounded-none font-medium text-lg hover:bg-slate-800 transition-colors border-2 border-slate-900 min-w-[240px]"
                >
                  Schedule Meeting
                </motion.button>
                <motion.button
                  onClick={() => window.open("mailto:support@matricula.usa.com?subject=AI Email Management Activation&body=Hi, I'm interested in activating AI-powered email management for my university. Please provide more information about setup and pricing.")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="border-2 border-slate-900 text-slate-900 px-10 py-4 rounded-none font-medium text-lg hover:bg-slate-900 hover:text-white transition-colors min-w-[240px]"
                >
                  Contact Us
                </motion.button>
              </motion.div>

              <motion.div 
                className="border-t border-slate-200 pt-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <p className="text-slate-500 font-light">
                  Questions? Contact us at{' '}
                  <a 
                    href="mailto:support@matricula.usa.com" 
                    className="text-slate-900 hover:text-slate-700 underline transition-colors"
                  >
                    support@matricula.usa.com
                  </a>
                </p>
              </motion.div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
};

export default Inbox;