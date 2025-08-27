import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import AffiliateAdminDashboardLayout from './AffiliateAdminDashboardLayout';
import Overview from './Overview';
import SellerManagement from './SellerManagement';

import EnhancedStudentTracking from './EnhancedStudentTracking';
import Analytics from './Analytics';
import ProfileSettings from './ProfileSettings';

interface AffiliateAdminStats {
  totalStudents: number;
  totalRevenue: number;
  totalSellers: number;
  activeSellers: number;
}



interface Student {
  id: string;
  full_name: string;
  email: string;
  country?: string;
  referred_by_seller_id: string;
  seller_name: string;
  seller_referral_code: string;
  referral_code_used: string;
  total_paid: number;
  created_at: string;
  status: string;
}

interface Seller {
  id: string;
  name: string;
  referral_code: string;
}

const AffiliateAdminDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Memorizar user.id e user.role para evitar re-renders desnecessários
  const userId = useMemo(() => user?.id, [user?.id]);
  const userRole = useMemo(() => user?.role, [user?.role]);

  const [stats, setStats] = useState<AffiliateAdminStats>({
    totalStudents: 0,
    totalRevenue: 0,
    totalSellers: 0,
    activeSellers: 0
  });

  const loadAffiliateAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);



      // Verificar se o usuário é affiliate_admin através do role no perfil
      if (userRole !== 'affiliate_admin') {
        console.error('❌ User role is not affiliate_admin:', userRole);
        throw new Error('Usuário não tem permissão de affiliate admin');
      }

      // Buscar estatísticas gerais usando a nova função SQL corrigida
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_admin_analytics_fixed', { admin_user_id: userId });

      if (analyticsError) {
        console.error('❌ Error loading analytics data:', analyticsError);
        throw new Error(`Failed to load analytics data: ${analyticsError.message}`);
      }

      // Buscar dados detalhados de vendedores usando a função corrigida
      const { data: sellersData, error: sellersError } = await supabase
        .rpc('get_admin_sellers_analytics_fixed', { admin_user_id: userId });

      if (sellersError) {
        console.error('❌ Error loading sellers data:', sellersError);
        throw new Error(`Failed to load sellers data: ${sellersError.message}`);
      }

      // Buscar dados de estudantes referenciados usando a função corrigida
      const { data: studentsData, error: studentsError } = await supabase
        .rpc('get_admin_students_analytics', { admin_user_id: userId });

      if (studentsError) {
        console.error('Error loading students data:', studentsError);
        throw new Error(`Failed to load students data: ${studentsError.message}`);
      }

      // Processar dados de analytics
      const analytics = analyticsData?.[0] || {
        total_sellers: 0,
        active_sellers: 0,
        total_students: 0,
        total_revenue: 0,
        monthly_growth: 0,
        conversion_rate: 0,
        avg_revenue_per_student: 0
      };

      // Processar vendedores
      const processedSellers = (sellersData || []).map((seller: any) => ({
        id: seller.seller_id,
        name: seller.seller_name || 'Nome não disponível',
        referral_code: seller.referral_code || '',
        email: seller.seller_email || 'Email não disponível',
        created_at: seller.last_referral_date || new Date().toISOString(),
        students_count: seller.students_count || 0,
        total_revenue: seller.total_revenue || 0,
        avg_revenue_per_student: seller.avg_revenue_per_student || 0,
        is_active: seller.is_active
      }));

      // Processar estudantes
      const processedStudents = (studentsData || []).map((student: any) => ({
        id: student.student_id,
        full_name: student.student_name || 'Nome não disponível',
        email: student.student_email || 'Email não disponível',
        country: student.country || 'País não disponível',
        referred_by_seller_id: student.referred_by_seller_id,
        seller_name: student.seller_name || 'Vendedor não disponível',
        seller_referral_code: student.seller_referral_code || '',
        referral_code_used: student.referral_code_used || '',
        total_paid: student.total_paid || 0,
        created_at: student.created_at,
        status: student.status || 'active'
      }));

      // Atualizar estatísticas
      const finalStats = {
        totalStudents: analytics.total_students || 0,
        totalRevenue: analytics.total_revenue || 0,
        totalSellers: analytics.total_sellers || 0,
        activeSellers: analytics.active_sellers || 0
      };

      setStats(finalStats);
      setStudents(processedStudents);
      setSellers(processedSellers);

    } catch (error: any) {
      console.error('Error loading affiliate admin data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    if (userId && userRole === 'affiliate_admin') {
      loadAffiliateAdminData();
    }
  }, [userId, userRole, loadAffiliateAdminData]);



  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dashboard...</p>
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
            onClick={loadAffiliateAdminData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <AffiliateAdminDashboardLayout user={user}>
      <Routes>
        <Route 
          index 
          element={
            <Overview 
              stats={stats}
              sellers={sellers}
              students={students}
              onRefresh={loadAffiliateAdminData}
            />
          } 
        />
        <Route path="users" element={<SellerManagement />} />

        <Route 
          path="students" 
          element={
            <EnhancedStudentTracking userId={userId} />
          } 
        />
        <Route 
          path="analytics" 
          element={
            <Analytics 
              stats={stats}
              sellers={sellers}
              students={students}
              userId={userId}
            />
          } 
        />
        <Route 
          path="profile" 
          element={
            <ProfileSettings 
              user={user}
            />
          } 
        />
      </Routes>
    </AffiliateAdminDashboardLayout>
  );
};

export default AffiliateAdminDashboard;
