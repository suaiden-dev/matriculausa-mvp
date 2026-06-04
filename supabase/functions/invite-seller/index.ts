import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify caller is authenticated
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

  // Verify caller is an affiliate_admin
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token);
  if (callerError || !caller) {
    console.error('Auth verification error:', callerError);
    return new Response(JSON.stringify({ error: 'Unauthorized', details: callerError?.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (callerProfile?.role !== 'affiliate_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get affiliate_admin_id
  const { data: affiliateAdmin, error: adminError } = await adminClient
    .from('affiliate_admins')
    .select('id')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (adminError || !affiliateAdmin) {
    return new Response(JSON.stringify({ error: 'Agency not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let body: { email: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!body.email) {
    return new Response(JSON.stringify({ error: 'email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const email = body.email.toLowerCase().trim();

  // Check for duplicate seller in this agency
  const { data: existingSeller } = await adminClient
    .from('sellers')
    .select('id')
    .eq('email', email)
    .eq('affiliate_admin_id', affiliateAdmin.id)
    .maybeSingle();
  if (existingSeller) {
    return new Response(JSON.stringify({ error: 'Seller already exists for this agency' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://app.matriculausa.com';
    const redirectUrl = body.redirectTo || `${siteUrl}/seller/accept-invite`;

    const inviteLink = `${redirectUrl}?agency=${affiliateAdmin.id}&email=${encodeURIComponent(email)}`;
    console.log(`[invite-seller] Generated invitation link for ${email}: ${inviteLink}`);

    // Get agency name from caller profile
    const { data: agencyProfile } = await adminClient
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', caller.id)
      .maybeSingle();

    const agencyName = agencyProfile?.full_name || 'Uma Agência Parceira';

    const subject = `Convite de ${agencyName} para se tornar Seller na Matrícula USA`;
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-br">
      <head>
        <meta charset="UTF-8">
        <title>✉️ Convite para se tornar Seller na Matrícula USA</title>
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
            background-color: #0052cc;
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
            color: #0052cc;
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
            <img src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/university-profile-pictures/fb5651f1-66ed-4a9f-ba61-96c50d348442/logo%20matriculaUSA.jpg" alt="Matrícula USA">
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Você foi convidado por <strong>${agencyName}</strong> para fazer parte da plataforma <strong>Matrícula USA</strong> como um parceiro de vendas (Seller).</p>
            
            <p>Como Seller, você terá acesso a um painel exclusivo para gerenciar seus contatos, acompanhar as inscrições dos alunos e monitorar suas comissões em tempo real.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${inviteLink}" target="_blank" class="btn-cta">Aceitar Convite e Concluir Cadastro</a>
            </div>

            <p>Se o botão acima não funcionar, copie e cole este link no seu navegador:<br>
            <a href="${inviteLink}">${inviteLink}</a></p>

            <p><strong>Por favor, não responda a este e-mail.</strong> Este convite é válido por 7 dias.</p>

            <br>
            <p>Atenciosamente,<br>
            <strong>Equipe Matrícula USA</strong><br>
            <a href="https://matriculausa.com/">https://matriculausa.com/</a></p>
          </div>
          <div class="footer">
            Você está recebendo esta mensagem porque foi convidado para se tornar um Seller na plataforma Matrícula USA. Esta é uma notificação automática.
          </div>
        </div>
      </body>
      </html>
    `;

    // Invoke our custom SMTP send-email function in the background
    adminClient.functions.invoke('send-email', {
      body: {
        to: email,
        subject: subject,
        html: htmlContent,
      }
    }).then(({ error: emailError }) => {
      if (emailError) {
        console.error('Error invoking send-email in background:', emailError);
      } else {
        console.log(`[invite-seller] Email successfully sent in background to ${email}`);
      }
    }).catch(e => {
      console.error('Unexpected error sending email in background:', e);
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Invite sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
