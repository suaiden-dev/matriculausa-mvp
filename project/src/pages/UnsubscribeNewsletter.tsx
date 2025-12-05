import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail, Shield, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

const UnsubscribeNewsletter: React.FC = () => {
  const { t, ready } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const user_id = searchParams.get('user_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_unsubscribed' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Aguardar traduções carregarem
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Loader2 className="w-12 h-12 text-[#05294E] mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!token && !user_id) {
      setStatus('invalid');
      setMessage(t('footer.unsubscribe.errors.tokenMissing'));
      return;
    }

    // Verificar status atual
    checkUnsubscribeStatus();
  }, [token, user_id, t]);

  const checkUnsubscribeStatus = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!supabaseUrl) {
        console.error('VITE_SUPABASE_URL is not defined');
        setStatus('error');
        setMessage(t('footer.unsubscribe.errors.configError'));
        return;
      }

      // Codificar o token na URL
      const tokenParam = token ? `token=${encodeURIComponent(token)}` : '';
      const userIdParam = user_id ? `user_id=${encodeURIComponent(user_id)}` : '';
      const params = [tokenParam, userIdParam].filter(p => p).join('&');
      
      const functionUrl = `${supabaseUrl}/functions/v1/unsubscribe-newsletter?${params}`;

      console.log('[Unsubscribe] Verificando status na URL:', functionUrl.replace(token || user_id || '', '[REDACTED]'));

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || t('footer.unsubscribe.errors.httpError', { status: response.status }) };
        }
        
        console.error('[Unsubscribe] Error in response:', errorData);
        setStatus('error');
        setMessage(errorData.error || t('footer.unsubscribe.errors.checkStatusError', { status: response.status }));
        return;
      }

      const data = await response.json();
      console.log('[Unsubscribe] Status verificado:', data);

      if (data.is_opted_out) {
        setStatus('already_unsubscribed');
        setMessage(t('footer.unsubscribe.alreadyUnsubscribed.message'));
      } else {
        setStatus('loading');
        setMessage('');
      }
    } catch (error: any) {
      console.error('[Unsubscribe] Error checking status:', error);
      setStatus('error');
      setMessage(error.message || t('footer.unsubscribe.errors.checkStatusGeneric'));
    }
  };

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token && !user_id) {
      setStatus('invalid');
      setMessage(t('footer.unsubscribe.errors.tokenMissing'));
      return;
    }

    setSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/unsubscribe-newsletter`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token || null,
          user_id: user_id || null,
          reason: reason || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage(data.message || t('footer.unsubscribe.success.message'));
      } else {
        setStatus('error');
        setMessage(data.message || data.error || t('footer.unsubscribe.errors.processError'));
      }
    } catch (error) {
      console.error('Error processing unsubscribe:', error);
      setStatus('error');
      setMessage(t('footer.unsubscribe.errors.processErrorRetry'));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' && !token && !user_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('footer.unsubscribe.invalidLink.title')}</h1>
          <p className="text-slate-600 mb-6">
            {t('footer.unsubscribe.invalidLink.message')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#05294E] text-white py-3 rounded-lg font-semibold hover:bg-[#041d35] transition-colors"
          >
            {t('footer.unsubscribe.invalidLink.button')}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'already_unsubscribed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('footer.unsubscribe.alreadyUnsubscribed.title')}</h1>
          <p className="text-slate-600 mb-6">
            {t('footer.unsubscribe.alreadyUnsubscribed.message')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#05294E] text-white py-3 rounded-lg font-semibold hover:bg-[#041d35] transition-colors"
          >
            {t('footer.unsubscribe.alreadyUnsubscribed.button')}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('footer.unsubscribe.success.title')}</h1>
          <p className="text-slate-600 mb-4">
            {message || t('footer.unsubscribe.success.message')}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: t('footer.unsubscribe.success.important') }} />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            {t('footer.unsubscribe.success.reactivate')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#05294E] text-white py-3 rounded-lg font-semibold hover:bg-[#041d35] transition-colors"
          >
            {t('footer.unsubscribe.success.button')}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('footer.unsubscribe.error.title')}</h1>
          <p className="text-slate-600 mb-6">
            {message || t('footer.unsubscribe.error.message')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              {t('footer.unsubscribe.error.tryAgain')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-[#05294E] text-white py-3 rounded-lg font-semibold hover:bg-[#041d35] transition-colors"
            >
              {t('footer.unsubscribe.error.backToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-12 h-12 text-[#05294E]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('footer.unsubscribe.form.title')}</h1>
          <p className="text-slate-600">
            {t('footer.unsubscribe.form.question')}
          </p>
        </div>

        <form onSubmit={handleUnsubscribe} className="space-y-5">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-2">
              {t('footer.unsubscribe.form.reasonLabel')}
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] resize-none transition-colors"
              placeholder={t('footer.unsubscribe.form.reasonPlaceholder')}
            />
            <p className="text-xs text-slate-500 mt-1">
              {t('footer.unsubscribe.form.reasonHelp')}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800" dangerouslySetInnerHTML={{ __html: t('footer.unsubscribe.form.note') }} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={submitting}
              className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-lg font-semibold hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('footer.unsubscribe.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('footer.unsubscribe.form.processing')}
                </>
              ) : (
                t('footer.unsubscribe.form.confirm')
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-slate-500 text-center mt-6">
          {t('footer.unsubscribe.form.disclaimer')}
        </p>
      </div>
    </div>
  );
};

export default UnsubscribeNewsletter;

