import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Share2, 
  Copy, 
  CheckCircle, 
  TrendingUp, 
  DollarSign,
  Users,
  Clock,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { 
  AffiliateCode, 
  AffiliateReferral, 
  MatriculacoinCredits, 
  MatriculacoinTransaction,
  AffiliateStats 
} from '../../types';

const MatriculaRewards: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [affiliateCode, setAffiliateCode] = useState<AffiliateCode | null>(null);
  const [credits, setCredits] = useState<MatriculacoinCredits | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [transactions, setTransactions] = useState<MatriculacoinTransaction[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadAffiliateData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadAffiliateData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      console.log('Loading affiliate data for user:', user.id);
      
      // Carrega código de afiliado
      const { data: affiliateCodeData, error: affiliateError } = await supabase
        .from('affiliate_codes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Affiliate code data:', affiliateCodeData, 'Error:', affiliateError);

      if (affiliateError && affiliateError.code !== 'PGRST116') {
        console.error('Erro ao carregar código de afiliado:', affiliateError);
      }

      // Se não existe código, cria um
      if (!affiliateCodeData) {
        console.log('Creating new affiliate code for user:', user.id);
        const { data: newCode, error: createError } = await supabase
          .rpc('create_affiliate_code_for_user', { user_id_param: user.id });
        
        console.log('New code result:', newCode, 'Error:', createError);
        
        if (createError) {
          console.error('Erro ao criar código de afiliado:', createError);
          setError('Failed to create affiliate code');
        } else {
          // Recarrega o código criado
          const { data: reloadedCode } = await supabase
            .from('affiliate_codes')
            .select('*')
            .eq('user_id', user.id)
            .single();
          setAffiliateCode(reloadedCode);
        }
      } else {
        setAffiliateCode(affiliateCodeData);
      }

      // Carrega créditos
      const { data: creditsData, error: creditsError } = await supabase
        .from('matriculacoin_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Credits data:', creditsData, 'Error:', creditsError);

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Erro ao carregar créditos:', creditsError);
      }

      if (!creditsData) {
        // Cria registro de créditos se não existir
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

      // Carrega indicações
      const { data: referralsData, error: referralsError } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (referralsError) {
        console.error('Erro ao carregar indicações:', referralsError);
      } else {
        setReferrals(referralsData || []);
      }

      // Carrega transações
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('matriculacoin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactionsError) {
        console.error('Erro ao carregar transações:', transactionsError);
      } else {
        setTransactions(transactionsData || []);
      }

      // Calcula estatísticas
      const totalReferrals = referralsData?.length || 0;
      const totalEarnings = referralsData?.reduce((sum, ref) => sum + (ref.credits_earned || 0), 0) || 0;
      const currentBalance = creditsData?.balance || 0;

      setStats({
        totalReferrals,
        totalEarnings,
        currentBalance,
        recentTransactions: transactionsData || [],
        recentReferrals: referralsData || []
      });

    } catch (error) {
      console.error('Erro ao carregar dados de afiliado:', error);
      setError('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const getShareUrl = (code: string) => {
    return `${window.location.origin}?ref=${code}`;
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
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Loading Matricula Rewards...</p>
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
          <p className="text-slate-900 font-medium">Error loading Matricula Rewards</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button 
            onClick={loadAffiliateData}
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
        {/* MatriculaCoin Header - Valor à esquerda, Moeda à direita */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8 mb-6">
            {/* Balance Display - Agora à esquerda */}
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 mb-2">
                {formatCurrency(credits?.balance || 0)}
              </div>
              <div className="text-lg font-medium text-slate-600">
                MatriculaCoins
              </div>
            </div>

            {/* 3D Coin Animation with Favicon - Agora à direita */}
            <div className="relative">
              <div className="w-32 h-32 flex items-center justify-center">
                <div className="coin-simple">
                  <img 
                    src="/favicon-branco.png" 
                    alt="MatriculaCoin" 
                    className="w-20 h-20 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Page Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Matricula Rewards</h1>
            <p className="text-slate-600 text-lg">Earn credits by referring friends to MatriculaUSA</p>
          </div>
        </div>

        {/* Stats Cards - Removido "Current Balance", apenas 2 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
          {/* Total Referrals */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Referrals</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats?.totalReferrals || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Earnings</p>
                <p className="text-3xl font-bold text-slate-900">
                  {formatCurrency(stats?.totalEarnings || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Affiliate Code Section */}
        {affiliateCode && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Your Affiliate Code</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">Earn $50 per referral</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Share this code with friends</p>
                  <div className="flex items-center space-x-3">
                    <code className="text-2xl font-mono font-bold text-blue-600 bg-white px-4 py-2 rounded-lg border">
                      {affiliateCode.code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(affiliateCode.code)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <button
                    onClick={() => window.open(getShareUrl(affiliateCode.code), '_blank')}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Referrals */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Referrals</h2>
            {referrals.length > 0 ? (
              <div className="space-y-3">
                {referrals.slice(0, 5).map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Referral #{referral.id.slice(0, 8)}</p>
                        <p className="text-sm text-slate-500">{formatDate(referral.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{formatCurrency(referral.credits_earned)}</p>
                      <p className="text-xs text-slate-500">{referral.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No referrals yet</p>
                <p className="text-sm text-slate-400">Share your code to start earning!</p>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h2>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'earned' ? 'bg-green-100' : 
                        transaction.type === 'spent' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        {transaction.type === 'earned' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : transaction.type === 'spent' ? (
                          <DollarSign className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{transaction.description || transaction.type}</p>
                        <p className="text-sm text-slate-500">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type === 'earned' ? 'text-green-600' : 
                        transaction.type === 'spent' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {transaction.type === 'earned' ? '+' : transaction.type === 'spent' ? '-' : ''}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-slate-500">Balance: {formatCurrency(transaction.balance_after)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No transactions yet</p>
                <p className="text-sm text-slate-400">Your transaction history will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Share Your Code</h3>
              <p className="text-slate-600 text-sm">Share your unique affiliate code with friends and family</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">They Sign Up</h3>
              <p className="text-slate-600 text-sm">When they use your code and make a payment, you earn credits</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Earn Rewards</h3>
              <p className="text-slate-600 text-sm">Use your earned credits for discounts on future payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for Simple Coin Animation with Favicon */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .coin-simple {
            width: 128px;
            height: 128px;
            background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%);
            border-radius: 50%;
            border: 4px solid #1e3a8a;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 2px 4px rgba(255, 255, 255, 0.3),
              inset 0 -2px 4px rgba(0, 0, 0, 0.2);
            animation: coin-float 3s ease-in-out infinite;
          }

          @keyframes coin-float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-10px) rotate(5deg);
            }
          }

          .coin-simple:hover {
            animation-play-state: paused;
            transform: scale(1.05);
            transition: transform 0.3s ease;
          }
        `
      }} />
    </div>
  );
};

export default MatriculaRewards; 