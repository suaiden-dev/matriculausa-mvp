import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Validação das variáveis de ambiente obrigatórias
console.log('🔧 ===== VERIFICANDO VARIÁVEIS DE AMBIENTE =====');

const mailerSendApiKey = Deno.env.get('MAILERSEND_API_KEY');
console.log('🔑 MAILERSEND_API_KEY configurada:', !!mailerSendApiKey);
if (!mailerSendApiKey) {
  console.log('❌ MAILERSEND_API_KEY não encontrada!');
  throw new Error('Missing required environment variable: MAILERSEND_API_KEY');
}

// Configurações do MailerSend com fallbacks
const mailerSendUrl = Deno.env.get('MAILERSEND_URL') || 'https://api.mailersend.com/v1/email';
const fromEmail = Deno.env.get('FROM_EMAIL') || 'support@matriculausa.com';
const fromName = Deno.env.get('FROM_NAME') || 'Matrícula USA';

console.log('🌐 MAILERSEND_URL:', mailerSendUrl);
console.log('📧 FROM_EMAIL:', fromEmail);
console.log('📛 FROM_NAME:', fromName);

// Verificar outras variáveis importantes
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('🔑 SUPABASE_URL configurada:', !!supabaseUrl);
console.log('🔑 SUPABASE_SERVICE_ROLE_KEY configurada:', !!supabaseKey);

console.log('✅ ===== VARIÁVEIS DE AMBIENTE VERIFICADAS =====');

// Headers CORS
function corsHeaders(origin: string | null) {
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    };
  }
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  
  try {
    console.log('🚀 ===== INICIANDO EDGE FUNCTION notify-university-discount-redemption =====');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌐 Origin:', origin);
    console.log('📡 Método:', req.method);
    console.log('🔗 URL:', req.url);
    console.log('📋 Headers:', Object.fromEntries(req.headers.entries()));
    
    if (req.method === 'OPTIONS') {
      console.log('✅ OPTIONS recebido, respondendo CORS');
      return new Response('ok', { status: 200, headers: corsHeaders(origin) });
    }

    if (req.method !== 'POST') {
      console.log('❌ Método não permitido:', req.method);
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
    }

    let body: any;
    try {
      body = await req.json();
      console.log('📦 ===== BODY RECEBIDO =====');
      console.log('📋 Body JSON:', JSON.stringify(body, null, 2));
      console.log('📏 Tamanho do body:', JSON.stringify(body).length, 'caracteres');
    } catch (e) {
      console.log('❌ ===== ERRO AO PARSEAR JSON =====');
      console.log('💥 Erro:', e);
      console.log('📄 Body raw:', await req.text());
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders(origin) });
    }

    const { 
      student_id, 
      student_name, 
      student_email, 
      university_id, 
      university_name, 
      university_email, 
      discount_amount, 
      discount_type, 
      cost_coins,
      redemption_id 
    } = body;

    // Validação dos campos obrigatórios
    console.log('🔍 ===== VALIDANDO CAMPOS OBRIGATÓRIOS =====');
    console.log('👤 Student ID:', student_id ? '✅ Presente' : '❌ Ausente');
    console.log('📛 Student Name:', student_name ? '✅ Presente' : '❌ Ausente');
    console.log('🏫 University ID:', university_id ? '✅ Presente' : '❌ Ausente');
    console.log('🏛️ University Name:', university_name ? '✅ Presente' : '❌ Ausente');
    console.log('💰 Discount Amount:', discount_amount ? '✅ Presente' : '❌ Ausente');
    console.log('🆔 Redemption ID:', redemption_id ? '✅ Presente' : '❌ Ausente');
    
    if (!student_id || !student_name || !university_id || !university_name || !discount_amount || !redemption_id) {
      console.log('❌ ===== CAMPOS OBRIGATÓRIOS AUSENTES =====');
      console.log('📋 Campos faltando:', { student_id, student_name, university_id, university_name, discount_amount, redemption_id });
      return new Response('Campos obrigatórios ausentes', { status: 400, headers: corsHeaders(origin) });
    }
    
    console.log('✅ Todos os campos obrigatórios estão presentes!');

    // Se não tiver email da universidade, buscar no banco
    console.log('📧 ===== BUSCANDO EMAIL DA UNIVERSIDADE =====');
    console.log('📮 Email fornecido:', university_email || 'Nenhum fornecido');
    
    let finalUniversityEmail = university_email;
    if (!finalUniversityEmail) {
      console.log('🔍 Email não fornecido, buscando no banco de dados...');
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        console.log('🔑 Supabase URL configurada:', !!supabaseUrl);
        console.log('🔑 Supabase Key configurada:', !!supabaseKey);
        
        if (!supabaseUrl || !supabaseKey) {
          console.log('❌ Variáveis de ambiente do Supabase não configuradas!');
          throw new Error('Supabase environment variables not configured');
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Cliente Supabase criado com sucesso');

        const { data: universityData, error: universityError } = await supabase
          .from('universities')
          .select('contact')
          .eq('id', university_id)
          .single();

        if (universityError) {
          console.log('❌ Erro ao buscar email da universidade:', universityError);
        } else if (universityData?.contact) {
          finalUniversityEmail = universityData.contact.admissionsEmail || universityData.contact.email;
          console.log('✅ Email da universidade encontrado no banco:', finalUniversityEmail);
        } else {
          console.log('⚠️ Dados de contato da universidade não encontrados');
        }
      } catch (error) {
        console.log('💥 Erro ao buscar dados da universidade:', error);
      }
    } else {
      console.log('✅ Usando email fornecido:', finalUniversityEmail);
    }

    // Se ainda não tiver email, usar email padrão
    if (!finalUniversityEmail) {
      console.log('🔧 Gerando email padrão para universidade...');
      finalUniversityEmail = 'admissions@' + university_name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.edu';
      console.log('📧 Email padrão gerado:', finalUniversityEmail);
    }
    
    console.log('🎯 ===== EMAIL FINAL SELECIONADO =====');
    console.log('📮 Email final para envio:', finalUniversityEmail);

    // Montar conteúdo do email
    console.log('📝 ===== MONTANDO CONTEÚDO DO EMAIL =====');
    const subject = `New Tuition Discount Redemption - ${student_name}`;
    console.log('📧 Assunto do email:', subject);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>New Tuition Discount Redemption</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; }
          .wrapper { max-width: 600px; margin: 0 auto; background-color: #fff; }
          .header { background-color: #0052cc; padding: 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 20px; }
          .footer { padding: 15px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #777; }
          .highlight { background-color: #e8f4fd; padding: 15px; border-left: 4px solid #0052cc; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .info-label { font-weight: bold; color: #555; }
          .info-value { color: #333; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1>🎓 New Tuition Discount Redemption</h1>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            
            <p>A student has successfully redeemed a tuition discount for your university.</p>
            
            <div class="highlight">
              <div class="info-row">
                <span class="info-label">Student Name:</span>
                <span class="info-value">${student_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Student Email:</span>
                <span class="info-value">${student_email || 'Not provided'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Discount Amount:</span>
                <span class="info-value">$${discount_amount}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Discount Type:</span>
                <span class="info-value">${discount_type || 'Tuition Discount'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Coins Spent:</span>
                <span class="info-value">${cost_coins} Matricula Coins</span>
              </div>
              <div class="info-row">
                <span class="info-label">Redemption ID:</span>
                <span class="info-value">${redemption_id}</span>
              </div>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review this redemption in your university dashboard</li>
              <li>Confirm the discount application when the student applies</li>
              <li>Contact the student if additional information is needed</li>
            </ul>
            
            <p>This discount will be applied to the student's tuition when they complete their enrollment process.</p>
            
            <p><strong>Please do not reply to this email.</strong> If you have questions, please contact our support team through the platform.</p>
          </div>
          
          <div class="footer">
            You are receiving this message because your university participates in the Matrícula USA rewards program.<br>
            © 2025 Matrícula USA. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📤 ===== ENVIANDO NOTIFICAÇÃO PARA UNIVERSIDADE =====');
    console.log('📮 Para:', finalUniversityEmail);
    console.log('📧 Assunto:', subject);
    console.log('👤 Aluno:', student_name);
    console.log('🏫 Universidade:', university_name);
    console.log('💰 Valor do desconto:', discount_amount);
    console.log('🔑 MailerSend API Key configurada:', !!mailerSendApiKey);
    console.log('🌐 MailerSend URL:', mailerSendUrl);
    console.log('📧 From Email:', fromEmail);
    console.log('📛 From Name:', fromName);

    // Enviar email via MailerSend
    console.log('🚀 ===== INICIANDO ENVIO VIA MAILERSEND =====');
    console.log('📡 Fazendo requisição para:', mailerSendUrl);
    
    const mailerSendPayload = {
      from: { email: fromEmail, name: fromName },
      to: [{ email: finalUniversityEmail, name: university_name }],
      subject,
      html: htmlContent,
    };
    
    console.log('📦 Payload para MailerSend:', JSON.stringify(mailerSendPayload, null, 2));
    
    const response = await fetch(mailerSendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailerSendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailerSendPayload),
    });
    
    console.log('📊 ===== RESPOSTA DO MAILERSEND =====');
    console.log('📡 Status:', response.status);
    console.log('📡 Status Text:', response.statusText);
    console.log('📋 Headers da resposta:', Object.fromEntries(response.headers.entries()));

    if (response.status !== 202) {
      console.log('❌ ===== ERRO NO MAILERSEND =====');
      console.log('📡 Status de erro:', response.status);
      
      let result = {};
      try {
        result = await response.json();
        console.log('📋 Corpo da resposta de erro:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.log('⚠️ Não foi possível ler corpo da resposta de erro:', e);
        try {
          const errorText = await response.text();
          console.log('📄 Texto da resposta de erro:', errorText);
        } catch (e2) {
          console.log('⚠️ Não foi possível ler texto da resposta de erro:', e2);
        }
      }
      
      console.error('💥 Erro ao enviar email via MailerSend:', response.status, result);
      return new Response(JSON.stringify({ 
        error: 'Falha ao enviar notificação', 
        details: result,
        status: response.status 
      }), { status: 500, headers: corsHeaders(origin) });
    }
    
    console.log('✅ ===== EMAIL ENVIADO COM SUCESSO =====');
    console.log('📧 Email enviado para:', finalUniversityEmail);
    console.log('📧 Assunto:', subject);
    console.log('👤 Aluno:', student_name);
    console.log('🏫 Universidade:', university_name);

    console.log('🎉 ===== NOTIFICAÇÃO ENVIADA COM SUCESSO =====');
    console.log('📧 Email enviado para:', finalUniversityEmail);
    console.log('🆔 Redemption ID:', redemption_id);
    console.log('📅 Timestamp de envio:', new Date().toISOString());

    const responseData = {
      success: true, 
      message: 'University notification sent successfully',
      sent_to: finalUniversityEmail,
      redemption_id,
      timestamp: new Date().toISOString()
    };
    
    console.log('📤 ===== RESPOSTA DE SUCESSO =====');
    console.log('📋 Dados da resposta:', JSON.stringify(responseData, null, 2));

    return new Response(JSON.stringify(responseData), { 
      status: 200, 
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.log('💥 ===== ERRO CRÍTICO NA EDGE FUNCTION =====');
    console.log('📅 Timestamp do erro:', new Date().toISOString());
    console.log('💥 Tipo do erro:', error.constructor.name);
    console.log('💥 Mensagem do erro:', error.message);
    console.log('💥 Stack trace:', error.stack);
    console.log('💥 Error completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    const errorResponse = {
      error: 'Internal server error', 
      message: error.message,
      timestamp: new Date().toISOString(),
      error_type: error.constructor.name
    };
    
    console.log('📤 ===== RESPOSTA DE ERRO =====');
    console.log('📋 Dados da resposta de erro:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), { 
      status: 500, 
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } 
    });
  }
  
  console.log('🏁 ===== EDGE FUNCTION FINALIZADA =====');
});
