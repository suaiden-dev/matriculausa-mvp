import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import SellerDashboardLayout from './SellerDashboardLayout';
import Overview from './Overview';
import MyStudents from './MyStudents';
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
  const [currentView, setCurrentView] = useState<'overview' | 'students' | 'referral-tools' | 'performance' | 'profile'>('overview');
  const { user } = useAuth();

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

      console.log('🔍 [SELLER] Starting seller data loading');
      console.log('🔍 [SELLER] User email:', user?.email);
      console.log('🔍 [SELLER] User role:', user?.role);

      // Search for seller profile
      let seller: any = null;
      const { data: sellerData, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('email', user?.email)
        .eq('is_active', true)
        .single();

      console.log('🔍 [SELLER] Sellers query result:', { sellerData, sellerError });

      if (sellerError) {
        console.error('❌ [SELLER] Error searching for seller:', sellerError);
        
        // If seller not found, try searching by user_id
        if (sellerError.code === 'PGRST116') {
          console.log('🔍 [SELLER] Seller not found by email, trying by user_id...');
          
          const { data: sellerByUserId, error: sellerByUserIdError } = await supabase
            .from('sellers')
            .select('*')
            .eq('user_id', user?.id)
            .eq('is_active', true)
            .single();
          
          console.log('🔍 [SELLER] Query result by user_id:', { sellerByUserId, sellerByUserIdError });
          
          if (sellerByUserIdError) {
            // If seller not found by user_id, create a new one
            console.log('🔍 [SELLER] Seller not found by user_id, creating new seller...');
            
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
            
            console.log('🔍 [SELLER] Seller creation result:', { newSeller, createSellerError });
            
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

      // Search for referenced students
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('referred_by_seller_id', seller.id)
        .order('created_at', { ascending: false });

      if (studentsError) {
        console.error('Error loading students:', studentsError);
        throw new Error(`Failed to load students: ${studentsError.message}`);
      }

      // Process seller data
      const processedSeller = {
        ...seller,
        affiliate_admin_name: 'Admin' // Placeholder for now
      };

      // Process student data
      const processedStudents = (studentsData || []).map(student => ({
        ...student,
        latest_activity: student.updated_at || student.created_at
      }));

      // Calculate statistics
      const totalStudents = processedStudents.length;
      const totalRevenue = processedStudents.reduce((sum, s) => sum + (s.total_paid || 0), 0);
      
      // Current month students
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyStudents = processedStudents.filter(s => {
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
          />
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
