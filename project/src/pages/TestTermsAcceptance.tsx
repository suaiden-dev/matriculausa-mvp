import React, { useState, useEffect } from 'react';
import { CheckTermsBeforeCheckout } from '../components/CheckTermsBeforeCheckout';
import { checkActiveTerms, createTestTerm } from '../utils/checkActiveTerms';

const TestTermsAcceptance: React.FC = () => {
  const [activeTerms, setActiveTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadActiveTerms();
  }, []);

  const loadActiveTerms = async () => {
    setLoading(true);
    const terms = await checkActiveTerms();
    setActiveTerms(terms || []);
    setLoading(false);
  };

  const handleCreateTestTerm = async () => {
    setLoading(true);
    const result = await createTestTerm();
    if (result) {
      setMessage('✅ Termo de teste criado com sucesso!');
      await loadActiveTerms();
    } else {
      setMessage('❌ Erro ao criar termo de teste');
    }
    setLoading(false);
    
    // Limpar mensagem após 3 segundos
    setTimeout(() => setMessage(''), 3000);
  };

  const handleProceed = () => {
    console.log('✅ Termos aceitos, prosseguindo...');
    alert('Termos aceitos com sucesso! Prosseguindo para o pagamento...');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Teste de Aceitação de Termos
          </h1>
          
          {/* Status dos Termos */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Status dos Termos Ativos:</h3>
            {loading ? (
              <div className="text-gray-600">Carregando...</div>
            ) : activeTerms.length > 0 ? (
              <div className="space-y-2">
                {activeTerms.map((term, index) => (
                  <div key={term.id} className="p-3 bg-green-50 rounded border border-green-200">
                    <div className="font-medium text-green-900">✅ {term.title}</div>
                    <div className="text-sm text-green-700">Versão: {term.version}</div>
                    <div className="text-sm text-green-700">
                      Criado: {new Date(term.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="text-yellow-800">⚠️ Nenhum termo ativo encontrado</div>
              </div>
            )}
          </div>

          {/* Mensagem de Status */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={loadActiveTerms}
              disabled={loading}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Carregando...' : 'Verificar Termos'}
            </button>
            
            <button
              onClick={handleCreateTestTerm}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Termo de Teste'}
            </button>
          </div>

          {/* Teste de Aceitação */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Teste de Aceitação:</h3>
            <p className="text-blue-800 mb-4">
              {activeTerms.length > 0 
                ? 'Clique no botão abaixo para testar o fluxo de aceitação de termos.'
                : 'Crie um termo de teste primeiro para poder testar a aceitação.'
              }
            </p>

            {activeTerms.length > 0 && (
              <CheckTermsBeforeCheckout onProceed={handleProceed}>
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Testar Aceitação de Termos
                </button>
              </CheckTermsBeforeCheckout>
            )}
          </div>

          {/* Instruções */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Verifique se há termos ativos no sistema</li>
              <li>Crie um termo de teste se necessário</li>
              <li>Clique em "Testar Aceitação de Termos"</li>
              <li>Se houver termos ativos, um modal será exibido</li>
              <li>Leia e aceite os termos</li>
              <li>O sistema salvará sua aceitação</li>
              <li>Você será redirecionado para o próximo passo</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTermsAcceptance;
