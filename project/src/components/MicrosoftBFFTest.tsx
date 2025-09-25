import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMicrosoftBFFAuth } from '../lib/microsoftBFFAuth';

const MicrosoftBFFTest: React.FC = () => {
  const { user } = useAuth();
  const { validateEnvironment, connectWithPopup, connectWithRedirect, config } = useMicrosoftBFFAuth();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testEnvironment = () => {
    console.log('🧪 DEBUG - Testando configuração BFF...');
    const validation = validateEnvironment();
    console.log('🧪 DEBUG - Resultado da validação:', validation);
    
    if (validation.isValid) {
      setTestResult('✅ Configuração BFF válida - pronto para usar!');
    } else {
      console.error('❌ Configuração BFF inválida:', validation.errors);
      setTestResult(`❌ Configuração BFF inválida: ${validation.errors.join(', ')}`);
    }
  };

  const testBFFPopup = async () => {
    setLoading(true);
    setTestResult('🔄 Testando BFF popup...');
    
    try {
      console.log('🧪 DEBUG - Iniciando teste BFF popup...');
      const result = await connectWithPopup();
      console.log('🧪 DEBUG - Resultado do BFF popup:', result);
      
      if (result.success) {
        setTestResult(`✅ BFF popup bem-sucedido! Email: ${result.email}`);
      } else {
        console.error('❌ BFF popup falhou:', result.error);
        setTestResult(`❌ BFF popup falhou: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Erro no BFF popup:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      setTestResult(`❌ Erro no BFF popup: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testBFFRedirect = () => {
    console.log('🧪 DEBUG - Iniciando teste BFF redirect...');
    setTestResult('🔄 Redirecionando para BFF...');
    try {
      connectWithRedirect();
    } catch (error: any) {
      console.error('❌ Erro no BFF redirect:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const showConfig = () => {
    console.log('🧪 DEBUG - Mostrando configuração BFF:', config);
    setTestResult(`📋 Configuração BFF:
- Client ID: ${config.clientId ? '✅ Configurado' : '❌ Não configurado'}
- Tenant ID: ${config.tenantId}
- Redirect URI: ${config.redirectUri}
- Scopes: ${config.scopes.join(', ')}`);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">🧪 Teste Microsoft BFF Auth</h2>
      <p className="mb-4 text-gray-700">
        Teste a nova implementação BFF (Backend for Frontend) que deve obter refresh tokens de 90 dias.
      </p>
      
      <div className="space-y-4">
        <button
          onClick={testEnvironment}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔍 Verificar Configuração
        </button>

        <button
          onClick={showConfig}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          📋 Mostrar Configuração
        </button>

        <button
          onClick={testBFFPopup}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? '🔄 Testando...' : '🚀 Testar BFF Popup'}
        </button>

        <button
          onClick={testBFFRedirect}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          🔄 Testar BFF Redirect
        </button>
      </div>

      {testResult && (
        <div className={`mt-4 p-3 rounded ${
          testResult.startsWith('✅') ? 'bg-green-100 text-green-800' : 
          testResult.startsWith('❌') ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          <pre className="whitespace-pre-wrap">{testResult}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Importante:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• O BFF usa Edge Functions para obter refresh tokens de 90 dias</li>
          <li>• Não depende mais do MSAL.js para refresh tokens</li>
          <li>• Funciona mesmo com Azure App Registration configurado como SPA</li>
          <li>• Teste primeiro a configuração antes de usar</li>
        </ul>
      </div>
    </div>
  );
};

export default MicrosoftBFFTest;
