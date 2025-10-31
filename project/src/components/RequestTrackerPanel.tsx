import React, { useEffect, useState } from 'react';
import { requestTracker } from '../lib/requestTracker';
import { activateSupabaseInterceptor, deactivateSupabaseInterceptor } from '../lib/supabaseRequestInterceptor';

// Debug: garantir que o componente seja importado
console.log('🔍 [RequestTrackerPanel] Módulo carregado');

export function RequestTrackerPanel() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [report, setReport] = useState<any>(null);

  // Debug: verificar se o componente está sendo renderizado
  React.useEffect(() => {
    console.log('🔍 [RequestTrackerPanel] Componente renderizado');
  }, []);

  useEffect(() => {
    if (isEnabled) {
      // Ativar interceptor global que captura desde o início
      activateSupabaseInterceptor();
      // Habilitar tracker
      requestTracker.enable();
      // Salvar preferência para auto-ativar na próxima vez
      localStorage.setItem('requestTracker:autoActivate', 'true');
    } else {
      // Desabilitar tracker, mas manter interceptor ativo para não perder dados
      requestTracker.disable();
      localStorage.setItem('requestTracker:autoActivate', 'false');
    }
  }, [isEnabled]);

  const updateReport = () => {
    const newReport = requestTracker.getReport();
    setReport(newReport);
  };

  useEffect(() => {
    if (!isEnabled) return;
    
    const interval = setInterval(updateReport, 1000);
    return () => clearInterval(interval);
  }, [isEnabled]);

  const handleExport = () => {
    requestTracker.exportReport();
  };

  const handleClear = () => {
    requestTracker.clear();
    updateReport();
  };

  const handleReloadAndCapture = () => {
    // Salvar preferência para auto-ativar após reload
    localStorage.setItem('requestTracker:autoActivate', 'true');
    // Recarregar a página
    window.location.reload();
  };

  // Sempre mostrar o painel, mesmo quando desabilitado
  return (
    <div 
      className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 w-[400px] max-h-[600px] overflow-y-auto"
      style={{ zIndex: 99999 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">🔍 Request Tracker</h3>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Ativar</span>
          </label>
          {isEnabled && (
            <>
              <button
                onClick={handleClear}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Limpar
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
              >
                Exportar
              </button>
              <button
                onClick={handleReloadAndCapture}
                className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded"
                title="Recarrega a página e captura todas as requisições desde o início"
              >
                🔄 Recarregar e Capturar
              </button>
            </>
          )}
          {!isEnabled && (
            <button
              onClick={() => {
                setIsEnabled(true);
                handleReloadAndCapture();
              }}
              className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded"
              title="Ativa e recarrega a página para capturar desde o início"
            >
              🔄 Ativar e Recarregar
            </button>
          )}
        </div>
      </div>

      {report && report.summary && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-gray-50 rounded p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Total de Requests:</span>
                <span className="ml-2 text-blue-600 font-bold">{report.summary.totalRequests}</span>
              </div>
              <div>
                <span className="font-medium">Tempo Total:</span>
                <span className="ml-2 text-blue-600 font-bold">{(report.summary.totalTime / 1000).toFixed(2)}s</span>
              </div>
            </div>
          </div>

          {/* Por Operação */}
          {report.summary.byOperation && Object.keys(report.summary.byOperation).length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Por Operação:</h4>
              <div className="text-xs space-y-1">
                {Object.entries(report.summary.byOperation).map(([op, count]) => (
                  <div key={op} className="flex justify-between">
                    <span>{op}:</span>
                    <span className="font-medium">{String(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Por Função RPC */}
          {report.summary.byFunction && Object.keys(report.summary.byFunction).length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Por Função RPC:</h4>
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(report.summary.byFunction)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([func, count]) => (
                    <div key={func} className="flex justify-between">
                      <span className="text-gray-700">{func}:</span>
                      <span className={`font-medium ${(count as number) > 50 ? 'text-red-600' : 'text-gray-900'}`}>
                        {String(count)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Por Tabela */}
          {report.summary.byTable && Object.keys(report.summary.byTable).length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Por Tabela:</h4>
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(report.summary.byTable)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([table, count]) => (
                    <div key={table} className="flex justify-between">
                      <span className="text-gray-700">{table}:</span>
                      <span className={`font-medium ${(count as number) > 50 ? 'text-red-600' : 'text-gray-900'}`}>
                        {String(count)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Padrões N+1 */}
          {report.summary.nPlusOnePatterns && report.summary.nPlusOnePatterns.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <h4 className="font-semibold text-sm text-red-800 mb-2">⚠️ Padrões N+1 Detectados:</h4>
              <ul className="text-xs text-red-700 space-y-1">
                {report.summary.nPlusOnePatterns.map((pattern: string, idx: number) => (
                  <li key={idx}>• {pattern}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Top Requisições Lentas */}
          {report.topSlowRequests && report.topSlowRequests.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Top Requisições Lentas (&gt;200ms):</h4>
              <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                {report.topSlowRequests.slice(0, 10).map((req: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-700">
                      {req.function || req.table || 'unknown'}:
                    </span>
                    <span className="font-medium text-red-600">{req.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!report && isEnabled && (
        <div className="text-sm text-gray-500 text-center py-4">
          Aguardando requisições...
        </div>
      )}

      {!isEnabled && !report && (
        <div className="text-sm text-gray-500 text-center py-4">
          <p className="mb-2">Marque "Ativar" para começar a mapear requisições</p>
          <p className="text-xs text-gray-400">Isso ajudará a identificar problemas N+1 e requisições lentas</p>
        </div>
      )}
    </div>
  );
}

