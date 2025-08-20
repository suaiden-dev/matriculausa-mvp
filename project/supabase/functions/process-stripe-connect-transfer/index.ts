import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create Stripe client
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })

    // Get request body
    const { 
      session_id, 
      payment_intent_id, 
      amount, 
      university_id,
      application_id,
      user_id 
    } = await req.json()

    if (!session_id || !payment_intent_id || !amount || !university_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('Processing Stripe Connect transfer:', {
      session_id,
      payment_intent_id,
      amount,
      university_id,
      application_id,
      user_id
    })

    // 1. Verificar se a universidade tem Stripe Connect habilitado
    const { data: feeConfig, error: feeConfigError } = await supabase
      .from('university_fee_configurations')
      .select('*')
      .eq('university_id', university_id)
      .single()

    if (feeConfigError || !feeConfig) {
      console.error('Error fetching fee configuration:', feeConfigError)
      return new Response(
        JSON.stringify({ error: 'University fee configuration not found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // 2. Se não tiver Stripe Connect, retornar sucesso (usa fluxo atual)
    if (!feeConfig.is_stripe_connect_enabled || !feeConfig.stripe_connect_account_id) {
      console.log('University does not have Stripe Connect enabled, using current flow')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'University does not have Stripe Connect, using current flow',
          transfer_type: 'none'
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    // 3. Se tiver Stripe Connect, fazer transferência automática
    try {
      console.log('Initiating automatic transfer to university Stripe account:', feeConfig.stripe_connect_account_id)

      // Criar transferência para a conta da universidade
      const transfer = await stripe.transfers.create({
        amount: amount, // amount já está em centavos
        currency: 'usd',
        destination: feeConfig.stripe_connect_account_id,
        description: `Application fee transfer for application ${application_id}`,
        metadata: {
          session_id,
          payment_intent_id,
          application_id,
          user_id,
          university_id,
          transfer_type: 'application_fee'
        }
      })

      console.log('Transfer created successfully:', transfer.id)

      // 4. Registrar a transferência no banco
      const { error: transferRecordError } = await supabase
        .from('stripe_connect_transfers')
        .insert({
          transfer_id: transfer.id,
          session_id,
          payment_intent_id,
          application_id,
          user_id,
          university_id,
          amount,
          status: 'succeeded',
          destination_account: feeConfig.stripe_connect_account_id,
          created_at: new Date().toISOString()
        })

      if (transferRecordError) {
        console.error('Error recording transfer in database:', transferRecordError)
        // Não falhar o processo por causa do registro no banco
      }

      // 5. Atualizar o status da aplicação para indicar que foi transferido
      if (application_id) {
        const { error: appUpdateError } = await supabase
          .from('scholarship_applications')
          .update({
            stripe_transfer_status: 'transferred',
            stripe_transfer_id: transfer.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', application_id)

        if (appUpdateError) {
          console.error('Error updating application transfer status:', appUpdateError)
        }
      }

      // 6. Enviar notificação para a universidade sobre o pagamento recebido
      try {
        // Buscar informações do estudante e da bolsa
        const { data: application, error: appError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            student:user_profiles!inner(full_name, email),
            scholarship:scholarships!inner(title)
          `)
          .eq('id', application_id)
          .single()

        if (!appError && application) {
          // Chamar a função de notificação
          const notificationResponse = await fetch(
            `${supabaseUrl}/functions/v1/notify-university-stripe-connect-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`
              },
              body: JSON.stringify({
                university_id,
                student_name: application.student?.full_name || 'Estudante',
                student_email: application.student?.email || '',
                scholarship_title: application.scholarship?.title || 'Bolsa',
                amount,
                transfer_id: transfer.id,
                application_id
              })
            }
          )

          if (!notificationResponse.ok) {
            console.error('Error sending notification:', await notificationResponse.text())
          } else {
            console.log('Notification sent successfully')
          }
        }
      } catch (notificationError) {
        console.error('Error in notification process:', notificationError)
        // Não falhar o processo por causa da notificação
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transfer completed successfully',
          transfer_id: transfer.id,
          transfer_type: 'stripe_connect'
        }),
        { status: 200, headers: corsHeaders }
      )

    } catch (stripeError) {
      console.error('Error creating Stripe transfer:', stripeError)
      
      // Registrar erro no banco
      const { error: errorRecordError } = await supabase
        .from('stripe_connect_transfers')
        .insert({
          transfer_id: null,
          session_id,
          payment_intent_id,
          application_id,
          user_id,
          university_id,
          amount,
          status: 'failed',
          destination_account: feeConfig.stripe_connect_account_id,
          error_message: stripeError.message,
          created_at: new Date().toISOString()
        })

      if (errorRecordError) {
        console.error('Error recording transfer error in database:', errorRecordError)
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transfer failed',
          details: stripeError.message,
          transfer_type: 'stripe_connect_failed'
        }),
        { status: 500, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('Unexpected error in process-stripe-connect-transfer:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
