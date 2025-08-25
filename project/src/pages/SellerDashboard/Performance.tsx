import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Award, Target, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PerformanceProps {
  stats: any;
  sellerProfile: any;
  students: any[];
}

interface PerformanceData {
  total_students: number;
  total_revenue: number;
  monthly_students: number;
  conversion_rate: number;
  monthly_data: Array<{
    month: string;
    students: number;
    revenue: number;
  }>;
  ranking_position: number;
  monthly_goals: any; // Simplificado para aceitar qualquer estrutura
  achievements: any; // Simplificado para aceitar qualquer estrutura
}

const Performance: React.FC<PerformanceProps> = ({ stats, sellerProfile, students }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users;
      case 'DollarSign': return DollarSign;
      case 'Target': return Target;
      case 'Award': return Award;
      default: return Users;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'green': return 'bg-green-100 text-green-600';
      case 'red': return 'bg-red-100 text-red-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Função para obter dados seguros com fallbacks
  const getSafeData = (data: any, field: string, fallback: any = 0) => {
    try {
      if (!data || typeof data !== 'object') {
        return fallback;
      }
      const value = data[field];
      if (value === undefined || value === null) {
        return fallback;
      }
      return value;
    } catch (error) {
      console.warn(`Error accessing field ${field}:`, error);
      return fallback;
    }
  };

  // Função para obter dados numéricos seguros
  const getSafeNumber = (data: any, field: string, fallback: number = 0) => {
    const value = getSafeData(data, field, fallback);
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return fallback;
  };

  // Função para obter dados de array seguros
  const getSafeArray = (data: any, field: string, fallback: any[] = []) => {
    const value = getSafeData(data, field, fallback);
    if (Array.isArray(value)) {
      return value;
    }
    return fallback;
  };

  useEffect(() => {
    const loadPerformanceData = async () => {
      if (!sellerProfile?.referral_code) {
        console.log('No referral code found:', sellerProfile);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Loading performance data for referral code:', sellerProfile.referral_code);

        const { data, error: rpcError } = await supabase.rpc(
          'get_seller_individual_performance',
          { seller_referral_code_param: sellerProfile.referral_code }
        );

        console.log('RPC response:', { data, error: rpcError });

        if (rpcError) {
          throw new Error(`Failed to load performance data: ${rpcError.message}`);
        }

        if (data && data.length > 0) {
          console.log('Performance data loaded:', data[0]);
          console.log('Data structure:', {
            total_students: data[0].total_students,
            total_revenue: data[0].total_revenue,
            monthly_students: data[0].monthly_students,
            conversion_rate: data[0].conversion_rate,
            ranking_position: data[0].ranking_position,
            monthly_data: data[0].monthly_data,
            monthly_goals: data[0].monthly_goals,
            achievements: data[0].achievements
          });
          setPerformanceData(data[0]);
        } else {
          throw new Error('No performance data found');
        }
      } catch (err: any) {
        console.error('Error loading performance data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPerformanceData();
  }, [sellerProfile?.referral_code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading performance data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <TrendingUp className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-red-800">Error loading data</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <TrendingUp className="h-6 w-6 text-yellow-600" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-yellow-800">No data found</h3>
        <p className="mt-1 text-sm text-yellow-700">
          Could not load performance data. Please check your permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance & Metrics</h2>
          <p className="text-gray-600">Analyze your performance and revenue</p>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{getSafeNumber(performanceData, 'total_students', 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(getSafeNumber(performanceData, 'total_revenue', 0))}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{getSafeNumber(performanceData, 'monthly_students', 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {getSafeNumber(performanceData, 'conversion_rate', 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking e Metas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ranking */}
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ranking</h3>
            <Award className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-600 mb-2">
              {getSafeNumber(performanceData, 'ranking_position', 0)}º
            </div>
            <p className="text-gray-600">Position among sellers</p>
          </div>
        </div>

        {/* Metas Mensais */}
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Goals</h3>
            <Target className="h-6 w-6 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Students</span>
                <span className="font-medium">{(getSafeNumber(performanceData, 'monthly_students', 0))}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(((getSafeNumber(performanceData, 'monthly_students', 0)) / 10) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Revenue</span>
                <span className="font-medium">{formatCurrency(getSafeNumber(performanceData, 'total_revenue', 0))}/$500</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(((getSafeNumber(performanceData, 'total_revenue', 0)) / 500) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conquistas */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
          <Award className="h-6 w-6 text-purple-500" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'First Student',
              description: 'Referred first student',
              unlocked: (getSafeNumber(performanceData, 'total_students', 0)) >= 1,
              color: 'green'
            },
            {
              title: 'Bronze Seller',
              description: 'Referred 5 students',
              unlocked: (getSafeNumber(performanceData, 'total_students', 0)) >= 5,
              color: 'yellow'
            },
            {
              title: 'Silver Seller',
              description: 'Referred 10 students',
              unlocked: (getSafeNumber(performanceData, 'total_students', 0)) >= 10,
              color: 'gray'
            },
            {
              title: 'Gold Seller',
              description: 'Referred 25 students',
              unlocked: (getSafeNumber(performanceData, 'total_students', 0)) >= 25,
              color: 'yellow'
            },
            {
              title: 'First Revenue',
              description: 'Generated first revenue',
              unlocked: (getSafeNumber(performanceData, 'total_revenue', 0)) > 0,
              color: 'green'
            },
            {
              title: 'Monthly Goal',
              description: 'Achieved monthly student goal',
              unlocked: (getSafeNumber(performanceData, 'monthly_students', 0)) >= 5,
              color: 'blue'
            }
          ].map((achievement, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 border-2 transition-all duration-200 ${
                achievement.unlocked
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  achievement.unlocked
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Award className="h-5 w-5" />
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${
                    achievement.unlocked ? 'text-green-800' : 'text-gray-500'
                  }`}>
                    {achievement.title}
                  </h4>
                  <p className={`text-xs ${
                    achievement.unlocked ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dados Mensais */}
      {(() => {
        const monthlyData = getSafeArray(performanceData, 'monthly_data', []);
        if (monthlyData && monthlyData.length > 0) {
          return (
            <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Performance Last 6 Months</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {monthlyData.map((month: any, index: number) => (
                  <div key={index} className="rounded-lg bg-gray-50 p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{month?.month || `Month ${index + 1}`}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-medium">{month?.students || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-medium">{formatCurrency(month?.revenue || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default Performance;

