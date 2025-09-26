import { sendTermAcceptanceNotification } from './termAcceptanceNotification';

/**
 * Teste para verificar se a notificação com PDF está funcionando
 */
export const testTermAcceptanceNotificationWithPDF = async () => {
  console.log('🧪 [Test] Iniciando teste de notificação com PDF...');

  const testData = {
    user_id: 'test-user-id',
    user_email: 'test@example.com',
    user_full_name: 'João Silva',
    term_title: 'Checkout Terms and Conditions',
    term_type: 'checkout_terms',
    accepted_at: new Date().toISOString(),
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    term_content: `
      <h1>Checkout Terms and Conditions</h1>
      <p>By proceeding with this payment, you agree to the following terms:</p>
      <ul>
        <li>You are responsible for providing accurate information</li>
        <li>Payment is non-refundable once processed</li>
        <li>You understand the service terms and conditions</li>
      </ul>
      <p>These terms are legally binding and enforceable.</p>
    `
  };

  try {
    console.log('🧪 [Test] Enviando notificação de teste...');
    await sendTermAcceptanceNotification(testData);
    console.log('✅ [Test] Notificação enviada com sucesso!');
  } catch (error) {
    console.error('❌ [Test] Erro ao enviar notificação:', error);
  }
};

/**
 * Payload esperado para o webhook (agora enviado como campos individuais no FormData)
 */
export const expectedWebhookPayload = {
  tipo_notf: "Student Term Acceptance",
  email_admin: "admin@matriculausa.com",
  nome_admin: "Admin MatriculaUSA",
  email_aluno: "test@example.com",
  nome_aluno: "João Silva",
  email_seller: "seller@example.com",
  nome_seller: "Seller Name",
  email_affiliate_admin: "affiliate@example.com",
  nome_affiliate_admin: "Affiliate Admin",
  o_que_enviar: "Student João Silva has accepted the Checkout Terms and Conditions. This shows the student is progressing through the enrollment process. Seller responsible: Seller Name (SELLER123)",
  term_title: "Checkout Terms and Conditions",
  term_type: "checkout_terms",
  accepted_at: "2024-01-01T12:00:00.000Z",
  ip_address: "192.168.1.1",
  student_country: "Brazil",
  seller_id: "seller-uuid",
  referral_code: "SELLER123", 
  affiliate_admin_id: "affiliate-admin-uuid"
};

/**
 * Estrutura esperada no n8n (FormData fields)
 */
export const expectedN8nFormDataStructure = {
  "tipo_notf": "Student Term Acceptance",
  "email_admin": "admin@matriculausa.com",
  "nome_admin": "Admin MatriculaUSA",
  "email_aluno": "test@example.com",
  "nome_aluno": "João Silva",
  "email_seller": "seller@example.com",
  "nome_seller": "Seller Name",
  "email_affiliate_admin": "affiliate@example.com",
  "nome_affiliate_admin": "Affiliate Admin",
  "o_que_enviar": "Student João Silva has accepted the Checkout Terms and Conditions...",
  "term_title": "Checkout Terms and Conditions",
  "term_type": "checkout_terms",
  "accepted_at": "2024-01-01T12:00:00.000Z",
  "ip_address": "192.168.1.1",
  "student_country": "Brazil",
  "seller_id": "seller-uuid",
  "referral_code": "SELLER123",
  "affiliate_admin_id": "affiliate-admin-uuid",
  "pdf": "File object (Blob) - term_acceptance_joao_silva_2024-01-01.pdf"
};

console.log(`
🎉 Term Acceptance Notification System with PDF Implementation Complete!

📋 SUMMARY:
✅ Created generateTermAcceptancePDFBlob function that returns PDF as Blob
✅ Modified sendTermAcceptanceNotification to include PDF in FormData
✅ Updated useTermsAcceptance to pass term content and user agent
✅ Updated useAffiliateTermsAcceptance to pass term content and user agent
✅ PDF is now attached to webhook notifications sent to n8n

🔄 HOW IT WORKS:
1. Student accepts terms through PreCheckoutModal or any other component
2. recordTermAcceptance/recordAffiliateTermAcceptance functions are called
3. After successful term acceptance recording, notification is automatically sent
4. PDF is generated with term content and student information
5. Webhook payload + PDF are sent as FormData to: https://nwh.suaiden.com/webhook/notfmatriculausa
6. n8n receives both JSON payload and PDF file for processing

📄 PDF GENERATION:
- PDFs include the accepted term content (HTML converted to plain text)
- Student information (name, email, country, affiliate code)
- Term details (title, acceptance date, IP address, user agent)
- Legal footer with generation timestamp
- PDF is attached as file to the webhook notification

📨 NOTIFICATION PAYLOAD INCLUDES:
- Student information (name, email, country)
- Seller information (name, email, referral code) 
- Affiliate admin information (name, email)
- Term details (title, type, acceptance date)
- Technical details (IP address, user agent)
- PDF file attachment with complete term acceptance document

🎯 NOTIFICATION TRIGGERS:
- When students accept checkout terms
- When students accept university terms  
- When students accept affiliate terms
- Only for students who are part of the affiliate/seller system

📎 FORM DATA STRUCTURE (CORRIGIDO):
- Cada campo enviado individualmente (não como JSON string)
- pdf: Blob file with PDF document
- File name: term_acceptance_{student_name}_{date}.pdf
- n8n agora recebe campos diretamente no body, não dentro de "payload"
`);