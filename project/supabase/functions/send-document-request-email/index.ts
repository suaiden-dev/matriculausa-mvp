// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Configurações do MailerSend
const mailerSendApiKey = 'mlsn.b2e23b41cf2afd47427c4cd02eb718ca04baaa4e18b2b4ef835ff1f88f4c93b8'; // Troque para variável de ambiente em produção
const mailerSendUrl = 'https://api.mailersend.com/v1/email';
const fromEmail = 'support@matriculausa.com';
const fromName = 'Matrícula USA';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const {
      student_id,
      student_email,
      student_name,
      university_name,
      document_titles,
      application_id
    } = await req.json();

    if (!student_email || !student_name || !university_name || !document_titles) {
      return new Response(JSON.stringify({ error: 'Dados obrigatórios ausentes.' }), { status: 400 });
    }

    // Monta o conteúdo do e-mail (em inglês)
    const subject = `New document request from ${university_name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello, ${student_name}!</h2>
        <p>You have new documents requested by <strong>${university_name}</strong>.</p>
        <p><strong>Requested documents:</strong></p>
        <ul>
          ${document_titles.map((doc) => `<li>${doc}</li>`).join('')}
        </ul>
        <p>Please log in to your student area and upload the required files as soon as possible.</p>
        <br>
        <p style="font-size: 12px; color: #888;">Please do not reply to this email. If you have any questions, contact support through the platform.</p>
      </div>
    `;

    // Envia o e-mail via MailerSend
    const response = await fetch(mailerSendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailerSendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: student_email, name: student_name }],
        subject,
        html: htmlContent,
      }),
    });

    if (response.status !== 202) {
      const result = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: 'Falha ao enviar e-mail', details: result }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}); 