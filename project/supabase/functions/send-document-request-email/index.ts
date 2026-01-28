import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      student_email,
      student_name,
      university_name,
      document_titles,
    } = await req.json();

    if (!student_email || !student_name || !university_name || !document_titles) {
      return new Response(JSON.stringify({ error: 'Dados obrigatórios ausentes.' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Monta o conteúdo do e-mail (em inglês)
    const subject = `New document request from ${university_name}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello, ${student_name}!</h2>
        <p>You have new documents requested by <strong>${university_name}</strong>.</p>
        <p><strong>Requested documents:</strong></p>
        <ul>
          ${document_titles.map((doc: string) => `<li>${doc}</li>`).join('')}
        </ul>
        <p>Please log in to your student area and upload the required files as soon as possible.</p>
        <br>
        <p style="font-size: 12px; color: #888;">Please do not reply to this email. If you have any questions, contact support through the platform.</p>
      </div>
    `;

    // Chamar a edge function consolidada de envio de email
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: student_email,
        subject: subject,
        html: htmlContent
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Error calling send-email function:', errorText);
      return new Response(JSON.stringify({ error: 'Falha ao enviar e-mail via send-email', details: errorText }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in send-document-request-email:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});