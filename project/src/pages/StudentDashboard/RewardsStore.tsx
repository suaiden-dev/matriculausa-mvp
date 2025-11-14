import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  ShoppingCart, 
  CheckCircle, 
  AlertCircle,
  Star,
  Users,
  DollarSign,
  ArrowLeft,
  History,
  Zap,
  Building,
  Search,
  MapPin,
  Globe,
  Calendar,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { MatriculacoinCredits, MatriculacoinTransaction, TuitionDiscount, TuitionRedemption, UniversityConfirmationData } from '../../types';
import { TuitionRewardsService } from '../../services/TuitionRewardsService';
import { Link } from 'react-router-dom';



const RewardsStore: React.FC = () => {
  const { t } = useTranslation();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<MatriculacoinCredits | null>(null);
  const [activeTab, setActiveTab] = useState<'store' | 'history'>('store');
  const [transactions, setTransactions] = useState<MatriculacoinTransaction[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para tuition rewards
  const [tuitionDiscounts, setTuitionDiscounts] = useState<TuitionDiscount[]>([]);
  const [tuitionRedemptions, setTuitionRedemptions] = useState<TuitionRedemption[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [searchUniversities, setSearchUniversities] = useState<string>('');
  const [filteredUniversities, setFilteredUniversities] = useState<any[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<any>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<TuitionDiscount | null>(null);
  const [showUniversitySelection, setShowUniversitySelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<UniversityConfirmationData | null>(null);
  const [redeemingTuition, setRedeemingTuition] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [universitiesPerPage] = useState(6); // 2x3 grid for modal

  // Estados para resgate customizado
  const [showCustomRedemption, setShowCustomRedemption] = useState(false);
  const [customCoinsAmount, setCustomCoinsAmount] = useState<number>(0);
  const [customDiscountAmount, setCustomDiscountAmount] = useState<number>(0);
  const [isCustomRedemption, setIsCustomRedemption] = useState(false);

  // Estados para universidade automática
  const [userUniversity, setUserUniversity] = useState<any>(null);
  const [isEnrolledStudent, setIsEnrolledStudent] = useState(false);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (user?.id && !dataLoaded) {
      loadStoreData();
      // Só verificar status de matrícula se ainda não foi verificado
      if (!enrollmentChecked) {
        checkUserEnrollmentStatus();
      }
    } else if (!user?.id) {
      setLoading(false);
    }
  }, [user?.id, dataLoaded, enrollmentChecked]);

  // Listener para mudanças de visibilidade da aba (sem causar refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Só recarregar se a aba voltar a ficar visível E se os dados não foram carregados
      if (!document.hidden && user?.id && !dataLoaded) {
        loadStoreData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, dataLoaded]);

  // Verificar se o usuário é um aluno matriculado
  const checkUserEnrollmentStatus = async () => {
    if (!user?.id || !userProfile || enrollmentChecked) return;

    try {
      // Verificar se o usuário tem uma aplicação com status "enrolled"
      const { data: applications, error } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          scholarships (
            id,
            title,
            university_id
          )
        `)
        .eq('student_id', userProfile.id)
        .eq('status', 'enrolled');

      if (error) {
        console.error('Erro ao verificar status de matrícula:', error);
        return;
      }

      if (applications && applications.length > 0) {
        const enrolledApplication = applications[0];
        if (enrolledApplication.scholarships?.university_id) {
          // Buscar dados da universidade
          const { data: universityData, error: universityError } = await supabase
            .from('universities')
            .select(`
              id,
              name,
              logo_url,
              location,
              established_year,
              student_count,
              website
            `)
            .eq('id', enrolledApplication.scholarships.university_id)
            .single();

          if (universityError) {
            console.error('Erro ao buscar dados da universidade:', universityError);
            return;
          }

          if (universityData) {
            setIsEnrolledStudent(true);
            setUserUniversity(universityData);
            console.log('🎓 Usuário é aluno matriculado na universidade:', universityData.name);
          }
        }
      }
      
      // Marcar como verificado para evitar verificações repetidas
      setEnrollmentChecked(true);
    } catch (error) {
      console.error('Erro ao verificar status de matrícula:', error);
      setEnrollmentChecked(true); // Marcar como verificado mesmo em caso de erro
    }
  };

  const loadStoreData = async () => {
    if (dataLoaded) return; // Evitar carregamento repetido
    
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      // Carregar créditos do usuário
      const { data: creditsData, error: creditsError } = await supabase
        .from('matriculacoin_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Erro ao carregar créditos:', creditsError);
      }

      if (!creditsData) {
        // Criar registro de créditos se não existir
        const { data: newCredits, error: createCreditsError } = await supabase
          .from('matriculacoin_credits')
          .insert([
            { user_id: user.id, balance: 0, total_earned: 0, total_spent: 0 }
          ])
          .select()
          .single();

        if (createCreditsError) {
          console.error('Erro ao criar créditos:', createCreditsError);
        } else {
          setCredits(newCredits);
        }
      } else {
        setCredits(creditsData);
      }

      // Carregar descontos de tuition
      try {
        const discounts = await TuitionRewardsService.getTuitionDiscounts();
        setTuitionDiscounts(discounts);
      } catch (error: any) {
        console.error('Erro ao carregar descontos de tuition:', error);
      }

      // Carregar universidades aprovadas
      try {
        const universitiesData = await TuitionRewardsService.getApprovedUniversities();
        setUniversities(universitiesData);
        setFilteredUniversities(universitiesData);
      } catch (error: any) {
        console.error('Erro ao carregar universidades:', error);
      }

      // Carregar histórico de resgates de tuition
      try {
        const redemptions = await TuitionRewardsService.getUserTuitionRedemptions(user.id);
        setTuitionRedemptions(redemptions);
      } catch (error: any) {
        console.error('Erro ao carregar histórico de tuition:', error);
      }


      // Carregar histórico de transações
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('matriculacoin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.error('Erro ao carregar transações:', transactionsError);
      } else {
        setTransactions(transactionsData || []);
      }

      // Marcar dados como carregados
      setDataLoaded(true);

    } catch (error) {
      console.error('Erro ao carregar dados da loja:', error);
      setError('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };





  // Buscar universidades
  const handleSearchUniversities = (searchTerm: string) => {
    setSearchUniversities(searchTerm);
    setCurrentPage(1); // Reset to first page when searching
    
    if (!searchTerm.trim()) {
      setFilteredUniversities(universities);
    } else {
      const filtered = universities.filter(university =>
        university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        university.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUniversities(filtered);
    }
  };

  // Selecionar desconto de tuition
  const handleSelectTuitionDiscount = async (discount: TuitionDiscount) => {
    setSelectedDiscount(discount);
    setIsCustomRedemption(false);
    
    // Se o usuário é aluno matriculado, usar sua universidade automaticamente
    if (isEnrolledStudent && userUniversity) {
      setSelectedUniversity(userUniversity);
      setShowUniversitySelection(false);
      
      try {
        // Buscar dados de confirmação da universidade
        const confirmationData = await TuitionRewardsService.getUniversityConfirmationData(userUniversity.id);
        setConfirmationData(confirmationData);
        setShowConfirmation(true);
      } catch (error: any) {
        console.error('Erro ao buscar dados da universidade:', error);
        setError(error.message || 'Failed to fetch university data');
      }
    } else {
      // Se não é aluno matriculado, mostrar seleção de universidade
      setShowUniversitySelection(true);
    }
  };

  // Iniciar resgate customizado
  const handleCustomRedemption = () => {
    setCustomCoinsAmount(0);
    setCustomDiscountAmount(0);
    setIsCustomRedemption(true);
    setShowCustomRedemption(true);
  };

  // Atualizar quantidade customizada de coins
  const handleCustomCoinsChange = (amount: number) => {
    setCustomCoinsAmount(amount);
    setCustomDiscountAmount(amount); // 1 coin = $1 USD
  };

  // Confirmar resgate customizado
  const handleConfirmCustomRedemption = () => {
    if (customCoinsAmount < 10) {
      setError('Minimum 10 coins required for redemption');
      return;
    }
    
    if (customCoinsAmount > (credits?.balance || 0)) {
      setError('Insufficient Matricula Coins');
      return;
    }
    
    setShowCustomRedemption(false);
    
    // Se o usuário é aluno matriculado, usar sua universidade automaticamente
    if (isEnrolledStudent && userUniversity) {
      setSelectedUniversity(userUniversity);
      setShowUniversitySelection(false);
      // Ir direto para confirmação
      handleSelectUniversity(userUniversity);
    } else {
      // Se não é aluno matriculado, mostrar seleção de universidade
      setShowUniversitySelection(true);
    }
  };

  // Selecionar universidade
  const handleSelectUniversity = async (university: any) => {
    setSelectedUniversity(university);
    setShowUniversitySelection(false);

    try {
      // Buscar dados de confirmação da universidade
      const confirmationData = await TuitionRewardsService.getUniversityConfirmationData(university.id);
      setConfirmationData(confirmationData);
      setShowConfirmation(true);
    } catch (error: any) {
      console.error('Erro ao buscar dados da universidade:', error);
      setError(error.message || 'Failed to fetch university data');
    }
  };

  // Resgatar desconto de tuition
  const handleRedeemTuitionDiscount = async () => {
    if (!user?.id || !selectedUniversity) {
      setError('Missing required data');
      return;
    }

    // Verificar se é resgate customizado ou pré-definido
    if (isCustomRedemption) {
      if (!customCoinsAmount || customCoinsAmount < 10) {
        setError('Invalid custom coins amount');
        return;
      }
    } else {
      if (!selectedDiscount) {
        setError('Missing discount data');
        return;
      }
    }

    setRedeemingTuition(isCustomRedemption ? 'custom' : selectedDiscount?.id || '');
    setError(null);
    setSuccessMessage(null);

    try {
      
      if (isCustomRedemption) {
        // Resgate customizado
        await TuitionRewardsService.redeemCustomTuitionDiscount(
          user.id,
          selectedUniversity.id,
          customCoinsAmount
        );
      } else {
        // Resgate pré-definido
        await TuitionRewardsService.redeemTuitionDiscount(
          user.id,
          selectedUniversity.id,
          selectedDiscount!.id
        );
      }

      // Atualizar créditos localmente
      const coinsToDeduct = isCustomRedemption ? customCoinsAmount : selectedDiscount!.cost_coins;
      setCredits(prev => prev ? {
        ...prev,
        balance: prev.balance - coinsToDeduct,
        total_spent: prev.total_spent + coinsToDeduct
      } : null);

      // Recarregar apenas os dados necessários
      await refreshAfterRedemption();

      // Mostrar mensagem de sucesso
      const isEnrolledAtSelectedUniversity = isEnrolledStudent && userUniversity && selectedUniversity.id === userUniversity.id;
      const discountAmount = isCustomRedemption ? customDiscountAmount : selectedDiscount!.discount_amount;
      
      const successMessageText = isCustomRedemption
        ? isEnrolledAtSelectedUniversity
          ? `🎓 ${t('matriculaRewards.customRedemption.customRedemptionSuccessEnrolled', { amount: `$${discountAmount}`, university: selectedUniversity.name })}`
          : t('matriculaRewards.customRedemption.customRedemptionSuccess', { amount: `$${discountAmount}`, university: selectedUniversity.name })
        : isEnrolledAtSelectedUniversity
          ? `🎓 Successfully redeemed $${discountAmount} tuition discount for your enrolled university: ${selectedUniversity.name}!`
          : `Successfully redeemed $${discountAmount} tuition discount for ${selectedUniversity.name}!`;
      
      setSuccessMessage(successMessageText);

      // Limpar seleções
      setSelectedDiscount(null);
      setSelectedUniversity(null);
      setShowConfirmation(false);
      setConfirmationData(null);
      setIsCustomRedemption(false);
      setCustomCoinsAmount(0);
      setCustomDiscountAmount(0);

      // Limpar mensagem de sucesso após 5 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);

    } catch (error: any) {
      console.error('Erro ao resgatar desconto de tuition:', error);
      setError(error.message || 'Failed to redeem tuition discount');
    } finally {
      setRedeemingTuition(null);
    }
  };

  // Função para recarregar dados após resgate (sem recarregar tudo)
  const refreshAfterRedemption = async () => {
    if (!user?.id) return;

    try {
      // Recarregar apenas histórico de resgates de tuition
      const redemptions = await TuitionRewardsService.getUserTuitionRedemptions(user.id);
      setTuitionRedemptions(redemptions);

      // Recarregar apenas histórico de transações
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('matriculacoin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!transactionsError) {
        setTransactions(transactionsData || []);
      }
    } catch (error) {
      console.error('Erro ao recarregar dados após resgate:', error);
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };




  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">{t('matriculaRewards.rewardsStore.loadingRewardsStore')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Gift className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-slate-900 font-medium">{t('rewardsStore.errorLoadingRewardsStore')}</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button 
            onClick={loadStoreData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('rewardsStore.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <Link 
              to="/student/dashboard/rewards"
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('matriculaRewards.rewardsStore.backToRewards')}</span>
            </Link>
          </div>

          {/* Balance Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{t('matriculaRewards.rewardsStore.title')}</h1>
                <p className="text-slate-600 text-sm sm:text-base lg:text-lg">{t('matriculaRewards.rewardsStore.subtitle')}</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">
                  {credits?.balance || 0}
                </div>
                <div className="text-sm sm:text-base lg:text-lg font-medium text-slate-600">
                  {t('matriculaRewards.rewardsStore.matriculaCoinsAvailable')}
                </div>
              </div>
            </div>
            
            {/* Mensagem para alunos matriculados */}
            {isEnrolledStudent && userUniversity && (
              <div className="mt-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
                <div className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  <span>
                    <strong>{t('matriculaRewards.rewardsStore.enrolledStudent')}</strong> {t('matriculaRewards.rewardsStore.enrolledStudentMessage')} <strong>{userUniversity.name}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              {successMessage}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('store')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'store'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Gift className="h-4 w-4" />
                <span>{t('matriculaRewards.rewardsStore.store')}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <History className="h-4 w-4" />
                <span>{t('matriculaRewards.rewardsStore.history')}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Store Tab */}
        {activeTab === 'store' && (
          <>
            {/* Quick Custom Redemption */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">{t('matriculaRewards.rewardsStore.customTuitionDiscount')}</h3>
                  <p className="text-slate-600 text-xs sm:text-sm">{t('matriculaRewards.rewardsStore.redeemAnyAmount')}</p>
                </div>
                <div className="flex items-center w-full sm:w-auto">
                  <button
                    onClick={handleCustomRedemption}
                    disabled={!credits || credits.balance < 10}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                      credits && credits.balance >= 10
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {t('matriculaRewards.rewardsStore.createCustom')}
                  </button>
                </div>
              </div>
            </div>

            {/* Tuition Discounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {tuitionDiscounts.map((discount) => (
                <div key={discount.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  {/* Discount Image */}
                  <div className="h-40 sm:h-48 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center relative">
                    <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-blue-500" />
                    {discount.cost_coins <= (credits?.balance || 0) && (
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                        <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          {t('matriculaRewards.rewardsStore.available')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Discount Content */}
                  <div className="p-4 sm:p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 flex-1 min-w-0">{discount.name}</h3>
                      <div className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded-full flex-shrink-0">
                        <Star className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">{discount.cost_coins}</span>
                      </div>
                    </div>

                    <p className="text-slate-600 text-xs sm:text-sm mb-4">{discount.description}</p>

                    {/* Discount Details */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          ${discount.discount_amount} {t('matriculaRewards.rewardsStore.offTuition')}
                        </span>
                      </div>
                    </div>

                    {/* Redeem Button aligned to bottom across cards */}
                    <div className="mt-auto">
                      <button
                        onClick={() => handleSelectTuitionDiscount(discount)}
                        disabled={!credits || credits.balance < discount.cost_coins || redeemingTuition === discount.id}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                          credits && credits.balance >= discount.cost_coins
                            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {redeemingTuition === discount.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>{t('matriculaRewards.rewardsStore.redeeming')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Gift className="h-4 w-4" />
                            <span>{t('matriculaRewards.rewardsStore.redeemForUniversity')}</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {tuitionDiscounts.length === 0 && (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">{t('matriculaRewards.rewardsStore.noRewardsAvailable')}</p>
                <p className="text-sm text-slate-400">{t('matriculaRewards.rewardsStore.checkBackLater')}</p>
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Tuition Redemptions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <Building className="h-5 w-5 text-green-600" />
                <span>{t('matriculaRewards.rewardsStore.tuitionDiscountHistory')}</span>
              </h2>
              
              {tuitionRedemptions.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {tuitionRedemptions.map((redemption) => (
                    <div key={redemption.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 text-sm sm:text-base truncate">
                            ${redemption.discount_amount} - {redemption.university?.name || 'Unknown University'}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500">
                            {redemption.university?.location && `${redemption.university.location} • `}
                            Redeemed on {formatDate(redemption.redeemed_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-4 sm:flex-shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="font-medium text-slate-900 text-sm sm:text-base">{redemption.cost_coins_paid} coins</div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                            redemption.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            redemption.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            redemption.status === 'expired' ? 'bg-red-100 text-red-800' :
                            redemption.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {redemption.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">{t('matriculaRewards.rewardsStore.noTuitionDiscounts')}</p>
                  <p className="text-sm text-slate-400">{t('matriculaRewards.rewardsStore.redeemTuitionDiscounts')}</p>
                </div>
              )}
            </div>


            {/* Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <History className="h-5 w-5 text-green-600" />
                <span>{t('matriculaRewards.rewardsStore.transactionHistory')}</span>
              </h2>
              
              {transactions.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          transaction.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.type === 'earned' ? (
                            <Zap className="h-5 w-5 text-green-600" />
                          ) : (
                            <ShoppingCart className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 text-sm sm:text-base truncate">{transaction.description}</h3>
                          <p className="text-xs sm:text-sm text-slate-500">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className={`font-medium text-sm sm:text-base ${
                          transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'earned' ? '+' : '-'}{transaction.amount} coins
                        </div>
                        <div className="text-xs text-slate-500">
                          Balance: {transaction.balance_after}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">{t('matriculaRewards.rewardsStore.noTransactions')}</p>
                  <p className="text-sm text-slate-400">{t('matriculaRewards.rewardsStore.transactionHistoryMessage')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* University Selection Modal */}
      {showUniversitySelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex-1">
                  {t('matriculaRewards.rewardsStore.selectUniversity')}
                </h2>
                <button
                  onClick={() => setShowUniversitySelection(false)}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  title={t('matriculaRewards.rewardsStore.closeModal')}
                >
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                {t('matriculaRewards.rewardsStore.chooseUniversity')} ${selectedDiscount?.discount_amount}
              </p>
              
              {/* Mensagem para alunos matriculados */}
              {isEnrolledStudent && userUniversity && (
                <div className="mt-3 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs sm:text-sm">
                  <div className="flex items-start">
                    <Info className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>{t('matriculaRewards.rewardsStore.noteEnrolled')}</strong> {t('matriculaRewards.rewardsStore.youAreEnrolled')} <strong>{userUniversity.name}</strong>. 
                      {t('matriculaRewards.rewardsStore.differentUniversity')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 max-h-[calc(95vh-180px)] sm:max-h-[500px] overflow-y-auto flex-1">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchUniversities}
                    onChange={(e) => handleSearchUniversities(e.target.value)}
                    placeholder={t('matriculaRewards.rewardsStore.searchUniversitiesPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Informação sobre universidades não participantes */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">{t('matriculaRewards.rewardsStore.importantInformation')}</p>
                      <p>
                        {t('matriculaRewards.rewardsStore.onlyParticipatingUniversities')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Universities List */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredUniversities
                  .slice((currentPage - 1) * universitiesPerPage, currentPage * universitiesPerPage)
                  .map((university) => (
                  <button
                    key={university.id}
                    onClick={() => handleSelectUniversity(university)}
                    className="w-full p-3 sm:p-4 text-left border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 text-sm sm:text-base truncate">{university.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600 mt-1">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{university.location}</span>
                          </div>
                          {university.established_year && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>Est. {university.established_year}</span>
                            </div>
                          )}
                          {university.student_count && (
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span>{university.student_count.toLocaleString()} students</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {university.website && (
                          <a
                            href={university.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination Controls for Modal */}
              {filteredUniversities.length > universitiesPerPage && (
                <div className="mt-6 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('matriculaRewards.rewardsStore.previous')}
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.ceil(filteredUniversities.length / universitiesPerPage) }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === i + 1
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-500 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUniversities.length / universitiesPerPage)))}
                    disabled={currentPage === Math.ceil(filteredUniversities.length / universitiesPerPage)}
                    className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('matriculaRewards.rewardsStore.next')}
                  </button>
                </div>
              )}

              {filteredUniversities.length === 0 && (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">{t('matriculaRewards.rewardsStore.noUniversitiesFound')}</p>
                  <p className="text-sm text-slate-400">{t('matriculaRewards.rewardsStore.adjustSearchTerms')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Redemption Modal */}
      {showCustomRedemption && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex-1">{t('matriculaRewards.rewardsStore.customTuitionDiscountModal')}</h2>
                <button
                  onClick={() => {
                    setShowCustomRedemption(false);
                    setCustomCoinsAmount(0);
                    setCustomDiscountAmount(0);
                    setIsCustomRedemption(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                >
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('matriculaRewards.rewardsStore.amountOfCoinsToRedeem')}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max={Math.min(10000, credits?.balance || 0)}
                    value={customCoinsAmount || ''}
                    onChange={(e) => handleCustomCoinsChange(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder={t('matriculaRewards.rewardsStore.enterCoinsAmount')}
                  />

                </div>

                {customCoinsAmount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                      <div>
                        <div className="text-xs sm:text-sm text-slate-600">{t('matriculaRewards.rewardsStore.tuitionDiscountPreview')}</div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">${customDiscountAmount}</div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xs sm:text-sm text-slate-600">{t('matriculaRewards.rewardsStore.costPreview')}</div>
                        <div className="text-base sm:text-lg font-semibold text-slate-900">{customCoinsAmount} coins</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCustomRedemption(false);
                      setCustomCoinsAmount(0);
                      setCustomDiscountAmount(0);
                      setIsCustomRedemption(false);
                    }}
                    className="flex-1 px-4 py-2.5 sm:py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm sm:text-base"
                  >
                    {t('matriculaRewards.rewardsStore.cancel')}
                  </button>
                  <button
                    onClick={handleConfirmCustomRedemption}
                    disabled={!customCoinsAmount || customCoinsAmount < 10 || customCoinsAmount > (credits?.balance || 0)}
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 text-sm sm:text-base"
                  >
                    {t('matriculaRewards.rewardsStore.continue')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* University Confirmation Modal */}
      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[95vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 flex-1">{t('matriculaRewards.rewardsStore.confirmUniversity')}</h2>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmationData(null);
                    setSelectedUniversity(null);
                    setSelectedDiscount(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                >
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              {/* University Info */}
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{confirmationData.name}</h3>
                    <p className="text-slate-600 text-xs sm:text-sm flex items-center">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{confirmationData.location}</span>
                    </p>
                  </div>
                </div>
                
                {confirmationData.website && (
                  <div className="text-xs sm:text-sm text-slate-600 break-words">
                    <span className="font-medium">{t('matriculaRewards.rewardsStore.website')}</span> {confirmationData.website}
                  </div>
                )}
              </div>

              {/* Discount Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                  <div>
                    <div className="text-xs sm:text-sm text-slate-600">
                      {isCustomRedemption ? t('matriculaRewards.rewardsStore.customTuitionDiscount') : 'Tuition Discount'}
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      ${isCustomRedemption ? customDiscountAmount : selectedDiscount?.discount_amount}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs sm:text-sm text-slate-600">{t('matriculaRewards.rewardsStore.costPreview')}</div>
                    <div className="text-base sm:text-lg font-semibold text-slate-900">
                      {isCustomRedemption ? customCoinsAmount : selectedDiscount?.cost_coins} coins
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmationData(null);
                    setSelectedUniversity(null);
                    setSelectedDiscount(null);
                  }}
                  className="flex-1 px-4 py-2.5 sm:py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm sm:text-base"
                >
                  {t('matriculaRewards.rewardsStore.cancel')}
                </button>
                <button
                  onClick={handleRedeemTuitionDiscount}
                  disabled={redeemingTuition === selectedDiscount?.id || redeemingTuition === 'custom'}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 text-sm sm:text-base"
                >
                  {redeemingTuition === selectedDiscount?.id || redeemingTuition === 'custom' ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>{t('matriculaRewards.rewardsStore.processing')}</span>
                    </div>
                  ) : (
                    t('matriculaRewards.rewardsStore.confirmAndRedeem')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardsStore; 