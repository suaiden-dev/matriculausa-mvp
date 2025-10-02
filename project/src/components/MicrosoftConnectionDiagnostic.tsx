import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { diagnoseAzureAdConfiguration, generateResolutionInstructions, isAADSTS9002326Error } from '../lib/utils/azureAdDiagnostic';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  solution?: string;
}

export const MicrosoftConnectionDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // Teste 1: Verificar se MSAL está disponível
    try {
      const msalInstance = (window as any).msalInstance;
      if (msalInstance) {
        results.push({
          test: 'MSAL Instance',
          status: 'pass',
          message: 'Instância MSAL encontrada'
        });
      } else {
        results.push({
          test: 'MSAL Instance',
          status: 'fail',
          message: 'Instância MSAL não encontrada',
          solution: 'Reinicie a aplicação ou faça login novamente'
        });
      }
    } catch (error) {
      results.push({
        test: 'MSAL Instance',
        status: 'fail',
        message: 'Erro ao verificar MSAL',
        solution: 'Reinicie a aplicação'
      });
    }

    // Teste 2: Verificar contas MSAL
    try {
      const msalInstance = (window as any).msalInstance;
      if (msalInstance) {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          results.push({
            test: 'MSAL Accounts',
            status: 'pass',
            message: `${accounts.length} conta(s) encontrada(s)`
          });
        } else {
          results.push({
            test: 'MSAL Accounts',
            status: 'warning',
            message: 'Nenhuma conta MSAL encontrada',
            solution: 'Faça login com sua conta Microsoft'
          });
        }
      }
    } catch (error) {
      results.push({
        test: 'MSAL Accounts',
        status: 'fail',
        message: 'Erro ao verificar contas MSAL'
      });
    }

    // Teste 3: Verificar configuração Azure AD
    try {
      const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
      if (clientId) {
        results.push({
          test: 'Azure AD Config',
          status: 'pass',
          message: 'Client ID configurado'
        });
      } else {
        results.push({
          test: 'Azure AD Config',
          status: 'fail',
          message: 'Client ID não encontrado',
          solution: 'Verifique as variáveis de ambiente'
        });
      }
    } catch (error) {
      results.push({
        test: 'Azure AD Config',
        status: 'fail',
        message: 'Erro ao verificar configuração'
      });
    }

    // Teste 4: Verificar headers Origin
    try {
      const hasOriginHeader = document.querySelector('meta[name="origin"]');
      if (hasOriginHeader) {
        results.push({
          test: 'Origin Headers',
          status: 'warning',
          message: 'Headers Origin detectados',
          solution: 'Headers Origin podem causar erro AADSTS90023'
        });
      } else {
        results.push({
          test: 'Origin Headers',
          status: 'pass',
          message: 'Nenhum header Origin problemático detectado'
        });
      }
    } catch (error) {
      results.push({
        test: 'Origin Headers',
        status: 'fail',
        message: 'Erro ao verificar headers'
      });
    }

    // Teste 5: Verificar localStorage
    try {
      const msalKeys = Object.keys(localStorage).filter(key => key.includes('msal'));
      if (msalKeys.length > 0) {
        results.push({
          test: 'MSAL Cache',
          status: 'pass',
          message: `${msalKeys.length} item(s) de cache encontrado(s)`
        });
      } else {
        results.push({
          test: 'MSAL Cache',
          status: 'warning',
          message: 'Nenhum cache MSAL encontrado',
          solution: 'Faça login para criar cache'
        });
      }
    } catch (error) {
      results.push({
        test: 'MSAL Cache',
        status: 'fail',
        message: 'Erro ao verificar cache'
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'fail':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Diagnóstico de Conexão Microsoft
        </h3>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Executando...' : 'Executar Diagnóstico'}
        </button>
      </div>

      <div className="space-y-3">
        {diagnostics.map((diagnostic, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getStatusColor(diagnostic.status)}`}
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(diagnostic.status)}
              <div className="flex-1">
                <h4 className="font-medium">{diagnostic.test}</h4>
                <p className="text-sm mt-1">{diagnostic.message}</p>
                {diagnostic.solution && (
                  <p className="text-sm mt-2 font-medium">
                    💡 {diagnostic.solution}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {diagnostics.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Dicas de Solução:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Se MSAL não estiver funcionando, tente limpar o cache do navegador</li>
            <li>• Para erro AADSTS90023, verifique se a aplicação está registrada como SPA no Azure AD</li>
            <li>• Headers Origin podem causar problemas - use apenas MSAL para SPA</li>
            <li>• Se persistir, contate o administrador do sistema</li>
          </ul>
        </div>
      )}

      {/* Diagnóstico Azure AD Específico */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
          🔧 Diagnóstico Azure AD
          <a 
            href="https://www.codemonday.com/blogs/aadsts9002326-cross-origin-token-redemption-is-permitted-only-for-the-single-page-application-client-type-request-origin-http-localhost-3000"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-600 hover:text-yellow-800"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </h4>
        <div className="text-sm text-yellow-800 space-y-2">
          <p><strong>Problema Comum:</strong> URLs duplicadas entre tipos de aplicação no Azure AD</p>
          <p><strong>Solução:</strong> Remover URLs duplicadas entre "Web" e "Single-page application"</p>
          <div className="mt-3">
            <button
              onClick={() => {
                const instructions = generateResolutionInstructions();
                alert(instructions.join('\n'));
              }}
              className="text-xs bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded border border-yellow-300"
            >
              Ver Instruções Detalhadas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicrosoftConnectionDiagnostic;
