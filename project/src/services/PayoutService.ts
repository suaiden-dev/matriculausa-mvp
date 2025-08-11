import { supabase } from '../lib/supabase';
import type { UniversityPayoutRequest, PayoutInvoice, PayoutMethod } from '../types';

export class PayoutService {
  static async requestPayout(params: {
    universityId: string;
    userId: string;
    amountCoins: number;
    payoutMethod: PayoutMethod;
    payoutDetails: Record<string, any>;
  }): Promise<{ request_id: string; invoice_number: string; status: string }> {
    const { data, error } = await supabase.rpc('request_university_payout', {
      university_id_param: params.universityId,
      user_id_param: params.userId,
      amount_coins_param: params.amountCoins,
      payout_method_param: params.payoutMethod,
      payout_details_param: params.payoutDetails
    });

    if (error) {
      console.error('Error requesting payout:', error);
      throw new Error(error.message || 'Failed to request payout');
    }

    return data;
  }

  static async cancelPayout(requestId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('cancel_university_payout', {
      request_id_param: requestId,
      user_id_param: userId
    });

    if (error) {
      console.error('Error cancelling payout:', error);
      throw new Error(error.message || 'Failed to cancel payout');
    }

    return data;
  }

  static async listUniversityPayouts(universityId: string): Promise<UniversityPayoutRequest[]> {
    const { data, error } = await supabase
      .from('university_payout_requests')
      .select('*, payout_invoices(invoice_number)')
      .eq('university_id', universityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout requests:', error);
      throw new Error('Failed to fetch payout requests');
    }

    return data as any;
  }

  static async listAllPayouts(): Promise<UniversityPayoutRequest[]> {
    const { data, error } = await supabase
      .from('university_payout_requests')
      .select('*, universities(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all payout requests:', error);
      throw new Error('Failed to fetch all payout requests');
    }

    return data as any;
  }

  static async listPayoutInvoices(universityId: string): Promise<PayoutInvoice[]> {
    const { data, error } = await supabase
      .from('payout_invoices')
      .select('*, university_payout_requests!inner(university_id)')
      .eq('university_payout_requests.university_id', universityId)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout invoices:', error);
      throw new Error('Failed to fetch payout invoices');
    }

    return data as any;
  }

  // Admin actions
  static async adminApprove(requestId: string, adminId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_approve_payout', {
      request_id_param: requestId,
      admin_id_param: adminId
    });
    if (error) {
      console.error('Error approving payout:', error);
      throw new Error(error.message || 'Failed to approve payout');
    }
    return data;
  }

  static async adminMarkPaid(requestId: string, adminId: string, txReference?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_mark_payout_paid', {
      request_id_param: requestId,
      admin_id_param: adminId,
      tx_reference: txReference || null
    });
    if (error) {
      console.error('Error marking payout as paid:', error);
      throw new Error(error.message || 'Failed to mark paid');
    }
    return data;
  }

  static async adminReject(requestId: string, adminId: string, reason: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_reject_payout', {
      request_id_param: requestId,
      admin_id_param: adminId,
      reason
    });
    if (error) {
      console.error('Error rejecting payout:', error);
      throw new Error(error.message || 'Failed to reject payout');
    }
    return data;
  }
}
