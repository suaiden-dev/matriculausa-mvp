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
  Trash2,
  Paperclip,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGmailConnection } from '../hooks/useGmailConnection';

interface EmailComposerProps {
  originalEmail?: {
    id?: string;
    threadId?: string;
    from?: string;
    subject?: string;
    snippet?: string;
    to?: string;
    body?: string;
    htmlBody?: string;
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
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { activeConnection } = useGmailConnection();

  // Initialize form when original email changes
  useEffect(() => {
    console.log('📧 EmailComposer: useEffect triggered with originalEmail:', {
      id: originalEmail?.id,
      from: originalEmail?.from,
      subject: originalEmail?.subject,
      hasHtmlBody: !!originalEmail?.htmlBody,
      hasBody: !!originalEmail?.body,
      htmlBodyLength: originalEmail?.htmlBody?.length || 0,
      bodyLength: originalEmail?.body?.length || 0
    });
    
    if (originalEmail) {
      console.log('📧 EmailComposer: originalEmail received:', {
        id: originalEmail.id,
        from: originalEmail.from,
        subject: originalEmail.subject,
        hasHtmlBody: !!originalEmail.htmlBody,
        hasBody: !!originalEmail.body,
        hasSnippet: !!originalEmail.snippet,
        htmlBodyLength: originalEmail.htmlBody?.length || 0,
        bodyLength: originalEmail.body?.length || 0,
        snippetLength: originalEmail.snippet?.length || 0,
        htmlBodyPreview: originalEmail.htmlBody?.substring(0, 100) + '...',
        bodyPreview: originalEmail.body?.substring(0, 100) + '...'
      });

      // Se tem 'id', é um email real (reply). Se não tem 'id', é um forward criado manualmente
      console.log('📧 EmailComposer: Checking email type:', {
        hasId: !!originalEmail.id,
        id: originalEmail.id,
        isForward: !originalEmail.id,
        isReply: !!originalEmail.id
      });
      
      if (!originalEmail.id) {
        setTo(originalEmail.to || '');
        setSubject(originalEmail.subject || '');
        // Para forward, usar o snippet em vez do body HTML
        setBody(originalEmail.snippet || '');
        setIsHtmlMode(false);
      } else {
        // É um reply
        console.log('📧 EmailComposer: This is a REPLY (not forward)');
        setTo(originalEmail.from || '');
        setSubject(`Re: ${originalEmail.subject || ''}`);
        
        // Para reply, incluir o email original completo
        // Priorizar htmlBody se disponível, senão usar body, senão snippet
        const originalEmailContent = originalEmail.htmlBody || originalEmail.body || originalEmail.snippet || '';
        
        console.log('📧 EmailComposer: Content selection:', {
          usingHtmlBody: !!originalEmail.htmlBody,
          usingBody: !originalEmail.htmlBody && !!originalEmail.body,
          usingSnippet: !originalEmail.htmlBody && !originalEmail.body && !!originalEmail.snippet,
          finalContentLength: originalEmailContent.length
        });
        
        console.log('📧 EmailComposer: Using content for reply:', {
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
        console.log('📧 EmailComposer: HTML detection:', {
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
          console.log('📧 EmailComposer: Set HTML mode with formatted reply');
        } else {
          // Se é texto simples
          const replyTemplate = `\n\n--- Original Message ---\nFrom: ${originalEmail.from}\nSubject: ${originalEmail.subject}\nDate: ${new Date().toLocaleString()}\n\n${originalEmailContent}`;
          setBody(replyTemplate);
          setIsHtmlMode(false);
          console.log('📧 EmailComposer: Set text mode with simple reply');
        }
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

  const generateAIDraft = async () => {
    if (!originalEmail) return;

    setIsGenerating(true);
    try {
      // Template responses based on tone
      const templates = {
        professional: `Dear ${originalEmail.from?.split('@')[0]},

Thank you for your email regarding "${originalEmail.subject}".

I have reviewed your inquiry and would be happy to assist you with this matter. Please let me know if you need any additional information or have any questions.

Best regards,
[Your Name]`,
        friendly: `Hi ${originalEmail.from?.split('@')[0]}!

Thanks for reaching out about "${originalEmail.subject}" - I'm excited to help you with this!

I've looked into your request and I think we can definitely work something out. Let me know if you need anything else or have any questions.

Cheers!
[Your Name]`,
        formal: `Dear ${originalEmail.from?.split('@')[0]},

I acknowledge receipt of your correspondence dated ${new Date().toLocaleDateString()} regarding "${originalEmail.subject}".

After careful consideration of the matter you have presented, I am pleased to inform you that I am in a position to provide the assistance you require.

Should you require any additional clarification or have further inquiries, please do not hesitate to contact me.

Yours sincerely,
[Your Name]`
      };

      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setBody(templates[tone]);
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

    if (!activeConnection) {
      alert('Gmail not connected. Please connect your Gmail account first.');
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
      const emailContent = originalEmail?.htmlBody || (isHtmlMode ? body : body.replace(/\n/g, '<br>'));
      
      console.log('📧 EmailComposer: Preparing email content:', {
        hasOriginalHtmlBody: !!originalEmail?.htmlBody,
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

  const saveDraft = () => {
    // TODO: Implement draft saving to localStorage or database
    const draft = {
      to,
      subject,
      body,
      timestamp: new Date().toISOString()
    };
    
    const drafts = JSON.parse(localStorage.getItem('email-drafts') || '[]');
    drafts.push(draft);
    localStorage.setItem('email-drafts', JSON.stringify(drafts));
    
    alert('Draft saved successfully!');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Send className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">
              {originalEmail ? (
                originalEmail.to !== undefined ? 'Forward Email' : 'Reply to Email'
              ) : 'New Email'}
            </h2>
            {activeConnection && (
              <div className="flex items-center space-x-2 bg-white/20 px-2 py-1 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-white text-sm">Connected to {activeConnection.email}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white/80 transition-colors"
            title="Close email composer"
            aria-label="Close email composer"
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

          {/* Connection Status */}
          {!activeConnection && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800">
                  Gmail not connected. Please connect your Gmail account to send emails.
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
                    title="Select response tone"
                    aria-label="Select response tone"
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
                disabled={!activeConnection}
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
                disabled={!activeConnection}
              />
            </div>

            {/* Message Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                Message *
              </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    title="Toggle HTML mode"
                    aria-label="Toggle HTML mode"
                  >
                    {isHtmlMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{isHtmlMode ? 'HTML' : 'Text'}</span>
                  </button>
                </div>
              </div>
              
              {isHtmlMode ? (
                <div className="space-y-2">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent resize-none font-mono text-sm"
                    placeholder="Write your HTML message here...&#10;&#10;Example:&#10;&lt;h1&gt;Hello&lt;/h1&gt;&#10;&lt;p&gt;This is a paragraph.&lt;/p&gt;"
                    required
                    disabled={!activeConnection}
                  />
                  <div className="border border-slate-300 rounded-xl p-4 bg-slate-50">
                    <div className="text-xs text-slate-500 mb-2">Preview:</div>
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
                  disabled={!activeConnection}
                />
              )}
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Attachments
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={!activeConnection}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Paperclip className="h-4 w-4" />
                  <span>Add Files</span>
                </label>
                
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4 text-slate-500" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                          <span className="text-xs text-slate-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove attachment"
                          aria-label="Remove attachment"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                setAttachments([]);
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
              disabled={isSending || !to || !subject || !body || !activeConnection}
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