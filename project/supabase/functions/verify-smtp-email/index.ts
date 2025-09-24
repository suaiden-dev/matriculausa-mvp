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
    } = await req.json()

    if (!host || !port || typeof secure === 'undefined' || !user || !password) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: host, port, secure, user, password',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // O gateway não tem /verify-smtp. Usamos /send-smtp com destinatário inválido
    // para forçar a validação de credenciais sem enviar email real.
    const verifyPayload = {
      host,
      port,
      secure,
      user,
      password,
      to: 'invalid@invalid',
      subject: 'Credentials verification',
      text: 'verification',
    }

    const url = 'http://212.1.213.163:3000/send-smtp?key=7D127C861C1D6CB5B12C3FE3189D8'

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyPayload),
    })

    const rawText = await upstream.text()
    let jsonBody: any
    try {
      jsonBody = rawText ? JSON.parse(rawText) : undefined
    } catch (_) {
      jsonBody = { message: rawText }
    }

    if (!upstream.ok) {
      // Inferir se a autenticação passou ou falhou analisando a resposta
      const message = (jsonBody?.error || jsonBody?.message || rawText || '').toString().toLowerCase()
      const authFailed = message.includes('authenticat') || message.includes('login') || message.includes('invalid credentials') || message.includes('auth')
      const parameterIssue = message.includes('parameter') || message.includes('recipient') || message.includes('invalid to') || message.includes('address') || message.includes('bad request')

      console.log('🔎 Verification inference:', { authFailed, parameterIssue, status: upstream.status, message })

      if (!authFailed && parameterIssue) {
        // Credenciais autenticaram, mas parâmetros inválidos (esperado pelo destinatário inválido)
        return new Response(
          JSON.stringify({ success: true, authenticated: true, deliverable: false, details: jsonBody ?? rawText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({
          error: 'SMTP verification failed',
          status: upstream.status,
          authenticated: !authFailed,
          details: jsonBody ?? rawText,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Caso 200 OK: considerar credenciais válidas
    return new Response(
      JSON.stringify({ success: true, authenticated: true, deliverable: true, result: jsonBody ?? {} }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('❌ Error in verify-smtp-email function:', error)
    const message = (error as any)?.message ?? 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})


