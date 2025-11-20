import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Award, Target, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { getRealPaidAmounts } from '../../utils/paymentConverter';

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
  const [studentSystemTypes, setStudentSystemTypes] = useState<{[key: string]: string}>({});
  const [studentRealPaidAmounts, setStudentRealPaidAmounts] = useState<Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }>>({});
  const [loadingRealPaidAmounts, setLoadingRealPaidAmounts] = useState<boolean>(true);
  const [originalMonthlyData, setOriginalMonthlyData] = useState<PerformanceData['monthly_data']>([]);
  const [adjustedMonthlyData, setAdjustedMonthlyData] = useState<PerformanceData['monthly_data']>([]);
  const [rpcTotalRevenue, setRpcTotalRevenue] = useState<number>(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Função para deduplificar estudantes como no MyStudents.tsx e Overview.tsx
  const getUniqueStudents = React.useMemo(() => {
    if (!students || students.length === 0) return [];
    
    // Agrupar por estudante para remover duplicatas (mesma lógica do MyStudents.tsx)
    const groupedByStudent = new Map<string, any>();
    students.forEach(student => {
      const studentId = student.id;
      if (!groupedByStudent.has(studentId)) {
        groupedByStudent.set(studentId, student);
      }
      // Se já existe, manter o primeiro (não sobrescrever)
    });
    
    return Array.from(groupedByStudent.values());
  }, [students]);

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
        .select('user_id, dependents, system_type')
        .eq('user_id', studentUserId) // 🚨 Usar user_id direto como no Overview corrigido
        .single();
      
      if (!error && data) {
        const deps = Number(data.dependents || 0);
        const systemType = data.system_type || 'legacy';
        console.log('🔍 [PERFORMANCE] Dependents e system_type carregados para', student.email, ':', deps, systemType);
        setStudentDependents(prev => ({ ...prev, [studentUserId]: deps }));
        setStudentSystemTypes(prev => ({ ...prev, [studentUserId]: systemType }));
      } else {
        console.log('🔍 [PERFORMANCE] Nenhum dependent encontrado para', student.email, '- usando 0 e legacy');
        setStudentDependents(prev => ({ ...prev, [studentUserId]: 0 }));
        setStudentSystemTypes(prev => ({ ...prev, [studentUserId]: 'legacy' }));
      }
    } catch (err) {
      console.warn('🔍 [PERFORMANCE] Erro ao carregar dependents para', student.email, ':', err);
      setStudentDependents(prev => ({ ...prev, [studentUserId]: 0 }));
      setStudentSystemTypes(prev => ({ ...prev, [studentUserId]: 'legacy' }));
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
        const rpcResult = await supabase.rpc('get_user_fee_overrides', { target_user_id: studentUserId });
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
    
    const uniqueStudents = getUniqueStudents;
    console.log('🔄 [PERFORMANCE] Carregando dados para', uniqueStudents.length, 'estudantes únicos de', students.length, 'originais');
    
    uniqueStudents.forEach((s: any) => {
      if (s.id && !studentPackageFees[s.id]) loadStudentPackageFees(s.id);
      if (s.id && studentDependents[s.id] === undefined) loadStudentDependents(s); // Passa o student completo
      if (s.id && studentFeeOverrides[s.id] === undefined) loadStudentFeeOverrides(s.id);
    });
  }, [getUniqueStudents]); // Usar getUniqueStudents em vez de students

  // Carregar valores reais pagos para todos os estudantes (mantém loading até carregar tudo)
  useEffect(() => {
    const loadRealPaidAmounts = async () => {
      const uniqueUserIds = Array.from(new Set((students || []).map((s) => s.id).filter(Boolean)));
      if (uniqueUserIds.length === 0) {
        setStudentRealPaidAmounts({});
        setLoadingRealPaidAmounts(false);
        return;
      }
      
      setLoadingRealPaidAmounts(true);
      const amountsMap: Record<string, { selection_process?: number; scholarship?: number; i20_control?: number }> = {};
      
      await Promise.allSettled(uniqueUserIds.map(async (userId) => {
        try {
          const amounts = await getRealPaidAmounts(userId, ['selection_process', 'scholarship', 'i20_control']);
          amountsMap[userId] = amounts;
        } catch (error) {
          console.error(`Erro ao buscar valores pagos para user_id ${userId}:`, error);
        }
      }));
      
      setStudentRealPaidAmounts(amountsMap);
      setLoadingRealPaidAmounts(false);
    };
    loadRealPaidAmounts();
  }, [students]);

  const calculateStudentAdjustedPaid = (student: any): number => {
    let total = 0;
    // ✅ CORREÇÃO: Usar valores reais pagos quando disponíveis, senão calcular com fallback
    const realPaid = studentRealPaidAmounts[student.id] || studentRealPaidAmounts[student.user_id] || {};
    const studentId = student.id || student.user_id;
    const deps = studentDependents[studentId] || 0;
    const systemType = studentSystemTypes[studentId] || 'legacy';
    const overrides = studentFeeOverrides[studentId] || {};

    // Selection Process Fee
    if (student.has_paid_selection_process_fee) {
      if (realPaid.selection_process !== undefined && realPaid.selection_process > 0) {
        // Usar valor real pago quando disponível
        total += realPaid.selection_process;
      } else {
        // Fallback: calcular baseado no system_type e dependents
        const baseSelDefault = systemType === 'simplified' ? 350 : 400;
        const baseSel = overrides.selection_process_fee != null ? Number(overrides.selection_process_fee) : baseSelDefault;
        const selPaid = overrides.selection_process_fee != null ? baseSel : baseSel + (deps * 150);
        total += selPaid;
      }
    }
    
    // Scholarship Fee
    if (student.is_scholarship_fee_paid) {
      if (realPaid.scholarship !== undefined && realPaid.scholarship > 0) {
        // Usar valor real pago quando disponível
        total += realPaid.scholarship;
      } else {
        // Fallback: calcular baseado no system_type
        const schBaseDefault = systemType === 'simplified' ? 550 : 900;
        const schBase = overrides.scholarship_fee != null ? Number(overrides.scholarship_fee) : schBaseDefault;
        total += schBase;
      }
    }
    
    // I-20 Control Fee
    if (student.has_paid_i20_control_fee) {
      if (realPaid.i20_control !== undefined && realPaid.i20_control > 0) {
        // Usar valor real pago quando disponível
        total += realPaid.i20_control;
      } else {
        // Fallback: usar override ou valor padrão
        const i20Base = overrides.i20_control_fee != null ? Number(overrides.i20_control_fee) : 900;
        total += i20Base;
      }
    }
    
    // ⚠️ IMPORTANTE: Application fee NÃO é contabilizada na receita do seller (é exclusiva da universidade)
    // Por isso não incluímos student.is_application_fee_paid no cálculo

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
    if (!performanceData) return;
    
    // Usar um timeout para evitar updates muito frequentes
    const timeoutId = setTimeout(() => {
      try {
        const uniqueStudents = getUniqueStudents;
        if (!uniqueStudents || uniqueStudents.length === 0) return;
        
        const adjustedRevenue = uniqueStudents.reduce((sum: number, s: any) => sum + calculateStudentAdjustedPaid(s), 0);
        
        console.log('💰 [PERFORMANCE_TOTAL] Total calculado no Performance.tsx:', adjustedRevenue);
        console.log('💰 [PERFORMANCE_TOTAL] Estudantes únicos:', uniqueStudents.length, 'de', students.length, 'originais');
        
        // Debug para comparar com MyStudents.tsx
        console.log('🔍 [PERFORMANCE_COMPARISON] Estudantes únicos no Performance:', uniqueStudents.map(s => ({ 
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
  }, [getUniqueStudents, studentPackageFees, studentDependents, studentFeeOverrides, rpcTotalRevenue, originalMonthlyData, performanceData]); // Incluído getUniqueStudents

  // Debug específico para checar discrepância do Irving
  useEffect(() => {
    const uniqueStudents = getUniqueStudents;
    const target = uniqueStudents.find((s: any) => s?.email === 'irving1745@uorak.com');
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
  }, [getUniqueStudents, studentPackageFees, studentDependents]);

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

