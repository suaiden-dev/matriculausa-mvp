import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { formatCentsToDollars } from '../../utils/currency';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  LineChart as LineChartIcon,
  Target
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
// Utilitário local para formatar dólares
const formatUSD = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Utilitário para formatar valores em centavos para dólares
const formatCentsToUSD = (cents: number) => formatUSD(Number(formatCentsToDollars(cents)));

// Normaliza valores que podem vir em dólares ou centavos para centavos
// Regras: se o número for grande (>= 10_000), consideramos que já está em centavos.
// Caso contrário, tratamos como dólares e convertemos para centavos.
const toCents = (value: number | null | undefined): number => {
  const n = Number(value);
  if (!isFinite(n) || isNaN(n)) return 0;
  return n >= 10000 ? Math.round(n) : Math.round(n * 100);
};

interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  conversionRate: number;
  averageTransactionValue: number;
  totalStudents: number;
  pendingPayouts: number;
  completedPayouts: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  payments: number;
  students: number;
}

interface PaymentMethodData {
  method: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface FeeTypeData {
  feeType: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface UniversityRevenueData {
  university: string;
  revenue: number;
  students: number;
  conversionRate: number;
}

const FinancialAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { feeConfig, getFeeAmount } = useFeeConfig();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
    conversionRate: 0,
    averageTransactionValue: 0,
    totalStudents: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  });

  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [feeTypeData, setFeeTypeData] = useState<FeeTypeData[]>([]);
  const [universityData, setUniversityData] = useState<UniversityRevenueData[]>([]);

  // Filtros de período
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Renderizador com Recharts (Revenue e Payments)
  const renderTrendChart = () => {
    if (!revenueData || revenueData.length === 0) {
      return (
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <LineChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No data for selected period</p>
          </div>
        </div>
      );
    }


    return (
      <ResponsiveContainer width="100%" height={256}>
        <ReLineChart data={revenueData} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tickFormatter={(v) => `$${formatCentsToUSD(Number(v))}`} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: any, _name: string, props: any) => {
            const num = Number(value);
            const key = props?.dataKey;
            if (key === 'revenue') {
              return `$${formatCentsToUSD(num)}`;
            }
            if (key === 'payments') {
              return `${Math.round(num)}`;
            }
            return formatUSD(num);
          }} />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#3B82F6" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="payments" name="Payments" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="4 4" />
        </ReLineChart>
      </ResponsiveContainer>
    );
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadFinancialData();
    }
  }, [user, timeFilter, customDateFrom, customDateTo]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeFilter) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (showCustomDate && customDateFrom && customDateTo) {
      return {
        start: new Date(customDateFrom),
        end: new Date(customDateTo)
      };
    }

    return { start: startDate, end: now };
  };

  // Normaliza fee types vindos de fontes diferentes (stripe/zelle/etc)
  const normalizeFeeType = (t: string | null | undefined, amount?: number): 'selection_process' | 'application' | 'scholarship' | 'i20_control_fee' => {
    const v = (t || '').toLowerCase();
    if (v === 'application_fee' || v === 'application') return 'application';
    if (v === 'scholarship_fee' || v === 'scholarship') return 'scholarship';
    if (v === 'i20_control_fee' || v === 'i-20_control_fee' || v === 'i20' || v === 'i20_control') return 'i20_control_fee';
    
    // Se não tem fee_type, tentar inferir pelo valor
    if (!t && amount !== undefined) {
      if (amount === getFeeAmount('selection_process')) return 'selection_process';
      if (amount === getFeeAmount('application_fee')) return 'application';
      if (amount === getFeeAmount('scholarship_fee')) return 'scholarship';
      if (amount === getFeeAmount('i20_control_fee')) return 'i20_control_fee';
    }
    
    return 'selection_process';
  };

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading financial analytics data...');

      const { start: startDate, end: endDate } = getDateRange();
      // Período anterior de mesmo tamanho
      const msRange = endDate.getTime() - startDate.getTime();
      const prevEnd = new Date(startDate.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - msRange);
      
      // 1. Buscar dados de aplicações de bolsas (período atual)
      const { data: applications, error: appsError } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id (
            id,
            user_id,
            full_name,
            email,
            has_paid_selection_process_fee,
            is_application_fee_paid,
            is_scholarship_fee_paid,
            has_paid_i20_control_fee,
            scholarship_package_id,
            dependents,
            created_at,
            selection_process_fee_payment_method,
            i20_control_fee_payment_method
          ),
          scholarships (
            id,
            title,
            amount,
            application_fee_amount,
            universities (
              id,
              name
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (appsError) throw appsError;

      // 1b. Buscar dados de aplicações de bolsas (período anterior)
      const { data: applicationsPrev, error: appsPrevError } = await supabase
        .from('scholarship_applications')
        .select(`
          *,
          user_profiles!student_id (
            id,
            user_id,
            has_paid_selection_process_fee,
            is_application_fee_paid,
            is_scholarship_fee_paid,
            has_paid_i20_control_fee,
            scholarship_package_id,
            dependents,
            created_at
          ),
          scholarships (
            id,
            universities (id)
          )
        `)
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString());

      if (appsPrevError) throw appsPrevError;

      // 2. Buscar pagamentos Zelle (período atual)
      const { data: zellePayments, error: zelleError } = await supabase
        .from('zelle_payments')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (zelleError) throw zelleError;

      // 2b. Pagamentos Zelle (período anterior)
      const { data: zellePaymentsPrev, error: zellePrevError } = await supabase
        .from('zelle_payments')
        .select('*')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString());

      if (zellePrevError) throw zellePrevError;

      // 2c. Dados globais (todos os estudantes registrados)
      const { data: allStudents, error: allStudentsError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'student');
      if (allStudentsError) throw allStudentsError;

      // 2d. Buscar usuários Stripe que pagaram mas não têm aplicação (igual ao PaymentManagement)
      const { data: stripeUsers, error: stripeError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          full_name,
          email,
          has_paid_selection_process_fee,
          is_application_fee_paid,
          is_scholarship_fee_paid,
          has_paid_i20_control_fee,
          scholarship_package_id,
          dependents,
          created_at,
          selection_process_fee_payment_method,
          i20_control_fee_payment_method
        `)
        .eq('role', 'student')
        .or('has_paid_selection_process_fee.eq.true,is_application_fee_paid.eq.true,is_scholarship_fee_paid.eq.true,has_paid_i20_control_fee.eq.true')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (stripeError) throw stripeError;

      // Busca global segura (evita 400): seleciona tudo e filtra no cliente

      // 3. Buscar requisições de pagamento universitário (primeiro tenta payout, depois payment)
      let universityRequests: any[] | null = null;
      const tryPayout = await supabase
        .from('university_payout_requests')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      if (!tryPayout.error) {
        universityRequests = tryPayout.data || [];
      } else {
        const tryPayment = await supabase
          .from('university_payment_requests')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        universityRequests = tryPayment.data || [];
      }

      // 4. Buscar requisições de afiliados
      const { data: affiliateRequests, error: affError } = await supabase
        .from('affiliate_payment_requests')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (affError) throw affError;

      // Processar dados e calcular métricas
      await processFinancialData(
        applications || [],
        zellePayments || [],
        universityRequests || [],
        affiliateRequests || [],
        { startDate, endDate },
        // dados período anterior
        applicationsPrev || [],
        zellePaymentsPrev || [],
        // globais
        allStudents || [],
        stripeUsers || []
      );

    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processFinancialData = async (
    applications: any[],
    zellePayments: any[],
    universityRequests: any[],
    affiliateRequests: any[],
    currentRange: { startDate: Date; endDate: Date },
    applicationsPrev: any[],
    zellePaymentsPrev: any[],
    allStudents: any[],
    stripeUsers: any[]
  ) => {
    console.log('📊 Processing financial data...');

    // Criar registros de pagamento apenas para taxas que foram realmente pagas (igual ao PaymentManagement)
    const paymentRecords: any[] = [];
    
    const paymentsByMethod: Record<string, { count: number; revenue: number }> = {
      'stripe': { count: 0, revenue: 0 },
      'zelle': { count: 0, revenue: 0 },
      'manual': { count: 0, revenue: 0 }
    };

    const paymentsByFeeType: Record<string, { count: number; revenue: number }> = {
      'selection_process': { count: 0, revenue: 0 },
      'application': { count: 0, revenue: 0 },
      'scholarship': { count: 0, revenue: 0 },
      'i20_control_fee': { count: 0, revenue: 0 }
    };

    const universityRevenue: Record<string, { revenue: number; students: number; paidStudents: number; name: string }> = {};
    
    // Carregar dados de pacotes para valores dinâmicos (igual ao PaymentManagement)
    const { data: packagesData } = await supabase
      .from('scholarship_packages')
      .select('*');
    
    const packageDataMap: { [key: string]: any } = {};
    packagesData?.forEach((pkg: any) => {
      packageDataMap[pkg.id] = pkg;
    });

    // Buscar overrides de taxas para todos os usuários (igual ao PaymentManagement)
    const allUserIds = [
      ...(applications?.map(app => app.user_profiles?.user_id).filter(Boolean) || []),
      ...(zellePayments?.map(payment => payment.user_profiles?.user_id).filter(Boolean) || []),
      ...(stripeUsers?.map(user => user.user_id).filter(Boolean) || [])
    ];
    const uniqueUserIds = [...new Set(allUserIds)];
    
    let overridesMap: { [key: string]: any } = {};
    if (uniqueUserIds.length > 0) {
      const overrideEntries = await Promise.allSettled(
        uniqueUserIds.map(async (userId) => {
          const { data, error } = await supabase.rpc('get_user_fee_overrides', { user_id_param: userId });
          return { userId, data: error ? null : data };
        })
      );
      
      overridesMap = overrideEntries.reduce((acc: { [key: string]: any }, res) => {
        if (res.status === 'fulfilled') {
          const { userId, data } = res.value;
          if (data) {
            acc[userId] = {
              selection_process_fee: data.selection_process_fee != null ? Number(data.selection_process_fee) : undefined,
              application_fee: data.application_fee != null ? Number(data.application_fee) : undefined,
              scholarship_fee: data.scholarship_fee != null ? Number(data.scholarship_fee) : undefined,
              i20_control_fee: data.i20_control_fee != null ? Number(data.i20_control_fee) : undefined,
            };
          }
        }
        return acc;
      }, {});
    }

    // Mapas para evitar duplicação de taxas globais (selection_process, i20_control e application_fee)
    const globalFeesProcessed: { [userId: string]: { selection_process: boolean; i20_control: boolean; application_fee: boolean } } = {};

    // Processar aplicações - criar registros apenas para taxas pagas (igual ao PaymentManagement)
    applications.forEach((app: any) => {
      const student = app.user_profiles;
      const scholarship = app.scholarships;
      const university = scholarship?.universities;

      if (!student || !scholarship || !university) return;

      // Pular aplicações da "Current Students Scholarship" pois foram matriculadas diretamente
      if (scholarship.title === 'Current Students Scholarship') {
        return;
      }

      const universityKey = university.name;
      if (!universityRevenue[universityKey]) {
        universityRevenue[universityKey] = {
          revenue: 0,
          students: 0,
          paidStudents: 0,
          name: university.name
        };
      }
      universityRevenue[universityKey].students++;

      // Obter valores dinâmicos do pacote ou usar valores padrão (igual ao PaymentManagement)
      const packageData = packageDataMap[student?.scholarship_package_id];
      const dependents = Number(student?.dependents) || 0;
      const dependentCostDollars = dependents * 150; // $150 por dependente somente Selection Process (em dólares)
      
      // Buscar override do usuário
      const userOverrides = overridesMap[student?.user_id] || {};
      
      // Selection Process Fee - prioridade: override > pacote > padrão
      let selectionProcessFee: number;
      if (userOverrides.selection_process_fee !== undefined) {
        selectionProcessFee = toCents(userOverrides.selection_process_fee);
      } else if (packageData?.selection_process_fee != null) {
        selectionProcessFee = toCents((packageData.selection_process_fee || 0) + dependentCostDollars);
      } else {
        selectionProcessFee = toCents((getFeeAmount('selection_process') || 0) + dependentCostDollars);
      }
      
      // I-20 Control Fee - prioridade: override > pacote > padrão (sem dependentes)
      let i20ControlFee: number;
      if (userOverrides.i20_control_fee !== undefined) {
        i20ControlFee = toCents(userOverrides.i20_control_fee);
      } else if (packageData?.i20_control_fee != null) {
        i20ControlFee = toCents(packageData.i20_control_fee);
      } else {
        i20ControlFee = toCents(getFeeAmount('i20_control_fee'));
      }
      
      // Scholarship Fee - prioridade: override > pacote > padrão (sem dependentes)
      let scholarshipFee: number;
      if (userOverrides.scholarship_fee !== undefined) {
        scholarshipFee = toCents(userOverrides.scholarship_fee);
      } else if (packageData?.scholarship_fee != null) {
        scholarshipFee = toCents(packageData.scholarship_fee);
      } else {
        scholarshipFee = toCents(getFeeAmount('scholarship_fee'));
      }
      
      // Application Fee dinâmico baseado na bolsa específica
      let applicationFee: number;
      if (app.scholarships?.application_fee_amount) {
        const rawValue = parseFloat(app.scholarships.application_fee_amount);
        if (rawValue > 1000) {
          applicationFee = Math.round(rawValue);
        } else {
          applicationFee = Math.round(rawValue * 100);
        }
        console.log(`🔍 [FA] Application fee from scholarship for ${student.full_name}: $${rawValue} -> ${applicationFee} cents`);
      } else {
        applicationFee = toCents(getFeeAmount('application_fee'));
        console.log(`🔍 [FA] Application fee from getFeeAmount for ${student.full_name}: $${getFeeAmount('application_fee')} -> ${applicationFee} cents`);
      }

      // Criar registros apenas para taxas que foram pagas (igual ao PaymentManagement)
      // Selection Process Fee - apenas uma vez por usuário (taxa global)
      if (student.has_paid_selection_process_fee && !globalFeesProcessed[student.user_id]?.selection_process) {
        console.log(`✅ [FA] Creating selection_process record for ${student.full_name}: $${(selectionProcessFee / 100).toFixed(2)}`);
        paymentRecords.push({
          id: `${student.user_id}-selection`,
          fee_type: 'selection_process',
          amount: selectionProcessFee,
          status: 'paid',
          payment_method: student.selection_process_fee_payment_method || 'manual',
          student_name: student.full_name,
          student_email: student.email,
          university_name: university.name,
          created_at: student.created_at || app.created_at
        });
        
        // Marcar como processado para este usuário
        if (!globalFeesProcessed[student.user_id]) {
          globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
        }
        globalFeesProcessed[student.user_id].selection_process = true;
      }

      // Application Fee - apenas uma vez por usuário (taxa global)
      if (app.is_application_fee_paid && !globalFeesProcessed[student.user_id]?.application_fee) {
        console.log(`✅ [FA] Creating application record for ${student.full_name}: $${(applicationFee / 100).toFixed(2)}`);
        paymentRecords.push({
          id: `${student.user_id}-application`,
          fee_type: 'application',
          amount: applicationFee,
          status: 'paid',
          payment_method: app.application_fee_payment_method || 'manual',
          student_name: student.full_name,
          student_email: student.email,
          university_name: university.name,
          created_at: student.created_at || app.created_at
        });
        
        // Marcar como processado para este usuário
        if (!globalFeesProcessed[student.user_id]) {
          globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
        }
        globalFeesProcessed[student.user_id].application_fee = true;
      }

      if (app.is_scholarship_fee_paid) {
        console.log(`✅ [FA] Creating scholarship record for ${student.full_name}: $${(scholarshipFee / 100).toFixed(2)}`);
        paymentRecords.push({
          id: `${app.id}-scholarship`,
          fee_type: 'scholarship',
          amount: scholarshipFee,
          status: 'paid',
          payment_method: app.scholarship_fee_payment_method || 'manual',
          student_name: student.full_name,
          student_email: student.email,
          university_name: university.name,
          created_at: student.created_at || app.created_at
        });
      }

      // I-20 Control Fee - apenas uma vez por usuário (taxa global)
      if (student.has_paid_i20_control_fee && !globalFeesProcessed[student.user_id]?.i20_control) {
        console.log(`✅ [FA] Creating i20_control_fee record for ${student.full_name}: $${(i20ControlFee / 100).toFixed(2)}`);
        paymentRecords.push({
          id: `${student.user_id}-i20`,
          fee_type: 'i20_control_fee',
          amount: i20ControlFee,
          status: 'paid',
          payment_method: student.i20_control_fee_payment_method || 'manual',
          student_name: student.full_name,
          student_email: student.email,
          university_name: university.name,
          created_at: student.created_at || app.created_at
        });
        
        // Marcar como processado para este usuário
        if (!globalFeesProcessed[student.user_id]) {
          globalFeesProcessed[student.user_id] = { selection_process: false, i20_control: false, application_fee: false };
        }
        globalFeesProcessed[student.user_id].i20_control = true;
      }
    });

    // Processar pagamentos Zelle aprovados (apenas para usuários sem aplicação)
    const zellePaymentsByUser: { [userId: string]: any[] } = {};
    zellePayments?.forEach((zellePayment: any) => {
      const student = zellePayment.user_profiles;
      if (student?.user_id) {
        if (!zellePaymentsByUser[student.user_id]) {
          zellePaymentsByUser[student.user_id] = [];
        }
        zellePaymentsByUser[student.user_id].push(zellePayment);
      }
    });

    Object.keys(zellePaymentsByUser).forEach(userId => {
      const userZellePayments = zellePaymentsByUser[userId];
      const firstPayment = userZellePayments[0];
      const student = firstPayment.user_profiles;

      if (!student) return;

      // Verificar se o usuário já tem uma aplicação (para evitar duplicação)
      const hasApplication = applications?.some(app => 
        app.user_profiles?.user_id === student.user_id
      );

      if (hasApplication) {
        console.log('⚠️ Skipping Zelle payment for', student.full_name, '- user already has application');
        return;
      }

      // Verificar quais taxas foram pagas via Zelle
      const paidFeeTypes = new Set(userZellePayments.map(payment => {
        if (payment.fee_type === 'application_fee') return 'application';
        if (payment.fee_type === 'selection_process_fee') return 'selection_process';
        if (payment.fee_type === 'scholarship_fee') return 'scholarship';
        if (payment.fee_type === 'i20_control_fee') return 'i20_control_fee';
        return payment.fee_type_global;
      }));

      // Criar registros para cada tipo de taxa paga via Zelle
      ['selection_process', 'application', 'scholarship', 'i20_control_fee'].forEach(feeType => {
        if (paidFeeTypes.has(feeType)) {
          const payment = userZellePayments.find(p => {
            const normalizedType = p.fee_type === 'application_fee' ? 'application' :
                                 p.fee_type === 'selection_process_fee' ? 'selection_process' :
                                 p.fee_type === 'scholarship_fee' ? 'scholarship' :
                                 p.fee_type === 'i20_control_fee' ? 'i20_control_fee' :
                                 p.fee_type_global;
            return normalizedType === feeType;
          });

          if (payment && payment.status === 'approved') {
            paymentRecords.push({
              id: `zelle-${payment.id}-${feeType}`,
              fee_type: feeType,
              amount: Math.round(parseFloat(payment.amount) * 100),
              status: 'paid',
              payment_method: 'zelle',
              student_name: student.full_name,
              student_email: student.email,
              university_name: 'No University Selected',
              created_at: payment.created_at
            });
          }
        }
      });
    });

    // Processar usuários Stripe (apenas para usuários sem aplicação e sem Zelle)
    stripeUsers?.forEach((stripeUser: any) => {
      const packageData = packageDataMap[stripeUser.scholarship_package_id];
      const studentName = stripeUser.full_name || 'Unknown Student';
      const studentEmail = stripeUser.email || '';

      if (!studentName) return;

      // Verificar se o usuário já tem uma aplicação (para evitar duplicação)
      const hasApplication = applications?.some(app => 
        app.user_profiles?.user_id === stripeUser.user_id
      );

      if (hasApplication) {
        console.log('⚠️ Skipping Stripe user for', studentName, '- user already has application');
        return;
      }

      // Verificar se o usuário tem pagamentos Zelle
      const hasZellePayment = Object.keys(zellePaymentsByUser).includes(stripeUser.user_id);
      if (hasZellePayment) {
        console.log('⚠️ Skipping Stripe user for', studentName, '- user has Zelle payments');
        return;
      }

      // Calcular valores das taxas (igual ao PaymentManagement)
      const dependents = Number(stripeUser?.dependents) || 0;
      const dependentCostDollars = dependents * 150;
      const userOverrides = overridesMap[stripeUser?.user_id] || {};
      

      
      let selectionProcessFee: number;
      if (userOverrides.selection_process_fee !== undefined) {
        selectionProcessFee = Math.round(userOverrides.selection_process_fee * 100);
      } else if (packageData?.selection_process_fee) {
        selectionProcessFee = Math.round((packageData.selection_process_fee + dependentCostDollars) * 100);
      } else {
        selectionProcessFee = Math.round((getFeeAmount('selection_process') + dependentCostDollars) * 100);
      }
      
      let i20ControlFee: number;
      if (userOverrides.i20_control_fee !== undefined) {
        i20ControlFee = Math.round(userOverrides.i20_control_fee * 100);
      } else if (packageData?.i20_control_fee) {
        i20ControlFee = Math.round(packageData.i20_control_fee * 100);
      } else {
        i20ControlFee = Math.round(getFeeAmount('i20_control_fee') * 100);
      }
      
      let scholarshipFee: number;
      if (userOverrides.scholarship_fee !== undefined) {
        scholarshipFee = Math.round(userOverrides.scholarship_fee * 100);
      } else if (packageData?.scholarship_fee) {
        scholarshipFee = Math.round(packageData.scholarship_fee * 100);
      } else {
        scholarshipFee = Math.round(getFeeAmount('scholarship_fee') * 100);
      }

      const applicationFee = Math.round(getFeeAmount('application_fee') * 100);
      console.log(`🔍 [FA] Stripe user application fee for ${studentName}: $${getFeeAmount('application_fee')} -> ${applicationFee} cents`);
      console.log(`📋 [FA] Processing Stripe user: ${studentName} with fees: SPF=${stripeUser.has_paid_selection_process_fee}, APP=${stripeUser.is_application_fee_paid}, SCH=${stripeUser.is_scholarship_fee_paid}, I20=${stripeUser.has_paid_i20_control_fee}`);

      // Criar registros apenas para taxas que foram pagas
      if (stripeUser.has_paid_selection_process_fee) {
        paymentRecords.push({
          id: `stripe-${stripeUser.id}-selection`,
          fee_type: 'selection_process',
          amount: selectionProcessFee,
          status: 'paid',
          payment_method: stripeUser.selection_process_fee_payment_method || 'manual',
          student_name: studentName,
          student_email: studentEmail,
          university_name: 'No University Selected',
          created_at: stripeUser.created_at
        });
      }

      if (stripeUser.is_application_fee_paid) {
        paymentRecords.push({
          id: `stripe-${stripeUser.id}-application`,
          fee_type: 'application',
          amount: applicationFee,
          status: 'paid',
          payment_method: 'manual',
          student_name: studentName,
          student_email: studentEmail,
          university_name: 'No University Selected',
          created_at: stripeUser.created_at
        });
      }

      if (stripeUser.is_scholarship_fee_paid) {
        paymentRecords.push({
          id: `stripe-${stripeUser.id}-scholarship`,
          fee_type: 'scholarship',
          amount: scholarshipFee,
          status: 'paid',
          payment_method: 'manual',
          student_name: studentName,
          student_email: studentEmail,
          university_name: 'No University Selected',
          created_at: stripeUser.created_at
        });
      }

      if (stripeUser.has_paid_i20_control_fee) {
        paymentRecords.push({
          id: `stripe-${stripeUser.id}-i20`,
          fee_type: 'i20_control_fee',
          amount: i20ControlFee,
          status: 'paid',
          payment_method: stripeUser.i20_control_fee_payment_method || 'manual',
          student_name: studentName,
          student_email: studentEmail,
          university_name: 'No University Selected',
          created_at: stripeUser.created_at
        });
      }
    });

    // Calcular estatísticas baseadas nos registros de pagamento (igual ao PaymentManagement)
    const paidRecords = paymentRecords.filter(p => p.status === 'paid');
    const totalPayments = paymentRecords.length;
    const paidPayments = paidRecords.length;
    const pendingPayments = totalPayments - paidPayments;
    
    // Calcular total revenue baseado nos registros reais (igual ao PaymentManagement)
    const totalRevenue = paidRecords.reduce((sum, p) => sum + p.amount, 0);
    
    // Processar dados por método de pagamento
    paidRecords.forEach(record => {
      const method = record.payment_method || 'manual';
      if (paymentsByMethod[method]) {
        paymentsByMethod[method].count++;
        paymentsByMethod[method].revenue += record.amount;
      }
    });

    // Processar dados por tipo de taxa
    paidRecords.forEach(record => {
      const feeType = record.fee_type;
      if (paymentsByFeeType[feeType]) {
        paymentsByFeeType[feeType].count++;
        paymentsByFeeType[feeType].revenue += record.amount;
      }
    });

    // Processar dados por universidade
    paidRecords.forEach(record => {
      const universityName = record.university_name;
      if (universityName && universityName !== 'No University Selected') {
        if (!universityRevenue[universityName]) {
          universityRevenue[universityName] = {
            revenue: 0,
            students: 0,
            paidStudents: 0,
            name: universityName
          };
        }
        universityRevenue[universityName].revenue += record.amount;
        universityRevenue[universityName].paidStudents++;
      }
    });
    
    const totalMethodRevenue = Object.values(paymentsByMethod).reduce((sum, method) => sum + method.revenue, 0);
    const paymentMethodData: PaymentMethodData[] = Object.entries(paymentsByMethod).map(([method, data]) => ({
      method: method === 'stripe' ? 'Stripe' : method === 'zelle' ? 'Zelle' : 'Outside',
      count: data.count,
      revenue: data.revenue,
      percentage: totalMethodRevenue > 0 ? (data.revenue / totalMethodRevenue) * 100 : 0
    }));

    const totalFeeRevenue = Object.values(paymentsByFeeType).reduce((sum, fee) => sum + fee.revenue, 0);
    console.log('📊 Payment Records Count:', paymentRecords.length);
    console.log('💰 Total Revenue (cents):', totalRevenue);
    console.log('� Total Revenue (dollars):', totalRevenue / 100);
    console.log('🔍 DEBUG: Paid records count:', paidPayments);
    console.log('🔍 DEBUG: Pending payments count:', pendingPayments);
    console.log('🔍 DEBUG: Total payments count:', totalPayments);
    
    // Breakdown por fee type
    Object.entries(paymentsByFeeType).forEach(([feeType, data]) => {
      console.log(`💳 [FA] ${feeType}: ${data.count} payments, $${(data.revenue / 100).toFixed(2)} revenue`);
    });
    
    // Log detalhado de cada registro de pagamento
    console.log('📋 [FA] Detailed payment records:');
    paidRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.student_name} - ${record.fee_type}: $${(record.amount / 100).toFixed(2)} (method: ${record.payment_method})`);
    });
    
    const feeTypeData: FeeTypeData[] = Object.entries(paymentsByFeeType).map(([feeType, data]) => ({
      feeType: feeType === 'selection_process' ? 'Selection Process' :
               feeType === 'application' ? 'Application Fee' :
               feeType === 'scholarship' ? 'Scholarship Fee' : 'I-20 Control Fee',
      count: data.count,
      revenue: data.revenue,
      percentage: totalFeeRevenue > 0 ? (data.revenue / totalFeeRevenue) * 100 : 0
    }));

    // Calcular dados por universidade
    const universityData: UniversityRevenueData[] = Object.values(universityRevenue)
      .map(uni => ({
        university: uni.name,
        revenue: uni.revenue,
        students: uni.students,
        conversionRate: uni.students > 0 ? (uni.paidStudents / uni.students) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 universidades

    // Calcular dados de receita ao longo do tempo baseado nos registros de pagamento
    const revenueData: RevenueData[] = [];
    const { startDate, endDate } = currentRange;
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const dayBuckets: Record<string, { revenue: number; payments: number; students: number }> = {};

    // Inicializa buckets por dia
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime());
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dayBuckets[key] = { revenue: 0, payments: 0, students: 0 };
    }

    // Processar registros de pagamento para buckets por data
    paidRecords.forEach(record => {
      // Para registros de aplicação, usar a data da aplicação
      // Para registros Zelle/Stripe, usar a data do pagamento
      const createdAt = new Date(record.payment_date || record.created_at || Date.now());
      const key = createdAt.toISOString().split('T')[0];
      
      if (dayBuckets[key]) {
        dayBuckets[key].revenue += record.amount;
        dayBuckets[key].payments += 1;
      } else if (createdAt >= startDate && createdAt <= endDate) {
        dayBuckets[key] = { revenue: record.amount, payments: 1, students: 0 };
      }
    });

    Object.entries(dayBuckets).forEach(([date, vals]) => {
      revenueData.push({ date, revenue: vals.revenue, payments: vals.payments, students: vals.students });
    });
    revenueData.sort((a, b) => a.date.localeCompare(b.date));

    console.log('📅 Revenue Data:', revenueData);
    console.log('💵 Total Revenue from Records:', totalRevenue);
    console.log('🔢 Total Payments from Records:', paidPayments);
    const conversionRate = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
    const averageTransactionValue = paidPayments > 0 ? totalRevenue / paidPayments : 0;
    
    // Calcular crescimento comparando com período anterior (simplificado)
    const revenueGrowth = 0; // Simplificado por agora

    // Contar payouts
    const pendingPayouts = universityRequests.filter(req => req.status === 'pending' || req.status === 'approved').length +
                          affiliateRequests.filter(req => req.status === 'pending' || req.status === 'approved').length;
    const completedPayouts = universityRequests.filter(req => req.status === 'paid').length +
                           affiliateRequests.filter(req => req.status === 'paid').length;

    // Contagem global de estudantes registrados
    const totalStudentsSet = new Set<string>();
    allStudents.forEach((student: any) => {
      if (student.id) totalStudentsSet.add(student.id);
    });

    // Atualizar estados
    setMetrics({
      totalRevenue,
      monthlyRevenue: totalRevenue, // Para o período selecionado
      revenueGrowth,
      totalPayments,
      paidPayments,
      pendingPayments,
      conversionRate,
      averageTransactionValue,
      totalStudents: allStudents.length,
      pendingPayouts,
      completedPayouts
    });

    setRevenueData(revenueData);
    setPaymentMethodData(paymentMethodData);
    setFeeTypeData(feeTypeData);
    setUniversityData(universityData);

    console.log('✅ Financial data processed successfully');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
  };

  const handleExportData = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Revenue', `$${formatCentsToUSD(metrics.totalRevenue)}`],
      ['Total Payments', metrics.totalPayments.toString()],
      ['Paid Payments', metrics.paidPayments.toString()],
      ['Pending Payments', metrics.pendingPayments.toString()],
      ['Conversion Rate', `${metrics.conversionRate.toFixed(2)}%`],
      ['Average Transaction Value', `$${formatCentsToUSD(metrics.averageTransactionValue)}`],
      ['Total Students', metrics.totalStudents.toString()],
      ['Revenue Growth', `${metrics.revenueGrowth.toFixed(2)}%`]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatPeriodLabel = () => {
    switch (timeFilter) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      case 'all': return 'All Time';
      default: return 'Selected Period';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financial analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="text-blue-600" size={32} />
            Financial Analytics
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive financial insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Time Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Time Period Filter
          </h2>
          <span className="text-sm text-gray-600">Currently showing: {formatPeriodLabel()}</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {(['7d', '30d', '90d', '1y', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => {
                setTimeFilter(period);
                setShowCustomDate(false);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeFilter === period && !showCustomDate
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period === '7d' ? 'Last 7 Days' :
               period === '30d' ? 'Last 30 Days' :
               period === '90d' ? 'Last 90 Days' :
               period === '1y' ? 'Last Year' : 'All Time'}
            </button>
          ))}
          
          <button
            onClick={() => setShowCustomDate(!showCustomDate)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom Range
          </button>
        </div>
        
        {showCustomDate && (
          <div className="mt-4 flex items-center gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">${formatCentsToUSD(metrics.totalRevenue)}</p>
              <div className="flex items-center mt-2">
                {metrics.revenueGrowth >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-300 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-300 mr-1" />
                )}
                <span className="text-sm text-blue-100">
                  {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% vs previous period
                </span>
              </div>
            </div>
            <DollarSign size={32} className="text-blue-200" />
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Conversion Rate</p>
              <p className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
              <div className="flex items-center mt-2">
                <Target className="h-4 w-4 text-green-300 mr-1" />
                <span className="text-sm text-green-100">
                  {metrics.paidPayments} of {metrics.totalPayments} payments
                </span>
              </div>
            </div>
            <Target size={32} className="text-green-200" />
          </div>
        </div>

        {/* Average Transaction */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Avg Transaction Value</p>
              <p className="text-2xl font-bold">${formatCentsToUSD(metrics.averageTransactionValue)}</p>
              
            </div>
            <CreditCard size={32} className="text-purple-200" />
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Students</p>
              <p className="text-2xl font-bold">{metrics.totalStudents}</p>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 text-orange-300 mr-1" />
                <span className="text-sm text-orange-100">
                  Total registered students
                </span>
              </div>
            </div>
            <Users size={32} className="text-orange-200" />
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <LineChartIcon className="h-5 w-5" />
            Revenue Trend
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Payments</span>
            </div>
          </div>
        </div>
        
        <div className="h-64">
          {renderTrendChart()}

        </div>
      </div>

      {/* Payment Methods & Fee Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Payment Methods
          </h2>
          
          <div className="space-y-4">
            {paymentMethodData.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${
                    index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'
                  }`}></div>
                  <span className="font-medium text-gray-900">{method.method}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ${formatCentsToUSD(method.revenue)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {method.count} payments ({method.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue by Fee Type
          </h2>
          
          <div className="space-y-4">
            {feeTypeData.map((fee, index) => (
              <div key={fee.feeType} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${
                    index === 0 ? 'bg-indigo-500' : 
                    index === 1 ? 'bg-emerald-500' : 
                    index === 2 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}></div>
                  <span className="font-medium text-gray-900">{fee.feeType}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ${formatCentsToUSD(fee.revenue)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {fee.count} payments ({fee.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Universities by Revenue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Universities by Revenue
        </h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {universityData.map((uni, index) => (
                <tr key={uni.university} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{uni.university}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {uni.students}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${formatCentsToUSD(uni.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      uni.conversionRate >= 70 ? 'bg-green-100 text-green-800' :
                      uni.conversionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {uni.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      
    </div>
  );
};

export default FinancialAnalytics;
