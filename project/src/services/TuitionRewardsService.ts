import { supabase } from '../lib/supabase';
import type { 
  TuitionDiscount, 
  TuitionRedemption, 
  UniversityRewardsAccount,
  UniversityConfirmationData,
  TuitionRedemptionResult 
} from '../types';

export class TuitionRewardsService {
  private static async withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
      return this.withRetry(fn, retries - 1, Math.min(delayMs * 2, 4000));
    }
  }

  // Buscar descontos de tuition disponíveis
  static async getTuitionDiscounts(): Promise<TuitionDiscount[]> {
    const { data, error } = await supabase
      .from('tuition_discounts')
      .select('*')
      .eq('is_active', true)
      .order('cost_coins', { ascending: true });

    if (error) {
      console.error('Error fetching tuition discounts:', error);
      throw new Error('Failed to fetch tuition discounts');
    }

    return data || [];
  }

  // Buscar universidades aprovadas
  static async getApprovedUniversities(): Promise<any[]> {
    const { data, error } = await supabase
      .from('universities')
      .select('id, name, location, website, established_year, student_count, type, campus_size')
      .eq('is_approved', true)
      .eq('participates_in_matricula_rewards', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching approved universities:', error);
      throw new Error('Failed to fetch universities');
    }

    return data || [];
  }

  // Buscar universidades por termo de busca
  static async searchUniversities(searchTerm: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('universities')
      .select('id, name, location, website, established_year, student_count, type, campus_size')
      .eq('is_approved', true)
      .eq('participates_in_matricula_rewards', true)
      .or(`name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error searching universities:', error);
      throw new Error('Failed to search universities');
    }

    return data || [];
  }

  // Obter dados de confirmação da universidade
  static async getUniversityConfirmationData(universityId: string): Promise<UniversityConfirmationData> {
    const { data, error } = await supabase.rpc('get_university_confirmation_data', {
      university_id_param: universityId
    });

    if (error) {
      console.error('Error fetching university confirmation data:', error);
      throw new Error('Failed to fetch university data');
    }

    return data;
  }

  // Resgatar desconto de tuition
  static async redeemTuitionDiscount(
    userId: string,
    universityId: string,
    discountId: string
  ): Promise<TuitionRedemptionResult> {
    const { data, error } = await supabase.rpc('redeem_tuition_discount', {
      user_id_param: userId,
      university_id_param: universityId,
      discount_id_param: discountId
    });

    if (error) {
      console.error('Error redeeming tuition discount:', error);
      throw new Error(error.message || 'Failed to redeem tuition discount');
    }

    // Enviar notificação para a universidade via Edge Function
    try {
      await this.notifyUniversityOfRedemption(data);
      console.log('✅ University notification sent successfully');
    } catch (notificationError) {
      console.warn('⚠️ Failed to send university notification:', notificationError);
      // Não falhar o resgate se a notificação falhar
    }

    return data;
  }

  // Notificar universidade sobre resgate de desconto
  private static async notifyUniversityOfRedemption(redemptionData: {
    user_id?: string;
    university_id?: string;
    university_name?: string;
    discount_id?: string;
    discount_amount?: number;
    cost_coins?: number;
    redemption_id?: string;
  }): Promise<void> {
    // Validação dos campos obrigatórios antes de prosseguir
    if (!redemptionData.user_id || !redemptionData.university_id || !redemptionData.university_name || !redemptionData.discount_amount || !redemptionData.redemption_id) {
      console.error('❌ ===== CAMPOS OBRIGATÓRIOS AUSENTES NO REDEMPTION DATA =====');
      console.error('📋 Dados recebidos:', redemptionData);
      console.error('🔍 Campos obrigatórios:');
      console.error('  - user_id:', !!redemptionData.user_id, '->', redemptionData.user_id);
      console.error('  - university_id:', !!redemptionData.university_id, '->', redemptionData.university_id);
      console.error('  - university_name:', !!redemptionData.university_name, '->', redemptionData.university_name);
      console.error('  - discount_amount:', !!redemptionData.discount_amount, '->', redemptionData.discount_amount);
      console.error('  - redemption_id:', !!redemptionData.redemption_id, '->', redemptionData.redemption_id);
      throw new Error('Campos obrigatórios ausentes para notificação da universidade');
    }
    try {
      // Buscar dados adicionais necessários para a notificação
      const userProfileResult = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('user_id', redemptionData.user_id)
        .single();

      if (userProfileResult.error) {
        console.warn('Could not fetch user profile for notification:', userProfileResult.error);
      }

      const discountDataResult = await supabase
        .from('tuition_discounts')
        .select('name, discount_type')
        .eq('id', redemptionData.discount_id || '')
        .single();

      if (discountDataResult.error) {
        console.warn('Could not fetch discount data for notification:', discountDataResult.error);
      }

      // Log para debug dos dados recebidos
      console.log('🔍 ===== DADOS DO RESGATE RECEBIDOS =====');
      console.log('📋 Redemption Data:', redemptionData);
      console.log('👤 User Profile Data:', userProfileResult.data);
      console.log('🏫 Discount Data:', discountDataResult.data);

      // Preparar payload para a Edge Function
      const notificationPayload = {
        student_id: redemptionData.user_id,
        student_name: userProfileResult.data?.full_name || 'Unknown Student',
        student_email: userProfileResult.data?.email || '',
        university_id: redemptionData.university_id,
        university_name: redemptionData.university_name || 'Unknown University',
        university_email: '', // Será buscado pela Edge Function se não fornecido
        discount_amount: redemptionData.discount_amount,
        discount_type: discountDataResult.data?.discount_type || 'Tuition Discount',
        cost_coins: redemptionData.cost_coins,
        redemption_id: redemptionData.redemption_id
      };

      // Log para debug do payload final
      console.log('📦 ===== PAYLOAD FINAL PARA NOTIFICAÇÃO =====');
      console.log('📋 Notification Payload:', notificationPayload);
      console.log('🔍 Campos obrigatórios verificados:');
      console.log('  - student_id:', !!notificationPayload.student_id, '->', notificationPayload.student_id);
      console.log('  - student_name:', !!notificationPayload.student_name, '->', notificationPayload.student_name);
      console.log('  - university_id:', !!notificationPayload.university_id, '->', notificationPayload.university_id);
      console.log('  - university_name:', !!notificationPayload.university_name, '->', notificationPayload.university_name);
      console.log('  - discount_amount:', !!notificationPayload.discount_amount, '->', notificationPayload.discount_amount);
      console.log('  - redemption_id:', !!notificationPayload.redemption_id, '->', notificationPayload.redemption_id);

      console.log('📧 Sending university notification:', notificationPayload);

      // Chamar Edge Function de notificação
      const notificationResult = await supabase.functions.invoke('notify-university-discount-redemption', {
        body: notificationPayload
      });

      if (notificationResult.error) {
        throw new Error(`Notification failed: ${notificationResult.error.message}`);
      }

    } catch (error) {
      console.error('Error in notifyUniversityOfRedemption:', error);
      throw error;
    }
  }

  // Buscar histórico de resgates do usuário
  static async getUserTuitionRedemptions(userId: string): Promise<TuitionRedemption[]> {
    const { data, error } = await supabase
      .from('tuition_redemptions')
      .select(`
        *,
        discount:tuition_discounts(*),
        university:universities(*)
      `)
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false });

    if (error) {
      console.error('Error fetching user tuition redemptions:', error);
      throw new Error('Failed to fetch redemption history');
    }

    return data || [];
  }

  // Buscar conta de recompensas da universidade (resiliente a falhas de rede)
  static async getUniversityRewardsAccount(universityId: string): Promise<UniversityRewardsAccount | null> {
    try {
      const { data, error } = await this.withRetry(() =>
        supabase
          .from('university_rewards_account')
          .select('*')
          .eq('university_id', universityId)
          .single()
      );

      if (error && (error as any).code !== 'PGRST116') {
        console.error('Error fetching university rewards account:', error);
        // Fallback: retornar null para não quebrar a página em falhas transitórias
        return null;
      }

      return data as any;
    } catch (e: any) {
      // Falha de rede após tentativas
      console.warn('Network issue while fetching university rewards account. Using fallback null.', e?.message || e);
      return null;
    }
  }

  // Buscar histórico de resgates recebidos pela universidade
  static async getUniversityReceivedRedemptions(universityId: string): Promise<TuitionRedemption[]> {
    const { data, error } = await supabase
      .from('tuition_redemptions')
      .select('*')
      .eq('university_id', universityId)
      .order('redeemed_at', { ascending: false });

    if (error) {
      console.error('Error fetching university received redemptions:', error);
      throw new Error('Failed to fetch university redemption history');
    }

    // Enriquecimento de usuário e desconto
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const discountIds = [...new Set(data.map((r) => r.discount_id))];
      const { data: discounts } = await supabase
        .from('tuition_discounts')
        .select('*')
        .in('id', discountIds);

      const userMap = new Map((userProfiles || []).map((u: any) => [u.user_id, u]));
      const discountMap = new Map((discounts || []).map((d: any) => [d.id, d]));

      return data.map((r: any) => ({
        ...r,
        user: userMap.get(r.user_id),
        discount: discountMap.get(r.discount_id)
      }));
    }

    return data || [];
  }

  // Buscar estatísticas da universidade
  static async getUniversityRewardsStats(universityId: string): Promise<{
    totalReceivedCoins: number;
    totalDiscountsSent: number;
    totalDiscountAmount: number;
    balanceCoins: number;
    recentRedemptions: number;
  }> {
    const account = await this.getUniversityRewardsAccount(universityId);
    const recentRedemptions = await this.getUniversityReceivedRedemptions(universityId);

    return {
      totalReceivedCoins: account?.total_received_coins || 0,
      totalDiscountsSent: account?.total_discounts_sent || 0,
      totalDiscountAmount: account?.total_discount_amount || 0,
      balanceCoins: account?.balance_coins || 0,
      recentRedemptions: recentRedemptions.filter((r) => r.status === 'confirmed').length
    };
  }
}
