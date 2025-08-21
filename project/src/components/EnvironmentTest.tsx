import React from 'react';
import { useEnvironment } from '../hooks/useEnvironment';

const EnvironmentTest: React.FC = () => {
  const { isProduction, isDevelopment } = useEnvironment();
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">Teste de Ambiente</h3>
      <div className="space-y-2 text-sm">
        <p><strong>Hostname:</strong> {window.location.hostname}</p>
        <p><strong>Produção:</strong> {isProduction ? '✅ Sim' : '❌ Não'}</p>
        <p><strong>Desenvolvimento:</strong> {isDevelopment ? '✅ Sim' : '❌ Não'}</p>
        <p><strong>URL Completa:</strong> {window.location.href}</p>
      </div>
    </div>
  );
};

export default EnvironmentTest;
