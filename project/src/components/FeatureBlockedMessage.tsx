import React from 'react';

const FeatureBlockedMessage: React.FC = () => (
  <div className="text-center py-12">
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Funcionalidade em Desenvolvimento
      </h3>
      <p className="text-gray-600 mb-4">
        Esta funcionalidade estará disponível em breve.
      </p>
      <div className="text-sm text-gray-500">
        <p>Em desenvolvimento</p>
        <p>Disponível em breve</p>
      </div>
    </div>
  </div>
);

export default FeatureBlockedMessage;
