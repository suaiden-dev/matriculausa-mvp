import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface TestNgrokEndpointProps {
  className?: string;
}

interface EmailConversation {
  id: string;
  message_id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  html_body?: string;
  created_at: string;
  thread_id?: string;
}

const TestNgrokEndpoint: React.FC<TestNgrokEndpointProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailConversation[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>('');

  // Carregar emails da caixa de entrada
  const loadEmails = async () => {
    if (!user) return;
    
    setIsLoadingEmails(true);
    try {
      console.log('📧 TestNgrokEndpoint: Loading emails...');
      
      const { data, error } = await supabase
        .from('ai_email_conversations')
        .select('id, message_id, from, to, subject, body, html_body, created_at, thread_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error loading emails:', error);
        setError(`Erro ao carregar emails: ${error.message}`);
        return;
      }

      console.log('✅ Emails loaded:', data);
      setEmails(data || []);
      
      // Selecionar o primeiro email por padrão
      if (data && data.length > 0) {
        setSelectedEmail(data[0].id);
      }
      
    } catch (err: any) {
      console.error('❌ Unexpected error loading emails:', err);
      setError(`Erro inesperado ao carregar emails: ${err.message}`);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Carregar emails quando o componente montar
  useEffect(() => {
    loadEmails();
  }, [user]);

  const testEndpoint = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🧪 TestNgrokEndpoint: Starting test...');
      
      if (!user) {
        setError('Usuário não autenticado');
        return;
      }

      if (!selectedEmail) {
        setError('Selecione um email para testar');
        return;
      }

      // Buscar o email selecionado
      const selectedEmailData = emails.find(email => email.id === selectedEmail);
      if (!selectedEmailData) {
        setError('Email selecionado não encontrado');
        return;
      }

      console.log('📧 Email selecionado:', selectedEmailData);

      const testData = {
        from: selectedEmailData.from, // Email real que chegou na caixa
        timestamp: selectedEmailData.created_at,
        content: selectedEmailData.body || selectedEmailData.html_body || "Sem conteúdo",
        subject: selectedEmailData.subject,
        client_id: user.id // User ID real
      };

      console.log('🧪 TestNgrokEndpoint: Sending test data:', testData);

      const { data, error } = await supabase.functions.invoke('send-to-ngrok-endpoint', {
        body: testData
      });

      if (error) {
        console.error('❌ TestNgrokEndpoint: Error:', error);
        setError(`Erro na requisição: ${error.message}`);
        return;
      }

      console.log('✅ TestNgrokEndpoint: Success response:', data);
      setResult(data);

    } catch (err: any) {
      console.error('❌ TestNgrokEndpoint: Unexpected error:', err);
      setError(`Erro inesperado: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-4 border rounded-lg bg-gray-50 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">🧪 Teste Manual - Endpoint Ngrok</h3>
      
      <div className="space-y-4">
        {/* Seletor de Emails */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            📧 Selecione um email da caixa de entrada:
          </label>
          
          {isLoadingEmails ? (
            <div className="text-sm text-gray-500">🔄 Carregando emails...</div>
          ) : emails.length === 0 ? (
            <div className="text-sm text-gray-500">📭 Nenhum email encontrado na caixa de entrada</div>
          ) : (
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Selecione um email da caixa de entrada"
            >
              {emails.map((email) => (
                <option key={email.id} value={email.id}>
                  {email.from} - {email.subject} ({new Date(email.created_at).toLocaleString('pt-BR')})
                </option>
              ))}
            </select>
          )}
          
          <button
            onClick={loadEmails}
            disabled={isLoadingEmails}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            🔄 Recarregar emails
          </button>
        </div>

        {/* Botão de Teste */}
        <button
          onClick={testEndpoint}
          disabled={isLoading || !selectedEmail || emails.length === 0}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isLoading || !selectedEmail || emails.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? '🔄 Enviando...' : '🚀 Testar Endpoint Ngrok'}
        </button>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md">
            <h4 className="font-semibold text-red-800">❌ Erro:</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-3 bg-green-100 border border-green-300 rounded-md">
            <h4 className="font-semibold text-green-800">✅ Sucesso:</h4>
            <pre className="text-green-700 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>O que este teste faz:</strong></p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Carrega emails reais da caixa de entrada</li>
            <li>Permite selecionar um email específico</li>
            <li>Usa dados reais do email (from, subject, content)</li>
            <li>Envia para o endpoint ngrok com dados autênticos</li>
            <li>Substitui automaticamente client_id pelo user_id</li>
            <li>Mostra a resposta completa do endpoint</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestNgrokEndpoint; 