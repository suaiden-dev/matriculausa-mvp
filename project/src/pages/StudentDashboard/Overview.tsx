import React from 'react';
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
  CreditCard
} from 'lucide-react';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useAuth } from '../../hooks/useAuth';
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

const Overview: React.FC<OverviewProps> = ({ 
  profile, 
  scholarships, 
  applications, 
  stats, 
  onApplyScholarship,
  recentApplications = []
}) => {
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
  } else if (!userProfile?.is_scholarship_fee_paid) {
    // Pagou até Application Fee
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
  } else if (!userProfile?.has_paid_i20_control_fee) {
    // Pagou até Scholarship Fee
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
  } else {
    // Tudo completo
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
        description: 'Completed!',
        completed: true,
        current: false,
      },
    ];
  }

  const allCompleted = steps.every(step => step.completed);

  return (
    <div className="overview-dashboard-container">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Award className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-1">
                Welcome back, {userProfile?.full_name || user?.email || 'Student'}!
              </h2>
            </div>
          </div>

          {/* Progress Bar dentro do bloco azul */}
          {!allCompleted && (
            <>
              <div className="text-center text-white text-sm md:text-base font-semibold mb-1">
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
                <div className="text-xl md:text-2xl font-bold text-white">$350</div>
              </div>
              <p className="text-blue-100 text-sm mb-2">
                Start your journey to American education by completing our comprehensive selection process.
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-2">
            <div className="bg-white/10 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/20">
              <Award className="h-7 w-7 text-white mb-3" />
              <h3 className="font-bold text-white mb-1 md:mb-2">Discover Scholarships</h3>
              <p className="text-blue-100 text-xs md:text-sm">Find opportunities that match your profile</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/20">
              <FileText className="h-7 w-7 text-yellow-400 mb-3" />
              <h3 className="font-bold text-white mb-1 md:mb-2">Apply with Confidence</h3>
              <p className="text-blue-100 text-xs md:text-sm">Get guidance throughout the process</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-white/20">
              <CheckCircle className="h-7 w-7 text-green-400 mb-3" />
              <h3 className="font-bold text-white mb-1 md:mb-2">Track Your Progress</h3>
              <p className="text-blue-100 text-xs md:text-sm">Monitor applications in real-time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between">
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

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
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

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
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

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
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
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6 mt-6 max-w-2xl mx-auto">
            <h3 className="text-2xl font-extrabold text-blue-900 mb-4">Recent Applications</h3>
            {recentApplications.length === 0 ? (
              <div className="text-slate-500">No recent applications found.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentApplications.map((app, idx) => (
                  <li key={app.id} className="flex flex-col sm:flex-row sm:items-center py-4 gap-2">
                    <div>
                      <div className="text-lg font-semibold text-slate-800">{app.scholarship?.name || 'Scholarship'}</div>
                      <div className="text-sm text-gray-500">{new Date(app.applied_at).toLocaleDateString()}</div>
                    </div>
                    <span className="ml-auto bg-green-100 text-green-700 font-semibold px-4 py-1 rounded-full text-sm shadow-sm w-fit">
                      {app.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recommended Scholarships & Profile Status */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
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
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg text-white p-6">
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