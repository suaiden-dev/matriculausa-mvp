import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import AffiliateAdminDashboardLayout from './AffiliateAdminDashboardLayout';
import Overview from './Overview';
import SellerManagement from './SellerManagement';
import SellerPerformanceTracking from './SellerPerformanceTracking';
import StudentTracking from './StudentTracking';
import Analytics from './Analytics';
import ProfileSettings from './ProfileSettings';

interface AffiliateAdminStats {
  totalStudents: number;
  totalRevenue: number;
  totalSellers: number;
  activeSellers: number;
  monthlyGrowth: number;
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
    activeSellers: 0,
    monthlyGrowth: 0
  });

  const loadAffiliateAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se o usuário é affiliate_admin através do role no perfil
      if (userRole !== 'affiliate_admin') {
        throw new Error('Usuário não tem permissão de affiliate admin');
      }

      // Buscar estudantes referenciados
      const { data: studentsData, error: studentsError } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (studentsError) {
        console.error('Error loading students:', studentsError);
        throw new Error(`Failed to load students: ${studentsError.message}`);
      }

      // Buscar sellers reais da tabela sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select('*')
        .eq('is_active', true);

      if (sellersError) {
        console.error('Error loading sellers:', sellersError);
        throw new Error(`Failed to load sellers: ${sellersError.message}`);
      }

      // Buscar perfis dos usuários referenciados
      const studentUserIds = studentsData?.map(ref => ref.referred_id).filter(Boolean) || [];
      
      // Para sellers, usar os dados da tabela sellers diretamente
      let studentProfiles: any[] = [];

      if (studentUserIds.length > 0) {
        const { data: studentProfilesData, error: studentProfilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .in('user_id', studentUserIds);

        if (studentProfilesError) {
          console.error('Error loading student profiles:', studentProfilesError);
        } else {
          studentProfiles = studentProfilesData || [];
        }
      }

      // Processar estudantes
      const processedStudents = (studentsData || []).map(referral => {
        const studentProfile = studentProfiles.find(profile => profile.user_id === referral.referred_id);
        
        return {
          id: referral.referred_id,
          full_name: studentProfile?.full_name || 'Nome não disponível',
          email: studentProfile?.email || 'Email não disponível',
          country: studentProfile?.country || 'País não disponível',
          referred_by_seller_id: referral.referrer_id,
          seller_name: 'Vendedor não disponível', // Será preenchido depois
          seller_referral_code: referral.affiliate_code || '',
          referral_code_used: referral.affiliate_code || '',
          total_paid: referral.payment_amount || 0,
          created_at: referral.created_at,
          status: 'active'
        };
      });

      // Processar vendedores - CORRIGIDO: usar dados da tabela sellers
      const processedSellers = (sellersData || []).map(seller => {
        return {
          id: seller.id,
          name: seller.name || 'Nome não disponível',
          referral_code: seller.referral_code || '',
          email: seller.email || 'Email não disponível',
          created_at: seller.created_at || new Date().toISOString(),
          students_count: processedStudents.filter(student => 
            student.referred_by_seller_id === seller.id
          ).length
        };
      });

      // Atualizar nomes dos sellers nos estudantes
      processedStudents.forEach(student => {
        const seller = processedSellers.find(s => s.id === student.referred_by_seller_id);
        if (seller) {
          student.seller_name = seller.name;
        }
      });

      // Calcular estatísticas
      const totalStudents = processedStudents.length;
      const totalRevenue = processedStudents.reduce((sum, s) => sum + s.total_paid, 0);
      const totalSellers = processedSellers.length;
      const activeSellers = processedSellers.length; // Todos os sellers da tabela sellers (já filtrados por is_active = true)

      // Calcular crescimento mensal
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const studentsLastMonth = processedStudents.filter(s => 
        new Date(s.created_at) >= lastMonth && new Date(s.created_at) < thisMonth
      ).length;
      
      const studentsThisMonth = processedStudents.filter(s => 
        new Date(s.created_at) >= thisMonth
      ).length;
      
      const monthlyGrowth = studentsLastMonth > 0 
        ? ((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100
        : studentsThisMonth > 0 ? 100 : 0;

      setStudents(processedStudents);
      setSellers(processedSellers);
      setStats({
        totalStudents,
        totalRevenue,
        totalSellers,
        activeSellers,
        monthlyGrowth: Math.round(monthlyGrowth * 10) / 10 // Arredondar para 1 casa decimal
      });

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
        <Route path="performance" element={<SellerPerformanceTracking />} />

        <Route 
          path="students" 
          element={
            <StudentTracking 
              students={students}
              sellers={sellers}
              onRefresh={loadAffiliateAdminData}
            />
          } 
        />
        <Route 
          path="analytics" 
          element={
            <Analytics 
              stats={stats}
              students={students}
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
