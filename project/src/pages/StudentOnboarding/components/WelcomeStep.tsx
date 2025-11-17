import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { StepProps } from '../types';
import { Search, FileText, CheckCircle, Clock, ArrowUpRight, GraduationCap, DollarSign } from 'lucide-react';

export const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  const { userProfile } = useAuth();

  const processSteps = [
    {
      id: 1,
      title: 'Selection Process Fee',
      subtitle: 'Starting your journey',
      description: 'Pay the fee to unlock the platform and start selecting scholarships.',
      icon: Search,
      iconColor: 'text-[#05294E]',
      iconBg: 'bg-[#05294E]/10',
      completed: true
    },
    {
      id: 2,
      title: 'Scholarship Selection',
      subtitle: 'Selecting opportunities',
      description: 'Choose universities and scholarships that match your goals.',
      icon: GraduationCap,
      iconColor: 'text-[#D0151C]',
      iconBg: 'bg-[#D0151C]/10',
      completed: true
    },
    {
      id: 3,
      title: 'Documents and Approval',
      subtitle: 'Finalizing your application',
      description: 'Upload documents and track approval status.',
      icon: FileText,
      iconColor: 'text-[#D0151C]',
      iconBg: 'bg-[#D0151C]/10',
      completed: false
    },
    {
      id: 4,
      title: 'Additional Fees',
      subtitle: 'Application fees',
      description: 'Pay Application Fee, Scholarship Fee, and I-20 Control Fee.',
      fees: [
        'Application Fee',
        'Scholarship Fee',
        'I-20 Control Fee'
      ],
      icon: DollarSign,
      iconColor: 'text-[#05294E]',
      iconBg: 'bg-[#05294E]/10',
      completed: false
    }
  ];

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-white">
      {/* Background Shapes with Brand Colors */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#05294E]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#D0151C]/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-[#05294E]/3 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-16">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Welcome{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Start your selection process here and follow the steps to complete your application to American universities.
          </p>
        </div>

        {/* Process Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {processSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = step.completed;
            
            return (
              <div key={step.id} className="relative">
                {/* Status Indicator */}
                <div className="flex justify-center mb-4">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Card */}
                <div className="relative bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 h-full hover:shadow-lg transition-shadow duration-300">
                  {/* Background Image Effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-5 bg-gradient-to-br from-[#05294E] to-[#D0151C]"></div>
                  
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="mb-4">
                      <div className={`w-12 h-12 rounded-xl ${step.iconBg} flex items-center justify-center ${step.iconColor}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      {step.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-sm sm:text-base text-gray-600 mb-4">
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Fees Information */}
                    {step.fees && step.fees.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Fees:</h4>
                        <ul className="space-y-2">
                          {step.fees.map((fee, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-center">
                              <span className="mr-2">•</span>
                              <span>{fee}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action Section */}
        <div className="bg-gray-50 rounded-2xl p-8 sm:p-12 text-center border border-gray-200">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
            Ready to start your journey?
          </h2>
          
          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={onNext}
              className="group bg-[#05294E] hover:bg-[#041d3a] text-white px-8 py-4 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
