import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationEvent =
  | 'client_registered'
  | 'selection_process_fee_paid'
  | 'application_fee_paid'
  | 'fee_paid'
  | 'commission_cleared'
  | 'payment_request_processed'
  | 'seller_created_payment_request'
  | 'commission_payout_completed';

interface NotificationPayload {
  event: NotificationEvent;
  data: {
    studentName?: string;
    studentEmail?: string;
    sellerName?: string;
    sellerEmail?: string;
    agencyName?: string;
    agencyEmail?: string;
    amount?: number;
    paymentReference?: string;
    payoutMethod?: string;
    feeName?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verificar autorização do chamador
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Parse payload
  let body: NotificationPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { event, data } = body;
  if (!event || !data) {
    return new Response(JSON.stringify({ error: 'Missing event or data' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const siteUrl = Deno.env.get('SITE_URL') || 'https://app.matriculausa.com';
    let recipientEmail = '';
    let subject = '';
    let htmlContent = '';
    
    // Logotipo padrão da plataforma
    const logoUrl = 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg';

    // Helper para gerar o invólucro do HTML (Layout Padrão)
    const getHtmlLayout = (title: string, innerHtml: string) => `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
            color: #333;
          }
          .wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .header {
            background-color: #05294E;
            padding: 20px;
            text-align: center;
          }
          .header img {
            max-width: 120px;
            height: auto;
          }
          .content {
            padding: 30px 20px;
            line-height: 1.6;
          }
          .content p {
            margin-bottom: 15px;
          }
          .footer {
            padding: 15px;
            background-color: #f0f0f0;
            text-align: center;
            font-size: 12px;
            color: #777;
          }
          a {
            color: #05294E;
            text-decoration: none;
          }
          .btn-cta {
            display: inline-block;
            padding: 12px 24px;
            background-color: #28a745;
            color: #ffffff !important;
            font-weight: bold;
            text-decoration: none;
            border-radius: 5px;
            margin: 15px 0;
          }
          @media screen and (max-width:600px) {
            .wrapper {
              width: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <img src="${logoUrl}" alt="Matrícula USA">
          </div>
          <div class="content">
            ${innerHtml}
          </div>
          <div class="footer">
            Esta é uma notificação automática da plataforma Matrícula USA.
          </div>
        </div>
      </body>
      </html>
    `;

    // Processamento de acordo com o tipo de evento
    switch (event) {
      // EVENTOS DO SELLER (agora direcionados à Agência)
      case 'client_registered': {
        recipientEmail = data.agencyEmail || data.sellerEmail || '';
        subject = '🎉 Novo estudante cadastrado via link de vendas!';
        const inner = `
          <p>Olá, <strong>${data.agencyName || 'Agência'}</strong>,</p>
          <p>Temos uma ótima notícia! Um novo estudante acabou de se cadastrar na plataforma Matrícula USA utilizando o link de vendas do seu vendedor <strong>${data.sellerName || 'Vendedor'}</strong>.</p>
          <p><strong>Detalhes do Estudante:</strong></p>
          <ul>
            <li><strong>Nome:</strong> ${data.studentName || 'Não informado'}</li>
            <li><strong>E-mail:</strong> ${data.studentEmail || 'Não informado'}</li>
          </ul>
          <p>Acompanhe a jornada dele e o status das comissões pelo seu painel.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/agency/dashboard" target="_blank" class="btn-cta">Acessar Painel da Agência</a>
          </div>
        `;
        htmlContent = getHtmlLayout(subject, inner);
        break;
      }

      case 'selection_process_fee_paid': {
        recipientEmail = data.agencyEmail || data.sellerEmail || '';
        subject = '💳 Taxa de Processo Seletivo Paga!';
        const inner = `
          <p>Olá, <strong>${data.agencyName || 'Agência'}</strong>,</p>
          <p>O estudante <strong>${data.studentName || 'Estudante'}</strong> (indicado pelo vendedor <strong>${data.sellerName || 'Vendedor'}</strong>) realizou com sucesso o pagamento da <strong>Selection Process Fee</strong>.</p>
          <p>O processo seletivo dele já está seguindo as próximas etapas na plataforma.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/agency/dashboard" target="_blank" class="btn-cta">Verificar Painel</a>
          </div>
        `;
        htmlContent = getHtmlLayout(subject, inner);
        break;
      }

      case 'application_fee_paid': {
        recipientEmail = data.agencyEmail || data.sellerEmail || '';
        subject = '🔥 Taxa de Aplicação Paga!';
        const inner = `
          <p>Olá, <strong>${data.agencyName || 'Agência'}</strong>,</p>
          <p>O estudante <strong>${data.studentName || 'Estudante'}</strong> (indicado pelo vendedor <strong>${data.sellerName || 'Vendedor'}</strong>) realizou o pagamento da <strong>Application Fee</strong>.</p>
          <p>Isso representa mais um passo importante no andamento das matrículas dele.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/agency/dashboard" target="_blank" class="btn-cta">Verificar Vendas</a>
          </div>
        `;
        htmlContent = getHtmlLayout(subject, inner);
        break;
      }

      case 'fee_paid': {
        recipientEmail = data.agencyEmail || data.sellerEmail || '';
        const feeLabel = data.feeName || 'Taxa';
        subject = `💳 Taxa de ${feeLabel} Paga!`;
        const inner = `
          <p>Olá, <strong>${data.agencyName || 'Agência'}</strong>,</p>
          <p>O estudante <strong>${data.studentName || 'Estudante'}</strong> (indicado pelo vendedor <strong>${data.sellerName || 'Vendedor'}</strong>) realizou com sucesso o pagamento da <strong>${feeLabel}</strong>.</p>
          <p>Uma nova comissão no valor de <strong>USD ${data.amount || '0.00'}</strong> foi gerada para o seu vendedor!</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${siteUrl}/agency/dashboard" target="_blank" class="btn-cta">Verificar Comissões</a>
          </div>
        `;
        htmlContent = getHtmlLayout(subject, inner);
        break;
      }

      case 'commission_cleared': {
        recipientEmail = data.agencyEmail || data.sellerEmail || '';
        subject = '💰 Comissão Liberada!';
        const inner = `
          <p>Olá, <strong>${data.agencyName || 'Agência'}</strong>,</p>
          <p>A comissão no valor de <strong>USD ${data.amount || '0.00'}</strong> do seu vendedor <strong>${data.sellerName || 'Vendedor'}</strong> foi liberada e está disponível para resgate.</p>
          <p>Ele poderá solicitar a transferência deste saldo pelo painel dele.</p>
        `;
        htmlContent = getHtmlLayout(subject, inner);
        break;
      }

      case 'payment_request_processed': {
        recipientEmail = data.sellerEmail || '';
        subject = '✅ Solicitação de Payout Processada/Paga!';
        const inner = `
          <p>Olá, <strong>${data.sellerName || 'Seller'}</strong>,</p>
          <p>Sua solicitação de saque no valor de <strong>USD ${data.amount || '0.00'}</strong> foi processada com sucesso.</p>
          <p><strong>Detalhes do Pagamento:</strong></p>
          <ul>
            <li><strong>Método:</strong> ${data.payoutMethod || 'Zelle'}</li>
            ${data.paymentReference ? `<li><strong>Referência/Comprovante:</strong> ${data.paymentReference}</li>` : ''}
          </ul>
          <p>O saldo deve estar disponível na sua conta em breve.</p>
        `;
        htmlContent = getHtmlLayout(subject, inner);
        break;
      }

      // EVENTOS DO ADMIN/AGÊNCIA
      case 'seller_created_payment_request': {
        const { data: admins } = await adminClient
          .from('user_profiles')
          .select('email, full_name')
          .eq('role', 'admin');

        if (admins && admins.length > 0) {
          const emailPromises = admins
            .filter((adm: { email: string | null }) => adm.email)
            .map((adm: { email: string | null; full_name: string | null }) => {
              const subject = '🛎️ Nova Solicitação de Payout Recebida';
              const inner = `
                <p>Olá, <strong>${adm.full_name || 'Administrador'}</strong>,</p>
                <p>A Agência <strong>${data.agencyName || 'Agência'}</strong> (${data.agencyEmail || ''}) solicitou um payout/saque de comissões.</p>
                <p><strong>Resumo do Pedido:</strong></p>
                <ul>
                  <li><strong>Valor:</strong> USD ${data.amount || '0.00'}</li>
                  <li><strong>Método Escolhido:</strong> ${data.payoutMethod || 'Zelle'}</li>
                </ul>
                <p>Por favor, revise os detalhes e processe o pagamento no painel financeiro.</p>
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${siteUrl}/admin/dashboard/payments" target="_blank" class="btn-cta">Gerenciar Pagamentos</a>
                </div>
              `;
              const html = getHtmlLayout(subject, inner);
              return adminClient.functions.invoke('send-email', {
                body: {
                  to: adm.email,
                  subject: subject,
                  html: html,
                }
              });
            });

          await Promise.all(emailPromises).catch((e: Error) => {
            console.error('Error invoking send-email for some admins:', e);
          });
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Notification sent to all platform admins' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'commission_payout_completed': {
        recipientEmail = data.agencyEmail || '';
        subject = '🤝 Pagamento de Payout de Seller Concluído';
        const inner = `
          <p>Olá, <strong>${data.agencyName || 'Agência'}</strong>,</p>
          <p>O pagamento do resgate solicitado por <strong>${data.sellerName || 'Seller'}</strong> no valor de <strong>USD ${data.amount || '0.00'}</strong> foi marcado como concluído.</p>
          <p>O histórico financeiro da agência já foi atualizado com essa transação.</p>
        `;
        htmlContent = getHtmlLayout(subject, inner);
        break;
      }

      default: {
        return new Response(JSON.stringify({ error: `Event '${event}' not implemented` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'Recipient email is missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invocar a Edge Function 'send-email' em background
    adminClient.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject: subject,
        html: htmlContent,
      }
    }).then((res: { error: unknown }) => {
      const emailError = res.error;
      if (emailError) {
        console.error('Error invoking send-email in background:', emailError);
      } else {
        console.log(`[notify-seller-agency] Email successfully sent to ${recipientEmail} for event ${event}`);
      }
    }).catch((e: Error) => {
      console.error('Unexpected error invoking send-email in background:', e);
    });

    return new Response(
      JSON.stringify({ success: true, message: `Notification processing started for event: ${event}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
