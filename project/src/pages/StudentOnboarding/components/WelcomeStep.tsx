import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { StepProps } from '../types';
import { Search, FileText, CheckCircle, Clock, ArrowUpRight, GraduationCap } from 'lucide-react';

export const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  const { userProfile } = useAuth();

  const processSteps = [
    {
      id: 1,
      title: 'Selection Fee',
      subtitle: 'Starting your journey',
      description: 'Pay the selection fee to start the application process at American universities.',
      icon: Search,
      iconColor: 'text-[#05294E]',
      iconBg: 'bg-[#05294E]/10',
      benefits: [
        '→ Full system access',
        '→ Specialized support',
        '→ Foundation for your application'
      ],
      completed: true
    },
    {
      id: 2,
      title: 'Scholarship Selection',
      subtitle: 'Selecting opportunities',
      description: 'Explore and choose the universities and scholarships that best align with your academic goals.',
      icon: GraduationCap,
      iconColor: 'text-[#D0151C]',
      iconBg: 'bg-[#D0151C]/10',
      benefits: [
        '→ Complete catalog of options',
        '→ Custom filters',
        '→ Easy comparison'
      ],
      completed: true
    },
    {
      id: 3,
      title: 'Documents and Approval',
      subtitle: 'Finalizing your application',
      description: 'Upload the necessary documents and track the review and approval process in real time.',
      icon: FileText,
      iconColor: 'text-[#05294E]',
      iconBg: 'bg-[#05294E]/10',
      benefits: [
        '→ Simplified upload',
        '→ Real-time tracking',
        '→ Automatic notifications'
      ],
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
          {/* Tag */}
          <div className="inline-flex items-center justify-center mb-4">
            <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-sm font-medium">
              • Onboarding Process
            </span>
          </div>
          
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Welcome{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Every successful application follows a proven path from start to completion.
          </p>
        </div>

        {/* Process Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
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

                    {/* Key Benefits */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Benefits:</h4>
                      <ul className="space-y-2">
                        {step.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start">
                            <span className="mr-2">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action Section */}
        <div className="bg-gray-50 rounded-2xl p-8 sm:p-12 text-center border border-gray-200">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Ready to start your journey?
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Let's discuss how our process can be adapted to your unique application needs and goals.
          </p>
          
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
