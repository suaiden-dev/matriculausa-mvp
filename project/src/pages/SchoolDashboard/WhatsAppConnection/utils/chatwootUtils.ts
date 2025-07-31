import { ChatwootPayload } from '../types';
import { generateChatwootPassword } from '../../../../lib/chatwootUtils';

export const createChatwootAccount = async (
  user: any,
  instanceName: string,
  agentId?: string
): Promise<any> => {
  const chatwootPassword = generateChatwootPassword(user.email, user.id);
  const chatwootPayload: ChatwootPayload = {
    user_name: (user as any).user_metadata?.name || user.email,
    user_id: user.id,
    instance_name: instanceName,
    email: user.email,
    password: chatwootPassword,
    plan: 'Basic',
    agents_count: 1,
    agent_id: agentId
  };

  const response = await fetch('https://nwh.suaiden.com/webhook/wootchat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(chatwootPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro no webhook do Chatwoot: ${response.status} - ${errorText}`);
  }

  const result = await response.text();
  let chatwootData = null;

  try {
    chatwootData = result ? JSON.parse(result) : null;
  } catch (e) {
    console.error('Erro ao fazer parse da resposta do Chatwoot:', e);
  }

  return {
    chatwootData,
    chatwootPassword
  };
};

export const extractChatwootData = (chatwootData: any) => {
  const accountId = chatwootData.id_chatwoot || chatwootData.account_id || chatwootData.chatwoot_account_id || chatwootData.id;
  const userId = chatwootData.user_id_chatwoot || chatwootData.user_id || chatwootData.chatwoot_user_id;
  const userName = chatwootData.chatwoot_user_name || chatwootData.user_name;
  const accessToken = chatwootData.chatwoot_access_token || chatwootData.access_token;

  return {
    accountId,
    userId,
    userName,
    accessToken
  };
};