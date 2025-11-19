// @ts-nocheck
import React from 'react';
import { useState as useStateReact, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { getRealPaidAmounts } from '../../utils/paymentConverter';
import { 
  Users, 
  UserPlus, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight
} from 'lucide-react';
import DirectSalesLink from './DirectSalesLink';

const Overview = ({ stats, sellers = [], students = [], onRefresh }) => {
  const navigate = useNavigate();
  const recentSellers = (sellers || []).slice(0, 5);

  // Default values for stats
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    pendingSellers: stats?.pendingSellers || 0,
    approvedSellers: stats?.approvedSellers || 0,
    rejectedSellers: stats?.rejectedSellers || 0,
    totalStudents: stats?.totalStudents || 0,
    totalRevenue: stats?.totalRevenue || 0
  };

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Receita derivada: prioriza um possível campo ajustado vindo do backend;
  // fallback: soma de sellers.total_revenue; fallback final: stats.totalRevenue
  const derivedTotalRevenue = (() => {
    const adjustedFromStats = stats && stats.totalRevenueAdjusted;
    if (typeof adjustedFromStats === 'number' && !isNaN(adjustedFromStats)) return adjustedFromStats;
    if (Array.isArray(sellers) && sellers.length > 0) {
      const sum = sellers.reduce((acc, s) => acc + (Number(s?.total_revenue) || 0), 0);
      if (!isNaN(sum)) return sum;
    }
    return safeStats.totalRevenue;
  })();

  // Receita ajustada calculada no cliente (inclui dependentes) para o admin logado
  const [clientAdjustedRevenue, setClientAdjustedRevenue] = useStateReact(null);
  const [adjustedRevenueByReferral, setAdjustedRevenueByReferral] = useStateReact({});
  const [loadingAdjusted, setLoadingAdjusted] = useStateReact(true); // Iniciar como true para mostrar skeleton imediatamente

  useEffect(() => {
    let mounted = true;
    const loadAdjusted = async () => {
      try {
        setLoadingAdjusted(true);
        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData?.user?.id;
        if (!currentUserId) {
          if (mounted) setClientAdjustedRevenue(null);
          return;
        }
        
        // Descobrir affiliate_admin_id
        const { data: aaList, error: aaErr } = await supabase
          .from('affiliate_admins')
          .select('id')
          .eq('user_id', currentUserId)
          .limit(1);
        if (aaErr || !aaList || aaList.length === 0) {
          if (mounted) setClientAdjustedRevenue(null);
          return;
        }
        const affiliateAdminId = aaList[0].id;

        // Buscar sellers vinculados a este affiliate admin
        const { data: sellersData, error: sellersErr } = await supabase
          .from('sellers')
          .select('referral_code')
          .eq('affiliate_admin_id', affiliateAdminId);
        
        if (sellersErr || !sellersData || sellersData.length === 0) {
          if (mounted) {
            setClientAdjustedRevenue(0);
            setAdjustedRevenueByReferral({});
            setLoadingAdjusted(false);
          }
          return;
        }
        
        // ✅ CORREÇÃO: Buscar perfis usando RPC centralizada que verifica TODAS as aplicações
        // Usar a mesma lógica do Analytics.tsx que funciona corretamente
        const { data: profiles, error: profilesErr } = await supabase
          .rpc('get_affiliate_admin_profiles_with_fees', { admin_user_id: currentUserId });
        if (profilesErr || !profiles) {
          if (mounted) {
            setClientAdjustedRevenue(0);
            setAdjustedRevenueByReferral({});
            setLoadingAdjusted(false);
          }
          return;
        }

        // Preparar overrides por user_id (opcional, mas mantém compatibilidade)
        const uniqueUserIds = Array.from(new Set((profiles || []).map((p) => p.user_id).filter(Boolean)));
        const overrideEntries = await Promise.allSettled(uniqueUserIds.map(async (uid) => {
          const { data, error } = await supabase.rpc('get_user_fee_overrides', { target_user_id: uid });
          return [uid, error ? null : data];
        }));
        const overridesMap: Record<string, any> = overrideEntries.reduce((acc: Record<string, any>, res) => {
          if (res.status === 'fulfilled') {
            const arr = res.value;
            const uid = arr[0];
            const data = arr[1];
            if (data) acc[uid] = {
              selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
              scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
              i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
            };
          }
          return acc;
        }, {});

        // ✅ OTIMIZAÇÃO: Calcular primeiro com valores de fallback (rápido) e mostrar imediatamente
        const calculateRevenue = (realPaidAmountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {}) => {
          const revenueByReferral: Record<string, number> = {};
          const total = (profiles || []).reduce((sum, p) => {
            const deps = Number(p?.dependents || 0);
            const ov = overridesMap[p?.user_id] || {};
            const realPaid = realPaidAmountsMap[p?.user_id] || {};

            // Selection Process - usar valor real pago se disponível, senão calcular
            let selPaid = 0;
            if (p?.has_paid_selection_process_fee) {
              if (realPaid.selection_process !== undefined) {
                selPaid = realPaid.selection_process;
              } else {
                const baseSelDefault = p?.system_type === 'simplified' ? 350 : 400;
                const baseSel = ov.selection_process_fee != null ? Number(ov.selection_process_fee) : baseSelDefault;
                selPaid = ov.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
              }
            }

            // Scholarship Fee - usar valor real pago se disponível, senão calcular
            const hasAnyScholarshipPaid = p?.is_scholarship_fee_paid || false;
            let schPaid = 0;
            if (hasAnyScholarshipPaid) {
              if (realPaid.scholarship !== undefined) {
                schPaid = realPaid.scholarship;
              } else {
                const schBaseDefault = p?.system_type === 'simplified' ? 550 : 900;
                const schBase = ov.scholarship_fee != null ? Number(ov.scholarship_fee) : schBaseDefault;
                schPaid = schBase;
              }
            }

            // I-20 Control Fee - usar valor real pago se disponível, senão calcular
            let i20Paid = 0;
            if (hasAnyScholarshipPaid && p?.has_paid_i20_control_fee) {
              if (realPaid.i20_control !== undefined) {
                i20Paid = realPaid.i20_control;
              } else {
                const i20Base = ov.i20_control_fee != null ? Number(ov.i20_control_fee) : 900;
                i20Paid = i20Base;
              }
            }

            const subtotal = selPaid + schPaid + i20Paid;
            const ref = p?.seller_referral_code || '__unknown__';
            revenueByReferral[ref] = (revenueByReferral[ref] || 0) + subtotal;
            return sum + subtotal;
          }, 0);

          return { total, revenueByReferral };
        };

        // Buscar valores reais pagos (mantém loading até carregar tudo)
        // Processar todos em paralelo para melhor performance
        const realPaidAmountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
        
        await Promise.allSettled(uniqueUserIds.map(async (userId) => {
          if (!mounted) return;
          
          try {
            const amounts = await getRealPaidAmounts(userId, ['selection_process', 'scholarship', 'i20_control']);
            if (mounted) {
              realPaidAmountsMap[userId] = {
                selection_process: amounts.selection_process,
                scholarship: amounts.scholarship,
                i20_control: amounts.i20_control
              };
            }
          } catch (error) {
            console.error(`[Overview] Erro ao buscar valores pagos para user_id ${userId}:`, error);
          }
        }));

        // Atualização final com todos os valores reais (apenas após carregar tudo)
        if (mounted) {
          const finalRevenue = calculateRevenue(realPaidAmountsMap);
          setClientAdjustedRevenue(finalRevenue.total);
          setAdjustedRevenueByReferral(finalRevenue.revenueByReferral);

          console.log('🔍 [OVERVIEW] Revenue calculado:', {
            total: finalRevenue.total,
            revenueByReferral: finalRevenue.revenueByReferral,
            profilesCount: profiles?.length || 0,
            realPaidAmountsCount: Object.keys(realPaidAmountsMap).length
          });
        }
      } catch (error) {
        console.error('[Overview] Erro ao calcular receita ajustada:', error);
        if (mounted) setClientAdjustedRevenue(null);
      } finally {
        if (mounted) setLoadingAdjusted(false);
      }
    };
    loadAdjusted();
    return () => { mounted = false; };
  }, [students, sellers]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Sellers com receita ajustada (se disponível)
  // Priorizar adjustedRevenueByReferral que usa valores reais pagos
  // ⚠️ Só calcular quando os valores reais pagos estiverem carregados para evitar mudança visual
  const displaySellers = loadingAdjusted 
    ? [] // Retornar array vazio enquanto carrega para evitar mostrar valores incorretos
    : (sellers || []).map((s) => {
      const adjustedRevenue = adjustedRevenueByReferral[s?.referral_code];
      const finalRevenue = adjustedRevenue != null && adjustedRevenue !== undefined
        ? adjustedRevenue
        : (s.total_revenue || 0);
      
      // Log para debug
      if (s?.referral_code === 'SUAIDEN') {
        console.log('🔍 [OVERVIEW] SUAIDEN revenue:', {
          referral_code: s.referral_code,
          adjustedRevenue,
          s_total_revenue: s.total_revenue,
          finalRevenue,
          adjustedRevenueByReferral: adjustedRevenueByReferral
        });
      }
      
      return {
        ...s,
        total_revenue: finalRevenue
      };
    });

  // Total para o card: alinhar com Top Sellers (soma do mapa ajustado)
  // ⚠️ Só calcular quando os valores reais pagos estiverem carregados
  const displayTotalRevenue = loadingAdjusted 
    ? 0 // Retornar 0 enquanto carrega para evitar mostrar valor incorreto
    : Object.values(adjustedRevenueByReferral || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);

  const quickActions = [
    {
      title: 'Add Seller',
      description: 'Generate registration links',
      icon: UserPlus,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/affiliate-admin/dashboard/users?tab=registration',
      count: null
    },
    {
      title: 'Manage Users',
      description: 'View and manage sellers',
      icon: Users,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/affiliate-admin/dashboard/users',
      count: null
    },
    {
      title: 'Analytics Dashboard',
      description: 'Track performance and metrics',
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/affiliate-admin/dashboard/analytics',
      count: null
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={onRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Refresh Data
        </button>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Sellers</p>
                <p className="text-3xl font-bold text-slate-900">{safeStats.totalSellers}</p>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm font-medium text-blue-600">{safeStats.activeSellers} active</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Active Sellers</p>
                <p className="text-3xl font-bold text-slate-900">{safeStats.activeSellers}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-600">
                    {safeStats.totalSellers > 0 
                      ? ((safeStats.activeSellers / safeStats.totalSellers) * 100).toFixed(1)
                      : 0
                    }% of total
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Referred Students</p>
                <p className="text-3xl font-bold text-slate-900">{safeStats.totalStudents}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-[#05294E] mr-1" />
                  <span className="text-sm font-medium text-[#05294E]">Performance</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
                {loadingAdjusted ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-9 w-32 bg-slate-200 rounded"></div>
                    <div className="h-4 w-40 bg-slate-200 rounded"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-900">{formatCurrency(
                      (displayTotalRevenue && displayTotalRevenue > 0)
                        ? displayTotalRevenue
                        : (typeof clientAdjustedRevenue === 'number' ? clientAdjustedRevenue : (typeof derivedTotalRevenue === 'number' ? derivedTotalRevenue : safeStats.totalRevenue))
                    )}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                      <span className="text-sm font-medium text-emerald-600">
                        Performance tracking
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>

      {/* Direct Sales Link Section */}
      <div className="mt-8">
        <DirectSalesLink />
      </div>

      {/* Quick Actions */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            return (
              <div 
                key={index} 
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
                onClick={() => navigate(action.link)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center">
                    {action.count !== null && (
                      <span className="text-2xl font-bold text-slate-900 mr-2">{action.count}</span>
                    )}
                    <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{action.title}</h3>
                <p className="text-slate-600 text-sm">{action.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Sellers Section */}
      {sellers && sellers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-slate-900">Top Sellers</h3>
                <p className="text-slate-500 text-sm break-words">
                  Ranking of top performing sellers based on performance
                </p>
              </div>
              <div 
                onClick={() => navigate('/affiliate-admin/dashboard/analytics')}
                className="text-[#05294E] hover:text-[#05294E] font-medium text-sm flex items-center cursor-pointer self-start sm:self-auto"
              >
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            {loadingAdjusted ? (
              <div className="space-y-4 animate-pulse">
                {/* Top 3 Sellers Skeleton */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                        <div className="min-w-0 flex-1">
                          <div className="h-5 w-32 bg-slate-200 rounded mb-2"></div>
                          <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                            <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="space-y-1">
                          <div className="h-6 w-24 bg-slate-200 rounded"></div>
                          <div className="h-5 w-20 bg-slate-200 rounded"></div>
                          <div className="h-4 w-28 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Top 3 Sellers */}
                {displaySellers
                  .sort((a, b) => {
                    // Sort by number of students first, then by revenue
                    if (b.students_count !== a.students_count) {
                      return b.students_count - a.students_count;
                    }
                    return (b.total_revenue || 0) - (a.total_revenue || 0);
                  })
                  .slice(0, 3)
                  .map((seller, index) => (
                  <div 
                    key={seller.id} 
                    className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Ranking Number */}
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700">
                          {index + 1}
                        </div>
                        
                        {/* Seller Info */}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 break-words">{seller.name}</p>
                          <p className="text-sm text-slate-600 break-words">{seller.email}</p>
                          <div className="flex items-center flex-wrap gap-2 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                              {seller.referral_code}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                              seller.is_active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {seller.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Performance Metrics */}
                      <div className="text-left sm:text-right">
                        <div className="space-y-1">
                          <div className="flex items-center sm:justify-end space-x-2">
                            <span className="text-lg font-bold text-slate-900 whitespace-nowrap">
                              {seller.students_count || 0}
                            </span>
                            <span className="text-sm text-slate-500">students</span>
                          </div>
                          <div className="text-sm font-medium text-slate-700">
                            {formatCurrency(seller.total_revenue || 0)}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatDate(seller.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              
              {/* Additional Sellers (4th to 6th place) */}
              {displaySellers.length > 3 && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-600 mb-3">Other Sellers</h4>
                  <div className="space-y-3">
                    {displaySellers
                      .sort((a, b) => {
                        if (b.students_count !== a.students_count) {
                          return b.students_count - a.students_count;
                        }
                        return (b.total_revenue || 0) - (a.total_revenue || 0);
                      })
                      .slice(3, 6)
                      .map((seller, index) => (
                        <div 
                          key={seller.id} 
                          className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-6 h-6 bg-slate-300 rounded flex items-center justify-center text-white text-xs font-medium">
                                {index + 4}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 break-words">{seller.name}</p>
                                <p className="text-xs text-slate-500 break-words">{seller.email}</p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <div className="flex items-center sm:justify-end space-x-4">
                                <span className="text-sm text-slate-700 whitespace-nowrap">
                                  {seller.students_count || 0} students
                                </span>
                                <span className="text-sm text-slate-700 whitespace-nowrap">
                                  {formatCurrency(seller.total_revenue || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Data */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Sellers */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-slate-900">Recent Sellers</h3>
                    <p className="text-slate-500 text-sm break-words">
                      {recentSellers.length} seller{recentSellers.length !== 1 ? 's' : ''} registered
                    </p>
                  </div>
                  <div className="text-[#05294E] hover:text-[#05294E] font-medium text-sm flex items-center cursor-pointer self-start sm:self-auto">
                    View All
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6">
                {recentSellers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Users className="h-10 w-10 text-[#05294E]" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">No sellers yet!</h3>
                    <p className="text-slate-500">Register your first seller to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSellers.map((seller) => (
                      <div key={seller.id} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 group">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-sm font-bold text-white">
                                {seller.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors break-words">{seller.name}</p>
                              <p className="text-xs text-slate-500 break-words">{seller.email}</p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                              {seller.students_count || 0} students
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(seller.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Overview;
