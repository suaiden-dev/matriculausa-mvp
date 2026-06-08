-- Fix agency_commissions view to resolve seller commissions correctly for dual-role sellers.
CREATE OR REPLACE VIEW agency_commissions AS
SELECT ar.id,
    CASE 
        WHEN s.id IS NOT NULL THEN aa_seller.id 
        ELSE aa_direct.id 
    END AS agency_id,
    up.id AS student_id,
    ar.commission_amount AS amount,
    ar.fee_type,
    ar.created_at,
    ar.payment_amount,
    ar.affiliate_code,
    ar.status,
    ar.pending_commission_amount
   FROM affiliate_referrals ar
     LEFT JOIN affiliate_admins aa_direct ON aa_direct.user_id = ar.referrer_id
     LEFT JOIN sellers s ON s.referral_code = ar.affiliate_code
     LEFT JOIN affiliate_admins aa_seller ON aa_seller.id = s.affiliate_admin_id
     JOIN user_profiles up ON up.user_id = ar.referred_id
  WHERE (ar.commission_amount > 0::numeric OR ar.pending_commission_amount > 0::numeric) 
    AND (CASE 
        WHEN s.id IS NOT NULL THEN aa_seller.id 
        ELSE aa_direct.id 
    END) IS NOT NULL;
