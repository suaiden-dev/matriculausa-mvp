import React, { useState, useRef } from 'react';
import { Upload, DollarSign, CheckCircle, X, Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ZelleCheckoutProps {
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'i20_control_fee' | 'placement_fee';
  amount: number;
  scholarshipsIds?: string[];
  onError?: (message: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  className?: string;
  metadata?: {
    [key: string]: any;
    discount_applied?: boolean;
    original_amount?: number;
    final_amount?: number;
  };
  isPendingVerification?: boolean;
}

export const ZelleCheckout: React.FC<ZelleCheckoutProps> = ({
  feeType,
  amount,
  scholarshipsIds,
  onError,
  onProcessingChange,
  className = '',
  metadata = {},
  isPendingVerification = false
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'instructions' | 'upload' | 'analyzing' | 'success' | 'under_review' | 'rejected'>(
    isPendingVerification ? 'under_review' : 'instructions'
  );

  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manter referência estável para onProcessingChange, evitando loop
  // O problema: onProcessingChange é uma função inline no pai (SelectionFeeStep)
  // que é recriada a cada render. Se for usada como dependência do useEffect, gera loop.
  const onProcessingChangeRef = useRef(onProcessingChange);
  React.useEffect(() => {
    onProcessingChangeRef.current = onProcessingChange;
  }, [onProcessingChange]);

  // Sincronizar estado de processamento com o pai — usando ref para evitar loop
  React.useEffect(() => {
    onProcessingChangeRef.current?.(step === 'under_review' || loading);
  }, [step, loading]); // ← NÃO inclui onProcessingChange nas deps

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError(t('zelleComponent.errors.fileSize'));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError(t('zelleComponent.errors.fileType'));
        return;
      }

      setComprovanteFile(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setComprovantePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validatePayment = () => {
    if (!comprovanteFile) {
      setError(t('zelleComponent.errors.uploadRequired'));
      return false;
    }
    return true;
  };

  const uploadComprovante = async (): Promise<string | null> => {
    if (!comprovanteFile) return null;

    try {
      const timestamp = new Date().toISOString().replace(/[: .]/g, '-').slice(0, 19);
      const fileExt = comprovanteFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}_${feeType}.${fileExt}`;
      const filePath = `zelle-payments/${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('zelle_comprovantes')
        .upload(filePath, comprovanteFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('zelle_comprovantes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading comprovante:', error);
      throw new Error(t('zelleComponent.errors.uploadFailed'));
    }
  };

  const handleSubmit = async () => {
    if (!validatePayment()) return;

    setLoading(true);
    setError(null);

    try {
      const comprovanteUrl = await uploadComprovante();
      if (!comprovanteUrl) {
        throw new Error('Failed to upload payment confirmation');
      }

      // 🛡️ MUDANDO PARA ESTADO DE ANALISE (FEEDBACK VISUAL)
      setStep('analyzing');

      // 🛡️ ADAPTANDO AO SISTEMA VALIDADO DE EDGE FUNCTIONS
      // Chamamos create-zelle-payment com os campos obrigatórios esperados
      console.log('🚀 [ZelleCheckout] Invocando Edge Function create-zelle-payment...');

      const { data, error: functionError } = await supabase.functions.invoke('create-zelle-payment', {
        body: {
          fee_type: feeType,
          amount: amount,
          recipient_email: 'pay@matriculausa.com',
          recipient_name: 'Matricula USA',
          comprovante_url: comprovanteUrl,
          confirmation_code: `PROOF_${Date.now()}`,
          payment_date: new Date().toISOString(),
          scholarships_ids: scholarshipsIds,
          metadata: {
            ...metadata,
            source: 'onboarding_v2'
          }
        }
      });

      if (functionError) throw functionError;
      if (!data?.success) throw new Error(data?.error || 'Failed to process payment');

      // Se chegamos aqui, o pagamento foi criado e o webhook n8n disparado.
      // O estado 'analyzing' deve permanecer por alguns segundos OU 
      // podemos ir para 'under_review' se quisermos indicar que agora é a validação.
      // Vou mudar para 'under_review' após o sucesso da criação.
      setStep('under_review');
      setLoading(false);
      onProcessingChange?.(true);

    } catch (error: any) {
      console.error('❌ [ZelleCheckout] Erro no handleSubmit:', error);
      setError(error.message || 'An error occurred while processing your payment');
      onError?.(error.message);
      setLoading(false);
      setStep('upload'); // Volta para o upload em caso de erro
    }
  };

  const resetForm = () => {
    setComprovanteFile(null);
    setComprovantePreview(null);
    setError(null);
    setStep('instructions');
  };

  const getFeeLabel = () => {
    switch (feeType) {
      case 'selection_process': return 'Taxa de Processo de Seleção';
      case 'application_fee': return 'Taxa de Aplicação';
      case 'enrollment_fee': return 'Taxa de Matrícula';
      case 'scholarship_fee': return 'Taxa de Bolsa';
      case 'i20_control_fee': return 'Taxa de Controle I-20';
      case 'placement_fee': return 'Placement Fee';
      default: return (feeType as string).replace('_', ' ');
    }
  };

  if (step === 'analyzing') {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-[2rem] p-8 text-center ${className}`}>
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-blue-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
          <Hourglass className="w-10 h-10 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        <h3 className="text-2xl font-black text-blue-900 mb-2 uppercase tracking-tight">
          Processando Pagamento
        </h3>
        <p className="text-blue-700/80 mb-8 font-medium leading-relaxed max-w-xs mx-auto text-sm">
          Estamos registrando seu comprovante para iniciar a validação.
        </p>

        <div className="flex justify-center gap-1 mb-8">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
        </div>

        <div className="bg-white/60 p-4 rounded-2xl border border-blue-100 italic text-[11px] text-blue-500 font-medium">
          Aguarde, este processo pode levar alguns segundos...
        </div>
      </div>
    );
  }

  if (step === 'under_review') {
    return (
      <div className={`bg-white border border-gray-100 rounded-[2rem] p-8 text-center ${className}`}>
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 relative shadow-sm">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
          <div className="absolute inset-0 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
        </div>

        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
          Pagamento Enviado!
        </h3>
        <p className="text-slate-600 mb-6 font-medium leading-relaxed text-sm">
          Seu comprovante foi registrado com sucesso.
        </p>

        <div className="bg-gray-50 rounded-[1.5rem] p-6 mb-6 shadow-inner border border-gray-100 text-center space-y-3">
          <p className="text-sm font-bold text-slate-800">
            Seu pagamento está sendo processado e pode levar até 48 horas.
          </p>
        </div>

        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100/50">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Você será redirecionado para o próximo passo assim que a confirmação for concluída.
          </p>
        </div>


      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-[2rem] p-8 text-center ${className}`}>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-200 shadow-inner">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-2xl font-black text-green-900 mb-2 uppercase tracking-tight">
          Acesso Liberado!
        </h3>
        <p className="text-green-700/80 mb-6 font-medium leading-relaxed">
          Seu pagamento foi confirmado com sucesso. Bem-vindo à MatriculaUSA!
        </p>
        <button
          onClick={resetForm}
          className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition-all font-bold shadow-md transform active:scale-[0.98]"
        >
          Continuar para o Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Resumo do Pagamento */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <DollarSign className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Resumo do Pagamento</h3>
            <p className="text-xs text-gray-500">Revise os detalhes do seu pagamento</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start pb-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Taxa de Onboarding</p>
              <p className="text-xs text-gray-500">{getFeeLabel()}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</p>
              <p className="text-xs text-gray-500 font-medium">USD</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Detalhes do Pagamento Zelle</h4>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email do Destinatário</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-700 select-all cursor-pointer hover:bg-gray-100 transition-colors">
                pay@matriculausa.com
              </div>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
              <p className="text-xs text-blue-700 leading-relaxed font-medium">
                <strong>Importante:</strong><br />
                Certifique-se de que o valor exato do pagamento corresponde ao valor mostrado acima.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instruções de Pagamento */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Instruções de Pagamento</h3>

          <div className="space-y-6">
            <p className="text-sm font-semibold text-gray-700">Complete estes passos:</p>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                  1
                </div>
                <p className="text-sm text-gray-600 pt-1.5 font-medium">
                  Complete sua transferência Zelle do valor necessário
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                  2
                </div>
                <div className="space-y-3 pt-1.5">
                  <p className="text-sm text-gray-900 font-bold">
                    Salve a captura de tela de confirmação do pagamento
                  </p>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <span className="font-bold">Importante:</span> Envie a captura de tela que aparece imediatamente após o pagamento. Não envie arquivos PDF.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                  3
                </div>
                <p className="text-sm text-gray-600 pt-1.5 font-medium">
                  Envie sua captura de tela de confirmação abaixo
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 space-y-4">
            <h4 className="text-sm font-bold text-gray-900">Enviar Comprovante</h4>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-700 font-medium">{error}</span>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${comprovantePreview ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              onClick={() => !comprovantePreview && fileInputRef.current?.click()}
            >
              {comprovantePreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={comprovantePreview}
                      alt="Preview"
                      className="max-h-48 rounded-lg shadow-sm border border-white mx-auto"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setComprovanteFile(null);
                        setComprovantePreview(null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white w-12 h-12 rounded-full shadow-sm border border-gray-100 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                    <Upload className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">Clique para selecionar o comprovante</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">Formatos: JPG, PNG (máx. 5MB)</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !comprovanteFile}
              className="w-full bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition-all font-bold disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 shadow-md transform active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando...</span>
                </div>
              ) : 'Confirmar e Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
