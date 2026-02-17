import { EligibleUser, Campaign } from './types.ts';
import { n8nUrl } from './constants.ts';

/**
 * Envia email via webhook n8n
 */
export async function sendEmailViaN8n(
  user: EligibleUser,
  campaign: Campaign,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    const payload = {
      tipo_notf: 'Newsletter Campaign',
      campaign_key: campaign.campaign_key,
      email_aluno: user.email,
      nome_aluno: user.full_name,
      subject: subject,
      html_body: htmlBody,
      unsubscribe_url: htmlBody.match(/href="([^"]*unsubscribe[^"]*)"/)?.[1] || ''
    };

    console.log(`[Newsletter] Enviando email para ${user.email} (campanha: ${campaign.campaign_key})`);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MatriculaUSA-Newsletter/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Newsletter] Erro ao enviar email para ${user.email}:`, response.status, errorText);
      return false;
    }

    console.log(`[Newsletter] Email enviado com sucesso para ${user.email}`);
    return true;
  } catch (error) {
    console.error(`[Newsletter] Erro ao enviar email para ${user.email}:`, error);
    return false;
  }
}
