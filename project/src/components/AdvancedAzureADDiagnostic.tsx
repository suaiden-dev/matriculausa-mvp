import React, { useState } from 'react';

const AdvancedAzureADDiagnostic: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const currentOrigin = window.location.origin;
  const hasClientSecret = !!import.meta.env.VITE_AZURE_CLIENT_SECRET;
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

  const runAdvancedDiagnostic = async () => {
    setTestResults({ loading: true });
    
    try {
      // Teste 1: Verificar se o refresh token está vazio no banco
      const { data: config, error } = await supabase
        .from('email_configurations')
        .select('oauth_refresh_token, oauth_access_token, oauth_token_expires_at')
        .eq('provider_type', 'microsoft')
        .eq('is_active', true)
        .single();

      const results = {
        loading: false,
        refreshTokenEmpty: !config?.oauth_refresh_token || config.oauth_refresh_token.trim() === '',
        refreshTokenValue: config?.oauth_refresh_token ? 'Presente' : 'Ausente',
        accessTokenExpired: config?.oauth_token_expires_at ? new Date(config.oauth_token_expires_at) < new Date() : true,
        currentOrigin,
        hasClientSecret,
        clientId
      };

      setTestResults(results);
    } catch (error) {
      setTestResults({ loading: false, error: error.message });
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-800">
          🔍 Diagnóstico Avançado - AADSTS90023
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          {showDetails ? 'Ocultar' : 'Ver Detalhes'}
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">🎯</span>
          <span className="font-medium text-blue-700">Possíveis Causas Restantes:</span>
        </div>
        <ul className="text-blue-600 text-sm space-y-1 ml-6">
          <li>• <strong>Refresh token vazio</strong> no banco de dados</li>
          <li>• <strong>Scope incorreto</strong> na renovação</li>
          <li>• <strong>Headers Origin</strong> sendo enviados</li>
          <li>• <strong>Configuração de tenant</strong> incorreta</li>
        </ul>
      </div>

      <button
        onClick={runAdvancedDiagnostic}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        🔍 Executar Diagnóstico Avançado
      </button>

      {testResults?.loading && (
        <div className="p-3 bg-blue-100 rounded">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Executando diagnóstico...</span>
          </div>
        </div>
      )}

      {testResults && !testResults.loading && (
        <div className="space-y-4">
          {/* Resultados do Diagnóstico */}
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-gray-700 mb-2">📊 Resultados do Diagnóstico:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Refresh Token:</span>
                <span className={testResults.refreshTokenEmpty ? 'text-red-600' : 'text-green-600'}>
                  {testResults.refreshTokenValue}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Access Token:</span>
                <span className={testResults.accessTokenExpired ? 'text-red-600' : 'text-green-600'}>
                  {testResults.accessTokenExpired ? 'Expirado' : 'Válido'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Client Secret:</span>
                <span className={testResults.hasClientSecret ? 'text-green-600' : 'text-red-600'}>
                  {testResults.hasClientSecret ? 'Configurado' : 'Não configurado'}
                </span>
              </div>
            </div>
          </div>

          {/* Soluções Específicas */}
          {testResults.refreshTokenEmpty && (
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">🚨 Problema Identificado: Refresh Token Vazio</h4>
              <div className="text-sm text-red-700 space-y-2">
                <p><strong>Solução:</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>Desconecte e reconecte a conta Microsoft</li>
                  <li>Verifique se o escopo <code>offline_access</code> está sendo solicitado</li>
                  <li>Confirme se o consentimento foi dado para refresh tokens</li>
                </ol>
              </div>
            </div>
          )}

          {!testResults.refreshTokenEmpty && (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ Outras Possíveis Causas:</h4>
              <div className="text-sm text-yellow-700 space-y-2">
                <p><strong>1. Verificar Scope na Renovação:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Scope deve ser: <code>https://graph.microsoft.com/.default</code></li>
                  <li>Não usar: <code>User.Read Mail.Read...</code></li>
                </ul>
                
                <p><strong>2. Verificar Headers Origin:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Interceptador deve estar ativo</li>
                  <li>Headers Origin devem ser removidos</li>
                </ul>
                
                <p><strong>3. Verificar Configuração de Tenant:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Usar <code>common</code> para multilocatário</li>
                  <li>Verificar se não há restrições de tenant</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {showDetails && (
        <div className="space-y-4">
          {/* Configuração Atual */}
          <div className="bg-white p-3 rounded border">
            <h4 className="font-medium text-gray-700 mb-2">⚙️ Configuração Atual:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Client ID:</span>
                <span className="text-green-600">{clientId ? '✅ Configurado' : '❌ Não configurado'}</span>
              </div>
              <div className="flex justify-between">
                <span>Client Secret:</span>
                <span className={hasClientSecret ? 'text-green-600' : 'text-red-600'}>
                  {hasClientSecret ? '✅ Configurado' : '❌ Não configurado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Origem Atual:</span>
                <span className="text-blue-600">{currentOrigin}</span>
              </div>
            </div>
          </div>

          {/* Soluções Específicas */}
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">🔧 Soluções Específicas:</h4>
            <div className="text-sm text-green-700 space-y-2">
              <p><strong>1. Se Refresh Token está vazio:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Desconectar e reconectar a conta Microsoft</li>
                <li>Verificar se o escopo <code>offline_access</code> está sendo solicitado</li>
                <li>Confirmar consentimento para refresh tokens</li>
              </ul>
              
              <p><strong>2. Se Refresh Token existe mas falha:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Verificar scope correto: <code>https://graph.microsoft.com/.default</code></li>
                <li>Verificar se interceptador está ativo</li>
                <li>Verificar se não há headers Origin</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-2 bg-blue-100 rounded">
        <p className="text-blue-700 text-sm">
          <strong>💡 Dica:</strong> Se o problema persistir após verificar todas as configurações, pode ser necessário desconectar e reconectar a conta Microsoft para obter um novo refresh token.
        </p>
      </div>
    </div>
  );
};

export default AdvancedAzureADDiagnostic;
