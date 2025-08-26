import React, { useState, useEffect, useCallback } from 'react';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Eye, 
  DollarSign, 
  Calendar, 
  MapPin, 
  User, 
  ChevronDown,
  ChevronRight,
  Users,
  Phone,
  Building,
  Award,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudentInfo {
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  field_of_interest: string;
  academic_level: string;
  gpa: number;
  english_proficiency: string;
  registration_date: string;
  current_status: string;
  seller_referral_code: string;
  seller_name: string;
  total_fees_paid: number;
  fees_count: number;
  scholarship_title?: string;
  university_name?: string;
  selected_scholarship_id?: string;
  documents_status?: string;
  is_application_fee_paid?: boolean;
  is_scholarship_fee_paid?: boolean;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
}

interface FeePayment {
  payment_id: string;
  fee_type: string;
  fee_name: string;
  amount_paid: number;
  currency: string;
  payment_status: string;
  payment_date: string;
  stripe_payment_intent: string;
  notes: string;
}

interface ScholarshipApplication {
  id: string;
  status: string;
  student_process_type: string;
  applied_at: string;
  reviewed_at: string;
  notes: string;
  documents: any[];
  acceptance_letter_status: string;
  acceptance_letter_url: string;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  paid_at: string;
  payment_status: string;
  has_paid_selection_process_fee?: boolean;
  has_paid_i20_control_fee?: boolean;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  students_count: number;
  total_revenue: number;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  country?: string;
  referred_by_seller_id: string | null;
  seller_name: string;
  seller_referral_code: string;
  referral_code_used: string;
  total_paid: number;
  created_at: string;
  status: string;
  user_id: string;
}

const EnhancedStudentTracking: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentInfo | null>(null);
  const [feeHistory, setFeeHistory] = useState<FeePayment[]>([]);
  const [scholarshipApplication, setScholarshipApplication] = useState<ScholarshipApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerFilter, setSellerFilter] = useState('all');

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar sellers ativos
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (sellersError) {
        console.error('Error loading sellers:', sellersError);
        throw new Error(`Failed to load sellers: ${sellersError.message}`);
      }

      // Buscar estudantes que têm seller_referral_code preenchido
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('*')
        .not('seller_referral_code', 'is', null)
        .neq('seller_referral_code', '')
        .order('created_at', { ascending: false });

      if (studentsError) {
        console.error('Error loading students:', studentsError);
        throw new Error(`Failed to load students: ${studentsError.message}`);
      }

      // Processar estudantes
      const processedStudents = (studentsData || []).map(studentProfile => {
        console.log(`🔍 Processing student: ${studentProfile.full_name} with seller code: ${studentProfile.seller_referral_code}`);
        return {
          id: studentProfile.user_id,
          user_id: studentProfile.user_id,
          full_name: studentProfile.full_name || 'Nome não disponível',
          email: studentProfile.email || 'Email não disponível',
          country: studentProfile.country || 'País não disponível',
          referred_by_seller_id: null, // Será definido depois
          seller_name: 'Vendedor não disponível',
          seller_referral_code: studentProfile.seller_referral_code || '',
          referral_code_used: studentProfile.seller_referral_code || '',
          total_paid: 0, // Será calculado depois
          created_at: studentProfile.created_at || new Date().toISOString(),
          status: 'active'
        };
      });

      // Buscar valores reais dos estudantes (pagamentos, taxas, etc.)
      const studentUserIds = processedStudents.map(s => s.user_id);
      let studentApplications: any[] = [];

      if (studentUserIds.length > 0) {
        // Buscar aplicações de bolsa dos estudantes
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('scholarship_applications')
          .select('*')
          .in('student_id', studentUserIds);

        if (!applicationsError) {
          studentApplications = applicationsData || [];
        }
      }

      // Calcular valores reais para cada estudante
      processedStudents.forEach(student => {
        // Verificar status de pagamentos através das aplicações
        const studentApplication = studentApplications.find(a => a.student_id === student.user_id);
        if (studentApplication) {
          student.status = studentApplication.status || 'active';
          
          // Calcular total pago baseado nos status de pagamento
          let totalPaid = 0;
          if (studentApplication.is_application_fee_paid) totalPaid += 350; // Taxa de inscrição
          if (studentApplication.is_scholarship_fee_paid) totalPaid += 850; // Taxa de bolsa
          if (studentApplication.has_paid_selection_process_fee) totalPaid += 600; // Processo seletivo
          if (studentApplication.has_paid_i20_control_fee) totalPaid += 1250; // Controle I-20
          
          student.total_paid = totalPaid;
        }
      });

      // Processar vendedores
      const processedSellers = (sellersData || []).map(seller => {
        const sellerStudents = processedStudents.filter(student => 
          student.seller_referral_code === seller.referral_code
        );
        
        console.log(`🔍 Processing seller: ${seller.name} with code: ${seller.referral_code}, found ${sellerStudents.length} students`);
        
        return {
          id: seller.id,
          name: seller.name || 'Nome não disponível',
          email: seller.email || 'Email não disponível',
          referral_code: seller.referral_code || '',
          is_active: seller.is_active,
          created_at: seller.created_at || new Date().toISOString(),
          students_count: sellerStudents.length,
          total_revenue: sellerStudents.reduce((sum, s) => sum + s.total_paid, 0)
        };
      });

      // Atualizar nomes dos sellers nos estudantes
      processedStudents.forEach(student => {
        const seller = processedSellers.find(s => s.referral_code === student.seller_referral_code);
        if (seller) {
          student.seller_name = seller.name;
          student.referred_by_seller_id = seller.id; // Atualizar para usar o ID do seller
          console.log(`🔍 Student ${student.full_name} linked to seller ${seller.name} (${seller.id})`);
        } else {
          console.log(`⚠️ Student ${student.full_name} with code ${student.seller_referral_code} has no matching seller`);
        }
      });

      console.log('🔍 Final processed data:', {
        students: processedStudents.map(s => ({
          name: s.full_name,
          sellerCode: s.seller_referral_code,
          sellerId: s.referred_by_seller_id,
          sellerName: s.seller_name
        })),
        sellers: processedSellers.map(s => ({
          name: s.name,
          code: s.referral_code,
          id: s.id,
          studentsCount: s.students_count
        }))
      });

      console.log('🔍 Debug - Processed data:', {
        sellers: processedSellers.length,
        students: processedStudents.length,
        sellerCodes: processedSellers.map(s => s.referral_code),
        studentSellerCodes: processedStudents.map(s => s.seller_referral_code),
        sellerDetails: processedSellers.map(s => ({
          id: s.id,
          name: s.name,
          code: s.referral_code,
          students: s.students_count
        })),
        studentDetails: processedStudents.map(s => ({
          id: s.id,
          name: s.full_name,
          sellerCode: s.seller_referral_code,
          sellerName: s.seller_name
        }))
      });

      setSellers(processedSellers);
      setStudents(processedStudents);

    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar detalhes de um estudante específico
  const loadStudentDetails = useCallback(async (studentId: string) => {
    try {
      console.log('🔍 Loading details for student:', studentId);
      setLoadingStudentDetails(true);
      setSelectedStudent(studentId);

      // Carregar informações detalhadas do estudante
      console.log('🔍 Calling get_student_detailed_info with studentId:', studentId);
      
      // Primeiro, buscar o user_id do estudante na tabela user_profiles
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', studentId)
        .single();

      if (userProfileError) {
        console.error('Error finding user profile:', userProfileError);
        return;
      }

      const profileId = userProfileData?.id;
      console.log('🔍 Found profile ID:', profileId);

      const { data: studentData, error: studentError } = await supabase.rpc(
        'get_student_detailed_info',
        { target_student_id: profileId }
      );

      console.log('🔍 Student details response:', { data: studentData, error: studentError });

      if (studentError) {
        console.error('Error loading student details:', studentError);
        return;
      }

      if (studentData && studentData.length > 0) {
        setStudentDetails(studentData[0]);
        console.log('🔍 Student details set:', studentData[0]);
      } else {
        console.log('🔍 No student details found for ID:', studentId);
      }

      // Carregar histórico de taxas
      const { data: feesData, error: feesError } = await supabase.rpc(
        'get_student_fee_history',
        { target_student_id: profileId }
      );

      console.log('🔍 Fee history response:', { data: feesData, error: feesError });

      if (!feesError) {
        setFeeHistory(feesData || []);
      }

      // Carregar aplicação de bolsa
      const { data: applicationsList, error: listError } = await supabase
        .from('scholarship_applications')
        .select('id, status, created_at')
        .eq('student_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('🔍 Applications list response:', { data: applicationsList, error: listError });

      if (applicationsList && applicationsList.length > 0) {
        const latestApplication = applicationsList[0];
        
        const { data: appData, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select('*')
          .eq('id', latestApplication.id)
          .single();

        console.log('🔍 Application details response:', { data: appData, error: applicationError });

        if (!applicationError) {
          setScholarshipApplication(appData);
        }
      }

    } catch (error: any) {
      console.error('Error loading student details:', error);
    } finally {
      setLoadingStudentDetails(false);
    }
  }, []);

  // Filtrar dados
  const filteredSellers = sellers.filter(seller => {
    if (sellerFilter !== 'all' && seller.id !== sellerFilter) return false;
    if (searchTerm && !seller.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredStudents = students.filter(student => {
    if (sellerFilter !== 'all' && student.referred_by_seller_id !== sellerFilter) return false;
    if (searchTerm && !student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !student.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  console.log('🔍 Filtered data:', {
    totalStudents: students.length,
    filteredStudents: filteredStudents.length,
    sellerFilter,
    searchTerm,
    studentSellerIds: students.map(s => ({ id: s.id, name: s.full_name, sellerId: s.referred_by_seller_id }))
  });

  // Toggle expandir vendedor
  const toggleSellerExpansion = (sellerId: string) => {
    setExpandedSellers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sellerId)) {
        newSet.delete(sellerId);
      } else {
        newSet.add(sellerId);
      }
      return newSet;
    });
  };

  // Voltar para lista
  const backToList = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
    setFeeHistory([]);
    setScholarshipApplication(null);
  };

  // Formatação
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Carregando dados...</p>
      </div>
    );
  }

  // Se um estudante está selecionado, mostrar detalhes
  if (selectedStudent && studentDetails) {
    return (
      <div className="space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center space-x-4">
          <button
            onClick={backToList}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar para lista</span>
          </button>
        </div>

        {/* Detalhes do estudante */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{studentDetails.full_name}</h1>
              <p className="text-slate-600">{studentDetails.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Vendedor</p>
              <p className="font-medium text-slate-900">{studentDetails.seller_name}</p>
            </div>
          </div>

          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Telefone</p>
                <p className="font-medium text-slate-900">{studentDetails.phone || 'Não informado'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">País</p>
                <p className="font-medium text-slate-900">{studentDetails.country || 'Não informado'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <GraduationCap className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Área de Interesse</p>
                <p className="font-medium text-slate-900">{studentDetails.field_of_interest || 'Não informado'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Nível Acadêmico</p>
                <p className="font-medium text-slate-900">{studentDetails.academic_level || 'Não informado'}</p>
              </div>
            </div>

                       <div className="flex items-center space-x-3">
             <Award className="h-5 w-5 text-slate-400" />
             <div>
               <p className="text-sm text-slate-500">GPA</p>
               <p className="font-medium text-slate-900">{studentDetails.gpa || 'Não informado'}</p>
             </div>
           </div>

                       <div className="flex items-center space-x-3">
             <Calendar className="h-5 w-5 text-slate-400" />
             <div>
               <p className="text-sm text-slate-500">Data de Registro</p>
               <p className="font-medium text-slate-900">{formatDate(studentDetails.registration_date)}</p>
             </div>
           </div>
          </div>

          {/* Status de pagamentos */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Status de Pagamentos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Taxa de Inscrição</p>
                <div className="mt-2">
                  {studentDetails.is_application_fee_paid ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 mx-auto" />
                  )}
                </div>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Taxa de Bolsa</p>
                <div className="mt-2">
                  {studentDetails.is_scholarship_fee_paid ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 mx-auto" />
                  )}
                </div>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Processo Seletivo</p>
                <div className="mt-2">
                  {studentDetails.has_paid_selection_process_fee ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 mx-auto" />
                  )}
                </div>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Controle I-20</p>
                <div className="mt-2">
                  {studentDetails.has_paid_i20_control_fee ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 mx-auto" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de pagamentos */}
          {feeHistory.length > 0 && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Histórico de Pagamentos</h3>
              <div className="space-y-3">
                {feeHistory.map((fee) => (
                  <div key={fee.payment_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{fee.fee_name}</p>
                      <p className="text-sm text-slate-500">{fee.fee_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">{formatCurrency(fee.amount_paid)}</p>
                      <p className="text-sm text-slate-500">{formatDate(fee.payment_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações da bolsa */}
          {scholarshipApplication && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Informações da Bolsa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="font-medium text-slate-900">{scholarshipApplication.status}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tipo de Processo</p>
                  <p className="font-medium text-slate-900">{scholarshipApplication.student_process_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Data de Aplicação</p>
                  <p className="font-medium text-slate-900">{formatDate(scholarshipApplication.applied_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status de Pagamento</p>
                  <p className="font-medium text-slate-900">{scholarshipApplication.payment_status}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lista principal de vendedores e estudantes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Tracking</h1>
          <p className="mt-1 text-sm text-slate-600">
            Acompanhe todos os vendedores e seus estudantes
          </p>
        </div>
        <button
          onClick={loadData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar vendedores ou estudantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="seller-filter" className="block text-sm font-medium text-slate-700 mb-2">
              Filtrar por Vendedor
            </label>
            <select
              id="seller-filter"
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="all">Todos os Vendedores</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

                           {/* Lista de vendedores */}
        <div className="space-y-4">
          {filteredSellers.map((seller) => {
           const sellerStudents = filteredStudents.filter(student => 
             student.referred_by_seller_id === seller.id
           );
           
           console.log(`🔍 Seller ${seller.name} (${seller.id}): ${sellerStudents.length} students`);
           console.log(`🔍 Students for ${seller.name}:`, sellerStudents.map(s => ({ name: s.full_name, id: s.id, sellerId: s.referred_by_seller_id })));
           
           return (
            <div key={seller.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header do vendedor */}
              <div 
                className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleSellerExpansion(seller.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900">{seller.name}</h3>
                      <p className="text-sm text-slate-500">{seller.email}</p>
                      <p className="text-xs text-slate-400 font-mono">{seller.referral_code}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm text-slate-500">Estudantes</p>
                      <p className="text-2xl font-bold text-blue-600">{seller.students_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-500">Receita</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(seller.total_revenue)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-500">Cadastrado</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(seller.created_at)}</p>
                    </div>
                    {expandedSellers.has(seller.id) ? (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de estudantes (expandível) */}
              {expandedSellers.has(seller.id) && (
                <div className="border-t border-slate-200">
                  {sellerStudents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Estudante
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Código Usado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Receita
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Cadastrado em
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {sellerStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-sm font-medium text-green-600">
                                      {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-slate-900">{student.full_name}</div>
                                    <div className="text-sm text-slate-500">{student.email}</div>
                                    {student.country && (
                                      <div className="flex items-center text-xs text-slate-400 mt-1">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {student.country}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                                  {student.referral_code_used}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                                  <span className="text-sm font-medium text-slate-900">
                                    {formatCurrency(student.total_paid)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                                  {student.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {formatDate(student.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                 <button
                                   onClick={() => loadStudentDetails(student.id)}
                                   className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                 >
                                   <Eye className="h-4 w-4" />
                                   <span>Ver Detalhes</span>
                                 </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">Nenhum estudante encontrado para este vendedor.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Estado vazio */}
      {filteredSellers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum vendedor encontrado</h3>
          <p className="text-slate-600">
            Tente ajustar os filtros de busca.
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedStudentTracking;
