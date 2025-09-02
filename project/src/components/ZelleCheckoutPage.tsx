import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';

interface ZelleCheckoutPageProps {
  feeType?: string;
  amount?: string;
  scholarshipsIds?: string;
  applicationFeeAmount?: number; // Novo campo para taxa de aplicação dinâmica
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface FeeInfo {
  type: string;
  amount: number;
  description: string;
  icon: React.ReactNode;
}

interface WebhookPayload {
  user_id?: string;
  image_url: string;
  value: string;
  currency: string;
  fee_type: string;
  timestamp: string;
  scholarship_application_id?: string;
}

export const ZelleCheckoutPage: React.FC<ZelleCheckoutPageProps> = ({
  onSuccess,
  onError
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estado para desconto ativo
  const [activeDiscount, setActiveDiscount] = useState<any>(null);

  // Verificar desconto ativo do usuário
  useEffect(() => {
    const checkActiveDiscount = async () => {
      if (!user) return;
      
      try {
        const { data: discountData, error: discountError } = await supabase
          .rpc('get_user_active_discount', {
            user_id_param: user.id
          });

        if (!discountError && discountData && discountData.has_discount) {
          setActiveDiscount(discountData);
          console.log('✅ [ZelleCheckoutPage] Desconto ativo encontrado:', discountData);
        } else {
          console.log('⚠️ [ZelleCheckoutPage] Nenhum desconto ativo encontrado');
        }
      } catch (error) {
        console.error('❌ [ZelleCheckoutPage] Erro ao verificar desconto:', error);
      }
    };

    checkActiveDiscount();
  }, [user]);

  // Obter parâmetros da URL
  const feeType = searchParams.get('type') || searchParams.get('feeType') || 'selection_process';
  const amount = searchParams.get('amount') || '600';
  const scholarshipsIds = searchParams.get('scholarshipsIds') || '';
  const applicationFeeAmount = searchParams.get('applicationFeeAmount') ? parseFloat(searchParams.get('applicationFeeAmount')!) : undefined;

  // Debug logs
  console.log('🔍 [ZelleCheckoutPage] Componente renderizando');
  console.log('🔍 [ZelleCheckoutPage] feeType:', feeType);
  console.log('🔍 [ZelleCheckoutPage] amount:', amount);
  console.log('🔍 [ZelleCheckoutPage] activeDiscount:', activeDiscount);
  console.log('🔍 [ZelleCheckoutPage] searchParams:', Object.fromEntries(searchParams.entries()));

  // Informações das taxas
  const feeInfo: FeeInfo[] = [
    {
      type: 'selection_process',
      amount: activeDiscount && feeType === 'selection_process' ? 600 - (activeDiscount.discount_amount || 0) : 600,
      description: `Selection Process Fee - Complete your application process${activeDiscount && feeType === 'selection_process' ? ` ($${activeDiscount.discount_amount || 0} discount applied)` : ''}`,
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      type: 'application_fee',
      amount: applicationFeeAmount || 350, // Usar valor dinâmico se disponível
      description: 'Application Fee - Apply for a specific scholarship',
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      type: 'scholarship_fee',
      amount: 850,
      description: 'Scholarship Fee - Confirm your scholarship application',
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      type: 'i-20_control_fee',
      amount: 1250,
      description: 'I-20 Control Fee - Document processing and validation',
      icon: <CreditCard className="w-6 h-6" />
    }
  ];

  const currentFee = feeInfo.find(fee => fee.type === feeType) || feeInfo[0];
  
  console.log('🔍 [ZelleCheckoutPage] currentFee:', currentFee);
  console.log('🔍 [ZelleCheckoutPage] feeType recebido:', feeType);
  console.log('🔍 [ZelleCheckoutPage] feeInfo tipos disponíveis:', feeInfo.map(fee => fee.type));
  console.log('🔍 [ZelleCheckoutPage] Match encontrado:', feeInfo.find(fee => fee.type === feeType) ? 'SIM' : 'NÃO');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [ZelleCheckout] Formulário submetido');
    console.log('📁 [ZelleCheckout] Arquivo selecionado:', selectedFile);
    console.log('💰 [ZelleCheckout] Tipo de taxa:', feeType);
    console.log('💵 [ZelleCheckout] Valor:', amount);
    
    if (!selectedFile) {
      console.log('❌ [ZelleCheckout] Nenhum arquivo selecionado');
      onError?.('Please select a payment confirmation screenshot');
      return;
    }

    if (!user?.id) {
      console.log('❌ [ZelleCheckout] Usuário não autenticado');
      onError?.('User not authenticated');
      return;
    }

    console.log('🚀 [ZelleCheckout] Iniciando upload do arquivo:', selectedFile.name);
    setLoading(true);
    try {
      // Upload do arquivo para Supabase Storage
      const fileName = `zelle-payment-${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const filePath = `${user?.id}/${fileName}`;
      
      console.log('📁 [ZelleCheckout] Tentando upload para:', filePath);
      console.log('🪣 [ZelleCheckout] Bucket: zelle_comprovantes');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('zelle_comprovantes')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Criar registro do pagamento
      const { data: paymentData, error: paymentError } = await supabase
        .from('zelle_payments')
        .insert({
          user_id: user?.id,
          fee_type: feeType,
          amount: currentFee.amount, // Usar o valor da taxa definida, não o parâmetro da URL
          recipient_name: 'To be verified from screenshot',
          recipient_email: 'To be verified from screenshot',
          confirmation_code: 'To be verified from screenshot',
          payment_date: new Date().toISOString().split('T')[0],
          payment_amount: `${currentFee.amount} USD`,
          screenshot_url: uploadData.path,
          status: 'pending_verification',
          scholarships_ids: scholarshipsIds ? scholarshipsIds.split(',') : []
        });

      if (paymentError) throw paymentError;

      // Enviar webhook para n8n
      const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;
      
      // Payload padronizado para o webhook
      const webhookPayload: WebhookPayload = {
        user_id: user?.id,
        image_url: imageUrl,
        value: currentFee.amount.toString(), // Apenas o número, sem símbolos
        currency: 'USD',
        fee_type: feeType === 'i20_control_fee' ? 'i-20_control_fee' : feeType,
        timestamp: new Date().toISOString()
      };

      // Adicionar scholarship_application_id se for taxa de bolsa
      if (feeType === 'application_fee' || feeType === 'scholarship_fee') {
        console.log('🔍 [ZelleCheckout] Buscando scholarship_application_id para taxa de bolsa');
        console.log('🔍 [ZelleCheckout] scholarshipsIds:', scholarshipsIds);
        console.log('🔍 [ZelleCheckout] user.id:', user?.id);
        
        if (scholarshipsIds) {
          // Se temos scholarshipsIds, buscar a candidatura correspondente
          const { data: applicationData } = await supabase
            .from('scholarship_applications')
            .select('id')
            .eq('student_id', user?.id)
            .in('scholarship_id', scholarshipsIds.split(','))
            .limit(1);
          
          if (applicationData && applicationData[0]) {
            webhookPayload.scholarship_application_id = applicationData[0].id;
            console.log('✅ [ZelleCheckout] scholarship_application_id encontrado:', applicationData[0].id);
          } else {
            console.log('⚠️ [ZelleCheckout] Nenhuma candidatura encontrada para os scholarshipsIds');
          }
        } else {
          console.log('⚠️ [ZelleCheckout] scholarshipsIds não disponível');
        }
      } else {
        console.log('ℹ️ [ZelleCheckout] Taxa global - não precisa de scholarship_application_id');
      }

      console.log('📤 [ZelleCheckout] Enviando webhook para n8n:', webhookPayload);
      
      const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/zelle-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        console.warn('Webhook não foi enviado, mas o pagamento foi registrado');
      }

      onSuccess?.();
      // Redirecionar para página de aguardo em vez de success
      if (paymentData && paymentData[0]) {
        const payment = paymentData[0] as any;
        navigate(`/checkout/zelle/waiting?payment_id=${payment.id}&fee_type=${feeType}&amount=${currentFee.amount}`);
      } else {
        navigate(`/checkout/zelle/waiting?fee_type=${feeType}&amount=${currentFee.amount}`);
      }
    } catch (error) {
      console.error('Error processing Zelle payment:', error);
      onError?.(error instanceof Error ? error.message : 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Language Selector */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('zelleCheckout.backToPaymentSelection')}
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('zelleCheckout.title')}
            </h1>
            <p className="text-gray-600">
              {t('zelleCheckout.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Summary */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('zelleCheckout.paymentSummary')}</h2>
                  <p className="text-gray-600">{t('zelleCheckout.reviewDetails')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {currentFee.description.split(' - ')[1]}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {currentFee.description.split(' - ')[0]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ${currentFee.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">USD</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">{t('zelleCheckout.amount')}</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${currentFee.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('zelleCheckout.instructions')}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Instruções Importantes */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    {t('zelleCheckout.requirements.title')}
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">1</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{t('zelleCheckout.requirements.confirmationCode')}</h5>
                        <p className="text-sm text-gray-600">{t('zelleCheckout.requirements.confirmationCodeDesc')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">2</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{t('zelleCheckout.requirements.paymentDate')}</h5>
                        <p className="text-sm text-gray-600">{t('zelleCheckout.requirements.paymentDateDesc')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">3</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{t('zelleCheckout.requirements.paymentAmount')}</h5>
                        <p className="text-sm text-gray-600">{t('zelleCheckout.requirements.paymentAmountDesc')} (${currentFee.amount} USD)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">4</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{t('zelleCheckout.requirements.recipient')}</h5>
                        <p className="text-sm text-gray-600">{t('zelleCheckout.requirements.recipientDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passos do Processo */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    {t('zelleCheckout.steps.title')}
                  </h4>
                  
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                      <span>{t('zelleCheckout.steps.step1')} <strong>${currentFee.amount} USD</strong> {t('zelleCheckout.step2')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                      <span>{t('zelleCheckout.steps.step2')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                      <span>{t('zelleCheckout.steps.step3')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                      <span>{t('zelleCheckout.steps.step4')}</span>
                    </li>
                  </ol>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('zelleCheckout.uploadReceipt')}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      name="payment-screenshot"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Payment confirmation"
                            className="max-w-full max-h-64 mx-auto rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-2">
                            {t('zelleCheckout.dragAndDrop')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {t('zelleCheckout.supportedFormats')}
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !selectedFile}
                  className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('zelleCheckout.processing')}
                    </div>
                  ) : (
                    `${t('zelleCheckout.submitPayment')} - $${currentFee.amount} USD`
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('zelleCheckout.importantInfo.title')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{t('zelleCheckout.importantInfo.securePayment')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('zelleCheckout.importantInfo.securePaymentDesc')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{t('zelleCheckout.importantInfo.verificationRequired')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('zelleCheckout.importantInfo.verificationRequiredDesc')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{t('zelleCheckout.importantInfo.zelleTransfer')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('zelleCheckout.importantInfo.zelleTransferDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">{t('zelleCheckout.importantInfo.paymentInstructions')}</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>{t('zelleCheckout.importantInfo.step1')}</li>
                  <li>{t('zelleCheckout.importantInfo.step2')}</li>
                  <li>{t('zelleCheckout.importantInfo.step3')}</li>
                  <li>{t('zelleCheckout.importantInfo.step4')}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
