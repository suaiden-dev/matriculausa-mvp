export interface PaymentRecord {
  id: string;
  student_id: string;
  user_id?: string;
  student_name: string;
  student_email: string;
  university_id: string;
  university_name: string;
  scholarship_id?: string | null;
  scholarship_title?: string;
  fee_type: 'selection_process' | 'application' | 'scholarship' | 'i20_control_fee' | 'application_fee' | 'scholarship_fee';
  fee_type_global?: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  scholarships_ids?: string[];
  payment_date?: string;
  stripe_session_id?: string;
  created_at: string;
  payment_method?: 'stripe' | 'zelle' | 'manual';
  payment_proof_url?: string;
  admin_notes?: string;
  zelle_status?: 'pending_verification' | 'approved' | 'rejected' | string;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_approved_at?: string;
  seller_referral_code?: string | null;
  metadata?: any; // Metadata do pagamento (inclui dados de cupom promocional)
}

export interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  monthlyGrowth: number;
  manualRevenue: number;
}

export interface AdminPaymentsFilters {
  search: string;
  university: string;
  feeType: string;
  status: string;
  dateFrom?: string;
  dateTo?: string;
  affiliate?: string;
  paymentMethod?: string;
}

export interface UniversityPaymentRequest {
  id: string;
  university_id: string;
  university?: { id: string; name: string; location?: string } | null;
  amount_usd: number;
  payout_method: string;
  payout_details_preview?: Record<string, any> | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | string;
  created_at: string;
  admin_notes?: string | null;
}

export interface AffiliatePaymentRequest {
  id: string;
  referrer_user_id: string;
  amount_usd: number;
  payout_method: string;
  payout_details?: Record<string, any> | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | string;
  created_at: string;
  admin_notes?: string | null;
}


