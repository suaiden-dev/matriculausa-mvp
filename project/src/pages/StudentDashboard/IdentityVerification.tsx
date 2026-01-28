import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle, Camera, ArrowLeft, Scroll } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { IdentityPhotoUpload } from '../../components/IdentityPhotoUpload';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import { useAffiliateTermsAcceptance } from '../../hooks/useAffiliateTermsAcceptance';

interface Term {
  id: string;
  title: string;
  content: string;
  term_type: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface TermAcceptance {
  id: string;
  user_id: string;
  term_id: string;
  term_type: string;
  accepted_at: string;
  identity_photo_path?: string;
  identity_photo_name?: string;
  identity_photo_status?: 'pending' | 'approved' | 'rejected';
  identity_photo_rejection_reason?: string | null;
  identity_photo_reviewed_at?: string | null;
  term_title?: string;
}

const IdentityVerification: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { recordTermAcceptance } = useTermsAcceptance();
  const { recordAffiliateTermAcceptance, checkIfUserHasAffiliate } = useAffiliateTermsAcceptance();

  const [termAcceptance, setTermAcceptance] = useState<TermAcceptance | null>(null);
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para termos
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const termsContentRef = useRef<HTMLDivElement>(null);

  // Estados para foto
  const [identityPhotoPath, setIdentityPhotoPath] = useState<string | null>(null);
  const [identityPhotoName, setIdentityPhotoName] = useState<string | null>(null);

  // Carregar term acceptance com foto
  useEffect(() => {
    const loadTermAcceptance = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('comprehensive_term_acceptance')
          .select(`
            *,
            application_terms!comprehensive_term_acceptance_term_id_fkey (
              title,
              content
            )
          `)
          .eq('user_id', user.id)
          .eq('term_type', 'checkout_terms')
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const acceptance: TermAcceptance = {
            ...data,
            term_title: (data.application_terms as any)?.title || 'Checkout Terms',
          };
          setTermAcceptance(acceptance);

          // Carregar termo ativo usando o term_id do acceptance
          if (data.term_id) {
            await loadActiveTerm(data.term_id);
          } else {
            // Se não há term_id, buscar termo ativo mais recente
            await loadActiveTerm(null);
          }
        }
      } catch (err: any) {
        console.error('Error loading term acceptance:', err);
        setError(t('studentDashboard.identityVerification.errors.loadingStatus'));
      } finally {
        setLoading(false);
      }
    };

    loadTermAcceptance();
  }, [user?.id]);

  // Carregar termo ativo
  const loadActiveTerm = async (termId: string | null) => {
    try {
      setLoadingTerms(true);
      let query = supabase
        .from('application_terms')
        .select('*')
        .eq('is_active', true)
        .eq('term_type', 'checkout_terms');

      if (termId) {
        query = query.eq('id', termId);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (error) throw error;
      if (data) setActiveTerm(data);
    } catch (err: any) {
      console.error('Error loading term:', err);
    } finally {
      setLoadingTerms(false);
    }
  };

  // Verificar scroll
  const handleTermsScroll = () => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setHasScrolledToBottom(isAtBottom);
    }
  };

  const checkIfContentNeedsScroll = () => {
    if (termsContentRef.current) {
      const { scrollHeight, clientHeight } = termsContentRef.current;
      const needsScroll = scrollHeight > clientHeight;
      if (!needsScroll) {
        setHasScrolledToBottom(true);
      }
      return needsScroll;
    }
    return false;
  };

  // Aceitar termos
  const handleAcceptTerms = async () => {
    if (!hasScrolledToBottom || !activeTerm) return;

    try {
      const affiliateAdminId = await checkIfUserHasAffiliate();
      
      if (affiliateAdminId) {
        await recordAffiliateTermAcceptance(activeTerm.id, 'checkout_terms', affiliateAdminId);
      } else {
        await recordTermAcceptance(activeTerm.id, 'checkout_terms');
      }

      setTermsAccepted(true);
    } catch (err: any) {
      console.error('Error accepting terms:', err);
      setError(t('studentDashboard.identityVerification.errors.acceptingTerms'));
    }
  };

  // Enviar nova foto
  const handleSubmitNewPhoto = async () => {
    if (!termsAccepted) {
      setError(t('studentDashboard.identityVerification.errors.termsRequired'));
      return;
    }

    if (!identityPhotoPath) {
      setError(t('studentDashboard.identityVerification.errors.photoRequired'));
      return;
    }

    if (!termAcceptance || !activeTerm) {
      setError(t('studentDashboard.identityVerification.errors.termAcceptanceNotFound'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Buscar registro de aceitação mais recente
      const { data: termAcceptanceData, error: termError } = await supabase
        .from('comprehensive_term_acceptance')
        .select('id, accepted_at')
        .eq('user_id', user?.id)
        .eq('term_id', activeTerm.id)
        .eq('term_type', 'checkout_terms')
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (termError) throw termError;

      if (termAcceptanceData) {
        // Atualizar com nova foto e resetar status para 'pending'
        const { error: updateError } = await supabase
          .from('comprehensive_term_acceptance')
          .update({
            identity_photo_path: identityPhotoPath,
            identity_photo_name: identityPhotoName,
            identity_photo_status: 'pending',
            identity_photo_rejection_reason: null,
            identity_photo_reviewed_at: null,
            identity_photo_reviewed_by: null,
          })
          .eq('id', termAcceptanceData.id);

        if (updateError) {
          // Tentar via RPC se update direto falhar
          const { error: rpcError } = await supabase.rpc('update_term_acceptance_photo', {
            p_acceptance_id: termAcceptanceData.id,
            p_photo_path: identityPhotoPath,
            p_photo_name: identityPhotoName || '',
          });

          if (rpcError) throw rpcError;
        }

        setSuccess(t('studentDashboard.identityVerification.uploadNewPhoto.successMessage'));
        
        // Redirecionar para a página de aplicações após alguns segundos
        setTimeout(() => {
          navigate('/student/dashboard/applications');
        }, 2000);
      } else {
        throw new Error('Term acceptance record not found');
      }
    } catch (err: any) {
      console.error('Error submitting photo:', err);
        setError(t('studentDashboard.identityVerification.errors.submittingPhoto'));
    } finally {
      setSaving(false);
    }
  };

  // Verificar scroll quando termo carrega
  useEffect(() => {
    if (activeTerm && termsContentRef.current) {
      const timer = setTimeout(() => {
        checkIfContentNeedsScroll();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTerm]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!termAcceptance || !termAcceptance.identity_photo_path) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('studentDashboard.identityVerification.noPhotoFound.title')}</h2>
          <p className="text-slate-600">
            {t('studentDashboard.identityVerification.noPhotoFound.message')}
          </p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="mt-4 px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041f38] transition-colors"
          >
            {t('studentDashboard.identityVerification.noPhotoFound.goToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  const status = termAcceptance.identity_photo_status || 'pending';
  const rejectionReason = termAcceptance.identity_photo_rejection_reason;

  const getStatusDisplay = () => {
    switch (status) {
      case 'approved':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-600" />,
          title: t('studentDashboard.identityVerification.status.approved.title'),
          message: t('studentDashboard.identityVerification.status.approved.message'),
          color: 'green',
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-8 h-8 text-red-600" />,
          title: t('studentDashboard.identityVerification.status.rejected.title'),
          message: t('studentDashboard.identityVerification.status.rejected.message'),
          color: 'red',
        };
      default:
        return {
          icon: <Clock className="w-8 h-8 text-yellow-600" />,
          title: t('studentDashboard.identityVerification.status.pending.title'),
          message: t('studentDashboard.identityVerification.status.pending.message'),
          color: 'yellow',
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="flex items-center text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('studentDashboard.identityVerification.backToDashboard')}
        </button>
        <h1 className="text-3xl font-bold text-slate-900">{t('studentDashboard.identityVerification.title')}</h1>
        <p className="text-slate-600 mt-2">{t('studentDashboard.identityVerification.subtitle')}</p>
      </div>

      {/* Status Card - Unificado com motivo de rejeição quando aplicável */}
      <div className={`bg-white rounded-2xl shadow-sm border-2 p-6 mb-6 ${
        status === 'rejected' 
          ? 'border-red-300' 
          : status === 'approved' 
          ? 'border-green-300' 
          : 'border-yellow-300'
      }`}>
        <div className="flex items-start space-x-4">
          {statusDisplay.icon}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{statusDisplay.title}</h2>
            <p className="text-slate-600 mb-4">{statusDisplay.message}</p>
            
            {/* Motivo da rejeição integrado no mesmo card */}
            {status === 'rejected' && rejectionReason && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-2">{t('studentDashboard.identityVerification.status.rejected.rejectionReason')}</h3>
                    <p className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed bg-red-50 rounded-lg p-3 border border-red-100">
                      {rejectionReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload New Photo (only if rejected or if admin requests reupload) */}
      {status === 'rejected' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">{t('studentDashboard.identityVerification.uploadNewPhoto.title')}</h2>

          {/* Terms Acceptance */}
          {!termsAccepted && (
            <div className="border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('studentDashboard.identityVerification.uploadNewPhoto.termsTitle')}</h3>
              <p className="text-sm text-slate-600 mb-4">
                {t('studentDashboard.identityVerification.uploadNewPhoto.termsDescription')}
              </p>

              {loadingTerms ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : activeTerm ? (
                <>
                  <div
                    ref={termsContentRef}
                    onScroll={handleTermsScroll}
                    className="max-h-[600px] overflow-y-auto prose prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-headings:text-xl prose-headings:font-bold prose-p:text-base prose-p:leading-relaxed mb-4 border border-slate-200 rounded-lg p-6 bg-slate-50"
                    dangerouslySetInnerHTML={{ __html: activeTerm.content }}
                  />

                  {!hasScrolledToBottom && checkIfContentNeedsScroll() && (
                    <div className="flex items-center justify-center p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                      <Scroll className="h-4 w-4 text-amber-600 mr-2" />
                      <span className="text-amber-800 text-sm font-medium">
                        {t('studentDashboard.identityVerification.uploadNewPhoto.scrollToBottom')}
                      </span>
                    </div>
                  )}

                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        if (e.target.checked && hasScrolledToBottom) {
                          handleAcceptTerms();
                        } else {
                          setTermsAccepted(false);
                        }
                      }}
                      disabled={!hasScrolledToBottom}
                      className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">
                      {t('studentDashboard.identityVerification.uploadNewPhoto.acceptTerms')}
                    </span>
                  </label>
                </>
              ) : (
                <p className="text-slate-600">{t('studentDashboard.identityVerification.uploadNewPhoto.termsNotAvailable')}</p>
              )}
            </div>
          )}

          {/* Photo Upload */}
          {termsAccepted && (
            <div className="space-y-4">
              <IdentityPhotoUpload
                onUploadSuccess={(filePath, fileName) => {
                  setIdentityPhotoPath(filePath);
                  setIdentityPhotoName(fileName);
                }}
                onUploadError={(error) => {
                  setError(error);
                }}
                onRemove={() => {
                  setIdentityPhotoPath(null);
                  setIdentityPhotoName(null);
                }}
                initialPhotoPath={identityPhotoPath || undefined}
              />
            </div>
          )}

          {/* Submit Button */}
          {termsAccepted && (
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleSubmitNewPhoto}
                disabled={saving || !identityPhotoPath}
                className={`w-full px-6 py-3 rounded-xl font-semibold transition-all ${
                  identityPhotoPath && !saving
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('studentDashboard.identityVerification.uploadNewPhoto.submitting')}</span>
                  </div>
                ) : (
                  t('studentDashboard.identityVerification.uploadNewPhoto.submitButton')
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdentityVerification;

