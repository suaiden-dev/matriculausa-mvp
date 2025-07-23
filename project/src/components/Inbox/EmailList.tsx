import React from 'react';
import { Mail, RefreshCw, AlertCircle, Star, StarOff, Paperclip, ChevronDown } from 'lucide-react';
import { Email } from '../../types';

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  activeTab: string;
  hasMoreEmails: boolean;
  emailCounts: Record<string, number>;
  onEmailSelect: (email: Email) => void;
  onLoadMore: () => void;
  getPriorityColor: (priority: string) => string;
  getPriorityIcon: (priority: string) => string;
  formatDate: (dateString: string) => string;
}

const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmail,
  loading,
  error,
  searchTerm,
  activeTab,
  hasMoreEmails,
  emailCounts,
  onEmailSelect,
  onLoadMore,
  getPriorityColor,
  getPriorityIcon,
  formatDate
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-4" />
          <span className="text-slate-600">Loading emails...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <span className="text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
        <Mail className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No emails found</h3>
        <p className="text-slate-500">
          {searchTerm ? 'Try adjusting your search terms' : `No emails in ${activeTab}`}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Email List Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="divide-y divide-slate-100">
          {emails.map((email) => (
            <div
              key={email.id}
              className={`p-3 sm:p-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                selectedEmail?.id === email.id ? 'bg-blue-50 border-r-2 border-[#05294E]' : ''
              } ${!email.isRead ? 'bg-blue-50/50' : ''}`}
              onClick={() => onEmailSelect(email)}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-semibold">
                      {email.from.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium text-xs sm:text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                      {email.from}
                    </p>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="text-xs text-slate-500">{formatDate(email.date)}</span>
                      {email.hasAttachments && <Paperclip className="h-3 w-3 text-slate-400" />}
                    </div>
                  </div>
                  <p className={`text-xs sm:text-sm truncate mt-1 ${!email.isRead ? 'font-semibold' : ''}`}>
                    {email.subject}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-1">{email.snippet}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${getPriorityColor(email.priority)}`}>
                      {getPriorityIcon(email.priority)} {email.priority}
                    </span>
                    <button className="text-slate-400 hover:text-yellow-500 transition-colors">
                      {(email as any).isStarred ? (
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Load More Button - Altura fixa */}
      {hasMoreEmails && (
        <div className="flex-shrink-0 p-4 text-center border-t border-slate-200 bg-slate-50">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#041f3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto"
          >
            <ChevronDown className="h-4 w-4" />
            <span>Load More Emails</span>
          </button>
          <p className="text-xs text-slate-500 mt-2">
            Showing {emails.length} of {emailCounts[activeTab] || 'many'} emails
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailList; 