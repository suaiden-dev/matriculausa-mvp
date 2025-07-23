import React from 'react';
import { 
  User, 
  Calendar, 
  Paperclip, 
  Reply, 
  Forward, 
  Archive, 
  Trash2, 
  MoreVertical,
  Mail
} from 'lucide-react';
import { Email } from '../../types';

interface EmailDetailProps {
  email: Email | null;
  onReply: (email: Email) => void;
  onForward: () => void;
  formatDate: (dateString: string) => string;
}

const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onReply,
  onForward,
  formatDate
}) => {
  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Mail className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Select an email to read</h3>
          <p className="text-slate-500">Choose an email from the list to view its contents</p>
        </div>
      </div>
    );
  }

  // Função para renderizar o conteúdo do email com HTML
  const renderEmailContent = () => {
    const emailBody = email.body || '';
    
    // Verificar se tem HTML (tags HTML comuns)
    const hasHtml = emailBody && (
      emailBody.includes('<html') || 
      emailBody.includes('<body') || 
      emailBody.includes('<div') ||
      emailBody.includes('<p>') ||
      emailBody.includes('<br') ||
      emailBody.includes('<img') ||
      emailBody.includes('<table') ||
      emailBody.includes('<ul>') ||
      emailBody.includes('<ol>') ||
      emailBody.includes('<li>') ||
      emailBody.includes('<h1>') ||
      emailBody.includes('<h2>') ||
      emailBody.includes('<h3>') ||
      emailBody.includes('<a href') ||
      emailBody.includes('<span') ||
      emailBody.includes('<strong>') ||
      emailBody.includes('<b>') ||
      emailBody.includes('<em>') ||
      emailBody.includes('<i>')
    );
    
    if (hasHtml) {
      // Se tem HTML, renderizar como HTML
      return (
        <div 
          className="email-html-content"
          dangerouslySetInnerHTML={{ __html: emailBody }}
        />
      );
    } else {
      // Se é texto simples, renderizar com quebras de linha
      return (
        <div className="email-text-content whitespace-pre-wrap">
          {emailBody || email.snippet}
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      {/* Header - Altura fixa */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 break-words">{email.subject}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-2 min-w-0">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{email.from}</span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(email.date)}</span>
              </div>
              {email.hasAttachments && (
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Paperclip className="h-4 w-4" />
                  <span>Has attachments</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-4">
            <button
              onClick={() => onReply(email)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reply to email"
              aria-label="Reply to email"
            >
              <Reply className="h-4 w-4" />
            </button>
            <button
              onClick={onForward}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Forward email"
              aria-label="Forward email"
            >
              <Forward className="h-4 w-4" />
            </button>
            <button 
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" 
              title="Archive email"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button 
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" 
              title="Delete email"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button 
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" 
              title="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content - Altura flexível com scroll e formatação original */}
      <div className="flex-1 overflow-y-auto bg-white min-h-0">
        <div className="p-8 sm:p-10 pb-16 max-w-5xl mx-auto">
          <div className="email-wrapper">
            {renderEmailContent()}
          </div>
        </div>
      </div>
      
      {/* Footer - Altura fixa */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => onReply(email)}
            className="bg-[#05294E] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold hover:bg-[#041f3f] transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Reply className="h-4 w-4" />
            <span>Reply</span>
          </button>
          <button 
            onClick={onForward}
            className="bg-white text-[#05294E] border border-[#05294E] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold hover:bg-[#05294E] hover:text-white transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Forward className="h-4 w-4" />
            <span>Forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailDetail; 