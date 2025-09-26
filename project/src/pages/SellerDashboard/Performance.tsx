import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Award, Target, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';

interface PerformanceProps {
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

const Performance: React.FC<PerformanceProps> = ({ sellerProfile, students }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getFeeAmount } = useFeeConfig(); // Para valores padrão, será usado para overrides específicos por estudante
  const [studentPackageFees, setStudentPackageFees] = useState<{[key: string]: any}>({});
  const [studentDependents, setStudentDependents] = useState<{[key: string]: number}>({});
  const [studentFeeOverrides, setStudentFeeOverrides] = useState<{[key: string]: any}>({});
  const [originalMonthlyData, setOriginalMonthlyData] = useState<PerformanceData['monthly_data']>([]);
  const [adjustedMonthlyData, setAdjustedMonthlyData] = useState<PerformanceData['monthly_data']>([]);
  const [rpcTotalRevenue, setRpcTotalRevenue] = useState<number>(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Helpers para carregar pacotes e dependentes
  const loadStudentPackageFees = async (studentUserId: string) => {
    if (!studentUserId || studentPackageFees[studentUserId]) return;
    try {
      const { data: packageFees, error } = await supabase.rpc('get_user_package_fees', {
        user_id_param: studentUserId
      });
      if (!error && packageFees && packageFees.length > 0) {
        setStudentPackageFees(prev => ({ ...prev, [studentUserId]: packageFees[0] }));
      } else {
        setStudentPackageFees(prev => ({ ...prev, [studentUserId]: null }));
      }
    } catch {
      setStudentPackageFees(prev => ({ ...prev, [studentUserId]: null }));
    }
  };

  const loadStudentDependents = async (student: any) => {
    const studentUserId = student.id;
    if (!studentUserId || studentDependents[studentUserId] !== undefined) return;
    
    // 🚨 CRITICAL: Usar user_id para buscar dependentes, como no Overview.tsx corrigido
    console.log('🔍 [PERFORMANCE] Carregando dependents para', student.email, 'user_id:', studentUserId);
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, dependents')
        .eq('user_id', studentUserId) // 🚨 Usar user_id direto como no Overview corrigido
        .single();
      
      if (!error && data) {
        const deps = Number(data.dependents || 0);
        console.log('🔍 [PERFORMANCE] Dependents carregados para', student.email, ':', deps);
        setStudentDependents(prev => ({ ...prev, [studentUserId]: deps }));
      } else {
        console.log('🔍 [PERFORMANCE] Nenhum dependent encontrado para', student.email, '- usando 0');
        setStudentDependents(prev => ({ ...prev, [studentUserId]: 0 }));
      }
    } catch (err) {
      console.warn('🔍 [PERFORMANCE] Erro ao carregar dependents para', student.email, ':', err);
      setStudentDependents(prev => ({ ...prev, [studentUserId]: 0 }));
    }
  };

  const loadStudentFeeOverrides = async (studentUserId: string) => {
    if (!studentUserId || studentFeeOverrides[studentUserId] !== undefined) return;
    
    // 🚨 CRITICAL: HABILITAR overrides para consistência com MyStudents.tsx
    // O wilfried8078@uorak.com precisa mostrar $2,398 que é o valor COM override
    console.log('🔄 [PERFORMANCE] Carregando overrides para:', studentUserId);
    
    try {
      // Tentar primeiro via RPC function (security definer)
      let overrides = null;
      let error = null;

      try {
        const rpcResult = await supabase.rpc('get_user_fee_overrides', { user_id_param: studentUserId });
        if (!rpcResult.error && rpcResult.data) {
          overrides = rpcResult.data;
          // Debug log para wilfried8078@uorak.com
          if (studentUserId === '01fc762b-de80-4509-893f-671c71ceb0b1') {
            console.log('🔍 [PERFORMANCE_LOAD] Carregando overrides para wilfried8078@uorak.com:', {
              studentUserId,
              overrides
            });
          }
        } else {
          error = rpcResult.error;
        }
      } catch (rpcError) {
        console.warn('⚠️ [PERFORMANCE] RPC get_user_fee_overrides failed, trying direct query:', rpcError);
        // Fallback para query direta
        const directResult = await supabase
          .from('user_fee_overrides')
          .select('*')
          .eq('user_id', studentUserId)
          .single();
        overrides = directResult.data;
        error = directResult.error;
      }
      
      if (!error && overrides) {
        setStudentFeeOverrides(prev => ({ ...prev, [studentUserId]: overrides }));
      } else {
        setStudentFeeOverrides(prev => ({ ...prev, [studentUserId]: null }));
      }
    } catch (error) {
      console.warn('⚠️ [PERFORMANCE] Erro ao carregar override para', studentUserId, ':', error);
      setStudentFeeOverrides(prev => ({ ...prev, [studentUserId]: null }));
    }
    return;

  };

  useEffect(() => {
    if (!students || students.length === 0) return;
    
    console.log('🔄 [PERFORMANCE] Carregando dados para', students.length, 'estudantes');
    
    (students || []).forEach((s: any) => {
      if (s.id && !studentPackageFees[s.id]) loadStudentPackageFees(s.id);
      if (s.id && studentDependents[s.id] === undefined) loadStudentDependents(s); // Passa o student completo
      if (s.id && studentFeeOverrides[s.id] === undefined) loadStudentFeeOverrides(s.id);
    });
  }, [students]); // Removidas as outras dependências para evitar loop infinito



  const calculateStudentAdjustedPaid = (student: any): number => {
    let total = 0;
    const deps = studentDependents[student.id] || 0;
    const overrides = studentFeeOverrides[student.id];

    // Debug específico para wilfried8078@uorak.com
    const isDebugStudent = student.email === 'wilfried8078@uorak.com';
    if (isDebugStudent) {
      console.log('🔍 [PERFORMANCE_DEBUG] =================================');
      console.log('🔍 [PERFORMANCE_DEBUG] Calculando total para:', student.email);
      console.log('🔍 [PERFORMANCE_DEBUG] Student ID:', student.id);
      console.log('🔍 [PERFORMANCE_DEBUG] Dependents:', deps);
      console.log('🔍 [PERFORMANCE_DEBUG] Overrides:', overrides);
      console.log('🔍 [PERFORMANCE_DEBUG] has_paid_selection_process_fee:', student.has_paid_selection_process_fee);
      console.log('🔍 [PERFORMANCE_DEBUG] has_paid_i20_control_fee:', student.has_paid_i20_control_fee);
      console.log('🔍 [PERFORMANCE_DEBUG] is_scholarship_fee_paid:', student.is_scholarship_fee_paid);
      if (overrides) {
        console.log('🔍 [PERFORMANCE_DEBUG] Override values:', {
          selection_process_fee: overrides.selection_process_fee,
          scholarship_fee: overrides.scholarship_fee,
          i20_control_fee: overrides.i20_control_fee
        });
      }
    }

    if (student.has_paid_selection_process_fee) {
      // 🚨 CORREÇÃO: Usar mesma lógica do MyStudents.tsx - verificar override primeiro
      if (overrides && overrides.selection_process_fee !== undefined && overrides.selection_process_fee !== null) {
        // ✅ Se há override, usar exatamente o valor do override (já inclui dependentes)
        const selectionAmount = Number(overrides.selection_process_fee);
        total += selectionAmount;
        if (isDebugStudent) {
          console.log('🔍 [PERFORMANCE_DEBUG] Selection Process (override):', selectionAmount, 'de', overrides.selection_process_fee);
        }
      } else {
        // Sem override: usar taxa padrão + dependentes
        const baseSelectionFee = getFeeAmount('selection_process');
        const selectionAmount = baseSelectionFee + (deps * 150);
        total += selectionAmount;
        if (isDebugStudent) {
          console.log('🔍 [PERFORMANCE_DEBUG] Selection Process (padrão + deps):', selectionAmount, '=', baseSelectionFee, '+', (deps * 150));
        }
      }
    }
    
    if (student.is_scholarship_fee_paid) {
      // 🚨 CORREÇÃO: Usar mesma lógica do MyStudents.tsx - verificar override primeiro
      if (overrides && overrides.scholarship_fee !== undefined && overrides.scholarship_fee !== null) {
        // ✅ Se há override, usar exatamente o valor do override
        const scholarshipAmount = Number(overrides.scholarship_fee);
        total += scholarshipAmount;
        if (isDebugStudent) {
          console.log('🔍 [PERFORMANCE_DEBUG] Scholarship (override):', scholarshipAmount, 'de', overrides.scholarship_fee);
        }
      } else {
        // Sem override: usar taxa padrão
        const scholarshipFee = getFeeAmount('scholarship_fee');
        total += scholarshipFee;
        if (isDebugStudent) {
          console.log('🔍 [PERFORMANCE_DEBUG] Scholarship (padrão):', scholarshipFee);
        }
      }
    }
    
    if (student.has_paid_i20_control_fee) {
      // 🚨 CORREÇÃO: Usar mesma lógica do MyStudents.tsx - verificar override primeiro
      if (overrides && overrides.i20_control_fee !== undefined && overrides.i20_control_fee !== null) {
        // ✅ Se há override, usar exatamente o valor do override
        const i20Amount = Number(overrides.i20_control_fee);
        total += i20Amount;
        if (isDebugStudent) {
          console.log('🔍 [PERFORMANCE_DEBUG] I-20 Control (override):', i20Amount, 'de', overrides.i20_control_fee);
        }
      } else {
        // Sem override: usar taxa padrão
        const baseI20Fee = getFeeAmount('i20_control_fee');
        total += baseI20Fee;
        if (isDebugStudent) {
          console.log('🔍 [PERFORMANCE_DEBUG] I-20 Control (padrão):', baseI20Fee);
        }
      }
    }
    
    // ⚠️ IMPORTANTE: Application fee NÃO é contabilizada na receita do seller (é exclusiva da universidade)
    // Por isso não incluímos student.is_application_fee_paid no cálculo

    if (isDebugStudent) {
      console.log('🔍 [PERFORMANCE_DEBUG] Total final:', total);
      console.log('🔍 [PERFORMANCE_DEBUG] =================================');
    }

    return total;
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
          'get_seller_individual_performance_with_dependents',
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
          // Guardar dados originais do RPC
          const rpcRevenue = getSafeNumber(data[0], 'total_revenue', 0);
          setRpcTotalRevenue(rpcRevenue);
          const rpcMonthly = getSafeArray(data[0], 'monthly_data', []);
          setOriginalMonthlyData(rpcMonthly);
          // Inicialmente usa o valor original e ajusta depois em outro efeito quando taxas/dependentes carregarem
          setPerformanceData({ ...data[0], total_revenue: rpcRevenue });
          setAdjustedMonthlyData(rpcMonthly);
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

  // Recalcular receita ajustada e monthly_data quando tivermos taxas/dependentes carregados
  useEffect(() => {
    if (!performanceData || !students || students.length === 0) return;
    
    // Usar um timeout para evitar updates muito frequentes
    const timeoutId = setTimeout(() => {
      try {
        const adjustedRevenue = students.reduce((sum: number, s: any) => sum + calculateStudentAdjustedPaid(s), 0);
        
        console.log('💰 [PERFORMANCE_TOTAL] Total calculado no Performance.tsx:', adjustedRevenue);
        console.log('💰 [PERFORMANCE_TOTAL] Número de estudantes no Performance.tsx:', students.length);
        
        // Debug para comparar com MyStudents.tsx
        console.log('🔍 [PERFORMANCE_COMPARISON] Estudantes no Performance:', students.map(s => ({ 
          id: s.id, 
          email: s.email,
          has_paid_selection_process: s.has_paid_selection_process_fee,
          has_paid_scholarship: s.is_scholarship_fee_paid,
          has_paid_i20: s.has_paid_i20_control_fee,
          calculated: calculateStudentAdjustedPaid(s)
        })));
        
        // Só atualizar se o valor mudou significativamente
        if (Math.abs(adjustedRevenue - (performanceData.total_revenue || 0)) > 1) {
          setPerformanceData(prev => prev ? { ...prev, total_revenue: adjustedRevenue } : prev);
        }
        
        // Ajustar monthly_data proporcionalmente ao fator de ajuste
        const base = rpcTotalRevenue || 0;
        const factor = base > 0 ? (adjustedRevenue / base) : 1;
        const adjustedMonthly = (originalMonthlyData || []).map((m: any) => ({
          ...m,
          revenue: Number(m?.revenue || 0) * factor
        }));
        setAdjustedMonthlyData(adjustedMonthly);
      } catch (e) {
        // Ignorar e manter dados originais
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [students, studentPackageFees, studentDependents, studentFeeOverrides, rpcTotalRevenue, originalMonthlyData]); // Incluído studentFeeOverrides

  // Debug específico para checar discrepância do Irving
  useEffect(() => {
    const target = (students || []).find((s: any) => s?.email === 'irving1745@uorak.com');
    if (target) {
      const packageFees = studentPackageFees[target.id];
      const deps = studentDependents[target.id] || 0;
      // eslint-disable-next-line no-console
      console.log('[PERFORMANCE][DEBUG] Irving student data:', {
        id: target.id,
        email: target.email,
        has_paid_selection_process_fee: target.has_paid_selection_process_fee,
        has_paid_i20_control_fee: target.has_paid_i20_control_fee,
        is_scholarship_fee_paid: target.is_scholarship_fee_paid,
        is_application_fee_paid: target.is_application_fee_paid,
        dependents: deps,
        packageFees,
        calculated: calculateStudentAdjustedPaid(target)
      });
    }
  }, [students, studentPackageFees, studentDependents]);

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
    <div className="min-h-screen">
      {/* Header + Tabs Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Performance & Metrics
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Analyze your performance and revenue metrics.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Track your progress, achievements, and ranking among sellers.
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Performance Analytics
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Comprehensive insights into your selling performance and achievements
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
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
        const monthlyData = (adjustedMonthlyData && adjustedMonthlyData.length > 0)
          ? adjustedMonthlyData
          : getSafeArray(performanceData, 'monthly_data', []);
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
      </div>
    </div>
  );
};

export default Performance;

