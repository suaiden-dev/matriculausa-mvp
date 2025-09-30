import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface AccountValidationProps {
  configId: string | null;
  activeConnection: any;
  connections: any[];
}

export const AccountValidation: React.FC<AccountValidationProps> = ({ 
  configId, 
  activeConnection, 
  connections 
}) => {
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  useEffect(() => {
    if (!configId) {
      setValidationStatus({
        isValid: true,
        message: 'Nenhuma conta específica selecionada - usando conta ativa',
        type: 'warning'
      });
      return;
    }

    if (!activeConnection) {
      setValidationStatus({
        isValid: false,
        message: 'Nenhuma conta Microsoft ativa encontrada',
        type: 'error'
      });
      return;
    }

    if (activeConnection.id === configId) {
      setValidationStatus({
        isValid: true,
        message: `✅ Conta correta selecionada: ${activeConnection.email_address}`,
        type: 'success'
      });
    } else {
      const targetConnection = connections.find(conn => conn.id === configId);
      if (targetConnection) {
        setValidationStatus({
          isValid: false,
          message: `⚠️ Conta incorreta selecionada. Esperada: ${targetConnection.email_address}, Atual: ${activeConnection.email_address}`,
          type: 'error'
        });
      } else {
        setValidationStatus({
          isValid: false,
          message: `❌ Conta não encontrada para ID: ${configId}`,
          type: 'error'
        });
      }
    }
  }, [configId, activeConnection, connections]);

  if (!validationStatus) return null;

  const getIcon = () => {
    switch (validationStatus.type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (validationStatus.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (validationStatus.type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className={`border rounded-lg p-3 mb-4 ${getBgColor()}`}>
      <div className="flex items-center space-x-2">
        {getIcon()}
        <span className={`text-sm font-medium ${getTextColor()}`}>
          {validationStatus.message}
        </span>
      </div>
      
      {configId && (
        <div className="mt-2 text-xs text-gray-600">
          <div>Config ID: {configId}</div>
          <div>Conta Ativa: {activeConnection?.email_address || 'Nenhuma'}</div>
          <div>Total de Conexões: {connections.length}</div>
        </div>
      )}
    </div>
  );
};
