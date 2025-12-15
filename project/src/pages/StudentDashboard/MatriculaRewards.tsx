import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Copy, 
  CheckCircle, 
  TrendingUp, 
  DollarSign,
  Users,
  Clock,
  ArrowUpRight,
  Mail,
  GraduationCap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { 
  AffiliateStats 
} from '../../types';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Separator } from '../../components/ui/Separator';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/Alert';
import WhatsAppIcon from '../../components/icons/WhatsApp';
import { 
  useAffiliateCodeQuery,
  useMatriculacoinCreditsQuery,
  useAffiliateReferralsQuery,
  useMatriculacoinTransactionsQuery,
  useParticipatingUniversitiesQuery
} from '../../hooks/useStudentDashboardQueries';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateStudentDashboardRewards } from '../../lib/queryKeys';

const MatriculaRewards: React.FC = () => {
  const { t } = useTranslation();
  
  // Logos oficiais em SVG simplificados (inline), sem dependências externas
  const FacebookLogo = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden>
      <path d="M22 12.06C22 6.48 17.52 2 11.94 2 6.36 2 1.88 6.48 1.88 12.06c0 4.99 3.65 9.14 8.43 9.94v-7.03H7.9v-2.9h2.41V9.83c0-2.38 1.41-3.69 3.57-3.69 1.03 0 2.11.18 2.11.18v2.32h-1.19c-1.17 0-1.53.73-1.53 1.48v1.77h2.61l-.42 2.9h-2.19v7.03c4.78-.8 8.43-4.95 8.43-9.94z"/>
    </svg>
  );
  const TwitterLogo = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden>
      <path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.28 4.28 0 0 0 1.88-2.36 8.57 8.57 0 0 1-2.71 1.04 4.27 4.27 0 0 0-7.27 3.89A12.12 12.12 0 0 1 3.15 4.9a4.26 4.26 0 0 0 1.32 5.7c-.65-.02-1.26-.2-1.8-.5v.05a4.27 4.27 0 0 0 3.43 4.18c-.31.08-.64.12-.98.12-.24 0-.48-.02-.7-.07a4.27 4.27 0 0 0 3.98 2.96A8.56 8.56 0 0 1 2 19.54a12.08 12.08 0 0 0 6.56 1.92c7.88 0 12.2-6.53 12.2-12.2v-.56c.84-.61 1.57-1.36 2.14-2.22-.78.35-1.62.58-2.5.68z"/>
    </svg>
  );
  const LinkedInLogo = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95v5.66H9.37V9h3.4v1.56h.05c.47-.9 1.6-1.85 3.29-1.85 3.52 0 4.17 2.32 4.17 5.34v6.4zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/>
    </svg>
  );
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // React Query hooks com cache
  const { data: affiliateCode, isPending: affiliateCodeLoading } = useAffiliateCodeQuery(user?.id);
  const { data: credits, isPending: creditsLoading } = useMatriculacoinCreditsQuery(user?.id);
  const { data: referrals = [], isPending: referralsLoading } = useAffiliateReferralsQuery(user?.id);
  const { data: transactions = [], isPending: transactionsLoading } = useMatriculacoinTransactionsQuery(user?.id);
  const { data: participatingUniversities = [], isPending: universitiesLoading } = useParticipatingUniversitiesQuery();
  
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [universitiesPerPage] = useState(9); // 3x3 grid
  const [searchTerm, setSearchTerm] = useState('');
  
  // Computed values
  const loading = affiliateCodeLoading || creditsLoading || referralsLoading || transactionsLoading;

  useEffect(() => {
    // Calcula estatísticas quando os dados estiverem disponíveis
    if (credits && referrals) {
      const totalReferrals = referrals.length || 0;
      const totalEarnings = credits.total_earned || 0;
      const currentBalance = credits.balance || 0;

      setStats({
        totalReferrals,
        totalEarnings,
        currentBalance,
        recentTransactions: transactions || [],
        recentReferrals: referrals || []
      });
    }
  }, [credits, referrals, transactions]);

  useEffect(() => {
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm]);

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

  const shareToSocialMedia = async (platform: string, url: string, text: string) => {
    const shareData = {
      title: t('matriculaRewards.title'),
      text: text,
      url: url
    };

    try {
      switch (platform) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
          break;
        case 'email':
          window.open(`mailto:?subject=${encodeURIComponent(t('matriculaRewards.title'))}&body=${encodeURIComponent(text + '\n\n' + url)}`, '_blank');
          break;
        default:
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            await copyToClipboard(url);
          }
      }

      // Registrar o compartilhamento
      if (user?.id && affiliateCode) {
        await supabase
          .from('affiliate_shares')
          .insert([
            {
              user_id: user.id,
              affiliate_code_id: affiliateCode.id,
              platform: platform,
              shared_at: new Date().toISOString()
            }
          ]);
        
        // Invalidar cache de rewards após compartilhamento
        invalidateStudentDashboardRewards(queryClient);
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  // Mantido para referência futura: rastrear cliques em campanhas
  // const trackClick = async () => {
  //   if (user?.id && affiliateCode) {
  //     try {
  //       await supabase
  //         .from('affiliate_clicks')
  //         .insert([
  //           {
  //             user_id: user.id,
  //             affiliate_code_id: affiliateCode.id,
  //             clicked_at: new Date().toISOString()
  //           }
  //         ]);
  //     } catch (error) {
  //       console.error('Erro ao registrar clique:', error);
  //     }
  //   }
  // };

  const formatCoins = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
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
        </div>
      </div>
    );
  }

  const filteredUniversities = participatingUniversities.filter(university => {
    const matchesSearchTerm = !searchTerm || 
      university.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      university.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearchTerm;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Hero / Balance */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10" />
          <div className="relative z-10 grid gap-6 p-6 md:grid-cols-3 md:items-center">
            <div className="md:col-span-2">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{t('matriculaRewards.title')}</h1>
              <p className="text-slate-600 mt-1">{t('matriculaRewards.subtitle')}</p>
              <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl bg-slate-100 px-4 py-2">
                <span className="text-sm font-medium text-slate-600">{t('matriculaRewards.balance')}</span>
                <span className="text-3xl font-extrabold text-slate-900">{formatCoins(credits?.balance || 0)}</span>
                <span className="text-sm text-slate-500">{t('matriculaRewards.coins')}</span>
              </div>
              
              {/* Referral Code - Integrated in Hero */}
              {affiliateCode && (
                <div className="mt-6 max-w-lg">
                  <div className="bg-white rounded-xl border-2 border-blue-200 p-4 shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Gift className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-500 mb-1">Seu código</p>
                          <p className="text-xl font-bold tracking-wide text-slate-900 font-mono break-all">
                            {affiliateCode.code}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(getShareUrl(affiliateCode.code))}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg flex-shrink-0"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden sm:inline text-sm">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span className="hidden sm:inline text-sm">Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Stats */}
              <div className="mt-4 grid grid-cols-2 gap-4 max-w-md">
                <Card className="p-4 gap-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{t('matriculaRewards.totalReferrals')}</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><Users className="h-4 w-4"/></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{stats?.totalReferrals || 0}</div>
                </Card>
                <Card className="p-4 gap-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{t('matriculaRewards.totalEarnings')}</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><TrendingUp className="h-4 w-4"/></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{formatCoins(stats?.totalEarnings || 0)}</div>
                </Card>
              </div>
            </div>
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg ring-4 ring-white/60 flex items-center justify-center">
                <img src="/favicon-branco.png" className="h-14 w-14 object-contain" alt={t('matriculaRewards.coins')} />
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Share Section */}
        {affiliateCode && (
          <Card className="p-6">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Compartilhar com amigos
              </h2>
              <p className="text-slate-600 text-sm">
                {t('matriculaRewards.shareDescription')}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => shareToSocialMedia('whatsapp', getShareUrl(affiliateCode.code), `${t('matriculaRewards.title')} ${t('matriculaRewards.yourCode')} ${affiliateCode.code}! ${t('matriculaRewards.visitStoreDescription')}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-white hover:brightness-95 transition-all"
              >
                <WhatsAppIcon width={16} height={16} className="text-white" />
                <span className="text-sm font-medium">WhatsApp</span>
              </button>
              <button
                onClick={() => shareToSocialMedia('facebook', getShareUrl(affiliateCode.code), `${t('matriculaRewards.title')} ${t('matriculaRewards.yourCode')} ${affiliateCode.code}! ${t('matriculaRewards.visitStoreDescription')}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2 text-white hover:brightness-95 transition-all"
              >
                <FacebookLogo />
                <span className="text-sm font-medium">Facebook</span>
              </button>
              <button
                onClick={() => shareToSocialMedia('twitter', getShareUrl(affiliateCode.code), `${t('matriculaRewards.title')} ${t('matriculaRewards.yourCode')} ${affiliateCode.code}! ${t('matriculaRewards.visitStoreDescription')}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1DA1F2] px-4 py-2 text-white hover:brightness-95 transition-all"
              >
                <TwitterLogo />
                <span className="text-sm font-medium">Twitter</span>
              </button>
              <button
                onClick={() => shareToSocialMedia('email', getShareUrl(affiliateCode.code), `${t('matriculaRewards.title')} ${t('matriculaRewards.yourCode')} ${affiliateCode.code}! ${t('matriculaRewards.visitStoreDescription')}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-white hover:brightness-95 transition-all"
              >
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">Email</span>
              </button>
            </div>
          </Card>
        )}

        {/* CTA Store */}
        <Card className="relative overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-600/90" />
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold mb-2">{t('matriculaRewards.spendYourCoins')}</h3>
                <p className="text-blue-100 text-lg">{t('matriculaRewards.visitStoreDescription')}</p>
              </div>
              <Link 
                to="/student/dashboard/rewards/store" 
                className="inline-flex items-center gap-3 rounded-xl bg-white/20 backdrop-blur-sm px-6 py-4 ring-2 ring-white/30 hover:bg-white/30 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Gift className="h-6 w-6"/>
                <span className="font-semibold text-lg">{t('matriculaRewards.visitRewardsStore')}</span>
                <ArrowUpRight className="h-5 w-5"/>
              </Link>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('matriculaRewards.recentReferrals')}</h2>
            {referrals.length ? (
              <ul className="space-y-3">
                {referrals.slice(0,5).map(referral => (
                  <li key={referral.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600"><Users className="h-4 w-4"/></span>
                      <div>
                        <p className="font-medium text-slate-900">
                          {referral.referred_user?.full_name 
                            ? `${referral.referred_user.full_name} (${referral.referred_user.email})`
                            : t('matriculaRewards.referralNumber', { id: referral.id.slice(0,8) })
                          }
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(referral.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">+{formatCoins(referral.credits_earned)}</p>
                      <p className="text-xs text-slate-500">{referral.status === 'completed' ? t('matriculaRewards.earned') : referral.status === 'cancelled' ? t('matriculaRewards.spent') : t('matriculaRewards.pending')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert className="py-4">
                <AlertTitle>{t('matriculaRewards.noReferralsYet')}</AlertTitle>
                <AlertDescription>{t('matriculaRewards.shareCodeToEarn')}</AlertDescription>
              </Alert>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('matriculaRewards.recentTransactions')}</h2>
            {transactions.length ? (
              <ul className="space-y-3">
                {transactions.slice(0,5).map(tx => (
                  <li key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${tx.type==='earned'?'bg-green-100 text-green-600':tx.type==='spent'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-600'}`}>
                        {tx.type==='earned'?<TrendingUp className="h-4 w-4"/>:tx.type==='spent'?<DollarSign className="h-4 w-4"/>:<Clock className="h-4 w-4"/>}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{tx.description || (tx.type === 'earned' ? t('matriculaRewards.earned') : tx.type === 'spent' ? t('matriculaRewards.spent') : t('matriculaRewards.pending'))}</p>
                        <p className="text-xs text-slate-500">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`${tx.type==='earned'?'text-green-600':tx.type==='spent'?'text-red-600':'text-yellow-600'} font-semibold`}>{tx.type==='earned'?'+':tx.type==='spent'?'-':''}{formatCoins(tx.amount)}</p>
                      <p className="text-xs text-slate-500">Balance: {formatCoins(tx.balance_after)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert className="py-4">
                <AlertTitle>{t('matriculaRewards.noTransactionsYet')}</AlertTitle>
                <AlertDescription>{t('matriculaRewards.transactionHistory')}</AlertDescription>
              </Alert>
            )}
          </Card>
        </div>

        {/* How it works */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('matriculaRewards.howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">1</div>
              <h3 className="font-semibold text-slate-900">{t('matriculaRewards.step1Title')}</h3>
              <p className="text-sm text-slate-600 mt-1">{t('matriculaRewards.step1Description')}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">2</div>
              <h3 className="font-semibold text-slate-900">{t('matriculaRewards.step2Title')}</h3>
              <p className="text-sm text-slate-600 mt-1">{t('matriculaRewards.step2Description')}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">3</div>
              <h3 className="font-semibold text-slate-900">{t('matriculaRewards.step3Title')}</h3>
              <p className="text-sm text-slate-600 mt-1">{t('matriculaRewards.step3Description')}</p>
            </div>
          </div>
        </Card>

        {/* Participating Universities */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('matriculaRewards.participatingUniversities')}</h2>
          <p className="text-slate-600 mb-6">
            {t('matriculaRewards.universitiesDescription')}
          </p>
          
          {/* Search Component */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t('matriculaRewards.searchUniversities')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {universitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-slate-600">{t('matriculaRewards.loadingUniversities')}</span>
            </div>
          ) : filteredUniversities.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUniversities
                  .slice((currentPage - 1) * universitiesPerPage, currentPage * universitiesPerPage)
                  .map((university) => (
                  <div key={university.id} className="rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                        {university.logo_url ? (
                          <img 
                            src={university.logo_url} 
                            alt={`${university.name} logo`}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <GraduationCap className="h-6 w-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{university.name}</h3>
                        <p className="text-sm text-slate-600 truncate">{university.location}</p>
                        {university.type && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            {university.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {filteredUniversities.length > universitiesPerPage && (
                <div className="mt-8 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('matriculaRewards.previous')}
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
                    {t('matriculaRewards.next')}
                  </button>
                </div>
              )}
              
              {/* Page Info */}
              {filteredUniversities.length > universitiesPerPage && (
                <div className="text-center text-sm text-slate-500 mt-2">
                  {t('matriculaRewards.showingResults', { 
                  start: ((currentPage - 1) * universitiesPerPage) + 1, 
                  end: Math.min(currentPage * universitiesPerPage, filteredUniversities.length), 
                  total: filteredUniversities.length 
                })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <GraduationCap className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('matriculaRewards.noParticipatingUniversities')}</h3>
              <p className="text-slate-600">
                {t('matriculaRewards.universitiesNotParticipating')}
              </p>
            </div>
          )}
          
          {filteredUniversities.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 flex-shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">{t('matriculaRewards.importantInformation')}</h4>
                  <p className="text-sm text-blue-800">
                    {t('matriculaRewards.importantInfoText')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Coin styling kept for subtle animation */}
      <style dangerouslySetInnerHTML={{__html:`
        .coin-simple{display:none}
      `}} />
    </div>
  );
};

export default MatriculaRewards; 