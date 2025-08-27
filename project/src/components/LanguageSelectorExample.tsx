import React from 'react';
import LanguageSelector from './LanguageSelector';

const LanguageSelectorExample: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Exemplos de LanguageSelector
      </h1>
      
      <div className="space-y-8">
        {/* Header variant com opção de reset */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Header com Opção de Reset
          </h2>
          <p className="text-gray-600 mb-4">
            Este exemplo mostra o LanguageSelector no header com a opção de redefinir para o idioma do navegador.
          </p>
          <div className="flex justify-center">
            <LanguageSelector 
              variant="header" 
              showResetOption={true}
            />
          </div>
        </div>

        {/* Footer variant */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">
            Footer
          </h2>
          <p className="text-gray-300 mb-4">
            Variante para uso no footer da aplicação.
          </p>
          <div className="flex justify-center">
            <LanguageSelector 
              variant="footer" 
              showResetOption={true}
            />
          </div>
        </div>

        {/* Compact variant */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Compact
          </h2>
          <p className="text-gray-600 mb-4">
            Versão compacta para espaços limitados.
          </p>
          <div className="flex justify-center">
            <LanguageSelector 
              variant="compact" 
              showResetOption={false}
            />
          </div>
        </div>

        {/* Dashboard variant */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Dashboard
          </h2>
          <p className="text-slate-600 mb-4">
            Estilo otimizado para dashboards e painéis administrativos.
          </p>
          <div className="flex justify-center">
            <LanguageSelector 
              variant="dashboard" 
              showResetOption={true}
            />
          </div>
        </div>

        {/* Sem label */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Sem Label (Apenas Ícone e Bandeira)
          </h2>
          <p className="text-gray-600 mb-4">
            Versão minimalista sem texto, apenas com ícone e bandeira.
          </p>
          <div className="flex justify-center">
            <LanguageSelector 
              variant="header" 
              showLabel={false}
              showResetOption={true}
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Como Usar
        </h3>
        <div className="text-blue-800 space-y-2 text-sm">
          <p><strong>1.</strong> Importe o componente: <code>import LanguageSelector from './LanguageSelector'</code></p>
          <p><strong>2.</strong> Use com as props desejadas:</p>
          <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`<LanguageSelector 
  variant="header"           // header, footer, compact, dashboard
  showLabel={true}          // mostrar/esconder texto do idioma
  showResetOption={true}    // mostrar opção de reset para idioma do navegador
/>`}
          </pre>
          <p><strong>3.</strong> O idioma é detectado automaticamente na inicialização</p>
          <p><strong>4.</strong> As preferências são salvas no localStorage</p>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectorExample;
