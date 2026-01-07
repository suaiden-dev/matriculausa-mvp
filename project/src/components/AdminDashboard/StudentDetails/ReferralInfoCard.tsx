import React from 'react';
import { Users } from 'lucide-react';
import { ReferralInfo } from './types';

interface ReferralInfoCardProps {
  referralCode: string | null;
  referralInfo: ReferralInfo | null;
  loading: boolean;
}

/**
 * ReferralInfoCard - Displays referral information
 * Shows seller, affiliate, or student referral details
 */
const ReferralInfoCard: React.FC<ReferralInfoCardProps> = React.memo(({
  referralCode,
  referralInfo,
  loading,
}) => {
  if (!referralCode) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
        <Users className="w-5 h-5 mr-2 text-[#05294E]" />
        Referral Information
      </h3>
      <div className="space-y-3">
        <div>
          <dt className="text-sm font-medium text-slate-600 mb-2">Referral Code</dt>
          <dd className="text-base text-slate-900 font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            {referralCode}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-slate-600 mb-2">Referral Source</dt>
          {loading ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-48"></div>
            </div>
          ) : referralInfo ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  referralInfo.type === 'seller' ? 'bg-green-500' :
                  referralInfo.type === 'affiliate' ? 'bg-blue-500' :
                  'bg-blue-500'
                }`}></div>
                <span className="text-sm font-medium text-slate-700">
                  {referralInfo.type === 'seller' ? 'Seller' :
                   referralInfo.type === 'affiliate' ? 'Affiliate' :
                   (referralInfo.isRewards ? 'Student Referral (Rewards)' : 'Student')} Referral
                </span>
              </div>
              <div className="text-sm text-slate-600">
                <div className="font-medium">{referralInfo.name || 'Unknown'}</div>
                <div className="text-slate-500">{referralInfo.email || 'No email'}</div>
                {referralInfo.type === 'seller' && (referralInfo.affiliateName || referralInfo.affiliateEmail) && (
                  <div className="mt-2 pl-3 border-l-2 border-blue-200">
                    <div className="text-xs text-slate-500 mb-1">Affiliate</div>
                    <div className="text-sm font-medium text-slate-700">{referralInfo.affiliateName || 'Unknown'}</div>
                    <div className="text-sm text-slate-500">{referralInfo.affiliateEmail || 'No email'}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-sm text-slate-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  <span>Referral source not found</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ReferralInfoCard.displayName = 'ReferralInfoCard';

export default ReferralInfoCard;

