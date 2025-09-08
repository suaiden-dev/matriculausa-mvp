import React, { useState, useEffect, useCallback } from 'react';
import {
  useStudentData,
  useStudentDetails,
  useFilters,
  getFilteredAndSortedData,
  handleViewDocument,
  handleDownloadDocument,
  StudentDetailsView,
  DocumentsView,
  AdvancedFilters,
  StatsCards,
  SellersList
} from '../../components/EnhancedStudentTracking';
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
  ArrowLeft,
  Home,
  BarChart3,
  Settings,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter as FilterIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDocumentStatusDisplay } from '../../utils/documentStatusMapper';

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
  student_process_type?: string;
  application_status?: string;
  documents?: any[];
  scholarship?: {
    application_fee_amount?: number;
    scholarship_fee_amount?: number;
  };
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
  profile_id: string;
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
  university_id?: string;
  university_name?: string;
}

interface University {
  id: string;
  name: string;
  logo_url?: string;
  location?: string;
}

interface FilterState {
  searchTerm: string;
  sellerFilter: string;
  universityFilter: string;
  dateRange: {
    start: string;
    end: string;
  };
  statusFilter: string;
  paymentStatusFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const EnhancedStudentTracking: React.FC<{ userId?: string }> = ({ userId }) => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentInfo | null>(null);
  const [feeHistory, setFeeHistory] = useState<FeePayment[]>([]);
  const [scholarshipApplication, setScholarshipApplication] = useState<ScholarshipApplication | null>(null);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    console.log('🔍 studentDocuments:', studentDocuments);
  }, [studentDocuments]);
  
  // Estado dos filtros
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    sellerFilter: 'all',
    universityFilter: 'all',
    dateRange: {
      start: '',
      end: ''
    },
    statusFilter: 'all',
    paymentStatusFilter: 'all',
    sortBy: 'revenue',
    sortOrder: 'desc'
  });

  // Carregar universidades para filtros
  const loadUniversities = useCallback(async () => {
    try {
      const { data: universitiesData, error: universitiesError } = await supabase
        .from('universities')
        .select('id, name, logo_url, location')
        .eq('is_approved', true)
        .order('name');

      if (!universitiesError && universitiesData) {
        setUniversities(universitiesData);
      }
    } catch (error) {
      console.warn('Could not load universities:', error);
    }
  }, []);

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Carregar universidades em paralelo
      await loadUniversities();

      // Carregar universidades em paralelo
      await loadUniversities();

      // Se userId estiver disponível, tentar usar funções SQL corrigidas para dados reais
      if (userId) {
        try {
          console.log('🔍 Attempting to load data using SQL functions for admin user:', userId);
          
          // Buscar dados reais usando funções SQL corrigidas
          const { data: realSellersData, error: realSellersError } = await supabase
            .rpc('get_admin_sellers_analytics_fixed', { admin_user_id: userId });

          console.log('🔍 SQL sellers response:', { data: realSellersData, error: realSellersError });

          let processedSellers: any[] = [];
          let processedStudents: any[] = [];

          if (!realSellersError && realSellersData && realSellersData.length > 0) {
            processedSellers = realSellersData.map((seller: any) => ({
              id: seller.seller_id,
              name: seller.seller_name || 'Name not available',
              email: seller.seller_email || 'Email not available',
              referral_code: seller.referral_code || '',
              is_active: seller.is_active,
              created_at: seller.last_referral_date || new Date().toISOString(),
              students_count: seller.students_count || 0,
              total_revenue: Number(seller.total_revenue) || 0
            }));
            
            console.log('🔍 Processed sellers from SQL:', processedSellers);
          } else {
            console.log('🔍 SQL sellers function failed or returned no data, will use fallback');
          }

          // Buscar dados reais dos estudantes
          const { data: realStudentsData, error: realStudentsError } = await supabase
            .rpc('get_admin_students_analytics', { admin_user_id: userId });

          console.log('🔍 SQL students response:', { data: realStudentsData, error: realStudentsError });

          if (!realStudentsError && realStudentsData && realStudentsData.length > 0) {
            // Processar estudantes e calcular receita real
            const studentsWithRevenue = await Promise.all(
              realStudentsData.map(async (student: any) => {
                const realRevenue = await calculateStudentRevenue(student.student_id, student.profile_id);
                return {
                  id: student.student_id,
                  profile_id: student.profile_id,
                  user_id: student.student_id,
                  full_name: student.student_name,
                  email: student.student_email,
                  country: student.country,
                  referred_by_seller_id: student.referred_by_seller_id,
                  seller_name: student.seller_name,
                  seller_referral_code: student.seller_referral_code,
                  referral_code_used: student.referral_code_used,
                  total_paid: realRevenue, // Usar receita real calculada
                  created_at: student.created_at,
                  status: student.status
                };
              })
            );
            
            processedStudents = studentsWithRevenue;
            
            console.log('🔍 Processed students from SQL with real revenue:', processedStudents);
            console.log('🔍 SQL Students debug - referred_by_seller_id values:', processedStudents.map((s: any) => ({
              name: s.full_name,
              referred_by_seller_id: s.referred_by_seller_id,
              seller_name: s.seller_name,
              total_paid: s.total_paid
            })));
            
            setStudents(processedStudents);
          } else {
            console.log('🔍 SQL students function failed or returned no data, will use fallback');
          }

          // Se ambas as funções SQL funcionaram e retornaram dados, não usar fallback
          if (!realSellersError && !realStudentsError && 
              realSellersData && realSellersData.length > 0 && 
              realStudentsData && realStudentsData.length > 0) {
            console.log('🔍 SQL functions successful, skipping fallback');
            console.log('🔍 Final state - Students loaded via SQL:', realStudentsData.length);
            console.log('🔍 Final state - Sellers loaded via SQL:', realSellersData.length);
            
            // Debug: verificar se os dados estão sendo mapeados corretamente
            console.log('🔍 Final processed students:', processedStudents);
            console.log('🔍 Final processed sellers:', processedSellers);
            
            // Verificar se os estudantes têm referred_by_seller_id
            const studentsWithSellerId = processedStudents.filter((s: any) => s.referred_by_seller_id);
            console.log('🔍 Students with referred_by_seller_id:', studentsWithSellerId.length);
            console.log('🔍 Students without referred_by_seller_id:', processedStudents.length - studentsWithSellerId.length);
            
            // Calcular receita real para vendedores SQL
            const sellersWithRealRevenue = processedSellers.map((seller: any) => {
              const sellerStudents = processedStudents.filter((student: any) => 
                student.referred_by_seller_id === seller.id
              );
              
              const actualRevenue = sellerStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0);
              
              return {
                ...seller,
                students_count: sellerStudents.length,
                total_revenue: actualRevenue
              };
            });
            
            console.log('🔍 Sellers with real revenue:', sellersWithRealRevenue);
            
            setSellers(sellersWithRealRevenue);
            setStudents(processedStudents);
            return;
          }
        } catch (error) {
          console.warn('🔍 SQL functions exception, using fallback:', error);
        }
      }

      // Fallback para método antigo se userId não estiver disponível ou se as funções SQL falharem
      console.log('🔍 Using fallback method to load data directly from tables');

      // Buscar sellers ativos usando função RPC
      const { data: sellersData, error: sellersError } = await supabase
        .rpc('get_admin_sellers_analytics_fixed', { 
          admin_user_id: currentUser?.id 
        });

      console.log('🔍 Fallback sellers response:', { data: sellersData, error: sellersError });

      if (sellersError) {
        console.error('Error loading sellers:', sellersError);
        throw new Error(`Failed to load sellers: ${sellersError.message}`);
      }

      // Buscar estudantes usando função RPC
      const { data: studentsData, error: studentsError } = await supabase
        .rpc('get_admin_students_analytics', { 
          admin_user_id: currentUser?.id 
        });

      // Usar os dados de sellers já carregados pela função RPC
      const activeSellersData = sellersData || [];
      const activeSellersError = null;

      console.log('🔍 Query completed. Data:', activeSellersData?.length, 'Error:', activeSellersError);
      
      if (activeSellersError) {
        console.error('❌ Error loading active sellers:', activeSellersError);
        console.error('❌ Full error object:', JSON.stringify(activeSellersError, null, 2));
        throw new Error(`Failed to load active sellers: ${activeSellersError.message}`);
      }

      // Criar conjunto de códigos de vendedores ativos
      const activeSellerCodes = new Set(activeSellersData?.map(s => s.referral_code) || []);
      // Códigos de vendedores ativos

      if (studentsError) {
        console.error('Error loading students:', studentsError);
        throw new Error(`Failed to load students: ${studentsError.message}`);
      }

      // Processar estudantes com dados reais - filtrar apenas aqueles referenciados por vendedores ativos
      const processedStudents = await Promise.all(
        (studentsData || [])
          .filter((studentProfile: any) => {
            const isReferencedByActiveSeller = activeSellerCodes.has(studentProfile.seller_referral_code);
            if (!isReferencedByActiveSeller) {
              console.log(`⚠️ Filtering out student ${studentProfile.full_name} (${studentProfile.email}) - referenced by inactive seller with code: ${studentProfile.seller_referral_code}`);
            }
            return isReferencedByActiveSeller;
          })
          .map(async (studentProfile: any) => {
            // Calcular receita real para cada estudante
            const realRevenue = await calculateStudentRevenue(studentProfile.user_id, studentProfile.id);
            
            // Processando estudante
            return {
              id: studentProfile.id, // Usar o ID da tabela user_profiles
              profile_id: studentProfile.profile_id, // profile_id é o mesmo que id para user_profiles
              user_id: studentProfile.user_id,
              full_name: studentProfile.full_name || 'Name not available',
              email: studentProfile.email || 'Email not available',
              country: studentProfile.country || 'Country not available',
              referred_by_seller_id: null, // Será definido depois
              seller_name: 'Seller not available',
              seller_referral_code: studentProfile.seller_referral_code || '',
              referral_code_used: studentProfile.seller_referral_code || '',
              total_paid: realRevenue, // Usar receita real calculada
              created_at: studentProfile.created_at || new Date().toISOString(),
              status: studentProfile.status || 'active'
            };
          })
      );

      // Debug: verificar dados processados
      console.log('🔍 Students filtering results:', {
        totalStudents: studentsData?.length || 0,
        activeSellerCodes: activeSellerCodes.size,
        filteredStudents: processedStudents.length,
        filteredOut: (studentsData?.length || 0) - processedStudents.length
      });
      
      console.log('🔍 Processed Students Data:', processedStudents.map(s => ({
        name: s.full_name,
        profile_id: s.profile_id,
        total_paid: s.total_paid,
        seller_code: s.seller_referral_code
      })));

      // Processar vendedores com dados reais
      const processedSellers = (sellersData || []).map((seller: any) => {
        const sellerStudents = processedStudents.filter((student: any) => 
          student.referred_by_seller_id === seller.id
        );
        
        // Calcular receita real baseada nos pagamentos dos estudantes
        const actualRevenue = sellerStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0);
        
        console.log(`🔍 Processing seller: ${seller.seller_name} with code: ${seller.referral_code}, found ${sellerStudents.length} students, actual revenue: ${actualRevenue}`);
        
        return {
          id: seller.id,
          name: seller.name || 'Name not available',
          email: seller.email || 'Email not available',
          referral_code: seller.referral_code || '',
          is_active: seller.is_active,
          created_at: seller.created_at || new Date().toISOString(),
          students_count: sellerStudents.length, // Usar contagem real dos estudantes
          total_revenue: actualRevenue // Usar receita real calculada
        };
      });

      // Atualizar nomes dos sellers nos estudantes
      processedStudents.forEach((student: any) => {
        const seller = processedSellers.find((s: any) => s.referral_code === student.seller_referral_code);
        if (seller) {
          student.seller_name = seller.name;
          student.referred_by_seller_id = seller.id; // Atualizar para usar o ID do seller
          console.log(`🔍 Student ${student.full_name} linked to seller ${seller.name} (${seller.id})`);
        } else {
          console.log(`⚠️ Student ${student.full_name} with code ${student.seller_referral_code} has no matching seller`);
        }
      });

      console.log('🔍 Final processed data:', {
        students: processedStudents.map((s: any) => ({
          name: s.full_name,
          profile_id: s.profile_id,
          sellerCode: s.seller_referral_code,
          sellerId: s.referred_by_seller_id,
          sellerName: s.seller_name
        })),
        sellers: processedSellers.map((s: any) => ({
          name: s.name,
          code: s.referral_code,
          id: s.id,
          studentsCount: s.students_count
        }))
      });

      console.log('🔍 Debug - Processed data:', {
        sellers: processedSellers.length,
        students: processedStudents.length,
        sellerCodes: processedSellers.map((s: any) => s.referral_code),
        studentSellerCodes: processedStudents.map((s: any) => s.seller_referral_code),
        sellerDetails: processedSellers.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.referral_code,
          students: s.students_count
        })),
        studentDetails: processedStudents.map((s: any) => ({
          id: s.id,
          profile_id: s.profile_id,
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
  }, [loadUniversities]);

  // Carregar detalhes de um estudante específico
  const loadStudentDetails = useCallback(async (studentId: string, profile_id: string) => {
    try {
      console.log('🔍 Loading details for student:', studentId);
      setLoadingStudentDetails(true);
      setSelectedStudent(studentId);

      // Primeiro, tentar usar as funções SQL criadas para obter detalhes do estudante
      console.log('🔍 Calling get_student_detailed_info with studentId:', studentId);
      
      let studentData = null;
      let studentError = null;
      let documentsData: any[] = [];
      
      try {
        const { data: sqlData, error: sqlError } = await supabase.rpc(
          'get_student_detailed_info',
          { target_student_id: studentId }
        );

        console.log('🔍 Student details SQL response:', { data: sqlData, error: sqlError });

        if (!sqlError && sqlData && sqlData.length > 0) {
          studentData = sqlData[0];
          console.log('🔍 SQL function returned data:', studentData);
        } else {
          console.log('🔍 SQL function failed or returned no data, using fallback');
          studentError = sqlError;
        }
      } catch (sqlException) {
        console.log('🔍 SQL function exception:', sqlException);
        studentError = sqlException;
      }

      // Se a função SQL falhou ou retornou dados vazios, usar fallback robusto
      if (!studentData) {
        console.log('🔍 Using robust fallback to fetch student data directly from tables');
        
        // Buscar dados básicos do estudante
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', studentId)
          .single();

        if (profileError) {
          console.error('Error loading user profile:', profileError);
          setError('Failed to load student profile');
          return;
        }

        // Buscar aplicação de bolsa mais recente
        const { data: applicationData, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            scholarships (
              id,
              title,
              application_fee_amount,
              scholarship_fee_amount,
              universities (
                id,
                name
              )
            )
          `)
          .eq('student_id', profile_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        console.log('🔍 Application data 13:', applicationData);


        let sellerData = null;
        if (profileData.seller_referral_code) {
          // Buscar seller usando função RPC
          const { data: sellersResult } = await supabase
            .rpc('get_admin_sellers_analytics_fixed', { 
              admin_user_id: currentUser?.id 
            });
          const sellerResult = sellersResult?.find((s: any) => s.referral_code === profileData.seller_referral_code);
          
          if (sellerResult) {
            sellerData = { name: sellerResult.seller_name };
          }
        }

        // Buscar histórico de taxas
        const { data: feesData, error: feesError } = await supabase
          .from('stripe_connect_transfers')
          .select('*')
          .eq('user_id', studentId)
          .eq('status', 'succeeded');

        // Extrair documentos da aplicação principal
        let documentsData: any = applicationData[0].documents;
        // if (applicationsData && applicationsData.length > 0) {
        //   applicationsData.forEach((application: any) => {
        //     if (application.documents && Array.isArray(application.documents)) {
        //       // Adicionar metadados da aplicação aos documentos
        //       const documentsWithMetadata = application.documents.map((doc: any) => ({
        //         ...doc,
        //         application_id: application.id,
        //         application_created_at: application.created_at
        //       }));
        //       documentsData = [...documentsData, ...documentsWithMetadata];
        //     }
        //   });
        // }
        console.log('🔍 Applications data:', documentsData);

        // Construir objeto de dados do estudante
        studentData = {
          student_id: profileData.user_id,
          full_name: profileData.full_name || 'Name not available',
          email: profileData.email || 'Email not available',
          phone: profileData.phone || 'Phone not available',
          country: profileData.country || 'Country not available',
          field_of_interest: profileData.field_of_interest || 'Field not specified',
          academic_level: profileData.academic_level || 'Level not specified',
          gpa: profileData.gpa || 0,
          english_proficiency: profileData.english_proficiency || 'Not specified',
          registration_date: profileData.created_at || new Date().toISOString(),
          current_status: profileData.status || 'active',
          seller_referral_code: profileData.seller_referral_code || '',
          seller_name: sellerData?.name || 'Seller not available',
          total_fees_paid: feesData ? feesData.reduce((sum, fee) => sum + (fee.amount || 0), 0) : 0,
          fees_count: feesData ? feesData.length : 0,
          scholarship_title: applicationData?.scholarships?.title || 'Scholarship not specified',
          university_name: applicationData?.scholarships?.universities?.name || 'University not specified',
          selected_scholarship_id: applicationData?.scholarship_id || null,
          documents_status: profileData.documents_status || 'Not started',
          is_application_fee_paid: profileData.is_application_fee_paid || false,
          is_scholarship_fee_paid: profileData.is_scholarship_fee_paid || false,
          has_paid_selection_process_fee: profileData.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: profileData.has_paid_i20_control_fee || false,
          student_process_type: applicationData?.student_process_type || 'Not specified',
          application_status: applicationData?.status || 'Pending',
          documents: documentsData || [],
          scholarship: applicationData?.scholarships ? {
            application_fee_amount: applicationData.scholarships[0]?.application_fee_amount,
            scholarship_fee_amount: applicationData.scholarships[0]?.scholarship_fee_amount
          } : undefined
        };

        setStudentDocuments(applicationData?.documents);

        console.log('🔍 Fallback data constructed:', studentData);
      }
      
      console.log('🔍 Student Documents 1:', studentData);

      if (studentData) {
        console.log('🔍 Setting student details:', studentData);
        console.log('🔍 Student details keys:', Object.keys(studentData));
        console.log('🔍 Student process type value:', studentData.student_process_type);
        console.log('🔍 Application status value:', studentData.application_status);
        console.log('🔍 Full student details object:', JSON.stringify(studentData, null, 2));

        const { data: applicationData, error: applicationError } = await supabase
          .from('scholarship_applications')
          .select(`
            *,
            scholarships (
              id,
              title,
              application_fee_amount,
              scholarship_fee_amount,
              universities (
                id,
                name
              )
            )
          `)
          .eq('student_id', profile_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

          studentData.documents = applicationData?.documents;

          setStudentDocuments(applicationData?.documents);

        setStudentDetails(studentData);
        
        console.log('🔍 Student Documents 2:', studentData);

        // Definir aplicação de bolsa
        if (studentData.selected_scholarship_id) {
          setScholarshipApplication({
            id: studentData.selected_scholarship_id,
            status: studentData.application_status || 'pending',
            student_process_type: studentData.student_process_type || 'Not specified',
            applied_at: studentData.registration_date || new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            notes: '',
            documents: studentData.documents || [],
            acceptance_letter_status: 'pending',
            acceptance_letter_url: '',
            is_application_fee_paid: studentData.is_application_fee_paid || false,
            is_scholarship_fee_paid: studentData.is_scholarship_fee_paid || false,
            paid_at: new Date().toISOString(),
            payment_status: 'pending',
            has_paid_selection_process_fee: studentData.has_paid_selection_process_fee || false,
            has_paid_i20_control_fee: studentData.has_paid_i20_control_fee || false
          });
        }

        // Definir histórico de taxas
        if (studentData.total_fees_paid > 0) {
          setFeeHistory([{
            payment_id: 'fallback',
            fee_type: 'application',
            fee_name: 'Application Fee',
            amount_paid: studentData.total_fees_paid,
            currency: 'USD',
            payment_status: 'succeeded',
            payment_date: studentData.registration_date,
            stripe_payment_intent: 'fallback',
            notes: 'Fee payment recorded'
          }]);
        } else {
          setFeeHistory([]);
        }
      } else {
        setError('Student details not found');
      }

      console.log('🔍 Final state after loading:', {
        selectedStudent: studentId,
        studentDetails: studentData,
        scholarshipApplication: studentData?.selected_scholarship_id ? {
          id: studentData.selected_scholarship_id,
          status: studentData.application_status || 'pending',
          student_process_type: studentData.student_process_type || 'Not specified'
        } : null,
        studentDocuments: studentData?.documents || []
      });

    } catch (error: any) {
      console.error('Error loading student details:', error);
      setError('Failed to load student details');
    } finally {
      setLoadingStudentDetails(false);
    }
  }, []);

  // Aplicar filtros e ordenação
  const { filteredSellers, filteredStudents } = getFilteredAndSortedData();
  
  // Debug: verificar estado dos dados
  console.log('🔍 Data state check:', {
    totalStudents: students.length,
    totalSellers: sellers.length,
    filteredStudents: filteredStudents.length,
    filteredSellers: filteredSellers.length,
    filters: filters
  });
  
  // Debug: verificar se há estudantes com referred_by_seller_id
  if (students.length > 0) {
    console.log('🔍 Students with referred_by_seller_id:', students.map((s: any) => ({
      name: s.full_name,
      referred_by_seller_id: s.referred_by_seller_id,
      type: typeof s.referred_by_seller_id
    })));
  }
  
  // Debug: verificar se há problemas nos filtros
  if (filteredStudents.length === 0 && students.length > 0) {
    console.log('🔍 WARNING: All students filtered out!');
    console.log('🔍 Filter details:', filters);
    console.log('🔍 First few students:', students.slice(0, 3).map((s: any) => ({
      name: s.full_name,
      referred_by_seller_id: s.referred_by_seller_id,
      status: s.status,
      created_at: s.created_at
    })));
  }

  // Resetar filtros
  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      sellerFilter: 'all',
      universityFilter: 'all',
      dateRange: { start: '', end: '' },
      statusFilter: 'all',
      paymentStatusFilter: 'all',
      sortBy: 'revenue',
      sortOrder: 'desc'
    });
  };

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
    setStudentDocuments([]);
  };

  // Formatação
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Função para calcular a receita real baseada nas taxas pagas
  const calculateStudentRevenue = async (studentId: string, profileId: string) => {
    try {
      console.log('🔍 Calculating revenue for student:', studentId, 'profile:', profileId);
      
      let totalRevenue = 0;
      
      // Buscar aplicação de bolsa do estudante
      const { data: applicationData, error: applicationError } = await supabase
        .from('scholarship_applications')
        .select(`
          id,
          is_application_fee_paid,
          is_scholarship_fee_paid,
          scholarships (
            application_fee_amount
          )
        `)
        .eq('student_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (applicationError) {
        console.log('🔍 No scholarship application found, using fallback calculation');
      } else {
        console.log('🔍 Application data found:', applicationData);
        
        // Application Fee (variável - definida pela universidade)
        if (applicationData.is_application_fee_paid) {
          const appFeeAmount = applicationData.scholarships?.[0]?.application_fee_amount || 35000; // Default $350.00
          const appFeeUSD = Number(appFeeAmount) / 100; // Converter de centavos para dólares
          totalRevenue += appFeeUSD;
          console.log(`🔍 Application fee added: $${appFeeUSD}`);
        }
        
        // Scholarship Fee (fixa - $850)
        if (applicationData.is_scholarship_fee_paid) {
          totalRevenue += 850;
          console.log('🔍 Scholarship fee added: $850');
        }
      }
      
      // Buscar perfil do usuário para taxas fixas
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          has_paid_selection_process_fee,
          has_paid_i20_control_fee
        `)
        .eq('id', profileId)
        .single();

      if (!profileError && profileData) {
        console.log('🔍 Profile data found:', profileData);
        
        // Selection Process Fee (fixa - $999)
        if (profileData.has_paid_selection_process_fee) {
          totalRevenue += 999;
          console.log('🔍 Selection process fee added: $999');
        }
        
        // I-20 Control Fee (fixa - $999)
        if (profileData.has_paid_i20_control_fee) {
          totalRevenue += 999;
          console.log('🔍 I-20 control fee added: $999');
        }
      }
      
      console.log(`🔍 Total revenue calculated for student ${studentId}: $${totalRevenue}`);
      return totalRevenue;
      
    } catch (error) {
      console.error('🔍 Error calculating student revenue:', error);
      return 0;
    }
  };

  // Funções para visualizar e baixar documentos
  const handleViewDocument = (doc: any) => {
    console.log('=== DEBUG handleViewDocument ===');
    console.log('Documento recebido:', doc);
    
    // Verificação de segurança adicional
    if (!doc || !doc.url) {
      console.log('Documento ou url está vazio ou undefined');
      return;
    }
    
    console.log('url:', doc.url);
    console.log('Tipo de url:', typeof doc.url);
    
    // Converter a URL do storage para URL pública se necessário
    try {
      // Se url é um path do storage, converter para URL pública
      if (doc.url && !doc.url.startsWith('http')) {
        const publicUrl = supabase.storage
          .from('student-documents')
          .getPublicUrl(doc.url)
          .data.publicUrl;
        
        console.log('URL pública gerada:', publicUrl);
        window.open(publicUrl, '_blank');
      } else {
        // Se já é uma URL completa, usar diretamente
        console.log('Usando URL existente:', doc.url);
        window.open(doc.url, '_blank');
      }
    } catch (error) {
      console.error('Erro ao gerar URL pública:', error);
      // Fallback: tentar usar a URL original
      window.open(doc.url, '_blank');
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.url) return;
    
    try {
      console.log('=== DEBUG handleDownloadDocument ===');
      console.log('Documento para download:', doc);
      console.log('url:', doc.url);
      
      // Se url é um path do storage, converter para URL pública
      let downloadUrl = doc.url;
      if (doc.url && !doc.url.startsWith('http')) {
        const publicUrl = supabase.storage
          .from('student-documents')
          .getPublicUrl(doc.url)
          .data.publicUrl;
        downloadUrl = publicUrl;
        console.log('URL pública para download:', downloadUrl);
      }
      
      // Fazer download usando a URL pública
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download document: ' + response.statusText);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.type || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro no download:', err);
      alert(`Failed to download document: ${err.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
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
      </div>
    );
  }

  // Se um estudante está selecionado, mostrar detalhes
  if (selectedStudent && studentDetails) {
    console.log('🔍 Rendering student details view:', { selectedStudent, studentDetails, scholarshipApplication });
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={backToList}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm md:text-base">Back to list</span>
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Student Application
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Review and manage {studentDetails.full_name}'s application details
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {scholarshipApplication?.status === 'enrolled' ? 'Enrolled' : 'Active'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-slate-300 rounded-b-3xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 overflow-x-auto" role="tablist">
              {[
                { id: 'details', label: 'Details', icon: User },
                { id: 'documents', label: 'Documents', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`group flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'border-[#05294E] text-[#05294E]' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                  onClick={() => setActiveTab(tab.id as any)}
                  type="button"
                  aria-selected={activeTab === tab.id}
                  role="tab"
                >
                  <tab.icon className={`w-5 h-5 mr-2 transition-colors ${
                    activeTab === tab.id ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                  }`} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Conteúdo das abas */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8 space-y-6">
                {/* Student Information Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#0a4a7a] px-6 py-4">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                      <User className="w-6 h-6 mr-3" />
                      Student Information
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Personal Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Personal Details</h3>
                        <div className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Full Name</dt>
                            <dd className="text-base font-semibold text-slate-900 mt-1">{studentDetails.full_name}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Email</dt>
                            <dd className="text-base text-slate-900 mt-1">{studentDetails.email || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Phone</dt>
                            <dd className="text-base text-slate-900 mt-1">{studentDetails.phone || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Country</dt>
                            <dd className="text-base text-slate-900 mt-1">{studentDetails.country || 'Not specified'}</dd>
                          </div>
                        </div>
                      </div>

                      {/* Academic Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Academic Profile</h3>
                        <div className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Field of Interest</dt>
                            <dd className="text-base text-slate-900 mt-1">{studentDetails.field_of_interest || 'Not specified'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Academic Level</dt>
                            <dd className="text-base text-slate-900 mt-1">{studentDetails.academic_level || 'Not specified'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">GPA</dt>
                            <dd className="text-base text-slate-900 mt-1">{studentDetails.gpa || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">English Proficiency</dt>
                            <dd className="text-base text-slate-900 mt-1">{studentDetails.english_proficiency || 'Not specified'}</dd>
                          </div>
                        </div>
                      </div>

                      {/* Application & Status */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Application Status</h3>
                        <div className="space-y-3">
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Student Type</dt>
                            <dd className="text-base text-slate-900 mt-1">
                              {(() => {
                                console.log('🔍 [ENHANCED_STUDENT_TRACKING] Student process type:', studentDetails?.student_process_type);
                                if (studentDetails?.student_process_type && studentDetails.student_process_type !== 'Not specified') {
                                  if (studentDetails.student_process_type === 'initial') {
                                    return 'Initial - F-1 Visa Required';
                                  } else if (studentDetails.student_process_type === 'transfer') {
                                    return 'Transfer - Current F-1 Student';
                                  } else if (studentDetails.student_process_type === 'change_of_status') {
                                    return 'Change of Status - From Other Visa';
                                  } else {
                                    return studentDetails.student_process_type;
                                  }
                                }
                                return 'Not specified';
                              })()}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Application Fee</dt>
                            <dd className="mt-1">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  studentDetails.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className={`text-sm font-medium ${
                                  studentDetails.is_application_fee_paid ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {studentDetails.is_application_fee_paid ? 'Paid' : 'Pending'}
                                </span>
                              </div>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Documents Status</dt>
                            <dd className="mt-1">
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const statusDisplay = getDocumentStatusDisplay(studentDetails.documents_status || '');
                                  return (
                                    <>
                                      <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor}`}></div>
                                      <span className={`text-sm font-medium ${statusDisplay.color}`}>
                                        {statusDisplay.text}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-slate-600">Enrollment Status</dt>
                            <dd className="mt-1">
                              {scholarshipApplication?.status === 'enrolled' ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-green-700">Enrolled</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-yellow-700">Pending Acceptance</span>
                                </div>
                              )}
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scholarship Information Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="bg-gradient-to-r rounded-t-2xl from-slate-700 to-slate-800 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Scholarship Details
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <dt className="text-sm font-medium text-slate-600">Scholarship Program</dt>
                          <dd className="text-lg font-semibold text-slate-900">
                            {(() => {
                              console.log('🔍 [ENHANCED_STUDENT_TRACKING] Scholarship title:', studentDetails?.scholarship_title);
                              if (studentDetails?.scholarship_title && studentDetails.scholarship_title !== 'Scholarship not specified') {
                                return studentDetails.scholarship_title;
                              }
                              return 'Scholarship information not available';
                            })()}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <dt className="text-sm font-medium text-slate-600">University</dt>
                          <dd className="text-lg font-semibold text-slate-900">
                            {(() => {
                              console.log('🔍 [ENHANCED_STUDENT_TRACKING] University name:', studentDetails?.university_name);
                              if (studentDetails?.university_name && studentDetails.university_name !== 'University not specified') {
                                return studentDetails.university_name;
                              }
                              return 'University not specified';
                            })()}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <dt className="text-sm font-medium text-slate-600">Application Status</dt>
                          <dd className="text-base text-slate-700">
                            {(() => {
                              console.log('🔍 [ENHANCED_STUDENT_TRACKING] Renderizando Application Status:');
                              console.log('🔍 [ENHANCED_STUDENT_TRACKING] studentDetails:', studentDetails);
                              console.log('🔍 [ENHANCED_STUDENT_TRACKING] studentDetails.application_status:', studentDetails?.application_status);
                              
                              if (studentDetails?.application_status && studentDetails.application_status !== 'Not specified') {
                                const formattedStatus = studentDetails.application_status.charAt(0).toUpperCase() + studentDetails.application_status.slice(1);
                                console.log('🔍 [ENHANCED_STUDENT_TRACKING] Status formatado:', formattedStatus);
                                return formattedStatus;
                              } else {
                                console.log('🔍 [ENHANCED_STUDENT_TRACKING] Status não disponível, mostrando fallback');
                                return 'Pending';
                              }
                            })()}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Documents Section */}
                <div className="bg-white rounded-2xl  shadow-sm border border-slate-200">
                  <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                    <h2 className="text-xl font-semibold text-white flex items-center">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Student Documents
                    </h2>
                    <p className="text-slate-200 text-sm mt-1">View student submitted documents and their current status</p>
                  </div>
                  <div className="p-6">
                    {studentDocuments && studentDocuments.length > 0 ? (
                      <div className="space-y-2">
                        {studentDocuments.map((doc: any, index: number) => (
                            <div key={doc.id || index}>
                              <div className="bg-white p-4">
                                <div className="flex items-start space-x-4">
                                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-3 mb-1">
                                      <p className="text-sm font-medium text-slate-600 capitalize">{doc.type || 'Document'}</p>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Submitted'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-600">Document uploaded for university review</p>
                                    {doc.uploaded_at && (
                                      <p className="text-xs text-slate-400 mt-1">
                                        Uploaded: {formatDate(doc.uploaded_at)}
                                      </p>
                                    )}
                                    
                                                                         {/* Botões de visualização e download */}
                                     <div className="flex items-center space-x-2 mt-3">
                                       {doc.url && (
                                         <button 
                                           onClick={() => handleViewDocument(doc)}
                                           className="bg-[#05294E] hover:bg-[#041f38] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                         >
                                           View Document
                                         </button>
                                       )}
                                       {doc.url && (
                                         <button 
                                           onClick={() => handleDownloadDocument(doc)}
                                           className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                         >
                                           Download
                                         </button>
                                       )}
                                     </div>
                                  </div>
                                </div>
                              </div>
                              {index < (studentDetails.documents?.length || 0) - 1 && (
                                <div className="border-t border-slate-200"></div>
                              )}
                            </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-slate-600 font-medium">No documents uploaded yet</p>
                        <p className="text-sm text-slate-500 mt-1">Documents will appear here when the student uploads them</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="xl:col-span-4 space-y-4">
                {/* Quick Stats Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="bg-gradient-to-r rounded-t-2xl from-[#05294E] to-[#041f38] px-6 py-4">
                    <h3 className="text-lg font-semibold text-white">Application Summary</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Submitted</span>
                      <span className="text-sm text-slate-900">
                        {formatDate(studentDetails.registration_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="bg-gradient-to-r rounded-t-2xl from-slate-600 to-slate-700 px-6 py-4">
                    <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-[#05294E] rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">Application submitted</p>
                          <p className="text-xs text-slate-500">{formatDate(studentDetails.registration_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">Last updated</p>
                          <p className="text-xs text-slate-500">{formatDate(studentDetails.registration_date)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                    <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('documents')}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-900">Documents</span>
                        </div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fee Status Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                  <div className="bg-gradient-to-r rounded-t-2xl from-slate-500 to-slate-600 px-6 py-4">
                    <h3 className="text-lg font-semibold text-white">Fee Status</h3>
                  </div>
                  <div className="p-6">
                                       <div className="space-y-3">
                     {/* Selection Process Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center justify-between w-full">
                         <div className="flex items-center space-x-3">
                           <div className={`w-3 h-3 rounded-full ${studentDetails?.has_paid_selection_process_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                           <span className="text-sm font-medium text-slate-900">Selection Process Fee</span>
                         </div>
                         <div className="flex flex-col items-end">
                           <span className={`text-sm font-medium ${studentDetails?.has_paid_selection_process_fee ? 'text-green-700' : 'text-red-700'}`}>
                             {studentDetails?.has_paid_selection_process_fee ? 'Paid' : 'Pending'}
                           </span>
                           {studentDetails?.has_paid_selection_process_fee && (
                             <span className="text-xs text-slate-500">$999.00</span>
                           )}
                         </div>
                       </div>
                     </div>

                     {/* Application Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center space-x-3">
                         <div className={`w-3 h-3 rounded-full ${studentDetails?.is_application_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         <span className="text-sm font-medium text-slate-900">Application Fee</span>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className={`text-sm font-medium ${studentDetails?.is_application_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                           {studentDetails?.is_application_fee_paid ? 'Paid' : 'Pending'}
                         </span>
                         {studentDetails?.is_application_fee_paid && (
                           <span className="text-xs text-slate-500">
                             ${studentDetails?.scholarship?.application_fee_amount ? 
                               (Number(studentDetails.scholarship.application_fee_amount) / 100).toFixed(2) : 
                               '350.00'}
                           </span>
                         )}
                       </div>
                     </div>

                     {/* Scholarship Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center space-x-3">
                         <div className={`w-3 h-3 rounded-full ${studentDetails?.is_scholarship_fee_paid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         <span className="text-sm font-medium text-slate-900">Scholarship Fee</span>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className={`text-sm font-medium ${studentDetails?.is_scholarship_fee_paid ? 'text-green-700' : 'text-red-700'}`}>
                           {studentDetails?.is_scholarship_fee_paid ? 'Paid' : 'Pending'}
                         </span>
                         {studentDetails?.is_scholarship_fee_paid && (
                           <span className="text-xs text-slate-500">
                             ${studentDetails?.scholarship?.scholarship_fee_amount ? 
                               (Number(studentDetails.scholarship.scholarship_fee_amount) / 100).toFixed(2) : 
                               '850.00'}
                           </span>
                         )}
                       </div>
                     </div>

                     {/* I-20 Control Fee Status */}
                     <div className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200">
                       <div className="flex items-center justify-between w-full">
                         <div className="flex items-center space-x-3">
                           <div className={`w-3 h-3 rounded-full ${studentDetails?.has_paid_i20_control_fee ? 'bg-green-500' : 'bg-red-500'}`}></div>
                           <span className="text-sm font-medium text-slate-900">I-20 Control Fee</span>
                         </div>
                         <div className="flex flex-col items-end">
                           <span className={`text-sm font-medium ${studentDetails?.has_paid_i20_control_fee ? 'text-green-700' : 'text-red-700'}`}>
                             {studentDetails?.has_paid_i20_control_fee ? 'Paid' : 'Pending'}
                           </span>
                           {studentDetails?.has_paid_i20_control_fee && (
                             <span className="text-xs text-slate-500">$999.00</span>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-4 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-6 text-white h-6 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-white">Document Management</h2>
                      <p className="text-slate-200 text-sm mt-1">View student submitted documents and their current status</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {/* Document Requests Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                    <h4 className="font-semibold text-slate-900 flex items-center">
                      <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Document Requests
                    </h4>
                  </div>
                  
                  <div className="p-6">
                    <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium">No document requests yet</p>
                      <p className="text-sm text-slate-500 mt-1">Document requests will appear here when created by university staff1</p>
                    </div>
                  </div>
                </div>

                {/* Student Uploads Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 mb-8">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 rounded-t-3xl">
                    <h4 className="font-semibold text-slate-900 flex items-center">
                      <svg className="w-5 h-5 mr-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Student Responses to Document Requests
                    </h4>
                  </div>
                  
                                     <div className="p-6">
                     {studentDocuments && studentDocuments.length > 0 ? (
                       <div className="space-y-3">
                         {studentDocuments.map((doc: any, index: number) => (
                           <div key={doc.id || index} className="bg-slate-50 border border-slate-200 rounded-3xl p-4">
                             <div className="flex items-start justify-between">
                               <div className="flex items-start space-x-4 flex-1">
                                 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                   <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                   </svg>
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <p className="font-medium text-slate-900 capitalize">{doc.type || doc.document_type || 'Document'}</p>
                                   <div className="flex items-center space-x-2 mt-1">
                                     <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                       {doc.status || 'Pending'}
                                     </span>
                                     <span className="text-sm text-slate-500">
                                       Document Type: <span className="font-medium text-slate-700">{doc.type || doc.document_type || 'Document'}</span>
                                     </span>
                                   </div>
                                   <p className="text-xs text-slate-400 mt-1">Document uploaded for university review</p>
                                   {doc.uploaded_at && (
                                     <p className="text-xs text-slate-400 mt-1">
                                       Uploaded: {formatDate(doc.uploaded_at)}
                                     </p>
                                   )}
                                 </div>
                               </div>
                               
                               <div className="flex items-center space-x-3 ml-4">
                                 <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                   doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                   doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                   doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                   'bg-blue-100 text-blue-800'
                                 }`}>
                                   {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Under Review'}
                                 </span>
                                 
                                 {/* Botões de visualização e download */}
                                 {doc.file_url && (
                                   <button 
                                     onClick={() => {
                                       if (doc.file_url) {
                                         const link = document.createElement('a');
                                         link.href = doc.file_url;
                                         link.download = `${doc.type || 'document'}.pdf`;
                                         document.body.appendChild(link);
                                         link.click();
                                         document.body.removeChild(link);
                                       }
                                     }}
                                     className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                   >
                                     Download
                                   </button>
                                 )}
                                 {doc.file_url && (
                                   <button 
                                     onClick={() => {
                                       if (doc.file_url) {
                                         window.open(doc.file_url, '_blank');
                                       }
                                     }}
                                     className="text-[#05294E] hover:text-[#041f38] text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                                   >
                                     View
                                   </button>
                                 )}
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="text-center py-8">
                         <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                         </svg>
                         <p className="text-slate-600 font-medium">No student responses yet</p>
                         <p className="text-sm text-slate-500 mt-1">Student document responses will appear here when they upload documents</p>
                       </div>
                     )}
                   </div>
                </div>

                {/* Acceptance Letter Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-sm relative overflow-hidden">
                  <div className="bg-gradient-to-r from-[#05294E] to-[#041f38] px-6 py-5 rounded-t-3xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-[#05294E]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white">Acceptance Letter</h4>
                        <p className="text-blue-100 text-sm">View student acceptance letter and enrollment status</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="bg-white rounded-3xl p-6 mb-6">
                      <p className="text-slate-700 mb-6 leading-relaxed">
                        The student's acceptance letter and any other required documents, such as the I-20 Control Fee receipt.
                      </p>
                      
                      {scholarshipApplication?.acceptance_letter_url ? (
                        <div className="text-center py-8 bg-green-50 border-2 border-green-200 rounded-3xl">
                          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h5 className="font-semibold text-green-900 mb-2">Acceptance Letter Uploaded Successfully!</h5>
                          <p className="text-green-700 text-sm">The student has been enrolled and notified.</p>
                          <div className="mt-4">
                            <button className="bg-[#05294E] hover:bg-[#041f38] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                              View Acceptance Letter
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <h5 className="font-semibold text-slate-900 mb-2">Acceptance Letter Not Uploaded Yet</h5>
                          <p className="text-slate-700 text-sm">The acceptance letter will appear here when uploaded by university staff</p>
                        </div>
                      )}
                    </div>
                  </div>
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
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-slate-200 rounded-t-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Student Tracking Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Monitor and manage students referred by your affiliate sellers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{filteredStudents.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {formatCurrency(filteredStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Sellers</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{filteredSellers.length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg. Revenue/Student</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">
                    {filteredStudents.length > 0 
                      ? formatCurrency(filteredStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0) / filteredStudents.length)
                      : formatCurrency(0)
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filtros Avançados */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sellers or students..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={filters.sellerFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, sellerFilter: e.target.value }))}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                >
                  <option value="all">All Sellers</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center gap-2 ${
                    showAdvancedFilters 
                      ? 'bg-[#05294E] text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FilterIcon className="h-4 w-4" />
                  Advanced
                </button>
              </div>
            </div>

            {/* Filtros Avançados Expandidos */}
            {showAdvancedFilters && (
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filtro por Universidade */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">University</label>
                    <select
                      value={filters.universityFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, universityFilter: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                    >
                      <option value="all">All Universities</option>
                      {universities.map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Período - Data Inicial */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                    />
                  </div>

                  {/* Filtro por Período - Data Final */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                    />
                  </div>

                  {/* Filtro por Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select
                      value={filters.statusFilter}
                      onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="registered">Registered</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="dropped">Dropped</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Ordenação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                    >
                      <option value="revenue">Revenue</option>
                      <option value="students">Students Count</option>
                      <option value="name">Name</option>
                      <option value="date">Date</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          filters.sortOrder === 'desc' 
                            ? 'bg-[#05294E] text-white' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <TrendingDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          filters.sortOrder === 'asc' 
                            ? 'bg-[#05294E] text-white' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center text-sm text-slate-600">
              <span className="font-medium">{filteredStudents.length}</span>
              <span className="ml-1">student{filteredStudents.length !== 1 ? 's' : ''} found</span>
              {showAdvancedFilters && (
                <span className="ml-4 text-slate-500">
                  • Showing top performers by {filters.sortBy === 'revenue' ? 'revenue' : 
                    filters.sortBy === 'students' ? 'student count' : 
                    filters.sortBy === 'name' ? 'name' : 'date'}
                </span>
              )}
            </div>
          </div>

          {/* Lista de vendedores */}
          <div className="space-y-4">
            {filteredSellers.map((seller) => {
              console.log(`🔍 Processing seller: ${seller.name} (${seller.id})`);
              console.log(`🔍 All filtered students:`, filteredStudents.map((s: any) => ({
                name: s.full_name,
                id: s.id,
                referred_by_seller_id: s.referred_by_seller_id,
                type: typeof s.referred_by_seller_id
              })));
              
              const sellerStudents = filteredStudents.filter((student: any) => {
                const matches = student.referred_by_seller_id === seller.id;
                console.log(`🔍 Comparing: student.referred_by_seller_id (${student.referred_by_seller_id}, type: ${typeof student.referred_by_seller_id}) === seller.id (${seller.id}, type: ${typeof seller.id}) = ${matches}`);
                if (!matches) {
                  console.log(`🔍 Student ${student.full_name} (${student.id}) not matching seller ${seller.name} (${seller.id}) - referred_by_seller_id: ${student.referred_by_seller_id}`);
                }
                return matches;
              });

              console.log('🔍 Seller mapping debug:', {
                sellerId: seller.id,
                sellerName: seller.name,
                sellerReferralCode: seller.referral_code,
                totalStudents: filteredStudents.length,
                matchingStudents: sellerStudents.length,
                studentIds: sellerStudents.map(s => ({ id: s.id, referred_by: s.referred_by_seller_id, name: s.full_name }))
              });
              
              return (
                <div key={seller.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Header do vendedor */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleSellerExpansion(seller.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-slate-900 truncate">{seller.name}</h3>
                          <p className="text-sm text-slate-500 truncate">{seller.email}</p>
                          <p className="text-xs text-slate-400 font-mono truncate">{seller.referral_code}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between lg:justify-end space-x-6">
                        <div className="text-center">
                          <p className="text-sm text-slate-500">Students</p>
                          <p className="text-2xl font-bold text-blue-600">{seller.students_count}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500">Revenue</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(seller.total_revenue)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500">Registered</p>
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
                                  Student
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                  Code Used
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                  Revenue
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                  Registered on
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                  Actions
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
                                      onClick={() => loadStudentDetails(student.id, student.profile_id)}
                                      className="text-[#05294E] hover:text-[#041f38] flex items-center space-x-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span>View Details</span>
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
                          <p className="text-slate-600">No students found for this seller.</p>
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
              <h3 className="text-lg font-medium text-slate-900 mb-2">No sellers found</h3>
              <p className="text-slate-600">
                Try adjusting the search filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedStudentTracking;
