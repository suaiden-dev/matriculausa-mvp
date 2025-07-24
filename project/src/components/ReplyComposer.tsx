import React, { useState, useEffect } from 'react';
import { X, Send, Save, Paperclip, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Email } from '../types';

interface ReplyComposerProps {
  originalEmail: Email;
  onSend?: (result: any) => void;
  onClose?: () => void;
  isOpen: boolean;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const ReplyComposer: React.FC<ReplyComposerProps> = ({ 
  originalEmail, 
  onSend, 
  onClose, 
  isOpen 
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Initialize form when original email changes
  useEffect(() => {
    console.log('📧 ReplyComposer: useEffect triggered with originalEmail:', {
      id: originalEmail?.id,
      from: originalEmail?.from,
      subject: originalEmail?.subject,
      hasHtmlBody: !!originalEmail?.htmlBody,
      hasBody: !!originalEmail?.body,
      htmlBodyLength: originalEmail?.htmlBody?.length || 0,
      bodyLength: originalEmail?.body?.length || 0
    });
    
    if (originalEmail) {
      console.log('📧 ReplyComposer: Setting up reply for email:', {
        id: originalEmail.id,
        from: originalEmail.from,
        subject: originalEmail.subject,
        hasHtmlBody: !!originalEmail.htmlBody,
        hasBody: !!originalEmail.body,
        htmlBodyLength: originalEmail.htmlBody?.length || 0,
        bodyLength: originalEmail.body?.length || 0,
        htmlBodyPreview: originalEmail.htmlBody?.substring(0, 100) + '...',
        bodyPreview: originalEmail.body?.substring(0, 100) + '...'
      });
      
      // Set reply fields
      setTo(originalEmail.from || '');
      setSubject(`Re: ${originalEmail.subject || ''}`);
      
      // Prepare reply content
      const originalEmailContent = originalEmail.htmlBody || originalEmail.body || originalEmail.snippet || '';
      
      console.log('📧 ReplyComposer: Content selection:', {
        usingHtmlBody: !!originalEmail.htmlBody,
        usingBody: !originalEmail.htmlBody && !!originalEmail.body,
        usingSnippet: !originalEmail.htmlBody && !originalEmail.body && !!originalEmail.snippet,
        finalContentLength: originalEmailContent.length
      });
      
      console.log('📧 ReplyComposer: Using content for reply:', {
        hasHtmlBody: !!originalEmail.htmlBody,
        hasBody: !!originalEmail.body,
        htmlBodyLength: originalEmail.htmlBody?.length || 0,
        bodyLength: originalEmail.body?.length || 0,
        contentLength: originalEmailContent.length,
        htmlBodyPreview: originalEmail.htmlBody?.substring(0, 200) + '...',
        bodyPreview: originalEmail.body?.substring(0, 200) + '...',
        contentPreview: originalEmailContent.substring(0, 200) + '...'
      });
      
      // Se temos HTML, criar um reply HTML formatado
      const hasHtmlContent = originalEmail.htmlBody || (originalEmail.body && originalEmail.body.includes('<'));
      console.log('📧 ReplyComposer: HTML detection:', {
        hasHtmlBody: !!originalEmail.htmlBody,
        bodyHasHtml: originalEmail.body?.includes('<') || false,
        hasHtmlContent,
        htmlBodyFirstChars: originalEmail.htmlBody?.substring(0, 50) || 'N/A',
        bodyFirstChars: originalEmail.body?.substring(0, 50) || 'N/A'
      });
      
      if (hasHtmlContent) {
        const replyHtml = `
<div style="border-left: 3px solid #ccc; padding-left: 15px; margin: 20px 0; color: #666;">
  <p style="margin: 0 0 10px 0; font-size: 12px;">
    <strong>From:</strong> ${originalEmail.from}<br>
    <strong>Subject:</strong> ${originalEmail.subject}<br>
    <strong>Date:</strong> ${new Date().toLocaleString()}
  </p>
  <div style="border-top: 1px solid #eee; padding-top: 10px;">
    ${originalEmailContent}
  </div>
</div>`;
        setBody(replyHtml);
        setIsHtmlMode(true);
        console.log('📧 ReplyComposer: Set HTML mode with formatted reply');
      } else {
        // Se é texto simples
        const replyTemplate = `\n\n--- Original Message ---\nFrom: ${originalEmail.from}\nSubject: ${originalEmail.subject}\nDate: ${new Date().toLocaleString()}\n\n${originalEmailContent}`;
        setBody(replyTemplate);
        setIsHtmlMode(false);
        console.log('📧 ReplyComposer: Set text mode with simple reply');
      }
    }
  }, [originalEmail]);

  // Reset form when opening
  useEffect(() => {
    if (isOpen && !originalEmail) {
      setTo('');
      setSubject('');
      setBody('');
      setSendResult(null);
      setAttachments([]);
    }
  }, [isOpen, originalEmail]);

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
      
      if (!session) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // Prepare email content
      const emailContent = isHtmlMode ? body : body.replace(/\n/g, '<br>');
      
      console.log('📧 ReplyComposer: Preparing email content:', {
        isHtmlMode,
        bodyLength: body.length,
        emailContentLength: emailContent.length,
        emailContentPreview: emailContent.substring(0, 200) + '...'
      });

      // Prepare attachments
      const emailAttachments = await Promise.all(attachments.map(async file => ({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix and get base64
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(file);
        })
      })));

      const response = await supabase.functions.invoke('send-gmail-message', {
        body: {
          to: to,
          subject: subject,
          htmlBody: emailContent,
          textBody: !isHtmlMode ? body : undefined,
          threadId: originalEmail?.threadId,
          attachments: emailAttachments
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send email');
      }
      
      if (response.data?.success) {
        setSendResult({
          success: true,
          messageId: response.data.messageId
        });
        
        // Call onSend callback
        onSend?.(response.data);
        
        // Close composer after successful send
        setTimeout(() => {
          onClose?.();
        }, 2000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      setSendResult({
        success: false,
        error: error.message || 'An error occurred while sending email'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#05294E] rounded-xl flex items-center justify-center">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Reply to Email</h2>
              <p className="text-sm text-slate-600">Send a reply to this message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close composer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* To Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                To
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

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subject
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

            {/* HTML Mode Toggle */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isHtmlMode}
                  onChange={(e) => setIsHtmlMode(e.target.checked)}
                  className="rounded border-slate-300 text-[#05294E] focus:ring-[#05294E]"
                />
                <span className="text-sm font-medium text-slate-700">HTML Mode</span>
              </label>
              {isHtmlMode && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  {isHtmlMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span>HTML Editor</span>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message
              </label>
              {isHtmlMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent resize-none font-mono text-sm"
                      placeholder="Write your HTML message here...&#10;&#10;Example:&#10;&lt;h1&gt;Hello&lt;/h1&gt;&#10;&lt;p&gt;This is a paragraph.&lt;/p&gt;"
                      required
                    />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Preview</h4>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
                  </div>
                </div>
              ) : (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent resize-none"
                  placeholder="Write your message here..."
                  required
                />
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Attachments
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#05294E] file:text-white hover:file:bg-[#041f3f] transition-colors"
                />
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Paperclip className="h-4 w-4 text-slate-500" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                          <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Send Result */}
            {sendResult && (
              <div className={`p-4 rounded-xl ${sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm font-medium ${sendResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {sendResult.success ? 'Email sent successfully!' : `Error: ${sendResult.error}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={sendEmail}
              disabled={isSending || !to || !subject || !body}
              className="flex items-center space-x-2 px-6 py-3 bg-[#05294E] text-white rounded-xl hover:bg-[#041f3f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isSending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyComposer; 