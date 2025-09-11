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
  static async createPaymentRequest(params: CreateAffiliatePaymentRequestParams): Promise<AffiliatePaymentRequest> {
    const { data, error } = await supabase
      .from('affiliate_payment_requests')
      .insert({
        referrer_user_id: params.referrerUserId,
        amount_usd: params.amountUsd,
        payout_method: params.payoutMethod,
        payout_details: params.payoutDetails,
        status: 'pending'
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as unknown as AffiliatePaymentRequest;
  }

  static async listAffiliatePaymentRequests(referrerUserId: string): Promise<AffiliatePaymentRequest[]> {
    const { data, error, status } = await supabase
      .from('affiliate_payment_requests')
      .select('*')
      .eq('referrer_user_id', referrerUserId)
      .order('created_at', { ascending: false });

    if (error) {
      const msg = (error as any)?.message || String(error);
      // Graceful fallback when table is not present yet in the environment
      if (status === 404 || /does not exist/i.test(msg)) {
        console.warn('affiliate_payment_requests table not found. Returning empty list for now.');
        return [];
      }
      throw new Error(msg);
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
    const { data, error } = await supabase.rpc('get_all_affiliate_payment_requests');
    if (error) {
      throw new Error(error.message);
    }
    return (data as unknown as AffiliatePaymentRequest[]) || [];
  }

  static async adminApprove(id: string, adminUserId: string): Promise<void> {
    const { error } = await supabase.rpc('admin_approve_affiliate_payment_request', { p_id: id, p_admin: adminUserId });
    if (error) throw new Error(error.message);
  }

  static async adminReject(id: string, adminUserId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('admin_reject_affiliate_payment_request', { p_id: id, p_admin: adminUserId, p_reason: reason });
    if (error) throw new Error(error.message);
  }

  static async adminMarkPaid(id: string, adminUserId: string, paymentReference?: string): Promise<void> {
    const { error } = await supabase.rpc('admin_mark_paid_affiliate_payment_request', { p_id: id, p_admin: adminUserId, p_reference: paymentReference || null });
    if (error) throw new Error(error.message);
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


