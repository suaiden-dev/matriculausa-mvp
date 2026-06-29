import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Award } from 'lucide-react';
import { MatriculaRewardsStats } from '../../../types/rewards';
import { formatActivityDate } from '../../../utils/rewardsUtils';

interface Props {
  stats: MatriculaRewardsStats;
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const startTime = performance.now();
    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

const OverviewTab: React.FC<Props> = ({ stats }) => {
  const animatedCoins = useCountUp(stats.totalCoinsEarned);
  const convertedCount = stats.referralList?.filter(r => r.isConverted).length ?? 0;
  const conversionRate = stats.totalReferrals > 0
    ? ((convertedCount / stats.totalReferrals) * 100).toFixed(1)
    : '0.0';
  const maxBalance = Math.max(...(stats.topStudentsByBalance?.map(s => s.currentBalance) ?? [0]), 1);

  return (
    <div className="space-y-6">
      {/* Hero metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hero: Coins Earned */}
        <div className="border-l-4 border-[#C9963F] bg-[#FFF8ED] rounded-r-xl p-5 flex flex-col justify-between min-h-[110px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C9963F]/80">Coins Earned</p>
          <div>
            <p className="text-4xl font-bold tracking-tight text-[#C9963F] tabular-nums">{animatedCoins.toLocaleString()}</p>
            <p className="text-xs text-[#C9963F]/70 mt-1 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#C9963F]/40"></span>
              total program earnings
            </p>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Participants</p>
            <div className="bg-[#05294E]/8 p-2 rounded-lg">
              <Users className="h-4 w-4 text-[#05294E]" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-[#1A1A2E] tabular-nums">{stats.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">enrolled students</p>
          </div>
        </div>

        {/* Referrals */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Referrals</p>
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-[#1A1A2E] tabular-nums">{stats.totalReferrals.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">students referred</p>
          </div>
        </div>
      </div>

      {/* Secondary row: Conversion + Coins Spent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversion funnel */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Conversion Rate</p>
            <span className="text-lg font-bold tabular-nums text-[#1A1A2E]">{conversionRate}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9963F] rounded-full transition-all duration-700"
              style={{ width: `${conversionRate}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
              {convertedCount} converted
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
              {stats.totalReferrals - convertedCount} registered
            </span>
          </div>
        </div>

        {/* Coins Spent */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Coins Spent</p>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-slate-600 tabular-nums">{stats.totalCoinsSpent.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">redeemed by students</p>
          </div>
        </div>
      </div>

      {/* Coupon summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Discount Coupons Redeemed</p>
            <p className="text-xs text-slate-500">In selected period · lifetime total</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-[#1A1A2E]">{stats.couponUsage.usedInRange.toLocaleString()}</p>
            <p className="text-xs text-slate-400">of {stats.couponUsage.totalUsed.toLocaleString()} total</p>
          </div>
        </div>
      </div>

      {/* Coupon Usage Details */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-[#1A1A2E]">Coupon Usage Details</h3>
          <p className="text-xs text-slate-500 mt-0.5">Students who used discount coupons on first fee</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Student', 'Referrer', 'Code', 'Discount', 'Applied', 'Status'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.couponUsageDetails?.map((c, idx) => (
                <tr key={`${c.id || c.userId || 'coupon'}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-[#1A1A2E]">{c.fullName}</div>
                    <div className="text-xs text-slate-400">{c.userEmail}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-slate-700">{c.referrerName}</div>
                    <div className="text-xs text-slate-400">{c.referrerEmail}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{c.affiliateCode}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold tabular-nums text-[#1A1A2E]">${c.discountAmount.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-slate-500">{formatActivityDate(c.appliedAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      c.status === 'applied' ? 'bg-green-100 text-green-700' :
                      c.status === 'expired' ? 'bg-red-100 text-red-700' :
                      c.status === 'cancelled' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>{c.status}</span>
                  </td>
                </tr>
              ))}
              {(!stats.couponUsageDetails || stats.couponUsageDetails.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No coupon usage in selected period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-[#1A1A2E]">Top by Balance</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.topStudentsByBalance.map((s, idx) => (
              <div key={`${s.email || s.fullName}-balance-${idx}`} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#1A1A2E] truncate">{s.fullName}</div>
                  <div className="text-xs text-slate-400 truncate">{s.email}</div>
                </div>
                <div className="flex-shrink-0 text-right min-w-[120px]">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <Award className="h-3.5 w-3.5 text-[#C9963F]" />
                    <span className="text-sm font-semibold tabular-nums text-[#C9963F]">{s.currentBalance.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9963F] rounded-full"
                      style={{ width: `${Math.round((s.currentBalance / maxBalance) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {stats.topStudentsByBalance.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">No data</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-[#1A1A2E]">Top Spenders</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.topStudentsBySpent.map((s, idx) => (
              <div key={`${s.email || s.fullName}-spent-${idx}`} className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#1A1A2E] truncate">{s.fullName}</div>
                  <div className="text-xs text-slate-400 truncate">{s.email}</div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-slate-600 flex-shrink-0">{s.totalSpent.toLocaleString()} coins</span>
              </div>
            ))}
            {stats.topStudentsBySpent.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Reward Redemptions */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-[#1A1A2E]">Recent Reward Redemptions</h3>
          <p className="text-xs text-slate-500 mt-0.5">What was redeemed, by whom, and the coin amount</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Student', 'Reward', 'Cost', 'Redeemed At', 'Status'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentRedemptions?.map((r, idx) => (
                <tr key={`${r.id || r.userId || 'redemption'}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-[#1A1A2E]">{r.fullName || 'Student Name'}</div>
                    <div className="text-xs text-slate-400">{r.email || 'student@email.com'}</div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{r.rewardName || 'Tuition Discount'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-semibold tabular-nums text-[#C9963F]">{Number(r.costPaid || 0).toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1">coins</span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-slate-500">{formatActivityDate(r.redeemedAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.status === 'active' ? 'bg-green-100 text-green-700' :
                      r.status === 'used' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>{r.status || 'active'}</span>
                  </td>
                </tr>
              ))}
              {(!stats.recentRedemptions || stats.recentRedemptions.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <Award className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No reward redemptions in selected period</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
