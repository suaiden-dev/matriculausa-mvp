export interface PaymentRecord {
  id: string;
  student_id: string;
  user_id?: string;
  student_name: string;
  student_email: string;
  university_id: string;
  university_name: string;
  scholarship_id?: string;
  scholarship_title?: string;
  fee_type: 'selection_process' | 'application' | 'scholarship' | 'i20_control_fee' | 'application_fee' | 'scholarship_fee';
  fee_type_global?: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  payment_date?: string;
  stripe_session_id?: string;
  created_at: string;
  payment_method?: 'stripe' | 'zelle' | 'manual';
  payment_proof_url?: string;
  admin_notes?: string;
  zelle_status?: 'pending_verification' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface UniversityPaymentRequest {
  id: string;
  university_id: string;
  amount_usd: number;
  payout_method: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  created_at: string;
  admin_notes?: string;
  payout_details?: Record<string, any>;
  payout_details_preview?: Record<string, any>;
  university?: {
    id: string;
    name: string;
    location?: string;
  };
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

export interface AffiliatePaymentRequest {
  id: string;
  referrer_user_id: string;
  amount_usd: number;
  payout_method: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  created_at: string;
  admin_notes?: string;
  payout_details?: Record<string, any>;
}

export interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  monthlyGrowth: number;
}
