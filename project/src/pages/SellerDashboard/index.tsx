import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import SellerDashboardLayout from './SellerDashboardLayout';
import Overview from './Overview';
import MyStudents from './MyStudents';
import StudentDetails from './StudentDetails';
import AffiliateTools from './AffiliateTools';
import Performance from './Performance';
import ProfileSettings from './ProfileSettings';

interface SellerStats {
  totalStudents: number;
  totalRevenue: number;
  monthlyStudents: number;
  conversionRate: number;
}

interface Student {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  country?: string;
  total_paid: number;
  created_at: string;
  status: string;
  latest_activity: string;
  fees_count?: number;
  scholarship_title?: string;
  university_name?: string;
}

interface SellerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  territory?: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  affiliate_admin_name: string;
}

const SellerDashboard: React.FC = () => {
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'students' | 'student-details' | 'affiliate-tools' | 'performance' | 'profile'>(() => {
    // Tentar recuperar a view do localStorage
    const savedView = localStorage.getItem('sellerDashboardView');
    return (savedView as any) || 'overview';
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    // Tentar recuperar o studentId do localStorage
    const savedStudentId = localStorage.getItem('sellerDashboardStudentId');
    return savedStudentId || null;
  });
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams();

  const [stats, setStats] = useState<SellerStats>({
    totalStudents: 0,
    totalRevenue: 0,
    monthlyStudents: 0,
    conversionRate: 0
  });

  // Memoize the loadSellerData function to prevent unnecessary re-renders
  const loadSellerData = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      setError(null);

      // Search for seller profile
      let seller: any = null;
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('email', user?.email)
        .eq('is_active', true)
        .single();

      if (sellerError) {
        // If seller not found, try searching by user_id
        if (sellerError.code === 'PGRST116') {
          
          const { data: sellerByUserId, error: sellerByUserIdError } = await supabase
            .from('sellers')
            .select('*')
            .eq('user_id', user?.id)
            .eq('is_active', true)
            .single();
          
          if (sellerByUserIdError) {
            // If seller not found by user_id, create a new one
            
            // First, search for an affiliate_admin to associate
            const { data: affiliateAdmin, error: affiliateAdminError } = await supabase
              .from('affiliate_admins')
              .select('id')
              .eq('is_active', true)
              .limit(1)
              .single();
            
            if (affiliateAdminError) {
              console.warn('⚠️ [SELLER] Could not find affiliate_admin, creating without association');
            }
            
            const { data: newSeller, error: createSellerError } = await supabase
              .from('sellers')
              .insert({
                user_id: user?.id,
                email: user?.email,
                name: user?.name || user?.email?.split('@')[0] || 'Seller',
                is_active: true,
                referral_code: `SELLER_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                affiliate_admin_id: affiliateAdmin?.id || null,
                commission_rate: 0.1000, // 10% default
                created_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createSellerError) {
              throw new Error(`Error creating seller: ${createSellerError.message}`);
            }
            
            seller = newSeller;
          } else {
            // Use the seller found by user_id
            seller = sellerByUserId;
          }
        } else {
          throw new Error(`Error searching for seller: ${sellerError.message}`);
        }
      } else {
        seller = sellerData;
      }

      // Load seller referrals using the RPC function
      const { data: referralsData, error: referralsError } = await supabase.rpc(
        'get_seller_students',
        { seller_referral_code_param: seller.referral_code }
      );

      if (referralsError) {
        console.error('Error loading referrals:', referralsError);
        throw new Error(`Failed to load referrals: ${referralsError.message}`);
      }

      // Convert referrals to student format with fee information
      const studentsData = (referralsData || []).map((referral: any) => ({
        id: referral.user_id,
        profile_id: referral.profile_id,
        full_name: referral.student_name,
        email: referral.student_email,
        created_at: referral.registration_date,
        status: referral.student_status,
        total_paid: referral.total_fees_paid || 0,
        fees_count: referral.fees_count || 0,
        latest_activity: referral.registration_date,
        scholarship_title: referral.scholarship_title || 'No scholarship selected',
        university_name: referral.university_name || 'No university selected',
        // Adicionar flags de pagamento individuais
        has_paid_selection_process_fee: referral.has_paid_selection_process_fee,
        has_paid_i20_control_fee: referral.has_paid_i20_control_fee,
        is_scholarship_fee_paid: referral.is_scholarship_fee_paid,
        is_application_fee_paid: referral.is_application_fee_paid,
        // Adicionar data de pagamento da scholarship fee para o deadline do I-20
        scholarship_fee_paid_date: referral.scholarship_fee_paid_date
      }));

      // Process seller data
      const processedSeller = {
        ...seller,
        affiliate_admin_name: 'Admin' // Placeholder for now
      };

      // Process student data
      const processedStudents = (studentsData || []).map((student: any) => ({
        ...student,
        latest_activity: student.updated_at || student.created_at
      }));

      // Get real performance data using RPC function
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('get_seller_individual_performance', {
          seller_referral_code_param: seller.referral_code
        });

      console.log('🔍 Performance data:', { performanceData, performanceError });
      console.log('🔍 Students data:', { studentsData: processedStudents });

      // Always use RPC data if available, fallback to calculated values only if no data
      if (performanceData && performanceData.length > 0) {
        // Use real data from RPC function
        const performance = performanceData[0];
        console.log('🔍 Using RPC data:', { performance, performanceData });
        setStats({
          totalStudents: Number(performance.total_students) || 0,
          totalRevenue: Number(performance.total_revenue) || 0,
          monthlyStudents: Number(performance.monthly_students) || 0,
          conversionRate: Number(performance.conversion_rate) || 0
        });
        console.log('🔍 Stats set from RPC:', {
          totalStudents: Number(performance.total_students) || 0,
          totalRevenue: Number(performance.total_revenue) || 0,
          monthlyStudents: Number(performance.monthly_students) || 0,
          conversionRate: Number(performance.conversion_rate) || 0
        });
      } else {
        console.error('Error loading performance data:', performanceError);
        // Fallback to calculated values if RPC fails
        const totalStudents = processedStudents.length;
        const totalRevenue = processedStudents.reduce((sum: number, s: any) => sum + (s.total_paid || 0), 0);
        console.log('🔍 Fallback calculation:', { totalStudents, totalRevenue, studentsData: processedStudents });
        console.log('🔍 Individual student totals:', processedStudents.map((s: any) => ({ name: s.full_name, total_paid: s.total_paid })));
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyStudents = processedStudents.filter((s: any) => {
          const studentDate = new Date(s.created_at);
          return studentDate.getMonth() === currentMonth && studentDate.getFullYear() === currentYear;
        }).length;

        setStats({
          totalStudents,
          totalRevenue,
          monthlyStudents,
          conversionRate: 0 // Default when no data
        });
      }

      setSellerProfile(processedSeller);
      setStudents(processedStudents);

    } catch (error: any) {
      console.error('Error loading seller data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.name]);

  // Função para salvar o estado no localStorage
  const saveStateToStorage = useCallback((view: string, studentId: string | null) => {
    localStorage.setItem('sellerDashboardView', view);
    if (studentId) {
      localStorage.setItem('sellerDashboardStudentId', studentId);
    } else {
      localStorage.removeItem('sellerDashboardStudentId');
    }
  }, []);

  // Only load data once when component mounts or user changes
  useEffect(() => {
    if (user && user.email && !sellerProfile) {
      loadSellerData();
    }
  }, [user, loadSellerData, sellerProfile]);

  // Detect URL changes and set view automatically
  useEffect(() => {
    // Only update view from URL if it's a direct navigation (not from cards)
    // This prevents conflicts with card navigation
    if (params.studentId) {
      setSelectedStudentId(params.studentId);
      setCurrentView('student-details');
      saveStateToStorage('student-details', params.studentId);
    } else if (location.pathname.startsWith('/seller/student/')) {
      const pathParts = location.pathname.split('/');
      const studentIdFromPath = pathParts[pathParts.length - 1];
      setSelectedStudentId(studentIdFromPath);
      setCurrentView('student-details');
      saveStateToStorage('student-details', studentIdFromPath);
    }
    // Remove URL-based view detection for dashboard sections to avoid conflicts with card navigation
  }, [location.pathname, params.studentId, saveStateToStorage]);

  // Memoize the navigation handler to prevent unnecessary re-renders
  const handleNavigation = useCallback((view: string) => {
    // Update internal state first
    setCurrentView(view as any);
    
    // Se não for para student-details, limpar o selectedStudentId
    if (view !== 'student-details') {
      setSelectedStudentId(null);
      saveStateToStorage(view, null);
    } else {
      saveStateToStorage(view, selectedStudentId);
    }
  }, [selectedStudentId, saveStateToStorage]);

  // Memoize the refresh handler
  const handleRefresh = useCallback(() => {
    // Se estiver na view de detalhes do estudante, não recarregar tudo
    if (currentView === 'student-details' && selectedStudentId) {
      // Apenas recarregar dados do estudante específico
      return;
    }
    loadSellerData();
  }, [loadSellerData, currentView, selectedStudentId]);

  // Função para recarregar apenas os dados do estudante específico
  const handleStudentRefresh = useCallback(() => {
    if (selectedStudentId) {
      // Forçar re-render do StudentDetails com uma nova key
      const currentId = selectedStudentId;
      setSelectedStudentId(null);
      setTimeout(() => setSelectedStudentId(currentId), 10);
    }
  }, [selectedStudentId]);

  // Memoize the current view component to prevent unnecessary re-renders
  const currentViewComponent = useMemo(() => {
    switch (currentView) {
      case 'overview':
        return (
          <Overview 
            stats={stats}
            sellerProfile={sellerProfile}
            students={students.slice(0, 5)}
            onRefresh={handleRefresh}
            onNavigate={handleNavigation}
          />
        );
      case 'students':
        return (
          <MyStudents 
            students={students}
            sellerProfile={sellerProfile}
            onRefresh={handleRefresh}
            onViewStudent={(student: {id: string, profile_id: string}) => {
              setSelectedStudentId(student.id);
              setCurrentView('student-details');
              saveStateToStorage('student-details', student.id);
            }}
          />
        );
      case 'student-details':
        return (
          <StudentDetails 
            key={selectedStudentId} 
            studentId={selectedStudentId!} 
            profileId={students.find(s => s.id === selectedStudentId)?.profile_id || ''}
            onRefresh={handleStudentRefresh}
            onBack={() => {
              setCurrentView('students');
              setSelectedStudentId(null);
            }}
          />
        );
              case 'affiliate-tools':
        return (
                      <AffiliateTools 
              sellerProfile={sellerProfile}
              stats={stats}
            />
        );
      case 'performance':
        return (
          <Performance 
            stats={stats}
            sellerProfile={sellerProfile}
            students={students}
          />
        );
      case 'profile':
        return (
          <ProfileSettings 
            user={user}
            sellerProfile={sellerProfile}
            onUpdate={handleRefresh}
          />
        );
      default:
        return (
          <Overview 
            stats={stats}
            sellerProfile={sellerProfile}
            students={students.slice(0, 5)}
            onRefresh={handleRefresh}
            onNavigate={handleNavigation}
          />
        );
    }
  }, [currentView, stats, sellerProfile, students, user, handleRefresh, selectedStudentId, handleStudentRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#3B82F6] mb-4">{error}</p>
          <button 
            onClick={loadSellerData}
            className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg hover:bg-[#365d9b]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!sellerProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Seller profile not found</p>
          <p className="text-sm text-slate-500">Contact your affiliate administrator</p>
        </div>
      </div>
    );
  }

  return (
    <SellerDashboardLayout
      user={user}
      sellerProfile={sellerProfile}
      onNavigate={handleNavigation}
      currentView={currentView}
    >
      {currentViewComponent}
    </SellerDashboardLayout>
  );
};

export default SellerDashboard;
