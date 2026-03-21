export interface Term {
  id: string;
  title: string;
  content: string;
  term_type: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'stripe' | 'zelle' | 'pix' | 'parcelow';

export interface ValidationResult {
  isValid: boolean;
  message: string;
  discountAmount?: number;
  isSelfReferral?: boolean;
}

export interface PromotionalCouponValidation {
  isValid: boolean;
  message: string;
  discountAmount?: number;
  finalAmount?: number;
  couponId?: string;
}
