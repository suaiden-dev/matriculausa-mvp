import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { graphScopes } from '../../lib/msalConfig';
import { GraphService } from '../../lib/services/GraphService';
import { Send, X, Loader2, Trash2 } from 'lucide-react';

interface EmailComposeProps {
  onClose: () => void;
  onSent: () => void;
}

export default function EmailCompose({ onClose, onSent }: EmailComposeProps) {
  const { instance, accounts } = useMsal();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const handleSendEmail = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await instance.acquireTokenSilent({
        scopes: graphScopes,
        account: accounts[0],
      });

      const graphService = new GraphService(response.accessToken);
      
      // Preparar destinatários
      const toRecipients = to.split(',').map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));

      const ccRecipients = cc ? cc.split(',').map(email => ({
        emailAddress: {
          address: email.trim()
        }
      })) : [];

      const bccRecipients = bcc ? bcc.split(',').map(email => ({
        emailAddress: {
          address: email.trim()
        }
      })) : [];

      // Criar email
      const emailMessage = {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: body.replace(/\n/g, '<br>')
        },
        toRecipients: toRecipients,
        ccRecipients: ccRecipients,
        bccRecipients: bccRecipients
      };

      // Enviar email
      await graphService.sendEmail(emailMessage);
      
      onSent();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      setError('Erro ao enviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDraft = () => {
    // TODO: Implementar salvamento de rascunho
    console.log('Salvar rascunho');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Novo Email</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDraft}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Rascunho
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Para: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            {/* CC */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setShowCc(!showCc)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showCc ? 'Ocultar' : 'Mostrar'} CC
                </button>
                {showCc && (
                  <button
                    onClick={() => setCc('')}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                )}
              </div>
              {showCc && (
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              )}
            </div>

            {/* BCC */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setShowBcc(!showBcc)}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showBcc ? 'Ocultar' : 'Mostrar'} BCC
                </button>
                {showBcc && (
                  <button
                    onClick={() => setBcc('')}
                    className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                )}
              </div>
              {showBcc && (
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assunto: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Digite o assunto do email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem: <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Digite sua mensagem aqui..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none"
                rows={12}
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
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-gray-500">
            <span className="text-red-500">*</span> Campos obrigatórios
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDraft}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Salvar Rascunho
            </button>
            <button
              onClick={handleSendEmail}
              disabled={loading || !to.trim() || !subject.trim() || !body.trim()}
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
    </div>
  );
}
