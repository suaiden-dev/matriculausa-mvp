import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { graphScopes } from '../../lib/msalConfig';
import { GraphService } from '../../lib/services/GraphService';
import EmailReply from './EmailReply';
import { ArrowLeft, User, Calendar, Mail, Loader2, Reply } from 'lucide-react';

interface Email {
  id: string;
  subject: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  toRecipients?: Array<{
    emailAddress?: {
      name?: string;
      address?: string;
    };
  }>;
  receivedDateTime: string;
  isRead: boolean;
  body?: {
    content?: string;
    contentType?: string;
  };
}

interface EmailViewerProps {
  email: Email | null;
  onBack: () => void;
}

export default function MicrosoftEmailViewer({ email, onBack }: EmailViewerProps) {
  const { instance, accounts } = useMsal();
  const [fullEmail, setFullEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    if (email) {
      loadFullEmail(email.id);
    }
  }, [email]);

  const loadFullEmail = async (emailId: string) => {
    if (accounts.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await instance.acquireTokenSilent({
        scopes: graphScopes,
        account: accounts[0],
      });

      const graphService = new GraphService(response.accessToken);
      const emailData = await graphService.getEmailById(emailId);
      
      // TODO: Adicionar permissão Mail.ReadWrite para marcar como lido
      // await graphService.markEmailAsRead(emailId);
      
      setFullEmail(emailData);
    } catch (error) {
      console.error('Error loading email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Erro ao carregar email: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getSenderName = (email: Email) => {
    if (email.from?.emailAddress?.name) {
      return email.from.emailAddress.name;
    }
    if (email.from?.emailAddress?.address) {
      return email.from.emailAddress.address;
    }
    return 'Remetente desconhecido';
  };

  const getSenderEmail = (email: Email) => {
    return email.from?.emailAddress?.address || 'Email não disponível';
  };

  const getRecipients = (email: Email) => {
    if (!email.toRecipients || email.toRecipients.length === 0) {
      return [];
    }
    return email.toRecipients.map(recipient => 
      recipient.emailAddress?.name || recipient.emailAddress?.address || 'Destinatário desconhecido'
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEmailBody = (content: string, contentType: string) => {
    if (contentType === 'html') {
      return { __html: content };
    }
    return { __html: content.replace(/\n/g, '<br>') };
  };

  if (!email) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => loadFullEmail(email.id)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const displayEmail = fullEmail || email;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {displayEmail.subject || '(Sem assunto)'}
            </h1>
          </div>
          <button
            onClick={() => setShowReply(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Reply className="w-4 h-4" />
            Responder
          </button>
        </div>

        {/* Email Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900">
                {getSenderName(displayEmail)}
              </p>
              <p className="text-sm text-gray-600">
                {getSenderEmail(displayEmail)}
              </p>
            </div>
          </div>

          {getRecipients(displayEmail).length > 0 && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Para:</p>
                <p className="text-sm text-gray-900">
                  {getRecipients(displayEmail).join(', ')}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <p className="text-sm text-gray-600">
              {formatDate(displayEmail.receivedDateTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          {displayEmail.body?.content ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={formatEmailBody(
                displayEmail.body.content,
                displayEmail.body.contentType || 'text'
              )}
            />
          ) : (
            <p className="text-gray-500 italic">Conteúdo não disponível</p>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {showReply && displayEmail && (
        <EmailReply
          email={displayEmail}
          onClose={() => setShowReply(false)}
          onSent={() => {
            setShowReply(false);
            // Opcional: recarregar a lista de emails
          }}
        />
      )}
    </div>
  );
}
