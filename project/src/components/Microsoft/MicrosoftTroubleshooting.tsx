import React, { useState } from 'react';

export const MicrosoftTroubleshooting: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const commonIssues = [
    {
      title: "Popup foi fechado prematuramente",
      solution: "Certifique-se de que os popups estão habilitados no seu navegador para este site. Clique no ícone de popup na barra de endereços e permita popups."
    },
    {
      title: "Erro de autenticação",
      solution: "Tente fazer logout da sua conta Microsoft no navegador e tente novamente. Vá para account.microsoft.com e faça logout de todas as sessões."
    },
    {
      title: "Página não carrega no popup",
      solution: "Verifique sua conexão com a internet. Se o problema persistir, tente usar um navegador diferente ou modo incógnito."
    },
    {
      title: "Permissões não concedidas",
      solution: "Durante o processo de login, certifique-se de aceitar todas as permissões solicitadas, incluindo acesso aos emails."
    }
  ];

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
      >
        {isOpen ? 'Ocultar' : 'Mostrar'} solução de problemas
      </button>
      
      {isOpen && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">Problemas comuns e soluções:</h4>
          <div className="space-y-3">
            {commonIssues.map((issue, index) => (
              <div key={index} className="text-xs">
                <p className="font-medium text-gray-700">{issue.title}</p>
                <p className="text-gray-600 mt-1">{issue.solution}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Dica:</strong> Se você criou uma nova conta Microsoft, certifique-se de que ela está totalmente verificada 
              e que você aceitou os termos de serviço antes de tentar conectar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
