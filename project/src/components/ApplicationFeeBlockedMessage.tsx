import React from 'react';
import { CheckCircle, Lock, ArrowRight, GraduationCap, Shield, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ApplicationFeeBlockedMessageProps {
  committedUniversity: string | null;
  committedScholarship: string | null;
}

export const ApplicationFeeBlockedMessage: React.FC<ApplicationFeeBlockedMessageProps> = ({
  committedUniversity,
  committedScholarship
}) => {
  const navigate = useNavigate();

  const handleGoToApplications = () => {
    navigate('/student-dashboard/my-applications');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-green-400/20 to-emerald-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Main Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
                Scholarship Selection Locked
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                You have already committed to a scholarship application and are progressing through the process
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              {/* Current Commitment */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-900">Your Current Application</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {committedUniversity && (
                      <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-green-200/30">
                        <GraduationCap className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-green-700 font-medium">University</p>
                          <p className="text-lg font-bold text-green-900">{committedUniversity}</p>
                        </div>
                      </div>
                    )}
                    
                    {committedScholarship && (
                      <div className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-green-200/30">
                        <Award className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-green-700 font-medium">Scholarship Program</p>
                          <p className="text-lg font-bold text-green-900">{committedScholarship}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Why Locked */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-blue-900">Why is browsing locked?</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-white/60 rounded-xl border border-blue-200/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white font-bold text-sm">1</span>
                      </div>
                      <p className="text-blue-800 leading-relaxed">You have already paid the Application Fee for a specific scholarship</p>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-white/60 rounded-xl border border-blue-200/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white font-bold text-sm">2</span>
                      </div>
                      <p className="text-blue-800 leading-relaxed">Your documents have been approved by the university you selected</p>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 bg-white/60 rounded-xl border border-blue-200/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white font-bold text-sm">3</span>
                      </div>
                      <p className="text-blue-800 leading-relaxed">You are now committed to that specific university and scholarship program</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200/50 rounded-2xl p-8 mb-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-400/10 to-slate-500/10 rounded-full -translate-y-16 translate-x-16"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">What's next?</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-white/60 rounded-xl border border-gray-200/30">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-white font-bold text-lg">1</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Continue Process</h3>
                    <p className="text-gray-600 text-sm">Continue with your current application process</p>
                  </div>
                  
                  <div className="text-center p-6 bg-white/60 rounded-xl border border-gray-200/30">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-white font-bold text-lg">2</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Pay Scholarship Fee</h3>
                    <p className="text-gray-600 text-sm">Pay the Scholarship Fee when ready</p>
                  </div>
                  
                  <div className="text-center p-6 bg-white/60 rounded-xl border border-gray-200/30">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-white font-bold text-lg">3</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Complete Process</h3>
                    <p className="text-gray-600 text-sm">Receive your acceptance letter and complete the process</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <button
                onClick={handleGoToApplications}
                className="group inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-1 transition-all duration-300"
              >
                View My Applications
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
