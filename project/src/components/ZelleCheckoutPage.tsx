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
  payment_id?: string;
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
  const amount = searchParams.get('amount') || '999';
  const scholarshipsIds = searchParams.get('scholarshipsIds') || '';
  const applicationFeeAmount = searchParams.get('applicationFeeAmount') ? parseFloat(searchParams.get('applicationFeeAmount')!) : undefined;
  
  // Normalizar feeType para lidar com inconsistências (i20_control_fee vs i-20_control_fee)
  const normalizedFeeType = feeType === 'i20_control_fee' ? 'i20_control' : feeType;

  // Debug logs
  console.log('🔍 [ZelleCheckoutPage] Componente renderizando - ID:', Math.random().toString(36).substr(2, 9));
  console.log('🔍 [ZelleCheckoutPage] feeType:', feeType);
  console.log('🔍 [ZelleCheckoutPage] normalizedFeeType:', normalizedFeeType);
  console.log('🔍 [ZelleCheckoutPage] amount:', amount);
  console.log('🔍 [ZelleCheckoutPage] activeDiscount:', activeDiscount);
  console.log('🔍 [ZelleCheckoutPage] searchParams:', Object.fromEntries(searchParams.entries()));

  // Informações das taxas
  const feeInfo: FeeInfo[] = [
    {
      type: 'selection_process',
      amount: activeDiscount && feeType === 'selection_process' ? 999 - (activeDiscount.discount_amount || 0) : 999,
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
      amount: 400,
      description: 'Scholarship Fee - Confirm your scholarship application',
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      type: 'i20_control',
      amount: 999,
      description: 'I-20 Control Fee - Document processing and validation',
      icon: <CreditCard className="w-6 h-6" />
    }
  ];

  const currentFee = feeInfo.find(fee => fee.type === normalizedFeeType) || feeInfo[0];
  
  console.log('🔍 [ZelleCheckoutPage] currentFee:', currentFee);
  console.log('🔍 [ZelleCheckoutPage] feeType recebido:', feeType);
  console.log('🔍 [ZelleCheckoutPage] normalizedFeeType usado:', normalizedFeeType);
  console.log('🔍 [ZelleCheckoutPage] feeInfo tipos disponíveis:', feeInfo.map(fee => fee.type));
  console.log('🔍 [ZelleCheckoutPage] Match encontrado:', feeInfo.find(fee => fee.type === normalizedFeeType) ? 'SIM' : 'NÃO');

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
    console.log('🔄 [ZelleCheckout] Estado de loading atual:', loading);
    
    // Proteção contra duplo clique
    if (loading) {
      console.log('⚠️ [ZelleCheckout] Já está processando, ignorando duplo clique');
      return;
    }
    
    console.log('✅ [ZelleCheckout] Iniciando processamento...');
    
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

    // Definir loading como true IMEDIATAMENTE para evitar duplicação
    console.log('🔄 [ZelleCheckout] Definindo loading como true');
    setLoading(true);
    
    console.log('🚀 [ZelleCheckout] Iniciando upload do arquivo:', selectedFile.name);
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

      // Verificar se já existe um pagamento similar recente (últimos 30 segundos) para evitar duplicação
      console.log('🔍 [ZelleCheckout] Verificando pagamentos duplicados...');
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      
      // Verificar duplicação mais abrangente - qualquer pagamento do mesmo usuário com mesmo valor e tipo
      const { data: existingPayment, error: checkError } = await supabase
        .from('zelle_payments')
        .select('id, fee_type, created_at')
        .eq('user_id', user?.id)
        .eq('amount', currentFee.amount)
        .eq('fee_type', normalizedFeeType) // ✅ Adicionar verificação por tipo de taxa
        .gte('created_at', thirtySecondsAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('🔍 [ZelleCheckout] Verificação de duplicação:', { 
        existingPayment, 
        checkError, 
        userId: user?.id, 
        amount: currentFee.amount,
        feeType: normalizedFeeType, // ✅ Adicionar tipo de taxa nos logs
        thirtySecondsAgo 
      });

      if (existingPayment && existingPayment.length > 0) {
        console.log('⚠️ [ZelleCheckout] Pagamento duplicado detectado!', existingPayment[0]);
        console.log('⚠️ [ZelleCheckout] Cancelando criação para evitar duplicação.');
        throw new Error('Duplicate payment detected. Please wait a moment before trying again.');
      }

      // Gerar ID único para o pagamento (será usado pelo n8n para criar o registro)
      console.log('💾 [ZelleCheckout] Gerando ID único para o pagamento...');
      const realPaymentId = crypto.randomUUID();
      console.log('✅ [ZelleCheckout] ID gerado:', realPaymentId);

      // Enviar webhook para n8n
      const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;
      
      // Payload padronizado para o webhook
      const webhookId = Math.random().toString(36).substr(2, 9);
      console.log('📤 [ZelleCheckout] Criando webhook payload - ID:', webhookId);
      
      const webhookPayload: WebhookPayload = {
        user_id: user?.id,
        image_url: imageUrl,
        value: currentFee.amount.toString(), // Apenas o número, sem símbolos
        currency: 'USD',
        fee_type: normalizedFeeType,
        timestamp: new Date().toISOString(),
        payment_id: realPaymentId // ID real do pagamento
      };

      // Adicionar scholarship_application_id se for taxa de bolsa
      if (normalizedFeeType === 'application_fee' || normalizedFeeType === 'scholarship_fee') {
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
        temp_payment_id: realPaymentId,
        fee_type: normalizedFeeType,
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
                
                // Verificar se a resposta é especificamente "The proof of payment is valid"
                const response = responseJson.response.toLowerCase();
                const isPositiveResponse = response === 'the proof of payment is valid.';
                
                if (!isPositiveResponse) {
                  console.log('❌ [ZelleCheckout] Resposta negativa detectada - enviando notificações para admin e aluno');
                  
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

                  // Enviar notificação para o aluno sobre o status do pagamento
                  try {
                    const studentNotificationPayload = {
                      tipo_notf: 'Pagamento Zelle em Processamento',
                      email_aluno: user?.email,
                      nome_aluno: userName,
                      email_universidade: user?.email, // Para o aluno, usar o próprio email
                      o_que_enviar: `Seu pagamento Zelle de ${currentFee.amount} USD para ${currentFee.description.split(' - ')[1]} está sendo processado. Você será notificado assim que o processamento for concluído.`,
                      temp_payment_id: realPaymentId,
                      fee_type: normalizedFeeType,
                      amount: currentFee.amount,
                      uploaded_at: new Date().toISOString(),
                      status: 'processing'
                    };

                    console.log('📧 [ZelleCheckout] Enviando notificação para aluno:', studentNotificationPayload);

                    const studentNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(studentNotificationPayload),
                    });
                    
                    if (studentNotificationResponse.ok) {
                      console.log('✅ [ZelleCheckout] Notificação para aluno enviada com sucesso!');
                    } else {
                      console.warn('⚠️ [ZelleCheckout] Erro ao enviar notificação para aluno:', studentNotificationResponse.status);
                    }
                  } catch (error) {
                    console.error('❌ [ZelleCheckout] Erro ao enviar notificação para aluno:', error);
                  }
                } else {
                  console.log('✅ [ZelleCheckout] Resposta positiva específica - pagamento aprovado automaticamente, não enviando notificação para admin');
                }
                
                // Armazenar a resposta do n8n no localStorage para a página de waiting
                localStorage.setItem(`n8n_response_${realPaymentId}`, JSON.stringify(responseJson));
                localStorage.setItem('latest_n8n_response', JSON.stringify(responseJson));
                console.log('💾 [ZelleCheckout] Resposta do n8n armazenada no localStorage');
                console.log('💾 [ZelleCheckout] Chave:', `n8n_response_${realPaymentId}`);
                console.log('💾 [ZelleCheckout] Valor:', JSON.stringify(responseJson));

                // Atualizar pagamento no banco com resultado do n8n
                console.log('💾 [ZelleCheckout] Atualizando pagamento no banco com resultado do n8n...');
                
                try {
                  // Buscar o pagamento mais recente do usuário para este tipo de taxa
                  const { data: recentPayment, error: findError } = await supabase
                    .from('zelle_payments')
                    .select('id')
                    .eq('user_id', user?.id)
                    .eq('fee_type', normalizedFeeType)
                    .eq('status', 'pending_verification')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                  if (findError || !recentPayment) {
                    console.error('❌ [ZelleCheckout] Pagamento não encontrado:', findError);
                    return;
                  }

                  console.log('🔍 [ZelleCheckout] Pagamento encontrado para atualização:', recentPayment.id);

                  // Atualizar o registro encontrado
                  const { data: updateData, error: updateError } = await supabase
                    .from('zelle_payments')
                    .update({
                      screenshot_url: imageUrl,
                      admin_notes: `n8n response: ${responseJson.response || responseText}`,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', recentPayment.id)
                    .select();

                  if (updateError) {
                    console.error('❌ [ZelleCheckout] Erro ao atualizar pagamento:', updateError);
                  } else {
                    console.log('✅ [ZelleCheckout] Pagamento atualizado com sucesso:', updateData);
                  }
                } catch (updateError) {
                  console.error('❌ [ZelleCheckout] Erro ao chamar Edge Function:', updateError);
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
      console.log('🔄 [ZelleCheckout] Redirecionando para waiting page com payment_id:', realPaymentId);
      navigate(`/checkout/zelle/waiting?payment_id=${realPaymentId}&fee_type=${normalizedFeeType}&amount=${currentFee.amount}&scholarshipsIds=${scholarshipsIds}`);
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
                      ${currentFee.amount}
                    </div>
                    <div className="text-sm text-gray-500">USD</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">{t('zelleCheckout.amount')}</span>
                    <span className="text-2xl font-bold text-gray-900">
                      ${currentFee.amount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Zelle Payment Information */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Zelle Payment Details</h2>
                  <p className="text-gray-600">Send your payment to the following recipient</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Email
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <code className="text-sm font-mono text-gray-900">info@thefutureofenglish.com</code>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Amount
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <span className="text-lg font-bold text-gray-900">${currentFee.amount} USD</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-gray-600 text-xs font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-800 font-medium">Important:</p>
                      <p className="text-sm text-gray-700">
                        Make sure to send the exact amount of <strong>${currentFee.amount} USD</strong> to <strong>info@thefutureofenglish.com</strong> via Zelle. 
                        Any discrepancy in amount or recipient will delay your payment processing.
                      </p>
                    </div>
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
