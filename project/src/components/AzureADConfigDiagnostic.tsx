import React, { useState } from 'react';

const AzureADConfigDiagnostic: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  const currentOrigin = window.location.origin;
  const hasClientSecret = !!import.meta.env.VITE_AZURE_CLIENT_SECRET;
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-red-800">
          🚨 Diagnóstico Azure AD - Erro AADSTS90023
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          {showDetails ? 'Ocultar' : 'Ver Detalhes'}
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">🔍</span>
          <span className="font-medium text-red-700">Problema Mais Provável:</span>
        </div>
        <p className="text-red-600 text-sm ml-6">
          <strong>URLs duplicadas no Azure AD Portal</strong> entre configurações "Web" e "Single-page application"
        </p>
      </div>

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
              <div className="flex justify-between">
                <span>Tipo Recomendado:</span>
                <span className={hasClientSecret ? 'text-green-600' : 'text-blue-600'}>
                  {hasClientSecret ? 'Web App' : 'SPA'}
                </span>
              </div>
            </div>
          </div>

          {/* Instruções Específicas */}
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">🔧 Solução para AADSTS90023:</h4>
            <div className="text-sm text-yellow-700 space-y-2">
              <p><strong>1. Acesse o Portal do Azure AD:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Vá para sua aplicação</li>
                <li>Clique em "Authentication"</li>
                <li>Verifique as seções "Web" e "Single-page application"</li>
              </ul>
              
              <p><strong>2. Verifique URLs duplicadas:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Procure por <code className="bg-yellow-100 px-1 rounded">{currentOrigin}/microsoft-email</code></li>
                <li>Se estiver em AMBOS os tipos, remova de um deles</li>
                <li>Mantenha apenas no tipo correto</li>
              </ul>

              <p><strong>3. Configuração Correta:</strong></p>
              <div className="bg-white p-2 rounded border ml-4">
                {hasClientSecret ? (
                  <div>
                    <p className="font-medium text-green-700">✅ Web App (com client_secret):</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Tipo: <strong>Web</strong></li>
                      <li>URLs: Apenas em "Web"</li>
                      <li>Client Secret: Configurado</li>
                      <li>Concessão Implícita: Tokens de acesso + Tokens de ID</li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-blue-700">✅ SPA (sem client_secret):</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Tipo: <strong>Single-page application</strong></li>
                      <li>URLs: Apenas em "SPA"</li>
                      <li>Client Secret: NÃO configurado</li>
                      <li>Concessão Implícita: Tokens de acesso + Tokens de ID</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* URLs que devem estar configuradas */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">📋 URLs que devem estar configuradas:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Para Produção:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>https://staging-matriculausa.netlify.app/microsoft-email</code></li>
                <li><code>https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-auth-callback</code></li>
              </ul>
              
              <p><strong>Para Desenvolvimento:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>http://localhost:5173/microsoft-email</code></li>
                <li><code>http://localhost:8888/microsoft-email</code></li>
              </ul>
            </div>
          </div>

          {/* Ação Imediata */}
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">🚀 Ação Imediata:</h4>
            <div className="text-sm text-green-700 space-y-2">
              <p><strong>1. Verifique no Azure AD Portal:</strong></p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Acesse sua aplicação no Portal do Azure</li>
                <li>Vá para "Authentication"</li>
                <li>Verifique se <code>{currentOrigin}/microsoft-email</code> está em AMBOS os tipos</li>
                <li>Se estiver, remova de um deles (mantenha apenas no tipo correto)</li>
              </ol>
              
              <p><strong>2. Teste novamente:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Recarregue a página</li>
                <li>Tente conectar novamente</li>
                <li>Verifique se o erro AADSTS90023 desapareceu</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-2 bg-red-100 rounded">
        <p className="text-red-700 text-sm">
          <strong>💡 Dica:</strong> O erro AADSTS90023 geralmente acontece quando a mesma URL está configurada em múltiplos tipos de aplicação no Azure AD Portal.
        </p>
      </div>
    </div>
  );
};

export default AzureADConfigDiagnostic;
