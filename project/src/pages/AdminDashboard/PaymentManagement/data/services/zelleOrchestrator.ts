import { SupabaseClient } from '@supabase/supabase-js';
import { recordIndividualFeePayment } from '../../../../../lib/paymentRecorder';
import config from '../../../../../lib/config';

type PaymentLike = {
  id: string;
  user_id: string;
  student_id?: string;
  student_email: string;
  student_name: string;
  fee_type: string;
  fee_type_global?: string;
  amount: number;
  admin_approved_at?: string;
  created_at: string;
  scholarships_ids?: string[];
  scholarship_id?: string | null;
  metadata?: any; // Metadata do pagamento (inclui dados de cupom promocional)
};

export async function approveZelleFlow(params: {
  supabase: SupabaseClient;
  adminUserId: string;
  payment: PaymentLike;
}) {
  const { supabase, adminUserId, payment } = params;

  // Selection Process logic
  if (payment.fee_type_global === 'selection_process') {
    // Mark on profile
    await supabase
      .from('user_profiles')
      .update({
        has_paid_selection_process_fee: true,
        selection_process_fee_payment_method: 'zelle',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', payment.user_id)
      .select();

    // Record payment (individual table)
    const approvedAt = payment.admin_approved_at || payment.created_at;
    const individualFeePaymentResult = await recordIndividualFeePayment(supabase, {
      userId: payment.user_id,
      feeType: 'selection_process',
      amount: payment.amount,
      paymentDate: approvedAt,
      paymentMethod: 'zelle',
      zellePaymentId: payment.id,
    });
    const individualFeePaymentId = individualFeePaymentResult?.paymentId || null;

    // ✅ REMOVIDO: Envio de documento de aceitação de termos - agora é enviado no momento do upload do comprovante no ZelleCheckoutPage.tsx
    // Isso garante que o documento seja enviado independentemente de aprovação automática ou manual

    // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

    // Resolve dynamic amount from package overrides
    let correctAmount = payment.amount;
    try {
      const { data: userPackageFees } = await supabase.rpc('get_user_package_fees', {
        user_id_param: payment.user_id,
      });
      if (userPackageFees && userPackageFees.length > 0) {
        correctAmount = userPackageFees[0].selection_process_fee ?? correctAmount;
      }
    } catch (_) {}

    // Log action
    await supabase.rpc('log_student_action', {
      p_student_id: payment.user_id,
      p_action_type: 'fee_payment',
      p_action_description: `Selection Process Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: 'admin',
      p_metadata: {
        fee_type: 'selection_process',
        payment_method: 'zelle',
        amount: correctAmount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
        ip: undefined,
      },
    });

    // Billing
    await supabase.rpc('register_payment_billing', {
      user_id_param: payment.user_id,
      fee_type_param: 'selection_process',
      amount_param: correctAmount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: 'zelle',
    });

    // Rewards (coins for referrer)
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('referral_code_used')
        .eq('user_id', payment.user_id)
        .single();
      if (userProfile?.referral_code_used) {
        const { data: affiliateCode } = await supabase
          .from('affiliate_codes')
          .select('user_id, code')
          .eq('code', userProfile.referral_code_used)
          .eq('is_active', true)
          .single();
        if (affiliateCode && affiliateCode.user_id !== payment.user_id) {
          const { data: referredUserProfile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', payment.user_id)
            .single();
          const referredDisplayName =
            referredUserProfile?.full_name || referredUserProfile?.email || payment.user_id;

          await supabase.rpc('add_coins_to_user_matricula', {
            user_id_param: affiliateCode.user_id,
            coins_to_add: 180,
          });

          // Notify referrer via webhook (best-effort)
          try {
            const { data: referrerProfile } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', affiliateCode.user_id)
              .single();
            const referrerName = referrerProfile?.full_name || referrerProfile?.email || 'Unknown User';
            const referrerEmail = referrerProfile?.email || '';
            const mensagem = `Você recebeu 180 MatriculaCoins como recompensa por indicação! O aluno ${referredDisplayName} pagou a taxa de Selection Process Fee via Zelle (aprovado pelo admin) usando seu código de referência.`;
            await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'User-Agent': 'MatriculaUSA/1.0' },
              body: JSON.stringify({
                tipo_notf: 'Recompensa de MatriculaCoins por Indicação',
                email_aluno: referrerEmail,
                nome_aluno: referrerName,
                o_que_enviar: mensagem,
                coins_amount: 180,
                referred_student_name: referredDisplayName,
                referred_student_email: referredUserProfile?.email || '',
                payment_method: 'zelle_admin',
                fee_type: 'selection_process',
                reward_type: 'referral',
              }),
            });
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  // I-20 Control logic
  const feeTypeSafe = String(payment.fee_type || '');
  const feeTypeGlobalSafe = String(payment.fee_type_global || '');
  const isI20 =
    feeTypeGlobalSafe === 'i20_control_fee' ||
    feeTypeGlobalSafe === 'i-20_control_fee' ||
    feeTypeSafe === 'i20_control' ||
    feeTypeSafe === 'i20_control_fee' ||
    feeTypeSafe === 'i-20_control_fee';

  if (isI20) {
    await supabase
      .from('user_profiles')
      .update({
        has_paid_i20_control_fee: true,
        i20_control_fee_payment_method: 'zelle',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', payment.user_id)
      .select();

    const approvedAt = payment.admin_approved_at || payment.created_at;
    const individualFeePaymentResult = await recordIndividualFeePayment(supabase, {
      userId: payment.user_id,
      feeType: 'i20_control',
      amount: payment.amount,
      paymentDate: approvedAt,
      paymentMethod: 'zelle',
      zellePaymentId: payment.id,
    });
    const individualFeePaymentId = individualFeePaymentResult?.paymentId || null;

    // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

    let correctAmount = payment.amount;
    try {
      const { data: userPackageFees } = await supabase.rpc('get_user_package_fees', {
        user_id_param: payment.user_id,
      });
      if (userPackageFees && userPackageFees.length > 0) {
        correctAmount = userPackageFees[0].i20_control_fee ?? correctAmount;
      }
    } catch (_) {}

    await supabase.rpc('log_student_action', {
      p_student_id: payment.user_id,
      p_action_type: 'fee_payment',
      p_action_description: `I-20 Control Fee paid via Zelle (approved by admin)`,
      p_performed_by: adminUserId,
      p_performed_by_type: 'admin',
      p_metadata: {
        fee_type: 'i20_control',
        payment_method: 'zelle',
        amount: correctAmount,
        payment_id: payment.id,
        zelle_payment_id: payment.id,
        ip: undefined,
      },
    });

    await supabase.rpc('register_payment_billing', {
      user_id_param: payment.user_id,
      fee_type_param: 'i20_control_fee',
      amount_param: correctAmount,
      payment_session_id_param: `zelle_${payment.id}`,
      payment_method_param: 'zelle',
    });
  }

  // Application/Scholarship fees logic (applications table updates, logging, billing scholarship)
  if (payment.fee_type === 'application_fee' || payment.fee_type === 'scholarship_fee') {
    if (payment.scholarships_ids && payment.scholarships_ids.length > 0) {
      // Registrar pagamento na tabela individual_fee_payments
      const approvedAt = payment.admin_approved_at || payment.created_at;
      const feeType = payment.fee_type === 'application_fee' ? 'application' : 'scholarship';
      const individualFeePaymentResult = await recordIndividualFeePayment(supabase, {
        userId: payment.user_id,
        feeType: feeType as any,
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: 'zelle',
        zellePaymentId: payment.id,
      });
      const individualFeePaymentId = individualFeePaymentResult?.paymentId || null;

      // Registrar uso do cupom promocional se houver
      if (payment.metadata && typeof payment.metadata === 'object') {
        const metadata = payment.metadata as any;
        // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)
      }

      const { data: updateData } = await supabase
        .from('scholarship_applications')
        .update({
          [payment.fee_type === 'application_fee'
            ? 'is_application_fee_paid'
            : 'is_scholarship_fee_paid']: true,
          [payment.fee_type === 'application_fee'
            ? 'application_fee_payment_method'
            : 'scholarship_fee_payment_method']: 'zelle',
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', payment.student_id)
        .in('scholarship_id', payment.scholarships_ids)
        .select();
      for (const app of updateData || []) {
        await supabase.rpc('log_student_action', {
          p_student_id: payment.student_id,
          p_action_type: 'fee_payment',
          p_action_description: `${payment.fee_type === 'application_fee' ? 'Application Fee' : 'Scholarship Fee'} paid via Zelle (approved by admin)`,
          p_performed_by: adminUserId,
          p_performed_by_type: 'admin',
          p_metadata: {
            fee_type: payment.fee_type === 'application_fee' ? 'application' : 'scholarship',
            payment_method: 'zelle',
            amount: payment.amount,
            payment_id: payment.id,
            zelle_payment_id: payment.id,
            application_id: app.id,
            scholarship_id: app.scholarship_id,
            ip: undefined,
          },
        });
      }
    } else {
      await supabase
        .from('scholarship_applications')
        .update({
          [payment.fee_type === 'application_fee'
            ? 'is_application_fee_paid'
            : 'is_scholarship_fee_paid']: true,
          [payment.fee_type === 'application_fee'
            ? 'application_fee_payment_method'
            : 'scholarship_fee_payment_method']: 'zelle',
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', payment.student_id)
        .select();

      const approvedAt = payment.admin_approved_at || payment.created_at;
      const feeType = payment.fee_type === 'application_fee' ? 'application' : 'scholarship';
      const individualFeePaymentResult = await recordIndividualFeePayment(supabase, {
        userId: payment.user_id,
        feeType: feeType as any,
        amount: payment.amount,
        paymentDate: approvedAt,
        paymentMethod: 'zelle',
        zellePaymentId: payment.id,
      });
      const individualFeePaymentId = individualFeePaymentResult?.paymentId || null;

      // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)

      await supabase.rpc('log_student_action', {
        p_student_id: payment.student_id,
        p_action_type: 'fee_payment',
        p_action_description: `${payment.fee_type === 'application_fee' ? 'Application Fee' : 'Scholarship Fee'} paid via Zelle (approved by admin) - fallback mode`,
        p_performed_by: adminUserId,
        p_performed_by_type: 'admin',
        p_metadata: {
          fee_type: payment.fee_type === 'application_fee' ? 'application' : 'scholarship',
          payment_method: 'zelle',
          amount: payment.amount,
          payment_id: payment.id,
          zelle_payment_id: payment.id,
          mode: 'fallback_all_applications',
          ip: undefined,
        },
      });
    }

    if (payment.fee_type === 'scholarship_fee') {
      let correctAmount = payment.amount;
      try {
        const { data: userPackageFees } = await supabase.rpc('get_user_package_fees', {
          user_id_param: payment.user_id,
        });
        if (userPackageFees && userPackageFees.length > 0) {
          correctAmount = userPackageFees[0].scholarship_fee ?? correctAmount;
        }
      } catch (_) {}
      await supabase.rpc('register_payment_billing', {
        user_id_param: payment.user_id,
        fee_type_param: 'scholarship_fee',
        amount_param: correctAmount,
        payment_session_id_param: `zelle_${payment.id}`,
        payment_method_param: 'zelle',
      });
    }
  }

  // Update user_profiles for application_fee flag
  if (payment.fee_type === 'application_fee') {
    await supabase
      .from('user_profiles')
      .update({ is_application_fee_paid: true, updated_at: new Date().toISOString() })
      .eq('user_id', payment.user_id)
      .select();
  }

  // Student approval notification (webhook)
  try {
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', adminUserId)
      .single();
    const adminName = adminProfile?.full_name || 'Admin';
    const approvalPayload = {
      tipo_notf: 'Pagamento aprovado',
      email_aluno: payment.student_email,
      nome_aluno: payment.student_name,
      email_universidade: '',
      o_que_enviar: `Seu pagamento de ${payment.fee_type} no valor de $${payment.amount} foi aprovado e processado com sucesso!`,
      payment_id: payment.id,
      fee_type: payment.fee_type,
      amount: payment.amount,
      approved_by: adminName,
    };
    console.log('📧 [zelleOrchestrator] Enviando webhook de aprovação para aluno:', approvalPayload);
    const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvalPayload),
    });
    if (webhookResponse.ok) {
      console.log('✅ [zelleOrchestrator] Webhook de aprovação para aluno enviado com sucesso');
    } else {
      const errorText = await webhookResponse.text();
      console.error('❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para aluno:', webhookResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ [zelleOrchestrator] Exceção ao enviar webhook de aprovação para aluno:', error);
  }

  // University notifications for application/scholarship
  try {
    const notificationEndpoint =
      payment.fee_type === 'application_fee'
        ? 'notify-university-application-fee-paid'
        : payment.fee_type === 'scholarship_fee'
        ? 'notify-university-scholarship-fee-paid'
        : null;
    if (notificationEndpoint) {
      const payload = {
        application_id: payment.student_id,
        user_id: payment.user_id,
        scholarship_id: payment.scholarship_id || null,
      };
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${notificationEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });
    }
  } catch (_) {}

  // Admin / Affiliate admin / Seller notifications (best-effort)
  try {
    const isDevelopment = config.isDevelopment();
    const devBlockedEmails = [
      'luizedmiola@gmail.com',
      'chimentineto@gmail.com',
      'fsuaiden@gmail.com',
      'rayssathefuture@gmail.com',
      'gui.reis@live.com',
      'admin@matriculausa.com'
    ];

    // Buscar seller_referral_code do aluno
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('seller_referral_code')
      .eq('user_id', payment.user_id)
      .single();

    let sellerData: any = null;
    if (userProfile?.seller_referral_code) {
      const { data: sellerByCode } = await supabase
        .from('sellers')
        .select('id, user_id, name, email, referral_code, affiliate_admin_id, commission_rate')
        .eq('referral_code', userProfile.seller_referral_code)
        .single();
      if (sellerByCode) {
        sellerData = sellerByCode;
        console.log('✅ [zelleOrchestrator] Seller encontrado:', {
          seller_id: sellerData.user_id,
          seller_name: sellerData.name,
          seller_email: sellerData.email,
          referral_code: sellerData.referral_code,
          affiliate_admin_id: sellerData.affiliate_admin_id,
        });
      }
    }
    
    if (!sellerData) {
      console.warn('⚠️ [zelleOrchestrator] Nenhum seller encontrado para o aluno:', {
        student_user_id: payment.user_id,
        student_name: payment.student_name,
        seller_referral_code: userProfile?.seller_referral_code || 'N/A',
      });
    }

    let affiliateAdminData: any = null;
    if (sellerData && sellerData.affiliate_admin_id) {
      const { data: affiliateData } = await supabase
        .from('affiliate_admins')
        .select('user_id')
        .eq('id', sellerData.affiliate_admin_id)
        .single();
      if (affiliateData?.user_id) {
        const { data: userProfileData } = await supabase
          .from('user_profiles')
          .select('full_name, email, phone')
          .eq('user_id', affiliateData.user_id)
          .single();
        if (userProfileData) {
          affiliateAdminData = { user_id: affiliateData.user_id, user_profiles: userProfileData };
        }
      }
    }

    // 1. Notify generic admin
    let emailAdmin = 'admin@matriculausa.com';
    if (isDevelopment && devBlockedEmails.includes(emailAdmin)) {
      console.log(`[NOTIFICAÇÃO] Email de admin bloqueado em desenvolvimento: ${emailAdmin}`);
      emailAdmin = '';
    }

    if (emailAdmin) {
      const adminPayload = {
        tipo_notf: 'Pagamento de aluno aprovado',
        email_admin: emailAdmin,
        nome_admin: 'Admin MatriculaUSA',
        email_aluno: payment.student_email,
        nome_aluno: payment.student_name,
        email_seller: sellerData?.email || '',
        nome_seller: sellerData?.name || 'N/A',
        email_affiliate_admin: affiliateAdminData?.user_profiles?.email || '',
        nome_affiliate_admin: affiliateAdminData?.user_profiles?.full_name || 'Affiliate Admin',
        o_que_enviar: `Pagamento de ${payment.fee_type} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado. ${sellerData ? `Seller responsável: ${sellerData.name} (${sellerData.referral_code})` : 'Sem seller associado'}`,
        payment_id: payment.id,
        fee_type: payment.fee_type,
        amount: payment.amount,
        seller_id: sellerData?.user_id || null,
        referral_code: sellerData?.referral_code || null,
      };
      console.log('📧 [zelleOrchestrator] Enviando webhook de aprovação para admin:', adminPayload);
      const adminWebhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminPayload),
      });
      if (adminWebhookResponse.ok) {
        console.log('✅ [zelleOrchestrator] Webhook de aprovação para admin enviado com sucesso');
      } else {
        const errorText = await adminWebhookResponse.text();
        console.error('❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para admin:', adminWebhookResponse.status, errorText);
      }
    }

    // 2. Notify ALL system administrators
    try {
      const { data: adminUsers } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, phone')
        .eq('role', 'admin');

      if (adminUsers && adminUsers.length > 0) {
        console.log(`📧 [zelleOrchestrator] Enviando notificações para ${adminUsers.length} administradores...`);
        for (const admin of adminUsers) {
          let adminEmail = admin.email;
          if (isDevelopment && devBlockedEmails.includes(adminEmail)) {
            console.log(`📧 [zelleOrchestrator] Notificação bloqueada para admin ${adminEmail} em desenvolvimento`);
            continue;
          }

          const adminNotificationPayload = {
            tipo_notf: 'Pagamento de aluno aprovado',
            email_admin: adminEmail,
            nome_admin: admin.full_name || 'Admin',
            phone_admin: admin.phone || '',
            email_aluno: payment.student_email,
            nome_aluno: payment.student_name,
            email_seller: sellerData?.email || '',
            nome_seller: sellerData?.name || 'N/A',
            email_affiliate_admin: affiliateAdminData?.user_profiles?.email || '',
            nome_affiliate_admin: affiliateAdminData?.user_profiles?.full_name || 'N/A',
            o_que_enviar: `Pagamento de ${payment.fee_type} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado manualmente. ${sellerData ? `Seller responsável: ${sellerData.name} (${sellerData.referral_code})` : 'Sem seller associado'}`,
            payment_id: payment.id,
            fee_type: payment.fee_type,
            amount: payment.amount,
            seller_id: sellerData?.user_id || null,
            referral_code: sellerData?.referral_code || null,
            commission_rate: sellerData?.commission_rate || null,
            approved_by: 'Manual Admin Approval',
          };

          console.log(`📧 [zelleOrchestrator] Enviando notificação para admin ${adminEmail}`);

          await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminNotificationPayload),
          }).catch(err => console.error(`❌ Erro ao notificar admin ${adminEmail}:`, err));
        }
        console.log(`✅ [zelleOrchestrator] Notificações concluídas para administradores`);
      }
    } catch (error) {
      console.error('❌ [zelleOrchestrator] Erro ao notificar administradores:', error);
    }

    // 3. Notify affiliate admin and seller
    if (sellerData) {
      const { data: sellerProfile } = await supabase
        .from('user_profiles')
        .select('phone')
        .eq('user_id', sellerData.user_id)
        .single();
      const sellerPhone = sellerProfile?.phone;

      // Notify affiliate admin
      if (affiliateAdminData?.user_profiles?.email) {
        let emailAffiliateAdmin = affiliateAdminData.user_profiles.email;
        if (isDevelopment && devBlockedEmails.includes(emailAffiliateAdmin)) {
          console.log(`📧 [zelleOrchestrator] Notificação bloqueada para affiliate admin ${emailAffiliateAdmin} em desenvolvimento`);
          emailAffiliateAdmin = '';
        }

        if (emailAffiliateAdmin) {
          const affiliateAdminPayload = {
            tipo_notf: 'Pagamento de aluno do seu seller aprovado',
            email_affiliate_admin: emailAffiliateAdmin,
            nome_affiliate_admin: affiliateAdminData.user_profiles.full_name || 'Affiliate Admin',
            phone_affiliate_admin: affiliateAdminData.user_profiles.phone || '',
            email_aluno: payment.student_email,
            nome_aluno: payment.student_name,
            phone_aluno: '',
            email_seller: sellerData.email,
            nome_seller: sellerData.name,
            phone_seller: sellerPhone || '',
            o_que_enviar: `Pagamento de ${payment.fee_type} no valor de ${payment.amount} do aluno ${payment.student_name} foi aprovado. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
            payment_id: payment.id,
            fee_type: payment.fee_type,
            amount: payment.amount,
            seller_id: sellerData.user_id,
            referral_code: sellerData.referral_code,
          };
          console.log('📧 [zelleOrchestrator] Enviando webhook de aprovação para affiliate admin:', affiliateAdminPayload);
          const affiliateAdminWebhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(affiliateAdminPayload),
          });
          if (affiliateAdminWebhookResponse.ok) {
            console.log('✅ [zelleOrchestrator] Webhook de aprovação para affiliate admin enviado com sucesso');
          } else {
            const errorText = await affiliateAdminWebhookResponse.text();
            console.error('❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para affiliate admin:', affiliateAdminWebhookResponse.status, errorText);
          }
        }
      }

      // Notify seller
      let emailSeller = sellerData.email;
      if (isDevelopment && devBlockedEmails.includes(emailSeller)) {
        console.log(`📧 [zelleOrchestrator] Notificação bloqueada para seller ${emailSeller} em desenvolvimento`);
        emailSeller = '';
      }

      if (emailSeller) {
        const sellerPayload = {
          tipo_notf: 'Pagamento do seu aluno aprovado',
          email_seller: emailSeller,
          nome_seller: sellerData.name,
          phone_seller: sellerPhone || '',
          email_aluno: payment.student_email,
          nome_aluno: payment.student_name,
          o_que_enviar: `Parabéns! O pagamento de ${payment.fee_type} no valor de ${payment.amount} do seu aluno ${payment.student_name} foi aprovado. Você ganhará comissão sobre este pagamento!`,
          payment_id: payment.id,
          fee_type: payment.fee_type,
          amount: payment.amount,
          seller_id: sellerData.user_id,
          referral_code: sellerData.referral_code,
        };
        console.log('📧 [zelleOrchestrator] Enviando webhook de aprovação para seller:', sellerPayload);
        const sellerWebhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sellerPayload),
        });
        if (sellerWebhookResponse.ok) {
          console.log('✅ [zelleOrchestrator] Webhook de aprovação para seller enviado com sucesso');
        } else {
          const errorText = await sellerWebhookResponse.text();
          console.error('❌ [zelleOrchestrator] Erro ao enviar webhook de aprovação para seller:', sellerWebhookResponse.status, errorText);
        }
      }
    }
  } catch (error) {
    console.error('❌ [zelleOrchestrator] Exceção ao enviar notificações para admin/affiliate/seller:', error);
  }
}

export async function rejectZelleFlow(params: {
  supabase: SupabaseClient;
  adminUserId: string;
  payment: PaymentLike;
  reason: string;
}) {
  const { supabase, adminUserId, payment, reason } = params;
  try {
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', adminUserId)
      .single();
    const adminName = adminProfile?.full_name || 'Admin';
    const rejectionPayload = {
      tipo_notf: 'Pagamento rejeitado',
      email_aluno: payment.student_email,
      nome_aluno: payment.student_name,
      email_universidade: '',
      o_que_enviar: `Seu pagamento de ${payment.fee_type} no valor de $${payment.amount} foi rejeitado. Motivo: ${reason}`,
      payment_id: payment.id,
      fee_type: payment.fee_type,
      amount: payment.amount,
      rejection_reason: reason,
      rejected_by: adminName,
    };
    await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rejectionPayload),
    });
  } catch (_) {}

  // Criar notificação in-app para o aluno
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      console.error('❌ [rejectZelleFlow] Access token não encontrado para criar notificação');
      return;
    }

    // Formatar o tipo de taxa de forma amigável
    const feeTypeLabel = String(payment.fee_type || 'payment')
      .replace('_', ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    // Formatar o valor - o amount já vem em dólares (não em centavos)
    // Exemplo: 210.00 já é $210, não precisa dividir por 100
    const amountInDollars = typeof payment.amount === 'number' 
      ? (payment.amount % 1 === 0 ? payment.amount.toString() : payment.amount.toFixed(2))
      : parseFloat(payment.amount) || payment.amount;

    // Usar user_id (UUID de auth.users) para que a Edge Function busque o student_id correto
    const notificationPayload = {
      user_id: payment.user_id, // UUID que referencia auth.users.id
      title: 'Payment Rejected',
      message: `Your ${feeTypeLabel} payment of $${amountInDollars} has been rejected. Reason: ${reason}. Please review and submit a new payment if needed.`,
      link: '/student/dashboard/applications',
    };

    console.log('📤 [rejectZelleFlow] Criando notificação in-app:', notificationPayload);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/create-student-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [rejectZelleFlow] Erro ao criar notificação:', response.status, errorText);
    } else {
      const result = await response.json();
      console.log('✅ [rejectZelleFlow] Notificação in-app criada com sucesso!', result);
    }
  } catch (error) {
    console.error('❌ [rejectZelleFlow] Erro ao criar notificação in-app:', error);
    // Não falhar o processo se a notificação falhar
  }
}


