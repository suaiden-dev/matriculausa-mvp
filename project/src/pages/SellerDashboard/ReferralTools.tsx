import React, { useState } from 'react';
import { Copy, Check, Link2 } from 'lucide-react';

interface ReferralToolsProps {
  sellerProfile: any;
  stats: any;
}

const ReferralTools: React.FC<ReferralToolsProps> = ({ sellerProfile, stats }) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const referralCode = sellerProfile?.referral_code || '';
  const referralUrl = `${window.location.origin}/?ref=${referralCode}`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      alert('Error copying');
    }
  };



  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="mt-1 text-sm text-slate-600">
          Share your referral code to earn commissions from student registrations
        </p>
      </div>



      {/* Referral Code and Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Referral Code</h3>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold text-red-600">{referralCode}</span>
              <button
                onClick={() => copyToClipboard(referralCode, 'code')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                {copiedText === 'code' ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Referral Link</h3>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={() => copyToClipboard(referralUrl, 'url')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded transition-colors"
                title="Copy link"
              >
                {copiedText === 'url' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Simple Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 How to Use</h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
            <p className="text-slate-700">Copy your referral code or link above</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
            <p className="text-slate-700">Share it with potential students through WhatsApp, Facebook, email, or any other channel</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
            <p className="text-slate-700">When students register using your code, you'll earn commissions automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralTools;
