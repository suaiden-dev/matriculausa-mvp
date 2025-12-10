import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Building, GraduationCap, CheckCircle, X, Gift, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { getStoredUtmParams, clearUtmParams } from '../utils/utmTracker';

interface AuthProps {
  mode: 'login' | 'register';
}

const Auth: React.FC<AuthProps> = ({ mode }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'student' | 'university'>('student');
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
    dependents: 0, // Dependents field for SUAIDEN code
    // University specific fields
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
  // Estado para rastrear se o seller é do sistema simplificado
  const [isSimplifiedSeller, setIsSimplifiedSeller] = useState(false);
  // Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Newsletter consent state
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  // Ref para evitar múltiplas execuções
  const referralCodeProcessedRef = useRef(false);

  
  const { login, register } = useAuth();

  const navigate = useNavigate();

  // Global scroll-to-top on login/register page load
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      // console.log('Scroll position reset to top on login/register page load.');
    }, 75);
    return () => clearTimeout(timer);
  }, []);

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
              .rpc('get_seller_system_type_by_referral_code', { referral_code: codeUpper });
            
             if (!systemTypeError && systemTypeData) {
               const isSimplified = systemTypeData === 'simplified';
               setIsSimplifiedSeller(isSimplified);
               console.log('[AUTH] System type do seller:', systemTypeData, 'isSimplified:', isSimplified);
             } else {
               setIsSimplifiedSeller(false);
             }
          } catch (err) {
            console.error('[AUTH] Erro ao verificar system_type do seller:', err);
            setIsSimplifiedSeller(false);
          }
        } else {
          setIsSimplifiedSeller(false);
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

    setFormData(prev => ({ ...prev, referralCode: code }));
    setReferralCodeType(detectedType);
    setIsReferralCodeLocked(true);
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
        const refCodeFromUrl = urlParams.get('ref');
        
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
    
    // Resetar estado de simplified seller quando o código muda
    setIsSimplifiedSeller(false);
    
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
    setLoading(true);

    try {
      if (mode === 'register') {
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

        // Validate allowed password characters: letters, numbers and @#$!
        const allowedPasswordRegex = /^[A-Za-z0-9@#$!]+$/;
        if (!allowedPasswordRegex.test(formData.password)) {
          setError(t('authPage.messages.invalidPasswordChars'));
          setLoading(false);
          return;
        }
        
        // Validar telefone obrigatório e formato internacional
        if (!formData.phone || formData.phone.length < 8) {
          console.log('❌ [AUTH] Validação de telefone falhou:', {
            phone: formData.phone,
            length: formData.phone?.length
          });
          setError(t('authPage.messages.invalidPhone'));
          setLoading(false);
          return;
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
         
          // Validar dependents para todos os estudantes (deve ser entre 0 e 5)
          if (activeTab === 'student' && (formData.dependents < 0 || formData.dependents > 5)) {
            setError('Please select between 0 and 5 dependents.');
            setLoading(false);
            return;
          }
        
        const userData = {
          full_name: activeTab === 'student' ? formData.full_name : formData.full_name,
          role: (activeTab === 'student' ? 'student' : 'school') as 'student' | 'school',
          // Newsletter consent - save for all users
          newsletter_consent: newsletterConsent,
          // Add additional registration data only for universities
          ...(activeTab === 'university' && {
            universityName: formData.universityName || '',
            position: formData.position || '',
            website: formData.website || '',
            location: formData.location || '',
            phone: formData.phone || ''
          }),
           // Add phone for student
           ...(activeTab === 'student' && {
             phone: formData.phone || '',
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
             }),
             // ✅ Dependents: Sempre salvar para todos os estudantes
             dependents: formData.dependents
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
        
        await register(normalizedEmail, formData.password, userData, {
          utm: utmParams
        });

        // Limpar códigos de referência do localStorage após registro bem-sucedido
        localStorage.removeItem('pending_affiliate_code');
        localStorage.removeItem('pending_seller_referral_code');
        
        // 📊 Limpar parâmetros UTM do localStorage após registro bem-sucedido
        if (utmParams) {
          clearUtmParams();
          console.log('📊 [AUTH] UTM parameters limpos do localStorage');
        }

        // Para estudantes, o email já é confirmado automaticamente e o login é feito automaticamente
        // O AuthRedirect vai redirecionar para o dashboard
        // Para universidades, também não mostra modal - o email será confirmado normalmente
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

  const handleTabChange = (tab: 'student' | 'university') => {
    setActiveTab(tab);
  };


  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6 sm:mb-8">
              <img 
                src="/favicon-branco.png" 
                alt="Matrícula USA" 
                className="h-12 sm:h-16 w-auto"
              />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 sm:mb-4">
              {t('authPage.login.title')}
            </h2>
            <p className="text-slate-600 text-base sm:text-lg px-4">
              {t('authPage.login.subtitle')}
            </p>
            <p className="mt-4 text-sm text-slate-500 px-4">
              {t('authPage.login.noAccount')}{' '}
              <Link to="/register" className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
                {t('authPage.login.signUpHere')}
              </Link>
            </p>
          </div>

          {/* Form */}
          <form className="mt-6 sm:mt-8 space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200" onSubmit={handleSubmit}>
            {error && (
              <div className={`${error.includes('já foi confirmado') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'} px-4 py-3 rounded-2xl text-sm`}>
                <div className={`font-medium ${error.includes('já foi confirmado') ? 'text-green-800' : 'text-red-800'} mb-1`}>
                  {error.includes('já foi confirmado') 
                    ? 'Email Confirmado' 
                    : t('authPage.login.loginFailed')}
                </div>
                <div>{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                {t('authPage.login.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                  placeholder={t('authPage.login.enterEmail')}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                {t('authPage.login.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                  placeholder={t('authPage.login.enterPassword')}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-[#D0151C] hover:text-[#B01218] font-medium transition-colors"
              >
                {t('authPage.login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 sm:py-4 px-4 border border-transparent text-sm sm:text-base font-bold rounded-2xl text-white bg-[#05294E] hover:bg-[#041f3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#05294E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="text-sm sm:text-base">{t('authPage.login.signingIn')}</span>
                </div>
              ) : (
                <span className="text-sm sm:text-base">{t('authPage.login.signIn')}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-6 sm:mb-8">
            <img 
              src="/favicon-branco.png" 
              alt="Matrícula USA" 
              className="h-12 sm:h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-3 sm:mb-4 px-4">
            {t('authPage.register.title')}
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto px-4">
            {t('authPage.register.subtitle')}
          </p>
          <p className="mt-4 text-sm text-slate-500 px-4">
            {t('authPage.register.hasAccount')}{' '}
            <Link to="/login" className="font-bold text-[#D0151C] hover:text-[#B01218] transition-colors">
              {t('authPage.register.signInHere')}
            </Link>
            </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6 sm:mb-8 px-4">
          <div className="bg-slate-100 p-1 sm:p-2 rounded-2xl flex space-x-1 sm:space-x-2 w-full max-w-md">
            <button
              onClick={() => handleTabChange('student')}
              className={`flex items-center justify-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 flex-1 text-sm ${
                activeTab === 'student'
                  ? 'bg-white text-[#05294E] shadow-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">{t('authPage.register.tabStudent')}</span>
            </button>
            <button
              onClick={() => handleTabChange('university')}
              className={`flex items-center justify-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 flex-1 text-sm ${
                activeTab === 'university'
                  ? 'bg-white text-[#05294E] shadow-lg'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">{t('authPage.register.tabUniversity')}</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-slate-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg border border-slate-200 mx-4 sm:mx-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-6">
              <div className="font-medium text-red-800 mb-1">{t('authPage.messages.registrationFailed')}</div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Form */}
            {activeTab === 'student' && (
              <>
                <div className="text-center mb-6 sm:mb-8">
                  <div className="bg-[#05294E] w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">{t('authPage.register.studentRegistration')}</h2>
                  <p className="text-sm sm:text-base text-slate-600 px-4">{t('authPage.register.studentSubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="lg:col-span-1">
                    <label htmlFor="full_name" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.fullName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.enterFullName')}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.emailAddress')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        className="appearance-none relative block w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.enterEmail')}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.phoneNumber')}
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        addInternationalOption={false}
                        value={formData.phone}
                        onChange={(value) => {
                          setFormData(prev => {
                            const newData = { ...prev, phone: value || '' };
                            return newData;
                          });
                        }}
                        style={{
                          '--PhoneInputCountryFlag-height': '1.2em',
                          '--PhoneInputCountrySelectArrow-opacity': '0.8',
                          '--PhoneInput-color--focus': '#05294E'
                        }}
                        className="phone-input-custom w-full pl-4 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.enterPhone')}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.password')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.createPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.confirmYourPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="referralCode" className="block text-sm font-bold text-slate-900 mb-2">
                      Referral Code (Optional)
                    </label>
                    <div className="relative">
                      {isReferralCodeLocked ? (
                        <Lock className="absolute left-4 top-4 h-5 w-5 text-green-500" />
                      ) : (
                        <Gift className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      )}
                      <input
                        id="referralCode"
                        name="referralCode"
                        type="text"
                        value={formData.referralCode || ''}
                        onChange={handleReferralCodeChange}
                        readOnly={isReferralCodeLocked}
                        className={`w-full pl-12 pr-4 py-3 sm:py-4 bg-white border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-sm sm:text-base ${
                          isReferralCodeLocked 
                            ? 'bg-gray-50 cursor-not-allowed border-slate-300' 
                            : ''
                        } ${
                          referralCodeValid === true 
                            ? 'border-green-300 focus:ring-green-500 focus:border-green-500' 
                            : referralCodeValid === false 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-slate-300 focus:ring-[#05294E] focus:border-[#05294E]'
                        }`}
                        placeholder={isReferralCodeLocked ? 'Código aplicado automaticamente' : 'Digite SELLER ou MATR code'}
                        maxLength={20}
                      />
                      {referralCodeLoading && (
                        <div className="absolute right-4 top-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#05294E]"></div>
                        </div>
                      )}
                      {referralCodeValid === true && !referralCodeLoading && (
                        <div className="absolute right-4 top-4">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                      {referralCodeValid === false && formData.referralCode && !referralCodeLoading && (
                        <div className="absolute right-4 top-4">
                          <X className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* Feedback de tipo detectado */}
                    {formData.referralCode && (
                      <div className="mt-1 text-xs">
                        {referralCodeValid === true && (
                          <p className="text-green-600 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Detected: {referralCodeType === 'seller' ? t('authPage.register.sellerReferralCode.title') : t('authPage.register.referralCode.title')}
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

                  {/* Dependents field - Always shown for all students - placed right after Referral Code */}
                  {activeTab === 'student' && (
                    <div className="lg:col-span-1">
                      <label htmlFor="dependents" className="block text-sm font-bold text-slate-900 mb-2">
                        Dependents <span className="text-xs font-normal text-slate-500">- Family members (spouse and/or children)</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-4 h-5 w-5 text-slate-400 z-10" />
                        <ChevronDown className="absolute right-4 top-4 h-5 w-5 text-slate-400 pointer-events-none z-10" />
                        <select
                          id="dependents"
                          name="dependents"
                          value={formData.dependents || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, dependents: value }));
                          }}
                          className="appearance-none relative block w-full pl-12 pr-12 py-3 sm:py-4 bg-white border border-slate-300 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base cursor-pointer"
                        >
                          <option value={0}>0 Dependents</option>
                          <option value={1}>1 Dependent</option>
                          <option value={2}>2 Dependents</option>
                          <option value={3}>3 Dependents</option>
                          <option value={4}>4 Dependents</option>
                          <option value={5}>5 Dependents</option>
                        </select>
                </div>
              </div>
            )}

                </div>
              </>
            )}

            {/* University Form */}
            {activeTab === 'university' && (
              <>
                <div className="text-center mb-6 sm:mb-8">
                  <div className="bg-[#D0151C] w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Building className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">{t('authPage.register.universityRegistration')}</h2>
                  <p className="text-sm sm:text-base text-slate-600 px-4">{t('authPage.register.universitySubtitle')}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="lg:col-span-1">
                    <label htmlFor="universityName" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.universityName')}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="universityName"
                        name="universityName"
                        type="text"
                        required
                        value={formData.universityName || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.enterUniversityName')}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.contactPersonName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="name"
                        name="full_name"
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.yourFullName')}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.officialEmail')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.officialUniversityEmail')}
                      />
                    </div>
                  </div>
                  

                  <div className="lg:col-span-1">
                    <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.phoneNumber')}
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        addInternationalOption={false}
                        value={formData.phone}
                        onChange={(value) => {
                          console.log('📞 [PHONEINPUT-UNI] Valor capturado:', value);
                          setFormData(prev => {
                            const newData = { ...prev, phone: value || '' };
                            console.log('📞 [PHONEINPUT-UNI] Novo formData:', newData);
                            return newData;
                          });
                        }}
                        style={{
                          '--PhoneInputCountryFlag-height': '1.2em',
                          '--PhoneInputCountrySelectArrow-opacity': '0.8',
                          '--PhoneInput-color--focus': '#D0151C'
                        }}
                        className="w-full pl-4 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#D0151C] focus:border-[#D0151C] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.enterContactPhone')}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="password" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.password')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.createPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-900 mb-2">
                      {t('authPage.register.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={formData.confirmPassword || ''}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-white border border-slate-300 placeholder-slate-500 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm sm:text-base"
                        placeholder={t('authPage.register.confirmYourPassword')}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Terms and Privacy Policy Notice */}
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="terms-acceptance"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E] flex-shrink-0"
              />
              <label htmlFor="terms-acceptance" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
                {t('authPage.register.termsNotice')}
                <a 
                  href="/terms-of-service" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#05294E] hover:text-[#05294E]/80 font-medium underline"
                >
                  {t('authPage.register.terms')}
                </a>
                {t('authPage.register.and')}
                <a 
                  href="/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#05294E] hover:text-[#05294E]/80 font-medium underline"
                >
                  {t('authPage.register.privacyPolicy')}
                </a>
                .
              </label>
            </div>

            {/* Newsletter Consent Checkbox */}
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="newsletter-consent"
                checked={newsletterConsent}
                onChange={(e) => setNewsletterConsent(e.target.checked)}
                className="h-4 w-4 text-[#05294E] border-gray-300 rounded focus:ring-[#05294E] flex-shrink-0"
              />
              <label htmlFor="newsletter-consent" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
                I want to receive newsletter emails with updates and important information
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className={`w-full flex justify-center py-3 sm:py-4 px-4 border border-transparent text-base sm:text-lg font-black rounded-2xl text-white transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === 'student' 
                  ? 'bg-[#05294E] hover:bg-[#05294E]/90 focus:ring-[#05294E]' 
                  : 'bg-[#D0151C] hover:bg-[#B01218] focus:ring-[#D0151C]'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                  <span className="text-sm sm:text-base">{t('authPage.register.creatingAccount')}</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-sm sm:text-base">
                    {activeTab === 'student' ? t('authPage.register.createStudentAccount') : t('authPage.register.createUniversityAccount')}
                  </span>
                </div>
              )}
            </button>
          </form>






          {/* Formulário de registro de estudante */}
        </div>
      </div>
    </div>
  );
};

export default Auth;