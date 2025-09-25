import { FilterState, Seller, Student } from '../types';

export const getFilteredAndSortedData = (
  sellers: Seller[],
  students: Student[],
  filters: FilterState
) => {
  let filteredSellers = sellers.filter(seller => {
    // Filtro por vendedor específico
    if (filters.sellerFilter !== 'all' && seller.id !== filters.sellerFilter) return false;
    
    // Filtro por termo de busca
    if (filters.searchTerm && !seller.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
    
    return true;
  });

  let filteredStudents = students.filter((student: any) => {
    console.log(`🔍 Filtering student: ${student.full_name} (${student.id})`);
    console.log(`🔍 Student data:`, {
      referred_by_seller_id: student.referred_by_seller_id,
      status: student.status,
      created_at: student.created_at,
      university_id: student.university_id
    });
    
    // Filtro por vendedor
    if (filters.sellerFilter !== 'all' && student.referred_by_seller_id !== filters.sellerFilter) {
      console.log(`🔍 Student ${student.full_name} filtered out by seller filter: ${student.referred_by_seller_id} !== ${filters.sellerFilter}`);
      return false;
    }
    
    // Filtro por termo de busca
    if (filters.searchTerm && 
        !student.full_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) && 
        !student.email.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      console.log(`🔍 Student ${student.full_name} filtered out by search term: ${filters.searchTerm}`);
      return false;
    }
    
    // Filtro por universidade - corrigido para tratar valores null
    if (filters.universityFilter !== 'all') {
      // Se o filtro não é 'all' e o student.university_id é null/undefined, não filtrar
      if (student.university_id !== null && student.university_id !== undefined && student.university_id !== filters.universityFilter) {
        console.log(`🔍 Student ${student.full_name} filtered out by university filter: ${student.university_id} !== ${filters.universityFilter}`);
        return false;
      }
    }
    
    // Filtro por período
    if (filters.dateRange.start || filters.dateRange.end) {
      const studentDate = new Date(student.created_at);
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
      
      if (startDate && studentDate < startDate) {
        console.log(`🔍 Student ${student.full_name} filtered out by start date: ${studentDate} < ${startDate}`);
        return false;
      }
      if (endDate && studentDate > endDate) {
        console.log(`🔍 Student ${student.full_name} filtered out by end date: ${studentDate} > ${endDate}`);
        return false;
      }
    }
    
    // Filtro por status
    if (filters.statusFilter !== 'all' && student.status !== filters.statusFilter) {
      console.log(`🔍 Student ${student.full_name} filtered out by status filter: ${student.status} !== ${filters.statusFilter}`);
      return false;
    }
    
    console.log(`🔍 Student ${student.full_name} passed all filters`);
    return true;
  });

  // Aplicar ordenação
  const sortData = (data: any[], sortBy: string, sortOrder: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'revenue':
          aValue = a.total_revenue || a.total_paid || 0;
          bValue = b.total_revenue || b.total_paid || 0;
          break;
        case 'students':
          aValue = a.students_count || 0;
          bValue = b.students_count || 0;
          break;
        case 'name':
          aValue = a.name || a.full_name || '';
          bValue = b.name || b.full_name || '';
          break;
        case 'date':
          aValue = new Date(a.created_at || a.last_referral_date);
          bValue = new Date(b.created_at || b.last_referral_date);
          break;
        default:
          aValue = a.total_revenue || a.total_paid || 0;
          bValue = b.total_revenue || b.total_paid || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  filteredSellers = sortData(filteredSellers, filters.sortBy, filters.sortOrder);
  
  // Para estudantes, ordenar por data de criação (mais recentes primeiro)
  filteredStudents = sortData(filteredStudents, 'date', 'desc');

  return { filteredSellers, filteredStudents };
};
