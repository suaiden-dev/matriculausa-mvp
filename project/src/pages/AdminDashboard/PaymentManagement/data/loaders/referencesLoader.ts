import { SupabaseClient } from '@supabase/supabase-js';
import { requestCache } from '../../../../../lib/requestCache';

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
  // Verificar cache primeiro (affiliates mudam ocasionalmente)
  const cached = requestCache.get<any[]>('loadAffiliatesLoader');
  if (cached) {
    return cached;
  }

  // Buscar usuários com role affiliate_admin
  const { data: affiliateAdminsData, error: affiliateAdminsError } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, email')
    .eq('role', 'affiliate_admin')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (affiliateAdminsError) throw affiliateAdminsError;
  if (!affiliateAdminsData || affiliateAdminsData.length === 0) {
    const empty: any[] = [];
    requestCache.set('loadAffiliatesLoader', empty, undefined, 5 * 60 * 1000);
    return empty;
  }

  // ✅ OTIMIZAÇÃO: Buscar todos os affiliate_admins em batch
  const userIds = affiliateAdminsData.map(admin => admin.user_id);
  const { data: affiliateAdminsBatch, error: affiliateAdminsBatchError } = await supabase
    .from('affiliate_admins')
    .select('id, user_id')
    .in('user_id', userIds);

  if (affiliateAdminsBatchError) {
    console.warn('⚠️ [loadAffiliatesLoader] Erro ao buscar affiliate_admins em batch:', affiliateAdminsBatchError);
  }

  // Criar mapa de user_id -> affiliate_admin_id
  const adminIdMap = new Map<string, string>();
  affiliateAdminsBatch?.forEach(admin => {
    if (admin.user_id) {
      adminIdMap.set(admin.user_id, admin.id);
    }
  });

  // ✅ OTIMIZAÇÃO: Buscar todos os sellers em batch (por affiliate_admin_id)
  const affiliateAdminIds = Array.from(adminIdMap.values());
  let sellersBatch: any[] = [];
  
  if (affiliateAdminIds.length > 0) {
    const { data: sellersData, error: sellersError } = await supabase
      .from('sellers')
      .select('id, referral_code, name, email, affiliate_admin_id')
      .in('affiliate_admin_id', affiliateAdminIds)
      .eq('is_active', true);
    
    if (!sellersError && sellersData) {
      sellersBatch = sellersData;
    }
  }

  // ✅ OTIMIZAÇÃO: Buscar sellers por email em batch (fallback)
  const adminEmails = affiliateAdminsData.map(admin => admin.email).filter(Boolean);
  let sellersByEmailBatch: any[] = [];
  
  if (adminEmails.length > 0) {
    const { data: sellersByEmailData, error: sellersByEmailError } = await supabase
      .from('sellers')
      .select('id, referral_code, name, email')
      .in('email', adminEmails)
      .eq('is_active', true);
    
    if (!sellersByEmailError && sellersByEmailData) {
      sellersByEmailBatch = sellersByEmailData;
    }
  }

  // Criar mapa de affiliate_admin_id -> sellers
  const sellersByAdminIdMap = new Map<string, any[]>();
  sellersBatch.forEach(seller => {
    if (seller.affiliate_admin_id) {
      if (!sellersByAdminIdMap.has(seller.affiliate_admin_id)) {
        sellersByAdminIdMap.set(seller.affiliate_admin_id, []);
      }
      sellersByAdminIdMap.get(seller.affiliate_admin_id)!.push(seller);
    }
  });

  // Criar mapa de email -> sellers (fallback)
  const sellersByEmailMap = new Map<string, any[]>();
  sellersByEmailBatch.forEach(seller => {
    if (seller.email) {
      if (!sellersByEmailMap.has(seller.email)) {
        sellersByEmailMap.set(seller.email, []);
      }
      sellersByEmailMap.get(seller.email)!.push(seller);
    }
  });

  // Combinar dados sem loops individuais
  const affiliatesWithSellers = affiliateAdminsData.map((admin) => {
    const affiliateAdminId = adminIdMap.get(admin.user_id);
    let sellers: any[] = [];

    // Primeiro tentar por affiliate_admin_id
    if (affiliateAdminId) {
      sellers = sellersByAdminIdMap.get(affiliateAdminId) || [];
    }

    // Fallback: buscar por email
    if (sellers.length === 0 && admin.email) {
      sellers = sellersByEmailMap.get(admin.email) || [];
    }

    return {
      id: admin.user_id,
      user_id: admin.user_id,
      name: admin.full_name || admin.email,
      email: admin.email,
      referral_code: sellers[0]?.referral_code || null,
      sellers,
    };
  });

  // Armazenar no cache (TTL de 5 minutos - affiliates mudam ocasionalmente)
  requestCache.set('loadAffiliatesLoader', affiliatesWithSellers, undefined, 5 * 60 * 1000);

  return affiliatesWithSellers;
}


