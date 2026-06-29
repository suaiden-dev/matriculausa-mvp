import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { ReferralEntry } from '../../../types/rewards';

interface Props {
  referralList: ReferralEntry[];
}

function groupByMonth(list: ReferralEntry[]) {
  const groups = new Map<string, ReferralEntry[]>();
  for (const ref of list) {
    const key = new Date(ref.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ref);
  }
  return groups;
}

const ReferralsTab: React.FC<Props> = ({ referralList }) => {
  const converted = referralList.filter(r => r.isConverted).length;
  const registered = referralList.length - converted;
  const conversionRate = referralList.length > 0
    ? ((converted / referralList.length) * 100).toFixed(1)
    : '0.0';

  const grouped = groupByMonth([...referralList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400"></span>
          <span className="text-sm font-semibold text-[#1A1A2E] tabular-nums">{converted}</span>
          <span className="text-sm text-slate-500">converted</span>
        </div>
        <div className="w-px h-4 bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300"></span>
          <span className="text-sm font-semibold text-[#1A1A2E] tabular-nums">{registered}</span>
          <span className="text-sm text-slate-500">registered</span>
        </div>
        <div className="w-px h-4 bg-slate-200"></div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#C9963F] tabular-nums">{conversionRate}%</span>
          <span className="text-sm text-slate-500">conversion</span>
        </div>
        <div className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {referralList.length} total
        </div>
      </div>

      {/* Grouped list */}
      {referralList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
          <p className="text-sm text-slate-400">No referrals found for this period</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {Array.from(grouped.entries()).map(([month, entries]) => {
            const monthConverted = entries.filter(r => r.isConverted).length;
            return (
              <div key={month}>
                {/* Month divider */}
                <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 sticky top-0">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 capitalize">{month}</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-[10px] text-slate-400 tabular-nums">{entries.length} referrals</span>
                  <span className="text-[10px] text-green-600 font-semibold tabular-nums">{monthConverted} converted</span>
                </div>

                {/* Rows */}
                {entries.map((ref) => (
                  <div
                    key={ref.id}
                    className={`flex items-center gap-0 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                      ref.isConverted ? 'border-l-4 border-l-green-400' : 'border-l-4 border-l-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4 px-5 py-3.5 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#1A1A2E] truncate">{ref.fullName}</div>
                        <div className="text-xs text-slate-400 truncate">{ref.email}</div>
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <div className="text-sm text-slate-600 truncate">{ref.referrerName}</div>
                        <div className="flex items-center justify-end mt-0.5">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{ref.referrerCode}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right min-w-[90px]">
                        <div className="text-xs text-slate-400 mb-1">
                          {new Date(ref.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        {ref.isConverted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Converted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            <Clock className="h-3 w-3" />
                            Registered
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReferralsTab;
