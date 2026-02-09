import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { getN8nProxyUrl } from '../utils/storageProxy';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDynamicFees } from '../hooks/useDynamicFees';
import { sendTermAcceptanceNotificationAfterPayment } from '../pages/AdminDashboard/PaymentManagement/data/services/notificationsService';

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
  scholarships_ids?: string[];
}

export const ZelleCheckoutPage: React.FC<ZelleCheckoutPageProps> = ({
  onSuccess,
  onError
}) => {

  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const { getFeeAmount, userFeeOverrides, loading: feeLoading } = useFeeConfig(user?.id);
  const { selectionProcessFee, scholarshipFee, i20ControlFee, hasSellerPackage, packageName } = useDynamicFees();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feesLoading, setFeesLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para desconto ativo
  const [activeDiscount, setActiveDiscount] = useState<any>(null);
  
  // Estado para cupom promocional da Scholarship Fee
  const [scholarshipFeePromotionalCoupon, setScholarshipFeePromotionalCoupon] = useState<{
    discountAmount: number;
    finalAmount: number;
    code: string;
  } | null>(null);

  const [i20ControlFeePromotionalCoupon, setI20ControlFeePromotionalCoupon] = useState<{
    discountAmount: number;
    finalAmount: number;
    code: string;
  } | null>(null);

  // Obter parâmetros da URL (ANTES dos useEffects para evitar erros de inicialização)
  const feeType = searchParams.get('type') || searchParams.get('feeType') || 'selection_process';
  // Normalizar feeType para lidar com inconsistências (i20_control_fee vs i-20_control_fee)
  const normalizedFeeType = feeType === 'i20_control_fee' ? 'i20_control' : feeType;

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

  // Carregar cupom promocional do localStorage quando for scholarship_fee ou i20_control_fee
  useEffect(() => {
    // Verificar se o usuário pode usar cupom promocional
    const hasSellerReferralCode = userProfile?.seller_referral_code && userProfile.seller_referral_code.trim() !== '';
    const isLegacySystem = userProfile?.system_type === 'legacy';
    const canUsePromotionalCoupon = hasSellerReferralCode && isLegacySystem;
    
    if (!canUsePromotionalCoupon) {
      setScholarshipFeePromotionalCoupon(null);
      setI20ControlFeePromotionalCoupon(null);
      return;
    }
    
    // Carregar cupom para scholarship_fee
    if (normalizedFeeType !== 'scholarship_fee') {
      setScholarshipFeePromotionalCoupon(null);
    }
    
    // Carregar cupom para i20_control_fee
    if (normalizedFeeType !== 'i20_control') {
      setI20ControlFeePromotionalCoupon(null);
    }

    // Carregar do localStorage
    const checkPromotionalCoupon = () => {
      try {
        const savedCoupon = localStorage.getItem('__promotional_coupon_scholarship_fee');
        if (savedCoupon) {
          const couponData = JSON.parse(savedCoupon);
          // Verificar se o cupom ainda é válido (menos de 24 horas)
          const isExpired = Date.now() - couponData.timestamp > 24 * 60 * 60 * 1000;
          
          if (!isExpired && couponData.validation && couponData.validation.isValid) {
            setScholarshipFeePromotionalCoupon({
              discountAmount: couponData.validation.discountAmount || 0,
              finalAmount: couponData.validation.finalAmount || (scholarshipFee ? parseFloat(scholarshipFee.replace('$', '')) : 0),
              code: couponData.code
            });
            console.log('[ZelleCheckoutPage] Cupom promocional carregado do localStorage:', couponData.code);
          } else {
            // Remover cupom expirado
            localStorage.removeItem('__promotional_coupon_scholarship_fee');
            setScholarshipFeePromotionalCoupon(null);
          }
        } else {
          setScholarshipFeePromotionalCoupon(null);
        }
      } catch (error) {
        console.error('[ZelleCheckoutPage] Erro ao carregar cupom do localStorage:', error);
        setScholarshipFeePromotionalCoupon(null);
      }
    };

    checkPromotionalCoupon();
    
    // Carregar cupom para i20_control_fee
    const checkI20PromotionalCoupon = () => {
      if (normalizedFeeType !== 'i20_control') return;
      
      try {
        const savedCoupon = localStorage.getItem('__promotional_coupon_i20_control_fee');
        if (savedCoupon) {
          const couponData = JSON.parse(savedCoupon);
          // Verificar se o cupom ainda é válido (menos de 24 horas)
          const isExpired = Date.now() - couponData.timestamp > 24 * 60 * 60 * 1000;
          
          if (!isExpired && couponData.validation && couponData.validation.isValid) {
            setI20ControlFeePromotionalCoupon({
              discountAmount: couponData.validation.discountAmount || 0,
              finalAmount: couponData.validation.finalAmount || (i20ControlFee ? parseFloat(i20ControlFee.replace('$', '')) : 0),
              code: couponData.code
            });
            console.log('[ZelleCheckoutPage] Cupom promocional I-20 carregado do localStorage:', couponData.code);
          } else {
            // Remover cupom expirado
            localStorage.removeItem('__promotional_coupon_i20_control_fee');
            setI20ControlFeePromotionalCoupon(null);
          }
        } else {
          setI20ControlFeePromotionalCoupon(null);
        }
      } catch (error) {
        console.error('[ZelleCheckoutPage] Erro ao carregar cupom I-20 do localStorage:', error);
        setI20ControlFeePromotionalCoupon(null);
      }
    };
    
    checkI20PromotionalCoupon();
    
    // Verificar periodicamente e ouvir eventos
    const interval = setInterval(() => {
      checkPromotionalCoupon();
      checkI20PromotionalCoupon();
    }, 1000);
    
    // Ouvir eventos de validação de cupom do modal
    const handleCouponValidation = (event: CustomEvent) => {
      if (event.detail?.isValid && event.detail?.discountAmount) {
        if (normalizedFeeType === 'scholarship_fee') {
        const baseAmount = scholarshipFee ? parseFloat(scholarshipFee.replace('$', '')) : 0;
        setScholarshipFeePromotionalCoupon({
          discountAmount: event.detail.discountAmount,
          finalAmount: event.detail.finalAmount || (baseAmount - event.detail.discountAmount),
          code: (window as any).__checkout_promotional_coupon || 'BLACK'
        });
        } else if (normalizedFeeType === 'i20_control') {
          const baseAmount = i20ControlFee ? parseFloat(i20ControlFee.replace('$', '')) : 0;
          setI20ControlFeePromotionalCoupon({
            discountAmount: event.detail.discountAmount,
            finalAmount: event.detail.finalAmount || (baseAmount - event.detail.discountAmount),
            code: (window as any).__checkout_promotional_coupon || 'BLACK'
          });
        }
      } else {
        // Se o cupom foi removido, limpar estado
        if (normalizedFeeType === 'scholarship_fee') {
        const savedCoupon = localStorage.getItem('__promotional_coupon_scholarship_fee');
        if (!savedCoupon) {
          setScholarshipFeePromotionalCoupon(null);
          }
        } else if (normalizedFeeType === 'i20_control') {
          const savedCoupon = localStorage.getItem('__promotional_coupon_i20_control_fee');
          if (!savedCoupon) {
            setI20ControlFeePromotionalCoupon(null);
          }
        }
      }
    };

    window.addEventListener('promotionalCouponValidated', handleCouponValidation as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('promotionalCouponValidated', handleCouponValidation as EventListener);
    };
  }, [userProfile?.seller_referral_code, userProfile?.system_type, normalizedFeeType, scholarshipFee, i20ControlFee]);

  // Obter outros parâmetros da URL
  const amount = searchParams.get('amount') || getFeeAmount('selection_process').toString();
  const scholarshipsIds = searchParams.get('scholarshipsIds') || '';
  const applicationFeeAmount = searchParams.get('applicationFeeAmount') ? parseFloat(searchParams.get('applicationFeeAmount')!) : undefined;
  
  // Guardar resolução de bolsa/aplicação para uso em múltiplos pontos do fluxo
  let resolvedScholarshipId: string | null = null;

  // Debug logs
  console.log('🔍 [ZelleCheckoutPage] Componente renderizando - ID:', Math.random().toString(36).substr(2, 9));
  console.log('🔍 [ZelleCheckoutPage] feeType:', feeType);
  console.log('🔍 [ZelleCheckoutPage] normalizedFeeType:', normalizedFeeType);
  console.log('🔍 [ZelleCheckoutPage] amount:', amount);
  console.log('🔍 [ZelleCheckoutPage] activeDiscount:', activeDiscount);
  console.log('🔍 [ZelleCheckoutPage] searchParams:', Object.fromEntries(searchParams.entries()));

  // Informações das taxas - usar valores dinâmicos que já consideram system_type
  const feeInfo: FeeInfo[] = [
    {
      type: 'selection_process',
      amount: (() => {
        // ✅ CORREÇÃO: Usar sempre useDynamicFees que já considera system_type e dependentes
        // ✅ Priorizar valor da URL se estiver presente (já vem com desconto aplicado)
        if (!selectionProcessFee) return 0; // Aguardar carregamento
        const base = parseFloat(selectionProcessFee.replace('$', ''));
        
        // Se há valor na URL e é diferente do base, usar o valor da URL (já tem desconto aplicado)
        if (normalizedFeeType === 'selection_process') {
          const amountFromUrl = searchParams.get('amount');
          if (amountFromUrl) {
            const urlAmount = parseFloat(amountFromUrl);
            if (!Number.isNaN(urlAmount) && urlAmount !== base) {
              console.log('[ZelleCheckoutPage] ✅ Usando valor da URL (com desconto) para selection_process:', urlAmount, 'vs base:', base);
              return urlAmount;
            }
          }
        }
        
        // Aplicar desconto de referral code se houver
        const discount = (activeDiscount && feeType === 'selection_process') ? (activeDiscount.discount_amount || 0) : 0;
        return Math.max(0, base - discount);
      })(),
      description: `${t('feeDescriptions.selectionProcess')}${hasSellerPackage ? ` (${packageName})` : ''}${activeDiscount && feeType === 'selection_process' ? ` ($${activeDiscount.discount_amount || 0} discount applied)` : ''}`,
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      type: 'application_fee',
      amount: (() => {
        // Se veio pela URL (modal já calculou), respeitar o valor final sem recomputar
        if (normalizedFeeType === 'application_fee') {
          if (typeof applicationFeeAmount === 'number' && !Number.isNaN(applicationFeeAmount)) {
            return applicationFeeAmount;
          }
          const amountFromUrl = parseFloat(amount);
          if (!Number.isNaN(amountFromUrl)) {
            return amountFromUrl;
          }
        }

        // Fallback: calcular localmente (base + $100 por dependente para ambos os sistemas)
        const baseAmount = getFeeAmount('application_fee');
        const dependents = Number(userProfile?.dependents) || 0;
        return dependents > 0
          ? baseAmount + dependents * 100
          : baseAmount;
      })(),
      description: t('feeDescriptions.applicationFee'),
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      type: 'scholarship_fee',
      // ✅ CORREÇÃO: Usar sempre useDynamicFees que já considera system_type
      // ✅ Aplicar desconto do cupom promocional se houver
      // ✅ Priorizar valor da URL se estiver presente (já vem com desconto aplicado)
      amount: (() => {
        const baseAmount = scholarshipFee ? parseFloat(scholarshipFee.replace('$', '')) : 0;
        
        // Se há valor na URL e é diferente do base, usar o valor da URL (já tem desconto aplicado)
        if (normalizedFeeType === 'scholarship_fee') {
          const amountFromUrl = searchParams.get('amount') || searchParams.get('scholarshipFeeAmount');
          if (amountFromUrl) {
            const urlAmount = parseFloat(amountFromUrl);
            if (!Number.isNaN(urlAmount) && urlAmount !== baseAmount) {
              console.log('[ZelleCheckoutPage] ✅ Usando valor da URL (com desconto):', urlAmount, 'vs base:', baseAmount);
              return urlAmount;
            }
          }
        }
        
        // Se há cupom promocional no localStorage, usar o valor do cupom
        if (scholarshipFeePromotionalCoupon && normalizedFeeType === 'scholarship_fee') {
          console.log('[ZelleCheckoutPage] ✅ Usando valor do cupom promocional:', scholarshipFeePromotionalCoupon.finalAmount);
          return scholarshipFeePromotionalCoupon.finalAmount;
        }
        
        return baseAmount;
      })(),
      description: `${t('feeDescriptions.scholarshipFee')}${hasSellerPackage ? ` (${packageName})` : ''}${scholarshipFeePromotionalCoupon && normalizedFeeType === 'scholarship_fee' ? ` (Cupom ${scholarshipFeePromotionalCoupon.code} - $${scholarshipFeePromotionalCoupon.discountAmount.toFixed(2)} desconto)` : ''}`,
      icon: <CreditCard className="w-6 h-6" />
    },
    {
      type: 'i20_control',
      amount: (() => {
      // ✅ CORREÇÃO: Usar sempre useDynamicFees que já considera system_type
        if (!i20ControlFee) return 0; // Aguardar carregamento
        const baseAmount = parseFloat(i20ControlFee.replace('$', ''));
        
        // Se há valor na URL e é diferente do base, usar o valor da URL (já tem desconto aplicado)
        if (normalizedFeeType === 'i20_control') {
          const amountFromUrl = searchParams.get('amount') || searchParams.get('i20ControlFeeAmount');
          if (amountFromUrl) {
            const urlAmount = parseFloat(amountFromUrl);
            if (!Number.isNaN(urlAmount) && urlAmount !== baseAmount) {
              console.log('[ZelleCheckoutPage] ✅ Usando valor da URL (com desconto) para i20_control:', urlAmount, 'vs base:', baseAmount);
              return urlAmount;
            }
          }
        }
        
        // Se há cupom promocional no localStorage, usar o valor do cupom
        if (i20ControlFeePromotionalCoupon && normalizedFeeType === 'i20_control') {
          console.log('[ZelleCheckoutPage] ✅ Usando valor do cupom promocional:', i20ControlFeePromotionalCoupon.finalAmount);
          return i20ControlFeePromotionalCoupon.finalAmount;
        }
        
        return baseAmount;
      })(),
      description: `${t('feeDescriptions.i20ControlFee')}${hasSellerPackage ? ` (${packageName})` : ''}${i20ControlFeePromotionalCoupon && normalizedFeeType === 'i20_control' ? ` (Cupom ${i20ControlFeePromotionalCoupon.code} - $${i20ControlFeePromotionalCoupon.discountAmount.toFixed(2)} desconto)` : ''}`,
      icon: <CreditCard className="w-6 h-6" />
    }
  ];

  const currentFee = feeInfo.find(fee => fee.type === normalizedFeeType) || feeInfo[0];
  
  console.log('🔍 [ZelleCheckoutPage] currentFee:', currentFee);
  // Controlar skeleton até que o cálculo dinâmico estabilize
  useEffect(() => {
    console.log('🔍 [ZelleCheckoutPage] useEffect de feesLoading disparado.');
    console.log('  user:', user);
    console.log('  userProfile?.system_type:', userProfile?.system_type);
    console.log('  feeLoading:', feeLoading);
    console.log('  selectionProcessFee:', selectionProcessFee);
    console.log('  scholarshipFee:', scholarshipFee);
    console.log('  i20ControlFee:', i20ControlFee);

    const debounce = setTimeout(() => {
      // Verificar se as taxas estão carregadas baseado no system_type
      const isFeesLoaded = (() => {
        // Verificar se as taxas estão definidas e não vazias
        const feesDefined = selectionProcessFee && selectionProcessFee.trim() !== '' && 
                           scholarshipFee && scholarshipFee.trim() !== '' && 
                           i20ControlFee && i20ControlFee.trim() !== '';
        
        // Verificar se não está carregando baseado no system_type
        const notLoading = userProfile?.system_type === 'simplified' 
          ? true // useDynamicFees já gerencia o loading interno
          : !feeLoading;
        
        const loaded = notLoading && feesDefined;
        
        console.log('  [isFeesLoaded] ->', loaded, { 
          systemType: userProfile?.system_type,
          feeLoading,
          feesDefined,
          notLoading,
          selectionProcessFee: selectionProcessFee, 
          scholarshipFee: scholarshipFee, 
          i20ControlFee: i20ControlFee 
        });
        
        return loaded;
      })();
      
      if (user !== undefined && isFeesLoaded) {
        console.log('✅ [ZelleCheckoutPage] setFeesLoading(false) chamado!');
        setFeesLoading(false);
      } else {
        console.log('❌ [ZelleCheckoutPage] setFeesLoading(false) NÃO chamado. Condições:', { userDefined: user !== undefined, isFeesLoaded });
      }
    }, 250);
    return () => clearTimeout(debounce);
  }, [user, userProfile?.system_type, feeLoading, selectionProcessFee, scholarshipFee, i20ControlFee]);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
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

      // ✅ Enviar documento de aceitação de termos imediatamente após upload do comprovante (apenas para selection_process)
      // Isso garante que o documento seja enviado independentemente de aprovação automática ou manual
      if (normalizedFeeType === 'selection_process' && user?.id) {
        try {
          console.log('📧 [ZelleCheckout] Enviando documento de aceitação de termos após upload do comprovante...');
          await sendTermAcceptanceNotificationAfterPayment(user.id, 'selection_process');
          console.log('✅ [ZelleCheckout] Documento de aceitação de termos enviado com sucesso');
        } catch (notificationError) {
          console.error('❌ [ZelleCheckout] Erro ao enviar documento de aceitação de termos:', notificationError);
          // Não falhar o processo se a notificação falhar
        }
      }

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
      const realPaymentId = generateUUID();
      console.log('✅ [ZelleCheckout] ID gerado:', realPaymentId);

      // Enviar webhook para n8n
      const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;
      const proxiedImageUrl = getN8nProxyUrl(imageUrl);
      
      // Payload padronizado para o webhook
      const webhookId = Math.random().toString(36).substr(2, 9);
      console.log('📤 [ZelleCheckout] Criando webhook payload - ID:', webhookId);
      
      const webhookPayload: WebhookPayload = {
        user_id: user?.id,
        image_url: proxiedImageUrl,
        value: currentFee.amount.toString(), // Apenas o número, sem símbolos (já com desconto aplicado se houver cupom)
        currency: 'USD',
        fee_type: normalizedFeeType,
        timestamp: new Date().toISOString(),
        payment_id: realPaymentId // ID real do pagamento
      };
      
      // Adicionar cupom promocional ao payload se aplicável
      if (normalizedFeeType === 'scholarship_fee' && scholarshipFeePromotionalCoupon) {
        (webhookPayload as any).promotional_coupon = scholarshipFeePromotionalCoupon.code;
        (webhookPayload as any).promotional_discount_amount = scholarshipFeePromotionalCoupon.discountAmount;
        (webhookPayload as any).original_amount = scholarshipFee ? parseFloat(scholarshipFee.replace('$', '')) : currentFee.amount;
        (webhookPayload as any).final_amount = currentFee.amount;
        console.log('[ZelleCheckoutPage] Cupom promocional adicionado ao webhook payload:', scholarshipFeePromotionalCoupon.code);
      } else if (normalizedFeeType === 'i20_control' && i20ControlFeePromotionalCoupon) {
        (webhookPayload as any).promotional_coupon = i20ControlFeePromotionalCoupon.code;
        (webhookPayload as any).promotional_discount_amount = i20ControlFeePromotionalCoupon.discountAmount;
        (webhookPayload as any).original_amount = i20ControlFee ? parseFloat(i20ControlFee.replace('$', '')) : currentFee.amount;
        (webhookPayload as any).final_amount = currentFee.amount;
        console.log('[ZelleCheckoutPage] Cupom promocional I-20 adicionado ao webhook payload:', i20ControlFeePromotionalCoupon.code);
      }

      // Incluir scholarships_ids diretamente do parâmetro de URL, se disponível
      if ((normalizedFeeType === 'application_fee' || normalizedFeeType === 'scholarship_fee') && scholarshipsIds) {
        const idsFromUrl = scholarshipsIds.split(',').map((s) => s.trim()).filter(Boolean);
        if (idsFromUrl.length > 0) {
          webhookPayload.scholarships_ids = idsFromUrl;
          // Se houver apenas um ID, já resolver para uso posterior
          if (idsFromUrl.length === 1) {
            resolvedScholarshipId = idsFromUrl[0];
          }
        }
      }

      // Adicionar scholarship_application_id se for taxa de bolsa
      if (normalizedFeeType === 'application_fee' || normalizedFeeType === 'scholarship_fee') {
        console.log('🔍 [ZelleCheckout] Buscando scholarship_application_id para taxa de bolsa');
        console.log('🔍 [ZelleCheckout] scholarshipsIds:', scholarshipsIds);
        console.log('🔍 [ZelleCheckout] user.id:', user?.id);
        
        if (scholarshipsIds) {
          // Se temos scholarshipsIds, buscar a candidatura correspondente
          const { data: applicationData } = await supabase
            .from('scholarship_applications')
            .select('id, scholarship_id')
            .eq('student_id', user?.id)
            .in('scholarship_id', scholarshipsIds.split(','))
            .limit(1);
          
          if (applicationData && applicationData[0]) {
            webhookPayload.scholarship_application_id = applicationData[0].id;
            if ((applicationData[0] as any).scholarship_id) {
              resolvedScholarshipId = (applicationData[0] as any).scholarship_id as string;
              // Apenas definir se ainda não veio do parâmetro
              if (!webhookPayload.scholarships_ids || webhookPayload.scholarships_ids.length === 0) {
                webhookPayload.scholarships_ids = [resolvedScholarshipId];
              }
            }
            console.log('✅ [ZelleCheckout] scholarship_application_id encontrado:', applicationData[0].id);
            console.log('✅ [ZelleCheckout] scholarship_id resolvido:', resolvedScholarshipId);
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
      
      // Buscar nome completo e telefone do usuário
      let userName = user?.email || 'Usuário';
      let userPhone = '';
      try {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('full_name, phone')
          .eq('user_id', user?.id)
          .single();
        
        if (userProfile?.full_name) {
          userName = userProfile.full_name;
          console.log('✅ [ZelleCheckout] Nome do usuário encontrado:', userName);
        } else {
          console.log('⚠️ [ZelleCheckout] Nome completo não encontrado, usando email');
        }
        
        if (userProfile?.phone) {
          userPhone = userProfile.phone;
          console.log('✅ [ZelleCheckout] Telefone do usuário encontrado:', userPhone);
        } else {
          console.log('⚠️ [ZelleCheckout] Telefone do usuário não encontrado');
        }
      } catch (error) {
        console.log('⚠️ [ZelleCheckout] Erro ao buscar dados do usuário:', error);
      }

      // Detectar ambiente de desenvolvimento
      // Apenas filtrar emails em localhost (desenvolvimento local)
      // Staging e produção recebem notificações normalmente
      const isDevelopment = (() => {
        const hostname = window.location.hostname;
        // Apenas considerar desenvolvimento se for realmente localhost
        // Staging (staging-matriculausa.netlify.app) e produção não devem filtrar
        const isLocalhost = hostname === 'localhost' || 
                           hostname === '127.0.0.1' || 
                           hostname === '0.0.0.0' ||
                           hostname.includes('localhost');
        return isLocalhost;
      })();
      
      // Emails a serem filtrados em ambiente de desenvolvimento
      const devBlockedEmails = [
        'luizedmiola@gmail.com',
        'chimentineto@gmail.com',
        'fsuaiden@gmail.com',
        'rayssathefuture@gmail.com'
      ];
      
      // Buscar todos os administradores do sistema
      let admins: Array<{ email: string; full_name: string; phone: string }> = [];
      
      try {
        const { data: adminProfiles, error: adminProfileError } = await supabase
          .from('user_profiles')
          .select('email, full_name, phone')
          .eq('role', 'admin');
        
        if (adminProfiles && !adminProfileError && adminProfiles.length > 0) {
          admins = adminProfiles
            .filter(admin => admin.email) // Apenas admins com email
            .map(admin => ({
              email: admin.email || '',
              full_name: admin.full_name || 'Admin MatriculaUSA',
              phone: admin.phone || ''
            }));
          
          // Filtrar emails bloqueados em desenvolvimento
          if (isDevelopment) {
            const beforeFilter = admins.length;
            admins = admins.filter(admin => !devBlockedEmails.includes(admin.email));
            if (beforeFilter !== admins.length) {
              console.log(`[ZelleCheckout] Filtrados ${beforeFilter - admins.length} admin(s) em ambiente de desenvolvimento`);
            }
          }
          
          console.log(`✅ [ZelleCheckout] Encontrados ${admins.length} admin(s)${isDevelopment ? ' (filtrados para dev)' : ''}:`, admins.map(a => a.email));
        } else {
          // Fallback: usar admin padrão se não encontrar nenhum
          console.log('⚠️ [ZelleCheckout] Nenhum admin encontrado, usando admin padrão');
          admins = [{
            email: 'admin@matriculausa.com',
            full_name: 'Admin MatriculaUSA',
            phone: ''
          }];
        }
      } catch (error) {
        console.log('⚠️ [ZelleCheckout] Erro ao buscar admins, usando admin padrão:', error);
        admins = [{
          email: 'admin@matriculausa.com',
          full_name: 'Admin MatriculaUSA',
          phone: ''
        }];
      }

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
                
                // ✅ SEMPRE atualizar o pagamento no banco com a imagem e resposta do n8n
                console.log('💾 [ZelleCheckout] Atualizando pagamento no banco com resultado do n8n...');

                try {
                  // Aguardar um pouco para o n8n processar e criar o registro
                  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos de delay
                  
                  // Buscar o pagamento mais recente do usuário para este tipo de taxa
                  // Tentar várias vezes se não encontrar
                  let recentPayment = null;
                  let findError = null;
                  let attempts = 0;
                  const maxAttempts = 5;
                  
                  while (attempts < maxAttempts && !recentPayment) {
                    attempts++;
                    console.log(`🔍 [ZelleCheckout] Tentativa ${attempts}/${maxAttempts} de buscar pagamento...`);
                    
                    // Primeiro tentar buscar com fee_type específico
                    let { data, error } = await supabase
                      .from('zelle_payments')
                      .select('id')
                      .eq('user_id', user?.id)
                      .eq('fee_type', normalizedFeeType)
                      .eq('status', 'pending_verification')
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .single();

                    // Se não encontrar com fee_type específico, buscar por valor e status (para pagamentos criados pelo n8n)
                    if (error && error.code === 'PGRST116') {
                      console.log(`🔍 [ZelleCheckout] Não encontrado com fee_type específico, buscando por valor e status...`);
                      const { data: dataByAmount, error: errorByAmount } = await supabase
                        .from('zelle_payments')
                        .select('id')
                        .eq('user_id', user?.id)
                        .eq('amount', currentFee.amount)
                        .eq('status', 'pending_verification')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                      
                      if (!errorByAmount && dataByAmount) {
                        data = dataByAmount;
                        error = null;
                        console.log(`✅ [ZelleCheckout] Pagamento encontrado por valor e status!`);
                      }
                    }

                    if (error && error.code === 'PGRST116') {
                      // Nenhum registro encontrado, aguardar mais um pouco
                      console.log(`⏳ [ZelleCheckout] Pagamento não encontrado na tentativa ${attempts}, aguardando...`);
                      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de delay
                      continue;
                    }
                    
                    if (error) {
                      findError = error;
                      break;
                    }
                    
                    recentPayment = data;
                  }

                  if (findError || !recentPayment) {
                    console.error('❌ [ZelleCheckout] Pagamento não encontrado após todas as tentativas:', findError);
                    return;
                  }

                  console.log('🔍 [ZelleCheckout] Pagamento encontrado para atualização:', recentPayment.id);

                  // Preparar dados de atualização baseado na resposta da IA
                  const updateData: any = {
                    screenshot_url: imageUrl,
                    admin_notes: `n8n response: ${responseJson.response || responseText}`,
                    updated_at: new Date().toISOString()
                  };

                  // ✅ APENAS quando a IA aprova, marcar como aprovado
                  if (isPositiveResponse) {
                    updateData.status = 'approved';
                    updateData.admin_approved_at = new Date().toISOString();
                    console.log('✅ [ZelleCheckout] Marcando pagamento como aprovado');
                  } else {
                    console.log('⏳ [ZelleCheckout] Mantendo pagamento como pending_verification para revisão manual');
                  }

                  // Persistir scholarships_ids no registro quando aplicável
                  if ((normalizedFeeType === 'application_fee' || normalizedFeeType === 'scholarship_fee') && resolvedScholarshipId) {
                    updateData.scholarships_ids = [resolvedScholarshipId];
                    console.log('💾 [ZelleCheckout] Gravando scholarships_ids no zelle_payments:', updateData.scholarships_ids);
                  }

                  // Atualizar o registro encontrado
                  const { data: updateResult, error: updateError } = await supabase
                    .from('zelle_payments')
                    .update(updateData)
                    .eq('id', recentPayment.id)
                    .select();

                  if (updateError) {
                    console.error('❌ [ZelleCheckout] Erro ao atualizar pagamento:', updateError);
                  } else {
                    console.log('✅ [ZelleCheckout] Pagamento atualizado com sucesso:', updateResult);
                    
                    // ✅ Enviar notificação para TODOS os admins quando o pagamento ficar pendente de aprovação
                    // Isso acontece quando o status é 'pending_verification' (não foi aprovado automaticamente)
                    if (!isPositiveResponse && updateResult && updateResult[0]?.status === 'pending_verification') {
                      console.log(`📧 [ZelleCheckout] Pagamento ficou pendente - enviando notificação para ${admins.length} admin(s)...`);
                      
                      // Enviar notificação para todos os admins em paralelo
                      const adminNotificationPromises = admins.map(async (admin) => {
                        const adminNotificationPayload = {
                          tipo_notf: 'Pagamento Zelle pendente para avaliação',
                          email_admin: admin.email,
                          nome_admin: admin.full_name,
                          phone_admin: admin.phone,
                          email_aluno: user?.email,
                          nome_aluno: userName,
                          phone_aluno: userPhone,
                          o_que_enviar: `Novo pagamento Zelle de ${currentFee.amount} USD foi enviado para avaliação.`,
                          temp_payment_id: realPaymentId,
                          fee_type: normalizedFeeType,
                          amount: currentFee.amount,
                          uploaded_at: new Date().toISOString()
                        };
                        
                        console.log(`📧 [ZelleCheckout] Enviando notificação para admin ${admin.email}:`, adminNotificationPayload);
                        
                        try {
                          const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(adminNotificationPayload),
                          });
                          
                          if (adminNotificationResponse.ok) {
                            const adminResult = await adminNotificationResponse.text();
                            console.log(`✅ [ZelleCheckout] Notificação para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
                          } else {
                            const adminError = await adminNotificationResponse.text();
                            console.error(`❌ [ZelleCheckout] Erro ao enviar notificação para ADMIN ${admin.email}:`, adminError);
                          }
                        } catch (error) {
                          console.error(`❌ [ZelleCheckout] Erro ao enviar notificação para ADMIN ${admin.email}:`, error);
                        }
                      });
                      
                      // Aguardar todas as notificações serem enviadas
                      await Promise.allSettled(adminNotificationPromises);
                      console.log(`✅ [ZelleCheckout] Todas as notificações para admins processadas!`);

                      // Enviar notificação para o aluno sobre o status do pagamento
                      try {
                        const studentNotificationPayload = {
                          tipo_notf: 'Pagamento Zelle em Processamento',
                          email_aluno: user?.email,
                          nome_aluno: userName,
                          email_universidade: user?.email,
                          o_que_enviar: `Seu pagamento Zelle de ${currentFee.amount} USD para ${currentFee.description.split(' - ')[1] || currentFee.description} está sendo processado. Você será notificado assim que o processamento for concluído.`,
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
                    } else if (isPositiveResponse) {
                      console.log('✅ [ZelleCheckout] Pagamento aprovado automaticamente - não enviando notificação para admin');
                    }
                  }
                } catch (updateError) {
                  console.error('❌ [ZelleCheckout] Erro ao processar pagamento:', updateError);
                }
                
                // Armazenar a resposta do n8n no localStorage para a página de waiting
                localStorage.setItem(`n8n_response_${realPaymentId}`, JSON.stringify(responseJson));
                localStorage.setItem('latest_n8n_response', JSON.stringify(responseJson));
                console.log('💾 [ZelleCheckout] Resposta do n8n armazenada no localStorage');
                console.log('💾 [ZelleCheckout] Chave:', `n8n_response_${realPaymentId}`);
                console.log('💾 [ZelleCheckout] Valor:', JSON.stringify(responseJson));
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
          {/* Payment Summary - Consolidado */}
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

              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                {/* Fee Info */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {currentFee.description.split(' - ')[1] || currentFee.description}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {currentFee.description.split(' - ')[0] || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {feesLoading ? (
                      <div className="w-24 h-7 bg-gray-200 rounded animate-pulse" />
                    ) : scholarshipFeePromotionalCoupon && normalizedFeeType === 'scholarship_fee' ? (
                      <div>
                        <div className="text-xl font-bold text-gray-400 line-through">
                          ${scholarshipFee ? parseFloat(scholarshipFee.replace('$', '')) : currentFee.amount}
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${currentFee.amount}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Cupom {scholarshipFeePromotionalCoupon.code} aplicado
                        </div>
                      </div>
                    ) : i20ControlFeePromotionalCoupon && normalizedFeeType === 'i20_control' ? (
                      <div>
                        <div className="text-xl font-bold text-gray-400 line-through">
                          ${i20ControlFee ? parseFloat(i20ControlFee.replace('$', '')) : currentFee.amount}
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          ${currentFee.amount}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Cupom {i20ControlFeePromotionalCoupon.code} aplicado
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">
                        ${currentFee.amount}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">USD</div>
                  </div>
                </div>

                {/* Zelle Payment Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">{t('zelleCheckout.zellePaymentDetails.title')}</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('zelleCheckout.zellePaymentDetails.recipientEmail')}
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <code className="text-sm font-mono text-gray-900">pay@matriculausa.com</code>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                    <p className="text-xs text-blue-900 font-medium">{t('zelleCheckout.zellePaymentDetails.important')}</p>
                    <p className="text-xs text-blue-800 mt-1">
                      {t('zelleCheckout.zellePaymentDetails.importantMessageSimple')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('zelleCheckout.instructions')}</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Instruções Consolidadas */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    {t('zelleCheckout.steps.title')}
                  </h4>
                  
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                      <span>{t('zelleCheckout.steps.step1')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-5 h-5 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                      <div className="flex-1">
                        <span className="block font-medium text-gray-900 mb-1">{t('zelleCheckout.steps.step2')}</span>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg mt-2">
                          <p className="text-sm text-blue-900 leading-relaxed">
                            <strong className="font-semibold">{t('zelleCheckout.steps.step2Important.title')}</strong> {t('zelleCheckout.steps.step2Important.description')}
                          </p>
                        </div>
                      </div>
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
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                      isDragging 
                        ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
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
                    feesLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-24 h-4 bg-white/30 rounded animate-pulse" />
                      </div>
                    ) : (
                      t('zelleCheckout.submitPayment')
                    )
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

            </div>
          </div>
        </div>
      </div>

    </div>
  );
};