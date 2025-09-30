import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { graphScopes } from '../../lib/msalConfig';
import { GraphService } from '../../lib/services/GraphService';
import { Send, X, Loader2 } from 'lucide-react';

interface EmailReplyProps {
  email: {
    id: string;
    subject: string;
    from: {
      emailAddress: {
        name: string;
        address: string;
      };
    };
  };
  onClose: () => void;
  onSent: () => void;
}

export default function EmailReply({ email, onClose, onSent }: EmailReplyProps) {
  const { instance, accounts } = useMsal();
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await instance.acquireTokenSilent({
        scopes: graphScopes,
        account: accounts[0],
      });

      const graphService = new GraphService(response.accessToken);
      
      // Criar resposta
      const replyMessage = {
        message: {
          subject: `Re: ${email.subject}`,
          body: {
            contentType: 'Text',
            content: replyText
          },
          toRecipients: [
            {
              emailAddress: {
                name: email.from.emailAddress.name,
                address: email.from.emailAddress.address
              }
            }
          ]
        }
      };

      // Enviar resposta
      await graphService.sendReply(email.id, replyMessage);
      
      onSent();
      onClose();
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Responder Email</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Para:
              </label>
              <input
                type="text"
                value={email.from.emailAddress.address}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assunto:
              </label>
              <input
                type="text"
                value={`Re: ${email.subject}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem:
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                rows={8}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSendReply}
            disabled={loading || !replyText.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
