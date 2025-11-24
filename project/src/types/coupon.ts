export interface PromotionalCoupon {
  id: string;
  code: string;
  name?: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number;
  current_uses: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  excluded_fee_types: string[];
  created_at: string;
  updated_at: string;
}
