import React, { useState, useEffect } from 'react';
import { diagnoseAuthIssues, clearMsalInstances, getMicrosoftAuthConfig } from '../../lib/microsoftAuthConfig';
import { clearSupabaseInstances } from '../../lib/supabaseClient';

interface AuthDiagnosticProps {
  onClose: () => void;
}

export const AuthDiagnostic: React.FC<AuthDiagnosticProps> = ({ onClose }) => {
  const [issues, setIssues] = useState<string[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    const detectedIssues = diagnoseAuthIssues();
    const authConfig = getMicrosoftAuthConfig();
    
    setIssues(detectedIssues);
    setConfig(authConfig);
  }, []);

  const handleFixIssues = async () => {
    setIsFixing(true);
    
    try {
      console.log('🔧 Iniciando correção de problemas de autenticação...');
      
      // Limpar instâncias duplicadas
      clearMsalInstances();
      clearSupabaseInstances();
      
      // Limpar localStorage de autenticação
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('msal') || key.includes('azure') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      // Recarregar a página para aplicar as correções
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao corrigir problemas:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const getIssueSeverity = (issue: string): 'error' | 'warning' | 'info' => {
    if (issue.includes('não configurado') || issue.includes('required')) {
      return 'error';
    }
    if (issue.includes('detectado') || issue.includes('configurado')) {
      return 'warning';
    }
    return 'info';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              🔧 Diagnóstico de Autenticação Microsoft
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {issues.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-green-600 text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Configuração Perfeita!
              </h3>
              <p className="text-gray-600">
                Não foram detectados problemas de configuração.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  ⚠️ Problemas Detectados
                </h3>
                <p className="text-yellow-700 text-sm">
                  Os seguintes problemas podem estar causando os erros de autenticação:
                </p>
              </div>

              {issues.map((issue, index) => {
                const severity = getIssueSeverity(issue);
                return (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${getSeverityColor(severity)}`}
                  >
                    <div className="flex items-start">
                      <span className="mr-3">
                        {severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️'}
                      </span>
                      <span className="font-medium">{issue}</span>
                    </div>
                  </div>
                );
              })}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">
                  💡 Soluções Recomendadas
                </h3>
                <ul className="text-blue-700 text-sm space-y-2">
                  <li>• Verifique se as variáveis de ambiente estão configuradas corretamente</li>
                  <li>• Para aplicações Web, configure o VITE_AZURE_CLIENT_SECRET</li>
                  <li>• Para aplicações SPA, remova o VITE_AZURE_CLIENT_SECRET</li>
                  <li>• Verifique a configuração no Portal do Azure AD</li>
                </ul>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  🔍 Configuração Atual
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Client ID: {config?.clientId ? '✅ Configurado' : '❌ Não configurado'}</div>
                  <div>Client Secret: {config?.clientSecret ? '✅ Configurado' : '❌ Não configurado'}</div>
                  <div>Redirect URI: {config?.redirectUri || '❌ Não configurado'}</div>
                  <div>Tenant ID: {config?.tenantId || 'common'}</div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleFixIssues}
                  disabled={isFixing}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFixing ? '🔧 Corrigindo...' : '🔧 Corrigir Problemas'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
