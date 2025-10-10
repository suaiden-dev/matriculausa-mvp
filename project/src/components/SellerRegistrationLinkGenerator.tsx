import React, { useState, useEffect } from 'react';
import { Copy, Check, Plus, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useAffiliateAdminId } from '../hooks/useAffiliateAdminId';

interface SellerRegistrationCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
}

const SellerRegistrationLinkGenerator: React.FC = () => {
  const { user } = useAuth();
  const { affiliateAdminId, loading: affiliateAdminLoading, error: affiliateAdminError } = useAffiliateAdminId();
  const [codes, setCodes] = useState<SellerRegistrationCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Carregar códigos existentes apenas uma vez
  useEffect(() => {
    console.log('🔄 SellerRegistrationLinkGenerator useEffect triggered', { 
      user: user?.id, 
      affiliateAdminId, 
      hasLoaded,
      affiliateAdminLoading 
    });
    if (user && affiliateAdminId && !hasLoaded && !affiliateAdminLoading) {
      console.log('🔄 Loading codes for affiliate admin:', affiliateAdminId);
      loadCodes();
    }
  }, [user?.id, affiliateAdminId, hasLoaded, affiliateAdminLoading]); // Depender do affiliateAdminId

  const loadCodes = async () => {
    if (!affiliateAdminId) {
      console.log('⚠️ No affiliate admin ID available');
      return;
    }

    // Se já temos códigos carregados, não recarregar
    if (codes.length > 0 && hasLoaded) {
      console.log('⚠️ Skipping loadCodes - already have codes data');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seller_registration_codes')
        .select('*')
        .eq('admin_id', affiliateAdminId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading codes:', error);
        setError('Error loading codes');
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
        setHasLoaded(true); // Marcar que os dados foram carregados
      }
    } catch (err) {
      console.error('Error loading codes:', err);
      setError('Error loading codes');
    } finally {
      setLoading(false);
    }
  };

  const generateNewCode = async () => {
    if (!affiliateAdminId) {
      console.log('⚠️ No affiliate admin ID available for code generation');
      return;
    }

    setGenerating(true);
    try {
      // Usar a nova função que verifica se já existe código ativo
      const { data, error } = await supabase.rpc('create_seller_registration_code', {
        admin_id_param: affiliateAdminId
      });

      if (error) {
        console.error('Error generating code:', error);
        setError(error.message);
      } else {
        // Recarregar códigos
        await loadCodes();
        setError('');
      }
    } catch (err: any) {
      console.error('Error generating code:', err);
      setError(err.message || 'Error generating code');
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
        console.error('Error updating status:', error);
        setError('Error updating status');
      } else {
        // Atualizar estado local
        setCodes(prev => prev.map(code => 
          code.id === codeId ? { ...code, is_active: !currentStatus } : code
        ));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Error updating status');
    }
  };

  const deleteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this code? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('seller_registration_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        console.error('Error deleting code:', error);
        setError('Error deleting code');
      } else {
        // Remover do estado local
        setCodes(prev => prev.filter(code => code.id !== codeId));
      }
    } catch (err) {
      console.error('Error deleting code:', err);
      setError('Error deleting code');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
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

  // Mostrar loading se ainda estiver carregando o affiliate admin ID
  if (affiliateAdminLoading || loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mostrar erro se não conseguir encontrar o affiliate admin ID
  if (affiliateAdminError || !affiliateAdminId) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Erro ao carregar dados do administrador</p>
          <p className="text-sm text-gray-500">
            {affiliateAdminError || 'Usuário não é um administrador de afiliados'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Registration Link Generator
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Create unique codes for sellers to register
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* New Code Button */}
      {!codes.some(code => code.is_active) && (
        <div className="mb-4">
          <button
            onClick={generateNewCode}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                New Code
              </>
            )}
          </button>
        </div>
      )}

      {/* Codes List */}
      {codes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No registration codes created yet.</p>
          <p className="text-sm mt-1">Click "New Code" to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {codes.map((code) => (
            <div key={code.id} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-4">
                <span className="font-mono text-lg font-medium text-gray-900">
                  {code.code}
                </span>
              </div>
              
              <div className="mb-4">
                <span className="text-sm text-gray-500">
                  Created on: {new Date(code.created_at).toLocaleDateString('en-US')}
                </span>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">Registration link:</div>
                <div className="font-mono text-sm overflow-x-auto text-gray-800 bg-gray-50 p-3 rounded border">
                  {getRegistrationUrl(code.code)}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(getRegistrationUrl(code.code))}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  {copiedCode === getRegistrationUrl(code.code) ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How to use:</h4>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Click "New Code" to generate a unique code</li>
          <li>Share the generated link with sellers</li>
          <li>Sellers register using the code</li>
          <li>Approve or reject registrations in the management panel</li>
        </ol>
      </div>
    </div>
  );
};

export default SellerRegistrationLinkGenerator; 
