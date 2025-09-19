import React from 'react';

interface MicrosoftAuthFeedbackProps {
  loading: boolean;
  error: string | null;
  onClearError: () => void;
}

export const MicrosoftAuthFeedback: React.FC<MicrosoftAuthFeedbackProps> = ({
  loading,
  error,
  onClearError
}) => {
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Conectando com Microsoft</h4>
            <p className="text-xs text-blue-600 mt-1">
              Aguarde enquanto configuramos sua conexão. Uma janela de popup será aberta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h4 className="text-sm font-medium text-red-800">Erro na conexão</h4>
            <p className="text-xs text-red-600 mt-1">{error}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={onClearError}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
