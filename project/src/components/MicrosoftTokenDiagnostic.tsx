// DISABLED FOR DEVELOPMENT - Microsoft Token Diagnostic
/*
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface TokenDiagnostic {
  email_address: string;
  has_access_token: boolean;
  has_refresh_token: boolean;
  access_token_length: number;
  refresh_token_length: number;
  expires_at: string;
  created_at: string;
}

const MicrosoftTokenDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<TokenDiagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('email_address, oauth_access_token, oauth_refresh_token, oauth_token_expires_at, created_at')
        .eq('provider_type', 'microsoft')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const diagnostics: TokenDiagnostic[] = data.map((config: any) => ({
        email_address: config.email_address,
        has_access_token: !!config.oauth_access_token,
        has_refresh_token: !!config.oauth_refresh_token && config.oauth_refresh_token.length > 0,
        access_token_length: config.oauth_access_token ? config.oauth_access_token.length : 0,
        refresh_token_length: config.oauth_refresh_token ? config.oauth_refresh_token.length : 0,
        expires_at: config.oauth_token_expires_at,
        created_at: config.created_at
      }));

      setDiagnostics(diagnostics);
    } catch (err: any) {
      console.error('Erro ao buscar diagnósticos:', err.message);
      setError('Erro ao carregar diagnósticos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  if (loading) return <p>Carregando diagnósticos...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-4">🔍 Diagnóstico de Tokens Microsoft</h3>
      
      {diagnostics.length === 0 ? (
        <p>Nenhuma conta Microsoft configurada.</p>
      ) : (
        <div className="space-y-4">
          {diagnostics.map((diagnostic, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-lg mb-2">{diagnostic.email_address}</h4>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <span className="font-medium">Access Token:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    diagnostic.has_access_token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {diagnostic.has_access_token ? '✅ Presente' : '❌ Ausente'}
                  </span>
                  {diagnostic.has_access_token && (
                    <span className="text-xs text-gray-600 ml-2">
                      ({diagnostic.access_token_length} caracteres)
                    </span>
                  )}
                </div>
                
                <div>
                  <span className="font-medium">Refresh Token:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    diagnostic.has_refresh_token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {diagnostic.has_refresh_token ? '✅ Presente' : '❌ Ausente'}
                  </span>
                  {diagnostic.has_refresh_token && (
                    <span className="text-xs text-gray-600 ml-2">
                      ({diagnostic.refresh_token_length} caracteres)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>Expira em:</strong> {new Date(diagnostic.expires_at).toLocaleString()}</p>
                <p><strong>Criado em:</strong> {new Date(diagnostic.created_at).toLocaleString()}</p>
              </div>
              
              {!diagnostic.has_refresh_token && (
                <div className="mt-3 p-3 bg-yellow-100 border border-yellow-400 rounded">
                  <p className="text-yellow-800 font-medium">⚠️ Problema Identificado:</p>
                  <p className="text-yellow-700 text-sm">
                    Esta conta não possui refresh token. O sistema funcionará usando MSAL para renovação automática,
                    mas pode haver limitações em cenários específicos.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 p-3 bg-blue-100 border border-blue-400 rounded">
        <p className="text-blue-800 font-medium">💡 Informações:</p>
        <ul className="text-blue-700 text-sm list-disc list-inside mt-2">
          <li>Access Token: Necessário para acessar APIs do Microsoft Graph</li>
          <li>Refresh Token: Necessário para renovação automática sem interação do usuário</li>
          <li>Sem Refresh Token: O sistema usará MSAL para renovação, que pode exigir interação do usuário</li>
        </ul>
      </div>
    </div>
  );
};

export default MicrosoftTokenDiagnostic;
*/
