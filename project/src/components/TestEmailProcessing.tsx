import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface TestEmailProcessingProps {
  className?: string;
}

const TestEmailProcessing: React.FC<TestEmailProcessingProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testEmailProcessing = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('📧 TestEmailProcessing: Starting email processing test...');
      
      // Simular um webhook do Gmail
      const mockWebhookData = {
        message: {
          data: btoa(JSON.stringify({
            messageId: `test_${Date.now()}`,
            from: 'test@example.com',
            to: 'victuribdev@gmail.com',
            subject: 'Teste Manual - Processamento de Email',
            body: 'Este é um email de teste para verificar se o processamento está funcionando.',
            timestamp: new Date().toISOString(),
            threadId: `thread_${Date.now()}`
          })),
          messageId: `msg_${Date.now()}`,
          publishTime: new Date().toISOString()
        },
        subscription: 'test_subscription'
      };

      console.log('📧 TestEmailProcessing: Mock webhook data:', mockWebhookData);

      const { data, error } = await supabase.functions.invoke('process-inbox-email', {
        body: mockWebhookData
      });

      if (error) {
        console.error('❌ TestEmailProcessing: Error:', error);
        setError(`Erro na requisição: ${error.message}`);
        return;
      }

      console.log('✅ TestEmailProcessing: Success response:', data);
      setResult(data);

    } catch (err: any) {
      console.error('❌ TestEmailProcessing: Unexpected error:', err);
      setError(`Erro inesperado: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-4 border rounded-lg bg-yellow-50 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">📧 Teste Manual - Processamento de Email</h3>
      
      <div className="space-y-4">
        <button
          onClick={testEmailProcessing}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {isLoading ? '🔄 Processando...' : '📧 Testar Processamento de Email'}
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
            <li>Simula um webhook do Gmail com dados de teste</li>
            <li>Chama a Edge Function process-inbox-email</li>
            <li>Testa a identificação da universidade</li>
            <li>Testa o registro da conversa</li>
            <li>Testa a notificação para n8n</li>
            <li>Mostra logs detalhados no console</li>
          </ul>
        </div>

        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
          <p><strong>💡 Dica:</strong> Abra o console do navegador (F12) para ver os logs detalhados do processamento.</p>
        </div>
      </div>
    </div>
  );
};

export default TestEmailProcessing; 