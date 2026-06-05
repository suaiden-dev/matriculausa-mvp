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
  if (isDevelopment()) return false; 
  if (!email) return false;
  return email.toLowerCase().includes('@uorak.com');
}

export interface CommissionRule {
  type: 'fixed' | 'percentage';
  value: number;
  enabled?: boolean;                        // default true quando ausente (backward compat)
  trigger?: 'on_payment' | 'on_last_fee';  // default 'on_payment' quando ausente
}

export interface CommissionRules {
  selection_process?: CommissionRule;
  application?: CommissionRule;
  placement?: CommissionRule;
  i20_control?: CommissionRule;
  reinstatement?: CommissionRule;
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
  total_commission: number | null;
  is_active: boolean;
  commission_per_sale: number | null;
  commission_rules?: CommissionRules;
  sellers: Seller[];
  students: Student[];
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
  is_application_fee_paid: boolean;
  system_type?: string;
  dependents?: number;
}

// Agencies whose revenue must not be recalculated — keep hardcoded estimates.
// To unprotect an agency, remove its ID from this set.
const PROTECTED_AGENCY_IDS = new Set([
  '525e4fba-5743-49c0-8ab8-f0dba284bc7a', // Brant Immigration
  'fa01ff90-b78f-4362-990a-f9d9c24e2445', // The Future of English
]);

export const useAffiliateData = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [allSellers, setAllSellers] = useState<Seller[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAffiliatesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Buscar todos os affiliate admins
      const { data: affiliateAdminsData, error: affiliateAdminsError } = await supabase
        .from('affiliate_admins')
        .select('id, user_id, is_active, created_at, commission_per_sale, commission_rules, logo_url')
        .order('created_at', { ascending: false });

      if (affiliateAdminsError) throw affiliateAdminsError;
      if (!affiliateAdminsData || affiliateAdminsData.length === 0) {
        setAffiliates([]); setAllSellers([]); setAllStudents([]);
        return;
      }

      // 2. Buscar perfis dos admins
      const userIds = affiliateAdminsData.map(aa => aa.user_id);
      const { data: userProfilesData } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, company_name, email, phone, country')
        .in('user_id', userIds);

      const profilesMap = (userProfilesData || []).reduce((map, profile) => {
        map[profile.user_id] = profile;
        return map;
      }, {} as any);

      // 3. Processar cada affiliate
      const affiliatesWithData = await Promise.all(
        affiliateAdminsData.map(async (affiliateAdmin: any) => {
          const affiliateId = affiliateAdmin.id;
          const userProfile = profilesMap[affiliateAdmin.user_id];

          // Buscar sellers
          const { data: sellersData } = await supabase
            .from('sellers')
            .select('id, name, email, referral_code, is_active, created_at')
            .eq('affiliate_admin_id', affiliateId);

          const sellers = sellersData || [];
          let studentsData: any[] = [];
          let totalRevenue = 0;
          let totalCommission: number | null = null;

          if (sellers.length > 0) {
            const sellerCodes = sellers.map((s: any) => s.referral_code);
            const { data: stdData } = await supabase
              .from('user_profiles')
              .select('*')
              .in('seller_referral_code', sellerCodes);

            if (stdData) {
              const filtered = isDevelopment() ? stdData : stdData.filter(p => !shouldExcludeStudent(p.email));

              // Fetch real payment amounts for these students
              const studentUserIds = filtered.map((p: any) => p.user_id).filter(Boolean);
              let realPaymentsMap: Record<string, number> = {};
              if (studentUserIds.length > 0) {
                const { data: feePayments } = await supabase
                  .from('individual_fee_payments')
                  .select('user_id, amount')
                  .in('user_id', studentUserIds);
                (feePayments || []).forEach((p: any) => {
                  if (p.user_id && p.amount != null) {
                    realPaymentsMap[p.user_id] = (realPaymentsMap[p.user_id] || 0) + Number(p.amount);
                  }
                });
              }

              studentsData = filtered.map((profile: any) => {
                const referringSeller = sellers.find((s: any) => s.referral_code === profile.seller_referral_code);
                const sysType = profile.system_type || 'legacy';
                const dependents = Number(profile.dependents || 0);

                // Use real payment data when available; fall back to hardcoded estimates for legacy/pre-system records
                let revenue = 0;
                if (realPaymentsMap[profile.user_id] != null) {
                  revenue = realPaymentsMap[profile.user_id];
                } else {
                  if (profile.has_paid_selection_process_fee) {
                    revenue += sysType === 'simplified' ? 350 : 400 + (dependents * 150);
                  }
                  if (profile.is_scholarship_fee_paid) revenue += 900;
                  if (profile.has_paid_i20_control_fee) revenue += 900;
                  if (profile.is_application_fee_paid) revenue += 100;
                }

                totalRevenue += revenue;

                return {
                  id: profile.id,
                  profile_id: profile.id,
                  user_id: profile.user_id,
                  full_name: profile.full_name,
                  email: profile.email,
                  country: profile.country,
                  referred_by_seller_id: referringSeller?.id,
                  seller_name: referringSeller?.name,
                  seller_referral_code: profile.seller_referral_code,
                  total_paid: revenue,
                  created_at: profile.created_at,
                  status: 'active',
                  has_paid_selection_process_fee: !!profile.has_paid_selection_process_fee,
                  has_paid_i20_control_fee: !!profile.has_paid_i20_control_fee,
                  is_scholarship_fee_paid: !!profile.is_scholarship_fee_paid,
                  is_application_fee_paid: !!profile.is_application_fee_paid,
                  system_type: sysType,
                  dependents
                };
              });
            }
          }

          // Fetch commission totals from affiliate_referrals
          if (sellers.length > 0) {
            const sellerCodes = sellers.map((s: any) => s.referral_code);
            const { data: referrals } = await supabase
              .from('affiliate_referrals')
              .select('commission_amount')
              .in('affiliate_code', sellerCodes);
            totalCommission = (referrals || []).reduce(
              (sum: number, r: any) => sum + (Number(r.commission_amount) || 0), 0
            );
          }

          return {
            id: affiliateId,
            user_id: affiliateAdmin.user_id,
            full_name: userProfile?.full_name || 'Desconhecido',
            company_name: userProfile?.company_name || '',
            email: userProfile?.email || 'N/A',
            phone: userProfile?.phone || '',
            country: userProfile?.country || '',
            created_at: affiliateAdmin.created_at,
            status: affiliateAdmin.is_active ? 'active' : 'inactive',
            total_sellers: sellers.length,
            active_sellers: sellers.filter(s => s.is_active).length,
            total_students: studentsData.length,
            total_revenue: totalRevenue,
            total_commission: totalCommission,
            is_active: !!affiliateAdmin.is_active,
            logo_url: affiliateAdmin.logo_url ?? null,
            commission_per_sale: affiliateAdmin.commission_per_sale ?? null,
            commission_rules: affiliateAdmin.commission_rules,
            sellers: sellers.map(s => ({
              ...s,
              students_count: studentsData.filter(std => std.seller_referral_code === s.referral_code).length,
              total_revenue: studentsData.filter(std => std.seller_referral_code === s.referral_code).reduce((acc, curr) => acc + curr.total_paid, 0)
            })),
            students: studentsData
          } as Affiliate;
        })
      );

      setAffiliates(affiliatesWithData);
      setAllSellers(affiliatesWithData.flatMap(a => a.sellers));
      setAllStudents(affiliatesWithData.flatMap(a => a.students));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAffiliatesData();
  }, [loadAffiliatesData]);

  return { affiliates, allSellers, allStudents, loading, error, refetch: loadAffiliatesData };
};