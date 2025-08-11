import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Search, 
  Target, 
  BookOpen,
  ArrowUpRight,
  Calendar,
  Building,
  Star,
  Eye,
  CreditCard,
  Gift,
  X,
  Tag
} from 'lucide-react';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useAuth } from '../../hooks/useAuth';
import { useReferralCode } from '../../hooks/useReferralCode';
import { ProgressBar } from '../../components/ProgressBar';
import StepByStepButton from '../../components/OnboardingTour/StepByStepButton';
import './Overview.css'; // Adicionar um arquivo de estilos dedicado para padronização visual

interface OverviewProps {
  profile: any;
  scholarships: any[];
  applications: any[];
  stats: {
    totalApplications: number;
    approvedApplications: number;
    pendingApplications: number;
    availableScholarships: number;
  };
  onApplyScholarship: (scholarshipId: string) => void;
  recentApplications?: any[];
}

// Componente de mensagem de boas‑vindas (compacto, em inglês e estilizado para o hero)
const WelcomeMessage: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const { user } = useAuth();

  if (!showWelcome || !user) return null;

  return (
    <div className="mb-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Welcome gift: $50 discount</h3>
            <p className="text-sm text-white/90">
              A $50 discount has been automatically applied and will be used on your next application fee checkout.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowWelcome(false)}
          className="text-white/70 hover:text-white transition-colors"
          title="Dismiss welcome message"
          aria-label="Dismiss welcome message"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const Overview: React.FC<OverviewProps> = ({ 
  profile, 
  scholarships, 
  applications, 
  stats, 
  onApplyScholarship,
  recentApplications = []
}) => {
  console.log('🔍 [Overview] Componente Overview renderizando');
  
  const { activeDiscount, testReferralCode } = useReferralCode();
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return Clock;
      case 'under_review': return Clock;
      default: return Clock;
    }
  };

  const quickActions = [
    {
      title: 'Find Scholarships',
      description: 'Discover new scholarship opportunities',
      icon: Search,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/student/dashboard/scholarships',
      count: stats.availableScholarships
    },
    {
      title: 'My Applications',
      description: 'Track your application status',
      icon: FileText,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/student/dashboard/applications',
      count: stats.totalApplications
    },
    {
      title: 'Update Profile',
      description: 'Keep your profile current',
      icon: Target,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      link: '/student/dashboard/profile',
      count: null
    }
  ];

  const { user, userProfile } = useAuth();

  // Lógica da barra de progresso dinâmica
  let steps = [];
  if (!userProfile?.has_paid_selection_process_fee) {
    // Só pagou (ou está pagando) a Selection Process Fee
    steps = [
      {
        label: 'Selection Process Fee',
        description: 'Pay the Selection Process Fee to unlock and browse available scholarships.',
        completed: false,
        current: true,
      },
      {
        label: 'Application Fee',
        description: 'Pay the Application Fee to apply for a specific scholarship.',
        completed: false,
        current: false,
      },
      {
        label: 'Scholarship Fee',
        description: 'Pay the Scholarship Fee to confirm your scholarship application.',
        completed: false,
        current: false,
      },
      {
        label: 'I-20 Control Fee',
        description: 'Pay the I-20 Control Fee to start your I-20 and document validation process. You have 10 days after the scholarship fee.',
        completed: false,
        current: false,
      },
    ];
  } else if (!userProfile?.is_application_fee_paid) {
    // Pagou só a Selection Process Fee
    steps = [
      {
        label: 'Selection Process Fee',
        description: 'Completed!',
        completed: true,
        current: false,
      },
      {
        label: 'Application Fee',
        description: 'Pay the Application Fee to apply for a specific scholarship.',
        completed: false,
        current: true,
      },
      {
        label: 'Scholarship Fee',
        description: 'Pay the Scholarship Fee to confirm your scholarship application.',
        completed: false,
        current: false,
      },
      {
        label: 'I-20 Control Fee',
        description: 'Pay the I-20 Control Fee to start your I-20 and document validation process. You have 10 days after the scholarship fee.',
        completed: false,
        current: false,
      },
    ];
  } else if (!userProfile?.has_paid_college_enrollment_fee) {
    // Pagou Application Fee
    steps = [
      {
        label: 'Selection Process Fee',
        description: 'Completed!',
        completed: true,
        current: false,
      },
      {
        label: 'Application Fee',
        description: 'Completed!',
        completed: true,
        current: false,
      },
      {
        label: 'Scholarship Fee',
        description: 'Pay the Scholarship Fee to confirm your scholarship application.',
        completed: false,
        current: true,
      },
      {
        label: 'I-20 Control Fee',
        description: 'Pay the I-20 Control Fee to start your I-20 and document validation process. You have 10 days after the scholarship fee.',
        completed: false,
        current: false,
      },
    ];
  } else {
    // Pagou tudo
    steps = [
      {
        label: 'Selection Process Fee',
        description: 'Completed!',
        completed: true,
        current: false,
      },
      {
        label: 'Application Fee',
        description: 'Completed!',
        completed: true,
        current: false,
      },
      {
        label: 'Scholarship Fee',
        description: 'Completed!',
        completed: true,
        current: false,
      },
      {
        label: 'I-20 Control Fee',
        description: 'Pay the I-20 Control Fee to start your I-20 and document validation process. You have 10 days after the scholarship fee.',
        completed: false,
        current: true,
      },
    ];
  }

  const allCompleted = steps.every(step => step.completed);

  return (
    <div className="overview-dashboard-container">

      
      {/* Mensagem de boas‑vindas movida para o hero */}
      
      {/* Alerta de desconto duplicado removido para evitar repetição com a mensagem de boas‑vindas */}
      
      {/* Welcome Message / Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden ring-1 ring-white/10 shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Award className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-1">
                Welcome back, {userProfile?.full_name || user?.email || 'Student'}!
              </h2>
            </div>
          </div>

          {/* Welcome banner inside hero */}
          <WelcomeMessage />

          {/* Progress Bar dentro do bloco azul */}
          {!allCompleted && (
            <>
              <div className="text-center text-white/90 text-sm md:text-base font-medium mb-1">
                This is your application fee progress bar. Complete each step to move forward.
              </div>
              <div className="mb-2 md:mb-4">
                <ProgressBar steps={steps} />
              </div>
            </>
          )}

          {userProfile && !userProfile.has_paid_selection_process_fee && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-4 md:p-6 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-white mr-2" />
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-white">Selection Process</h3>
                    <p className="text-blue-100 text-sm">Complete your application process</p>
                  </div>
                </div>
                <div className="text-right">
                  {activeDiscount?.has_discount ? (
                    <div className="text-center">
                      <div className="text-xl md:text-2xl font-bold text-white line-through">$350</div>
                      <div className="text-lg md:text-xl font-bold text-green-300">
                        ${350 - (activeDiscount.discount_amount || 0)}
                      </div>
                      <div className="flex items-center justify-center mt-1">
                        <Tag className="h-3 w-3 text-green-300 mr-1" />
                        <span className="text-xs text-green-300 font-medium">
                          Coupon applied: -${activeDiscount.discount_amount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xl md:text-2xl font-bold text-white">$350</div>
                  )}
                </div>
              </div>
              <p className="text-blue-100 text-sm mb-2">
                Start your journey to American education by completing our comprehensive selection process.
                {activeDiscount?.has_discount && (
                  <span className="block mt-1 text-green-300 font-medium">
                    ✨ You have a discount coupon applied!
                  </span>
                )}
              </p>
              <StripeCheckout 
                productId="selectionProcess"
                feeType="selection_process"
                paymentType="selection_process"
                buttonText="Start Selection Process"
                className="border-2 border-white"
                successUrl={`${window.location.origin}/student/dashboard/selection-process-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                cancelUrl={`${window.location.origin}/student/dashboard/selection-process-fee-error`}
              />
            </div>
          )}
          {/* Removed three unused mini-cards (Discover/Apply/Track) as requested */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-6.518-3.89A1 1 0 007 8.618v6.764a1 1 0 001.234.97l6.518-1.878a1 1 0 00.748-.97v-2.764a1 1 0 00-.748-.97z" /></svg>
            </div>
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Step-by-Step Tour</h3>
          <p className="text-slate-600 text-sm mb-4">See the full application journey in detail.</p>
          <div className="flex justify-end">
            <StepByStepButton />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">My Applications</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalApplications}</p>
              <div className="flex items-center mt-2">
                <FileText className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">Total submitted</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Approved</p>
              <p className="text-3xl font-bold text-slate-900">{stats.approvedApplications}</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">Successful</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
              <p className="text-3xl font-bold text-slate-900">{stats.pendingApplications}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium text-yellow-600">Under review</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="overview-quick-actions">
        {quickActions.map((action) => (
          <Link
            to={action.link}
            key={action.title}
            className="overview-card overview-action-card"
          >
            <div className={`overview-card-icon ${action.color}`}>
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <div className="overview-card-content">
              <div className="overview-card-title">{action.title}</div>
              <div className="overview-card-desc">{action.description}</div>
              {action.count !== null && (
                <div className="overview-card-count">{action.count}</div>
              )}
            </div>
            <ArrowUpRight className="ml-auto h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </Link>
        ))}
      </div>
      {/* Step by Step Guide */}
      {/* <div className="overview-stepbystep-wrapper">
        <div
          className="overview-card overview-stepbystep-card"
          tabIndex={0}
          role="button"
          onClick={() => document.getElementById('step-by-step-btn')?.click()}
          onKeyPress={e => { if (e.key === 'Enter') document.getElementById('step-by-step-btn')?.click(); }}
        >
          <div className="overview-stepbystep-content">
            <div className="overview-stepbystep-title">Step by Step Guide</div>
            <div className="overview-stepbystep-desc">Follow the onboarding steps to complete your journey.</div>
          </div>
          <StepByStepButton id="step-by-step-btn" className="hidden-mobile" />
        </div>
      </div> */}
      {/* Progress Bar */}
      {/* <div className="overview-progressbar-wrapper">
        <ProgressBar steps={steps} />
      </div> */}
      {/* Outros cards/boxes da overview seguem o mesmo padrão visual */}
      {/* Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-6 mb-6 mt-6 max-w-2xl mx-auto">
            <h3 className="text-2xl font-extrabold text-blue-900 mb-4">Recent Applications</h3>
            {recentApplications.length === 0 ? (
              <div className="text-slate-500">No recent applications found.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentApplications.map((app, idx) => {
                  const scholarship = app.scholarship || app.scholarships;
                  return (
                    <li key={app.id} className="flex flex-col sm:flex-row sm:items-center py-4 gap-4">
                      {/* Logo da universidade */}
                      {scholarship?.universities?.logo_url && (
                        <img src={scholarship.universities.logo_url} alt={scholarship.universities.name} className="w-12 h-12 rounded-full object-contain border border-slate-200 bg-white mr-4" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="text-lg font-semibold text-slate-800 line-clamp-1">{scholarship?.title || 'Scholarship'}</div>
                          <span className="ml-0 sm:ml-4 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{scholarship?.level}</span>
                          <span className="ml-0 sm:ml-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">{scholarship?.field_of_study}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-600">
                          <span className="font-medium">University:</span> {scholarship?.universities?.name}
                          {scholarship?.amount && (
                            <span className="ml-4 font-medium text-green-700">${scholarship.amount.toLocaleString()}</span>
                          )}
                          {scholarship?.deadline && (
                            <span className="ml-4">Deadline: {new Date(scholarship.deadline).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                          <span>Applied on {new Date(app.applied_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                      <span className={`ml-auto bg-green-100 text-green-700 font-semibold px-4 py-1 rounded-full text-sm shadow-sm w-fit`}>
                      {app.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Recommended Scholarships & Profile Status */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              Profile Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Basic information</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Academic details</span>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Documents uploaded</span>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Complete your profile to unlock more opportunities
              </p>
              <Link
                to="/student/dashboard/profile"
                className="text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
              >
                Complete now →
              </Link>
            </div>
          </div>

          {/* Study Tips */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md text-white p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              💡 Success Tips
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-100">
                  Apply early to increase your chances of success
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-100">
                  Tailor your applications to each scholarship
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-100">
                  Keep your profile updated with latest achievements
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Overview;