import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { StepProps } from '../types';
import { ArrowRight, GraduationCap, Users, Award, CheckCircle, Sparkles, FileText, CreditCard, Upload, Eye, FileCheck, Mail } from 'lucide-react';

export const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  const { userProfile } = useAuth();

  const features = [
    {
      icon: GraduationCap,
      title: 'Top Universities',
      description: 'Access prestigious US universities',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100'
    },
    {
      icon: Users,
      title: 'Expert Support',
      description: 'Personalized guidance throughout your journey',
      gradient: 'from-indigo-500 to-indigo-600',
      bgGradient: 'from-indigo-50 to-indigo-100'
    },
    {
      icon: Award,
      title: 'Scholarship Matching',
      description: 'Find scholarships that match your profile',
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-50 to-purple-100'
    }
  ];

  const benefits = [
    'Streamlined application process',
    'Document verification support',
    'Visa assistance guidance',
    '24/7 student support'
  ];

  const processSteps = [
    {
      number: 1,
      icon: CreditCard,
      title: 'Pay Selection Fee',
      description: '$350 to begin',
      color: 'blue'
    },
    {
      number: 2,
      icon: Award,
      title: 'Choose Scholarships',
      description: 'Select universities',
      color: 'indigo'
    },
    {
      number: 3,
      icon: FileText,
      title: 'Select Process Type',
      description: 'Initial or Transfer',
      color: 'purple'
    },
    {
      number: 4,
      icon: Upload,
      title: 'Upload Documents',
      description: 'Passport, diploma, funds',
      color: 'pink'
    },
    {
      number: 5,
      icon: Eye,
      title: 'University Review',
      description: 'Document review',
      color: 'orange'
    },
    {
      number: 6,
      icon: CreditCard,
      title: 'Pay Application Fee',
      description: 'After approval',
      color: 'red'
    },
    {
      number: 7,
      icon: Award,
      title: 'Pay Scholarship Fee',
      description: 'Secure your spot',
      color: 'green'
    },
    {
      number: 8,
      icon: Mail,
      title: 'Acceptance Letter',
      description: 'Official letter',
      color: 'teal'
    },
    {
      number: 9,
      icon: FileCheck,
      title: 'Complete Enrollment',
      description: 'Finalize enrollment',
      color: 'cyan'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; text: string; border: string } } = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="w-full h-full flex flex-col max-w-6xl mx-auto px-4 sm:px-6">
      {/* Hero Section - Compacto */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 mb-3 sm:mb-4">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-64 sm:h-64 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
        
        <div className="relative z-10">
          {/* Welcome Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full mb-3 shadow-sm">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Welcome to MatriculaUSA</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
            Welcome{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
          </h1>
          
          <p className="text-sm sm:text-base text-gray-700 mb-3">
            Start your journey to study in the United States in just a few simple steps.
          </p>

          {/* Benefits List - Compacto */}
          <div className="grid grid-cols-2 gap-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs text-gray-700 font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid - Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 sm:mb-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="group relative bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
            >
              {/* Gradient Background on Hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300`}></div>
              
              <div className="relative z-10">
                {/* Icon */}
                <div className={`inline-flex p-2.5 bg-gradient-to-br ${feature.gradient} rounded-lg mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 group-hover:text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-600 group-hover:text-gray-700">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Process Explanation Section */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 sm:mb-4">
        <div className="mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
            Selection Process
          </h2>
          <p className="text-xs text-gray-600">
            Your journey from registration to acceptance letter:
          </p>
        </div>

        {/* Process Steps - Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {processSteps.map((step, index) => {
            const Icon = step.icon;
            const colors = getColorClasses(step.color);
            return (
              <div
                key={index}
                className={`relative bg-white rounded-lg p-2.5 border-2 ${colors.border} hover:shadow-md transition-all duration-300`}
              >
                {/* Step Number Badge */}
                <div className={`absolute -top-2 -left-2 w-6 h-6 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center font-bold text-xs border-2 ${colors.border} shadow-sm`}>
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`${colors.bg} ${colors.text} w-8 h-8 rounded-lg flex items-center justify-center mb-2 mt-1.5`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <h3 className="text-xs font-bold text-gray-900 mb-0.5 leading-tight">
                  {step.title}
                </h3>
                <p className="text-xs text-gray-600 leading-tight">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Summary Note */}
        <div className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong className="font-semibold">💡 Tip:</strong> We'll guide you through each step. Process takes 4-8 weeks.
          </p>
        </div>
      </div>

      {/* CTA Section - Sempre visível */}
      <div className="flex flex-col items-center justify-center pt-2 mt-auto">
        <div className="text-center mb-3">
          <p className="text-sm text-gray-600">Ready to begin?</p>
        </div>
        
        <button
          onClick={onNext}
          className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-8 rounded-xl font-semibold text-base flex items-center justify-center space-x-2 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden w-full sm:w-auto"
        >
          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          <span className="relative z-10">Get Started</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

