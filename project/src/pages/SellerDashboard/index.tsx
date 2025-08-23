import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import SellerDashboardLayout from './SellerDashboardLayout';
import Overview from './Overview';
import MyStudents from './MyStudents';
import StudentDetails from './StudentDetails';
import ReferralTools from './ReferralTools';
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
  full_name: string;
  email: string;
  country?: string;
  total_paid: number;
  created_at: string;
  status: string;
  latest_activity: string;
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
  const [currentView, setCurrentView] = useState<'overview' | 'students' | 'student-details' | 'referral-tools' | 'performance' | 'profile'>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
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

      // Search for referenced students using the new RPC function
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
        id: referral.student_id, // Use student_id instead of referral_id
        full_name: referral.student_name,
        email: referral.student_email,
        created_at: referral.registration_date,
        status: referral.student_status,
        total_paid: referral.total_fees_paid || 0,
        commission_earned: referral.commission_earned || 0,
        fees_count: referral.fees_count || 0,
        latest_activity: referral.registration_date
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

      // Calculate statistics
      const totalStudents = processedStudents.length;
      const totalRevenue = processedStudents.reduce((sum: number, s: any) => sum + (s.total_paid || 0), 0);
      
      // Current month students
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyStudents = processedStudents.filter((s: any) => {
        const studentDate = new Date(s.created_at);
        return studentDate.getMonth() === currentMonth && studentDate.getFullYear() === currentYear;
      }).length;

      setSellerProfile(processedSeller);
      setStudents(processedStudents);
      setStats({
        totalStudents,
        totalRevenue,
        monthlyStudents,
        conversionRate: 85.5 // Placeholder
      });

    } catch (error: any) {
      console.error('Error loading seller data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.name]);

  // Only load data once when component mounts or user changes
  useEffect(() => {
    if (user && user.email && !sellerProfile) {
      loadSellerData();
    }
  }, [user, loadSellerData, sellerProfile]);

  // Detect URL changes and set view automatically
  useEffect(() => {
    console.log('🔍 [SELLER] URL detection useEffect triggered');
    console.log('🔍 [SELLER] Current pathname:', location.pathname);
    console.log('🔍 [SELLER] Current params:', params);
    
    if (params.studentId) {
      console.log('🔍 [SELLER] Found studentId in params:', params.studentId);
      setSelectedStudentId(params.studentId);
      setCurrentView('student-details');
    } else if (location.pathname === '/seller/dashboard' || location.pathname === '/seller/dashboard/') {
      console.log('🔍 [SELLER] Setting view to overview');
      setCurrentView('overview');
    } else if (location.pathname === '/seller/dashboard/students') {
      console.log('🔍 [SELLER] Setting view to students');
      setCurrentView('students');
    } else if (location.pathname === '/seller/dashboard/referral-tools') {
      console.log('🔍 [SELLER] Setting view to referral-tools');
      setCurrentView('referral-tools');
    } else if (location.pathname === '/seller/dashboard/performance') {
      console.log('🔍 [SELLER] Setting view to performance');
      setCurrentView('performance');
    } else if (location.pathname === '/seller/dashboard/profile') {
      console.log('🔍 [SELLER] Setting view to profile');
      setCurrentView('profile');
    } else if (location.pathname.startsWith('/seller/student/')) {
      console.log('🔍 [SELLER] Detected /seller/student/ route');
      const pathParts = location.pathname.split('/');
      const studentIdFromPath = pathParts[pathParts.length - 1];
      console.log('🔍 [SELLER] Extracted studentId from path:', studentIdFromPath);
      setSelectedStudentId(studentIdFromPath);
      setCurrentView('student-details');
    }
  }, [location.pathname, params.studentId]);

  // Memoize the navigation handler to prevent unnecessary re-renders
  const handleNavigation = useCallback((view: string) => {
    setCurrentView(view as any);
  }, []);

  // Memoize the refresh handler
  const handleRefresh = useCallback(() => {
    loadSellerData();
  }, [loadSellerData]);

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
          />
        );
                     case 'students':
          return (
            <MyStudents 
              students={students}
              sellerProfile={sellerProfile}
              onRefresh={handleRefresh}
              onViewStudent={(studentId) => {
                console.log('🔍 [SELLER] onViewStudent called with studentId:', studentId);
                console.log('🔍 [SELLER] Setting selectedStudentId to:', studentId);
                console.log('🔍 [SELLER] Setting currentView to student-details');
                setSelectedStudentId(studentId);
                setCurrentView('student-details');
              }}
            />
          );
               case 'student-details':
          return (
            <StudentDetails key={selectedStudentId} studentId={selectedStudentId!} />
          );
      case 'referral-tools':
        return (
          <ReferralTools 
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
          />
        );
    }
  }, [currentView, stats, sellerProfile, students, user, handleRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadSellerData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
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
    >
      {currentViewComponent}
    </SellerDashboardLayout>
  );
};

export default SellerDashboard;
