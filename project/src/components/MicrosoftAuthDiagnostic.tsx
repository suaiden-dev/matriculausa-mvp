import React, { useState, useEffect } from 'react';
import { diagnoseAuthIssues, clearMicrosoftCache } from '../lib/utils/fetchInterceptor';

interface DiagnosticResult {
  issues: string[];
  recommendations: string[];
  status: 'healthy' | 'warning' | 'error';
}

const MicrosoftAuthDiagnostic: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostic = async () => {
    setIsLoading(true);
    
    try {
      const issues = diagnoseAuthIssues();
      const recommendations: string[] = [];
      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      // Analisar problemas e gerar recomendações
      if (issues.length === 0) {
        recommendations.push('✅ Configuração parece estar correta');
        status = 'healthy';
      } else {
        status = 'error';
        
        issues.forEach(issue => {
          if (issue.includes('VITE_AZURE_CLIENT_ID')) {
            recommendations.push('🔧 Configure VITE_AZURE_CLIENT_ID no arquivo .env');
          }
          if (issue.includes('VITE_AZURE_CLIENT_SECRET')) {
            recommendations.push('🔧 Configure VITE_AZURE_CLIENT_SECRET no arquivo .env');
            recommendations.push('📋 Crie um Client Secret no Portal do Azure AD');
          }
          if (issue.includes('Microsoft')) {
            recommendations.push('🧹 Limpe o cache Microsoft para resolver conflitos');
          }
        });
      }

      setDiagnostic({
        issues,
        recommendations,
        status
      });
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      setDiagnostic({
        issues: ['Erro ao executar diagnóstico'],
        recommendations: ['Verifique o console para mais detalhes'],
        status: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    clearMicrosoftCache();
    alert('Cache Microsoft limpo! Recarregue a página para aplicar as mudanças.');
  };

  const handleReload = () => {
    window.location.reload();
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Executando diagnóstico...</span>
        </div>
      </div>
    );
  }

  if (!diagnostic) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          🔍 Diagnóstico de Autenticação Microsoft
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={runDiagnostic}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            🔄 Reexecutar
          </button>
          <button
            onClick={handleClearCache}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
          >
            🧹 Limpar Cache Microsoft
          </button>
          <button
            onClick={handleReload}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            🔄 Recarregar
          </button>
        </div>
      </div>

      {/* Status */}
      <div className={`p-3 rounded mb-4 ${
        diagnostic.status === 'healthy' ? 'bg-green-100 text-green-800' :
        diagnostic.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
        'bg-red-100 text-red-800'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">
            {diagnostic.status === 'healthy' ? '✅' : 
             diagnostic.status === 'warning' ? '⚠️' : '❌'}
          </span>
          <span className="font-medium">
            {diagnostic.status === 'healthy' ? 'Sistema Saudável' :
             diagnostic.status === 'warning' ? 'Atenção Necessária' : 'Problemas Detectados'}
          </span>
        </div>
      </div>

      {/* Problemas */}
      {diagnostic.issues.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">🚨 Problemas Detectados:</h4>
          <ul className="list-disc list-inside space-y-1">
            {diagnostic.issues.map((issue, index) => (
              <li key={index} className="text-red-600 text-sm">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendações */}
      {diagnostic.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">💡 Recomendações:</h4>
          <ul className="list-disc list-inside space-y-1">
            {diagnostic.recommendations.map((rec, index) => (
              <li key={index} className="text-blue-600 text-sm">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Informações de Configuração */}
      <div className="bg-white p-3 rounded border">
        <h4 className="font-medium text-gray-700 mb-2">⚙️ Configuração Atual:</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Client ID:</span>
            <span className={import.meta.env.VITE_AZURE_CLIENT_ID ? 'text-green-600' : 'text-red-600'}>
              {import.meta.env.VITE_AZURE_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Client Secret:</span>
            <span className={import.meta.env.VITE_AZURE_CLIENT_SECRET ? 'text-green-600' : 'text-red-600'}>
              {import.meta.env.VITE_AZURE_CLIENT_SECRET ? '✅ Configurado' : '❌ Não configurado'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Redirect URI:</span>
            <span className="text-gray-600">
              {import.meta.env.VITE_AZURE_REDIRECT_URI || 'Usando padrão'}
            </span>
          </div>
        </div>
      </div>

      {/* Solução para AADSTS90023 */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-medium text-yellow-800 mb-2">🔧 Solução para Erro AADSTS90023:</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>1. <strong>Verifique o Portal do Azure AD:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Acesse sua aplicação no Portal do Azure</li>
            <li>Vá para "Authentication"</li>
            <li>Certifique-se de que está configurada como <strong>"Web"</strong> (não SPA)</li>
            <li>Remova URLs duplicadas entre "Web" e "Single-page application"</li>
          </ul>
          <p>2. <strong>Configure Client Secret:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Vá para "Certificados e segredos"</li>
            <li>Crie um novo "Segredo do cliente"</li>
            <li>Copie o valor e adicione ao arquivo .env</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MicrosoftAuthDiagnostic;
