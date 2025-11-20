import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PaymentData {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_country?: string;
  student_phone?: string;
  university_id: string;
  university_name: string;
  // Informações da aplicação
  application_id: string;
  application_status: string;
  applied_at: string;
  // Informações da bolsa
  scholarship_id: string;
  scholarship_title: string;
  scholarship_amount: number;
  scholarship_type?: string;
  scholarship_field?: string;
  scholarship_level?: string;
  // Informações do pagamento
  payment_type: string;
  amount_charged: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_payment_intent_id?: string;
  transfer_status?: string;
  transfer_method?: string;
  // Campos específicos para application fees
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  application_fee_amount?: number;
  scholarship_fee_amount?: number;
}

export interface PaymentStats {
  total_applications: number;
  total_revenue: number;
  paid_application_fees: number;
  pending_application_fees: number;
  paid_scholarship_fees: number;
  pending_scholarship_fees: number;
}

export interface PaymentFilters {
  status_filter: string;
  payment_type_filter: string;
  application_status_filter: string;
  date_from: string;
  date_to: string;
  search_query: string;
}

export const usePayments = (universityId: string | undefined) => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total_applications: 0,
    total_revenue: 0,
    paid_application_fees: 0,
    pending_application_fees: 0,
    paid_scholarship_fees: 0,
    pending_scholarship_fees: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PaymentFilters>({
    status_filter: 'succeeded', // Padrão: mostrar apenas pagamentos aprovados
    payment_type_filter: 'all',
    application_status_filter: 'all',
    date_from: '',
    date_to: '',
    search_query: '',
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const loadPayments = async (page: number = 1, currentFilters?: PaymentFilters) => {
    if (!universityId) {
      return;
    }
    
    // Usar os filtros passados como parâmetro ou os filtros do estado
    const filtersToUse = currentFilters || filters;
    
    try {
      setLoading(true);
      setError(null);
      
      // 1. Primeiro, buscar os IDs das bolsas da universidade
      const { data: scholarshipIds, error: scholarshipError } = await supabase
        .from('scholarships')
        .select('id')
        .eq('university_id', universityId);

      if (scholarshipError) {
        throw new Error(`Error fetching scholarships: ${scholarshipError.message}`);
      }

      if (!scholarshipIds || scholarshipIds.length === 0) {
        // Se não há bolsas, retornar dados vazios
        setPayments([]);
        setStats({
          total_applications: 0,
          total_revenue: 0,
          paid_application_fees: 0,
          pending_application_fees: 0,
          paid_scholarship_fees: 0,
          pending_scholarship_fees: 0,
        });
        setTotalCount(0);
        return;
      }

      const scholarshipIdList = scholarshipIds.map(s => s.id);

      // 2. Construir query para aplicações
      let applicationsQuery = supabase
        .from('scholarship_applications')
        .select(`
          id,
          student_id,
          status,
          applied_at,
          created_at,
          updated_at,
          is_application_fee_paid,
          is_scholarship_fee_paid,
          scholarship_id
        `)
        .in('scholarship_id', scholarshipIdList);

      // Aplicar filtros
      if (filtersToUse.application_status_filter && filtersToUse.application_status_filter !== 'all') {
        applicationsQuery = applicationsQuery.eq('status', filtersToUse.application_status_filter);
      }
      if (filtersToUse.payment_type_filter && filtersToUse.payment_type_filter !== 'all') {
        if (filtersToUse.payment_type_filter === 'application_fee') {
          // Mostrar apenas aplicações com application fee não paga
          applicationsQuery = applicationsQuery.eq('is_application_fee_paid', false);
        } else if (filtersToUse.payment_type_filter === 'scholarship_fee') {
          // Mostrar apenas aplicações com scholarship fee não paga
          applicationsQuery = applicationsQuery.eq('is_scholarship_fee_paid', false);
        }
      }
      if (filtersToUse.date_from) {
        applicationsQuery = applicationsQuery.gte('applied_at', filtersToUse.date_from);
      }
      if (filtersToUse.date_to) {
        applicationsQuery = applicationsQuery.lte('applied_at', filtersToUse.date_to);
      }

      // 3. Buscar total count para paginação
      let countQuery = supabase
        .from('scholarship_applications')
        .select('*', { count: 'exact', head: true })
        .in('scholarship_id', scholarshipIdList);

      // Aplicar os mesmos filtros na query de count
      if (filtersToUse.application_status_filter && filtersToUse.application_status_filter !== 'all') {
        countQuery = countQuery.eq('status', filtersToUse.application_status_filter);
      }
      if (filtersToUse.payment_type_filter && filtersToUse.payment_type_filter !== 'all') {
        if (filtersToUse.payment_type_filter === 'application_fee') {
          countQuery = countQuery.eq('is_application_fee_paid', false);
        } else if (filtersToUse.payment_type_filter === 'scholarship_fee') {
          countQuery = countQuery.eq('is_scholarship_fee_paid', false);
        }
      }
      if (filtersToUse.date_from) {
        countQuery = countQuery.gte('applied_at', filtersToUse.date_from);
      }
      if (filtersToUse.date_to) {
        countQuery = countQuery.lte('applied_at', filtersToUse.date_to);
      }

      const { count: totalCount } = await countQuery;

      // 4. Aplicar paginação e buscar dados
      const offset = (page - 1) * pageSize;
      const { data: applications, error: applicationsError } = await applicationsQuery
        .range(offset, offset + pageSize - 1)
        .order('applied_at', { ascending: false });

      if (applicationsError) {
        throw new Error(`Error fetching applications: ${applicationsError.message}`);
      }

      // 5. Buscar dados adicionais para cada aplicação
      const transformedPayments: PaymentData[] = [];
      
      if (applications && applications.length > 0) {
        // Buscar todos os IDs únicos de estudantes e bolsas
        const studentIds = [...new Set(applications.map(app => app.student_id))];
        const scholarshipIdsForDetails = [...new Set(applications.map(app => app.scholarship_id))];

        // Buscar dados dos usuários em lote
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, phone, country, dependents, system_type')
          .in('id', studentIds);

        // Buscar dados das bolsas em lote
        const { data: scholarships } = await supabase
          .from('scholarships')
          .select(`
            id,
            title,
            amount,
            scholarship_type,
            application_fee_amount,
            university_id,
            universities(name),
            field_of_study,
            level
          `)
          .in('id', scholarshipIdsForDetails);

        // Criar mapas para acesso rápido
        const userProfilesMap = new Map(userProfiles?.map(profile => [profile.id, profile]) || []);
        const scholarshipsMap = new Map(scholarships?.map(scholarship => [scholarship.id, scholarship]) || []);

        // Transformar aplicações
        for (const application of applications) {
          const userProfile = userProfilesMap.get(application.student_id);
          const scholarship = scholarshipsMap.get(application.scholarship_id);

          if (scholarship) {
            const applicationFeeAmount = scholarship?.application_fee_amount || 0;
            const scholarshipAmount = scholarship?.amount || 0;
            const deps = Number((userProfile as any)?.dependents) || 0;
            // Adicionar $100 por dependente para ambos os sistemas (legacy e simplified)
            const finalApplicationFee = deps > 0
              ? applicationFeeAmount + deps * 100
              : applicationFeeAmount;
            
            transformedPayments.push({
              id: application.id,
              student_id: application.student_id,
              student_name: userProfile?.full_name || 'Unknown',
              student_email: userProfile?.email || 'Unknown',
              student_country: userProfile?.country || 'Unknown',
              student_phone: userProfile?.phone || 'Unknown',
              university_id: scholarship?.university_id || universityId,
              university_name: (scholarship?.universities as any)?.name || 'Unknown',
              // Informações da aplicação
              application_id: application.id,
              application_status: application.status,
              applied_at: application.applied_at,
              // Informações da bolsa
              scholarship_id: scholarship?.id || 'Unknown',
              scholarship_title: scholarship?.title || 'Unknown',
              scholarship_amount: scholarshipAmount,
              scholarship_type: scholarship?.scholarship_type || 'Not specified',
              scholarship_field: scholarship?.field_of_study || 'Not specified',
              scholarship_level: scholarship?.level || 'Not specified',
              // Informações do pagamento (simuladas para application fees)
              payment_type: 'application_fee',
              amount_charged: finalApplicationFee,
              currency: 'USD',
              status: application.is_application_fee_paid ? 'succeeded' : 'pending',
              created_at: application.applied_at,
              stripe_payment_intent_id: undefined,
              transfer_status: 'pending',
              transfer_method: 'stripe',
              // Campos específicos para application fees
              is_application_fee_paid: application.is_application_fee_paid || false,
              is_scholarship_fee_paid: application.is_scholarship_fee_paid || false,
              application_fee_amount: finalApplicationFee,
              scholarship_fee_amount: scholarshipAmount,
            });
          }
        }

        // Aplicar filtro de busca após transformar os dados
        let finalPayments = transformedPayments;
        
        if (filtersToUse.search_query && filtersToUse.search_query.trim() !== '') {
          const searchLower = filtersToUse.search_query.toLowerCase().trim();
          finalPayments = transformedPayments.filter(payment => {
            const studentName = payment.student_name.toLowerCase();
            const studentEmail = payment.student_email.toLowerCase();
            const scholarshipTitle = payment.scholarship_title.toLowerCase();
            
            const matches = studentName.includes(searchLower) || 
                           studentEmail.includes(searchLower) || 
                           scholarshipTitle.includes(searchLower);
            
            return matches;
          });
        }

        // Aplicar paginação
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedPayments = finalPayments.slice(startIndex, endIndex);
        
        // Recalcular estatísticas com base nos dados filtrados
        const recalculatedStats: PaymentStats = {
          total_applications: finalPayments.length,
          total_revenue: 0,
          paid_application_fees: 0,
          pending_application_fees: 0,
          paid_scholarship_fees: 0,
          pending_scholarship_fees: 0,
        };

        for (const payment of finalPayments) {
          if (payment.is_application_fee_paid) {
            recalculatedStats.paid_application_fees++;
            // Valores já estão em USD
            recalculatedStats.total_revenue += payment.amount_charged;
          } else {
            recalculatedStats.pending_application_fees++;
          }
          
          if (payment.is_scholarship_fee_paid) {
            recalculatedStats.paid_scholarship_fees++;
          } else {
            recalculatedStats.pending_scholarship_fees++;
          }
        }
        
        setPayments(paginatedPayments);
        setStats(recalculatedStats);
        setTotalCount(finalPayments.length);
      } else {
        setPayments([]);
        setStats({
          total_applications: 0,
          total_revenue: 0,
          paid_application_fees: 0,
          pending_application_fees: 0,
          paid_scholarship_fees: 0,
          pending_scholarship_fees: 0,
        });
        setTotalCount(0);
      }
      
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<PaymentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(1);
    
    // Debounce para o filtro de busca
    if (newFilters.search_query !== undefined) {
      setTimeout(() => {
        loadPayments(1, updatedFilters);
      }, 300);
    } else {
      loadPayments(1, updatedFilters);
    }
  };

  const clearFilters = () => {
    const clearedFilters: PaymentFilters = {
      status_filter: 'all',
      payment_type_filter: 'all',
      application_status_filter: 'all',
      date_from: '',
      date_to: '',
      search_query: '',
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    loadPayments(1, clearedFilters);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadPayments(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    loadPayments(1);
  };

  const exportPayments = async (): Promise<Blob> => {
    if (!universityId) {
      throw new Error('University ID is required');
    }
    
    try {
      // Buscar todos os dados sem paginação para exportação
      const { data: scholarshipIds } = await supabase
        .from('scholarships')
        .select('id')
        .eq('university_id', universityId);

      if (!scholarshipIds || scholarshipIds.length === 0) {
        return new Blob(['No data to export'], { type: 'text/csv' });
      }

      const scholarshipIdList = scholarshipIds.map(s => s.id);

      // Buscar todas as aplicações
      const { data: applications } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          student_id,
          status,
          applied_at,
          is_application_fee_paid,
          is_scholarship_fee_paid,
          scholarship_id
        `)
        .in('scholarship_id', scholarshipIdList)
        .order('applied_at', { ascending: false });

      if (!applications || applications.length === 0) {
        return new Blob(['No data to export'], { type: 'text/csv' });
      }

      // Buscar dados adicionais em lote
      const studentIds = [...new Set(applications.map(app => app.student_id))];
      const scholarshipIdsForDetails = [...new Set(applications.map(app => app.scholarship_id))];

      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, phone, country')
        .in('id', studentIds);

      const { data: scholarships } = await supabase
        .from('scholarships')
        .select(`
          id,
          title,
          amount,
          scholarship_type,
          application_fee_amount,
          universities(name),
          field_of_study,
          level
        `)
        .in('id', scholarshipIdsForDetails);

      // Criar mapas
      const userProfilesMap = new Map(userProfiles?.map(profile => [profile.id, profile]) || []);
      const scholarshipsMap = new Map(scholarships?.map(scholarship => [scholarship.id, scholarship]) || []);

      // Criar CSV
      const csvHeaders = [
        'Student Name',
        'Student Email',
        'Student Country',
        'Scholarship Title',
        'Application Status',
        'Application Fee Paid',
        'Scholarship Fee Paid',
        'Application Fee Amount',
        'Scholarship Amount',
        'Applied Date'
      ].join(',');

      const csvRows = applications.map(application => {
        const userProfile = userProfilesMap.get(application.student_id);
        const scholarship = scholarshipsMap.get(application.scholarship_id);

        return [
          `"${userProfile?.full_name || 'Unknown'}"`,
          `"${userProfile?.email || 'Unknown'}"`,
          `"${userProfile?.country || 'Unknown'}"`,
          `"${scholarship?.title || 'Unknown'}"`,
          `"${application.status}"`,
          `"${application.is_application_fee_paid ? 'Yes' : 'No'}"`,
          `"${application.is_scholarship_fee_paid ? 'Yes' : 'No'}"`,
          `"${scholarship?.application_fee_amount || 0}"`,
          `"${scholarship?.amount || 0}"`,
          `"${new Date(application.applied_at).toLocaleDateString()}"`
        ].join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');
      return new Blob([csvContent], { type: 'text/csv' });

    } catch (error) {
      console.error('Error exporting payments:', error);
      throw new Error('Failed to export payments');
    }
  };

  const hasPayments = payments.length > 0;
  const hasFilters = Object.values(filters).some(value => value !== 'all' && value !== '');

  useEffect(() => {
    if (universityId) {
      loadPayments(1);
    }
  }, [universityId]);

  return {
    payments,
    stats,
    totalCount,
    totalPages,
    loading,
    error,
    currentPage,
    pageSize,
    filters,
    loadPayments,
    updateFilters,
    clearFilters,
    handlePageChange,
    handlePageSizeChange,
    exportPayments,
    hasPayments,
    hasFilters,
  };
};