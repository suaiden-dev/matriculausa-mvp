import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  ShoppingCart, 
  CheckCircle, 
  AlertCircle,
  Star,
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  ArrowLeft,
  History,
  Zap,
  Trophy,
  Building,
  Search,
  MapPin,
  Globe,
  Calendar,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { MatriculacoinCredits, MatriculacoinTransaction, TuitionDiscount, TuitionRedemption, UniversityConfirmationData } from '../../types';
import { TuitionRewardsService } from '../../services/TuitionRewardsService';
import { Link } from 'react-router-dom';

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'discount_fixed' | 'discount_percentage' | 'premium_access';
  value: number;
  duration?: number;
  is_active: boolean;
  image_url?: string;
}

interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  cost_paid: number;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  redeemed_at: string;
  expires_at?: string;
  used_at?: string;
  reward: Reward;
}

const RewardsStore: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<MatriculacoinCredits | null>(null);
  const [activeTab, setActiveTab] = useState<'store' | 'history'>('store');
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
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

      // Carregar histórico de resgates
      const { data: redemptionsData, error: redemptionsError } = await supabase
        .from('reward_redemptions')
        .select(`
          *,
          reward:rewards!reward_redemptions_reward_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('redeemed_at', { ascending: false });

      if (redemptionsError) {
        console.error('Erro ao carregar resgates:', redemptionsError);
      } else {
        setRedemptions(redemptionsData || []);
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
  const handleSearchUniversities = async (searchTerm: string) => {
    setSearchUniversities(searchTerm);
    
    if (searchTerm.length < 2) {
      setFilteredUniversities(universities);
      return;
    }

    try {
      const results = await TuitionRewardsService.searchUniversities(searchTerm);
      setFilteredUniversities(results);
    } catch (error: any) {
      console.error('Erro ao buscar universidades:', error);
      setError(error.message || 'Failed to search universities');
    }
  };

  // Selecionar desconto de tuition
  const handleSelectTuitionDiscount = async (discount: TuitionDiscount) => {
    setSelectedDiscount(discount);
    
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
    if (!user?.id || !selectedDiscount || !selectedUniversity) {
      setError('Missing required data');
      return;
    }

    setRedeemingTuition(selectedDiscount.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await TuitionRewardsService.redeemTuitionDiscount(
        user.id,
        selectedUniversity.id,
        selectedDiscount.id
      );

      // Atualizar créditos localmente
      setCredits(prev => prev ? {
        ...prev,
        balance: prev.balance - selectedDiscount.cost_coins,
        total_spent: prev.total_spent + selectedDiscount.cost_coins
      } : null);

      // Recarregar apenas os dados necessários
      await refreshAfterRedemption();

      // Mostrar mensagem de sucesso
      const isEnrolledAtSelectedUniversity = isEnrolledStudent && userUniversity && selectedUniversity.id === userUniversity.id;
      const successMessageText = isEnrolledAtSelectedUniversity
        ? `🎓 Successfully redeemed ${selectedDiscount.discount_amount} tuition discount for your enrolled university: ${selectedUniversity.name}!`
        : `Successfully redeemed ${selectedDiscount.discount_amount} tuition discount for ${selectedUniversity.name}!`;
      
      setSuccessMessage(successMessageText);

      // Limpar seleções
      setSelectedDiscount(null);
      setSelectedUniversity(null);
      setShowConfirmation(false);
      setConfirmationData(null);

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


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading Rewards Store...</p>
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
          <p className="text-slate-900 font-medium">Error loading Rewards Store</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button 
            onClick={loadStoreData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/student/dashboard/rewards"
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Rewards</span>
            </Link>
          </div>

          <div className="flex items-center justify-center space-x-8 mb-6">
            {/* Balance Display */}
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {credits?.balance || 0}
              </div>
              <div className="text-lg font-medium text-slate-600">
                Matricula Coins Available
              </div>
            </div>

            {/* Store Icon */}
            <div className="relative">
              <div className="w-32 h-32 flex items-center justify-center">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-8 shadow-lg">
                  <ShoppingCart className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Rewards Store</h1>
            <p className="text-slate-600 text-lg">Redeem your Matricula Coins for exclusive rewards</p>
            
            {/* Mensagem para alunos matriculados */}
            {isEnrolledStudent && userUniversity && (
              <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl text-sm max-w-md mx-auto">
                <div className="flex items-center justify-center">
                  <Info className="h-4 w-4 mr-2" />
                  <span>
                    <strong>Enrolled Student:</strong> Your tuition discounts will automatically apply to <strong>{userUniversity.name}</strong>
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
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab('store')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'store'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Gift className="h-4 w-4" />
                <span>Store</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span>History</span>
              </div>
            </button>
          </div>
        </div>

        {/* Store Tab */}
        {activeTab === 'store' && (
          <>
            {/* Tuition Discounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tuitionDiscounts.map((discount) => (
                <div key={discount.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  {/* Discount Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center relative">
                    <Gift className="h-16 w-16 text-blue-500" />
                    {discount.cost_coins <= (credits?.balance || 0) && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Available
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Discount Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{discount.name}</h3>
                      <div className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded-full">
                        <Star className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">{discount.cost_coins}</span>
                      </div>
                    </div>

                    <p className="text-slate-600 text-sm mb-4">{discount.description}</p>

                    {/* Discount Details */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600">
                          ${discount.discount_amount} off tuition
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
                            <span>Redeeming...</span>
                          </div>
                        ) : credits && credits.balance >= discount.cost_coins ? (
                          <div className="flex items-center justify-center space-x-2">
                            <Gift className="h-4 w-4" />
                            <span>Redeem for University</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>Need {discount.cost_coins - (credits?.balance || 0)} more coins</span>
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
                <p className="text-slate-500">No rewards available at the moment</p>
                <p className="text-sm text-slate-400">Check back later for new rewards!</p>
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Tuition Redemptions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <Building className="h-5 w-5 text-green-600" />
                <span>Tuition Discount History</span>
              </h2>
              
              {tuitionRedemptions.length > 0 ? (
                <div className="space-y-4">
                  {tuitionRedemptions.map((redemption) => (
                    <div key={redemption.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Building className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">
                            ${redemption.discount_amount} - {redemption.university?.name || 'Unknown University'}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {redemption.university?.location && `${redemption.university.location} • `}
                            Redeemed on {formatDate(redemption.redeemed_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium text-slate-900">{redemption.cost_coins_paid} coins</div>
                          <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(redemption.status)}`}>
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
                  <p className="text-slate-500">No tuition discounts redeemed yet</p>
                  <p className="text-sm text-slate-400">Redeem tuition discounts to see your history here!</p>
                </div>
              )}
            </div>

            {/* Regular Redemptions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-blue-600" />
                <span>Reward Redemptions</span>
              </h2>
              
              {redemptions.length > 0 ? (
                <div className="space-y-4">
                  {redemptions.map((redemption) => (
                    <div key={redemption.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Gift className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{redemption.reward?.name}</h3>
                          <p className="text-sm text-slate-500">
                            Redeemed on {formatDate(redemption.redeemed_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium text-slate-900">{redemption.cost_paid} coins</div>
                          <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(redemption.status)}`}>
                            {redemption.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No regular redemptions yet</p>
                  <p className="text-sm text-slate-400">Start redeeming rewards to see your history here!</p>
                </div>
              )}
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <History className="h-5 w-5 text-green-600" />
                <span>Transaction History</span>
              </h2>
              
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.type === 'earned' ? (
                            <Zap className="h-5 w-5 text-green-600" />
                          ) : (
                            <ShoppingCart className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{transaction.description}</h3>
                          <p className="text-sm text-slate-500">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
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
                  <p className="text-slate-500">No transactions yet</p>
                  <p className="text-sm text-slate-400">Your transaction history will appear here!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* University Selection Modal */}
      {showUniversitySelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Select Your University
                </h2>
                <button
                  onClick={() => setShowUniversitySelection(false)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Close modal"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <p className="text-slate-600 mt-2">
                Choose the university where you want to apply the ${selectedDiscount?.discount_amount} tuition discount
              </p>
              
              {/* Mensagem para alunos matriculados */}
              {isEnrolledStudent && userUniversity && (
                <div className="mt-3 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm">
                  <div className="flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    <span>
                      <strong>Note:</strong> You're enrolled at <strong>{userUniversity.name}</strong>. 
                      If you select a different university, the discount will apply there instead.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchUniversities}
                    onChange={(e) => handleSearchUniversities(e.target.value)}
                    placeholder="Search universities by name or location..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Informação sobre universidades não participantes */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Important Information:</p>
                      <p>
                        Only universities that have opted to participate in the Matricula Rewards program are shown here. 
                        If your university is not listed, it means they haven't joined the program yet. 
                        You can still earn coins by referring friends, but you won't be able to redeem them for tuition discounts 
                        at your university until they participate. Consider reaching out to your university's admissions office 
                        to encourage them to join!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Universities List */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {filteredUniversities.map((university) => (
                  <button
                    key={university.id}
                    onClick={() => handleSelectUniversity(university)}
                    className="w-full p-4 text-left border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{university.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{university.location}</span>
                          </div>
                          {university.established_year && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Est. {university.established_year}</span>
                            </div>
                          )}
                          {university.student_count && (
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{university.student_count.toLocaleString()} students</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
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

              {filteredUniversities.length === 0 && (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No universities found</p>
                  <p className="text-sm text-slate-400">Try adjusting your search terms</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* University Confirmation Modal */}
      {showConfirmation && confirmationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Confirm University
                </h2>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmationData(null);
                    setSelectedUniversity(null);
                    setSelectedDiscount(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                  title="Close modal"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <p className="text-slate-600 mt-2">
                {isEnrolledStudent && userUniversity && selectedUniversity?.id === userUniversity.id
                  ? `This is your enrolled university: ${userUniversity.name}`
                  : 'Please verify this is your university before proceeding'
                }
              </p>
              
              {/* Mensagem especial para alunos matriculados */}
              {isEnrolledStudent && userUniversity && selectedUniversity?.id === userUniversity.id && (
                <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>✅ You're enrolled at this university - tuition discount will be automatically applied!</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              {/* University Info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{confirmationData.name}</h3>
                    <p className="text-sm text-slate-600">{confirmationData.location}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {confirmationData.website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Website: {confirmationData.website}</span>
                    </div>
                  )}
                  {confirmationData.established_year && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Established: {confirmationData.established_year}</span>
                    </div>
                  )}
                  {confirmationData.student_count && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{confirmationData.student_count.toLocaleString()} students</span>
                    </div>
                  )}
                  {confirmationData.type && (
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Type: {confirmationData.type}</span>
                    </div>
                  )}
                  {confirmationData.campus_size && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Campus: {confirmationData.campus_size}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Discount Info */}
              {selectedDiscount && (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">Tuition Discount</h4>
                      <p className="text-sm text-slate-600">{selectedDiscount.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${selectedDiscount.discount_amount}
                      </div>
                      <div className="text-sm text-slate-600">
                        {selectedDiscount.cost_coins} Matricula Coins
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setConfirmationData(null);
                    setSelectedUniversity(null);
                    setSelectedDiscount(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeemTuitionDiscount}
                  disabled={redeemingTuition === selectedDiscount?.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300"
                >
                  {redeemingTuition === selectedDiscount?.id ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Confirm & Redeem'
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