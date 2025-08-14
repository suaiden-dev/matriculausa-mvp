import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  FileText, 
  CheckCircle, 
  Clock, 
  Search, 
  Target, 
  BookOpen,
  ArrowUpRight,
  Calendar,
  Building,
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
  onApplyScholarship: (scholarshipId: string) => Promise<void>;
  recentApplications?: any[];
}

const Overview: React.FC<OverviewProps> = ({
  stats, 
  recentApplications = []
}) => {
  const { activeDiscount } = useReferralCode();
  const [visibleApplications, setVisibleApplications] = useState(5); // Mostrar 5 inicialmente
  
  const hasMoreApplications = recentApplications.length > visibleApplications;
  const displayedApplications = recentApplications.slice(0, visibleApplications);
  
  const handleLoadMore = () => {
    setVisibleApplications(prev => Math.min(prev + 5, recentApplications.length));
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
    <div className="overview-dashboard-container pt-2">

      
      {/* Mensagem de boas‑vindas movida para o hero */}
      
      {/* Alerta de desconto duplicado removido para evitar repetição com a mensagem de boas‑vindas */}
      
      {/* Welcome Message / Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 md:p-6 text-white relative overflow-hidden ring-1 ring-white/10 shadow-xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Award className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">
                Welcome back, {userProfile?.full_name || user?.email || 'Student'}!
              </h2>
            </div>
          </div>

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
            <div className="bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-4 sm:p-6 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-3 sm:mb-4">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white mr-2 sm:mr-3" />
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">Selection Process</h3>
                    <p className="text-blue-100 text-xs sm:text-sm">Complete your application process</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  {activeDiscount?.has_discount ? (
                    <div className="flex flex-col sm:text-center">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white line-through">$350</div>
                      <div className="text-base sm:text-lg md:text-xl font-bold text-green-300">
                        ${350 - (activeDiscount.discount_amount || 0)}
                      </div>
                      <div className="flex items-center sm:justify-center mt-1">
                        <Tag className="h-3 w-3 text-green-300 mr-1" />
                        <span className="text-xs text-green-300 font-medium">
                          Coupon applied: -${activeDiscount.discount_amount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">$350</div>
                  )}
                </div>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm mb-3 sm:mb-4 leading-relaxed">
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
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-3 px-4 sm:px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 cursor-pointer border-2 border-white text-sm sm:text-base"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Recent Applications</h3>
                  <p className="text-slate-600 text-sm">Track your latest scholarship submissions</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="flex items-baseline gap-2">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{recentApplications.length}</div>
                  {recentApplications.length > visibleApplications && (
                    <div className="text-sm text-slate-500">
                      ({visibleApplications} shown)
                    </div>
                  )}
                </div>
                <div className="text-slate-500 text-xs">Total Applications</div>
              </div>
            </div>
            
            {recentApplications.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                </div>
                <h4 className="text-lg sm:text-xl font-semibold text-slate-700 mb-2">No applications yet</h4>
                <p className="text-slate-500 mb-6 px-4">Start your journey by browsing and applying to scholarships</p>
                <Link
                  to="/student/dashboard/scholarships"
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
                >
                  <Search className="w-4 h-4" />
                  Browse Scholarships
                </Link>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {displayedApplications.map((app) => {
                  const scholarship = app.scholarship || app.scholarships;
                  const StatusIcon = getStatusIcon(app.status);
                  
                  return (
                    <div key={app.id} className="group bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
                        {/* University Logo */}
                        <div className="flex-shrink-0 self-center sm:self-start">
                          {scholarship?.universities?.logo_url ? (
                            <div className="relative">
                              <img 
                                src={scholarship.universities.logo_url} 
                                alt={scholarship.universities.name} 
                                className="w-36 h-20 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-200 bg-white shadow-lg hover:shadow-xl transition-all duration-300" 
                                onError={(e) => {
                                  // Fallback para ícone se a imagem falhar
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl items-center justify-center border-2 border-slate-200 shadow-lg">
                                <Building className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center border-2 border-slate-200 shadow-lg">
                              <Building className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {scholarship?.title || 'Scholarship Application'}
                              </h4>
                              <p className="text-slate-600 font-medium text-sm sm:text-base truncate">
                                {scholarship?.universities?.name || 'University'}
                              </p>
                            </div>
                            <div className={`flex w-[90px] items-center sm:w-[110px] gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex-shrink-0 ${getStatusColor(app.status)}`}>
                              <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">
                                {app.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                              <span className="sm:hidden">
                                {app.status === 'approved' ? 'Approved' : app.status === 'under_review' ? 'Review' : 'Pending'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            {scholarship?.level && (
                              <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                                {scholarship.level}
                              </span>
                            )}
                            {scholarship?.field_of_study && (
                              <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium truncate max-w-32 sm:max-w-none">
                                {scholarship.field_of_study}
                              </span>
                            )}
                          </div>
                          
                          {/* Dates and Details */}
                          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>Applied: {new Date(app.applied_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}</span>
                            </div>
                            {scholarship?.deadline && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>Deadline: {new Date(scholarship.deadline).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Load More & View All */}
                {recentApplications.length > 0 && (
                  <div className="text-center space-y-3 sm:space-y-4">
                    {/* Contador de Applications */}
                    <div className="text-xs sm:text-sm text-slate-600">
                      Showing {displayedApplications.length} of {recentApplications.length} applications
                    </div>
                    
                    {/* Load More Button */}
                    {hasMoreApplications && (
                      <button
                        onClick={handleLoadMore}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all duration-200 font-semibold flex items-center justify-center gap-2 mb-3 sm:mb-4 text-sm sm:text-base"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Load More Applications
                      </button>
                    )}
                    
                    {/* View All Link */}
                    <Link
                      to="/student/dashboard/applications"
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 font-semibold border-2 border-blue-200 hover:border-blue-300 text-sm sm:text-base"
                    >
                      <FileText className="w-4 h-4" />
                      View All Applications
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recommended Scholarships & Profile Status */}
        <div className="space-y-4 sm:space-y-6">
          {/* Profile Completion */}
          <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 flex items-center">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
              Profile Status
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Basic information</span>
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Academic details</span>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Documents uploaded</span>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              </div>
            </div>

            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
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
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-md text-white p-4 sm:p-6 ring-1 ring-white/10">
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              💡 Success Tips
            </h3>
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Apply early to increase your chances of success
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Tailor your applications to each scholarship
                </p>
              </div>
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
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