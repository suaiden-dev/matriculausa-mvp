import React, { useState } from 'react';
import { Copy, Check, Pencil, X } from 'lucide-react';
import { useSystemType } from '../../hooks/useSystemType';
import SimplifiedAffiliateTools from './SimplifiedAffiliateTools';
import { supabase } from '../../lib/supabase';

interface AffiliateToolsProps {
  sellerProfile: any;
}

const AffiliateTools: React.FC<AffiliateToolsProps> = ({ sellerProfile }) => {
  const { systemType } = useSystemType();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState<string>(sellerProfile?.referral_code || '');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editCodeValue, setEditCodeValue] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSavingCode, setIsSavingCode] = useState(false);

  // Se for sistema simplified, mostrar interface simplificada
  if (systemType === 'simplified') {
    return <SimplifiedAffiliateTools />;
  }

  const referralCode = currentCode;
  const referralUrl = `${window.location.origin}/selection-fee-registration?ref=${referralCode}`;
  const trackingUrl = `${window.location.origin}/selection-fee-registration?sref=${referralCode}`;

  const startEditCode = () => {
    setEditCodeValue(currentCode);
    setCodeError(null);
    setIsEditingCode(true);
  };

  const cancelEditCode = () => {
    setIsEditingCode(false);
    setCodeError(null);
  };

  const saveCode = async () => {
    const trimmed = editCodeValue.trim().toUpperCase();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 30) {
      setCodeError('Code must be between 3 and 30 characters.');
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(trimmed)) {
      setCodeError('Only letters, numbers, and underscores allowed.');
      return;
    }
    setIsSavingCode(true);
    setCodeError(null);
    try {
      const { data, error } = await supabase.rpc('update_seller_referral_code', { new_code: trimmed });
      if (error) throw error;
      if (data?.success === false) {
        setCodeError(data.error || 'Could not update code.');
      } else {
        setCurrentCode(data.code);
        setIsEditingCode(false);
      }
    } catch (err: any) {
      setCodeError(err.message || 'Unexpected error. Please try again.');
    } finally {
      setIsSavingCode(false);
    }
  };

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
      {/* Header + Tabs Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Seller Tools
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Share your referral code and links to invite students to register.
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Referral Management
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Tools and resources to maximize your sales performance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Referral Code and Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Referral Code</h3>
                {!isEditingCode && (
                  <button
                    onClick={startEditCode}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingCode ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editCodeValue}
                    onChange={(e) => {
                      setEditCodeValue(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
                      setCodeError(null);
                    }}
                    maxLength={30}
                    placeholder="NEW_CODE"
                    className="w-full font-mono font-bold text-xl text-blue-600 border border-blue-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {codeError && (
                    <p className="text-sm text-red-600">{codeError}</p>
                  )}
                  <p className="text-xs text-slate-500">Letters, numbers and underscores only. 3–30 characters.</p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={saveCode}
                      disabled={isSavingCode}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {isSavingCode ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditCode}
                      disabled={isSavingCode}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold text-[#3B82F6]">{referralCode}</span>
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
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Referral Link ($50 Off)</h3>
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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tracking Link (No Discount)</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={trackingUrl}
                    readOnly
                    className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(trackingUrl, 'tracking-url')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded transition-colors"
                    title="Copy tracking link"
                  >
                    {copiedText === 'tracking-url' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 
          {/**
           * SEÇÃO: Registration Links - COMENTADO A PEDIDO DO USUÁRIO
           * Estes são os links que levam o estudante para a página de registro.
           * - Referral Link ($50 Off): Usa '?ref=' e aplica o desconto automático.
           * - Tracking Link (No Discount): Usa '?sref=' para apenas rastrear sem dar desconto.
           *
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Selection Fee Registration</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/selection-fee-registration?ref=${referralCode}`}
                    readOnly
                    className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/selection-fee-registration?ref=${referralCode}`, 'selection-fee')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded transition-colors"
                    title="Copy link"
                  >
                    {copiedText === 'selection-fee' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Selection Fee — Tracking</h3>
              <p className="text-xs text-slate-500 mb-4">Links the student to your account without applying the $50 discount.</p>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/selection-fee-registration?sref=${referralCode}`}
                    readOnly
                    className="flex-1 bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/selection-fee-registration?sref=${referralCode}`, 'selection-fee-tracking')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded transition-colors"
                    title="Copy link"
                  >
                    {copiedText === 'selection-fee-tracking' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          */}

          {/* Simple Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 How to Use</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <p className="text-slate-700">Copy your affiliate code or link above</p>
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
      </div>
    </div>
  );
};

export default AffiliateTools;