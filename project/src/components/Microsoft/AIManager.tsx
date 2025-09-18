'use client';

import { useState, useEffect } from 'react';
import { Bot, Play, BarChart3, XCircle, Loader2 } from 'lucide-react';
import { useAuthToken } from '../../hooks/useAuthToken';

interface AIStats {
  total: number;
  processed: number;
  errors: number;
  replied: number;
}

interface ProcessedEmail {
  id: string;
  subject: string;
  from: string;
  analysis: any;
  response?: string;
  processedAt: string;
  status: 'pending' | 'processed' | 'error';
}

export default function AIManager() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'active' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('Sistema de IA pronto para uso');
  const [stats, setStats] = useState<AIStats | null>(null);
  const [recentEmails, setRecentEmails] = useState<ProcessedEmail[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setWebhookStatus] = useState<any>(null);
  const [autoStarted, setAutoStarted] = useState(false);
  
  // Usar o hook de autenticação
  const authData = useAuthToken();
  const accounts = authData?.accounts || [];
  const getToken = authData?.getToken;

  // Verificar status do sistema quando o componente carrega
  useEffect(() => {
    console.log('AIManager - useEffect executado, accounts.length:', accounts.length);
    console.log('AIManager - authData:', authData);
    console.log('AIManager - loading state:', loading);
    
    // Se ainda não temos dados de autenticação, aguardar
    if (!authData) {
      console.log('AIManager - Dados de autenticação não disponíveis, aguardando...');
      setStatus('idle');
      setMessage('Aguardando autenticação...');
      return;
    }

    if (accounts.length === 0) {
      console.log('AIManager - Nenhuma conta encontrada, aguardando...');
      setStatus('idle');
      setMessage('Aguardando login...');
      return;
    }

    // Usuário logado, sistema pronto para uso manual
    console.log('AIManager - Usuário logado, sistema pronto');
    setStatus('idle');
    setMessage('Sistema de IA pronto para uso');
  }, [authData, accounts.length]);

  const testProcessing = async () => {
    console.log('AIManager - testProcessing iniciado');
    setLoading(true);
    setMessage('');

    try {
      console.log('AIManager - Iniciando teste de processamento...');
      
      if (accounts.length === 0) {
        setMessage('Erro: Usuário não está logado. Faça login primeiro.');
        setLoading(false);
        return;
      }

      console.log('AIManager - Obtendo token...');

      // Obter token usando o hook
      if (!getToken) {
        setMessage('Erro: Função getToken não disponível');
        setLoading(false);
        return;
      }
      const userToken = await getToken();

      console.log('AIManager - Token obtido, fazendo requisição...');
      console.log('AIManager - Usando servidor local na porta 3001');
      
      // Usar servidor local em vez da Edge Function
      const API_BASE_URL = 'http://localhost:3001';
      
      // Teste simples primeiro - GET
      console.log('AIManager - Testando GET primeiro...');
      const testResponse = await fetch(`${API_BASE_URL}/api/polling-user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      console.log('AIManager - Test GET status:', testResponse.status);
      const testData = await testResponse.json();
      console.log('AIManager - Test GET response:', testData);

      const response = await fetch(`${API_BASE_URL}/api/polling-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
      });

      console.log('AIManager - Status da resposta:', response.status);
      console.log('AIManager - Response OK:', response.ok);

      const data = await response.json();

      console.log('AIManager - Resposta recebida:', data);

      if (response.ok) {
        setMessage(`Teste concluído! ${data.stats.replied} respostas enviadas de ${data.stats.processed} emails processados.`);
        setStats(data.stats);
        setRecentEmails(data.emails || []);
      } else {
        setMessage(`Erro: ${data.error || 'Falha ao testar processamento'}`);
      }
    } catch (error) {
      console.error('AIManager - Erro no teste:', error);
      setMessage(`Erro: ${error instanceof Error ? error.message : 'Falha no teste'}`);
    } finally {
      console.log('AIManager - testProcessing finalizado, setLoading(false)');
      setLoading(false);
    }
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setMessage('Processando emails...');

    try {
      if (accounts.length === 0) {
        setMessage('Erro: Usuário não está logado. Faça login primeiro.');
        setIsProcessing(false);
        return;
      }

      // Obter token usando o hook
      if (!getToken) {
        setMessage('Erro: Função getToken não disponível');
        setIsProcessing(false);
        return;
      }
      const userToken = await getToken();

      const response = await fetch(`http://localhost:3001/api/polling-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('active');
        setMessage('Sistema de IA ativo! Verificando emails automaticamente a cada 5 minutos.');
        setStats(data.stats);
      } else {
        setStatus('error');
        setMessage(`Erro: ${data.error || 'Falha ao iniciar sistema de IA'}`);
      }
    } catch (error) {
      console.error('AIManager - Erro ao iniciar polling:', error);
      setStatus('error');
      setMessage(`Erro: ${error instanceof Error ? error.message : 'Falha na comunicação'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopProcessing = async () => {
    setIsProcessing(true);
    setMessage('Parando sistema de IA...');
    try {
      // Implementar lógica para parar o polling na Edge Function, se aplicável
      // Por enquanto, apenas simula a parada
      setStatus('idle');
      setMessage('Sistema de IA parado.');
    } catch (error) {
      console.error('AIManager - Erro ao parar polling:', error);
      setMessage(`Erro ao parar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPollingStatus = async () => {
    console.log('AIManager - checkPollingStatus iniciado');
    setLoading(true);
    setMessage('');

    try {
      console.log('AIManager - Fazendo requisição GET...');
      console.log('AIManager - URL completa:', `http://localhost:3001/api/polling-user`);
      console.log('AIManager - VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
      
      // Adicionar timeout de 10 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`http://localhost:3001/api/polling-user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log('AIManager - Resposta recebida, status:', response.status);
      const data = await response.json();
      console.log('AIManager - Dados da resposta:', data);

      if (response.ok) {
        setWebhookStatus(data);
        setMessage(`Status: ${data.message}`);
        setStats(data.stats);
      } else {
        setMessage(`Erro: ${data.error || 'Falha ao verificar status'}`);
      }
    } catch (error) {
      console.error('AIManager - Erro na requisição:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setMessage('Erro: Timeout na requisição (10s). Edge Function pode estar travada.');
      } else {
        setMessage(`Erro: ${error instanceof Error ? error.message : 'Falha na verificação'}`);
      }
    } finally {
      console.log('AIManager - checkPollingStatus finalizado, setLoading(false)');
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bot className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold">Resposta Automática com IA</h3>
          <p className="text-sm text-gray-600">Sistema de polling verifica emails automaticamente a cada 5 minutos</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Controles */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              console.log('AIManager - Botão Verificar Status clicado');
              console.log('AIManager - Loading state:', loading);
              checkPollingStatus();
            }}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <BarChart3 className="w-4 h-4" />
            Verificar Status
          </button>

          <button
            onClick={() => {
              console.log('AIManager - Botão Testar IA clicado');
              console.log('AIManager - Loading state:', loading);
              testProcessing();
            }}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Testar IA
          </button>

          <button
            onClick={startProcessing}
            disabled={isProcessing || status === 'active' || accounts.length === 0}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isProcessing ? 'Iniciando...' : 'Iniciar Sistema'}
          </button>

          <button
            onClick={stopProcessing}
            disabled={isProcessing || status === 'idle' || accounts.length === 0}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            {isProcessing ? 'Parando...' : 'Parar Sistema'}
          </button>

          <button
            onClick={() => {
              setAutoStarted(false);
              setStatus('idle');
              setMessage('Sistema resetado');
            }}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Loader2 className="w-4 h-4" />
            Resetar Sistema
          </button>
        </div>

        {/* Status */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">{message}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.processed}</p>
              <p className="text-xs text-gray-600">Processados</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
              <p className="text-xs text-gray-600">Erros</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{stats.replied}</p>
              <p className="text-xs text-gray-600">Respondidos</p>
            </div>
          </div>
        )}

        {/* Recent Emails */}
        {recentEmails.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Últimos Emails Processados:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentEmails.map((email) => (
                <div key={email.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{email.subject}</p>
                    <div className="text-xs text-gray-500">
                      De: {email.from} • {formatDate(email.processedAt)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {email.response ? 'Respondido' : 'Não respondido'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
