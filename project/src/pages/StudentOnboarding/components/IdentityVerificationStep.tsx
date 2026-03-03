import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IdentityPhotoUpload } from '../../../components/IdentityPhotoUpload';
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Verificar se já existe foto enviada anteriormente
  useEffect(() => {
    const checkExisting = async () => {
      if (!user?.id) {
        setCheckingExisting(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('comprehensive_term_acceptance')
          .select('identity_photo_path')
          .eq('user_id', user.id)
          .not('identity_photo_path', 'is', null)
          .maybeSingle();

        if (data?.identity_photo_path) {
          setAlreadyVerified(true);
          setUploadedPath(data.identity_photo_path);
        }
      } catch (e) {
        // Silencioso — trataremos como não verificado
      } finally {
        setCheckingExisting(false);
      }
    };
    checkExisting();
  }, [user?.id]);

  const handleUploadSuccess = (filePath: string) => {
    // Apenas guardamos o path temporariamente. O envio de fato só ocorre ao clicar no botão.
    setUploadedPath(filePath);
  };

  const handleSendPhoto = async () => {
    if (!user || !uploadedPath) return;
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from('comprehensive_term_acceptance')
        .select('id')
        .eq('user_id', user.id)
        .eq('term_type', 'checkout_terms')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('comprehensive_term_acceptance')
          .update({
            identity_photo_path: uploadedPath,
            identity_photo_status: 'pending'
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data: latestTerm } = await supabase
          .from('application_terms')
          .select('id')
          .eq('term_type', 'checkout_terms')
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error } = await supabase
          .from('comprehensive_term_acceptance')
          .insert({
            user_id: user.id,
            term_id: latestTerm?.id,
            term_type: 'checkout_terms',
            identity_photo_path: uploadedPath,
            identity_photo_status: 'pending',
            accepted_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      setAlreadyVerified(true);
      toast.success('Foto enviada com sucesso!');
      
      // Avança diretamente após o envio explícito (já salvou no bd)
      onNext();
    } catch (err) {
      console.error('[IdentityVerificationStep] Erro ao salvar foto:', err);
      toast.error('Erro ao salvar foto. Tente novamente.');
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

  if (alreadyVerified) {
    return (
      <div className="space-y-8 sm:space-y-10 pb-12 max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center md:text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {t('selectionFeeStep.main.identityVerification')}
          </h2>
          <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mt-2">
            Verificação Concluída
          </p>
        </div>

        {/* Main White Container */}
        <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 text-center py-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Verificação concluída!</h3>
            <p className="text-gray-500 mb-8 font-medium">Sua foto de identificação já foi enviada. Você pode prosseguir para o questionário.</p>
            <button
              onClick={onNext}
              className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 pb-12">
      {/* Header */}
      <div className="mb-10 text-left">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-4 leading-none">
          {t('selectionFeeStep.main.identityVerification')}
        </h1>
      </div>

      {/* Card principal */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

        {/* Upload da selfie */}
        <div className="relative z-10 space-y-6">
          <IdentityPhotoUpload
            onUploadSuccess={(path) => handleUploadSuccess(path)}
            onUploadError={(err) => toast.error(err)}
            initialPhotoPath={uploadedPath || undefined}
            onRemove={() => setUploadedPath(null)}
            variant="large"
          />

            {/* Botão de prosseguir — só aparece após upload */}
            {uploadedPath && (
              <div className="flex justify-end">
                <button
                  onClick={handleSendPhoto}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? 'Enviando...' : 'Enviar Foto'}
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
