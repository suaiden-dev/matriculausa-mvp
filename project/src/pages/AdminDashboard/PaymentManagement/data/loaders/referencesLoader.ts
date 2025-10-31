import { SupabaseClient } from '@supabase/supabase-js';
import { requestCache } from '../../../../lib/requestCache';

export async function loadUniversitiesLoader(supabase: SupabaseClient) {
  // Verificar cache primeiro (universities mudam raramente)
  const cached = requestCache.get<any[]>('loadUniversitiesLoader');
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('universities')
    .select('id, name')
    .eq('is_approved', true)
    .order('name');
  if (error) throw error;
  
  const result = data || [];
  
  // Armazenar no cache (TTL longo porque universities mudam raramente)
  requestCache.set('loadUniversitiesLoader', result, undefined, 10 * 60 * 1000);
  
  return result;
}

export async function loadAffiliatesLoader(supabase: SupabaseClient) {
  // Buscar usuários com role affiliate_admin
  const { data: affiliateAdminsData, error: affiliateAdminsError } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, email')
    .eq('role', 'affiliate_admin')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (affiliateAdminsError) throw affiliateAdminsError;
  if (!affiliateAdminsData) return [];

  const affiliatesWithSellers = await Promise.all(
    affiliateAdminsData.map(async (admin) => {
      // Buscar affiliate_admin_id
      const { data: affiliateAdminData } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', admin.user_id)
        .single();

      let sellers: any[] = [];
      if (affiliateAdminData) {
        const { data: sellersData } = await supabase
          .from('sellers')
          .select('id, referral_code, name, email')
          .eq('affiliate_admin_id', affiliateAdminData.id)
          .eq('is_active', true);
        sellers = sellersData || [];
      }
      if (sellers.length === 0) {
        const { data: sellersByEmail } = await supabase
          .from('sellers')
          .select('id, referral_code, name, email')
          .eq('email', admin.email)
          .eq('is_active', true);
        sellers = sellersByEmail || [];
      }

      return {
        id: admin.user_id,
        user_id: admin.user_id,
        name: admin.full_name || admin.email,
        email: admin.email,
        referral_code: sellers[0]?.referral_code || null,
        sellers,
      };
    })
  );

  return affiliatesWithSellers;
}


