import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  config_id: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject: string;
  text_content?: string;
  html_content?: string;
  reply_to?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailData: EmailRequest = await req.json();

    // Validate required fields
    if (!emailData.config_id || !emailData.to_addresses || emailData.to_addresses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get email configuration (verify ownership)
    const { data: config, error: configError } = await supabaseClient
      .from('email_configurations')
      .select('*')
      .eq('id', emailData.config_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'Email configuration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Save to sent_emails table
    const { data: sentEmail, error: insertError } = await supabaseClient
      .from('sent_emails')
      .insert({
        email_config_id: emailData.config_id,
        subject: emailData.subject,
        to_addresses: emailData.to_addresses,
        cc_addresses: emailData.cc_addresses,
        bcc_addresses: emailData.bcc_addresses,
        reply_to: emailData.reply_to,
        text_content: emailData.text_content,
        html_content: emailData.html_content,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Import nodemailer dynamically
    const nodemailer = await import('https://esm.sh/nodemailer@6.9.8');
    const CryptoJS = await import('https://esm.sh/crypto-js@4.2.0');

    // Decrypt passwords
    const decryptData = (encryptedData: string) => {
      const bytes = CryptoJS.AES.decrypt(encryptedData, Deno.env.get('EMAIL_ENCRYPTION_KEY') || 'default-key');
      return bytes.toString(CryptoJS.enc.Utf8);
    };

    try {
      // Create SMTP transporter
      const transporter = nodemailer.default.createTransporter({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: {
          user: config.smtp_auth_user,
          pass: decryptData(config.smtp_auth_pass)
        }
      });

      // Prepare email
      const mailOptions = {
        from: `${config.email_address}`,
        to: emailData.to_addresses.join(', '),
        cc: emailData.cc_addresses?.join(', '),
        bcc: emailData.bcc_addresses?.join(', '),
        subject: emailData.subject,
        text: emailData.text_content,
        html: emailData.html_content,
        replyTo: emailData.reply_to
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      // Update status to sent
      await supabaseClient
        .from('sent_emails')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', sentEmail.id);

      return new Response(
        JSON.stringify({
          success: true,
          messageId: info.messageId,
          sentEmailId: sentEmail.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (sendError) {
      // Update status to failed
      await supabaseClient
        .from('sent_emails')
        .update({
          status: 'failed',
          error_message: sendError.message
        })
        .eq('id', sentEmail.id);

      return new Response(
        JSON.stringify({ error: sendError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});