import { supabase } from '../lib/supabase';

interface NotificationData {
  user_id: string;
  user_email: string;
  user_full_name: string;
  term_title: string;
  term_type: string;
  accepted_at: string;
  ip_address?: string;
}

/**
 * Sends notification when a student accepts terms
 * This follows the existing notification pattern from PaymentManagement and other components
 */
export const sendTermAcceptanceNotification = async (data: NotificationData): Promise<void> => {
  try {
    console.log('📧 [termAcceptanceNotification] Sending term acceptance notification for:', data.user_email);

    // Get user profile information
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('seller_referral_code, full_name, email, country, phone')
      .eq('user_id', data.user_id)
      .single();

    if (userError) {
      console.error('❌ Error fetching user profile for notification:', userError);
      return;
    }

    // If user doesn't have a seller referral code, they're not part of the affiliate system
    if (!userProfile.seller_referral_code) {
      console.log('ℹ️ User is not part of affiliate system, no notification needed');
      return;
    }

    // Get seller information
    const { data: sellerData, error: sellerError } = await supabase
      .from('sellers')
      .select(`
        user_id,
        name,
        email,
        referral_code,
        commission_rate,
        affiliate_admin_id
      `)
      .eq('referral_code', userProfile.seller_referral_code)
      .single();

    if (sellerError) {
      console.error('❌ Error fetching seller data for notification:', sellerError);
      return;
    }

    // Get affiliate admin information if available
    let affiliateAdminData = null;
    if (sellerData.affiliate_admin_id) {
      const { data: affiliateAdmin, error: affiliateError } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('user_id', sellerData.affiliate_admin_id)
        .single();

      if (!affiliateError && affiliateAdmin) {
        affiliateAdminData = affiliateAdmin;
      }
    }

    // Prepare notification payload following the existing pattern
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_admin: "admin@matriculausa.com",
      nome_admin: "Admin MatriculaUSA",
      email_aluno: data.user_email,
      nome_aluno: data.user_full_name,
      email_seller: sellerData.email,
      nome_seller: sellerData.name,
      email_affiliate_admin: affiliateAdminData?.email || "",
      nome_affiliate_admin: affiliateAdminData?.full_name || "Affiliate Admin",
      o_que_enviar: `Student ${data.user_full_name} has accepted the ${data.term_title}. This shows the student is progressing through the enrollment process. Seller responsible: ${sellerData.name} (${sellerData.referral_code})`,
      term_title: data.term_title,
      term_type: data.term_type,
      accepted_at: data.accepted_at,
      ip_address: data.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData.user_id,
      referral_code: sellerData.referral_code,
      affiliate_admin_id: sellerData.affiliate_admin_id
    };

    console.log('📧 [termAcceptanceNotification] Sending webhook with payload:', webhookPayload);

    // Send webhook notification
    const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (webhookResponse.ok) {
      console.log('✅ [termAcceptanceNotification] Notification sent successfully!');
    } else {
      const errorText = await webhookResponse.text();
      console.warn('⚠️ [termAcceptanceNotification] Error sending notification:', webhookResponse.status, errorText);
    }

  } catch (error) {
    console.error('❌ [termAcceptanceNotification] Error sending term acceptance notification:', error);
    // Don't throw error to avoid breaking the term acceptance process
  }
};