import React, { useState, useEffect, useCallback } from 'react';
import { Coins, Send, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface RedemptionRequest {
  id: string;
  amount_usd: number;
  payout_method: string;
  payout_details: Record<string, string>;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const PAYOUT_METHODS = [
  { id: 'zelle', label: 'Zelle', field: 'zelle_phone_or_email' },
  { id: 'stripe', label: 'Stripe', field: 'stripe_email' },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Pendente', icon: <Clock className="h-3.5 w-3.5" />, color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado', icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Pago', icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeitado', icon: <XCircle className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-700' },
};

const AffiliateRedemptionSection: React.FC<{ coinBalance: number; onRequestSubmitted?: () => void }> = ({
  coinBalance,
  onRequestSubmitted,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation(['dashboard']);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [requests, setRequests] = useState<RedemptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('zelle');
  const [payoutDetail, setPayoutDetail] = useState('');

  const selectedMethod = PAYOUT_METHODS.find(m => m.id === payoutMethod)!;
  const amountNum = Number(amount);
  const maxRedeemable = Math.floor(coinBalance);
  const hasPendingRequest = requests.some(r => r.status === 'pending' || r.status === 'approved');

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRequests(true);
    const { data } = await supabase
      .from('affiliate_payment_requests')
      .select('id, amount_usd, payout_method, payout_details, status, admin_notes, created_at')
      .eq('referrer_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setRequests((data as RedemptionRequest[]) ?? []);
    setLoadingRequests(false);
  }, [user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user?.id) return;
    if (amountNum <= 0 || amountNum > maxRedeemable) {
      setError(t('dashboard:affiliateDashboard.redemption.errorAmount', { max: maxRedeemable }));
      return;
    }
    if (!payoutDetail.trim()) {
      setError(t('dashboard:affiliateDashboard.redemption.errorDetails'));
      return;
    }
    setSubmitting(true);
    const { error: insertError } = await supabase.from('affiliate_payment_requests').insert({
      referrer_user_id: user.id,
      amount_usd: amountNum,
      payout_method: payoutMethod,
      payout_details: { [selectedMethod.field]: payoutDetail.trim() },
      status: 'pending',
    });
    setSubmitting(false);
    if (insertError) {
      setError(t('dashboard:affiliateDashboard.redemption.errorGeneral'));
      return;
    }
    setSuccess(true);
    setAmount('');
    setPayoutDetail('');
    setShowForm(false);
    await loadRequests();
    onRequestSubmitted?.();
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Coins className="h-4 w-4" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('dashboard:affiliateDashboard.redemption.title')}</h3>
          </div>
          <p className="text-slate-500 text-sm">
            {t('dashboard:affiliateDashboard.redemption.subtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-3 w-full sm:w-auto">
          {!showForm && !hasPendingRequest && maxRedeemable > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 transition-all shadow-sm w-full sm:w-auto max-w-[320px] sm:max-w-none"
            >
              <Coins className="h-4 w-4" />
              {t('dashboard:affiliateDashboard.redemption.requestButton')}
            </button>
          )}
          {hasPendingRequest && (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-50 text-yellow-700 font-semibold px-5 py-3 border border-yellow-200 text-sm w-full sm:w-auto max-w-[320px] sm:max-w-none">
              <Clock className="h-4 w-4" />
              {t('dashboard:affiliateDashboard.redemption.pendingRequest')}
            </span>
          )}
          {maxRedeemable === 0 && !hasPendingRequest && (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-500 font-semibold px-5 py-3 border border-slate-200 text-sm w-full sm:w-auto max-w-[320px] sm:max-w-none">
              {t('dashboard:affiliateDashboard.redemption.insufficientBalance')}
            </span>
          )}
          <button
            onClick={() => setShowHistory(h => !h)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 transition-all text-sm font-semibold border border-slate-200 w-full sm:w-auto max-w-[320px] sm:max-w-none"
          >
            {t('dashboard:affiliateDashboard.redemption.historyButton')}
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium text-sm">{t('dashboard:affiliateDashboard.redemption.successMessage')}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          <div>
            <h4 className="font-bold text-slate-900 text-base">{t('dashboard:affiliateDashboard.redemption.newRequestTitle')}</h4>
            <p className="text-slate-500 text-sm mt-0.5">{t('dashboard:affiliateDashboard.redemption.availableBalance', { balance: maxRedeemable })}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('dashboard:affiliateDashboard.redemption.amountLabel')}</label>
            <input
              type="number"
              min={1}
              max={maxRedeemable}
              value={amount}
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setAmount('');
                  return;
                }
                const parsed = Number(val);
                if (parsed > maxRedeemable) {
                  setAmount(maxRedeemable.toString());
                } else {
                  setAmount(val);
                }
              }}
              placeholder={t('dashboard:affiliateDashboard.redemption.amountRange', { max: maxRedeemable })}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {amountNum > 0 && (
              <p className="text-blue-600 text-xs mt-1 font-medium">{t('dashboard:affiliateDashboard.redemption.willReceive', { amount: amountNum.toFixed(2) })}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('dashboard:affiliateDashboard.redemption.payoutMethod')}</label>
            <div className="flex gap-2">
              {PAYOUT_METHODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setPayoutMethod(m.id); setPayoutDetail(''); }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all border ${
                    payoutMethod === m.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('dashboard:affiliateDashboard.redemption.payoutDetails', { method: selectedMethod.label })}</label>
            <input
              type="text"
              value={payoutDetail}
              onChange={e => setPayoutDetail(e.target.value)}
              placeholder={
                selectedMethod.id === 'zelle'
                  ? t('dashboard:affiliateDashboard.redemption.payoutDetailsPlaceholderZelle', 'Telefone ou e-mail Zelle')
                  : t('dashboard:affiliateDashboard.redemption.payoutDetailsPlaceholderStripe', 'E-mail da conta Stripe')
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-sm disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? t('dashboard:affiliateDashboard.redemption.submitting') : t('dashboard:affiliateDashboard.redemption.submitButton')}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-100 transition-all font-semibold border border-slate-300 text-slate-700"
            >
              {t('dashboard:affiliateDashboard.redemption.cancelButton')}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      {showHistory && (
        <div className="rounded-2xl p-[5px] space-y-3">
          <h4 className="font-bold text-slate-900 text-base">{t('dashboard:affiliateDashboard.redemption.historyTitle')}</h4>
          {loadingRequests ? (
            <p className="text-slate-500 text-sm">{t('dashboard:affiliateDashboard.redemption.loading')}</p>
          ) : requests.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('dashboard:affiliateDashboard.redemption.noHistory')}</p>
          ) : (
            <div className="space-y-2">
              {requests.map(req => {
                const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                return (
                  <div key={req.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-900">${req.amount_usd.toFixed(2)} USD</p>
                      <p className="text-slate-500 text-xs">
                        {req.payout_method.toUpperCase()} · {new Date(req.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      {req.admin_notes && (
                        <p className="text-slate-400 text-xs mt-0.5 italic">"{req.admin_notes}"</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                      {cfg.icon}
                      {t(`dashboard:affiliateDashboard.redemption.status.${req.status}`, cfg.label)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AffiliateRedemptionSection;
