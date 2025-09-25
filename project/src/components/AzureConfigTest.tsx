import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';

const AzureConfigTest: React.FC = () => {
  const { instance } = useMsal();
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAzureConfig = async () => {
    setLoading(true);
    setTestResult('🔄 Testando configuração do Azure...');

    try {
      // Teste 1: Verificar se MSAL está configurado corretamente
      console.log('🔍 Testando configuração MSAL...');
      
      // Teste 2: Tentar obter refresh token com diferentes métodos
      const testMethods = [
        {
          name: 'loginPopup com consent',
          method: () => instance.loginPopup({
            scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
            prompt: 'consent',
            extraQueryParameters: {
              'prompt': 'consent',
              'scope': 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'
            }
          })
        },
        {
          name: 'acquireTokenPopup com consent',
          method: () => instance.acquireTokenPopup({
            scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access'],
            prompt: 'consent',
            extraQueryParameters: {
              'prompt': 'consent',
              'scope': 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'
            }
          })
        }
      ];

      let successMethod = null;
      let refreshToken = null;

      for (const testMethod of testMethods) {
        try {
          console.log(`🔄 Testando: ${testMethod.name}`);
          const response = await testMethod.method();
          
          console.log(`🔍 DEBUG - ${testMethod.name}:`, {
            hasAccessToken: !!response.accessToken,
            hasRefreshToken: !!response.refreshToken,
            hasExpiresOn: !!response.expiresOn,
            refreshTokenLength: response.refreshToken ? response.refreshToken.length : 0
          });

          if (response.refreshToken) {
            successMethod = testMethod.name;
            refreshToken = response.refreshToken;
            break;
          }
        } catch (error) {
          console.log(`❌ ${testMethod.name} falhou:`, error);
        }
      }

      if (successMethod && refreshToken) {
        setTestResult(`✅ SUCESSO! Método: ${successMethod}\n🔑 Refresh token obtido: ${refreshToken.substring(0, 20)}...`);
      } else {
        setTestResult(`❌ FALHA! Nenhum método conseguiu obter refresh token.\n\n🔧 SOLUÇÕES:\n1. Verifique se "Allow public client flows" está como "Yes"\n2. Verifique se "Implicit grant and hybrid flows" tem "Access tokens" marcado\n3. Aguarde 5-10 minutos para propagação\n4. Tente com uma conta Microsoft diferente`);
      }

    } catch (error) {
      console.error('❌ Erro no teste:', error);
      setTestResult(`❌ ERRO: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">🧪 Teste de Configuração Azure</h3>
      
      <button
        onClick={testAzureConfig}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? '🔄 Testando...' : '🧪 Testar Configuração Azure'}
      </button>

      {testResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded border">
          <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <h4 className="font-semibold mb-2">📋 Checklist Azure Portal:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ "Allow public client flows" = "Yes"</li>
          <li>✅ "Implicit grant and hybrid flows" = "Access tokens" marcado</li>
          <li>✅ Redirect URIs configurados</li>
          <li>✅ API Permissions: Mail.Read, Mail.ReadWrite, Mail.Send, User.Read</li>
        </ul>
      </div>
    </div>
  );
};

export default AzureConfigTest;
