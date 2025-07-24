import React, { useState } from 'react';
import { 
  User, 
  Calendar, 
  Paperclip, 
  Reply, 
  Forward, 
  Archive, 
  Trash2, 
  MoreVertical,
  Mail,
  Download,
  File,
  Eye,
  X
} from 'lucide-react';
import { Email, EmailAttachment } from '../../types';
import { supabase } from '../../lib/supabase';

interface EmailDetailProps {
  email: Email | null;
  onReply: (email: Email) => void;
  onForward: () => void;
  formatDate: (dateString: string) => string;
}

// Função utilitária para limpar HTML de emails (versão menos agressiva)
function cleanEmailHtml(html: string): string {
  return html
    // 1. Remove apenas estilos de borda e sombra (NÃO remove backgrounds de links)
    .replace(/ style="[^"]*(border|box-shadow|border-radius)[^"]*"/gi, (match) => {
      // Remove apenas propriedades problemáticas, mantém backgrounds e cores
      return match.replace(/border(-[a-z]+)?\s*:\s*[^;"']+;?/gi, '')
                  .replace(/border-radius\s*:\s*[^;"']+;?/gi, '')
                  .replace(/box-shadow\s*:\s*[^;"']+;?/gi, '')
                  .replace(/outline\s*:\s*[^;"']+;?/gi, '');
    })
    .replace(/ style='[^']*(border|box-shadow|border-radius)[^']*'/gi, (match) => {
      return match.replace(/border(-[a-z]+)?\s*:\s*[^;"']+;?/gi, '')
                  .replace(/border-radius\s*:\s*[^;"']+;?/gi, '')
                  .replace(/box-shadow\s*:\s*[^;"']+;?/gi, '')
                  .replace(/outline\s*:\s*[^;"']+;?/gi, '');
    })
    
    // 2. Remove apenas atributos de borda (NÃO remove backgrounds)
    .replace(/ bgcolor="[^"]*"/gi, '')
    .replace(/ bgcolor='[^']*'/gi, '')
    .replace(/ border="[^"]*"/gi, '')
    .replace(/ border='[^']*'/gi, '')
    // NÃO remove background attributes - mantém cores de fundo dos links
    // .replace(/ background="[^"]*"/gi, '')
    // .replace(/ background='[^']*'/gi, '')
    
    // 3. Remove atributos de tabela que causam bordas
    .replace(/ cellpadding="[^"]*"/gi, '')
    .replace(/ cellpadding='[^']*'/gi, '')
    .replace(/ cellspacing="[^"]*"/gi, '')
    .replace(/ cellspacing='[^']*'/gi, '')
    
    // 4. NÃO remove classes (mantém layout)
    // .replace(/ class="[^"]*"/gi, '')
    // .replace(/ class='[^']*'/gi, '')
    
    // 5. Adiciona atributos seguros para tabelas
    .replace(/<table([^>]*)>/gi, '<table$1 border="0" cellpadding="0" cellspacing="0" role="presentation">')
    
    // 6. Processa imagens com proxy para evitar CORS
    .replace(/<img([^>]*src=")([^"]*)"([^>]*)>/gi, (match, beforeSrc, srcUrl, afterSrc) => {
      // Se a URL é válida e externa, usar proxy
      if (srcUrl && srcUrl.startsWith('http') && !srcUrl.includes(window.location.hostname)) {
        const proxyUrl = `https://fitpynguasqqutuhzifx.supabase.co/functions/v1/proxy-image?url=${encodeURIComponent(srcUrl)}`;
        return `<img${beforeSrc}${proxyUrl}"${afterSrc} style="display: block; border: 0; outline: none; max-width: 100%; height: auto;" class="email-image" data-original-src="${srcUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" onload="this.nextElementSibling.style.display='none';"><span class="image-placeholder" style="display: none; color: #666; font-style: italic; padding: 10px; background: #f5f5f5; border: 1px dashed #ccc; text-align: center;">[Imagem não disponível]</span>`;
      }
      
      // Se é URL relativa ou do nosso domínio, manter original mas adicionar fallback
      return `<img${beforeSrc}${srcUrl}"${afterSrc} style="display: block; border: 0; outline: none; max-width: 100%; height: auto;" class="email-image" data-original-src="${srcUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" onload="this.nextElementSibling.style.display='none';"><span class="image-placeholder" style="display: none; color: #666; font-style: italic; padding: 10px; background: #f5f5f5; border: 1px dashed #ccc; text-align: center;">[Imagem não disponível]</span>`;
    })
    
    // 7. NÃO remove tags de estilo (mantém CSS)
    // .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    
    // 8. Remove apenas scripts (segurança)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onReply,
  onForward,
  formatDate
}) => {
  const [downloadingAttachments, setDownloadingAttachments] = useState<{ [attachmentId: string]: boolean }>({});
  const [viewingAttachments, setViewingAttachments] = useState<{ [attachmentId: string]: boolean }>({});
  const [viewingAttachment, setViewingAttachment] = useState<{ attachment: EmailAttachment; data: string; mimeType: string } | null>(null);

  // Limpar estados quando o email muda
  React.useEffect(() => {
    setDownloadingAttachments({});
    setViewingAttachments({});
    setViewingAttachment(null);
  }, [email?.id]);

  const handleDownloadAttachment = async (attachment: EmailAttachment) => {
    if (!email) return;

    setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: true }));

    try {
      console.log('📎 Downloading attachment:', attachment);
      const response = await supabase.functions.invoke('get-gmail-attachment', {
        body: {
          messageId: email.id,
          attachmentId: attachment.attachmentId
        }
      });

      console.log('📎 Attachment response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to download attachment');
      }

      if (response.data?.success && response.data?.data) {
        // Converter Base64URL para Base64 padrão (substituir - por + e _ por /)
        let base64Data = response.data.data;
        base64Data = base64Data.replace(/-/g, '+').replace(/_/g, '/');
        
        // Adicionar padding se necessário
        while (base64Data.length % 4 !== 0) {
          base64Data += '=';
        }
        
        // Decodificar base64 para blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: attachment.mimeType });

        // Criar URL e fazer download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Failed to download attachment: ' + errorMessage);
    } finally {
      setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: false }));
    }
  };

  const handleViewAttachment = async (attachment: EmailAttachment) => {
    if (!email) return;

    setViewingAttachments(prev => ({ ...prev, [attachment.id]: true }));

    try {
      console.log('👁️ Viewing attachment:', attachment);
      const response = await supabase.functions.invoke('get-gmail-attachment', {
        body: {
          messageId: email.id,
          attachmentId: attachment.attachmentId
        }
      });

      console.log('👁️ Attachment response for viewing:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to load attachment');
      }

      if (!response.data?.success || !response.data?.data) {
        throw new Error('Invalid response format');
      }

      // Decode base64 data
      let base64Data = response.data.data;
      
      // Converter Base64URL para Base64 padrão (substituir - por + e _ por /)
      base64Data = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      
      // Adicionar padding se necessário
      while (base64Data.length % 4 !== 0) {
        base64Data += '=';
      }

      // Check if the attachment can be viewed (images, text files)
      const viewableTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'text/plain', 'text/html'
      ];

      if (!viewableTypes.includes(attachment.mimeType)) {
        alert('This file type cannot be previewed. Please download it instead.');
        return;
      }
      
      // For images, create data URL and show in modal
      if (attachment.mimeType.startsWith('image/')) {
        const dataUrl = `data:${attachment.mimeType};base64,${base64Data}`;
        setViewingAttachment({ attachment, data: dataUrl, mimeType: attachment.mimeType });
      } else {
        // For text files, decode and show content in modal
        try {
          const binaryData = atob(base64Data);
          const textContent = new TextDecoder().decode(new Uint8Array(binaryData.split('').map(c => c.charCodeAt(0))));
          setViewingAttachment({ attachment, data: textContent, mimeType: attachment.mimeType });
        } catch (decodeError) {
          console.error('Error decoding base64:', decodeError);
          throw new Error('Failed to decode attachment data');
        }
      }

    } catch (error) {
      console.error('Error viewing attachment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Failed to load attachment: ' + errorMessage);
    } finally {
      setViewingAttachments(prev => ({ ...prev, [attachment.id]: false }));
    }
  };

  const handleOpenPDF = async (attachment: EmailAttachment) => {
    if (!email) return;

    setViewingAttachments(prev => ({ ...prev, [attachment.id]: true }));

    try {
      console.log('📄 Opening PDF:', attachment);
      const response = await supabase.functions.invoke('get-gmail-attachment', {
        body: {
          messageId: email.id,
          attachmentId: attachment.attachmentId
        }
      });

      console.log('📄 PDF response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to load PDF');
      }

      if (!response.data?.success || !response.data?.data) {
        throw new Error('Invalid response format');
      }

      // Decode base64 data
      let base64Data = response.data.data;
      
      // Converter Base64URL para Base64 padrão (substituir - por + e _ por /)
      base64Data = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      
      // Adicionar padding se necessário
      while (base64Data.length % 4 !== 0) {
        base64Data += '=';
      }

      // Decodificar base64 para blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: attachment.mimeType });
      
      // Criar blob URL e abrir em nova aba
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Limpar blob URL após um tempo
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);

    } catch (error) {
      console.error('Error opening PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Failed to open PDF: ' + errorMessage);
    } finally {
      setViewingAttachments(prev => ({ ...prev, [attachment.id]: false }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  // useEffect para tratar imagens que falham
  React.useEffect(() => {
    if (!email?.body) return;

    const handleImageError = (event: Event) => {
      const img = event.target as HTMLImageElement;
      const placeholder = img.nextElementSibling as HTMLElement;
      if (placeholder && placeholder.classList.contains('image-placeholder')) {
        img.style.display = 'none';
        placeholder.style.display = 'block';
      }
    };

    const handleImageLoad = (event: Event) => {
      const img = event.target as HTMLImageElement;
      const placeholder = img.nextElementSibling as HTMLElement;
      if (placeholder && placeholder.classList.contains('image-placeholder')) {
        placeholder.style.display = 'none';
      }
    };

    // Adicionar listeners para todas as imagens no conteúdo
    const images = document.querySelectorAll('.email-html-content .email-image');
    images.forEach((img) => {
      img.addEventListener('error', handleImageError);
      img.addEventListener('load', handleImageLoad);
    });

    // Cleanup
    return () => {
      images.forEach(img => {
        img.removeEventListener('error', handleImageError);
        img.removeEventListener('load', handleImageLoad);
      });
    };
  }, [email?.body]);
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
      // Limpar HTML antes de renderizar
      const cleanedHtml = cleanEmailHtml(emailBody);
      
      return (
        <div 
          className="email-html-content"
          dangerouslySetInnerHTML={{ __html: cleanedHtml }}
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
      
      {/* Attachments Section */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 mb-3">
            <Paperclip className="h-5 w-5 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">Attachments ({email.attachments.length})</h3>
          </div>
          <div className="space-y-2">
            {email.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <File className="h-5 w-5 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-slate-500">
                      {attachment.mimeType} • {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>
                                 <div className="flex items-center space-x-2">
                   {/* View button for viewable files */}
                   {['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'text/plain', 'text/html'].includes(attachment.mimeType) && (
                     <button
                       onClick={() => handleViewAttachment(attachment)}
                       disabled={downloadingAttachments[attachment.id] || viewingAttachments[attachment.id]}
                       className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                       title="View attachment"
                     >
                       {viewingAttachments[attachment.id] ? (
                         <>
                           <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                           <span>Loading...</span>
                         </>
                       ) : (
                         <>
                           <Eye className="h-4 w-4" />
                           <span>View</span>
                         </>
                       )}
                     </button>
                   )}
                   
                   {/* Open PDF button */}
                   {attachment.mimeType === 'application/pdf' && (
                     <button
                       onClick={() => handleOpenPDF(attachment)}
                       disabled={downloadingAttachments[attachment.id] || viewingAttachments[attachment.id]}
                       className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                       title="Open PDF in new tab"
                     >
                       {viewingAttachments[attachment.id] ? (
                         <>
                           <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                           <span>Loading...</span>
                         </>
                       ) : (
                         <>
                           <Eye className="h-4 w-4" />
                           <span>Open PDF</span>
                         </>
                       )}
                     </button>
                   )}
                   
                   {/* Download button */}
                   <button
                     onClick={() => handleDownloadAttachment(attachment)}
                     disabled={downloadingAttachments[attachment.id] || viewingAttachments[attachment.id]}
                     className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                     title="Download attachment"
                   >
                     {downloadingAttachments[attachment.id] ? (
                       <>
                         <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                         <span>Downloading...</span>
                       </>
                     ) : (
                       <>
                         <Download className="h-4 w-4" />
                         <span>Download</span>
                       </>
                     )}
                   </button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
      
      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {viewingAttachment.attachment.filename}
              </h3>
              <button
                onClick={() => setViewingAttachment(null)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
                         <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
               {viewingAttachment.mimeType.startsWith('image/') ? (
                 <div className="flex justify-center">
                   <img
                     src={viewingAttachment.data}
                     alt={viewingAttachment.attachment.filename}
                     className="max-w-full max-h-full object-contain"
                     style={{ maxHeight: '70vh' }}
                   />
                 </div>
               ) : (
                 <div className="bg-slate-50 p-4 rounded-lg">
                   <pre className="whitespace-pre-wrap text-sm text-slate-900 font-mono overflow-auto max-h-96">
                     {viewingAttachment.data}
                   </pre>
                 </div>
               )}
             </div>
            
            <div className="flex items-center justify-between p-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                {viewingAttachment.attachment.mimeType} • {formatFileSize(viewingAttachment.attachment.size)}
              </div>
              <button
                onClick={() => handleDownloadAttachment(viewingAttachment.attachment)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDetail; 