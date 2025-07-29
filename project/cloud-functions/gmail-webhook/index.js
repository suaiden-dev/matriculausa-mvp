const { PubSub } = require('@google-cloud/pubsub');
const fetch = require('node-fetch');
const { GoogleAuth } = require('google-auth-library');

// Configurações
const N8N_WEBHOOK_URL = 'https://nwh.suaiden.com/webhook/47d6d50c-46d1-4b34-9405-de321686dcbc';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Cloud Function que processa notificações do Gmail via Pub/Sub
 * e envia novos emails para o n8n
 */
exports.handleGmailNotification = async (message, context) => {
  console.log('📧 Gmail Webhook: ===== FUNCTION CALLED =====');
  console.log('📧 Message ID:', message.id);
  console.log('📧 Publish time:', message.publishTime);
  
  try {
    // Decodificar mensagem do Pub/Sub
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    console.log('📧 Decoded data:', data);
    
    // Extrair informações do email
    const emailInfo = await extractEmailInfo(data);
    if (!emailInfo) {
      console.log('❌ Não foi possível extrair informações do email');
      return;
    }
    
    console.log('📧 Email info extracted:', {
      id: emailInfo.id,
      from: emailInfo.from,
      subject: emailInfo.subject,
      snippet: emailInfo.snippet?.substring(0, 100) + '...'
    });
    
    // Enviar para n8n
    const n8nResponse = await sendToN8n(emailInfo);
    
    if (n8nResponse.success) {
      console.log('✅ Email enviado com sucesso para n8n');
    } else {
      console.error('❌ Erro ao enviar para n8n:', n8nResponse.error);
    }
    
  } catch (error) {
    console.error('❌ Erro na Cloud Function:', error);
    throw error; // Re-throw para que o Pub/Sub retry
  }
};

/**
 * Extrai informações detalhadas do email usando Gmail API
 */
async function extractEmailInfo(data) {
  try {
    // Usar Service Account para autenticação
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.readonly']
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    // Buscar detalhes do email
    const response = await fetch(`${GMAIL_API_BASE}/messages/${data.messageId}?format=full`, {
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Erro ao buscar email:', response.status, response.statusText);
      return null;
    }
    
    const emailData = await response.json();
    
    // Extrair headers importantes
    const headers = emailData.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    
    // Extrair conteúdo (plain text preferido)
    let content = '';
    if (emailData.payload?.body?.data) {
      content = Buffer.from(emailData.payload.body.data, 'base64').toString();
    } else if (emailData.payload?.parts) {
      // Buscar parte de texto simples
      const textPart = emailData.payload.parts.find(part => 
        part.mimeType === 'text/plain'
      );
      if (textPart?.body?.data) {
        content = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }
    
    return {
      id: emailData.id,
      threadId: emailData.threadId,
      from: from,
      to: to,
      subject: subject,
      date: date,
      content: content,
      snippet: emailData.snippet,
      hasAttachments: emailData.payload?.parts?.some(part => part.filename) || false
    };
    
  } catch (error) {
    console.error('❌ Erro ao extrair informações do email:', error);
    return null;
  }
}

/**
 * Envia dados do email para o n8n
 */
async function sendToN8n(emailInfo) {
  try {
    console.log('📤 ===== ENVIANDO E-MAIL PARA N8N =====');
    console.log('📤 E-mail ID:', emailInfo.id);
    console.log('📤 De:', emailInfo.from);
    console.log('📤 Assunto:', emailInfo.subject);
    console.log('📤 Endpoint n8n:', N8N_WEBHOOK_URL);
    
    // Preparar payload para n8n
    const n8nPayload = {
      from: extractEmailFromString(emailInfo.from),
      timestamp: emailInfo.date,
      content: emailInfo.content || emailInfo.snippet || "Sem conteúdo",
      subject: emailInfo.subject,
      client_id: 'gmail-webhook', // Identificador do sistema
      user_id: 'gmail-webhook',
      source: 'matricula-usa',
      university_name: 'Gmail Webhook',
      university_id: 'gmail-webhook',
      connection_email: extractEmailFromString(emailInfo.from),
      tipo_notif: 'Novo e-mail recebido via webhook',
      message_id: emailInfo.id,
      thread_id: emailInfo.threadId,
      has_attachments: emailInfo.hasAttachments
    };
    
    console.log('📤 Payload para n8n:', JSON.stringify(n8nPayload, null, 2));
    
    // Enviar para n8n
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Gmail-Webhook/1.0'
      },
      body: JSON.stringify(n8nPayload)
    });
    
    console.log('📤 Resposta do n8n:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('📤 Conteúdo da resposta:', responseText);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('❌ Erro na resposta do n8n:', errorText);
      return { success: false, error: errorText };
    }
    
  } catch (error) {
    console.error('❌ Erro ao enviar para n8n:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extrai email puro de uma string (ex: "Nome <email@domain.com>" -> "email@domain.com")
 */
function extractEmailFromString(emailString) {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = emailString.match(emailRegex);
  return match ? match[1] : emailString;
} 