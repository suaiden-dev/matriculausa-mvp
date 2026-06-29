import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PayoutService } from '../services/PayoutService';
import { MatriculaRewardsStats } from '../types/rewards';
import { getRangeStart, filterUorak } from '../utils/rewardsUtils';

// ─── Stats hook ────────────────────────────────────────────────────────────────

export function useMatriculaRewardsStats(
  dateRange: string,
  userId: string | undefined,
  userRole: string | undefined,
) {
  const [stats, setStats] = useState<MatriculaRewardsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchKeyRef = useRef<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const start = getRangeStart(dateRange).toISOString();

      const { data: tuitionRedemptionsRaw, error: trErr } = await supabase
        .from('tuition_redemptions')
        .select('id, user_id, university_id, cost_coins_paid, discount_amount, redeemed_at, status')
        .gte('redeemed_at', start)
        .order('redeemed_at', { ascending: false })
        .limit(10);
      if (trErr) console.warn('[Admin] tuition_redemptions error:', trErr);

      const userIds = (tuitionRedemptionsRaw || []).map((r: any) => r.user_id);
      let userProfiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: upErr } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        if (upErr) console.warn('[Admin] user_profiles error:', upErr);
        userProfiles = profilesData || [];
      }

      const tuitionRedemptions = (tuitionRedemptionsRaw || []).map((redemption: any) => ({
        ...redemption,
        user_profiles: userProfiles.find((up: any) => up.user_id === redemption.user_id),
      }));

      const { data: payoutsData, error: poErr } = await supabase
        .from('university_payout_requests')
        .select('status, created_at')
        .eq('request_type', 'matricula_rewards')
        .gte('created_at', start)
        .order('created_at', { ascending: false });
      if (poErr) console.warn('[Admin] payout_requests error:', poErr);

      const recentRedemptions: any[] = (tuitionRedemptions || []).map((r: any) => ({
        id: r.id || `${r.user_id}-${r.redeemed_at}`,
        type: 'redemption',
        userId: r.user_id,
        fullName: r.user_profiles?.full_name || 'Student Name',
        email: r.user_profiles?.email || 'student@email.com',
        description: `Tuition discount: ${Number(r.discount_amount || 0).toFixed(0)} USD`,
        amount: Number(r.cost_coins_paid || 0),
        createdAt: r.redeemed_at,
        rewardName: 'Tuition Discount',
        costPaid: Number(r.cost_coins_paid || 0),
        redeemedAt: r.redeemed_at,
        status: r.status || 'active',
      }));

      const recentPayouts: any[] = (payoutsData || []).slice(0, 10).map((p: any) => ({
        id: `${p.status}-${p.created_at}`,
        type: 'payout',
        userId: '',
        fullName: p.status.toUpperCase(),
        description: `Payout ${p.status}`,
        amount: undefined,
        createdAt: p.created_at,
      }));

      const { data: generalStats, error: statsError } = await supabase
        .rpc('get_matricula_rewards_admin_stats', { date_range: dateRange });
      if (statsError) console.warn('get_matricula_rewards_admin_stats failed:', statsError);

      const { data: couponDetails, error: couponError } = await supabase
        .rpc('get_matricula_rewards_coupon_usage', { date_range: dateRange });
      if (couponError) console.warn('get_matricula_rewards_coupon_usage failed:', couponError);

      const { data: detailedReferrals, error: detailedReferralsError } = await supabase
        .rpc('get_matricula_rewards_detailed_referrals', { date_range: dateRange });
      if (detailedReferralsError) console.warn('get_matricula_rewards_detailed_referrals failed:', detailedReferralsError);

      const { data: topReferrers, error: referrersError } = await supabase
        .rpc('get_top_referrers', { limit_count: 10 });
      if (referrersError) console.warn('get_top_referrers failed:', referrersError);

      const { data: usersTotals, error: usersTotalsError } = await supabase
        .rpc('export_matricula_rewards_data', { date_range: dateRange });
      if (usersTotalsError) console.warn('export_matricula_rewards_data failed:', usersTotalsError);

      const rows = (usersTotals || []) as any[];
      const mapRow = (r: any) => ({
        fullName: r.full_name,
        email: r.user_email,
        totalEarnings: Number(r.total_earnings || 0),
        totalSpent: Number(r.total_spent || 0),
        currentBalance: Number(r.current_balance || 0),
      });
      const topStudentsByBalance = [...rows]
        .sort((a, b) => Number(b.current_balance || 0) - Number(a.current_balance || 0))
        .slice(0, 5).map(mapRow);
      const topStudentsBySpent = [...rows]
        .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
        .slice(0, 5).map(mapRow);

      const statsResult = (generalStats as any)?.[0] || {};

      setStats({
        totalUsers: Number(statsResult.total_active_affiliates || 0),
        totalReferrals: Number(statsResult.total_referrals || 0),
        totalCoinsSpent: Number(statsResult.total_coins_spent || 0),
        totalCoinsEarned: Number(statsResult.total_coins_earned || 0),
        conversionRate: Number(statsResult.avg_referrals_per_affiliate || 0),
        averageCoinsPerUser: 0,
        topReferrers: topReferrers || [],
        recentActivity: [...recentRedemptions, ...recentPayouts]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10),
        topStudentsByBalance: filterUorak(topStudentsByBalance),
        topStudentsBySpent: filterUorak(topStudentsBySpent),
        couponUsage: {
          totalUsed: Number(statsResult.total_coupons_redeemed || 0),
          usedInRange: Number(statsResult.total_coupons_redeemed || 0),
        },
        couponUsageDetails: filterUorak((couponDetails || []).map((c: any) => ({
          id: c.id,
          fullName: c.student_name,
          userEmail: c.student_email,
          referrerName: c.referrer_name,
          referrerEmail: c.referrer_email,
          affiliateCode: c.referrer_code,
          discountAmount: Number(c.discount_amount || 0),
          status: c.status,
          appliedAt: c.applied_at,
        }))),
        referralList: filterUorak((detailedReferrals || []).map((r: any) => ({
          id: r.id,
          fullName: r.student_name,
          email: r.student_email,
          referrerName: r.referrer_name,
          referrerCode: r.referrer_code,
          createdAt: r.created_at,
          isConverted: r.is_converted,
        }))),
        recentRedemptions: recentRedemptions as any,
      } as any);
    } catch (err) {
      console.error('[MatriculaRewardsAdmin] Error loading stats:', err);
      setError('Failed to load rewards analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId || userRole !== 'admin') return;
    const key = `${userId}-${dateRange}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    void load();
  }, [userId, userRole, dateRange]);

  return { stats, loading, error, reload: load };
}

// ─── Payouts hook ──────────────────────────────────────────────────────────────

export function usePayouts(userId: string | undefined, onError: (msg: string) => void) {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const load = async () => {
    try {
      setLoadingPayouts(true);
      const { data, error } = await supabase
        .from('university_payout_requests')
        .select('*, universities(name), payout_invoices(invoice_number), payout_details_preview, payout_method')
        .eq('request_type', 'matricula_rewards')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayouts(data || []);
    } catch (e: any) {
      console.error('[Admin] Failed to load payout requests:', e);
      onError('Failed to load payout requests');
      setPayouts([]);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const approve = async (id: string) => {
    try { await PayoutService.adminApprove(id, userId!); await load(); }
    catch (e: any) { onError(e.message); }
  };

  const markPaid = async (id: string, reference?: string) => {
    try {
      await PayoutService.adminMarkPaid(id, userId!, reference);
      await load();
      setShowMarkPaidModal(false);
      setSelectedPayoutId(null);
      setPaymentReference('');
    } catch (e: any) { onError(e.message); }
  };

  const reject = async (id: string, reason: string) => {
    try {
      await PayoutService.adminReject(id, userId!, reason);
      await load();
      setShowRejectModal(false);
      setSelectedPayoutId(null);
      setRejectReason('');
    } catch (e: any) { onError(e.message); }
  };

  return {
    payouts, loadingPayouts, load,
    showRejectModal, setShowRejectModal,
    showMarkPaidModal, setShowMarkPaidModal,
    selectedPayoutId, setSelectedPayoutId,
    rejectReason, setRejectReason,
    paymentReference, setPaymentReference,
    approve, markPaid, reject,
  };
}

// ─── Students hook ─────────────────────────────────────────────────────────────

export function useStudentsData(dateRange: string, onError: (msg: string) => void) {
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const load = async () => {
    try {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .rpc('export_matricula_rewards_data', { date_range: dateRange });
      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      console.error('[Admin] Failed to load students data:', err);
      onError('Failed to load students data');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  return { students, loadingStudents, load };
}
