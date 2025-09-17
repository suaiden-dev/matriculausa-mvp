import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConfigRequest {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_auth_user: string;
  smtp_auth_pass: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_auth_user: string;
  imap_auth_pass: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

  try {
    const config: TestConfigRequest = await req.json();

    const results = {
      smtp: { success: false, error: null as string | null },
      imap: { success: false, error: null as string | null }
    };

    try {
      const nodemailer = await import('https://esm.sh/nodemailer@6.9.9');
      
      const transporter = nodemailer.default.createTransporter({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure,
        auth: {
          user: config.smtp_auth_user,
          pass: config.smtp_auth_pass
        }
      });

      await transporter.verify();
      results.smtp.success = true;
    } catch (error: any) {
      results.smtp.error = error.message;
    }

    try {
      const ImapFlowModule = await import('https://esm.sh/imapflow@1.0.164');
      
      const client = new ImapFlowModule.default({
        host: config.imap_host,
        port: config.imap_port,
        secure: config.imap_secure,
        auth: {
          user: config.imap_auth_user,
          pass: config.imap_auth_pass
        }
      });

      await client.connect();
      await client.logout();
      results.imap.success = true;
    } catch (error: any) {
      results.imap.error = error.message;
    }

    return new Response(
      JSON.stringify({ results }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
