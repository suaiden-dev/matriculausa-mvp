import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IdentityPhotoUpload, IdentityPhotoUploadRef } from '../../../components/IdentityPhotoUpload';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import toast from 'react-hot-toast';

interface IdentityVerificationStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const IdentityVerificationStep: React.FC<IdentityVerificationStepProps> = ({
  onNext,
}) => {
  const { t } = useTranslation(['registration', 'common']);
  const { user } = useAuth();
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const photoUploadRef = useRef<IdentityPhotoUploadRef>(null);

  // Verificar se já existe foto enviada anteriormente (lê de user_profiles)
  useEffect(() => {
    const checkExisting = async () => {
      if (!user?.id) {
        setCheckingExisting(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('identity_photo_path')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.identity_photo_path) {
          setAlreadyVerified(true);
          setUploadedPath(data.identity_photo_path);
        }
      } catch (e) {
        console.warn('[IdentityStep] Erro ao checar foto existente:', e);
      } finally {
        setCheckingExisting(false);
      }
    };
    checkExisting();
  }, [user?.id]);

  const handleUploadSuccess = (filePath: string) => {
    setUploadedPath(filePath);
  };

  const handleSendPhoto = async () => {
    if (!user || !uploadedPath) return;
    setSaving(true);

    try {
      // Gravar foto diretamente em user_profiles (fonte de verdade única)
      const { error } = await supabase
        .from('user_profiles')
        .update({
          identity_photo_path: uploadedPath,
          identity_photo_status: 'pending',
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setAlreadyVerified(true);
      toast.success(t('selectionSurvey.toastPhotoSuccess') || 'Sucesso!');
      onNext();
    } catch (err) {
      console.error('[IdentityVerificationStep] Erro ao salvar foto:', err);
      toast.error(t('selectionSurvey.toastPhotoError') || 'Erro ao enviar foto.');
    } finally {
      setSaving(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Traduções Fallback (Prevenção de Tela Branca se as chaves sumirem)
  const title = t('selectionSurvey.identityVerification') || 'Verificação de Identidade';
  const completedTitle = t('selectionSurvey.profilesIdentified') || 'Identidade Confirmada';
  const alreadySentText = t('selectionSurvey.identityVerifiedSuccess') || 'Você já enviou sua foto de identidade e ela está em análise.';
  const continueBtn = t('common:common.next') || 'Próximo';

  if (alreadyVerified) {
    return (
      <div className="space-y-8 sm:space-y-10 pb-12 max-w-4xl mx-auto px-4">
        <div className="text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{title}</h2>
        </div>
        <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          <div className="relative z-10 text-center py-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">{completedTitle}</h3>
            <p className="text-gray-500 mb-8 font-medium">{alreadySentText}</p>
            <button
              onClick={onNext}
              className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
            >
              {continueBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 pb-12">
      <div className="mb-10 text-left">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-4 leading-none">{title}</h1>
      </div>
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <IdentityPhotoUpload
            ref={photoUploadRef}
            onUploadSuccess={(path) => handleUploadSuccess(path)}
            onUploadError={(err) => toast.error(err)}
            initialPhotoPath={uploadedPath || undefined}
            onRemove={() => setUploadedPath(null)}
            variant="large"
            hideInternalActions={true}
          />
          <div className="flex justify-end gap-3 mt-6">
            {uploadedPath && (
              <button
                onClick={() => {
                  setUploadedPath(null);
                  if (photoUploadRef.current) photoUploadRef.current.clear();
                }}
                className="px-6 py-3 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-all border border-red-100"
              >
                {t('common:components.identityPhotoUpload.remove') || 'Remover'}
              </button>
            )}
            <button
              onClick={handleSendPhoto}
              disabled={!uploadedPath || saving}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 ${
                !uploadedPath ? 'opacity-40 cursor-not-allowed grayscale-[0.5]' : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {saving ? t('common:common.saving') || 'Salvando...' : continueBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
