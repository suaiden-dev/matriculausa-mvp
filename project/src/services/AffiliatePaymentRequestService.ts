import { supabase } from '../lib/supabase';

export type AffiliatePaymentRequestStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export interface CreateAffiliatePaymentRequestParams {
  referrerUserId: string;
  amountUsd: number;
  payoutMethod: 'zelle' | 'bank_transfer' | 'stripe';
  payoutDetails: Record<string, any>;
}

export interface AffiliatePaymentRequest {
  id: string;
  referrer_user_id: string;
  amount_usd: number;
  payout_method: 'zelle' | 'bank_transfer' | 'stripe';
  payout_details: Record<string, any> | null;
  status: AffiliatePaymentRequestStatus;
  admin_notes?: string | null;
  created_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  paid_by?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  user?: { full_name?: string | null; email?: string | null };
}

export class AffiliatePaymentRequestService {
  static async createPaymentRequest(params: CreateAffiliatePaymentRequestParams): Promise<void> {
    const { error } = await supabase
      .from('affiliate_payment_requests')
      .insert({
        referrer_user_id: params.referrerUserId,
        amount_usd: params.amountUsd,
        payout_method: params.payoutMethod,
        payout_details: params.payoutDetails,
        status: 'pending'
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  static async listAffiliatePaymentRequests(referrerUserId: string): Promise<AffiliatePaymentRequest[]> {
    const { data, error } = await supabase
      .from('affiliate_payment_requests')
      .select(`
        *,
        user:auth_users!affiliate_payment_requests_referrer_user_id_fkey(email)
      ` as any)
      .eq('referrer_user_id', referrerUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data as unknown as AffiliatePaymentRequest[]) || [];
  }

  static async cancelPaymentRequest(id: string, requesterUserId: string): Promise<void> {
    // Only allow cancelling pending requests
    const { error } = await supabase
      .from('affiliate_payment_requests')
      .update({ status: 'cancelled' })
      .match({ id, referrer_user_id: requesterUserId, status: 'pending' });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Admin functions
  static async listAllPaymentRequests(): Promise<AffiliatePaymentRequest[]> {
    const { data, error } = await supabase
      .from('affiliate_payment_requests')
      .select(`
        *,
        user_profiles!affiliate_payment_requests_referrer_user_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data as unknown as AffiliatePaymentRequest[]) || [];
  }

  static async adminApprove(id: string, adminUserId: string): Promise<void> {
    const { error } = await supabase
      .from('affiliate_payment_requests')
      .update({ status: 'approved', approved_by: adminUserId, approved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');

    if (error) {
      throw new Error(error.message);
    }
  }

  static async adminReject(id: string, adminUserId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('affiliate_payment_requests')
      .update({ status: 'rejected', approved_by: adminUserId, admin_notes: reason, approved_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['pending', 'approved']);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async adminMarkPaid(id: string, adminUserId: string, paymentReference?: string): Promise<void> {
    const { error } = await supabase
      .from('affiliate_payment_requests')
      .update({ status: 'paid', paid_by: adminUserId, paid_at: new Date().toISOString(), payment_reference: paymentReference || null })
      .eq('id', id)
      .in('status', ['approved']);

    if (error) {
      throw new Error(error.message);
    }
  }

  static async adminAddNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('affiliate_payment_requests')
      .update({ admin_notes: notes })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}


