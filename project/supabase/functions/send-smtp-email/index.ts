// @ts-ignore - Deno std import resolved at runtime in Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      host, 
      port, 
      secure, 
      user, 
      password, 
      to, 
      cc, 
      bcc, 
      subject, 
      text, 
      html 
    } = await req.json()

    // Prepare data for SMTP endpoint
    const emailData: any = {
      host,
      port,
      secure,
      user,
      password,
      to,
      subject,
      text: text || undefined,
      html: html || undefined
    }

    // Add CC and BCC if they exist
    if (cc) {
      emailData.cc = cc
    }
    if (bcc) {
      emailData.bcc = bcc
    }

    console.log('📤 SMTP Email data:', { ...emailData, password: '***' })

    // Send email via SMTP endpoint
    const response = await fetch('http://212.1.213.163:3000/send-smtp?key=7D127C861C1D6CB5B12C3FE3189D8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ SMTP Server error:', response.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `SMTP Server error: ${response.status} - ${errorText}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await response.json()
    console.log('✅ Email sent successfully via SMTP')

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in send-smtp-email function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
