import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatCentsToDollars } from '../../utils/currency';
import { PaymentRecord, PaymentStats } from '../../types/payment';
import { useUniversityRequests } from '../../hooks/useUniversityRequests';
import { useAffiliateRequests } from '../../hooks/useAffiliateRequests';
import { useZellePayments } from '../../hooks/useZellePayments';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  CreditCard,
  Building2,
  User,
  DollarSign,
  TrendingUp,
  AlertCircle,
  List,
  Grid3X3,
} from 'lucide-react';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import ZellePaymentReviewModal from '../../components/ZellePaymentReviewModal';
import UniversityRequestsSection from './components/UniversityRequestsSection';
import AffiliateRequestsSection from './components/AffiliateRequestsSection';
import ZellePaymentsSection from './components/ZellePaymentsSection';

const FEE_TYPES = [
  { value: 'selection_process', label: 'Selection Process Fee', color: 'bg-blue-100 text-blue-800' },
  { value: 'application', label: 'Application Fee', color: 'bg-green-100 text-green-800' },
  { value: 'scholarship', label: 'Scholarship Fee', color: 'bg-blue-100 text-[#05294E]' },
  { value: 'i20_control_fee', label: 'I-20 Control Fee', color: 'bg-orange-100 text-orange-800' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const PaymentManagement = (): React.JSX.Element => {
  const { user } = useAuth();
  
  // Usando hooks especializados para cada seção
  const universityRequestsHook = useUniversityRequests();
  const affiliateRequestsHook = useAffiliateRequests();
  const zellePaymentsHook = useZellePayments();
  
  // Estados locais apenas para a aba de Student Payments
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    monthlyGrowth: 0
  });

  // Filtros para Student Payments
  const [filters, setFilters] = useState({
    search: '',
    university: 'all',
    feeType: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Estado apenas para abas
  const [activeTab, setActiveTab] = useState<'payments' | 'university-requests' | 'affiliate-requests' | 'zelle-payments'>('payments');

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const hasLoadedPayments = useRef(false);
  const hasLoadedUniversities = useRef(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (!hasLoadedPayments.current) {
        loadPaymentData();
        hasLoadedPayments.current = true;
      }
      if (!hasLoadedUniversities.current) {
        loadUniversities();
        hasLoadedUniversities.current = true;
      }
    }
  }, [user]);

  // Força recarregamento
  const forceRefreshAll = () => {
    hasLoadedPayments.current = false;
    hasLoadedUniversities.current = false;
    
    if (user && user.role === 'admin') {
      loadPaymentData();
      loadUniversities();
      hasLoadedPayments.current = true;
      hasLoadedUniversities.current = true;
    }
    
    if (activeTab === 'university-requests') {
      universityRequestsHook.forceRefresh();
    } else if (activeTab === 'affiliate-requests') {
      affiliateRequestsHook.forceRefresh();
    } else if (activeTab === 'zelle-payments') {
      zellePaymentsHook.forceRefresh();
    }
  };

  const loadUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name')
        .eq('is_approved', true)
        .order('name');

      if (error) throw error;

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleNotesModal(false);
      setZelleAdminNotes('');
      
      console.log('📝 Zelle payment notes added successfully');
    } catch (error: any) {
      console.error('Error adding Zelle payment notes:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  const approveZellePayment = async (paymentId: string) => {
    try {
      setZelleActionLoading(true);
      
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      console.log('🔍 [approveZellePayment] Aprovando pagamento:', payment);

      // Atualizar o status do pagamento para aprovado
          const { error } = await supabase
      .from('zelle_payments')
      .update({
        status: 'approved',
        admin_approved_by: user!.id,
        admin_approved_at: new Date().toISOString()
      })
      .eq('id', paymentId);

      if (error) throw error;

      // MARCAR COMO PAGO NAS TABELAS CORRETAS
      console.log('💰 [approveZellePayment] Marcando como pago nas tabelas corretas...');
      console.log('🔍 [approveZellePayment] payment.fee_type_global:', payment.fee_type_global);
      console.log('🔍 [approveZellePayment] payment.fee_type:', payment.fee_type);
      console.log('🔍 [approveZellePayment] payment.user_id:', payment.user_id);
      
      if (payment.fee_type_global === 'selection_process') {
        console.log('🎯 [approveZellePayment] Entrando na condição selection_process');
        console.log('🔍 [approveZellePayment] Executando UPDATE user_profiles SET has_paid_selection_process_fee = true WHERE user_id =', payment.user_id);
        
        // Marcar no user_profiles
        const { data: updateData, error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_selection_process_fee: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', payment.user_id)
          .select();

        console.log('🔍 [approveZellePayment] Resultado da atualização:', { updateData, profileError });

        if (profileError) {
          console.error('❌ [approveZellePayment] Erro ao marcar selection_process_fee:', profileError);
        } else {
          console.log('✅ [approveZellePayment] has_paid_selection_process_fee marcado como true');
          console.log('🔍 [approveZellePayment] Dados atualizados:', updateData);
          
          // Registrar no faturamento
          console.log('💰 [approveZellePayment] Registrando selection_process no faturamento...');
          const { error: billingError } = await supabase.rpc('register_payment_billing', {
            user_id_param: payment.user_id,
            fee_type_param: 'selection_process',
            amount_param: payment.amount,
            payment_session_id_param: `zelle_${payment.id}`,
            payment_method_param: 'zelle'
          });
          
          if (billingError) {
            console.error('❌ [approveZellePayment] Erro ao registrar faturamento:', billingError);
          } else {
            console.log('✅ [approveZellePayment] Faturamento registrado com sucesso');
            
            // PROCESSAR MATRICULA REWARDS - Selection Process Fee
            console.log('🎁 [approveZellePayment] Processando Matricula Rewards para Selection Process Fee...');
            console.log('🎁 [approveZellePayment] payment.user_id para Matricula Rewards:', payment.user_id);
            try {
              // Buscar o perfil do usuário para verificar se tem código de referência
              console.log('🎁 [approveZellePayment] Buscando perfil do usuário...');
              const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('referral_code_used')
                .eq('user_id', payment.user_id)
                .single();

              console.log('🎁 [approveZellePayment] Resultado da busca do perfil:', { userProfile, profileError });

              if (profileError) {
                console.error('❌ [approveZellePayment] Erro ao buscar perfil do usuário:', profileError);
              } else if (userProfile?.referral_code_used) {
                console.log('🎁 [approveZellePayment] Usuário tem código de referência:', userProfile.referral_code_used);
                
                // Buscar o dono do código de referência na tabela affiliate_codes
                console.log('🎁 [approveZellePayment] Buscando dono do código na tabela affiliate_codes...');
                const { data: affiliateCode, error: affiliateError } = await supabase
                  .from('affiliate_codes')
                  .select('user_id, code')
                  .eq('code', userProfile.referral_code_used)
                  .eq('is_active', true)
                  .single();

                console.log('🎁 [approveZellePayment] Resultado da busca do dono do código:', { affiliateCode, affiliateError });

                if (affiliateError) {
                  console.error('❌ [approveZellePayment] Erro ao buscar dono do código de referência:', affiliateError);
                } else if (affiliateCode && affiliateCode.user_id !== payment.user_id) {
                  console.log('🎁 [approveZellePayment] Dono do código encontrado:', affiliateCode.user_id);
                  console.log('🎁 [approveZellePayment] Verificando se não é auto-referência:', {
                    affiliateUserId: affiliateCode.user_id,
                    paymentUserId: payment.user_id,
                    isDifferent: affiliateCode.user_id !== payment.user_id
                  });
                  
                  // Dar 180 coins para o dono do código
                  console.log('🎁 [approveZellePayment] Chamando add_coins_to_user_matricula...');
                  
                  // Buscar nome do usuário que pagou
                  const { data: referredUserProfile } = await supabase
                    .from('user_profiles')
                    .select('full_name, email')
                    .eq('user_id', payment.user_id)
                    .single();
                  
                  const referredDisplayName = referredUserProfile?.full_name || referredUserProfile?.email || payment.user_id;
                  
                  const { data: coinsResult, error: coinsError } = await supabase.rpc('add_coins_to_user_matricula', {
                    user_id_param: affiliateCode.user_id,
                    coins_to_add: 180,
                    reason: `Referral reward: Selection Process Fee paid by ${referredDisplayName}`
                  });

                  console.log('🎁 [approveZellePayment] Resultado do add_coins_to_user:', { coinsResult, coinsError });

                  if (coinsError) {
                    console.error('❌ [approveZellePayment] Erro ao adicionar coins:', coinsError);
                  } else {
                    console.log('✅ [approveZellePayment] 180 coins adicionados para o dono do código de referência');
                    console.log('✅ [approveZellePayment] Resultado:', coinsResult);
                  }
                } else {
                  console.log('ℹ️ [approveZellePayment] Nenhum dono do código de referência encontrado ou é o próprio usuário');
                  console.log('ℹ️ [approveZellePayment] Detalhes:', {
                    affiliateCode: !!affiliateCode,
                    affiliateUserId: affiliateCode?.user_id,
                    paymentUserId: payment.user_id,
                    isSameUser: affiliateCode?.user_id === payment.user_id
                  });
                }
              } else {
                console.log('ℹ️ [approveZellePayment] Usuário não tem código de referência Matricula Rewards');
                console.log('ℹ️ [approveZellePayment] userProfile.referral_code_used:', userProfile?.referral_code_used);
              }
            } catch (rewardsError) {
              console.error('❌ [approveZellePayment] Erro ao processar Matricula Rewards:', rewardsError);
            }
          }
        }
      } else {
        console.log('⚠️ [approveZellePayment] fee_type_global não é selection_process:', payment.fee_type_global);
      }

      console.log('🔍 [approveZellePayment] Verificando condição I-20 Control Fee...');
      console.log('🔍 [approveZellePayment] payment.fee_type_global === "i-20_control_fee":', payment.fee_type_global === 'i-20_control_fee');
      
      if (payment.fee_type_global === 'i-20_control_fee') {
        console.log('🎯 [approveZellePayment] Entrando na condição i20_control_fee');
        console.log('🔍 [approveZellePayment] Executando UPDATE user_profiles SET has_paid_i20_control_fee = true WHERE user_id =', payment.user_id);
        
        // Marcar no user_profiles
        const { data: updateData, error: profileError } = await supabase
          .from('user_profiles')
          .update({ 
            has_paid_i20_control_fee: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', payment.user_id)
          .select();

        console.log('🔍 [approveZellePayment] Resultado da atualização i20_control_fee:', { updateData, profileError });

        if (profileError) {
          console.error('❌ [approveZellePayment] Erro ao marcar i20_control_fee:', profileError);
        } else {
          console.log('✅ [approveZellePayment] has_paid_i20_control_fee marcado como true');
          console.log('🔍 [approveZellePayment] Dados atualizados i20_control_fee:', updateData);
          
          // Registrar no faturamento
          console.log('💰 [approveZellePayment] Registrando i20_control_fee no faturamento...');
          const { error: billingError } = await supabase.rpc('register_payment_billing', {
            user_id_param: payment.user_id,
            fee_type_param: 'i20_control_fee',
            amount_param: payment.amount,
            payment_session_id_param: `zelle_${payment.id}`,
            payment_method_param: 'zelle'
          });
          
          if (billingError) {
            console.error('❌ [approveZellePayment] Erro ao registrar faturamento:', billingError);
          } else {
            console.log('✅ [approveZellePayment] Faturamento registrado com sucesso');
          }
        }
      }

      if (payment.fee_type === 'application_fee' || payment.fee_type === 'scholarship_fee') {
        console.log('🎯 [approveZellePayment] Entrando na condição scholarship_applications');
        console.log('🔍 [approveZellePayment] fee_type:', payment.fee_type);
        console.log('🔍 [approveZellePayment] Executando UPDATE scholarship_applications WHERE student_id =', payment.student_id);
        
        // Marcar no scholarship_applications
        const { data: updateData, error: appError } = await supabase
          .from('scholarship_applications')
          .update({ 
            [payment.fee_type === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid']: true,
            updated_at: new Date().toISOString()
          })
          .eq('student_id', payment.student_id)
          .select();

        console.log('🔍 [approveZellePayment] Resultado da atualização scholarship_applications:', { updateData, appError });

        if (appError) {
          console.error('❌ [approveZellePayment] Erro ao marcar scholarship_applications:', appError);
        } else {
          console.log(`✅ [approveZellePayment] ${payment.fee_type === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid'} marcado como true`);
          console.log('🔍 [approveZellePayment] Dados atualizados scholarship_applications:', updateData);
          
          // Registrar no faturamento apenas para scholarship_fee (application_fee não gera faturamento)
          if (payment.fee_type === 'scholarship_fee') {
            console.log('💰 [approveZellePayment] Registrando scholarship_fee no faturamento...');
            const { error: billingError } = await supabase.rpc('register_payment_billing', {
              user_id_param: payment.user_id,
              fee_type_param: 'scholarship_fee',
              amount_param: payment.amount,
              payment_session_id_param: `zelle_${payment.id}`,
              payment_method_param: 'zelle'
            });
            
            if (billingError) {
              console.error('❌ [approveZellePayment] Erro ao registrar faturamento:', billingError);
            } else {
              console.log('✅ [approveZellePayment] Faturamento registrado com sucesso');
            }
          }
        }

        // Se for application_fee, também atualizar user_profiles
        if (payment.fee_type === 'application_fee') {
          console.log('🎯 [approveZellePayment] Atualizando user_profiles para application_fee');
          console.log('🔍 [approveZellePayment] Executando UPDATE user_profiles SET is_application_fee_paid = true WHERE user_id =', payment.user_id);
          
          const { data: profileUpdateData, error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              is_application_fee_paid: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id)
            .select();

          console.log('🔍 [approveZellePayment] Resultado da atualização user_profiles:', { profileUpdateData, profileError });

          if (profileError) {
            console.error('❌ [approveZellePayment] Erro ao marcar is_application_fee_paid no user_profiles:', profileError);
          } else {
            console.log('✅ [approveZellePayment] is_application_fee_paid marcado como true no user_profiles');
            console.log('🔍 [approveZellePayment] Dados atualizados user_profiles:', profileUpdateData);
          }
        }
      }

      // ENVIAR WEBHOOK PARA NOTIFICAR O ALUNO SOBRE APROVAÇÃO
      console.log('📤 [approveZellePayment] Enviando notificação de aprovação para o aluno...');
      
      try {
        // Buscar nome do admin
        const { data: adminProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user!.id)
          .single();

        const adminName = adminProfile?.full_name || 'Admin';

        // Payload para notificar o aluno sobre a aprovação
        const approvalPayload = {
          tipo_notf: "Pagamento aprovado",
          email_aluno: payment.student_email,
          nome_aluno: payment.student_name,
          email_universidade: "",
          o_que_enviar: `Seu pagamento de ${payment.fee_type} no valor de $${payment.amount} foi aprovado e processado com sucesso!`,
          payment_id: paymentId,
          fee_type: payment.fee_type,
          amount: payment.amount,
          approved_by: adminName
        };

        console.log('📤 [approveZellePayment] Payload de aprovação:', approvalPayload);

        const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(approvalPayload),
        });

        if (webhookResponse.ok) {
          console.log('✅ [approveZellePayment] Notificação de aprovação enviada com sucesso!');
        } else {
          console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação de aprovação:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.error('❌ [approveZellePayment] Erro ao enviar webhook de aprovação:', webhookError);
        // Não falhar o processo se o webhook falhar
      }

      // --- NOTIFICAÇÃO PARA UNIVERSIDADE ---
      try {
        console.log(`📤 [approveZellePayment] Enviando notificação de ${payment.fee_type} para universidade...`);
        
        const notificationEndpoint = payment.fee_type === 'application_fee' 
          ? 'notify-university-application-fee-paid'
          : payment.fee_type === 'scholarship_fee'
          ? 'notify-university-scholarship-fee-paid'
          : null;
        
        if (notificationEndpoint) {
          const payload = {
            application_id: payment.scholarship_id || payment.student_id, // Usando scholarship_id se disponível, senão student_id
            user_id: payment.user_id,
            scholarship_id: payment.scholarship_id || null
          };
          
          console.log(`📤 [approveZellePayment] Payload para universidade:`, payload);
          
          const notificationResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${notificationEndpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload),
          });

          if (notificationResponse.ok) {
            console.log(`✅ [approveZellePayment] Notificação de ${payment.fee_type} enviada para universidade com sucesso!`);
          } else {
            console.warn(`⚠️ [approveZellePayment] Erro ao enviar notificação de ${payment.fee_type} para universidade:`, notificationResponse.status);
          }
        } else {
          console.log(`ℹ️ [approveZellePayment] Tipo de taxa ${payment.fee_type} não requer notificação para universidade`);
        }
      } catch (notificationError) {
        console.error('❌ [approveZellePayment] Erro ao enviar notificação para universidade:', notificationError);
        // Não falhar o processo se a notificação falhar
      }

      // --- NOTIFICAÇÕES PARA ADMIN, AFFILIATE ADMIN E SELLER ---
      try {
        console.log(`📤 [approveZellePayment] Buscando informações do seller e affiliate admin...`);
        
        // Buscar informações do seller relacionado ao pagamento
        // Primeiro tentar buscar pelo user_id diretamente
        let { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select(`
            id,
            user_id,
            name,
            email,
            referral_code,
            affiliate_admin_id
          `)
          .eq('user_id', payment.user_id)
          .single();

        // Se não encontrar pelo user_id, buscar pelo seller_referral_code do usuário
        if (sellerError && sellerError.code === 'PGRST116') {
          console.log('🔍 [approveZellePayment] Seller não encontrado pelo user_id, buscando pelo seller_referral_code...');
          
          // Buscar o seller_referral_code do usuário
          const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('seller_referral_code')
            .eq('user_id', payment.user_id)
            .single();

          if (!userError && userProfile?.seller_referral_code) {
            console.log('🔍 [approveZellePayment] seller_referral_code encontrado:', userProfile.seller_referral_code);
            
            // Buscar o seller pelo referral_code
            const { data: sellerByCode, error: sellerByCodeError } = await supabase
              .from('sellers')
              .select(`
                id,
                user_id,
                name,
                email,
                referral_code,
                affiliate_admin_id
              `)
              .eq('referral_code', userProfile.seller_referral_code)
              .single();

            if (!sellerByCodeError && sellerByCode) {
              sellerData = sellerByCode;
              sellerError = null;
              console.log('✅ [approveZellePayment] Seller encontrado pelo referral_code:', sellerData);
            } else {
              console.log('❌ [approveZellePayment] Seller não encontrado pelo referral_code:', sellerByCodeError);
            }
          } else {
            console.log('❌ [approveZellePayment] seller_referral_code não encontrado no perfil do usuário:', userError);
          }
        }

        // Buscar informações do affiliate admin separadamente se existir
        let affiliateAdminData = null;
        if (sellerData && sellerData.affiliate_admin_id) {
          console.log('🔍 [approveZellePayment] Buscando affiliate admin com ID:', sellerData.affiliate_admin_id);
          
          // Primeiro buscar o affiliate_admin
          const { data: affiliateData, error: affiliateError } = await supabase
            .from('affiliate_admins')
            .select('user_id')
            .eq('id', sellerData.affiliate_admin_id)
            .single();
          
          if (!affiliateError && affiliateData) {
            console.log('✅ [approveZellePayment] Affiliate admin encontrado:', affiliateData);
            
            // Depois buscar as informações do user_profiles
            const { data: userProfileData, error: userProfileError } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', affiliateData.user_id)
              .single();
            
            if (!userProfileError && userProfileData) {
              affiliateAdminData = {
                user_id: affiliateData.user_id,
                user_profiles: userProfileData
              };
              console.log('✅ [approveZellePayment] Dados do affiliate admin carregados:', affiliateAdminData);
            } else {
              console.log('❌ [approveZellePayment] Erro ao buscar user_profiles do affiliate admin:', userProfileError);
            }
          } else {
            console.log('❌ [approveZellePayment] Erro ao buscar affiliate admin:', affiliateError);
          }
        }

        if (sellerData && !sellerError) {
          console.log(`📤 [approveZellePayment] Seller encontrado:`, sellerData);

          // NOTIFICAÇÃO PARA ADMIN
          try {
            const adminNotificationPayload = {
              tipo_notf: "Pagamento de aluno aprovado",
              email_admin: "admin@matriculausa.com",
              nome_admin: "Admin MatriculaUSA",
              email_aluno: payment.student_email,
              nome_aluno: payment.student_name,
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              email_affiliate_admin: affiliateAdminData?.user_profiles?.email || "",
              nome_affiliate_admin: affiliateAdminData?.user_profiles?.full_name || "Affiliate Admin",
              o_que_enviar: `Pagamento de ${payment.fee_type} no valor de $${payment.amount} do aluno ${payment.student_name} foi aprovado. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
              payment_id: paymentId,
              fee_type: payment.fee_type,
              amount: payment.amount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
            };

            console.log('📧 [approveZellePayment] Enviando notificação para admin:', adminNotificationPayload);

            const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(adminNotificationPayload),
            });

            if (adminNotificationResponse.ok) {
              console.log('✅ [approveZellePayment] Notificação para admin enviada com sucesso!');
            } else {
              console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação para admin:', adminNotificationResponse.status);
            }
          } catch (adminNotificationError) {
            console.error('❌ [approveZellePayment] Erro ao enviar notificação para admin:', adminNotificationError);
          }

          // NOTIFICAÇÃO PARA AFFILIATE ADMIN
          if (affiliateAdminData?.user_profiles?.email) {
            try {
              const affiliateAdminNotificationPayload = {
                tipo_notf: "Pagamento de aluno do seu seller aprovado",
                email_affiliate_admin: affiliateAdminData.user_profiles.email,
                nome_affiliate_admin: affiliateAdminData.user_profiles.full_name || "Affiliate Admin",
                email_aluno: payment.student_email,
                nome_aluno: payment.student_name,
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                o_que_enviar: `Pagamento de ${payment.fee_type} no valor de $${payment.amount} do aluno ${payment.student_name} foi aprovado. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                payment_id: paymentId,
                fee_type: payment.fee_type,
                amount: payment.amount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
              };

              console.log('📧 [approveZellePayment] Enviando notificação para affiliate admin:', affiliateAdminNotificationPayload);

              const affiliateAdminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(affiliateAdminNotificationPayload),
              });

              if (affiliateAdminNotificationResponse.ok) {
                console.log('✅ [approveZellePayment] Notificação para affiliate admin enviada com sucesso!');
              } else {
                console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationResponse.status);
              }
            } catch (affiliateAdminNotificationError) {
              console.error('❌ [approveZellePayment] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationError);
            }
          }

          // NOTIFICAÇÃO PARA SELLER
          try {
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento do seu aluno aprovado",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              email_aluno: payment.student_email,
              nome_aluno: payment.student_name,
              o_que_enviar: `Parabéns! O pagamento de ${payment.fee_type} no valor de $${payment.amount} do seu aluno ${payment.student_name} foi aprovado. Você ganhará comissão sobre este pagamento!`,
              payment_id: paymentId,
              fee_type: payment.fee_type,
              amount: payment.amount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code
            };

            console.log('📧 [approveZellePayment] Enviando notificação para seller:', sellerNotificationPayload);

            const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(sellerNotificationPayload),
            });

            if (sellerNotificationResponse.ok) {
              console.log('✅ [approveZellePayment] Notificação para seller enviada com sucesso!');
            } else {
              console.warn('⚠️ [approveZellePayment] Erro ao enviar notificação para seller:', sellerNotificationResponse.status);
            }
          } catch (sellerNotificationError) {
            console.error('❌ [approveZellePayment] Erro ao enviar notificação para seller:', sellerNotificationError);
          }

        } else {
          console.log(`ℹ️ [approveZellePayment] Nenhum seller encontrado para o usuário ${payment.user_id}`);
        }
      } catch (sellerLookupError) {
        console.error('❌ [approveZellePayment] Erro ao buscar informações do seller:', sellerLookupError);
        // Não falhar o processo se a busca do seller falhar
      }

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleReviewModal(false);
      
      console.log('✅ [approveZellePayment] Zelle payment approved, marked as paid, and student notified successfully');
    } catch (error: any) {
      console.error('❌ [approveZellePayment] Error approving Zelle payment:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  const rejectZellePayment = async (paymentId: string, reason?: string) => {
    try {
      setZelleActionLoading(true);
      
      const payment = zellePayments.find(p => p.id === paymentId);
      if (!payment) throw new Error('Payment not found');

      console.log('🔍 [rejectZellePayment] Rejeitando pagamento:', payment);

      // Atualizar o status do pagamento para rejeitado
          const { error } = await supabase
      .from('zelle_payments')
      .update({
        status: 'rejected',
        admin_notes: reason || zelleRejectReason
      })
      .eq('id', paymentId);

      if (error) throw error;

      // ENVIAR WEBHOOK PARA NOTIFICAR O ALUNO
      console.log('📤 [rejectZellePayment] Enviando notificação de rejeição para o aluno...');
      
      try {
        // Buscar nome do admin
        const { data: adminProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user!.id)
          .single();

        const adminName = adminProfile?.full_name || 'Admin';

        // Payload para notificar o aluno sobre a rejeição
        const rejectionPayload = {
          tipo_notf: "Pagamento rejeitado",
          email_aluno: payment.student_email,
          nome_aluno: payment.student_name,
          email_universidade: "",
          o_que_enviar: `Seu pagamento de ${payment.fee_type} no valor de $${payment.amount} foi rejeitado. Motivo: ${reason || zelleRejectReason}`,
          payment_id: paymentId,
          fee_type: payment.fee_type,
          amount: payment.amount,
          rejection_reason: reason || zelleRejectReason,
          rejected_by: adminName
        };

        console.log('📤 [rejectZellePayment] Payload de rejeição:', rejectionPayload);

        const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rejectionPayload),
        });

        if (webhookResponse.ok) {
          console.log('✅ [rejectZellePayment] Notificação de rejeição enviada com sucesso!');
        } else {
          console.warn('⚠️ [rejectZellePayment] Erro ao enviar notificação de rejeição:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.error('❌ [rejectZellePayment] Erro ao enviar webhook de rejeição:', webhookError);
        // Não falhar o processo se o webhook falhar
      }

      // Recarregar pagamentos Zelle
      await loadZellePayments();
      setShowZelleReviewModal(false);
      setZelleRejectReason('');
      
      console.log('✅ [rejectZellePayment] Zelle payment rejected and student notified successfully');
    } catch (error: any) {
      console.error('❌ [rejectZellePayment] Error rejecting Zelle payment:', error);
    } finally {
      setZelleActionLoading(false);
    }
  };

  // Funções auxiliares para abrir modais
  const openRejectModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowRejectModal(true);
  };

  const openMarkPaidModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowMarkPaidModal(true);
  };

  const openAddNotesModal = (id: string) => {
    const request = universityRequests.find(r => r.id === id);
    setSelectedRequest(request || null);
    setShowAddNotesModal(true);
  };

  // Funções auxiliares para abrir modais de Zelle

  const openZelleReviewModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    setSelectedZellePayment(payment || null);
    setShowZelleReviewModal(true);
  };

  const handleZelleReviewSuccess = () => {
    // Recarregar os pagamentos Zelle após aprovação/rejeição
    loadZellePayments();
    setShowZelleReviewModal(false);
    setSelectedZellePayment(null);
  };

  const openZelleNotesModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    if (payment) {
      setSelectedZellePayment(payment);
      setZelleAdminNotes(payment.admin_notes || '');
      setShowZelleNotesModal(true);
    }
  };

  const openZelleProofModal = (paymentId: string) => {
    const payment = zellePayments.find(p => p.id === paymentId);
    if (payment && payment.payment_proof_url) {
      // Se payment_proof_url já é uma URL completa, usar diretamente
      // Se é um caminho relativo, construir URL completa
      let fullUrl = payment.payment_proof_url;
      if (!payment.payment_proof_url.startsWith('http')) {
        fullUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${payment.payment_proof_url}`;
      }
      setSelectedZelleProofUrl(fullUrl);
      setSelectedZelleProofFileName(`Zelle Payment Proof - ${payment.student_name}`);
      setShowZelleProofModal(true);
    }
  };

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading payment data...');

      // Buscar aplicações de bolsas
      const { data: applications, error: appsError } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id (
            id,
            full_name,
            email,
            has_paid_selection_process_fee,
            is_application_fee_paid,
            is_scholarship_fee_paid
          ),
          scholarships (
            id,
            title,
            amount,
            universities (
              id,
              name
            )
          )
        `);

      if (appsError) throw appsError;

      // Converter aplicações em registros de pagamento
      const paymentRecords: PaymentRecord[] = [];
      
      applications?.forEach((app: any) => {
        const student = app.user_profiles;
        const scholarship = app.scholarships;
        const university = scholarship?.universities;

        if (!student || !scholarship || !university) return;

        const studentName = student.full_name || 'Unknown Student';
        const studentEmail = student.email || '';
        const universityName = university.name || 'Unknown University';
        const scholarshipTitle = scholarship.title || 'Unknown Scholarship';

        if (!studentName || !universityName) return;

        // Selection Process Fee
        paymentRecords.push({
          id: `${app.id}-selection`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'selection_process',
          amount: 99900,
          status: student.has_paid_selection_process_fee ? 'paid' : 'pending',
          payment_date: student.has_paid_selection_process_fee ? app.created_at : undefined,
          created_at: app.created_at
        });

        // Application Fee
        paymentRecords.push({
          id: `${app.id}-application`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'application',
          amount: 350,
          status: student.is_application_fee_paid ? 'paid' : 'pending',
          payment_date: student.is_application_fee_paid ? app.created_at : undefined,
          created_at: app.created_at
        });

        // Scholarship Fee
        paymentRecords.push({
          id: `${app.id}-scholarship`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'scholarship',
          amount: 40000,
          status: student.is_scholarship_fee_paid ? 'paid' : 'pending',
          payment_date: student.is_scholarship_fee_paid ? app.created_at : undefined,
          created_at: app.created_at
        });

        // I-20 Control Fee
        paymentRecords.push({
          id: `${app.id}-i20`,
          student_id: student.id,
          student_name: studentName,
          student_email: studentEmail,
          university_id: university.id,
          university_name: universityName,
          scholarship_id: scholarship.id,
          scholarship_title: scholarshipTitle,
          fee_type: 'i20_control_fee',
          amount: 99900,
          status: 'pending',
          created_at: app.created_at
        });
      });

      setPayments(paymentRecords);

      // Calcular estatísticas
      const totalPayments = paymentRecords.length;
      const paidPayments = paymentRecords.filter(p => p.status === 'paid').length;
      const pendingPayments = paymentRecords.filter(p => p.status === 'pending').length;
      const totalRevenue = paymentRecords
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalRevenue,
        totalPayments,
        paidPayments,
        pendingPayments,
        monthlyGrowth: 15.2
      });

    } catch (error) {
      console.error('Error loading payment data:', error);
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('payment-view-mode', mode);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    localStorage.setItem('payment-items-per-page', newItemsPerPage.toString());
  };

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.university, filters.feeType, filters.status, filters.dateFrom, filters.dateTo]);

  // Calcular paginação
  const filteredPayments = payments.filter(payment => {
    const searchTerm = filters.search.toLowerCase();
    const matchesSearch = 
      (payment.student_name || '').toLowerCase().includes(searchTerm) ||
      (payment.student_email || '').toLowerCase().includes(searchTerm) ||
      (payment.university_name || '').toLowerCase().includes(searchTerm) ||
      (payment.scholarship_title || '').toLowerCase().includes(searchTerm);

    const matchesUniversity = filters.university === 'all' || payment.university_id === filters.university;
    const matchesFeeType = filters.feeType === 'all' || payment.fee_type === filters.feeType;
    const matchesStatus = filters.status === 'all' || payment.status === filters.status;

    let matchesDate = true;
    if (filters.dateFrom || filters.dateTo) {
      const paymentDate = new Date(payment.payment_date || payment.created_at);
      if (filters.dateFrom) {
        matchesDate = matchesDate && paymentDate >= new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        matchesDate = matchesDate && paymentDate <= new Date(filters.dateTo);
      }
    }

    return matchesSearch && matchesUniversity && matchesFeeType && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  // Funções de navegação
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  // Gerar array de páginas para exibição
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const handleExport = () => {
    const csvContent = [
      ['Student Name', 'Email', 'University', 'Scholarship', 'Fee Type', 'Amount', 'Status', 'Payment Date'].join(','),
      ...filteredPayments.map(payment => [
        payment.student_name,
        payment.student_email,
        payment.university_name,
        payment.scholarship_title || '',
        FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type,
        payment.amount,
        payment.status,
        payment.payment_date || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      university: 'all',
      feeType: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="text-blue-600" size={32} />
            Payment Management
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage all payments across the platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Student Payments
            </button>
            <button
              onClick={() => setActiveTab('university-requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'university-requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              University Payment Requests
            </button>
            <button
              onClick={() => setActiveTab('affiliate-requests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'affiliate-requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Affiliate Payment Requests
            </button>
            <button
              onClick={() => setActiveTab('zelle-payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'zelle-payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Zelle Payments
            </button>
          </nav>
          
          <button
            onClick={forceRefreshAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Refresh all data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Student Payments Tab Content */}
      {activeTab === 'payments' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">${formatCentsToDollars(stats.totalRevenue).toLocaleString()}</p>
            </div>
            <DollarSign size={32} className="text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Paid Payments</p>
              <p className="text-2xl font-bold">{stats.paidPayments}</p>
            </div>
            <CheckCircle size={32} className="text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Pending Payments</p>
              <p className="text-2xl font-bold">{stats.pendingPayments}</p>
            </div>
            <XCircle size={32} className="text-orange-200" />
          </div>
        </div>

        <div className="bg-[#05294E] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Monthly Growth</p>
              <p className="text-2xl font-bold">+{stats.monthlyGrowth}%</p>
            </div>
            <TrendingUp size={32} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter size={20} />
            Filters & Search
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
            <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by student name, email, university, or scholarship..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.university}
                onChange={(e) => setFilters({ ...filters, university: e.target.value })}
              >
                <option value="all">All Universities</option>
                {universities.map(uni => (
                  <option key={uni.id} value={uni.id}>{uni.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.feeType}
                onChange={(e) => setFilters({ ...filters, feeType: e.target.value })}
              >
                <option value="all">All Fee Types</option>
                {FEE_TYPES.map(fee => (
                  <option key={fee.value} value={fee.value}>{fee.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            <div className="lg:col-span-5 flex justify-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredPayments.length} of {payments.length} payments
          {totalPages > 1 && (
            <>
              <span className="mx-2">•</span>
                  <span>Page {currentPage} of {totalPages}</span>
            </>
          )}
        </div>
      </div>

      {/* Payments Table/Grid */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                          <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria or filters.</p>
                    </td>
                  </tr>
                ) : (
                  currentPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{payment.student_name}</div>
                            <div className="text-sm text-gray-500">{payment.student_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">{payment.university_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          FEE_TYPES.find(ft => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${formatCentsToDollars(payment.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {payment.status === 'pending' && <XCircle className="w-3 h-3 mr-1" />}
                          {payment.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {payment.payment_date 
                            ? new Date(payment.payment_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye size={16} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPayments.map((payment) => (
            <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="font-bold text-gray-900">{payment.student_name}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">{payment.student_email}</div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{payment.university_name}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${FEE_TYPES.find(ft => ft.value === payment.fee_type)?.color || 'bg-gray-100 text-gray-800'}`}>
                        {FEE_TYPES.find(ft => ft.value === payment.fee_type)?.label || payment.fee_type}
                      </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-bold text-green-700">${formatCentsToDollars(payment.amount)}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                </div>
              </div>
              <button
                onClick={() => handleViewDetails(payment)}
                className="mt-4 w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {filteredPayments.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length}
              </span>
                  <span className="ml-2">payments</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* University Payment Requests Tab Content */}
      {activeTab === 'university-requests' && (
        <UniversityRequestsSection
          universityRequests={universityRequestsHook.universityRequests}
          loadingUniversityRequests={universityRequestsHook.loadingUniversityRequests}
          adminBalance={universityRequestsHook.adminBalance}
          loadingBalance={universityRequestsHook.loadingBalance}
          universityRequestsViewMode={universityRequestsHook.universityRequestsViewMode}
          setUniversityRequestsViewMode={universityRequestsHook.setUniversityRequestsViewMode}
          approveUniversityRequest={(id: string) => user ? universityRequestsHook.approveUniversityRequest(id, user.id) : Promise.resolve()}
          openRejectModal={universityRequestsHook.openRejectModal}
          openMarkPaidModal={universityRequestsHook.openMarkPaidModal}
          setSelectedRequest={universityRequestsHook.setSelectedRequest}
          setShowRequestDetails={universityRequestsHook.setShowRequestDetails}
        />
      )}

      {/* Affiliate Payment Requests Tab */}
      {activeTab === 'affiliate-requests' && (
        <AffiliateRequestsSection
          affiliateRequests={affiliateRequestsHook.affiliateRequests}
          loadingAffiliateRequests={affiliateRequestsHook.loadingAffiliateRequests}
          universityRequestsViewMode={universityRequestsHook.universityRequestsViewMode}
          setUniversityRequestsViewMode={universityRequestsHook.setUniversityRequestsViewMode}
          approveAffiliateRequest={(id: string) => user ? affiliateRequestsHook.approveAffiliateRequest(id, user.id) : Promise.resolve()}
          openAffiliateRejectModal={affiliateRequestsHook.openAffiliateRejectModal}
          openAffiliateMarkPaidModal={affiliateRequestsHook.openAffiliateMarkPaidModal}
          setSelectedAffiliateRequest={affiliateRequestsHook.setSelectedAffiliateRequest}
          setShowAffiliateDetails={affiliateRequestsHook.setShowAffiliateDetails}
        />
      )}

      {/* Zelle Payments Tab Content */}
      {activeTab === 'zelle-payments' && (
        <ZellePaymentsSection
          zellePayments={zellePaymentsHook.zellePayments}
          loadingZellePayments={zellePaymentsHook.loadingZellePayments}
          zelleViewMode={zellePaymentsHook.zelleViewMode}
          setZelleViewMode={zellePaymentsHook.setZelleViewMode}
          openZelleProofModal={zellePaymentsHook.openZelleProofModal}
          openZelleReviewModal={zellePaymentsHook.openZelleReviewModal}
          openZelleNotesModal={zellePaymentsHook.openZelleNotesModal}
        />
      )}

      {/* Payment Details Modal */}
      {showDetails && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Student</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.student_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.student_email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">University</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.university_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Scholarship</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPayment.scholarship_title || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fee Type</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {FEE_TYPES.find(ft => ft.value === selectedPayment.fee_type)?.label || selectedPayment.fee_type}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Amount</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">${formatCentsToDollars(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedPayment.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedPayment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Payment Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPayment.payment_date 
                        ? new Date(selectedPayment.payment_date).toLocaleString()
                        : 'Not paid yet'
                      }
                    </p>
                  </div>
                </div>

                {selectedPayment.stripe_session_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Stripe Session ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                      {selectedPayment.stripe_session_id}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* University Request Details Modal */}
      {universityRequestsHook.showRequestDetails && universityRequestsHook.selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Payment Request Details</h3>
                <button 
                  onClick={() => universityRequestsHook.setShowRequestDetails(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">University</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-lg font-semibold">{universityRequestsHook.selectedRequest.university?.name}</p>
                    <p className="text-gray-600">{universityRequestsHook.selectedRequest.university?.location}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Request Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">${universityRequestsHook.selectedRequest.amount_usd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-semibold capitalize">{universityRequestsHook.selectedRequest.payout_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        universityRequestsHook.selectedRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        universityRequestsHook.selectedRequest.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        universityRequestsHook.selectedRequest.status === 'paid' ? 'bg-green-100 text-green-800' :
                        universityRequestsHook.selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {universityRequestsHook.selectedRequest.status.charAt(0).toUpperCase() + universityRequestsHook.selectedRequest.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(universityRequestsHook.selectedRequest.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {universityRequestsHook.selectedRequest.payout_details_preview ? (
                      <div className="space-y-2">
                        {Object.entries(universityRequestsHook.selectedRequest.payout_details_preview as Record<string, any>).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <CreditCard className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500">No payment details available</p>
                      </div>
                    )}
                  </div>
                </div>

                {universityRequestsHook.selectedRequest.admin_notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Admin Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{universityRequestsHook.selectedRequest.admin_notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-4 border-t">
                  <button
                    onClick={() => universityRequestsHook.openAddNotesModal(universityRequestsHook.selectedRequest!.id)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Add Notes
                  </button>
                  
                  {universityRequestsHook.selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          user && universityRequestsHook.approveUniversityRequest(universityRequestsHook.selectedRequest!.id, user.id);
                          universityRequestsHook.setShowRequestDetails(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          universityRequestsHook.openRejectModal(universityRequestsHook.selectedRequest!.id);
                          universityRequestsHook.setShowRequestDetails(false);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {universityRequestsHook.selectedRequest.status === 'approved' && (
                    <button
                      onClick={() => {
                        universityRequestsHook.openMarkPaidModal(universityRequestsHook.selectedRequest!.id);
                        universityRequestsHook.setShowRequestDetails(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {universityRequestsHook.showRejectModal && universityRequestsHook.selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Reject Payment Request</h3>
              <button onClick={() => universityRequestsHook.setShowRejectModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection</label>
                <textarea
                  value={universityRequestsHook.rejectReason}
                  onChange={(e) => universityRequestsHook.setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this payment request..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => universityRequestsHook.setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => user && universityRequestsHook.rejectUniversityRequest(universityRequestsHook.selectedRequest!.id, user.id)}
                  disabled={!universityRequestsHook.rejectReason.trim() || universityRequestsHook.actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {universityRequestsHook.actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {universityRequestsHook.showMarkPaidModal && universityRequestsHook.selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Mark as Paid</h3>
              <button onClick={() => universityRequestsHook.setShowMarkPaidModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference (Optional)</label>
                <input
                  type="text"
                  value={universityRequestsHook.paymentReference}
                  onChange={(e) => universityRequestsHook.setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, check number, or other reference..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => universityRequestsHook.setShowMarkPaidModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => user && universityRequestsHook.markUniversityRequestAsPaid(universityRequestsHook.selectedRequest!.id, user.id)}
                  disabled={universityRequestsHook.actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {universityRequestsHook.actionLoading ? 'Marking as Paid...' : 'Mark as Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Notes Modal */}
      {universityRequestsHook.showAddNotesModal && universityRequestsHook.selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Admin Notes</h3>
              <button onClick={() => universityRequestsHook.setShowAddNotesModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                <textarea
                  value={universityRequestsHook.adminNotes}
                  onChange={(e) => universityRequestsHook.setAdminNotes(e.target.value)}
                  placeholder="Add any administrative notes or comments..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
              <button 
                  onClick={() => universityRequestsHook.setShowAddNotesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => universityRequestsHook.addAdminNotes(universityRequestsHook.selectedRequest!.id)}
                  disabled={!universityRequestsHook.adminNotes.trim() || universityRequestsHook.actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {universityRequestsHook.actionLoading ? 'Adding Notes...' : 'Add Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zelle Payment Review Modal */}
      {zellePaymentsHook.showZelleReviewModal && zellePaymentsHook.selectedZellePayment && user && (
        <ZellePaymentReviewModal
          isOpen={zellePaymentsHook.showZelleReviewModal}
          onClose={() => {
            zellePaymentsHook.setShowZelleReviewModal(false);
            zellePaymentsHook.setSelectedZellePayment(null);
          }}
          payment={{
            id: zellePaymentsHook.selectedZellePayment.id,
            user_id: zellePaymentsHook.selectedZellePayment.student_id,
            student_name: zellePaymentsHook.selectedZellePayment.student_name,
            student_email: zellePaymentsHook.selectedZellePayment.student_email,
            fee_type: zellePaymentsHook.selectedZellePayment.fee_type,
            amount: zellePaymentsHook.selectedZellePayment.amount,
            status: zellePaymentsHook.selectedZellePayment.zelle_status || 'pending_verification',
            payment_date: zellePaymentsHook.selectedZellePayment.payment_date,
            screenshot_url: zellePaymentsHook.selectedZellePayment.payment_proof_url,
            created_at: zellePaymentsHook.selectedZellePayment.created_at
          }}
          onSuccess={zellePaymentsHook.handleZelleReviewSuccess}
          adminId={user.id}
          onApprove={() => Promise.resolve()}
          onReject={() => Promise.resolve()}
        />
      )}

      {/* Add Zelle Admin Notes Modal */}
      {zellePaymentsHook.showZelleNotesModal && zellePaymentsHook.selectedZellePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Admin Notes</h3>
              <button onClick={() => zellePaymentsHook.setShowZelleNotesModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes for Zelle Payment</label>
                <textarea
                  value={zellePaymentsHook.zelleAdminNotes}
                  onChange={(e) => zellePaymentsHook.setZelleAdminNotes(e.target.value)}
                  placeholder="Add any administrative notes or comments about this Zelle payment..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => zellePaymentsHook.setShowZelleNotesModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => user && zellePaymentsHook.addZelleAdminNotes(zellePaymentsHook.selectedZellePayment!.id, user.id)}
                  disabled={!zellePaymentsHook.zelleAdminNotes.trim() || zellePaymentsHook.zelleActionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {zellePaymentsHook.zelleActionLoading ? 'Adding Notes...' : 'Add Notes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zelle Proof Modal */}
      {zellePaymentsHook.showZelleProofModal && zellePaymentsHook.selectedZelleProofUrl && (
        <DocumentViewerModal
          documentUrl={zellePaymentsHook.selectedZelleProofUrl}
          fileName={zellePaymentsHook.selectedZelleProofFileName}
          onClose={() => zellePaymentsHook.setShowZelleProofModal(false)}
        />
      )}
    </div>
  );
};

export default PaymentManagement; 
