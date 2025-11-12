import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const SimplifiedAffiliateTools: React.FC = () => {
  const { user } = useAuth();
  const [sellerCode, setSellerCode] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    // Get seller code from database
    const fetchSellerCode = async () => {
      if (user?.id) {
        try {
          // Buscar todos os sellers deste usuário e priorizar o correto
          // Prioridade: 1) is_active = true e tem affiliate_admin_id, 2) mais recente
          const { data, error } = await supabase
            .from('sellers')
            .select('referral_code, is_active, affiliate_admin_id, created_at')
            .eq('user_id', user.id)
            .order('is_active', { ascending: false })
            .order('affiliate_admin_id', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0 && data[0]?.referral_code) {
            setSellerCode(data[0].referral_code);
          } else {
            // Se não encontrou nenhum seller válido, buscar qualquer um como fallback
            const { data: fallbackData } = await supabase
              .from('sellers')
              .select('referral_code')
              .eq('user_id', user.id)
              .limit(1)
              .single();

            if (fallbackData?.referral_code) {
              setSellerCode(fallbackData.referral_code);
            } else {
              console.error('No seller found for user:', user.id);
              setSellerCode('N/A');
            }
          }
        } catch (err) {
          console.error('Error fetching seller code:', err);
          // Tentar buscar qualquer seller como último recurso
          try {
            const { data: fallbackData } = await supabase
              .from('sellers')
              .select('referral_code')
              .eq('user_id', user.id)
              .limit(1)
              .single();

            if (fallbackData?.referral_code) {
              setSellerCode(fallbackData.referral_code);
            } else {
              setSellerCode('N/A');
            }
          } catch (fallbackErr) {
            console.error('Fallback query also failed:', fallbackErr);
            setSellerCode('N/A');
          }
        }
      }
    };

    fetchSellerCode();
  }, [user]);

  const referralUrl = `${window.location.origin}?ref=${sellerCode}`;

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
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Referral Tools (Simplified)
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Share your referral link to invite students to register.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Referral Code and Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Referral Code</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-bold text-[#3B82F6]">{sellerCode}</span>
                  <button
                    onClick={() => copyToClipboard(sellerCode, 'code')}
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
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Referral Link</h3>
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

          {/* Simple Instructions */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 How to Use</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <p className="text-slate-700">Copy your unique referral code or link above</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <p className="text-slate-700">Share it with potential students through WhatsApp, Facebook, email, or any other channel</p>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <p className="text-slate-700">When students register using your link, their referral code will be automatically applied.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedAffiliateTools;