import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMicrosoftConnection } from '../hooks/useMicrosoftConnection';
import ImprovedTokenRenewalService from '../lib/improvedTokenRenewal';
import { clearMicrosoftCache, checkMicrosoftCacheIssues, forceClearAndReload } from '../utils/clearMicrosoftCache';

const TokenRenewalTest: React.FC = () => {
  const { user } = useAuth();
  const { activeConnection } = useMicrosoftConnection();
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testTokenRenewal = async () => {
    if (!user || !activeConnection) {
      setTestResult('❌ Usuário ou conexão Microsoft não encontrada');
      return;
    }

    setIsLoading(true);
    setTestResult('🔄 Testando renovação de token...');

    try {
      const renewalService = ImprovedTokenRenewalService.getInstance();
      
      // Testar verificação e renovação preventiva
      console.log('🧪 Testando verificação de token...');
      const token = await renewalService.checkAndRenewToken(user.id, activeConnection.email_address);
      
      if (token) {
        setTestResult(`✅ Token obtido com sucesso! (${token.substring(0, 20)}...)`);
        console.log('✅ Token obtido:', token.substring(0, 20) + '...');
      } else {
        setTestResult('❌ Falha ao obter token');
      }
    } catch (error: any) {
      setTestResult(`❌ Erro: ${error.message}`);
      console.error('❌ Erro no teste:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectToken = async () => {
    if (!user || !activeConnection) {
      setTestResult('❌ Usuário ou conexão Microsoft não encontrada');
      return;
    }

    setIsLoading(true);
    setTestResult('🔄 Testando obtenção direta de token...');

    try {
      const renewalService = ImprovedTokenRenewalService.getInstance();
      const token = await renewalService.getValidToken(user.id, activeConnection.email_address);
      
      if (token) {
        setTestResult(`✅ Token obtido diretamente! (${token.substring(0, 20)}...)`);
        console.log('✅ Token direto obtido:', token.substring(0, 20) + '...');
      } else {
        setTestResult('❌ Falha ao obter token diretamente');
      }
    } catch (error: any) {
      setTestResult(`❌ Erro: ${error.message}`);
      console.error('❌ Erro no teste direto:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testTokenRevocation = async () => {
    if (!user || !activeConnection) {
      setTestResult('❌ Usuário ou conexão Microsoft não encontrada');
      return;
    }

    setIsLoading(true);
    setTestResult('🔄 Testando detecção de revogação de token...');

    try {
      const renewalService = ImprovedTokenRenewalService.getInstance();
      const isRevoked = await renewalService.handleTokenRevocation(user.id, activeConnection.email_address);
      
      if (isRevoked) {
        setTestResult('⚠️ Token foi revogado - usuário precisa reautenticar');
      } else {
        setTestResult('✅ Token ainda válido - não foi revogado');
      }
    } catch (error: any) {
      setTestResult(`❌ Erro: ${error.message}`);
      console.error('❌ Erro no teste de revogação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testCacheIssues = () => {
    const hasIssues = checkMicrosoftCacheIssues();
    if (hasIssues) {
      setTestResult('⚠️ Problemas de cache Microsoft detectados! Use o botão de limpeza abaixo.');
    } else {
      setTestResult('✅ Nenhum problema de cache detectado');
    }
  };

  const clearCache = () => {
    clearMicrosoftCache();
    setTestResult('🧹 Cache limpo! Recarregue a página para aplicar as mudanças.');
  };

  const forceClearAndReloadPage = () => {
    if (confirm('Isso vai limpar todo o cache e recarregar a página. Continuar?')) {
      forceClearAndReload();
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">🧪 Teste de Renovação de Token</h2>
      
      <div className="mb-4">
        <p><strong>Usuário:</strong> {user?.email || 'Não logado'}</p>
        <p><strong>Conexão Microsoft:</strong> {activeConnection?.email_address || 'Não conectada'}</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={testTokenRenewal}
          disabled={isLoading || !user || !activeConnection}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? '🔄 Testando...' : '🧪 Testar Renovação Preventiva'}
        </button>

        <button
          onClick={testDirectToken}
          disabled={isLoading || !user || !activeConnection}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {isLoading ? '🔄 Testando...' : '🎯 Testar Obtenção Direta'}
        </button>

        <button
          onClick={testTokenRevocation}
          disabled={isLoading || !user || !activeConnection}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400"
        >
          {isLoading ? '🔄 Testando...' : '🔍 Testar Detecção de Revogação'}
        </button>

        <button
          onClick={testCacheIssues}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          🔍 Verificar Problemas de Cache
        </button>

        <button
          onClick={clearCache}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          🧹 Limpar Cache Microsoft
        </button>

        <button
          onClick={forceClearAndReloadPage}
          className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
        >
          ⚡ Limpar Cache e Recarregar
        </button>
      </div>

      {testResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Resultado do Teste:</h3>
          <pre className="whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 rounded">
        <h3 className="font-bold mb-2">📋 Informações do Sistema (Baseado na Documentação Oficial):</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>MSAL Config:</strong> localStorage + cookies habilitados</li>
          <li>• <strong>Escopo offline_access:</strong> Incluído para refresh tokens</li>
          <li>• <strong>Renovação Preventiva:</strong> 30 minutos antes do vencimento</li>
          <li>• <strong>Fallback:</strong> Refresh token do banco + MSAL acquireTokenSilent</li>
          <li>• <strong>Duração Refresh Token:</strong> 24h para SPAs, 90 dias outros cenários</li>
          <li>• <strong>Segurança:</strong> Tokens criptografados, detecção de revogação</li>
          <li>• <strong>Renovação Automática:</strong> Refresh tokens se renovam a cada uso</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenRenewalTest;
