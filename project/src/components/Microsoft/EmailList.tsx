import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useAuthToken } from '../../hooks/useAuthToken';
import GraphService from '../../lib/graphService';
import { Mail, Clock, User, Eye, EyeOff } from 'lucide-react';

interface Email {
  id: string;
  subject: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
}

interface EmailListProps {
  onEmailSelect: (email: Email) => void;
}

export default function MicrosoftEmailList({ onEmailSelect }: EmailListProps) {
  const { accounts } = useMsal();
  const { getToken } = useAuthToken();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEmails = async () => {
    console.log('=== getEmails chamada ===');
    if (accounts.length === 0) {
      console.log('Nenhuma conta encontrada');
      return;
    }

    console.log('Iniciando busca de emails...');
    setLoading(true);
    setError(null);

    try {
      console.log('Obtendo token...');
      const accessToken = await getToken();

      console.log('Token obtido, criando serviço Graph...');
      const graphService = new GraphService(accessToken);
      
      console.log('Buscando emails...');
      const emailData = await graphService.getEmails(50);
      
      console.log('Dados recebidos:', emailData);
      console.log('Quantidade de emails recebidos:', emailData.value?.length || 0);
      
      // Validar e filtrar emails com estrutura válida
      const validEmails = (emailData.value || []).filter((email: any) => {
        const isValid = email && email.id && email.subject !== undefined;
        console.log('Email válido:', email.id, 'Subject:', email.subject, 'Válido:', isValid);
        return isValid;
      }).map((email: any) => ({
        ...email,
        from: email.from || { emailAddress: {} },
        subject: email.subject || '(Sem assunto)',
        bodyPreview: email.bodyPreview || '',
        isRead: Boolean(email.isRead),
        receivedDateTime: email.receivedDateTime || new Date().toISOString()
      }));
      
      console.log('Emails válidos após filtro:', validEmails.length);
      console.log('Emails finais:', validEmails);
      console.log('=== Atualizando estado emails ===');
      setEmails(validEmails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Erro ao carregar emails: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accounts.length > 0 && !loading) {
      console.log('Executando useEffect - accounts.length:', accounts.length, 'loading:', loading);
      getEmails();
    }
  }, [accounts.length]); // Dependência específica para evitar loops

  useEffect(() => {
    console.log('=== Estado emails atualizado ===', emails.length, 'emails');
  }, [emails]);

  const getSenderName = (email: Email) => {
    if (email.from?.emailAddress?.name) {
      return email.from.emailAddress.name;
    }
    if (email.from?.emailAddress?.address) {
      return email.from.emailAddress.address;
    }
    return 'Remetente desconhecido';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando emails...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={getEmails}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Caixa de Entrada</h2>
        <button
          onClick={getEmails}
          className="text-blue-600 hover:text-blue-700 transition-colors"
        >
          Atualizar
        </button>
      </div>
      
      {emails.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Nenhum email encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => onEmailSelect(email)}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                email.isRead 
                  ? 'bg-white border-gray-200' 
                  : 'bg-blue-50 border-blue-200 font-semibold'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">
                      {getSenderName(email)}
                    </span>
                    {!email.isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 truncate mb-1">
                    {email.subject || '(Sem assunto)'}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {email.bodyPreview}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {formatDate(email.receivedDateTime)}
                  </span>
                  {email.isRead ? (
                    <Eye className="w-4 h-4 text-gray-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
