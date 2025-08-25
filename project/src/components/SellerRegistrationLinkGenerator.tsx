import React, { useState, useEffect } from 'react';
import { Copy, Check, Plus, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface SellerRegistrationCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
}

const SellerRegistrationLinkGenerator: React.FC = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<SellerRegistrationCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Carregar códigos existentes
  useEffect(() => {
    if (user) {
      loadCodes();
    }
  }, [user]);

  const loadCodes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seller_registration_codes')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar códigos:', error);
        setError('Erro ao carregar códigos');
      } else {
        // Buscar contagem de uso para cada código
        const codesWithUsage = await Promise.all(
          data.map(async (code) => {
            const { count } = await supabase
              .from('seller_registrations')
              .select('*', { count: 'exact', head: true })
              .eq('registration_code', code.code);
            
            return { ...code, usage_count: count || 0 };
          })
        );
        
        setCodes(codesWithUsage);
      }
    } catch (err) {
      console.error('Erro ao carregar códigos:', err);
      setError('Erro ao carregar códigos');
    } finally {
      setLoading(false);
    }
  };

  const generateNewCode = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      // Gerar código único usando a função do banco
      const { data, error } = await supabase.rpc('generate_seller_registration_code');

      if (error) {
        console.error('Erro ao gerar código:', error);
        throw error;
      }

      if (data) {
        const newCode = data;
        
        // Inserir o código na tabela
        const { error: insertError } = await supabase
          .from('seller_registration_codes')
          .insert({
            admin_id: user.id,
            code: newCode,
            is_active: true
          });

        if (insertError) {
          console.error('Erro ao inserir código:', insertError);
          throw insertError;
        }

        // Recarregar códigos
        await loadCodes();
        setError('');
      }
    } catch (err: any) {
      console.error('Erro ao gerar código:', err);
      setError(err.message || 'Erro ao gerar código');
    } finally {
      setGenerating(false);
    }
  };

  const toggleCodeStatus = async (codeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('seller_registration_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        setError('Erro ao atualizar status');
      } else {
        // Atualizar estado local
        setCodes(prev => prev.map(code => 
          code.id === codeId ? { ...code, is_active: !currentStatus } : code
        ));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status');
    }
  };

  const deleteCode = async (codeId: string) => {
    if (!confirm('Tem certeza que deseja excluir este código? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('seller_registration_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        console.error('Erro ao excluir código:', error);
        setError('Erro ao excluir código');
      } else {
        // Remover do estado local
        setCodes(prev => prev.filter(code => code.id !== codeId));
      }
    } catch (err) {
      console.error('Erro ao excluir código:', err);
      setError('Erro ao excluir código');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar para clipboard:', err);
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const getRegistrationUrl = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/seller/register?code=${code}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Gerador de Links de Registro
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Crie códigos únicos para vendedores se registrarem
          </p>
        </div>
        <button
          onClick={generateNewCode}
          disabled={generating}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Gerando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Novo Código
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Codes List */}
      {codes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum código de registro criado ainda.</p>
          <p className="text-sm mt-1">Clique em "Novo Código" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {codes.map((code) => (
            <div
              key={code.id}
              className={`border rounded-lg p-4 ${
                code.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-lg font-semibold text-gray-900">
                      {code.code}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        code.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {code.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {code.usage_count || 0} uso{code.usage_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Criado em: {new Date(code.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(getRegistrationUrl(code.code))}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {copiedCode === getRegistrationUrl(code.code) ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar Link
                        </>
                      )}
                    </button>
                    
                    <a
                      href={getRegistrationUrl(code.code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Testar Link
                    </a>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleCodeStatus(code.id, code.is_active)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      code.is_active
                        ? 'text-orange-700 bg-orange-100 hover:bg-orange-200 focus:ring-orange-500'
                        : 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500'
                    }`}
                  >
                    {code.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  
                  <button
                    onClick={() => deleteCode(code.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Como usar:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Clique em "Novo Código" para gerar um código único</li>
          <li>Compartilhe o link gerado com vendedores</li>
          <li>Os vendedores se registram usando o código</li>
          <li>Aprove ou rejeite os registros no painel de gerenciamento</li>
        </ol>
      </div>
    </div>
  );
};

export default SellerRegistrationLinkGenerator;
