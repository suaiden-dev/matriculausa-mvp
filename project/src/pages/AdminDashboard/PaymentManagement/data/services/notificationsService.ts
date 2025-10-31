import { supabase } from '../../../../../lib/supabase';
import { generateTermAcceptancePDFBlob, type StudentTermAcceptanceData } from '../../../../../utils/pdfGenerator';

export async function sendTermAcceptanceNotificationAfterPayment(userId: string, feeType: string) {
  try {
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name, country, seller_referral_code')
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile) return;

    // Get the most recent term acceptance for this user
    const { data: termAcceptance, error: termError } = await supabase
      .from('comprehensive_term_acceptance')
      .select('term_id, accepted_at, ip_address, user_agent')
      .eq('user_id', userId)
      .eq('term_type', 'checkout_terms')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single();

    if (termError || !termAcceptance) return;

    // Get term content
    const { data: termData, error: termDataError } = await supabase
      .from('application_terms')
      .select('title, content')
      .eq('id', termAcceptance.term_id)
      .single();

    if (termDataError || !termData) return;

    // Get seller data if user has seller_referral_code
    let sellerData: any = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase
        .from('sellers')
        .select('name, email, referral_code, user_id, affiliate_admin_id')
        .eq('referral_code', userProfile.seller_referral_code)
        .single();
      if (sellerResult) sellerData = sellerResult;
    }

    // Get affiliate admin data if seller has affiliate_admin_id
    let affiliateAdminData: { full_name: string; email: string } | null = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase
        .from('affiliate_admins')
        .select('user_id')
        .eq('id', sellerData.affiliate_admin_id)
        .single();
      if (affiliateResult?.user_id) {
        const { data: userProfileResult } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', affiliateResult.user_id)
          .single();
        if (userProfileResult) {
          affiliateAdminData = {
            full_name: userProfileResult.full_name,
            email: userProfileResult.email,
          };
        }
      }
    }
    // Generate PDF
    const pdfData: StudentTermAcceptanceData = {
      student_name: userProfile.full_name,
      student_email: userProfile.email,
      term_title: termData.title,
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address || 'N/A',
      user_agent: termAcceptance.user_agent || 'N/A',
      country: userProfile.country || 'N/A',
      affiliate_code: sellerData?.referral_code || 'N/A',
      term_content: termData.content || ''
    };
    const pdfBlob = generateTermAcceptancePDFBlob(pdfData);
    if (!pdfBlob) throw new Error('PDF generation failed');

    // Build multipart form-data
    const webhookPayload = {
      tipo_notf: 'Student Term Acceptance',
      email_admin: 'admin@matriculausa.com',
      nome_admin: 'Admin MatriculaUSA',
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: sellerData?.email || '',
      nome_seller: sellerData?.name || 'N/A',
      email_affiliate_admin: affiliateAdminData?.email || '',
      nome_affiliate_admin: affiliateAdminData?.full_name || 'N/A',
      o_que_enviar: `Student ${userProfile.full_name} has accepted the ${termData.title} and completed ${feeType} payment via Zelle (manually approved). This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: 'checkout_terms',
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData?.user_id || '',
      referral_code: sellerData?.referral_code || '',
      affiliate_admin_id: sellerData?.affiliate_admin_id || ''
    } as const;

    const formData = new FormData();
    Object.entries(webhookPayload).forEach(([key, value]) => {
      formData.append(key, value != null ? String(value) : '');
    });
    const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
    formData.append('pdf', pdfBlob, fileName);

    await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      body: formData,
    });
  } catch (_) {
    // Intencionalmente silencioso para não quebrar fluxo de pagamento
  }
}


