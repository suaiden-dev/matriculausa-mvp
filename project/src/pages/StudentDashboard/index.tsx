import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Scholarship } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import StudentDashboardLayout from './StudentDashboardLayout';
import Overview from './Overview';
import ScholarshipBrowser from './ScholarshipBrowser';
import MyApplications from './MyApplications';
import ProfileManagement from './ProfileManagement';
import { mockScholarships } from '../../data/mockData';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useCartStore } from '../../stores/applicationStore';
import DocumentsAndScholarshipChoice from './DocumentsAndScholarshipChoice';
import CollegeEnrollmentCheckout from './CollegeEnrollmentCheckout';
import CartPage from './CartPage';
import ScholarshipFeeSuccess from './ScholarshipFeeSuccess';
import ScholarshipFeeError from './ScholarshipFeeError';
import SelectionProcessFeeSuccess from './SelectionProcessFeeSuccess';
import SelectionProcessFeeError from './SelectionProcessFeeError';
import ApplicationFeeSuccess from './ApplicationFeeSuccess';
import ApplicationFeeError from './ApplicationFeeError';
import ApplicationChatPage from './ApplicationChatPage';
import ApplicationFeePage from './ApplicationFeePage';
import Layout from '../../components/Layout';
import MatriculaRewards from './MatriculaRewards';
import RewardsStore from './RewardsStore';
import ReferralCongratulationsModal from '../../components/ReferralCongratulationsModal';
import { useReferralCode } from '../../hooks/useReferralCode';
import WelcomeDiscountModal from '../../components/WelcomeDiscountModal';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  field_of_interest?: string;
  academic_level?: string;
  gpa?: number;
  english_proficiency?: string;
  created_at: string;
  updated_at: string;
}

interface Application {
  id: string;
  scholarship_id: string;
  student_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review' | 'enrolled';
  applied_at: string;
  notes?: string;
  scholarship?: Scholarship;
}

const StudentDashboard: React.FC = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const { user, userProfile } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const cart = useCartStore((state) => state.cart);
  const navigate = useNavigate();
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  
  // Fase 5: Referral Code System
  const { 
    activeDiscount, 
    hasUsedReferralCode, 
    applyReferralCodeFromURL,
    loading: referralLoading 
  } = useReferralCode();
  const [showCongratulationsModal, setShowCongratulationsModal] = useState(false);
  const [referralResult, setReferralResult] = useState<any>(null);
  const [showWelcomeDiscount, setShowWelcomeDiscount] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      loadDashboardData();
    }
  }, [user, userProfile]);

  // Fase 5: Aplicar código de referência da URL automaticamente
  useEffect(() => {
    const applyReferralCode = async () => {
      if (user && !hasUsedReferralCode && !referralLoading) {
        const result = await applyReferralCodeFromURL();
        if (result && result.success) {
          setReferralResult(result);
          setShowCongratulationsModal(true);
        }
      }
    };

    applyReferralCode();
  }, [user, hasUsedReferralCode, referralLoading, applyReferralCodeFromURL]);

  // Welcome discount modal: show once per account when discount is active
  useEffect(() => {
    if (!user?.id) return;
    if (!activeDiscount?.has_discount) return;
    // Avoid conflict with referral modal
    if (showCongratulationsModal) return;
    const storageKey = `welcome_discount_seen_${user.id}`;
    const alreadySeen = localStorage.getItem(storageKey) === 'true';
    if (!alreadySeen) {
      setShowWelcomeDiscount(true);
      localStorage.setItem(storageKey, 'true');
    }
  }, [user?.id, activeDiscount?.has_discount, showCongratulationsModal]);

  const loadDashboardData = async () => {
    if (!user || !userProfile) return;

    try {
      if (!hasLoadedData) {
        setDashboardLoading(true);
      }
      setDashboardError(null);
      // Buscar bolsas reais do Supabase com informações da universidade
      // NOVO: Buscar bolsas via função RPC protegida
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setScholarships([]);
        setDashboardError('Usuário não autenticado');
      } else {
        const { data: realScholarships, error: scholarshipsError } = await supabase.rpc('get_scholarships_protected', { p_user_id: userId });
        if (scholarshipsError) {
          setScholarships([]);
          setDashboardError('Error fetching scholarships.');
        } else {
          setScholarships(realScholarships || []);
        }
      }
      // Buscar applications reais do Supabase
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('scholarship_applications')
        .select(`*,scholarship:scholarships(*,universities!inner(id, name, logo_url, location, is_approved))`)
        .eq('student_id', userProfile.id);
      if (applicationsError) {
        setApplications([]);
        setDashboardError('Error fetching applications.');
      } else {
        setApplications(applicationsData as Application[]);
        // Recentes: últimas 5
        const sorted = [...(applicationsData as Application[])].sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime());
        setRecentApplications(sorted.slice(0, 5));
      }
      // Buscar perfil real do Supabase
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) {
        setProfile(null);
        setDashboardError('Error fetching profile.');
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          name: profileData.full_name || user.name || user.email?.split('@')[0] || '',
          email: user.email,
          phone: profileData.phone || '',
          country: profileData.country || '',
          field_of_interest: profileData.field_of_interest || '',
          academic_level: profileData.academic_level || '',
          gpa: profileData.gpa || 0,
          english_proficiency: profileData.english_proficiency || '',
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        });
      }
      setHasLoadedData(true);
    } catch (error) {
      setDashboardError('Unexpected error loading dashboard data.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleApplyScholarship = async (scholarshipId: string) => {
    if (!user) return;

    // Check if already applied
    const alreadyApplied = applications.some(app => app.scholarship_id === scholarshipId);
    if (alreadyApplied) {
      alert('You have already applied for this scholarship');
      return;
    }

    try {
      // Mock application creation
      const newApplication: Application = {
        id: Date.now().toString(),
        scholarship_id: scholarshipId,
        student_id: user.id,
        status: 'pending',
        applied_at: new Date().toISOString(),
        scholarship: scholarships.find(s => s.id === scholarshipId)
      };

      setApplications(prev => [...prev, newApplication]);
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying for scholarship:', error);
      alert('Error submitting application. Please try again.');
    }
  };

  const handleProfileUpdate = async (updatedData: Partial<StudentProfile>) => {
    if (!user || !profile) return;

    try {
      // Atualiza no Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: updatedData.name,
          phone: updatedData.phone,
          country: updatedData.country,
          field_of_interest: updatedData.field_of_interest,
          academic_level: updatedData.academic_level,
          gpa: updatedData.gpa,
          english_proficiency: updatedData.english_proficiency,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualiza localmente
      const updatedProfile = {
        ...profile,
        ...updatedData,
        updated_at: new Date().toISOString()
      };
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  // Calculate stats
  const stats = {
    totalApplications: applications.length,
    approvedApplications: applications.filter(app => app.status === 'approved' || app.status === 'enrolled').length,
    pendingApplications: applications.filter(app => app.status === 'pending' || app.status === 'under_review').length,
    availableScholarships: scholarships.length
  };

  return (
      <StudentDashboardLayout user={user} profile={profile} loading={dashboardLoading}>
        {/* Área de proteção para o botão */}
        <div className="floating-cart-area" />
        {/* Botão flutuante super robusto - sempre visível */}
        <div 
          className="floating-cart-button"
          id="floating-cart-hat"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 99999,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={() => navigate('/student/dashboard/cart')}
            style={{
              backgroundColor: '#05294E',
              color: 'white',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid white',
              boxShadow: '0 8px 32px rgba(5, 41, 78, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: 99999,
              minWidth: '60px',
              minHeight: '60px',
              outline: 'none'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
            aria-label={`Cart with ${cart.length} items`}
          >
            <GraduationCap style={{ width: '28px', height: '28px', color: 'white' }} />
            {cart.length > 0 && (
              <span 
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: '2px solid white',
                  zIndex: 100000
                }}
              >
                {cart.length > 99 ? '99+' : cart.length}
              </span>
            )}
          </button>
        </div>
        <Routes>
          <Route 
            index 
            element={
              dashboardLoading ? (
                <div className="p-8 text-center text-lg text-slate-500">Loading dashboard...</div>
              ) : dashboardError ? (
                <div className="p-8 text-center text-red-500">{dashboardError}</div>
              ) : (
                <Overview 
                  profile={profile}
                  scholarships={scholarships}
                  applications={applications}
                  stats={stats}
                  onApplyScholarship={handleApplyScholarship}
                  recentApplications={recentApplications}
                />
              )
            } 
          />
          <Route path="cart" element={<CartPage />} />
          <Route 
            path="scholarships" 
            element={
              <ScholarshipBrowser 
                scholarships={scholarships}
                applications={applications}
                onApplyScholarship={handleApplyScholarship}
              />
            } 
          />
          <Route 
            path="applications" 
            element={
              <MyApplications />
            } 
          />
          <Route 
            path="application/:applicationId/chat" 
            element={
              <ApplicationChatPage />
            } 
          />
          <Route 
            path="profile" 
            element={
              <ProfileManagement 
                profile={profile}
                onUpdateProfile={handleProfileUpdate}
              />
            } 
          />
          <Route path="documents-and-scholarship-choice" element={<DocumentsAndScholarshipChoice />} />
          <Route path="college-enrollment-checkout" element={<CollegeEnrollmentCheckout />} />
          <Route path="/scholarship-fee-success" element={<ScholarshipFeeSuccess />} />
          <Route path="/scholarship-fee-error" element={<ScholarshipFeeError />} />
          <Route path="/selection-process-fee-success" element={<SelectionProcessFeeSuccess />} />
          <Route path="/selection-process-fee-error" element={<SelectionProcessFeeError />} />
          <Route path="/application-fee-success" element={<ApplicationFeeSuccess />} />
          <Route path="/application-fee-error" element={<ApplicationFeeError />} />
          <Route path="application-fee" element={<ApplicationFeePage />} />
          <Route path="rewards" element={<MatriculaRewards />} />
          <Route path="rewards/store" element={<RewardsStore />} />
        </Routes>
        
        {/* Fase 5: Modal de Parabéns para Código de Referência */}
        {referralResult && (
          <ReferralCongratulationsModal
            isOpen={showCongratulationsModal}
            onClose={() => setShowCongratulationsModal(false)}
            discountAmount={referralResult.discount_amount || 50}
            affiliateCode={referralResult.affiliate_code || 'N/A'}
          />
        )}

        {/* Welcome discount modal (first visit only) */}
        <WelcomeDiscountModal
          isOpen={showWelcomeDiscount}
          onClose={() => setShowWelcomeDiscount(false)}
          amount={activeDiscount?.discount_amount || 50}
        />
      </StudentDashboardLayout>
  );
};

export default StudentDashboard;