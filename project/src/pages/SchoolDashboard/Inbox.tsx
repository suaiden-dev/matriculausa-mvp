import React, { useState, useEffect } from 'react';
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
  Download,
  AlertCircle
} from 'lucide-react';
import AuthConnect from '../../components/AuthConnect';
import EmailComposer from '../../components/EmailComposer';

interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  priority: 'high' | 'normal' | 'low';
}

const Inbox: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasEmailConnection, setHasEmailConnection] = useState(true); // Habilitar demo de e-mails
  const [composerEmail, setComposerEmail] = useState<any>(null);

  // Mock data - será substituído por dados reais da API
  useEffect(() => {
    const mockEmails: Email[] = [
      {
        id: '1',
        from: 'student.inquiry@example.com',
        subject: 'International Student Application Question',
        preview: 'Hello, I am interested in applying to your university as an international student. Could you please provide information about the application process and required documents?',
        date: '2 hours ago',
        isRead: false,
        isStarred: true,
        hasAttachments: false,
        priority: 'high'
      },
      {
        id: '2',
        from: 'scholarship.applicant@example.com',
        subject: 'Scholarship Application - Documents Submitted',
        preview: 'Dear Admissions Office, I have submitted all required documents for the International Student Scholarship. Please confirm receipt and let me know if anything else is needed.',
        date: '4 hours ago',
        isRead: true,
        isStarred: false,
        hasAttachments: true,
        priority: 'normal'
      },
      {
        id: '3',
        from: 'accepted.student@example.com',
        subject: 'Acceptance Letter - Next Steps',
        preview: 'Thank you for the acceptance letter! I am very excited to join your university. What are the next steps I need to take to complete my enrollment?',
        date: '1 day ago',
        isRead: true,
        isStarred: false,
        hasAttachments: false,
        priority: 'normal'
      },
      {
        id: '4',
        from: 'visa.questions@example.com',
        subject: 'F-1 Visa Application Support',
        preview: 'I need help with my F-1 visa application. Could you provide the I-20 form and any additional documentation required for the visa interview?',
        date: '2 days ago',
        isRead: false,
        isStarred: true,
        hasAttachments: true,
        priority: 'high'
      },
      {
        id: '5',
        from: 'housing.inquiry@example.com',
        subject: 'On-Campus Housing Availability',
        preview: 'I would like to know about on-campus housing options for international students. What are the available dormitories and how do I apply for housing?',
        date: '3 days ago',
        isRead: true,
        isStarred: false,
        hasAttachments: false,
        priority: 'low'
      }
    ];

    setTimeout(() => {
      setEmails(mockEmails);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.preview.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && !email.isRead) ||
                         (filter === 'starred' && email.isStarred);
    
    return matchesSearch && matchesFilter;
  });

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, isRead: true } : e
      ));
    }
  };

  const handleReply = (email: Email) => {
    setComposerEmail({
      id: email.id,
      threadId: email.id, // Using email ID as thread ID for demo
      from: email.from,
      subject: email.subject,
      snippet: email.preview
    });
    setIsComposing(true);
  };

  const handleSendEmail = (result: any) => {
    console.log('Email sent successfully:', result);
    // Here you could update the UI to show the sent email
    // or refresh the email list
  };

  const toggleStar = (emailId: string) => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, isStarred: !email.isStarred } : email
    ));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 text-[#05294E] animate-spin" />
          <p className="text-slate-600">Loading inbox...</p>
        </div>
      </div>
    );
  }

  // Se não há conexão de e-mail, mostrar componente de conexão
  if (!hasEmailConnection) {
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
            </div>
          </div>

          {/* Connection Component */}
          <AuthConnect onConnectionChange={setHasEmailConnection} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-2 rounded-xl">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Inbox</h1>
              <p className="text-white/80 text-sm">{filteredEmails.length} messages</p>
                              <div className="flex items-center space-x-2 mt-1">
                  <div className="bg-yellow-500/20 px-2 py-1 rounded-lg">
                    <span className="text-yellow-200 text-xs font-medium">DEMO MODE</span>
                  </div>
                  <div className="bg-blue-500/20 px-2 py-1 rounded-lg">
                    <span className="text-blue-200 text-xs font-medium">TEMPLATE RESPONSES</span>
                  </div>
                </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsComposing(true)}
              className="bg-white text-[#05294E] px-4 py-2 rounded-xl font-semibold hover:bg-white/90 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Compose</span>
            </button>
            <button 
              onClick={() => setHasEmailConnection(false)}
              className="bg-white/20 text-white px-3 py-2 rounded-xl font-semibold hover:bg-white/30 transition-colors flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Manage Connections</span>
            </button>
            <button 
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
              aria-label="Email settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
              title="Filter emails"
              aria-label="Filter emails"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="starred">Starred</option>
            </select>
            <button 
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              title="Filter emails"
              aria-label="Filter emails"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-280px)]">
        {/* Email List */}
        <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Mail className="h-12 w-12 mb-4 opacity-50" />
              <p>No emails found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedEmail?.id === email.id ? 'bg-blue-50 border-r-2 border-[#05294E]' : ''
                  } ${!email.isRead ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {email.from.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                          {email.from}
                        </p>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-slate-500">{email.date}</span>
                          {email.hasAttachments && (
                            <Paperclip className="h-3 w-3 text-slate-400" />
                          )}
                        </div>
                      </div>
                      
                      <p className={`text-sm truncate mt-1 ${!email.isRead ? 'font-semibold' : ''}`}>
                        {email.subject}
                      </p>
                      
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {email.preview}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${getPriorityColor(email.priority)}`}>
                          {getPriorityIcon(email.priority)} {email.priority}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(email.id);
                          }}
                          className="text-slate-400 hover:text-yellow-500 transition-colors"
                        >
                          {email.isStarred ? (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Detail */}
        <div className="flex-1 flex flex-col">
          {selectedEmail ? (
            <>
              {/* Email Header */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                      {selectedEmail.subject}
                    </h2>
                    
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{selectedEmail.from}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{selectedEmail.date}</span>
                      </div>
                      {selectedEmail.hasAttachments && (
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4" />
                          <span>Has attachments</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                      <Reply className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                      <Forward className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                      <Archive className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose max-w-none">
                  <p className="text-slate-700 leading-relaxed">
                    {selectedEmail.preview}
                  </p>
                  
                  <p className="text-slate-700 leading-relaxed mt-4">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                  
                  <p className="text-slate-700 leading-relaxed mt-4">
                    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                  </p>
                  
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                    <p className="text-slate-600 text-sm">
                      Best regards,<br />
                      {selectedEmail.from}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reply Section */}
              <div className="p-6 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => handleReply(selectedEmail)}
                    className="bg-[#05294E] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#041f3f] transition-colors flex items-center space-x-2"
                  >
                    <Reply className="h-4 w-4" />
                    <span>Reply</span>
                  </button>
                  <button className="bg-white text-[#05294E] border border-[#05294E] px-6 py-3 rounded-xl font-semibold hover:bg-[#05294E] hover:text-white transition-colors flex items-center space-x-2">
                    <Forward className="h-4 w-4" />
                    <span>Forward</span>
                  </button>
                  <button className="bg-white text-slate-600 border border-slate-300 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select an email to read</p>
                <p className="text-sm">Choose an email from the list to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Composer Modal */}
      <EmailComposer
        originalEmail={composerEmail}
        onSend={handleSendEmail}
        onClose={() => {
          setIsComposing(false);
          setComposerEmail(null);
        }}
        isOpen={isComposing}
      />
    </div>
  );
};

export default Inbox; 