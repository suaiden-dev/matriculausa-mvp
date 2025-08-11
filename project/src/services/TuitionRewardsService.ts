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

    return data;
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
