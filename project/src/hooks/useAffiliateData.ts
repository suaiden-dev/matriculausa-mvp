import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Verifica se está em desenvolvimento (localhost)
 */
function isDevelopment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost') ||
         window.location.hostname.includes('dev');
}

/**
 * Verifica se deve excluir estudante com email @uorak.com
 */
function shouldExcludeStudent(email: string | null | undefined): boolean {
  if (isDevelopment()) return false; // Em localhost, não excluir
  if (!email) return false; // Se não tem email, não excluir
  return email.toLowerCase().includes('@uorak.com');
}

export interface Affiliate {
  id: string;
  user_id: string;
  full_name: string;
  company_name?: string;
  email: string;
  phone?: string;
  country?: string;
  created_at: string;
  status: 'active' | 'inactive' | 'pending';
  total_sellers: number;
  active_sellers: number;
  total_students: number;
  total_revenue: number;
  is_active: boolean;
  sellers: Seller[];
}

export interface Seller {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  students_count: number;
  total_revenue: number;
}

export interface Student {
  id: string;
  profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  country?: string;
  referred_by_seller_id: string;
  seller_name: string;
  seller_referral_code: string;
  total_paid: number;
  created_at: string;
  status: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  is_scholarship_fee_paid: boolean;
  scholarship_title?: string;
  university_name?: string;
  system_type?: string;
}

export const useAffiliateData = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [allSellers, setAllSellers] = useState<Seller[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar todos os afiliados e seus dados relacionados
  const loadAffiliatesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [AdminAffiliates] Carregando dados de todos os afiliados...', new Date().toISOString());
      console.log('🔍 [AdminAffiliates] VERSÃO ATUALIZADA - Lógica do Seller Dashboard aplicada!');
      console.log('🔍 [AdminAffiliates] Cache busting timestamp:', Date.now());
      console.log('🔍 [AdminAffiliates] FORÇANDO RELOAD - Versão 2.0');
      console.log('🔍 [AdminAffiliates] SUPER ADMIN DASHBOARD - Cache busting:', Math.random());

      // TESTE: Verificar se temos dados básicos primeiro
      const { data: testData, error: testError } = await supabase
        .from('affiliate_admins')
        .select('*')
        .limit(5)
        .abortSignal(AbortSignal.timeout(30000));
      
      console.log('🔍 [AdminAffiliates] TESTE - Dados brutos da tabela affiliate_admins:', testData);
      console.log('🔍 [AdminAffiliates] TESTE - Erro (se houver):', testError);

      // 1. Buscar todos os affiliate admins
      const { data: affiliateAdminsData, error: affiliateAdminsError } = await supabase
        .from('affiliate_admins')
        .select(`
          id,
          user_id,
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false })
        .abortSignal(AbortSignal.timeout(30000));

      if (affiliateAdminsError) {
        throw new Error(`Failed to load affiliate admins: ${affiliateAdminsError.message}`);
      }

      console.log('🔍 [AdminAffiliates] Affiliate admins encontrados:', affiliateAdminsData?.length || 0);

      if (!affiliateAdminsData || affiliateAdminsData.length === 0) {
        setAffiliates([]);
        setAllSellers([]);
        setAllStudents([]);
        return;
      }

      // 2. Buscar perfis dos usuários (separadamente para garantir que funcione)
      const userIds = affiliateAdminsData.map(aa => aa.user_id);
      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          full_name,
          company_name,
          email,
          phone,
          country,
          created_at
        `)
        .in('user_id', userIds)
        .abortSignal(AbortSignal.timeout(30000));

      if (userProfilesError) {
        console.warn('🔍 [AdminAffiliates] Erro ao buscar perfis de usuários:', userProfilesError);
      }

      // Criar mapa de perfis por user_id
      const profilesMap = (userProfilesData || []).reduce((map, profile) => {
        map[profile.user_id] = profile;
        return map;
      }, {} as any);

      console.log('🔍 [AdminAffiliates] Perfis de usuários encontrados:', Object.keys(profilesMap).length);

      // 3. Para cada affiliate admin, buscar seus sellers e dados agregados
      const affiliatesWithData = await Promise.all(
        affiliateAdminsData.map(async (affiliateAdmin: any) => {
          try {
            const affiliateId = affiliateAdmin.id;
            const userProfile = profilesMap[affiliateAdmin.user_id];

            console.log(`🔍 [AdminAffiliates] Processando affiliate: ${userProfile?.full_name || userProfile?.email || 'Nome não encontrado'}`);
            console.log('🔍 [AdminAffiliates] Dados do perfil:', userProfile);

            // Buscar sellers do affiliate
            const { data: sellersData, error: sellersError } = await supabase
              .from('sellers')
              .select(`
                id,
                name,
                email,
                referral_code,
                is_active,
                created_at
              `)
              .eq('affiliate_admin_id', affiliateId)
              .abortSignal(AbortSignal.timeout(30000));

            if (sellersError) {
              console.warn(`Erro ao buscar sellers para affiliate ${affiliateId}:`, sellersError);
            }

            const sellers = sellersData || [];
            console.log(`🔍 [AdminAffiliates] Sellers encontrados para ${userProfile?.full_name}:`, sellers.length);

            // Buscar estudantes referenciados pelos sellers
            let studentsData: any[] = [];
            let totalRevenue = 0;

            if (sellers.length > 0) {
              const sellerCodes = sellers.map((s: any) => s.referral_code);
              
              // Buscar perfis de estudantes que usaram códigos de referral dos sellers
              const { data: userProfilesData, error: userProfilesError } = await supabase
                .from('user_profiles')
                .select(`
                  id,
                  user_id,
                  full_name,
                  email,
                  country,
                  created_at,
                  seller_referral_code,
                  has_paid_selection_process_fee,
                  has_paid_i20_control_fee,
                  system_type,
                  dependents,
                  scholarship_applications (
                    id,
                    is_scholarship_fee_paid,
                    scholarships (
                      title,
                      universities (
                        name
                      )
                    )
                  )
                `)
                .in('seller_referral_code', sellerCodes)
                .eq('role', 'student')
                .abortSignal(AbortSignal.timeout(30000));

              if (!userProfilesError && userProfilesData) {
                // Filtrar estudantes com email @uorak.com (exceto em localhost)
                const filteredProfiles = isDevelopment()
                  ? userProfilesData
                  : userProfilesData.filter((profile: any) => !shouldExcludeStudent(profile.email));

                studentsData = filteredProfiles.map((profile: any) => {
                  // Encontrar o seller que referenciou este estudante
                  const sellerCode = profile.seller_referral_code;
                  const referringSeller = sellers.find((s: any) => s.referral_code === sellerCode);

                  // ✅ CORREÇÃO: Usar a mesma lógica simples do Seller Dashboard
                  let studentRevenue = 0;
                  const systemType = profile.system_type || 'legacy';
                  
                  // Debug para marjorie1454@uorak.com
                  if (profile.email === 'marjorie1454@uorak.com') {
                    console.log('🔍 [useAffiliateData] marjorie1454@uorak.com:', {
                      systemType,
                      hasPaidSelection: profile.has_paid_selection_process_fee,
                      hasPaidI20: profile.has_paid_i20_control_fee,
                      scholarshipApps: profile.scholarship_applications,
                      dependents: profile.dependents
                    });
                  }
                  
                  // Selection Process Fee
                  if (profile.has_paid_selection_process_fee) {
                    const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
                    const dependents = Number(profile.dependents || 0);
                    // ✅ CORREÇÃO: Para simplified, Selection Process Fee é fixo ($350), sem dependentes
                    // Dependentes só afetam Application Fee ($100 por dependente)
                    studentRevenue += systemType === 'simplified' 
                      ? baseSelectionFee 
                      : baseSelectionFee + (dependents * 150);
                  }
                  
                  // Scholarship Fee
                  if (profile.scholarship_applications?.some((app: any) => app.is_scholarship_fee_paid)) {
                    const scholarshipFee = systemType === 'simplified' ? 550 : 900;
                    studentRevenue += scholarshipFee;
                  }
                  
                  // I-20 Control Fee (só conta se scholarship foi pago)
                  if (profile.scholarship_applications?.some((app: any) => app.is_scholarship_fee_paid) && profile.has_paid_i20_control_fee) {
                    studentRevenue += 900; // Sempre $900 para ambos os sistemas
                  }

                  if (profile.email === 'marjorie1454@uorak.com') {
                    console.log('🔍 [useAffiliateData] marjorie1454@uorak.com calculado:', {
                      studentRevenue,
                      breakdown: {
                        selectionPaid: profile.has_paid_selection_process_fee,
                        scholarshipPaid: profile.scholarship_applications?.some((app: any) => app.is_scholarship_fee_paid),
                        i20Paid: profile.has_paid_i20_control_fee
                      },
                      scholarshipApps: profile.scholarship_applications,
                      systemType: profile.system_type
                    });
                  }

                  totalRevenue += studentRevenue;

                  const scholarshipApp = profile.scholarship_applications?.[0];
                  
                  return {
                    id: profile.id,
                    profile_id: profile.id,
                    user_id: profile.user_id,
                    full_name: profile.full_name,
                    email: profile.email,
                    country: profile.country,
                    referred_by_seller_id: referringSeller?.id,
                    seller_name: referringSeller?.name,
                    seller_referral_code: sellerCode,
                    total_paid: studentRevenue,
                    created_at: profile.created_at,
                    status: 'active',
                    has_paid_selection_process_fee: profile.has_paid_selection_process_fee,
                    has_paid_i20_control_fee: profile.has_paid_i20_control_fee,
                    is_scholarship_fee_paid: profile.scholarship_applications?.some((app: any) => app.is_scholarship_fee_paid) || false,
                    scholarship_title: scholarshipApp?.scholarships?.title,
                    university_name: scholarshipApp?.scholarships?.universities?.name,
                    system_type: profile.system_type
                  };
                });

                console.log(`🔍 [AdminAffiliates] Estudantes encontrados para ${userProfile?.full_name}:`, studentsData.length);
              }
            }

            // Calcular estatísticas do affiliate
            const activeSellers = sellers.filter((s: any) => s.is_active).length;
            const totalStudents = studentsData.length;

            // Adicionar contagens de estudantes para cada seller
            const sellersWithCounts = sellers.map((seller: any) => ({
              ...seller,
              students_count: studentsData.filter(s => s.referred_by_seller_id === seller.id).length,
              total_revenue: studentsData
                .filter(s => s.referred_by_seller_id === seller.id)
                .reduce((sum, student) => sum + student.total_paid, 0)
            }));

            return {
              id: affiliateId,
              user_id: affiliateAdmin.user_id,
              full_name: userProfile?.full_name || 'Nome não disponível',
              company_name: userProfile?.company_name,
              email: userProfile?.email || 'Email não disponível',
              phone: userProfile?.phone,
              country: userProfile?.country,
              created_at: affiliateAdmin.created_at,
              status: (affiliateAdmin.is_active ? 'active' : 'inactive') as 'active' | 'inactive' | 'pending',
              total_sellers: sellers.length,
              active_sellers: activeSellers,
              total_students: totalStudents,
              total_revenue: totalRevenue,
              is_active: affiliateAdmin.is_active,
              sellers: sellersWithCounts,
              students: studentsData
            } as Affiliate;
          } catch (err) {
            console.error(`Erro ao processar affiliate ${affiliateAdmin.id}:`, err);
            const userProfile = profilesMap[affiliateAdmin.user_id];
            return {
              id: affiliateAdmin.id,
              user_id: affiliateAdmin.user_id,
              full_name: userProfile?.full_name || 'Nome não disponível',
              company_name: userProfile?.company_name,
              email: userProfile?.email || 'Email não disponível',
              phone: userProfile?.phone,
              country: userProfile?.country,
              created_at: affiliateAdmin.created_at,
              status: (affiliateAdmin.is_active ? 'active' : 'inactive') as 'active' | 'inactive' | 'pending',
              total_sellers: 0,
              active_sellers: 0,
              total_students: 0,
              total_revenue: 0,
              is_active: affiliateAdmin.is_active,
              sellers: [],
              students: []
            } as Affiliate;
          }
        })
      );

      // Consolidar todos os sellers e estudantes
      const allSellersFlat = affiliatesWithData.flatMap((affiliate: any) => affiliate.sellers);
      const allStudentsFlat = affiliatesWithData.flatMap((affiliate: any) => affiliate.students || []);

      console.log('🔍 [AdminAffiliates] Dados consolidados:', {
        affiliates: affiliatesWithData.length,
        totalSellers: allSellersFlat.length,
        totalStudents: allStudentsFlat.length
      });
      
      // Debug: Verificar receita total calculada
      const totalRevenueCalculated = affiliatesWithData.reduce((sum, aff) => sum + (aff.total_revenue || 0), 0);
      console.log('🔍 [AdminAffiliates] RECEITA TOTAL CALCULADA:', totalRevenueCalculated);
      
      // Debug: Verificar receita do mahmood5807 especificamente
      const mahmoodAffiliate = affiliatesWithData.find(aff => aff.email === 'mahmood5807@uorak.com');
      if (mahmoodAffiliate) {
        console.log('🔍 [AdminAffiliates] mahmood5807 receita:', mahmoodAffiliate.total_revenue);
        console.log('🔍 [AdminAffiliates] mahmood5807 sellers:', mahmoodAffiliate.sellers);
        
        // Debug detalhado dos sellers
        mahmoodAffiliate.sellers.forEach((seller, index) => {
          console.log(`🔍 [AdminAffiliates] mahmood5807 seller ${index}:`, {
            name: seller.name,
            email: seller.email,
            total_revenue: seller.total_revenue,
            students_count: seller.students_count
          });
        });
      }

      setAffiliates(affiliatesWithData);
      setAllSellers(allSellersFlat);
      setAllStudents(allStudentsFlat);

    } catch (err: any) {
      console.error('🔍 [AdminAffiliates] Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados dos afiliados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAffiliatesData();
  }, [loadAffiliatesData]);

  return {
    affiliates,
    allSellers,
    allStudents,
    loading,
    error,
    refetch: loadAffiliatesData
  };
};