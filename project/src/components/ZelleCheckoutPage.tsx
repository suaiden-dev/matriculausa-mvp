import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Upload, X } from 'lucide-react';
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
  temp_payment_id?: string;
}

export const ZelleCheckoutPage: React.FC<ZelleCheckoutPageProps> = ({
  onSuccess,
  onError
}) => {

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
      const filePath = `zelle-payments/${user?.id}/${fileName}`;
      
      console.log('📁 [ZelleCheckout] Tentando upload para:', filePath);
      console.log('🪣 [ZelleCheckout] Bucket: zelle_comprovantes');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('zelle_comprovantes')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Não criar registro do pagamento aqui - deixar apenas o n8n gerenciar
      console.log('📤 [ZelleCheckout] Enviando apenas para n8n - sem INSERT direto no banco');

      // Enviar webhook para n8n
      const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;
      
      // Payload padronizado para o webhook
      const tempPaymentId = `temp_${Date.now()}_${user?.id}`;
      const webhookPayload: WebhookPayload = {
        user_id: user?.id,
        image_url: imageUrl,
        value: currentFee.amount.toString(), // Apenas o número, sem símbolos
        currency: 'USD',
        fee_type: feeType === 'i20_control_fee' ? 'i-20_control_fee' : feeType,
        timestamp: new Date().toISOString(),
        temp_payment_id: tempPaymentId // ID temporário para o n8n usar
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

      console.log('📤 [ZelleCheckout] Enviando webhooks para n8n:', webhookPayload);
      
      // Buscar nome completo do usuário
      let userName = user?.email || 'Usuário';
      try {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user?.id)
          .single();
        
        if (userProfile?.full_name) {
          userName = userProfile.full_name;
          console.log('✅ [ZelleCheckout] Nome do usuário encontrado:', userName);
        } else {
          console.log('⚠️ [ZelleCheckout] Nome completo não encontrado, usando email');
        }
      } catch (error) {
        console.log('⚠️ [ZelleCheckout] Erro ao buscar nome do usuário:', error);
      }

      // Criar payload de notificação para admin específico
      const notificationPayload = {
        tipo_notf: 'Pagamento Zelle pendente para avaliação',
        email_aluno: user?.email,
        nome_aluno: userName,
        email_universidade: 'newvicturibdev@gmail.com', // Admin específico
        o_que_enviar: `Novo pagamento Zelle de ${currentFee.amount} USD foi enviado para avaliação.`,
        temp_payment_id: tempPaymentId,
        fee_type: feeType,
        amount: currentFee.amount,
        uploaded_at: new Date().toISOString()
      };

      console.log('📧 [ZelleCheckout] Payload de notificação para admin:', notificationPayload);

      // Função para enviar webhooks - primeiro apenas o Zelle Validator
      const sendWebhooks = async () => {
        const webhooks = [
          {
            url: 'https://nwh.suaiden.com/webhook/zelle-global',
            payload: webhookPayload,
            name: 'Zelle Validator'
          }
        ];
        
        console.log('📤 [ZelleCheckout] Enviando webhooks em paralelo...');
        
        // Enviar webhooks em paralelo
        const results = await Promise.allSettled(
          webhooks.map(async (webhook) => {
            try {
              console.log(`📤 [ZelleCheckout] Enviando ${webhook.name}...`);
              const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhook.payload),
              });
              
              if (!response.ok) {
                throw new Error(`${webhook.name} failed: ${response.status} ${response.statusText}`);
              }
              
              console.log(`✅ [ZelleCheckout] ${webhook.name} enviado com sucesso!`);
              return { success: true, webhook: webhook.name, response };
            } catch (error) {
              console.error(`❌ [ZelleCheckout] ${webhook.name} falhou:`, error);
              return { success: false, webhook: webhook.name, error };
            }
          })
        );
        
        // Log dos resultados
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              console.log(`✅ [ZelleCheckout] ${result.value.webhook}: Sucesso`);
            } else {
              console.error(`❌ [ZelleCheckout] ${result.value.webhook}: Falhou`);
            }
          } else {
            console.error(`❌ [ZelleCheckout] ${webhooks[index].name}: Erro inesperado`);
          }
        });
        
        return results;
      };

      // Enviar webhooks
      const webhookResults = await sendWebhooks();
      
      // Verificar se pelo menos o webhook do Zelle foi enviado com sucesso
      const zelleWebhookSuccess = webhookResults[0]?.status === 'fulfilled' && 
                                 webhookResults[0]?.value?.success;
      
      if (!zelleWebhookSuccess) {
        console.warn('❌ [ZelleCheckout] Webhook do Zelle não foi enviado, mas o pagamento foi registrado');
      } else {
        console.log('✅ [ZelleCheckout] Webhook do Zelle enviado com sucesso!');
        
        // Capturar e mostrar a resposta do n8n (apenas do webhook do Zelle)
        try {
          const zelleWebhookResult = webhookResults[0];
          if (zelleWebhookResult?.status === 'fulfilled' && zelleWebhookResult.value?.response) {
            const responseText = await zelleWebhookResult.value.response.text();
            console.log('📥 [ZelleCheckout] Resposta bruta do n8n:', responseText);
            
            // Tentar fazer parse da resposta JSON
            try {
              const responseJson = JSON.parse(responseText);
              console.log('📥 [ZelleCheckout] Resposta JSON do n8n:', responseJson);
            
              // Verificar se tem o campo 'response' que você mencionou
              if (responseJson.response) {
                console.log('🎯 [ZelleCheckout] RESPOSTA DO N8N:', responseJson.response);
                console.log('🎯 [ZelleCheckout] Tipo da resposta:', typeof responseJson.response);
                
                // Verificar se a resposta é negativa (pagamento inválido)
                const isNegativeResponse = responseJson.response.toLowerCase().includes('not valid') || 
                                         responseJson.response.toLowerCase().includes('invalid') ||
                                         responseJson.response.toLowerCase().includes('rejected');
                
                if (isNegativeResponse) {
                  console.log('❌ [ZelleCheckout] Resposta negativa detectada - enviando notificação para admin');
                  
                  // Enviar notificação para admin apenas se o pagamento for inválido
                  try {
                    const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(notificationPayload),
                    });
                    
                    if (adminNotificationResponse.ok) {
                      console.log('✅ [ZelleCheckout] Notificação para admin enviada com sucesso!');
                    } else {
                      console.warn('⚠️ [ZelleCheckout] Erro ao enviar notificação para admin:', adminNotificationResponse.status);
                    }
                  } catch (error) {
                    console.error('❌ [ZelleCheckout] Erro ao enviar notificação para admin:', error);
                  }
                } else {
                  console.log('✅ [ZelleCheckout] Resposta positiva - pagamento aprovado automaticamente, não enviando notificação para admin');
                }
                
                // Armazenar a resposta do n8n no localStorage para a página de waiting
                localStorage.setItem(`n8n_response_${tempPaymentId}`, JSON.stringify(responseJson));
                localStorage.setItem('latest_n8n_response', JSON.stringify(responseJson));
                console.log('💾 [ZelleCheckout] Resposta do n8n armazenada no localStorage');
                console.log('💾 [ZelleCheckout] Chave:', `n8n_response_${tempPaymentId}`);
                console.log('💾 [ZelleCheckout] Valor:', JSON.stringify(responseJson));

                // Atualizar o screenshot_url na tabela zelle_payments (salvar apenas o path relativo)
                try {
                  console.log('🔄 [ZelleCheckout] Atualizando screenshot_url na tabela zelle_payments...');
                  // Extrair apenas o path relativo da URL completa
                  const relativePath = uploadData.path; // Já é o path relativo: zelle-payments/user_id/filename
                  console.log('📁 [ZelleCheckout] Path relativo a ser salvo:', relativePath);
                  
                  const { error: updateError } = await supabase
                    .from('zelle_payments')
                    .update({ screenshot_url: relativePath })
                    .eq('user_id', user?.id)
                    .eq('amount', amount.toString())
                    .eq('status', 'pending_verification')
                    .order('created_at', { ascending: false })
                    .limit(1);

                  if (updateError) {
                    console.error('❌ [ZelleCheckout] Erro ao atualizar screenshot_url:', updateError);
                  } else {
                    console.log('✅ [ZelleCheckout] screenshot_url atualizado com sucesso!');
                  }
                } catch (error) {
                  console.error('❌ [ZelleCheckout] Erro ao atualizar screenshot_url:', error);
                }
              }
              
              // Verificar outros campos possíveis
              if (responseJson.status) {
                console.log('📊 [ZelleCheckout] Status do n8n:', responseJson.status);
              }
              if (responseJson.details) {
                console.log('📋 [ZelleCheckout] Detalhes do n8n:', responseJson.details);
              }
              if (responseJson.confidence) {
                console.log('🎯 [ZelleCheckout] Confiança da análise:', responseJson.confidence);
              }
              
            } catch (jsonError) {
              console.log('⚠️ [ZelleCheckout] Resposta não é JSON válido:', jsonError);
              console.log('⚠️ [ZelleCheckout] Resposta como texto:', responseText);
            }
          }
        } catch (responseError) {
          console.error('❌ [ZelleCheckout] Erro ao ler resposta do webhook:', responseError);
        }
      }

      onSuccess?.();
      // Redirecionar para página de aguardo
      console.log('🔄 [ZelleCheckout] Redirecionando para waiting page com temp_payment_id:', tempPaymentId);
      navigate(`/checkout/zelle/waiting?temp_payment_id=${tempPaymentId}&fee_type=${feeType}&amount=${currentFee.amount}`);
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
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Payment Selection
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Zelle Payment Checkout
            </h1>
            <p className="text-gray-600">
              Complete your payment via Zelle transfer
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
                  <h2 className="text-lg font-semibold text-gray-900">Payment Summary</h2>
                  <p className="text-gray-600">Review your payment details</p>
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
                    <span className="text-lg font-medium text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${currentFee.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Instructions</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Instruções Importantes */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Important: Your payment confirmation MUST include:
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">1</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Confirmation Code</h5>
                        <p className="text-sm text-gray-600">The unique transaction code from Zelle</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">2</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Payment Date</h5>
                        <p className="text-sm text-gray-600">When the transfer was completed</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">3</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Payment Amount</h5>
                        <p className="text-sm text-gray-600">The exact amount transferred (${currentFee.amount} USD)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 font-medium text-sm">4</span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">Recipient</h5>
                        <p className="text-sm text-gray-600">Who received the payment</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passos do Processo */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Complete these steps:
                  </h4>
                  
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                      <span>Complete your Zelle transfer of <strong>${currentFee.amount} USD</strong> to the provided recipient</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                      <span>Save the payment confirmation screenshot that shows all required information</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                      <span>Upload your confirmation screenshot below</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                      <span>Submit for automatic verification (completed within 24 hours)</span>
                    </li>
                  </ol>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Confirmation Screenshot
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
                            Click to upload or drag and drop
                          </p>
                          <p className="text-sm text-gray-500">
                            PNG, JPG, GIF up to 10MB
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
                      Processing Payment...
                    </div>
                  ) : (
                    `Submit Payment Confirmation - $${currentFee.amount} USD`
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Important Information</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Secure Payment</h4>
                    <p className="text-sm text-gray-600">
                      Your payment information is encrypted and secure
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Verification Required</h4>
                    <p className="text-sm text-gray-600">
                      Payment will be verified automatically within 24 hours
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Zelle Transfer</h4>
                    <p className="text-sm text-gray-600">
                      Complete the transfer and upload your confirmation
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Payment Instructions</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Complete Zelle transfer to the provided recipient</li>
                  <li>Save the confirmation screenshot</li>
                  <li>Upload your confirmation screenshot</li>
                  <li>Submit for automatic verification</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
