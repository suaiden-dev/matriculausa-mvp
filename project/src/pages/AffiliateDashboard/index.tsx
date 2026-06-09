import React, { useState } from 'react';
import {
  Copy,
  CheckCircle,
  Users,
  DollarSign,
  TrendingUp,
  Link2,
  Edit2,
  X,
  AlertTriangle,
  ChevronDown,
  LogOut,
  User,
  Info,
  Bell,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import {
  useAffiliateCodeQuery,
  useMatriculacoinCreditsQuery,
  useAffiliateReferralsQuery,
  useUpdateAffiliateCode,
} from '../../hooks/useStudentDashboardQueries';
import { useSmartPollingNotifications } from '../../hooks/useSmartPollingNotifications';
import NotificationsModal from '../../components/NotificationsModal';
import LanguageSelector from '../../components/LanguageSelector';
import AffiliateRedemptionSection from './AffiliateRedemptionSection';
import { invalidateStudentDashboardRewards } from '../../lib/queryKeys';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Main Component ──────────────────────────────────────────────────────────

const AffiliateDashboard: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation(['dashboard', 'common']);

  const { data: affiliateCode, isPending: codeLoading } = useAffiliateCodeQuery(user?.id);
  const { data: credits, isPending: creditsLoading } = useMatriculacoinCreditsQuery(user?.id);
  const { data: referrals = [], isPending: referralsLoading } = useAffiliateReferralsQuery(user?.id);
  const updateCode = useUpdateAffiliateCode();

  const loading = codeLoading || creditsLoading || referralsLoading;

  // notifications state & polling
  const [showNotif, setShowNotif] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const {
    notifications,
    unreadCount: newNotificationCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    requestNotificationPermission
  } = useSmartPollingNotifications({
    userType: 'student', // Reutilizando a lógica de notificações associadas ao user_id do aluno/afiliado
    userId: user?.id || '',
    onNotificationReceived: (notification) => {
      console.log('🔔 Nova notificação no Painel do Afiliado:', notification);
    }
  });

  // Solicitar permissão nativa na primeira renderização
  React.useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Fechar dropdown de notificações ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.notifications-container')) {
        setShowNotif(false);
      }
    };

    if (showNotif) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotif]);

  const openNotification = async (n: any) => {
    try {
      if (n && !n.read_at) {
        await markAsRead(n.id);
      }
    } catch {}
    setShowNotif(false);
    if (n?.link) {
      navigate(n.link);
    }
  };

  // copy states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // user menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // edit code
  const [editingCode, setEditingCode] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);



  const registrationUrl = affiliateCode
    ? `${window.location.origin}/selection-fee-registration?ref=${affiliateCode.code}`
    : '';

  const copy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {}
  };

  const openEdit = () => {
    setEditValue(affiliateCode?.code || '');
    setEditError('');
    setEditSuccess(false);
    setEditingCode(true);
  };

  const handleSave = async () => {
    const code = editValue.trim().toUpperCase();
    if (code.length < 3 || code.length > 20) {
      setEditError(t('dashboard:affiliateDashboard.central.editErrorLength'));
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      setEditError(t('dashboard:affiliateDashboard.central.editErrorPattern'));
      return;
    }
    if (!user?.id) return;
    try {
      await updateCode.mutateAsync({ userId: user.id, newCode: code });
      setEditSuccess(true);
      setTimeout(() => setEditingCode(false), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setEditError(
        msg === 'taken' ? t('dashboard:affiliateDashboard.central.editErrorTaken') :
        msg === 'length' ? t('dashboard:affiliateDashboard.central.editErrorInvalid') :
        t('dashboard:affiliateDashboard.central.editErrorGeneral')
      );
    }
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  // stats
  const totalReferrals = referrals.length;
  const balance = credits?.balance ?? 0;
  const totalEarned = credits?.total_earned ?? 0;

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-[#05294E] border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Carregando seu painel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── TOP HEADER (estilo admin) ──────────────────────────────────────── */}
      <header className="bg-white shadow-sm border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-4">

          {/* Logo + título */}
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:opacity-85 transition-opacity">
              <img src="/logo.png.png" alt="Matrícula USA" className="h-10 w-auto" />
            </Link>
            <div className="hidden sm:block border-l border-slate-200 pl-4">
              <h1 className="text-lg font-bold text-slate-900">{t('dashboard:affiliateDashboard.header.title')}</h1>
              <p className="text-xs text-slate-500">{t('dashboard:affiliateDashboard.header.subtitle')}</p>
            </div>
          </div>

          {/* Right Actions: Notifications + Language + User menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Notifications Bell */}
            <div className="relative notifications-container">
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setShowNotificationsModal(true);
                  } else {
                    setShowNotif(!showNotif);
                  }
                }}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-slate-600" />
                {newNotificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold min-w-[20px] shadow-sm">
                    {newNotificationCount > 99 ? '99+' : newNotificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown - only show on desktop */}
              {showNotif && (
                <div className="hidden md:block absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 pb-2 border-b border-slate-200 font-semibold text-slate-900 flex items-center justify-between">
                    <span>{t('dashboard:studentDashboard.notifications.title', 'Notificações')}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <button onClick={markAllAsRead} className="text-blue-600 hover:underline">
                        {t('dashboard:studentDashboard.notifications.markAllAsRead', 'Ler tudo')}
                      </button>
                      <span className="text-slate-300">|</span>
                      <button onClick={clearAll} className="text-red-600 hover:underline">
                        {t('dashboard:studentDashboard.notifications.clearAll', 'Limpar')}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500 text-center">
                        {t('dashboard:studentDashboard.notifications.noNotifications', 'Nenhuma notificação')}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 hover:bg-slate-50 cursor-pointer ${!n.read_at ? 'bg-slate-50' : ''}`}
                          onClick={() => openNotification(n)}
                        >
                          <div className="text-sm font-medium text-slate-900 flex items-center justify-between">
                            <span>{t(`dashboard:studentDashboard.notifications.${n.title}`, n.title)}</span>
                            {!n.read_at && <span className="ml-2 h-2 w-2 rounded-full bg-blue-500 inline-block"></span>}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {t(`dashboard:studentDashboard.notifications.${n.message}`, n.message)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div>
              <LanguageSelector variant="dashboard" showLabel={false} />
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 bg-[#05294E] rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">
                    {userProfile?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-slate-500">{t('common:affiliate', 'Afiliado')}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="font-semibold text-slate-900 text-sm">{userProfile?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sair
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Fechar user menu ao clicar fora */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* ── STAT CARDS ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: t('dashboard:affiliateDashboard.stats.balance'),
                value: `$${fmt(balance)}`,
                sub: t('dashboard:affiliateDashboard.stats.balanceSub'),
                icon: <DollarSign className="h-5 w-5" />,
                bg: 'bg-emerald-100',
                color: 'text-emerald-600',
              },
              {
                label: t('dashboard:affiliateDashboard.stats.totalEarned'),
                value: `$${fmt(totalEarned)}`,
                sub: t('dashboard:affiliateDashboard.stats.totalEarnedSub'),
                icon: <TrendingUp className="h-5 w-5" />,
                bg: 'bg-blue-100',
                color: 'text-blue-600',
              },
              {
                label: t('dashboard:affiliateDashboard.stats.referrals'),
                value: totalReferrals,
                sub: t('dashboard:affiliateDashboard.stats.referralsSub'),
                icon: <Users className="h-5 w-5" />,
                bg: 'bg-indigo-100',
                color: 'text-indigo-600',
              },

            ].map((stat) => (
              <Card key={stat.label} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
                  <span className={`inline-flex h-9 w-9 rounded-lg items-center justify-center ${stat.bg} ${stat.color}`}>
                    {stat.icon}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
              </Card>
            ))}
          </div>

          {/* ── CÓDIGO, LINK & RESGATE UNIFICADOS ──────────────────────────── */}
          <Card className="overflow-hidden">
            {/* cabeçalho azul estilo admin com Título Geral */}
            <div className="bg-[#05294E] px-6 py-5">
              <h2 className="text-lg font-bold text-white">
                {t('dashboard:affiliateDashboard.central.title')}
              </h2>
            </div>

            {/* Bloco de Divulgação (Código e Link integrados no mesmo fundo cinza) */}
            <div className="bg-slate-50 p-8 pt-10 space-y-4 border-b border-slate-100">
              {/* 1. Código de Indicação */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
                    {t('dashboard:affiliateDashboard.central.codeLabel')}
                  </p>
                  {!editingCode ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-extrabold tracking-wider text-[#05294E] font-mono">
                        {affiliateCode?.code ?? '—'}
                      </span>
                      <button
                        onClick={openEdit}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        title="Editar código"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
                            setEditError('');
                          }}
                          maxLength={20}
                          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          className="bg-white border border-slate-300 text-[#05294E] font-mono font-bold rounded-lg px-4 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-52"
                          placeholder={t('dashboard:affiliateDashboard.central.newCode')}
                          autoFocus
                        />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={handleSave}
                            disabled={updateCode.isPending || editSuccess}
                            className="flex-1 sm:flex-initial bg-[#05294E] text-white px-5 py-2.5 sm:py-2 rounded-lg text-sm font-bold disabled:opacity-60 hover:bg-[#05294E]/90 transition-colors text-center"
                          >
                            {editSuccess ? t('dashboard:affiliateDashboard.central.saved') : updateCode.isPending ? '…' : t('dashboard:affiliateDashboard.central.save')}
                          </button>
                          <button
                            onClick={() => setEditingCode(false)}
                            className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 sm:border-0 rounded-lg flex items-center justify-center"
                            title="Cancelar"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      {editError && <p className="text-red-600 text-sm font-semibold">{editError}</p>}
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-500 text-xs">
                          {t('dashboard:affiliateDashboard.central.editWarning')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {!editingCode && (
                  <button
                    onClick={() => copy(affiliateCode?.code ?? '', setCopiedCode)}
                    className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 w-full sm:w-40 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0"
                  >
                    {copiedCode ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {copiedCode ? t('dashboard:affiliateDashboard.central.copied') : t('dashboard:affiliateDashboard.central.copyCode')}
                  </button>
                )}
              </div>

              {/* 2. Link Preview */}
              <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-600 font-mono truncate">
                    {registrationUrl.replace(/^https?:\/\//, '')}
                  </p>
                </div>
                <button
                  onClick={() => copy(registrationUrl, setCopiedLink)}
                  className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 w-full sm:w-40 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0"
                >
                  {copiedLink ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
                  {copiedLink ? t('dashboard:affiliateDashboard.central.copied') : t('dashboard:affiliateDashboard.central.copyLink')}
                </button>
              </div>
            </div>

            {/* 3. Seção de Resgate (Na base do card, com preenchimento limpo e espaçado) */}
            <div className="p-6 md:p-8 bg-white">
              <AffiliateRedemptionSection
                coinBalance={balance}
                onRequestSubmitted={() => invalidateStudentDashboardRewards(queryClient)}
              />
            </div>
          </Card>

          {/* ── REGRAS DE GANHO E FUNCIONAMENTO ────────────────────────────── */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-center sm:justify-start gap-2 pb-3 border-b border-slate-100">
              <Info className="h-5 w-5 text-[#05294E]" />
              <h3 className="text-base font-bold text-slate-900 text-center sm:text-left">{t('dashboard:affiliateDashboard.howItWorks.title')}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
              {/* Passo 1 */}
              <div className="space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#05294E]/10 text-xs font-bold text-[#05294E]">
                    1
                  </span>
                  <p className="font-semibold text-slate-800 text-sm">{t('dashboard:affiliateDashboard.howItWorks.step1.title')}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('dashboard:affiliateDashboard.howItWorks.step1.description')}
                </p>
              </div>

              {/* Passo 2 */}
              <div className="space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#05294E]/10 text-xs font-bold text-[#05294E]">
                    2
                  </span>
                  <p className="font-semibold text-slate-800 text-sm">{t('dashboard:affiliateDashboard.howItWorks.step2.title')}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('dashboard:affiliateDashboard.howItWorks.step2.description')}
                </p>
              </div>

              {/* Passo 3 */}
              <div className="space-y-2 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#05294E]/10 text-xs font-bold text-[#05294E]">
                    3
                  </span>
                  <p className="font-semibold text-slate-800 text-sm">{t('dashboard:affiliateDashboard.howItWorks.step3.title')}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('dashboard:affiliateDashboard.howItWorks.step3.description')}
                </p>
              </div>
            </div>
          </Card>

          {/* ── INDICAÇÕES ────────────────────────────────────────────────── */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {t('dashboard:affiliateDashboard.referralsList.title')}
              </h2>
              {totalReferrals > 0 && (
                <span className="text-xs font-semibold bg-[#05294E]/10 text-[#05294E] px-2.5 py-1 rounded-full">
                  {totalReferrals} {totalReferrals === 1 ? t('dashboard:affiliateDashboard.referralsList.count_one') : t('dashboard:affiliateDashboard.referralsList.count_other')}
                </span>
              )}
            </div>

            <div className="p-6">
              {referrals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
                    <Users className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700">{t('dashboard:affiliateDashboard.referralsList.noReferrals')}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {t('dashboard:affiliateDashboard.referralsList.startSharing')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {referrals.map((ref: any) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between py-4.5 first:pt-0 last:pb-0 gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {ref.referred_user?.full_name ?? `${t('dashboard:affiliateDashboard.referralsList.anonymous')} #${ref.id.slice(0, 6)}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fmtDate(ref.created_at)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-900 text-sm">
                          +${fmt(ref.commission_amount ?? ref.credits_earned ?? 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

        </div>
      </main>
      {/* Notifications Modal - for mobile */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onNotificationClick={async (notification) => {
          await markAsRead(notification.id);
          if (notification.link) {
            navigate(notification.link);
          }
          setShowNotificationsModal(false);
        }}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
      />
    </div>
  );
};

export default AffiliateDashboard;
