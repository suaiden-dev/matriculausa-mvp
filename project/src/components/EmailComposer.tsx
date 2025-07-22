import React, { useState, useEffect } from 'react';
import { 
  Send, 
  RefreshCw, 
  Sparkles, 
  Edit3, 
  X, 
  CheckCircle, 
  AlertCircle,
  Save,
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailComposerProps {
  originalEmail?: {
    id: string;
    threadId: string;
    from: string;
    subject: string;
    snippet: string;
  };
  onSend?: (result: any) => void;
  onClose?: () => void;
  isOpen: boolean;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ 
  originalEmail, 
  onSend, 
  onClose, 
  isOpen 
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [tone, setTone] = useState<'professional' | 'friendly' | 'formal'>('professional');

  // Initialize form when original email changes
  useEffect(() => {
    if (originalEmail) {
      setTo(originalEmail.from);
      setSubject(`Re: ${originalEmail.subject}`);
      setBody('');
    }
  }, [originalEmail]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen && !originalEmail) {
      setTo('');
      setSubject('');
      setBody('');
      setSendResult(null);
    }
  }, [isOpen, originalEmail]);

  const generateAIDraft = async () => {
    if (!originalEmail) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalEmail: {
            from: originalEmail.from,
            subject: originalEmail.subject,
            content: originalEmail.snippet
          },
          tone: tone
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setBody(data.draft);
      } else {
        console.error('Failed to generate draft:', data.error);
        // Use fallback draft
        setBody(data.fallbackDraft || 'Unable to generate AI draft');
      }
    } catch (error) {
      console.error('Error generating draft:', error);
      setBody('Error generating AI draft. Please write your response manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    if (!to || !subject || !body) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.provider_token) {
        throw new Error('No email provider token available. Please reconnect your email account.');
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: session.provider_token,
          to: to,
          subject: subject,
          body: body,
          threadId: originalEmail?.threadId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSendResult({
          success: true,
          messageId: result.messageId
        });
        
        // Call onSend callback
        onSend?.(result);
        
        // Close composer after successful send
        setTimeout(() => {
          onClose?.();
        }, 2000);
      } else {
        setSendResult({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      setSendResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const saveDraft = () => {
    // TODO: Implement draft saving
    console.log('Saving draft...', { to, subject, body });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Send className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">
              {originalEmail ? 'Reply to Email' : 'Compose New Email'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white/80 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Send Result */}
          {sendResult && (
            <div className={`p-4 rounded-xl ${
              sendResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {sendResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-medium ${
                  sendResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {sendResult.success 
                    ? 'Email sent successfully!' 
                    : `Failed to send email: ${sendResult.error}`
                  }
                </span>
              </div>
            </div>
          )}

          {/* AI Generation Controls */}
          {originalEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">AI Response Generator</span>
                </div>
                <div className="flex items-center space-x-3">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as any)}
                    className="px-3 py-1 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                  </select>
                  <button
                    onClick={generateAIDraft}
                    disabled={isGenerating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span>{isGenerating ? 'Generating...' : 'Generate Template'}</span>
                  </button>
                </div>
                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-2">
                  AI integration coming soon - using smart templates
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                To *
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                placeholder="recipient@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                placeholder="Email subject"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent resize-none"
                placeholder="Write your message here..."
                required
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={saveDraft}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </button>
            <button
              onClick={() => {
                setTo('');
                setSubject('');
                setBody('');
              }}
              className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={sendEmail}
              disabled={isSending || !to || !subject || !body}
              className="bg-[#05294E] text-white px-6 py-2 rounded-xl font-medium hover:bg-[#041f3f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isSending ? 'Sending...' : 'Send Email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer; 