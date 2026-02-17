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
        const body = await req.json()
        const { to, subject, html, text, fromName, attachments } = body

        // Bloqueio de segurança para localhost
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        const isLocalhost = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')

        if (isLocalhost) {
            console.log(`[send-email] 🏠 Localhost detected. Skipping real SMTP send to: ${to}`)
            return new Response(JSON.stringify({
                success: true,
                message: 'Localhost mode: Email skiped (simulated success)'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Hardcoded fallbacks as requested because env vars cannot be set by user
        const smtpHost = Deno.env.get('SMTP_HOST') || "smtp.gmail.com"
        const smtpPortStr = Deno.env.get('SMTP_PORT') || "587"
        const smtpUser = Deno.env.get('SMTP_USER') || "admin@suaiden.com"
        const smtpPass = Deno.env.get('SMTP_PASS') || "fkpbfmcgcmtcekep"
        const smtpFromEmail = Deno.env.get('SMTP_FROM_EMAIL') || smtpUser
        const smtpFromName = fromName || Deno.env.get('SMTP_FROM_NAME') || 'Matrícula USA'

        const smtpPort = Number(smtpPortStr)

        console.log(`[send-email] Sending to: ${to}`)
        console.log(`[send-email] SMTP: ${smtpHost}:${smtpPort}`)

        if (attachments && attachments.length > 0) {
            console.log(`[send-email] Attachments: ${attachments.length}`)
        }

        // Use nodemailer from npm
        const nodemailer = await import('npm:nodemailer@6.9.7')

        const transporter = nodemailer.default.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for 587
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            tls: {
                // Necessário para alguns serviços SMTP que usam STARTTLS no port 587
                rejectUnauthorized: false
            }
        })

        // Prepare email
        const emailConfig: any = {
            from: `${smtpFromName} <${smtpFromEmail}>`,
            to: to,
            subject: subject,
            html: html || undefined,
            text: text || undefined
        }

        // Se nenhum corpo html/text foi passado, usa o 'body' que vinha do request antigo como fallback
        if (!html && !text && body.body) {
            emailConfig.text = body.body
        }

        // Add attachments if provided
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            emailConfig.attachments = attachments.map((att: any) => ({
                filename: att.filename,
                content: att.content,
                encoding: 'base64',
                contentType: att.contentType || 'application/pdf'
            }))
        }

        await transporter.sendMail(emailConfig)

        console.log('[send-email] Email sent successfully via SMTP')

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('[send-email] SMTP Error:', error.message)
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack,
            message: "Failed to send email. Check SMTP configuration."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
