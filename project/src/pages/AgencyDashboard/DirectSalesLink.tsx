import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Link as LinkIcon, Zap, ExternalLink, Pencil, X, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAgencyId } from '../../hooks/useAgencyId';

const DirectSalesLink: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [directSalesSeller, setDirectSalesSeller] = useState<{
    id: string;
    referral_code: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Edit code state
  const [editingCode, setEditingCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { affiliateAdminId, affiliateAdminInfo } = useAgencyId();

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const loadDirectSalesSeller = async () => {
    if (!affiliateAdminId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sellers')
        .select('id, referral_code, name')
        .eq('affiliate_admin_id', affiliateAdminId)
        .is('user_id', null)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        setDirectSalesSeller(null);
      } else if (data) {
        setDirectSalesSeller({ id: data.id, referral_code: data.referral_code, name: data.name });
      } else {
        setDirectSalesSeller(null);
      }
    } catch {
      setDirectSalesSeller(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectSalesSeller();
  }, [affiliateAdminId]);

  // Focus input when edit mode opens
  useEffect(() => {
    if (editingCode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCode]);

  const generateDirectSalesLink = (code?: string) => {
    const ref = code ?? directSalesSeller?.referral_code ?? '';
    if (!ref) return '';
    return `${baseUrl}/selection-fee-registration?sref=${ref}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!affiliateAdminId) return;
    try {
      setActivating(true);
      const companyName = affiliateAdminInfo?.company_name || 'Agency';
      const cleanName = companyName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();

      let baseCode = `${cleanName.substring(0, 10)}DIR`;
      if (baseCode.length < 4) baseCode = `DIR${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      let uniqueCode = baseCode;
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('sellers')
          .select('id')
          .eq('referral_code', uniqueCode)
          .maybeSingle();
        if (!existing) break;
        uniqueCode = `${baseCode.substring(0, 7)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        attempts++;
      }

      const { error } = await supabase.from('sellers').insert({
        affiliate_admin_id: affiliateAdminId,
        name: `Direct Sales - ${companyName}`,
        email: '',
        referral_code: uniqueCode,
        is_active: true,
        user_id: null,
      });
      if (error) throw error;
      await loadDirectSalesSeller();
    } catch (err) {
      console.error('Failed to activate direct sales:', err);
    } finally {
      setActivating(false);
    }
  };

  const startEditing = () => {
    setCodeInput(directSalesSeller?.referral_code ?? '');
    setCodeError('');
    setEditingCode(true);
  };

  const cancelEditing = () => {
    setEditingCode(false);
    setCodeError('');
  };

  const sanitizeCode = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .substring(0, 20);

  const handleSaveCode = async () => {
    if (!directSalesSeller) return;
    const newCode = sanitizeCode(codeInput);

    if (newCode.length < 3) {
      setCodeError('Code must be at least 3 characters.');
      return;
    }
    if (newCode === directSalesSeller.referral_code) {
      setEditingCode(false);
      return;
    }

    try {
      setSavingCode(true);
      setCodeError('');

      // Check uniqueness
      const { data: existing } = await supabase
        .from('sellers')
        .select('id')
        .eq('referral_code', newCode)
        .maybeSingle();

      if (existing && existing.id !== directSalesSeller.id) {
        setCodeError('This code is already in use. Try another one.');
        return;
      }

      const { error } = await supabase
        .from('sellers')
        .update({ referral_code: newCode })
        .eq('id', directSalesSeller.id);

      if (error) throw error;

      setDirectSalesSeller({ ...directSalesSeller, referral_code: newCode });
      setEditingCode(false);
    } catch (err) {
      setCodeError('Failed to save. Try again.');
    } finally {
      setSavingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400" />
      </div>
    );
  }

  /* ── NOT ACTIVATED ── */
  if (!directSalesSeller) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-5">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <LinkIcon className="w-5 h-5 text-slate-500" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Direct Sales Link</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Generate a general link for ads and campaigns. Students who sign up through this link will be attributed directly to your agency — no seller required.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleActivate}
            disabled={activating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#05294E] hover:bg-[#041f3a] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
          >
            {activating ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                Activating…
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Activate
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ── ACTIVATED ── */
  const link = generateDirectSalesLink();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
        {/* Icon + label */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Direct Sales Link</p>

            {/* Referral code — inline edit */}
            {editingCode ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  ref={inputRef}
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(sanitizeCode(e.target.value));
                    setCodeError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCode();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  className="w-32 px-2 py-0.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  placeholder="NEW CODE"
                  maxLength={20}
                />
                <button
                  onClick={handleSaveCode}
                  disabled={savingCode}
                  className="p-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
                  title="Save"
                >
                  {savingCode ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-xs text-slate-400">
                  Ref: <span className="font-mono">{directSalesSeller.referral_code}</span>
                </p>
                <button
                  onClick={startEditing}
                  className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Edit code"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Code error */}
            {codeError && (
              <p className="text-xs text-red-500 mt-0.5">{codeError}</p>
            )}
          </div>
        </div>

        {/* Link input */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <code className="text-xs text-slate-600 truncate block">{link}</code>
          </div>

          <button
            onClick={() => copyToClipboard(link)}
            title="Copy link"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex-shrink-0 ${
              copied
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default DirectSalesLink;
