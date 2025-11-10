import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useEnvironment } from './useEnvironment';

export interface UniversityFinancialData {
  id: string;
  user_id: string;
  name: string;
  description: string;
  location: string;
  profile_completed: boolean;
  created_at: string;
  users?: { email: string };
  // Financial data
  totalRevenue: number;
  availableBalance: number;
  totalPaidOut: number;
  totalPending: number;
  paidApplicationsCount: number;
  totalApplicationsCount: number;
  conversionRate: number;
  averageFee: number;
  // Payment method breakdown
  manualPaymentsCount: number;
  stripePaymentsCount: number;
  zellePaymentsCount: number;
  manualPaymentsRevenue: number;
  stripePaymentsRevenue: number;
  zellePaymentsRevenue: number;
  // Related data
  students: any[];
  paymentRequests: any[];
}

export interface UseUniversityFinancialDataReturn {
  universities: UniversityFinancialData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUniversityFinancialData = (): UseUniversityFinancialDataReturn => {
  const [universities, setUniversities] = useState<UniversityFinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isProduction, isStaging } = useEnvironment();

  const fetchUniversityFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Primeiro buscar universidades que têm pelo menos uma aplicação
      // Buscar todos os scholarship_applications para identificar universidades ativas
      const { data: activeUniversitiesData, error: activeUniversitiesError } = await supabase
        .from('scholarship_applications')
        .select(`
          scholarship_id,
          scholarships!inner (
            university_id,
            universities!inner (
              id,
              user_id,
              name,
              description,
              location,
              profile_completed,
              created_at
            )
          )
        `)
        .limit(1000);

      if (activeUniversitiesError) {
        throw activeUniversitiesError;
      }

      // Extrair universidades únicas que têm aplicações
      const uniqueUniversitiesMap = new Map();
      activeUniversitiesData?.forEach((app: any) => {
        const university = app.scholarships?.universities;
        if (university && !uniqueUniversitiesMap.has(university.id)) {
          uniqueUniversitiesMap.set(university.id, university);
        }
      });

      const universitiesData = Array.from(uniqueUniversitiesMap.values())
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (!universitiesData || universitiesData.length === 0) {
        setUniversities([]);
        return;
      }

      // 2. Buscar dados em batch para otimizar
      const universityIds = universitiesData.map(u => u.id);
      const userIds = universitiesData.map(u => u.user_id).filter(Boolean);

      // 2.1. Buscar todos os user_profiles de uma vez
      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('user_id, email')
          .in('user_id', userIds);

        if (usersError) {
          console.error('Error fetching users data:', usersError);
        } else {
          usersData?.forEach(user => {
            usersMap[user.user_id] = user;
          });
        }
      }

      // 2.2. Buscar todas as bolsas das universidades primeiro
      const { data: scholarshipsData, error: scholarshipsError } = await supabase
        .from('scholarships')
        .select('id, university_id, application_fee_amount')
        .in('university_id', universityIds);

      if (scholarshipsError) {
        console.error('Error fetching scholarships:', scholarshipsError);
      }

      const scholarshipIds = scholarshipsData?.map(s => s.id) || [];
      const scholarshipsMap: Record<string, any> = {};
      scholarshipsData?.forEach(scholarship => {
        scholarshipsMap[scholarship.id] = scholarship;
      });

      // 2.3. Buscar aplicações pagas (excluindo Current Students Scholarship)
      let allPaidApplications: any[] = [];
      if (scholarshipIds.length > 0) {
        const { data: paidAppsData, error: paidApplicationsError } = await supabase
          .from('scholarship_applications')
          .select(`
            id, 
            student_id, 
            scholarship_id, 
            created_at, 
            is_application_fee_paid,
            application_fee_payment_method,
            scholarships!inner (
              id,
              title,
              application_fee_amount
            )
          `)
          .eq('is_application_fee_paid', true)
          .in('scholarship_id', scholarshipIds)
          .neq('scholarships.title', 'Current Students Scholarship');

        if (paidApplicationsError) {
          console.error('Error fetching paid applications:', paidApplicationsError);
        } else {
          allPaidApplications = paidAppsData || [];
        }
      }

      // 2.4. Buscar todas as aplicações para taxa de conversão (excluindo Current Students Scholarship)
      // Ordenar por is_application_fee_paid DESC para priorizar aplicações com fee pago
      let allApplications: any[] = [];
      if (scholarshipIds.length > 0) {
        const { data: allAppsData, error: allApplicationsError } = await supabase
          .from('scholarship_applications')
          .select(`
            id, 
            student_id, 
            scholarship_id, 
            is_application_fee_paid,
            created_at,
            application_fee_payment_method,
            scholarships!inner (
              id,
              title,
              application_fee_amount
            )
          `)
          .in('scholarship_id', scholarshipIds)
          .neq('scholarships.title', 'Current Students Scholarship')
          .order('is_application_fee_paid', { ascending: false }); // Priorizar aplicações com fee pago

        if (allApplicationsError) {
          console.error('Error fetching all applications:', allApplicationsError);
        } else {
          allApplications = allAppsData || [];
        }
      }

      // 2.5. Buscar balances de uma vez (com limite para evitar erro de URL muito longa)
      const { data: allBalances, error: balancesError } = await supabase
        .from('university_balance_accounts')
        .select('university_id, total_paid_out, total_reserved, available_balance')
        .in('university_id', universityIds.slice(0, 50)); // Limitar para evitar URL muito longa

      if (balancesError) {
        console.error('Error fetching balances:', balancesError);
      }

      // 2.6. Buscar estudantes únicos das aplicações
      const studentIds = [...new Set([
        ...allPaidApplications.map(app => app.student_id),
        ...allApplications.map(app => app.student_id)
      ].filter(Boolean))];

      let studentsData: any[] = [];
      if (studentIds.length > 0) {
        const { data: students, error: studentsError } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, created_at, dependents, system_type')
          .in('id', studentIds.slice(0, 100)); // Limitar para performance

        if (studentsError) {
          console.error('Error fetching students:', studentsError);
        } else {
          studentsData = students || [];
        }
      }

      // 3. Criar maps para acesso rápido
      const balancesMap: Record<string, any> = {};
      allBalances?.forEach(balance => {
        balancesMap[balance.university_id] = balance;
      });

      const studentsMap: Record<string, any> = {};
      studentsData?.forEach(student => {
        studentsMap[student.id] = student;
      });

      // Função helper para verificar se deve excluir estudante (exceto em localhost)
      const shouldExcludeStudent = (studentEmail: string | null | undefined): boolean => {
        if (!isProduction && !isStaging) return false; // Em localhost, não excluir
        if (!studentEmail) return false; // Se não tem email, não excluir
        return studentEmail.toLowerCase().includes('@uorak.com');
      };

      const paidAppsMap: Record<string, any[]> = {};
      allPaidApplications?.forEach(app => {
        const student = studentsMap[app.student_id];
        // Excluir aplicações de estudantes com email @uorak.com (exceto em localhost)
        if ((isProduction || isStaging) && shouldExcludeStudent(student?.email)) {
          return; // Pular esta aplicação
        }
        const scholarship = app.scholarships || scholarshipsMap[app.scholarship_id];
        const universityId = scholarship?.university_id || scholarshipsMap[app.scholarship_id]?.university_id;
        if (universityId) {
          if (!paidAppsMap[universityId]) paidAppsMap[universityId] = [];
          paidAppsMap[universityId].push({
            ...app,
            scholarship: scholarship || scholarshipsMap[app.scholarship_id]
          });
        }
      });

      const allAppsMap: Record<string, any[]> = {};
      allApplications?.forEach(app => {
        const student = studentsMap[app.student_id];
        // Excluir aplicações de estudantes com email @uorak.com (exceto em localhost)
        if ((isProduction || isStaging) && shouldExcludeStudent(student?.email)) {
          return; // Pular esta aplicação
        }
        const scholarship = app.scholarships || scholarshipsMap[app.scholarship_id];
        const universityId = scholarship?.university_id || scholarshipsMap[app.scholarship_id]?.university_id;
        if (universityId) {
          if (!allAppsMap[universityId]) allAppsMap[universityId] = [];
          allAppsMap[universityId].push({
            ...app,
            scholarship: scholarship || scholarshipsMap[app.scholarship_id]
          });
        }
      });

      const studentsPerUniversityMap: Record<string, any[]> = {};
      allApplications?.forEach(app => {
        const scholarship = app.scholarships || scholarshipsMap[app.scholarship_id];
        const universityId = scholarship?.university_id || scholarshipsMap[app.scholarship_id]?.university_id;
        const student = studentsMap[app.student_id];
        // Excluir estudantes com email @uorak.com (exceto em localhost)
        if (universityId && student && !shouldExcludeStudent(student?.email)) {
          if (!studentsPerUniversityMap[universityId]) studentsPerUniversityMap[universityId] = [];
          // Evitar duplicatas - mas atualizar se encontrar uma aplicação com fee pago
          const existingIndex = studentsPerUniversityMap[universityId].findIndex(s => s.id === student.id);
          if (existingIndex === -1) {
            // Primeira vez que vemos este estudante para esta universidade
            studentsPerUniversityMap[universityId].push({
              ...student,
              id: student.id,
              application_id: app.id,
              is_application_fee_paid: app.is_application_fee_paid,
              application_fee_payment_method: app.application_fee_payment_method,
              scholarship_title: scholarship?.title || 'N/A',
              created_at: app.created_at || student.created_at,
              users: {
                id: student.id,
                name: student.full_name || student.email?.split('@')[0] || 'Unknown',
                email: student.email
              },
              scholarships: {
                title: scholarship?.title || 'N/A',
                application_fee_amount: scholarship?.application_fee_amount || 0
              }
            });
          } else {
            // Estudante já existe - atualizar se esta aplicação tem fee pago e a anterior não
            const existing = studentsPerUniversityMap[universityId][existingIndex];
            if (app.is_application_fee_paid && !existing.is_application_fee_paid) {
              // Atualizar para usar a aplicação com fee pago
              studentsPerUniversityMap[universityId][existingIndex] = {
                ...existing,
                application_id: app.id,
                is_application_fee_paid: true,
                application_fee_payment_method: app.application_fee_payment_method,
                scholarship_title: scholarship?.title || existing.scholarship_title,
                scholarships: {
                  title: scholarship?.title || existing.scholarships?.title || 'N/A',
                  application_fee_amount: scholarship?.application_fee_amount || existing.scholarships?.application_fee_amount || 0
                }
              };
            }
          }
        }
      });

      // 4. Processar cada universidade com dados já carregados
      // Filtrar universidades de teste (com email @uorak.com) - exceto em localhost
      const universitiesWithFinancialData = universitiesData
        .filter(university => {
          // Em localhost, não filtrar
          if (!isProduction && !isStaging) return true;
          const userData = usersMap[university.user_id] || null;
          const userEmail = userData?.email?.toLowerCase() || '';
          return !userEmail.includes('@uorak.com');
        })
        .map(university => {
        try {
          const userData = usersMap[university.user_id] || null;
          const balance = balancesMap[university.id] || null;
          const paidApps = paidAppsMap[university.id] || [];
          const allApps = allAppsMap[university.id] || [];
          const universityStudents = studentsPerUniversityMap[university.id] || [];

          // Calcular métricas financeiras
          const totalRevenue = paidApps.reduce((sum, app) => {
            const scholarship = app.scholarship || app.scholarships;
            const feeAmount = scholarship?.application_fee_amount;
            if (feeAmount) {
              const numericFee = typeof feeAmount === 'string' ? parseFloat(feeAmount) : feeAmount;
              const student = studentsMap[app.student_id];
              const deps = Number(student?.dependents) || 0;
              const systemType = (student?.system_type as any) || 'legacy';
              const withDeps = systemType === 'legacy' && deps > 0 ? numericFee + deps * 100 : numericFee;
              return sum + withDeps;
            }
            return sum;
          }, 0);

          const totalPaidOut = balance?.total_paid_out || 0;
          const totalPending = balance?.total_reserved || 0;
          
          // Separar pagamentos por método (precisamos calcular manualPaymentsRevenue antes do availableBalance)
          const manualPayments = paidApps.filter(app => app.application_fee_payment_method === 'manual');
          const manualPaymentsRevenue = manualPayments.reduce((sum, app) => {
            const scholarship = app.scholarship || app.scholarships;
            const feeAmount = scholarship?.application_fee_amount;
            if (feeAmount) {
              const numericFee = typeof feeAmount === 'string' ? parseFloat(feeAmount) : feeAmount;
              const student = studentsMap[app.student_id];
              const deps = Number(student?.dependents) || 0;
              const systemType = (student?.system_type as any) || 'legacy';
              const withDeps = systemType === 'legacy' && deps > 0 ? numericFee + deps * 100 : numericFee;
              return sum + withDeps;
            }
            return sum;
          }, 0);
          
          // Calcular available balance: (Total Revenue - Outside Payments) - (Requisições pendentes + Pagamentos manuais já feitos)
          // Outside payments (manual payments) não devem contar no available balance
          // Não usar o valor da tabela university_balance_accounts pois pode estar incorreto
          const availableBalance = Math.max(0, (totalRevenue - manualPaymentsRevenue) - totalPaidOut - totalPending);

          const paidApplicationsCount = paidApps.length;
          const totalApplicationsCount = allApps.length;
          const conversionRate = totalApplicationsCount > 0 
            ? (paidApplicationsCount / totalApplicationsCount) * 100 
            : 0;
          const averageFee = paidApplicationsCount > 0 
            ? totalRevenue / paidApplicationsCount 
            : 0;

          // Separar pagamentos por método (já calculamos manualPayments e manualPaymentsRevenue acima)
          const stripePayments = paidApps.filter(app => app.application_fee_payment_method === 'stripe');
          const zellePayments = paidApps.filter(app => app.application_fee_payment_method === 'zelle');

          const stripePaymentsRevenue = stripePayments.reduce((sum, app) => {
            const scholarship = app.scholarship || app.scholarships;
            const feeAmount = scholarship?.application_fee_amount;
            if (feeAmount) {
              const numericFee = typeof feeAmount === 'string' ? parseFloat(feeAmount) : feeAmount;
              const student = studentsMap[app.student_id];
              const deps = Number(student?.dependents) || 0;
              const systemType = (student?.system_type as any) || 'legacy';
              const withDeps = systemType === 'legacy' && deps > 0 ? numericFee + deps * 100 : numericFee;
              return sum + withDeps;
            }
            return sum;
          }, 0);

          const zellePaymentsRevenue = zellePayments.reduce((sum, app) => {
            const scholarship = app.scholarship || app.scholarships;
            const feeAmount = scholarship?.application_fee_amount;
            if (feeAmount) {
              const numericFee = typeof feeAmount === 'string' ? parseFloat(feeAmount) : feeAmount;
              const student = studentsMap[app.student_id];
              const deps = Number(student?.dependents) || 0;
              const systemType = (student?.system_type as any) || 'legacy';
              const withDeps = systemType === 'legacy' && deps > 0 ? numericFee + deps * 100 : numericFee;
              return sum + withDeps;
            }
            return sum;
          }, 0);

          return {
            ...university,
            users: userData || { email: 'No email' },
            totalRevenue,
            availableBalance,
            totalPaidOut,
            totalPending,
            paidApplicationsCount,
            totalApplicationsCount,
            conversionRate,
            averageFee,
            manualPaymentsCount: manualPayments.length,
            stripePaymentsCount: stripePayments.length,
            zellePaymentsCount: zellePayments.length,
            manualPaymentsRevenue,
            stripePaymentsRevenue,
            zellePaymentsRevenue,
            students: universityStudents,
            paymentRequests: []
          };

        } catch (err) {
          console.error(`Error processing university ${university.id}:`, err);
          return {
            ...university,
            users: { email: 'No email' },
            totalRevenue: 0,
            availableBalance: 0,
            totalPaidOut: 0,
            totalPending: 0,
            paidApplicationsCount: 0,
            totalApplicationsCount: 0,
            conversionRate: 0,
            averageFee: 0,
            manualPaymentsCount: 0,
            stripePaymentsCount: 0,
            zellePaymentsCount: 0,
            manualPaymentsRevenue: 0,
            stripePaymentsRevenue: 0,
            zellePaymentsRevenue: 0,
            students: [],
            paymentRequests: []
          };
        }
      });

      setUniversities(universitiesWithFinancialData);

    } catch (err: any) {
      console.error('Error fetching university financial data:', err);
      setError(err.message || 'Failed to fetch university financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversityFinancialData();
  }, []);

  const refetch = async () => {
    await fetchUniversityFinancialData();
  };

  return {
    universities,
    loading,
    error,
    refetch
  };
};