/**
 * Funções de autenticação Parcelow
 */

import type { ParcelowConfig } from './config.ts';

/**
 * Obtém token de acesso OAuth 2.0 da Parcelow
 * @param config - Configuração Parcelow
 * @returns Access token JWT
 */
export async function getParcelowAccessToken(config: ParcelowConfig): Promise<string> {
  console.log('[Parcelow] Autenticando via OAuth 2.0...');
  
  const response = await fetch(`${config.apiBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Parcelow] ❌ Erro de autenticação:', error);
    throw new Error(`Parcelow Auth Error: ${error}`);
  }

  const data = await response.json();
  console.log('[Parcelow] ✅ Token de acesso obtido com sucesso');
  return data.access_token;
}
