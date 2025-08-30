import { supabase } from '../lib/supabase';

export interface UniversityPaymentRequest {
  id: string;
  university_id: string;
  requested_by: string;
  amount_coins: number;
  amount_usd: number;
  payout_method: 'zelle' | 'bank_transfer' | 'stripe';
  payout_details_preview: Record<string, any>;
  payout_details_encrypted?: any;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  paid_by?: string;
  paid_at?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  university?: {
    name: string;
    location?: string;
  };
  user?: {
    full_name?: string;
    email?: string;
  };
  payout_invoices?: Array<{
    invoice_number: string;
    status: string;
  }>;
}

export interface CreatePaymentRequestData {
  universityId: string;
  userId: string;
  amount: number;
  payoutMethod: 'zelle' | 'bank_transfer' | 'stripe';
  payoutDetails: Record<string, any>;
}

export class UniversityPaymentRequestService {
  /**
   * Cria uma nova solicitação de pagamento
   */
  static async createPaymentRequest(data: CreatePaymentRequestData): Promise<UniversityPaymentRequest> {
    try {
      console.log('🔍 [Service] Creating payment request with:', {
        function: 'create_university_payment_request',
        universityId: data.universityId,
        userId: data.userId,
        amount: data.amount,
        method: data.payoutMethod
      });

      const { data: result, error } = await supabase
        .rpc('create_university_payment_request', {
          university_id_param: data.universityId,
          user_id_param: data.userId,
          amount_usd_param: data.amount,
          payout_method_param: data.payoutMethod,
          payout_details_param: data.payoutDetails
        });

      if (error) {
        console.error('❌ [Service] RPC error:', error);
        throw error;
      }

      console.log('✅ [Service] Payment request created successfully:', result);
      return result;
    } catch (error: any) {
      console.error('❌ [Service] Error creating payment request:', error);
      throw new Error(error.message || 'Failed to create payment request');
    }
  }

  /**
   * Lista todas as solicitações de pagamento (para admin)
   */
  static async listAllPaymentRequests(): Promise<UniversityPaymentRequest[]> {
    try {
      console.log('🔍 [Service] Starting listAllPaymentRequests...');
      
      const { data, error } = await supabase
        .from('university_payout_requests')
        .select(`
          *,
          university:universities(name, location),
          payout_invoices(invoice_number, status)
        `)
        .eq('request_type', 'university_payment')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [Service] Supabase error:', error);
        throw error;
      }

      console.log('📊 [Service] Supabase response:', { data: data?.length || 0, error });

      if (!data || data.length === 0) {
        console.log('📋 [Service] Raw data: Array(0)');
        return [];
      }

      // Buscar dados dos usuários para cada request
      const requestsWithUsers = await Promise.all(
        data.map(async (request) => {
          try {
            // CORREÇÃO: Buscar primeiro na tabela auth.users (onde está o email real)
            // e depois na user_profiles como fallback
            let userData = null;
            
            try {
              // Primeiro tentar buscar na tabela auth.users
              const { data: authUserData } = await supabase
                .from('auth.users')
                .select('email, raw_user_meta_data')
                .eq('id', request.requested_by)
                .single();
              
              if (authUserData) {
                userData = {
                  full_name: authUserData.raw_user_meta_data?.full_name || authUserData.email,
                  email: authUserData.email
                };
              }
            } catch (authError) {
              console.warn('⚠️ [Service] Failed to fetch from auth.users:', authError);
            }
            
            // Se não encontrou na auth.users, tentar na user_profiles
            if (!userData) {
              try {
                const { data: profileUserData } = await supabase
                  .from('user_profiles')
                  .select('full_name, email')
                  .eq('user_id', request.requested_by)
                  .single();
                
                if (profileUserData) {
                  userData = profileUserData;
                }
              } catch (profileError) {
                console.warn('⚠️ [Service] Failed to fetch from user_profiles:', profileError);
              }
            }

            return {
              ...request,
              user: userData || { full_name: 'Unknown', email: 'Unknown' }
            };
          } catch (userError) {
            console.warn('⚠️ [Service] Failed to fetch user data for request:', request.id, userError);
            return {
              ...request,
              user: { full_name: 'Unknown', email: 'Unknown' }
            };
          }
        })
      );

      console.log('✅ [Service] Final result:', requestsWithUsers.length, 'requests');
      return requestsWithUsers;
    } catch (error: any) {
      console.error('❌ [Service] Error in listAllPaymentRequests:', error);
      throw error;
    }
  }

  /**
   * Obtém uma solicitação específica
   */
  static async getPaymentRequest(requestId: string): Promise<UniversityPaymentRequest | null> {
    try {
      const { data, error } = await supabase
        .from('university_payout_requests')
        .select(`
          *,
          university:universities(name, location),
          payout_invoices(invoice_number, status)
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;
      
      if (!data) return null;
      
      // Get user details separately since requested_by is a reference to auth.users
      try {
        let userData = null;
        
        try {
          // Primeiro tentar buscar na tabela auth.users
          const { data: authUserData } = await supabase
            .from('auth.users')
            .select('email, raw_user_meta_data')
            .eq('id', data.requested_by)
            .single();
          
          if (authUserData) {
            userData = {
              full_name: authUserData.raw_user_meta_data?.full_name || authUserData.email,
              email: authUserData.email
            };
          }
        } catch (authError) {
          console.warn('⚠️ [Service] Failed to fetch from auth.users:', authError);
        }
        
        // Se não encontrou na auth.users, tentar na user_profiles
        if (!userData) {
          try {
            const { data: profileUserData } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', data.requested_by)
              .single();
            
            if (profileUserData) {
              userData = profileUserData;
            }
          } catch (profileError) {
            console.warn('⚠️ [Service] Failed to fetch from user_profiles:', profileError);
          }
        }
        
        return {
          ...data,
          user: userData || { full_name: 'Unknown', email: 'Unknown' }
        };
      } catch {
        return {
          ...data,
          user: { full_name: 'Unknown', email: 'Unknown' }
        };
      }
    } catch (error: any) {
      console.error('Error getting payment request:', error);
      throw new Error(error.message || 'Failed to get payment request');
    }
  }

  /**
   * Cancela uma solicitação de pagamento (apenas universidade)
   */
  static async cancelPaymentRequest(requestId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('university_payout_requests')
        .update({
          status: 'cancelled',
          cancelled_by: userId,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending'); // Só pode cancelar se estiver pendente

      if (error) throw error;
    } catch (error: any) {
      console.error('Error cancelling payment request:', error);
      throw new Error(error.message || 'Failed to cancel payment request');
    }
  }

  /**
   * Admin aprova uma solicitação
   */
  static async adminApprove(requestId: string, adminId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('university_payout_requests')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) throw error;
    } catch (error: any) {
      console.error('Error approving payment request:', error);
      throw new Error(error.message || 'Failed to approve payment request');
    }
  }

  /**
   * Admin marca como pago
   */
  static async adminMarkPaid(requestId: string, adminId: string, paymentReference?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('university_payout_requests')
        .update({
          status: 'paid',
          paid_by: adminId,
          paid_at: new Date().toISOString(),
          admin_notes: paymentReference ? `Payment reference: ${paymentReference}` : undefined
        })
        .eq('id', requestId)
        .in('status', ['pending', 'approved']);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking payment request as paid:', error);
      throw new Error(error.message || 'Failed to mark payment request as paid');
    }
  }

  /**
   * Admin rejeita uma solicitação
   */
  static async adminReject(requestId: string, adminId: string, reason: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('university_payout_requests')
        .update({
          status: 'rejected',
          admin_notes: reason
        })
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) throw error;
    } catch (error: any) {
      console.error('Error rejecting payment request:', error);
      throw new Error(error.message || 'Failed to reject payment request');
    }
  }

  /**
   * Admin adiciona notas
   */
  static async adminAddNotes(requestId: string, notes: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('university_payout_requests')
        .update({
          admin_notes: notes
        })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error adding admin notes:', error);
      throw new Error(error.message || 'Failed to add admin notes');
    }
  }

  /**
   * Lista as solicitações de pagamento de uma universidade específica
   */
  static async listUniversityPaymentRequests(universityId: string): Promise<UniversityPaymentRequest[]> {
    try {
      const { data, error } = await supabase
        .from('university_payout_requests')
        .select(`
          *,
          university:universities(name, location),
          payout_invoices(invoice_number, status)
        `)
        .eq('university_id', universityId)
        .eq('request_type', 'university_payment')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados dos usuários para cada request
      const requestsWithUsers = await Promise.all(
        data.map(async (request) => {
          try {
            let userData = null;
            
            try {
              // Primeiro tentar buscar na tabela auth.users
              const { data: authUserData } = await supabase
                .from('auth.users')
                .select('email, raw_user_meta_data')
                .eq('id', request.requested_by)
                .single();
              
              if (authUserData) {
                userData = {
                  full_name: authUserData.raw_user_meta_data?.full_name || authUserData.email,
                  email: authUserData.email
                };
              }
            } catch (authError) {
              console.warn('⚠️ [Service] Failed to fetch from auth.users:', authError);
            }
            
            // Se não encontrou na auth.users, tentar na user_profiles
            if (!userData) {
              try {
                const { data: profileUserData } = await supabase
                  .from('user_profiles')
                  .select('full_name, email')
                  .eq('user_id', request.requested_by)
                  .single();
                
                if (profileUserData) {
                  userData = profileUserData;
                }
              } catch (profileError) {
                console.warn('⚠️ [Service] Failed to fetch from user_profiles:', profileError);
              }
            }

            return {
              ...request,
              user: userData || { full_name: 'Unknown', email: 'Unknown' }
            };
          } catch (userError) {
            return {
              ...request,
              user: { full_name: 'Unknown', email: 'Unknown' }
            };
          }
        })
      );

      return requestsWithUsers;
    } catch (error: any) {
      console.error('Error listing university payment requests:', error);
      throw new Error('Failed to list university payment requests');
    }
  }
}
