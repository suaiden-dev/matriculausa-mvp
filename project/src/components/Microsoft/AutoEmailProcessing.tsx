import React, { useState, useEffect } from 'react';
import { Mail, Play, Pause, Settings, CheckCircle, XCircle, Clock, Bot } from 'lucide-react';
import { useAuthToken } from '../../hooks/useAuthToken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface ProcessingStatus {
  isActive: boolean;
  lastProcessed: string | null;
  totalProcessed: number;
  totalReplied: number;
  error: string | null;
}

const AutoEmailProcessing: React.FC = () => {
  const { getToken, accounts } = useAuthToken();
  const [status, setStatus] = useState<ProcessingStatus>({
    isActive: false,
    lastProcessed: null,
    totalProcessed: 0,
    totalReplied: 0,
    error: null
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar status do processamento
  useEffect(() => {
    loadProcessingStatus();
    
    // Atualizar contadores a cada 30 segundos quando ativo
    const interval = setInterval(() => {
      if (status.isActive) {
        loadProcessingStatus();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [accounts, status.isActive]);

  const loadProcessingStatus = async () => {
    if (!accounts.length) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('email_processing_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar status:', error);
        return;
      }

      if (data) {
        setStatus({
          isActive: data.is_active,
          lastProcessed: data.last_processed_email_id,
          totalProcessed: data.total_processed || 0,
          totalReplied: data.total_replied || 0,
          error: null
        });
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      setStatus(prev => ({ ...prev, error: 'Erro ao carregar status' }));
    } finally {
      setLoading(false);
    }
  };

  const toggleProcessing = async () => {
    if (!getToken || !accounts.length) return;

    try {
      setSaving(true);
      const token = await getToken();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Usar MSAL token diretamente (não precisa de refresh token separado)
      console.log('✅ Token obtido via MSAL, iniciando processamento...');

      const { error } = await supabase
        .from('email_processing_configs')
        .upsert({
          user_id: user.id,
          access_token: token,
          refresh_token: 'msal_token', // MSAL gerencia tokens automaticamente
          is_active: !status.isActive
        });

      if (error) {
        throw error;
      }

      setStatus(prev => ({ ...prev, isActive: !prev.isActive }));
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setStatus(prev => ({ ...prev, error: 'Erro ao alterar status' }));
    } finally {
      setSaving(false);
    }
  };

  const testProcessing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/microsoft-email-polling', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao testar processamento');
      }

      const result = await response.json();
      console.log('Resultado do teste:', result);
    } catch (error) {
      console.error('Erro no teste:', error);
      setStatus(prev => ({ ...prev, error: 'Erro no teste' }));
    } finally {
      setLoading(false);
    }
  };

  if (!accounts.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 text-gray-500">
          <Mail className="h-6 w-6" />
          <span>Faça login para ativar o processamento automático</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      {/* Cabeçalho minimalista */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">AI Assistant</span>
        </div>
        <div className="flex items-center space-x-1">
          {status.isActive ? (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Ativo</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-500">Inativo</span>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas compactas */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="text-center">
          <div className="text-sm font-semibold text-blue-600">{status.totalProcessed}</div>
          <div className="text-xs text-gray-500">Processados</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-green-600">{status.totalReplied}</div>
          <div className="text-xs text-gray-500">Respostas</div>
        </div>
      </div>

      {/* Erro compacto */}
      {status.error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <div className="flex items-center space-x-1">
            <XCircle className="h-3 w-3" />
            <span>{status.error}</span>
          </div>
        </div>
      )}

      {/* Botão de ação minimalista */}
      <button
        onClick={toggleProcessing}
        disabled={saving || loading}
        className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
          status.isActive
            ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
            : 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {saving ? (
          <Clock className="h-3 w-3 animate-spin" />
        ) : status.isActive ? (
          <>
            <Pause className="h-3 w-3" />
            <span>Pausar IA</span>
          </>
        ) : (
          <>
            <Play className="h-3 w-3" />
            <span>Ativar IA</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AutoEmailProcessing;
