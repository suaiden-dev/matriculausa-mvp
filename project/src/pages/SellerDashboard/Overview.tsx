import React from 'react';
import { supabase } from '../../lib/supabase';
import { useState as useStateReact, useEffect } from 'react';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import {
  GraduationCap,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Activity,
  Target
} from 'lucide-react';

interface OverviewProps {
  stats: {
    totalStudents: number;
    totalRevenue: number;
    monthlyStudents: number;
    conversionRate: number;
  };
  sellerProfile: any;
  students: any[];
  onRefresh: () => void;
  onNavigate?: (view: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ stats, sellerProfile, students = [], onRefresh, onNavigate }) => {
  const recentStudents = students.slice(0, 5);
  const { getFeeAmount } = useFeeConfig(); // Para valores padrão, será usado para overrides específicos por estudante
  const [studentPackageFees, setStudentPackageFees] = useStateReact<{[key: string]: any}>({});
  const [studentDependents, setStudentDependents] = useStateReact<{[key: string]: number}>({});
  const [studentFeeOverrides, setStudentFeeOverrides] = useStateReact<{[key: string]: any}>({});
  const [studentSystemTypes, setStudentSystemTypes] = useStateReact<{[key: string]: string}>({});
  const [loadingCalc, setLoadingCalc] = useStateReact<boolean>(false);

  // Debug específico para investigar discrepância de receita
  useEffect(() => {
    const target = students.find((s: any) => s?.email === 'irving1745@uorak.com');
    if (target) {
      const packageFees = studentPackageFees[target.id];
      const deps = studentDependents[target.id] || 0;
      console.log('[OVERVIEW][DEBUG] Irving student data:', {
        id: target.id,
        email: target.email,
        has_paid_selection_process_fee: target.has_paid_selection_process_fee,
        has_paid_i20_control_fee: target.has_paid_i20_control_fee,
        is_scholarship_fee_paid: target.is_scholarship_fee_paid,
        is_application_fee_paid: target.is_application_fee_paid,
        dependents: deps,
        packageFees
      });
      console.log('[OVERVIEW][DEBUG] Irving calculated total:', calculateStudentAdjustedPaid(target));
    }
  }, [students, studentPackageFees, studentDependents]);

  // Carregar taxas do pacote (RPC), dependentes do perfil e overrides em lote para reduzir latência e flicker
  useEffect(() => {
    const preload = async () => {
      const ids = (students || []).map((s: any) => s.id).filter(Boolean);
      console.log('🔄 [OVERVIEW] Carregando dados de cálculo para', ids.length, 'estudantes');
      const idsToLoadFees = ids.filter((id: string) => studentPackageFees[id] === undefined);
      const idsToLoadDeps = ids.filter((id: string) => studentDependents[id] === undefined);
      const idsToLoadOverrides = ids.filter((id: string) => studentFeeOverrides[id] === undefined);
      if (ids.length === 0 || (idsToLoadFees.length === 0 && idsToLoadDeps.length === 0 && idsToLoadOverrides.length === 0)) return;
      setLoadingCalc(true);
      try {
        // 🚨 CRITICAL: Usar mesma lógica do MyStudents.tsx para consistência
        // Buscar dependents e system_type por user_id (student ID) diretamente
        if (idsToLoadDeps.length > 0) {
          console.log('🔍 [OVERVIEW] Carregando dependents e system_type para student IDs:', idsToLoadDeps);
          
          const { data: depsRows, error: depsError } = await supabase
            .from('user_profiles')
            .select('user_id, dependents, system_type')
            .in('user_id', idsToLoadDeps); // Buscar por user_id (student ID) como MyStudents
          
          if (!depsError && depsRows) {
            const newDeps: {[key: string]: number} = {};
            const newSystemTypes: {[key: string]: string} = {};
            // Inicializar todos como 0 e 'legacy'
            idsToLoadDeps.forEach((id: string) => { 
              newDeps[id] = 0; 
              newSystemTypes[id] = 'legacy';
            });
            
            // Mapear resultados diretamente
            depsRows.forEach((r: any) => {
              if (r.user_id) {
                const deps = Number(r.dependents || 0);
                const systemType = r.system_type || 'legacy';
                newDeps[r.user_id] = deps;
                newSystemTypes[r.user_id] = systemType;
                console.log('🔍 [OVERVIEW] Dependents e system_type para', r.user_id, ':', deps, systemType);
              }
            });
            
            setStudentDependents(prev => ({ ...prev, ...newDeps }));
            setStudentSystemTypes(prev => ({ ...prev, ...newSystemTypes }));
          } else {
            console.warn('🔍 [OVERVIEW] Erro ao carregar dependents e system_type:', depsError);
            const newDeps: {[key: string]: number} = {};
            const newSystemTypes: {[key: string]: string} = {};
            idsToLoadDeps.forEach((id: string) => { 
              newDeps[id] = 0; 
              newSystemTypes[id] = 'legacy';
            });
            setStudentDependents(prev => ({ ...prev, ...newDeps }));
            setStudentSystemTypes(prev => ({ ...prev, ...newSystemTypes }));
          }
        }

        // 🚨 CRITICAL: HABILITAR overrides para consistência com MyStudents.tsx
        // O wilfried8078@uorak.com precisa mostrar $2,398 que é o valor COM override
        if (idsToLoadOverrides.length > 0) {
          console.log('🔄 [OVERVIEW] Carregando overrides para:', idsToLoadOverrides.length, 'estudantes');
          
          const results = await Promise.allSettled(idsToLoadOverrides.map(async (id: string) => {
            try {
              // Tentar primeiro via RPC function (security definer)
              const rpcResult = await supabase.rpc('get_user_fee_overrides', { target_user_id: id });
              if (!rpcResult.error && rpcResult.data) {
                return { id, overrides: rpcResult.data };
              } else {
                // Fallback para query direta
                const directResult = await supabase
                  .from('user_fee_overrides')
                  .select('*')
                  .eq('user_id', id)
                  .single();
                return { id, overrides: directResult.data, error: directResult.error };
              }
            } catch (error) {
              console.warn('⚠️ [OVERVIEW] Erro ao carregar override para', id, ':', error);
              return { id, overrides: null, error };
            }
          }));
          
          const newOverrides: {[key: string]: any} = {};
          results.forEach((res: any, idx: number) => {
            const id = idsToLoadOverrides[idx];
            if (res.status === 'fulfilled' && !res.value.error && res.value.overrides) {
              newOverrides[id] = res.value.overrides;
              // Debug log para wilfried8078@uorak.com
              if (id === '01fc762b-de80-4509-893f-671c71ceb0b1') {
                console.log('🔍 [OVERVIEW_LOAD] Carregando overrides para wilfried8078@uorak.com:', {
                  id,
                  overrides: res.value.overrides
                });
              }
            } else {
              newOverrides[id] = null;
            }
          });
          
          setStudentFeeOverrides(prev => ({ ...prev, ...newOverrides }));
        }


        // Taxas do pacote (sem endpoint em lote: paralelizar por aluno e consolidar setState)
        if (idsToLoadFees.length > 0) {
          const results = await Promise.allSettled(idsToLoadFees.map((id: string) =>
            supabase.rpc('get_user_package_fees', { user_id_param: id })
          ));
          const newFees: {[key: string]: any} = {};
          results.forEach((res: any, idx: number) => {
            const id = idsToLoadFees[idx];
            if (res.status === 'fulfilled' && res.value && !res.value.error) {
              const arr = res.value.data;
              newFees[id] = (arr && arr.length > 0) ? arr[0] : null;
            } else {
              newFees[id] = null;
            }
          });
          setStudentPackageFees(prev => ({ ...prev, ...newFees }));
        }
      } finally {
        setLoadingCalc(false);
      }
    };
    preload();
  }, [students]);



  const calculateStudentAdjustedPaid = (student: any): number => {
    let total = 0;
    const deps = studentDependents[student.id] || 0;
    // 🚨 CRITICAL: Usar overrides como no MyStudents.tsx para consistência
    const overrides = studentFeeOverrides[student.id];

    // Calculando total para o estudante

    if (student.has_paid_selection_process_fee) {
      // � CORREÇÃO: Usar mesma lógica do MyStudents.tsx - verificar override primeiro
      if (overrides && overrides.selection_process_fee !== undefined && overrides.selection_process_fee !== null) {
        // ✅ Se há override, usar exatamente o valor do override (já inclui dependentes)
        const selectionAmount = Number(overrides.selection_process_fee);
        total += selectionAmount;
        if (isDebugStudent) {
          console.log('🔍 [OVERVIEW_DEBUG] Selection Process (override):', selectionAmount, 'de', overrides.selection_process_fee);
        }
      } else {
        // Sem override: usar taxa baseada no system_type + dependentes
        const systemType = studentSystemTypes[student.id] || 'legacy';
        const baseSelectionFee = systemType === 'simplified' ? 350 : 400;
        const selectionAmount = baseSelectionFee + (deps * 150);
        total += selectionAmount;
        if (isDebugStudent) {
          console.log('🔍 [OVERVIEW_DEBUG] Selection Process (system_type + deps):', selectionAmount, '=', baseSelectionFee, '+', (deps * 150), 'system_type:', systemType);
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
          console.log('🔍 [OVERVIEW_DEBUG] Scholarship (override):', scholarshipAmount, 'de', overrides.scholarship_fee);
        }
      } else {
        // Sem override: usar taxa baseada no system_type
        const systemType = studentSystemTypes[student.id] || 'legacy';
        const scholarshipFee = systemType === 'simplified' ? 550 : 900;
        total += scholarshipFee;
        if (isDebugStudent) {
          console.log('🔍 [OVERVIEW_DEBUG] Scholarship (system_type):', scholarshipFee, 'system_type:', systemType);
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
          console.log('🔍 [OVERVIEW_DEBUG] I-20 Control (override):', i20Amount, 'de', overrides.i20_control_fee);
        }
      } else {
        // Sem override: I-20 Control Fee é sempre $900 para ambos os sistemas
        const baseI20Fee = 900;
        total += baseI20Fee;
        if (isDebugStudent) {
          console.log('🔍 [OVERVIEW_DEBUG] I-20 Control (padrão):', baseI20Fee);
        }
      }
    }
    
    // Application fee não entra na receita do seller
    if (isDebugStudent) {
      console.log('🔍 [OVERVIEW_DEBUG] Total final:', total);
      console.log('🔍 [OVERVIEW_DEBUG] =================================');
    }
    
    return total;
  };

  // Função para deduplificar estudantes como no MyStudents.tsx
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

  const adjustedTotalRevenue = React.useMemo(() => {
    const uniqueStudents = getUniqueStudents;
    if (!uniqueStudents || uniqueStudents.length === 0) return 0;
    
    const total = uniqueStudents.reduce((sum: number, s: any) => sum + calculateStudentAdjustedPaid(s), 0);
    
    console.log('💰 [OVERVIEW_TOTAL] Total calculado no Overview.tsx:', total);
    console.log('💰 [OVERVIEW_TOTAL] Estudantes únicos:', uniqueStudents.length, 'de', students.length, 'originais');
    
    // Debug para comparar com MyStudents.tsx
    console.log('🔍 [OVERVIEW_COMPARISON] Estudantes únicos no Overview:', uniqueStudents.map(s => ({ 
      id: s.id, 
      email: s.email,
      has_paid_selection_process: s.has_paid_selection_process_fee,
      has_paid_scholarship: s.is_scholarship_fee_paid,
      has_paid_i20: s.has_paid_i20_control_fee,
      calculated: calculateStudentAdjustedPaid(s)
    })));
    
    return total;
  }, [getUniqueStudents, studentPackageFees, studentDependents, studentFeeOverrides]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleViewAllStudents = () => {
    // Usar o sistema de views interno em vez de navegação por URL
    if (onNavigate) {
      onNavigate('students');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const quickActions = [
    {
      title: 'View Students',
      description: 'View all referenced students',
      icon: GraduationCap,
      color: 'bg-blue-500',
      count: stats.totalStudents,
      view: 'students'
    },
    {
      title: 'Affiliate Tools',
      description: 'Access tools to increase sales',
      icon: Target,
      color: 'bg-blue-600',
      count: `${stats.conversionRate}%`,
      view: 'affiliate-tools'
    },
    {
      title: 'Performance',
      description: 'Analyze metrics and performance',
      icon: TrendingUp,
      color: 'bg-blue-700',
      count: formatCurrency(adjustedTotalRevenue),
      view: 'performance'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>

        </div>
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
              <p className="text-sm font-medium text-slate-500 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalStudents}</p>
              <div className="flex items-center mt-2">
                <GraduationCap className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">{stats.monthlyStudents} this month</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
              {loadingCalc ? (
                <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
              ) : (
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(adjustedTotalRevenue)}</p>
              )}
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                {loadingCalc ? (
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                ) : (
                <span className="text-sm font-medium text-emerald-600">
                  {getUniqueStudents.length > 0 ? (adjustedTotalRevenue / getUniqueStudents.length).toFixed(2) : 0} per student
                </span>
                )}
              </div>
            </div>
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Monthly Students</p>
              <p className="text-3xl font-bold text-slate-900">{stats.monthlyStudents}</p>
              <div className="flex items-center mt-2">
                <Activity className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">
                  {stats.totalStudents > 0 ? ((stats.monthlyStudents / stats.totalStudents) * 100).toFixed(1) : 0}% of total
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-slate-900">{stats.conversionRate}%</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">
                  Goal: 90%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Target className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, index) => {
          return (
            <div 
              key={index} 
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => onNavigate && onNavigate(action.view)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center">
                  {action.view === 'performance' && loadingCalc ? (
                    <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
                  ) : (
                  <span className="text-2xl font-bold text-slate-900">{action.count}</span>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{action.title}</h3>
              <p className="text-slate-600 text-sm mb-4">{action.description}</p>
              <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700 transition-colors">
                Access
                <ArrowUpRight className="h-4 w-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Sales Performance */}
      {getUniqueStudents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-slate-900">Top Sales Performance</h2>
                <p className="text-slate-500 text-sm break-words">
                  Ranking of your top performing students by revenue
                </p>
              </div>
              <div 
                onClick={handleViewAllStudents}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center cursor-pointer self-start sm:self-auto"
              >
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* Top 3 Students by Revenue */}
              {(loadingCalc ? getUniqueStudents : getUniqueStudents)
                .sort((a, b) => (calculateStudentAdjustedPaid(b) || 0) - (calculateStudentAdjustedPaid(a) || 0))
                .slice(0, 3)
                .map((student, index) => (
                  <div 
                    key={student.id || index} 
                    className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:bg-slate-100 transition-all duration-300 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Ranking Number */}
                        <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-700 flex-shrink-0">
                          {index + 1}
                        </div>
                        
                        {/* Student Info */}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-lg break-words">{student.full_name}</p>
                          <p className="text-sm text-slate-600 break-words">{student.email}</p>
                          
                        </div>
                      </div>
                      
                      {/* Revenue Metrics */}
                      <div className="text-left sm:text-right">
                        <div className="space-y-1">
                          <div className="flex items-center sm:justify-end space-x-2">
                            {loadingCalc ? (
                              <div className="h-6 w-28 bg-slate-200 rounded animate-pulse" />
                            ) : (
                            <span className="text-2xl font-bold text-slate-900 whitespace-nowrap">
                                {formatCurrency(calculateStudentAdjustedPaid(student) || 0)}
                            </span>
                            )}
                            {!loadingCalc && <span className="text-sm text-slate-500">revenue</span>}
                          </div>
                          <div className="text-sm font-medium text-slate-700">
                            {loadingCalc ? (
                              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                            ) : (
                              formatDate(student.created_at)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              
              {/* Additional Top Students (4th to 6th place) */}
              {getUniqueStudents.length > 3 && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-600 mb-3">Other Top Performers</h4>
                  <div className="space-y-3">
                    {(loadingCalc ? getUniqueStudents : getUniqueStudents)
                      .sort((a, b) => (calculateStudentAdjustedPaid(b) || 0) - (calculateStudentAdjustedPaid(a) || 0))
                      .slice(3, 6)
                      .map((student, index) => (
                        <div 
                          key={student.id || index + 3} 
                          className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-8 h-8 bg-slate-300 rounded-lg flex items-center justify-center text-white text-xs font-medium">
                                {index + 4}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 break-words">{student.full_name}</p>
                                <p className="text-xs text-slate-500 break-words">{student.email}</p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <div className="flex items-center sm:justify-end space-x-4">
                                {loadingCalc ? (
                                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                                ) : (
                                <span className="text-sm text-slate-700 font-medium whitespace-nowrap">
                                    {formatCurrency(calculateStudentAdjustedPaid(student) || 0)}
                                </span>
                                )}
                                {loadingCalc ? (
                                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                                ) : (
                                <span className="text-xs text-slate-500">
                                  {formatDate(student.created_at)}
                                </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {recentStudents.length === 0 && (
        <div className="text-center py-16 bg-blue-50/50 rounded-2xl border border-blue-100">
          <div className="text-slate-400 mb-4">
            <GraduationCap className="h-16 w-16 mx-auto text-blue-300" />
          </div>
          <h3 className="text-xl font-medium text-slate-900 mb-3">No referenced students yet</h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Start using your referral code to reference students and see your metrics here.
          </p>
          <div className="mt-6">
            <div className="inline-flex items-center px-4 py-2 bg-white border-2 border-blue-200 rounded-lg">
              <span className="text-sm text-slate-600 mr-2">Your code:</span>
              <code className="text-blue-700 font-mono font-bold">{sellerProfile?.referral_code}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
