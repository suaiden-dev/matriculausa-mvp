// @ts-nocheck
import React from 'react';
import { useState as useStateReact, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  UserPlus, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight
} from 'lucide-react';
import DirectSalesLink from './DirectSalesLink';
import { useAffiliateRevenueCalculationQuery } from '../../hooks/useAffiliateAdminQueries';
import { invalidateAffiliateAdminAll } from '../../lib/queryKeys';

const Overview = ({ stats, sellers = [], students = [], onRefresh, userId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ React Query Hook para cálculos de receita
  const { 
    data: revenueData, 
    isPending: isLoadingRevenue,
    error: revenueError 
  } = useAffiliateRevenueCalculationQuery(userId);

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

  // ✅ Usar dados do React Query com fallback para valores antigos
  const totalRevenue = revenueData?.totalRevenue ?? safeStats.totalRevenue;
  const adjustedRevenueByReferral = revenueData?.adjustedRevenueByReferral ?? {};
  const paidStudents = revenueData?.paidStudents ?? [];
  const paidStudentsCount = revenueData?.paidStudentsCount ?? 0;

  // ✅ Função de refresh usando React Query
  const handleRefresh = () => {
    invalidateAffiliateAdminAll(queryClient);
    onRefresh?.(); // Manter compatibilidade com props externos
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // ✅ Agrupar estudantes pagos por referral_code usando dados do React Query
  const paidStudentsByReferral = useMemo(() => {
    const map = {};
    (paidStudents || []).forEach((s) => {
      const referralCode = s.seller_referral_code;
      if (referralCode) {
        if (!map[referralCode]) {
          map[referralCode] = [];
        }
        map[referralCode].push(s);
      }
    });
    return map;
  }, [paidStudents]);

  // ✅ Recent sellers usando dados do React Query
  const recentSellers = useMemo(() => {
    if (isLoadingRevenue) return [];
    
    return (sellers || [])
      .filter((s) => {
        const referralCode = s.referral_code;
        const hasAdjustedRevenue = adjustedRevenueByReferral[referralCode] && adjustedRevenueByReferral[referralCode] > 0;
        return hasAdjustedRevenue;
      })
      .map((s) => {
        const paidCount = paidStudentsByReferral[s?.referral_code]?.length || 0;
        return {
          ...s,
          students_count: paidCount
        };
      })
      .slice(0, 5);
  }, [sellers, paidStudentsByReferral, adjustedRevenueByReferral, isLoadingRevenue]);

  // ✅ Display sellers usando dados do React Query
  const displaySellers = useMemo(() => {
    if (isLoadingRevenue) return [];
    
    return (sellers || [])
      .filter((s) => {
        const referralCode = s.referral_code;
        const hasAdjustedRevenue = adjustedRevenueByReferral[referralCode] && adjustedRevenueByReferral[referralCode] > 0;
        return hasAdjustedRevenue;
      })
      .map((s) => {
        const adjustedRevenue = adjustedRevenueByReferral[s?.referral_code];
        const finalRevenue = adjustedRevenue != null && adjustedRevenue !== undefined ? adjustedRevenue : 0;
        const paidCount = paidStudentsByReferral[s?.referral_code]?.length || 0;
        
        return {
          ...s,
          total_revenue: finalRevenue,
          students_count: paidCount
        };
      });
  }, [sellers, adjustedRevenueByReferral, paidStudentsByReferral, isLoadingRevenue]);

  // ✅ Total revenue usando dados do React Query
  const displayTotalRevenue = useMemo(() => {
    if (isLoadingRevenue) return 0;
    return Object.values(adjustedRevenueByReferral || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
  }, [adjustedRevenueByReferral, isLoadingRevenue]);

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
          onClick={handleRefresh}
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
                <p className="text-3xl font-bold text-slate-900">{paidStudentsCount}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-[#05294E] mr-1" />
                  <span className="text-sm font-medium text-[#05294E]">Who paid Selection Process</span>
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
                {isLoadingRevenue ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-9 w-32 bg-slate-200 rounded"></div>
                    <div className="h-4 w-40 bg-slate-200 rounded"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-900">{formatCurrency(
                      totalRevenue || 0
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
            {isLoadingRevenue ? (
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
