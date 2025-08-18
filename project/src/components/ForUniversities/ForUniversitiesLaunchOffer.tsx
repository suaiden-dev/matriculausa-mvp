import React from 'react';
import { CheckCircle, Clock, Star, ArrowRight } from 'lucide-react';

interface ForUniversitiesLaunchOfferProps {
  onButtonClick: () => void;
  onScheduleClick: () => void;
}

const ForUniversitiesLaunchOffer: React.FC<ForUniversitiesLaunchOfferProps> = ({ onButtonClick, onScheduleClick }) => {
  return (
    <section className="py-24 bg-[#05294E] text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#05294E]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-8 border border-white/30">
            <Clock className="h-5 w-5 text-slate-300 mr-2" />
            <span className="text-sm font-bold text-white">Limited Time Offer</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight">
            <span className="text-white">3 Months </span>
            <span className="text-[#D0151C]">FREE</span>
          </h2>

          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-4xl mx-auto leading-relaxed">
            Launch Special for Universities
          </p>

          <p className="text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
            Start your international student recruitment journey with our complete platform at no cost. 
            Experience the power of AI-driven recruitment for 3 full months.
          </p>
        </div>

        {/* Info Tags */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30 flex items-center">
            <Clock className="h-4 w-4 text-slate-300 mr-2" />
            <span className="text-sm font-bold text-white">Limited Time Only</span>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30 flex items-center">
            <Star className="h-4 w-4 text-slate-300 mr-2" />
            <span className="text-sm font-bold text-white">Exclusive Benefits</span>
          </div>
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-[#05294E]/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <CheckCircle className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-center">Full Platform Access</h3>
            <p className="text-white/80 text-center leading-relaxed">
              Complete access to all AI tools, student database, and recruitment features
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-[#05294E]/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <CheckCircle className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-center">Dedicated Support</h3>
            <p className="text-white/80 text-center leading-relaxed">
              Personal onboarding specialist and priority customer support
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-[#05294E]/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <CheckCircle className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold mb-4 text-center">Custom Setup</h3>
            <p className="text-white/80 text-center leading-relaxed">
              Tailored configuration for your university's specific needs
            </p>
          </div>
        </div>

        {/* What You Get */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 mb-16">
          <h3 className="text-2xl font-bold mb-8 text-center">What You Get During the Free Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Unlimited student applications</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">AI-powered candidate filtering</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Complete CRM integration</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Performance analytics dashboard</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Multi-language support</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">WhatsApp AI assistant</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Email automation tools</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-slate-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Student success tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button 
            onClick={onButtonClick}
            className="group bg-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-[#a61212] transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
          >
            Start My 3-Month Free Trial
            <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={onScheduleClick}
            className="group bg-transparent text-white px-10 py-5 rounded-2xl text-xl font-bold hover:bg-white/10 transition-all duration-300 border-2 border-white/30 flex items-center justify-center"
          >
            Schedule Your Meeting
            <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Fine Print */}
        <div className="text-center mt-8">
          <p className="text-white/70 text-sm">
            * Free trial includes all features. No credit card required. 
            Cancel anytime during the trial period.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesLaunchOffer;
