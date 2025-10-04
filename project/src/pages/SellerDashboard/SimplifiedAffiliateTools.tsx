import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, ExternalLink, QrCode, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSystemType } from '../../hooks/useSystemType';
import { useSimplifiedFees } from '../../hooks/useSimplifiedFees';
import { SimplifiedReferralLink, SimplifiedReferralQR } from '../../components/SimplifiedReferralLink';
import { supabase } from '../../lib/supabase';

const SimplifiedAffiliateTools: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { systemType } = useSystemType();
  const { fee350, fee550, fee900, loading } = useSimplifiedFees();
  const [selectedFee, setSelectedFee] = useState<number>(fee550);
  const [sellerCode, setSellerCode] = useState<string>('');
  const [sellerName, setSellerName] = useState<string>('');

  useEffect(() => {
    // Get seller information
    if (userProfile) {
      setSellerName(userProfile.full_name || userProfile.email || 'Seller');
    }
  }, [userProfile]);

  useEffect(() => {
    // Get seller code from database
    const fetchSellerCode = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('sellers')
            .select('referral_code')
            .eq('user_id', user.id)
            .single();

          if (data?.referral_code) {
            setSellerCode(data.referral_code);
          } else {
            // Fallback to user ID based code
            setSellerCode(`SELL${user.id.slice(-8).toUpperCase()}`);
          }
        } catch (err) {
          console.error('Error fetching seller code:', err);
          setSellerCode(`SELL${user.id.slice(-8).toUpperCase()}`);
        }
      }
    };

    fetchSellerCode();
  }, [user]);

  // Only show for simplified system
  if (systemType !== 'simplified') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Simplified Tools Not Available</h1>
          <p className="text-gray-600 mb-6">
            This page is only available for simplified system sellers.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Affiliate Tools</h1>
          <p className="text-gray-600 mt-2">
            Share your referral links and track your performance
          </p>
        </div>

        {/* Simplified Referral Link Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <SimplifiedReferralLink
            sellerCode={sellerCode}
            sellerName={sellerName}
            onFeeSelect={setSelectedFee}
            selectedFee={selectedFee}
          />
        </div>

        {/* QR Code Section */}
        {selectedFee && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <SimplifiedReferralQR
              link={`${window.location.origin}/auth?ref=${sellerCode}&fee=${selectedFee}`}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Use Your Referral Links</h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-semibold text-blue-800">1</span>
              <p>Choose a package (Basic $350, Standard $550, or Premium $900)</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-semibold text-blue-800">2</span>
              <p>Copy your referral link or share it directly</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-semibold text-blue-800">3</span>
              <p>Send the link to potential students</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-semibold text-blue-800">4</span>
              <p>Students click the link and register normally</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-semibold text-blue-800">5</span>
              <p>You earn commission when they complete payment</p>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <ExternalLink className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Your Referral Code</p>
                <p className="text-2xl font-bold text-gray-900">{sellerCode}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Share2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Selected Package</p>
                <p className="text-2xl font-bold text-gray-900">${selectedFee}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <QrCode className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">System Type</p>
                <p className="text-2xl font-bold text-gray-900">Simplified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedAffiliateTools;
