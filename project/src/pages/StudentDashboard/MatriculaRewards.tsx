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
  GraduationCap,
  Bell,
  ChevronLeft,
  ChevronRight,
  Link2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
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
import NotificationService from '../../services/NotificationService';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // React Query hooks com cache
  const { data: affiliateCode, isPending: affiliateCodeLoading } = useAffiliateCodeQuery(user?.id);
  const { data: credits, isPending: creditsLoading } = useMatriculacoinCreditsQuery(user?.id);
  const { data: referrals = [], isPending: referralsLoading } = useAffiliateReferralsQuery(user?.id);
  const { data: transactions = [], isPending: transactionsLoading } = useMatriculacoinTransactionsQuery(user?.id);
  const { data: participatingUniversities = [], isPending: universitiesLoading } = useParticipatingUniversitiesQuery();
  
  
  const [copied, setCopied] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<Record<string, 'loading' | 'success' | 'none'>>({});
  const [cooldownRemaining, setCooldownRemaining] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [universitiesPerPage] = useState(9); // 3x3 grid
  const [searchTerm, setSearchTerm] = useState('');
  const [referralsPage, setReferralsPage] = useState(1);
  const referralsPerPage = 5;
  
  // Computed values
  const loading = affiliateCodeLoading || creditsLoading || referralsLoading || transactionsLoading;


  useEffect(() => {
    // Reset to first page when search changes
    setCurrentPage(1);
  }, [searchTerm]);

  // Efeito para gerenciar os cronômetros de cooldown
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const COOLDOWN_MS = 5 * 60 * 1000;
      const updatedCooldowns: Record<string, number> = {};
      let hasUpdates = false;

      referrals.forEach(ref => {
        const lastSent = localStorage.getItem(`nudge_cooldown_${ref.id}`);
        if (lastSent) {
          const elapsed = now - parseInt(lastSent);
          if (elapsed < COOLDOWN_MS) {
            updatedCooldowns[ref.id] = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates || Object.keys(cooldownRemaining).length > 0) {
        setCooldownRemaining(updatedCooldowns);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [referrals, cooldownRemaining]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const copyLinkToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
    }
  };

  const getShareUrl = (code: string) => {
    return `${window.location.origin}?ref=${code}`;
  };

  const getRegistrationUrl = (code: string) => {
    return `${window.location.origin}/selection-fee-registration?ref=${code}`;
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

  const handleNotifyStudent = async (referral: any) => {
    if (!referral.referred_id) return;

    try {
      const studentName = referral.referred_user?.full_name || 'Student';
      const studentEmail = referral.referred_user?.email;

      if (!studentEmail) {
        alert(t('common.error'));
        return;
      }

      // 🕒 Controle de Cooldown (5 minutos) - Silencioso, pois o botão estará desabilitado
      const cooldownKey = `nudge_cooldown_${referral.id}`;
      const lastSent = localStorage.getItem(cooldownKey);
      const now = Date.now();
      const COOLDOWN_MS = 5 * 60 * 1000;

      if (lastSent && (now - parseInt(lastSent)) < COOLDOWN_MS) {
        return;
      }

      // Payload para a função de notificação do n8n
      const payload = {
        tipo_notf: "Nudge to complete enrollment",
        email_aluno: studentEmail,
        nome_aluno: studentName,
        nome_bolsa: "",
        nome_universidade: "Matrícula USA",
        email_universidade: "contato@matriculausa.com",
        o_que_enviar: `Your friend ${(user && user.name) || 'who referred you'} is cheering for you! \n\nYou're almost there! Complete your current pending step in Matrícula USA to move forward in your journey to study in the USA.`,
        contact_name: (user && user.name) || 'Your Friend',
        contact_position: "Friend",
        location: "student/dashboard",
        website: "matriculausa.com",
        notification_target: "student",
        next_step: !referral.selection_process_paid_at ? "Selection Process Fee" :
                   !referral.application_fee_paid_at ? "Application Fee" :
                   !referral.scholarship_fee_paid_at ? "Scholarship Fee" : "I-20 Control Fee"
      };

      setNotificationStatus(prev => ({ ...prev, [referral.id]: 'loading' }));

      const result = await NotificationService.sendUniversityNotification(payload);

      if (!result.success) throw new Error(result.error || 'Failed to send notification');

      // 🕒 Atualizar cooldown apenas em caso de sucesso
      localStorage.setItem(cooldownKey, Date.now().toString());

      setNotificationStatus(prev => ({ ...prev, [referral.id]: 'success' }));
      
      // Voltar ao estado inicial após 3 segundos
      setTimeout(() => {
        setNotificationStatus(prev => ({ ...prev, [referral.id]: 'none' }));
      }, 3000);
    } catch (err) {
      console.error('Error sending notification:', err);
      alert(t('common.error'));
      setNotificationStatus(prev => ({ ...prev, [referral.id]: 'none' }));
    }
  };

  const StepProgress = ({ referral }: { referral: any }) => {
    const stages = [
      { id: 'selection_process_paid', label: t('matriculaRewards.stages.selection'), date: referral.selection_process_paid_at },
      { id: 'application_fee_paid', label: t('matriculaRewards.stages.application'), date: referral.application_fee_paid_at },
      { id: 'scholarship_fee_paid', label: t('matriculaRewards.stages.scholarship'), date: referral.scholarship_fee_paid_at },
      { id: 'i20_paid', label: t('matriculaRewards.stages.i20'), date: referral.i20_paid_at },
    ];

    return (
      <div className="mt-4 w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('matriculaRewards.referralProgress')}</span>
          {!referral.i20_paid_at && (
            <button
              onClick={() => handleNotifyStudent(referral)}
              disabled={notificationStatus[referral.id] === 'loading' || notificationStatus[referral.id] === 'success' || !!cooldownRemaining[referral.id]}
              className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md transition-all duration-300 min-w-[100px] justify-center ${
                cooldownRemaining[referral.id]
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : notificationStatus[referral.id] === 'success' 
                    ? 'text-green-600 bg-green-50 border border-green-200 shadow-sm' 
                    : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:shadow-sm'
              }`}
            >
              {notificationStatus[referral.id] === 'loading' ? (
                <div className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : notificationStatus[referral.id] === 'success' ? (
                <CheckCircle className="h-3 w-3 animate-in zoom-in duration-300" />
              ) : cooldownRemaining[referral.id] ? (
                <Clock className="h-3 w-3" />
              ) : (
                <Bell className="h-3 w-3" />
              )}
              
              {cooldownRemaining[referral.id] ? (
                <span>
                  {Math.floor(cooldownRemaining[referral.id] / 60)}:{(cooldownRemaining[referral.id] % 60).toString().padStart(2, '0')}
                </span>
              ) : notificationStatus[referral.id] === 'success' ? (
                t('matriculaRewards.notificationSent')
              ) : (
                t('matriculaRewards.notifyFriend')
              )}
            </button>
          )}
        </div>
        <div className="relative flex justify-between">
          <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-200 -z-10" />
          {stages.map((stage, idx) => {
            const isCompleted = !!stage.date;
            
            return (
              <div key={idx} className="flex flex-col items-center relative z-10 flex-1">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-green-600 border-green-600 shadow-sm' : 'bg-white border-slate-300'}`}>
                  {isCompleted ? (
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  ) : (
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                
                <div className="mt-2 text-center">
                  <p className={`text-[9px] sm:text-[10px] font-bold max-w-[50px] sm:max-w-[60px] leading-tight ${isCompleted ? 'text-green-700' : 'text-slate-400'}`}>
                    {stage.label}
                  </p>
                  {stage.date && (
                    <p className="text-[8px] sm:text-[9px] text-slate-400 mt-0.5">
                      {formatDate(stage.date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const removeEmailFromDescription = (description: string, referredUserName?: string): string => {
    if (!description) return description;
    
    let cleaned = description;
    
    // Se temos o nome do usuário referido, substituir o email pelo nome
    if (referredUserName) {
      // Padrão de email
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      
      // Substituir "paid by email@domain.com" por "paid by Nome" (mais específico primeiro)
      cleaned = cleaned.replace(
        /\s+paid\s+by\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
        ` paid by ${referredUserName}`
      );
      
      // Substituir (email@domain.com) por (Nome)
      cleaned = cleaned.replace(
        /\([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\)/g,
        `(${referredUserName})`
      );
      
      // Substituir qualquer email restante pelo nome
      cleaned = cleaned.replace(emailPattern, referredUserName);
    } else {
      // Se não temos o nome, apenas remove o email
      cleaned = cleaned
        .replace(/\s+paid\s+by\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '') // Remove "paid by email@domain.com"
        .replace(/\s*\([^)]*@[^)]+\)/g, '') // Remove (email@domain.com)
        .replace(/\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '') // Remove email@domain.com
        .trim();
    }
    
    // Limpa espaços duplos
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
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
          <div className="relative z-10 grid gap-4 sm:gap-6 p-4 sm:p-6 md:grid-cols-3 md:items-center">
            <div className="md:col-span-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{t('matriculaRewards.title')}</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">{t('matriculaRewards.subtitle')}</p>
              <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl bg-slate-100 px-3 py-1.5 sm:px-4 sm:py-2">
                <span className="text-xs sm:text-sm font-medium text-slate-600">{t('matriculaRewards.balance')}</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{formatCoins(credits?.balance || 0)}</span>
                <span className="text-xs sm:text-sm text-slate-500">{t('matriculaRewards.coins')}</span>
              </div>
              
              {/* Referral Code - Integrated in Hero */}
              {affiliateCode && (
                <div className="mt-6 max-w-lg">
                  <div className="bg-white rounded-xl border-2 border-blue-200 p-3 sm:p-4 shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-slate-500">Seu código</p>
                          <p className="text-lg sm:text-xl font-bold tracking-wide text-slate-900 font-mono truncate">
                            {affiliateCode.code}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(affiliateCode.code)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all duration-200 shadow-sm text-sm flex-shrink-0"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>{t('common.copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>{t('common.copy')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Referral Link - New Element */}
                  <div className="bg-white rounded-xl border-2 border-indigo-200 p-3 sm:p-4 shadow-md mt-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-slate-500">Seu link</p>
                          <p className="text-xs sm:text-sm font-medium text-slate-600 truncate font-mono">
                            {getRegistrationUrl(affiliateCode.code)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => copyLinkToClipboard(getRegistrationUrl(affiliateCode.code))}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all duration-200 shadow-sm text-sm flex-shrink-0"
                      >
                        {copiedLink ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>{t('common.copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>{t('common.copy')}</span>
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
                  <div className="mt-2 text-2xl font-bold text-slate-900">{referrals?.length || 0}</div>
                </Card>
                <Card className="p-4 gap-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{t('matriculaRewards.totalEarnings')}</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><TrendingUp className="h-4 w-4"/></span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{formatCoins(credits?.total_earned || 0)}</div>
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
              <div className="space-y-4">
                {referrals.slice((referralsPage - 1) * referralsPerPage, referralsPage * referralsPerPage).map(referral => (
                  <div key={referral.id} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm sm:text-base truncate">
                            {referral.referred_user?.full_name 
                              ? referral.referred_user.full_name
                              : t('matriculaRewards.referralNumber', { id: referral.id.slice(0, 8) })
                            }
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-500 truncate">{t('matriculaRewards.invitedOn', { date: formatDate(referral.created_at) })}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wider ${referral.i20_paid_at ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {referral.i20_paid_at ? (
                            <>
                              <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              <span className="hidden xs:inline">{t('matriculaRewards.completed')}</span> (+180)
                            </>
                          ) : (
                            <>
                              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {t('matriculaRewards.inProgress')}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <StepProgress referral={referral} />
                  </div>
                ))}

                {referrals.length > referralsPerPage && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setReferralsPage(p => Math.max(1, p - 1))}
                      disabled={referralsPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                      {referralsPage} / {Math.ceil(referrals.length / referralsPerPage)}
                    </span>
                    <button
                      onClick={() => setReferralsPage(p => Math.min(Math.ceil(referrals.length / referralsPerPage), p + 1))}
                      disabled={referralsPage === Math.ceil(referrals.length / referralsPerPage)}
                      className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </div>
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
                  <li key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 sm:p-3 overflow-hidden">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full flex-shrink-0 ${tx.type==='earned'?'bg-green-100 text-green-600':tx.type==='spent'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-600'}`}>
                        {tx.type==='earned'?<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>:tx.type==='spent'?<DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>:<Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                          {tx.description 
                            ? removeEmailFromDescription(tx.description, tx.referred_user_name)
                            : (tx.type === 'earned' ? t('matriculaRewards.earned') : tx.type === 'spent' ? t('matriculaRewards.spent') : t('matriculaRewards.pending'))
                          }
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-500">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className={`${tx.type==='earned'?'text-green-600':tx.type==='spent'?'text-red-600':'text-yellow-600'} font-semibold text-sm sm:text-base`}>
                        {tx.type==='earned'?'+':tx.type==='spent'?'-':''}{formatCoins(tx.amount)}
                      </p>
                      <p className="text-[10px] text-slate-500">Bal: {formatCoins(tx.balance_after)}</p>
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