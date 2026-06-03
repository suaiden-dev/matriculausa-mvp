import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Building, GraduationCap, CheckCircle, X, Gift, Eye, EyeOff, AlertCircle, Handshake } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { getStoredUtmParams, clearUtmParams } from '../utils/utmTracker';
import { useFormTracking } from '../hooks/useFormTracking';
import { useLeadCapture } from '../hooks/useLeadCapture';

interface AuthProps {
  mode: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ mode }) => {
  const { t } = useTranslation(['auth', 'common']);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'student' | 'university' | 'affiliate'>('student');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Student specific fields
    phone: '',
    country: '',
    fieldOfInterest: '',
    englishLevel: '',
    // Referral code field - unified
    universityName: '',
    position: '',
    website: '',
    location: '',
    // Referral code field - unified
    referralCode: '' // Unified referral code (auto-detects type)
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Unified referral code validation states
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [referralCodeLoading, setReferralCodeLoading] = useState(false);
  const [referralCodeType, setReferralCodeType] = useState<'seller' | 'rewards' | null>(null);
  const [isReferralCodeLocked, setIsReferralCodeLocked] = useState(false);
  // Estado removido: isSimplifiedSeller (sem utilidade lida)
  // Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Newsletter consent state
  const [newsletterConsent, setNewsletterConsent] = useState(true);
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(false);
  // Ref para evitar múltiplas execuções
  const referralCodeProcessedRef = useRef(false);

  
  const { user, loading: authLoading, login, register } = useAuth();
  const navigate = useNavigate();

  // Redirecionamento imediato se já estiver logado
  useEffect(() => {
    if (!authLoading && user) {
      const role = user.role || 'student';
      const dashboardPath =
        role === 'affiliate' ? '/affiliate/dashboard' :
        role === 'seller' ? '/seller/dashboard' :
        role === 'admin' || role === 'post_sales' ? '/admin/dashboard' :
        '/student/dashboard';
      navigate(dashboardPath, { replace: true });
    }
  }, [user, authLoading, navigate]);

  const { trackFieldFilled, trackFormSubmitted } = useFormTracking({ formName: 'auth_register' });
  const { captureLead, markAsConverted } = useLeadCapture();

  const handleFieldBlur = (fieldName: string) => {
    trackFieldFilled(fieldName);
    captureLead({
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      source_page: 'auth_register'
    });
  };

  // const navigate = useNavigate(); (removido por não ser utilizado e causar warning)

  // Global scroll-to-top on login/register page load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      // console.log('Scroll position reset to top on login/register page load.');
    }, 75);
    return () => clearTimeout(timer);
  }, []);

  // Definir activeTab com base no query parameter 'tab'
  useEffect(() => {
    if (mode === 'register') {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'student' || tabParam === 'university' || tabParam === 'affiliate') {
        setActiveTab(tabParam);
      }
    }
  }, [location.search, mode]);

  // ✅ NOVA: Função de validação unificada (movida para cima para estar disponível)
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 4) {
      setReferralCodeValid(null);
      setReferralCodeType(null);
      return;
    }

    setReferralCodeLoading(true);
    
    // Detectar tipo automaticamente
    // SUAIDEN e BRANT são códigos especiais de seller (Direct Sales) que aplicam Package 3 automaticamente
     const directSalesCodes = ['SUAIDEN', 'BRANT'];
     const codeUpper = code.toUpperCase();
     const isDirectSalesCode = directSalesCodes.includes(codeUpper);
     
     // ✅ NOVO: Verificar primeiro se o código existe na tabela sellers (para Direct Sales como TFOE)
     // Isso permite detectar códigos de Direct Sales que não estão na lista hardcoded
     let isSellerCode = isDirectSalesCode || code.startsWith('SELLER_') || code.length > 8;
     
     // Se não for claramente um seller, verificar na tabela sellers antes de classificar como rewards
     if (!isSellerCode && !code.startsWith('MATR')) {
       try {
         const { data: sellerCheck } = await supabase
           .from('sellers')
           .select('id')
           .eq('referral_code', codeUpper)
           .eq('is_active', true)
           .maybeSingle();
         
         if (sellerCheck) {
           isSellerCode = true;
           console.log('[AUTH] Código encontrado na tabela sellers, tratando como seller:', code);
         }
       } catch (err) {
         console.error('[AUTH] Erro ao verificar código na tabela sellers:', err);
       }
     }
     
     const isSeller = isSellerCode;
     const isRewards = !isDirectSalesCode && !isSellerCode && (code.startsWith('MATR') || (code.length <= 8 && /^[A-Z0-9]+$/.test(code)));
    
    try {
      if (isSeller) {
        setReferralCodeType('seller');
        console.log('[AUTH] Validando código de seller:', code);
        const { data, error } = await supabase
          .from('sellers')
          .select('id, name, referral_code, is_active')
          .eq('referral_code', codeUpper)
          .eq('is_active', true)
          .single();
        
        setReferralCodeValid(!error && !!data);
        console.log('[AUTH] Resultado validação seller:', { data, error, valid: !error && !!data });
        
        // ✅ NOVO: Verificar se o seller é do sistema simplificado
        if (!error && data) {
          try {
            const { data: systemTypeData, error: systemTypeError } = await supabase
              .rpc('get_seller_admin_system_type_by_code', { seller_code: codeUpper });
            
             if (!systemTypeError && systemTypeData) {
               const isSimplified = systemTypeData === 'simplified';
               console.log('[AUTH] System type do seller:', systemTypeData, 'isSimplified:', isSimplified);
             }
          } catch (err) {
            console.error('[AUTH] Erro ao verificar system_type do seller:', err);
          }
        }
      } else if (isRewards) {
        setReferralCodeType('rewards');
        console.log('[AUTH] Validando código de Matricula Rewards:', code);
        const { data, error } = await supabase
          .from('affiliate_codes')
          .select('code, is_active')
          .eq('code', code.toUpperCase())
          .eq('is_active', true)
          .single();
        
        setReferralCodeValid(!error && !!data);
        console.log('[AUTH] Resultado validação rewards:', { data, error, valid: !error && !!data });
      } else {
        setReferralCodeValid(false);
        setReferralCodeType(null);
        console.log('[AUTH] Código não reconhecido:', code);
      }
    } catch (error) {
      console.error('[AUTH] Exceção na validação:', error);
      setReferralCodeValid(false);
    } finally {
      setReferralCodeLoading(false);
    }
  };

  // ✅ FUNÇÃO AUXILIAR: Processar código de referência
  const processReferralCode = async (code: string, type: 'seller' | 'rewards' | null = null) => {
    if (!code || referralCodeProcessedRef.current) {
      return;
    }

    console.log('[AUTH] Processando código de referência:', code, 'Tipo:', type);
    
    // Detectar tipo se não fornecido
    let detectedType = type;
    if (!detectedType) {
      // Verificar se veio de landing page — tanto com desconto quanto sem (sref)
      const fromLandingPage = localStorage.getItem('pending_seller_referral_code');
      const fromLandingPageNoDiscount = localStorage.getItem('pending_seller_referral_code_nodiscount');
      if (fromLandingPage === code.toUpperCase() || fromLandingPageNoDiscount === code.toUpperCase()) {
        console.log('[AUTH] Código detectado do localStorage de landing page, definindo como seller');
        detectedType = 'seller';
      } else {
        const directSalesCodes = ['SUAIDEN', 'BRANT'];
        const codeUpper = code.toUpperCase();
        const isDirectSalesCode = directSalesCodes.includes(codeUpper);
        
        // Verificar se é seller (incluindo Direct Sales)
        let isSeller = isDirectSalesCode || code.startsWith('SELLER_') || code.length > 8;
        
        // Se não for claramente um seller, verificar na tabela sellers
        if (!isSeller && !code.startsWith('MATR')) {
          try {
            const { data: sellerCheck } = await supabase
              .from('sellers')
              .select('id')
              .eq('referral_code', codeUpper)
              .eq('is_active', true)
              .maybeSingle();
            
            if (sellerCheck) {
              isSeller = true;
            }
          } catch (err) {
            // Ignorar erro, continuar com detecção padrão
          }
        }
        
        const isRewards = !isDirectSalesCode && !isSeller && (code.startsWith('MATR') || (code.length <= 8 && /^[A-Z0-9]+$/.test(code)));
        
        detectedType = isSeller ? 'seller' : isRewards ? 'rewards' : null;
      }
    }

    setFormData(prev => ({ ...prev, referralCode: code }));
    setReferralCodeType(detectedType);
    setIsReferralCodeLocked(true);
    setShowReferralInput(true);
    referralCodeProcessedRef.current = true;
    
    // Validar código de forma assíncrona
    setTimeout(() => {
      validateReferralCode(code);
    }, 100);
  };

  // Load referral codes from URL and localStorage
  useEffect(() => {
    const loadReferralCodes = async () => {
      if (mode === 'register' && activeTab === 'student') {
        console.log('[AUTH] Carregando códigos de referência...');
        
        // ✅ PRIORIDADE 1: Verificar URL diretamente (para evitar race condition)
        const urlParams = new URLSearchParams(location.search);
        
        // Tratar mensagem de email já confirmado (não é erro, é informação)
        const emailInfo = urlParams.get('info');
        const infoMessage = urlParams.get('message');
        if (emailInfo === 'email_already_confirmed' && infoMessage) {
          setError(decodeURIComponent(infoMessage));
        }
        // Capturar tanto ?ref= (com desconto) quanto ?sref= (sem desconto)
        const refCodeFromUrl = urlParams.get('ref') || urlParams.get('sref');
        
        if (refCodeFromUrl && !referralCodeProcessedRef.current) {
          console.log('[AUTH] ✅ Código encontrado na URL:', refCodeFromUrl);
          
          // Detectar tipo do código
          const directSalesCodes = ['SUAIDEN', 'BRANT'];
          const codeUpper = refCodeFromUrl.toUpperCase();
          const isDirectSalesCode = directSalesCodes.includes(codeUpper);
          
          // Verificar se é seller (incluindo Direct Sales)
          let isSeller = isDirectSalesCode || refCodeFromUrl.startsWith('SELLER_') || refCodeFromUrl.length > 8;
          
          // Se não for claramente um seller, verificar na tabela sellers
          if (!isSeller && !refCodeFromUrl.startsWith('MATR')) {
            try {
              const { data: sellerCheck } = await supabase
                .from('sellers')
                .select('id')
                .eq('referral_code', codeUpper)
                .eq('is_active', true)
                .maybeSingle();
              
              if (sellerCheck) {
                isSeller = true;
              }
            } catch (err) {
              // Ignorar erro, continuar com detecção padrão
            }
          }
          
          const isRewards = !isDirectSalesCode && !isSeller && (refCodeFromUrl.startsWith('MATR') || (refCodeFromUrl.length <= 8 && /^[A-Z0-9]+$/.test(refCodeFromUrl)));
          const detectedType = isSeller ? 'seller' : isRewards ? 'rewards' : null;
          
          // Salvar no localStorage para consistência
          localStorage.setItem('pending_referral_code', refCodeFromUrl);
          localStorage.setItem('pending_referral_code_type', detectedType || 'rewards');
          
          await processReferralCode(refCodeFromUrl, detectedType);
          return;
        }
        
        // ✅ PRIORIDADE 2: Carregar do localStorage
        const pendingCode = localStorage.getItem('pending_referral_code');
        const pendingType = localStorage.getItem('pending_referral_code_type');
        
        if (pendingCode && !referralCodeProcessedRef.current) {
          console.log('[AUTH] ✅ Código encontrado no localStorage:', pendingCode, 'Tipo:', pendingType);
          await processReferralCode(pendingCode, pendingType as 'seller' | 'rewards' | null);
        }
        
        console.log('[AUTH] Estado final do campo unificado:', {
          referralCode: pendingCode || refCodeFromUrl,
          type: pendingType
        });
      }
    };

    loadReferralCodes();
  }, [mode, activeTab, location.search]);

  // ✅ Listener para mudanças no localStorage (caso useReferralCodeCapture salve depois)
  useEffect(() => {
    if (mode === 'register' && activeTab === 'student' && !referralCodeProcessedRef.current) {
      const handleStorageChange = async (e: StorageEvent) => {
        if (e.key === 'pending_referral_code' && e.newValue) {
          console.log('[AUTH] ✅ Código detectado via storage event:', e.newValue);
          const pendingType = localStorage.getItem('pending_referral_code_type');
          await processReferralCode(e.newValue, pendingType as 'seller' | 'rewards' | null);
        }
      };

      window.addEventListener('storage', handleStorageChange);
      
      // Também verificar periodicamente (fallback para mesmo-origin)
      const intervalId = setInterval(async () => {
        if (!referralCodeProcessedRef.current) {
          const pendingCode = localStorage.getItem('pending_referral_code');
          if (pendingCode && !formData.referralCode) {
            console.log('[AUTH] ✅ Código detectado via polling:', pendingCode);
            const pendingType = localStorage.getItem('pending_referral_code_type');
            await processReferralCode(pendingCode, pendingType as 'seller' | 'rewards' | null);
          }
        }
      }, 200); // Verificar a cada 200ms

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(intervalId);
      };
    }
  }, [mode, activeTab, formData.referralCode]);

  // ✅ NOVA: Handle unified referral code change
  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, referralCode: code }));
    
    if (code.length >= 4) {
      validateReferralCode(code);
    } else {
      setReferralCodeValid(null);
      setReferralCodeType(null);
    }
  };


  // Remove redirecionamento - deixar AuthRedirect fazer isso

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // ✅ Validação de campos obrigatórios no registro
    if (mode === 'register') {
      const isStudentMissing = activeTab === 'student' && (
        !formData.full_name?.trim() || 
        !formData.email?.trim() || 
        !formData.phone?.trim() || 
        !formData.password?.trim() || 
        !formData.confirmPassword?.trim()
      );

      const isUniversityMissing = activeTab === 'university' && (
        !formData.full_name?.trim() || 
        !formData.email?.trim() || 
        !formData.phone?.trim() || 
        !formData.password?.trim() || 
        !formData.confirmPassword?.trim()
      );

      const isAffiliateMissing = activeTab === 'affiliate' && (
        !formData.full_name?.trim() || 
        !formData.email?.trim() || 
        !formData.password?.trim() || 
        !formData.confirmPassword?.trim()
      );

      if (isStudentMissing || isUniversityMissing || isAffiliateMissing) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      if (!termsAccepted) {
        setError(t('authPage.messages.mustAcceptTerms'));
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        trackFormSubmitted();
        console.log('🔍 [AUTH] Iniciando processo de registro');
        console.log('🔍 [AUTH] Dados do formulário:', formData);
        console.log('🔍 [AUTH] Tab ativa:', activeTab);
        console.log('🔍 [AUTH] Telefone no formData:', formData.phone);
        
        // Checagem prévia: email já cadastrado (RPC + fallback em user_profiles)
        const normalizedEmail = (formData.email || '').trim().toLowerCase();
        try {
          // 1) Checar direto no auth.users via RPC segura
          const { data: existsRpc, error: rpcErr } = await supabase.rpc('email_exists', { p_email: normalizedEmail });
          if (!rpcErr && existsRpc === true) {
            setError(t('authPage.messages.emailAlreadyRegistered'));
            setLoading(false);
            return;
          }
          // 2) Fallback: verificar em user_profiles
          const { data: existingUserByEmail } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('email', normalizedEmail)
            .maybeSingle();
          if (existingUserByEmail && (existingUserByEmail as any).user_id) {
            setError(t('authPage.messages.emailAlreadyRegistered'));
            setLoading(false);
            return;
          }
        } catch (checkErr) {
          // Se a checagem falhar por permissão ou outro motivo, seguimos, pois o backend ainda validará
        }
        
        if (formData.password !== formData.confirmPassword) {
          setError(t('authPage.messages.passwordsNotMatch'));
          setLoading(false);
          return;
        }

        // Rejeitar caracteres de controle (permite qualquer imprimível, incluindo senhas Apple/Safari)
        if (/[\x00-\x1F\x7F]/.test(formData.password)) {
          setError(t('authPage.messages.invalidPasswordChars'));
          setLoading(false);
          return;
        }

        // Limite de 20 caracteres para novas senhas
        if (formData.password.length > 20) {
          setError(t('authPage.messages.weakPassword')); // A chave weakPassword ou uma genérica de validação pode ser usada, mas vamos traduzir apropriadamente com uma string customizada no i18n
          setLoading(false);
          return;
        }
        
        // Validar telefone (obrigatório para estudante/universidade, opcional para afiliado)
        if (activeTab !== 'affiliate') {
          if (!formData.phone || formData.phone.length < 8) {
            console.log('❌ [AUTH] Validação de telefone falhou:', {
              phone: formData.phone,
              length: formData.phone?.length
            });
            setError(t('authPage.messages.invalidPhone'));
            setLoading(false);
            return;
          }
        } else {
          // Para afiliado, se preenchido, deve ser válido
          if (formData.phone && formData.phone.length < 8) {
            setError(t('authPage.messages.invalidPhone'));
            setLoading(false);
            return;
          }
        }
        
         // Validar aceite dos termos
         if (!termsAccepted) {
           setError(t('authPage.messages.mustAcceptTerms'));
           setLoading(false);
           return;
         }
         
         // ✅ NOVA VALIDAÇÃO: Verificar se código de referência é válido (se fornecido)
         if (formData.referralCode && formData.referralCode.trim()) {
           // Se está carregando a validação, aguardar
           if (referralCodeLoading) {
             setError(t('authPage.register.referralCode.waitingValidation'));
             setLoading(false);
             return;
           }
           // Se a validação falhou, bloquear submissão
           if (referralCodeValid === false) {
             setError(t('authPage.register.referralCode.validationError'));
             setLoading(false);
             return;
           }
           // Se ainda não foi validado (null), aguardar validação
           if (referralCodeValid === null) {
             setError(t('authPage.register.referralCode.waitingValidation'));
             setLoading(false);
             return;
           }
         }
        
        console.log('✅ [AUTH] Validação de telefone passou:', formData.phone);
        
         // Detectar se é código Direct Sales (SUAIDEN ou BRANT) para aplicar Package 3 automaticamente
         const directSalesCodes = ['SUAIDEN', 'BRANT'];
         const isDirectSalesCode = directSalesCodes.includes(formData.referralCode.toUpperCase());
         

        
        const userData = {
          full_name: formData.full_name,
          role: (activeTab === 'student' ? 'student' : activeTab === 'university' ? 'school' : 'affiliate') as 'student' | 'school' | 'affiliate',
          // Newsletter consent - save for all users
          newsletter_consent: newsletterConsent,
          // Add additional registration data only for universities
          ...(activeTab === 'university' && {
            position: formData.position || '',
            website: formData.website || '',
            location: formData.location || '',
            phone: formData.phone || ''
          }),
           // Add phone for student or affiliate
           ...((activeTab === 'student' || activeTab === 'affiliate') && {
             phone: formData.phone || '',
             ...(activeTab === 'student' && {
               // ✅ NOVO: Salvar no campo correto baseado no tipo detectado
               ...(referralCodeType === 'seller' && formData.referralCode && {
                 seller_referral_code: formData.referralCode
               }),
               ...(referralCodeType === 'rewards' && formData.referralCode && {
                 affiliate_code: formData.referralCode
               }),
               // ✅ Direct Sales (SUAIDEN ou BRANT): Aplicar Package 3 automaticamente
               ...(isDirectSalesCode && {
                 scholarship_package_number: 3,
                 desired_scholarship_range: 4500
               })
             })
           })
        };

        console.log('🔍 [AUTH] userData criado:', userData);
        console.log('🔍 [AUTH] Telefone no userData:', userData.phone);
        
        // Salvar no localStorage antes de chamar register
        console.log('💾 [AUTH] Salvando telefone no localStorage:', formData.phone);
        localStorage.setItem('pending_phone', formData.phone || '');
        
        // 📊 Ler parâmetros UTM do localStorage (se existirem)
        const utmParams = getStoredUtmParams();
        if (utmParams) {
          console.log('📊 [AUTH] UTM parameters detectados:', utmParams);
        }
        
        const signUpResult = await register(normalizedEmail, formData.password, userData, {
          utm: utmParams
        });

        // ✅ Se for cadastrado como afiliado e tiver sessão imediata (autenticado), criar o código de indicação via RPC
        if (activeTab === 'affiliate' && signUpResult?.user?.id && signUpResult?.session) {
          try {
            await supabase.rpc('create_affiliate_code_for_user', { user_id_param: signUpResult.user.id });
            console.log('✅ [AUTH] Código de afiliado gerado com sucesso via RPC para:', signUpResult.user.id);
          } catch (rpcErr) {
            console.error('❌ [AUTH] Erro ao disparar RPC create_affiliate_code_for_user:', rpcErr);
          }
        }

        // Limpar códigos de referência do localStorage após registro bem-sucedido
        localStorage.removeItem('pending_affiliate_code');
        localStorage.removeItem('pending_seller_referral_code');
        localStorage.removeItem('pending_seller_referral_code_nodiscount');
        
        // 📊 Limpar parâmetros UTM do localStorage após registro bem-sucedido
        if (utmParams) {
          clearUtmParams();
          console.log('📊 [AUTH] UTM parameters limpos do localStorage');
        }

        markAsConverted(normalizedEmail);

         // Para estudantes, o email já é confirmado automaticamente e o login é feito automaticamente
         // O AuthRedirect vai redirecionar para o dashboard
         // Para universidades ou afiliados, definir isRegistered para mostrar a mensagem de sucesso e redirecionar em 10 segundos (só para universidades)
         if (activeTab === 'university' || activeTab === 'affiliate') {
           setIsRegistered(true);
           setLoading(false);
           if (activeTab === 'university') {
             setTimeout(() => {
               navigate(`/login${location.search}`);
             }, 10000);
           }
         }
         return;
      } else {
        await login(formData.email, formData.password);
        // O redirecionamento será feito pelo AuthRedirect
        return;
      }
    } catch (err: any) {
      // Enhanced error handling with specific messages
      let errorMessage = t('authPage.messages.authenticationFailed');
      
      if (err.message) {
        const message = err.message.toLowerCase();
        
        if (message.includes('invalid_credentials') || message.includes('invalid login credentials')) {
          errorMessage = t('authPage.messages.invalidCredentials');
        } else if (
          message.includes('already registered') ||
          message.includes('user already registered') ||
          message.includes('email already registered') ||
          message.includes('user_already_registered')
        ) {
          errorMessage = t('authPage.messages.emailAlreadyRegistered');
        } else if (message.includes('email_not_confirmed')) {
          errorMessage = t('authPage.messages.emailNotConfirmed');
        } else if (message.includes('too_many_requests')) {
          errorMessage = t('authPage.messages.tooManyRequests');
        } else if (message.includes('user_not_found')) {
          errorMessage = t('authPage.messages.userNotFound');
        } else if (message.includes('weak_password')) {
          errorMessage = t('authPage.messages.weakPassword');
        } else if (message.includes('email_address_invalid')) {
          errorMessage = t('authPage.messages.invalidEmail');
        } else if (message.includes('signup_disabled')) {
          errorMessage = t('authPage.messages.signupDisabled');
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || '' // Garantir que nunca seja undefined
    }));
  };

  const handleTabChange = (tab: 'student' | 'university' | 'affiliate') => {
    setActiveTab(tab);
  };

  if (!authLoading && user) return null;

  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Branding & Copywriting (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#05294E] relative overflow-hidden flex-col justify-between items-center p-12 lg:p-16 xl:p-24 text-center">
          {/* Background Image with Dark Overlay */}
          <div className="absolute inset-0 w-full h-full">
            <img 
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/student-couple-graduation-diploma-campus.webp" 
              alt="Estudantes graduados nos EUA" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#05294E]/60 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#031b33]/60 via-transparent to-transparent"></div>
          </div>

          {/* Logo - Top */}
          <div className="relative z-10">
            <Link to="/">
              <img 
                src="/favicon-branco.png" 
                alt="Matrícula USA" 
                className="h-16 w-auto hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* Title - Bottom */}
          <div className="relative z-10 w-full max-w-xl">
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
              {t('authPage.sideTitle', 'Transforme seu sonho de estudar nos EUA em realidade.')}
            </h1>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="relative w-full lg:w-1/2 flex-1 flex flex-col justify-center items-center bg-white overflow-y-auto custom-scrollbar p-8 sm:p-12 lg:p-16 xl:p-24">
          <div className="w-full max-w-lg">
            {/* Mobile Logo — fixed at top (Hidden on Desktop) */}
            <div className="lg:hidden absolute top-6 left-0 right-0 flex justify-center">
              <Link to="/">
                <img 
                  src="/logo.png.png" 
                  alt="Matrícula USA" 
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            {/* Mobile Header (Hidden on Desktop) */}
            <div className="lg:hidden text-center mb-10">
              <h1 className="text-3xl font-black text-slate-900 mb-2">
                {t('authPage.login.title')}
              </h1>
              <p className="text-slate-600">
                {t('authPage.login.subtitle')}
              </p>
            </div>

            {/* Login Header (Desktop only) */}
            <div className="hidden lg:block mb-10 text-center">
              <h2 className="text-3xl xl:text-4xl font-black text-slate-900">
                {t('authPage.login.title')}
              </h2>
            </div>

            {error && (
              <div className={`${error.includes('já foi confirmado') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'} px-5 py-4 rounded-2xl text-sm mb-8`}>
                <div className={`font-bold ${error.includes('já foi confirmado') ? 'text-green-800' : 'text-red-800'} mb-1`}>
                  {error.includes('já foi confirmado') ? 'Sucesso!' : t('authPage.login.loginFailed')}
                </div>
                <div>{error}</div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                    {t('authPage.login.emailAddress')}
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400 group-focus-within:text-[#05294E] transition-colors" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:bg-white transition-all duration-300 text-base"
                      placeholder={t('authPage.login.enterEmail')}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-bold text-slate-900">
                      {t('authPage.login.password')}
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-[#D0151C] hover:text-[#B01218] transition-colors"
                    >
                      {t('authPage.login.forgotPassword')}
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400 group-focus-within:text-[#05294E] transition-colors" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password || ''}
                      onChange={handleInputChange}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:bg-white transition-all duration-300 text-base"
                      placeholder={t('authPage.login.enterPassword')}
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-6 border border-transparent text-lg font-black rounded-2xl text-white bg-[#05294E] hover:bg-[#041f3a] transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 mt-8"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                    <span>{t('authPage.login.signingIn')}</span>
                  </div>
                ) : (
                  <span>{t('authPage.login.signIn')}</span>
                )}
              </button>

              {/* Sign Up Link */}
              <div className="text-center mt-6">
                <p className="text-slate-500 font-medium text-sm">
                  {t('authPage.login.noAccount')}{' '}
                  <Link to={location.search.includes('seller') ? `/seller/register${location.search}` : `/register${location.search}`} className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
                    {t('authPage.login.signUpHere')}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic styles based on active tab for inputs
  const ringColor = activeTab === 'affiliate' ? 'focus:ring-amber-500/20' : 'focus:ring-[#05294E]/20';
  const borderColor = activeTab === 'affiliate' ? 'focus:border-amber-500' : 'focus:border-[#05294E]';
  const iconColor = activeTab === 'affiliate' ? 'group-focus-within:text-amber-500' : 'group-focus-within:text-[#05294E]';
  const phoneBorderColor = activeTab === 'affiliate' ? 'focus-within:border-amber-500' : 'focus-within:border-[#05294E]';
  const phoneFocusColor = activeTab === 'affiliate' ? '#f59e0b' : '#05294E';
  const passwordHoverColor = activeTab === 'affiliate' ? 'hover:text-amber-500' : 'hover:text-[#05294E]';
  const textLinkColor = 'text-[#05294E] hover:underline';
  const checkboxColor = 'text-[#05294E] focus:ring-[#05294E]/20 accent-[#05294E]';

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side: Branding & Copywriting (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#05294E] relative overflow-hidden flex-col justify-between items-center p-12 lg:p-16 xl:p-24 text-center">
        {/* Background Image with Dark Overlay */}
        <div className="absolute inset-0 w-full h-full">
          {/* Student Image */}
          <img 
            src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/student-couple-graduation-diploma-campus.webp" 
            alt="Estudantes graduados nos EUA" 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              activeTab === 'student' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* University Image */}
          <img 
            src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/aerial-view-university-campus-quad-stadium.webp" 
            alt="Universidade Campus" 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              activeTab === 'university' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Affiliate Image */}
          <img 
            src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200&auto=format&fit=crop" 
            alt="Parceiros e Afiliados" 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              activeTab === 'affiliate' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-[#05294E]/60 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#031b33]/60 via-transparent to-transparent"></div>
        </div>

        {/* Logo - Top */}
        <div className="relative z-10">
          <Link to="/">
            <img 
              src="/favicon-branco.png" 
              alt="Matrícula USA" 
              className="h-16 w-auto hover:scale-105 transition-transform duration-300"
            />
          </Link>
        </div>

        {/* Title - Bottom */}
        <div className="relative z-10 w-full max-w-xl">
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
            {activeTab === 'student' && t('authPage.sideTitle', 'Transforme seu sonho de estudar nos EUA em realidade.')}
            {activeTab === 'university' && t('authPage.sideTitleUniversity', 'Conecte sua universidade a estudantes prontos para viver o sonho americano.')}
            {activeTab === 'affiliate' && t('authPage.sideTitleAffiliate', 'Faça parte da ponte entre estudantes e universidades americanas.')}
          </h1>
        </div>
      </div>

      {/* Right Side: Registration Form */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen bg-white overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl w-full mx-auto p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-center min-h-full">
          {/* Mobile Logo Only */}
          <div className="lg:hidden text-center mb-4">
            <div className="flex justify-center">
              <Link to="/">
                <img 
                  src="/logo.png.png" 
                  alt="Matrícula USA" 
                  className="h-10 w-auto"
                />
              </Link>
            </div>
          </div>



          {/* Tab Navigation */}
          <div className="flex justify-center mb-6 border-b border-slate-200">
            <div className="flex relative w-full">
              {/* Active Indicator Line */}
              <div 
                className={`absolute bottom-0 left-0 w-1/3 h-0.5 transition-all duration-500 ease-in-out ${
                  activeTab === 'student' 
                    ? 'translate-x-0 bg-[#05294E]' 
                    : activeTab === 'university'
                    ? 'translate-x-full bg-[#D0151C]'
                    : 'translate-x-[200%] bg-amber-500'
                }`}
              />
              
              <button
                onClick={() => handleTabChange('student')}
                type="button"
                className={`relative z-10 flex items-center justify-center px-2 py-3 flex-1 font-bold transition-all duration-300 text-xs sm:text-sm ${
                  activeTab === 'student'
                    ? 'text-[#05294E]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <GraduationCap className={`h-5 w-5 mr-1.5 transition-colors duration-300 ${activeTab === 'student' ? 'text-[#05294E]' : 'text-slate-400'}`} />
                <span>{t('authPage.register.tabStudent', 'Estudante')}</span>
              </button>
              
              <button
                onClick={() => handleTabChange('university')}
                type="button"
                className={`relative z-10 flex items-center justify-center px-2 py-3 flex-1 font-bold transition-all duration-300 text-xs sm:text-sm ${
                  activeTab === 'university'
                    ? 'text-[#D0151C]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Building className={`h-5 w-5 mr-1.5 transition-colors duration-300 ${activeTab === 'university' ? 'text-[#D0151C]' : 'text-slate-400'}`} />
                <span>{t('authPage.register.tabUniversity', 'Universidade')}</span>
              </button>

              <button
                onClick={() => handleTabChange('affiliate')}
                type="button"
                className={`relative z-10 flex items-center justify-center px-2 py-3 flex-1 font-bold transition-all duration-300 text-xs sm:text-sm ${
                  activeTab === 'affiliate'
                    ? 'text-amber-500'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Handshake className={`h-5 w-5 mr-1.5 transition-colors duration-300 ${activeTab === 'affiliate' ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{t('authPage.register.tabAffiliate', 'Sou um Afiliado')}</span>
              </button>
            </div>
          </div>

          {/* Registration Title */}
          <div className="text-center mb-5">
            <h2 className="text-2xl xl:text-3xl font-black text-slate-900">
              {t('authPage.register.title')}
            </h2>
          </div>

          {/* Error Message */}
          {error && 
            error !== t('authPage.messages.invalidDependents') && 
            error !== t('authPage.messages.passwordsNotMatch') && 
            error !== t('authPage.messages.invalidPasswordChars') && 
            error !== t('authPage.messages.weakPassword') && 
            error !== t('authPage.messages.invalidPhone') && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm mb-8 flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold text-red-800 mb-0.5">{t('authPage.messages.registrationFailed')}</div>
                <div className="opacity-90">{error}</div>
              </div>
            </div>
          )}

          {isRegistered && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-2xl text-sm mb-8 flex items-start">
              <CheckCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-green-600" />
              <div>
                <div className="font-bold text-green-900 mb-0.5">Sucesso!</div>
                <div className="opacity-90 leading-relaxed">
                  {activeTab === 'affiliate' ? (
                    <span>
                      Enviamos um link de confirmação para o endereço <strong>{formData.email}</strong>. Por favor, acesse seu e-mail e clique no link para ativar sua conta de afiliado e começar a indicar.
                    </span>
                  ) : (
                    <span>
                      Enviamos um link de confirmação para o endereço <strong>{formData.email}</strong>. Por favor, confirme seu e-mail antes de fazer o login. Redirecionando para a tela de login em 10 segundos...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form Fields Grid */}
            {(activeTab === 'student' || activeTab === 'affiliate') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name — full width */}
                  <div className="sm:col-span-2">
                    <label htmlFor="full_name" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.fullName')}
                    </label>
                    <div className="relative group">
                      <User className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 ${iconColor} transition-colors`} />
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        onBlur={() => handleFieldBlur('full_name')}
                        className={`w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 ${ringColor} ${borderColor} focus:bg-white transition-all duration-300 text-sm`}
                        placeholder={t('authPage.register.enterFullName')}
                      />
                    </div>
                  </div>

                  {/* Email — col 1 */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.emailAddress')}
                    </label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 ${iconColor} transition-colors`} />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        onBlur={() => handleFieldBlur('email')}
                        className={`w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 ${ringColor} ${borderColor} focus:bg-white transition-all duration-300 text-sm`}
                        placeholder={t('authPage.register.enterEmail')}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Phone — col 2 */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.phoneNumber')} {activeTab === 'affiliate' && <span className="text-slate-400 font-normal">(opcional)</span>}
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        addInternationalOption={false}
                        value={formData.phone}
                        onBlur={() => handleFieldBlur('phone')}
                        onChange={(value) => {
                          setFormData(prev => ({ ...prev, phone: value || '' }));
                        }}
                        style={{
                          '--PhoneInputCountryFlag-height': '1.2em',
                          '--PhoneInputCountrySelectArrow-opacity': '0.8',
                          '--PhoneInput-color--focus': phoneFocusColor
                        }}
                        maxLength={20}
                        className={`phone-input-custom register ${activeTab === 'affiliate' ? 'affiliate' : ''} w-full pl-4 pr-4 py-3 bg-slate-50 border placeholder-slate-400 text-slate-900 rounded-2xl transition-all duration-300 text-sm ${
                          error === t('authPage.messages.invalidPhone') 
                            ? 'border-red-500 ring-2 ring-red-500/10' 
                            : `border-slate-200 focus-within:bg-white ${phoneBorderColor}`
                        }`}
                        placeholder={t('authPage.register.enterPhone')}
                      />
                      {error === t('authPage.messages.invalidPhone') && (
                        <div className="mt-1.5 flex items-center text-red-500 text-[10px] font-bold uppercase tracking-wider ml-1">
                          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password — col 1 */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.password')}
                    </label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 ${iconColor} transition-colors`} />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        onBlur={() => trackFieldFilled('password')}
                        className={`w-full pl-12 pr-12 py-3 bg-slate-50 border placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                          error === t('authPage.messages.invalidPasswordChars') || error === t('authPage.messages.weakPassword')
                            ? 'border-red-500 focus:ring-red-500/20'
                            : `border-slate-200 ${ringColor} ${borderColor} focus:bg-white`
                        }`}
                        maxLength={20}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 ${passwordHoverColor} focus:outline-none transition-colors`}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password — col 2 */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.confirmPassword')}
                    </label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 ${iconColor} transition-colors`} />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword || ''}
                        onChange={handleInputChange}
                        onBlur={() => trackFieldFilled('confirm_password')}
                        className={`w-full pl-12 pr-12 py-3 bg-slate-50 border placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                          error === t('authPage.messages.passwordsNotMatch')
                            ? 'border-red-500 focus:ring-red-500/20'
                            : `border-slate-200 ${ringColor} ${borderColor} focus:bg-white`
                        }`}
                        maxLength={20}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 ${passwordHoverColor} focus:outline-none transition-colors`}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
              </div>
            )}


            {/* University Form */}
            {activeTab === 'university' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">


                  {/* Contact Name — full width */}
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.contactPersonName')}
                    </label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#D0151C] transition-colors" />
                      <input
                        id="name"
                        name="full_name"
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        onBlur={() => handleFieldBlur('full_name')}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C]/20 focus:border-[#D0151C] focus:bg-white transition-all duration-300 text-sm"
                        placeholder={t('authPage.register.enterFullName')}
                      />
                    </div>
                  </div>

                  {/* University Email — col 1 */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.officialEmail')}
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#D0151C] transition-colors" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        onBlur={() => handleFieldBlur('email')}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C]/20 focus:border-[#D0151C] focus:bg-white transition-all duration-300 text-sm"
                        placeholder={t('authPage.register.enterEmail')}
                      />
                    </div>
                  </div>

                  {/* Phone — col 2 */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.phoneNumber')}
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        addInternationalOption={false}
                        value={formData.phone}
                        onChange={(value) => {
                          setFormData(prev => ({ ...prev, phone: value || '' }));
                        }}
                        style={{
                          '--PhoneInputCountryFlag-height': '1.2em',
                          '--PhoneInputCountrySelectArrow-opacity': '0.8',
                          '--PhoneInput-color--focus': '#D0151C'
                        }}
                        maxLength={20}
                        onBlur={() => handleFieldBlur('phone')}
                        className={`phone-input-custom university w-full pl-4 pr-4 py-3 bg-slate-50 border placeholder-slate-400 text-slate-900 rounded-2xl transition-all duration-300 text-sm ${
                          error === t('authPage.messages.invalidPhone') 
                            ? 'border-red-500 ring-2 ring-red-500/10' 
                            : 'border-slate-200 focus-within:border-[#D0151C] focus-within:bg-white'
                        }`}
                        placeholder={t('authPage.register.enterContactPhone')}
                      />
                    </div>
                  </div>

                  {/* Password — col 1 */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.password')}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#D0151C] transition-colors" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        onBlur={() => trackFieldFilled('password')}
                        className={`w-full pl-12 pr-12 py-3 bg-slate-50 border placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                          error === t('authPage.messages.invalidPasswordChars') || error === t('authPage.messages.weakPassword')
                            ? 'border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 focus:ring-[#D0151C]/20 focus:border-[#D0151C] focus:bg-white'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#D0151C] focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password — col 2 */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                      {t('authPage.register.confirmPassword')}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#D0151C] transition-colors" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword || ''}
                        onChange={handleInputChange}
                        onBlur={() => trackFieldFilled('confirm_password')}
                        className={`w-full pl-12 pr-12 py-3 bg-slate-50 border placeholder-slate-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                          error === t('authPage.messages.passwordsNotMatch')
                            ? 'border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 focus:ring-[#D0151C]/20 focus:border-[#D0151C] focus:bg-white'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#D0151C] focus:outline-none transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

              </div>
            )}


            {/* Checkboxes Area */}
            <div className="space-y-3 pt-1">
              {/* Referral Code — Só exibe se for estudante (afiliados não indicam a si mesmos) */}
              {activeTab === 'student' && (
                <div className="space-y-3">
                  {/* Checkbox para revelar o campo */}
                  <label className="flex items-start space-x-3 cursor-pointer group">
                    <div className="relative flex items-center mt-1">
                      <input
                        type="checkbox"
                        checked={showReferralInput}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setShowReferralInput(checked);
                          if (!checked && !isReferralCodeLocked) {
                            setFormData(prev => ({ ...prev, referralCode: '' }));
                            setReferralCodeValid(null);
                            setReferralCodeType(null);
                          }
                        }}
                        disabled={isReferralCodeLocked}
                        className={`h-4 w-4 rounded border-slate-300 transition-all duration-200 cursor-pointer ${checkboxColor} disabled:cursor-not-allowed`}
                      />
                    </div>
                    <span className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                      {t('authPage.register.haveReferralCodeQuestion', 'Você tem um código de cupom?')}
                    </span>
                  </label>

                  {/* Input do código - exibe apenas se o checkbox estiver marcado */}
                  {showReferralInput && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2 mt-2 pb-2">
                      <label htmlFor="referralCode" className="block text-xs font-bold text-slate-500 ml-1">
                        {t('authPage.register.referralCodeAutoApplied')}
                      </label>
                      <div className="relative group">
                        {isReferralCodeLocked ? (
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                        ) : (
                          <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#05294E] transition-colors" />
                        )}
                        <input
                          id="referralCode"
                          name="referralCode"
                          type="text"
                          value={formData.referralCode || ''}
                          onChange={handleReferralCodeChange}
                          readOnly={isReferralCodeLocked}
                          className={`w-full pl-12 pr-12 py-3 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm ${
                            isReferralCodeLocked 
                              ? 'bg-green-50/50 cursor-not-allowed border-green-200' 
                              : 'border-slate-200 focus:ring-[#05294E]/20 focus:border-[#05294E] focus:bg-white'
                          } ${
                            referralCodeValid === true 
                              ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500' 
                              : referralCodeValid === false 
                              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                              : ''
                          }`}
                          placeholder={t('authPage.register.referralCodePlaceholderSellerMatr')}
                          onBlur={() => trackFieldFilled('referral_code')}
                          maxLength={20}
                        />
                        {referralCodeLoading && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#05294E]"></div>
                          </div>
                        )}
                        {referralCodeValid === true && !referralCodeLoading && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <CheckCircle className="h-5 w-5 text-green-500 animate-in zoom-in duration-300" />
                          </div>
                        )}
                        {referralCodeValid === false && formData.referralCode && !referralCodeLoading && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <X className="h-5 w-5 text-red-500 animate-in zoom-in duration-300" />
                          </div>
                        )}
                      </div>
                      
                      {/* Feedback de tipo detectado */}
                      {formData.referralCode && (
                        <div className="mt-1 text-xs">
                          {referralCodeValid === true && (
                            <p className="text-green-600 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {referralCodeType === 'seller' ? t('authPage.register.sellerReferralCode.applied') : t('authPage.register.referralCode.applied')}
                            </p>
                          )}
                          {referralCodeValid === false && (
                            <p className="text-red-600 flex items-center">
                              <X className="h-3 w-3 mr-1" />
                              {t('authPage.register.referralCode.invalid')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-start space-x-3 cursor-pointer group">
                <div className="relative flex items-center mt-1">
                  <input
                    type="checkbox"
                    id="newsletter-consent"
                    checked={newsletterConsent}
                    onChange={(e) => setNewsletterConsent(e.target.checked)}
                    className={`h-4 w-4 rounded border-slate-300 transition-all duration-200 cursor-pointer ${checkboxColor}`}
                  />
                </div>
                <span className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                  {t('authPage.register.newsletterConsent')}
                </span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer group">
                <div className="relative flex items-center mt-1">
                  <input
                    type="checkbox"
                    id="terms-acceptance"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className={`h-4 w-4 rounded border-slate-300 transition-all duration-200 cursor-pointer ${checkboxColor}`}
                  />
                </div>
                <span className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                  {t('authPage.register.termsNotice')}
                  <a href="/terms-of-service" target="_blank" className={`font-bold mx-1 ${textLinkColor}`}>
                    {t('authPage.register.terms')}
                  </a>
                  {t('authPage.register.and')}
                  <a href="/privacy-policy" target="_blank" className={`font-bold ml-1 ${textLinkColor}`}>
                    {t('authPage.register.privacyPolicy')}
                  </a>
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full group relative flex items-center justify-center py-3.5 px-6 border border-transparent text-base font-black rounded-2xl text-white transition-all duration-300 shadow-xl hover:shadow-2xl active:scale-95 cursor-pointer disabled:active:scale-100 mt-4 ${
                activeTab === 'student' 
                  ? 'bg-[#05294E] hover:bg-[#041f3a]' 
                  : activeTab === 'university'
                  ? 'bg-[#D0151C] hover:bg-[#B01218]'
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                  <span>{t('authPage.register.creatingAccount')}</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span>
                    {activeTab === 'student' 
                      ? t('authPage.register.createStudentAccount') 
                      : activeTab === 'university' 
                      ? t('authPage.register.createUniversityAccount') 
                      : t('authPage.register.createAffiliateAccount', 'Criar Conta de Afiliado')}
                  </span>
                </div>
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-slate-500 font-medium text-sm">
                {t('authPage.register.hasAccount')}{' '}
                <Link to={`/login${location.search}`} className="text-[#D0151C] hover:text-[#B01218] font-bold transition-colors">
                  {t('authPage.register.signInHere')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;