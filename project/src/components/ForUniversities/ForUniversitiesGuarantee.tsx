import React from 'react';
import { Shield, CheckCircle, Clock, Users, Star } from 'lucide-react';

const ForUniversitiesGuarantee: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Our <span className="text-[#05294E]">Risk-Free Guarantee</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            We're so confident in our platform that we offer a comprehensive guarantee to protect your investment
          </p>
        </div>
        
        {/* Guarantee Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-[#05294E]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-[#05294E]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Full Access Guarantee</h3>
            <p className="text-slate-600 leading-relaxed">
              Complete access to all features and tools from day one, no hidden limitations
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-[#D0151C]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-[#D0151C]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Dedicated Support</h3>
            <p className="text-slate-600 leading-relaxed">
              Personal account manager and priority support throughout your journey
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-[#05294E]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Clock className="h-8 w-8 text-[#05294E]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Custom Setup</h3>
            <p className="text-slate-600 leading-relaxed">
              Tailored configuration and onboarding specific to your university's needs
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 text-center">
            <div className="w-16 h-16 bg-[#D0151C]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Star className="h-8 w-8 text-[#D0151C]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Satisfaction Promise</h3>
            <p className="text-slate-600 leading-relaxed">
              If you're not satisfied within 30 days, we'll work to make it right
            </p>
          </div>
        </div>
        
        {/* What's Included */}
        <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-3xl p-8 text-white mb-16">
          <h3 className="text-3xl font-bold mb-8 text-center">What's Included in Your Guarantee</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">No setup fees or hidden costs</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Full platform access for 3 months</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Personal onboarding specialist</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Priority customer support</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Custom AI training for your needs</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Integration with your systems</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Performance optimization</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-yellow-300 mt-1 flex-shrink-0" />
                <span className="text-white/90">Regular success reviews</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Trust Indicators */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Trusted by Universities Worldwide</h3>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <Shield className="h-5 w-5 text-[#05294E]" />
              <span className="font-semibold text-slate-700">ISO 27001 Certified</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <Star className="h-5 w-5 text-[#D0151C]" />
              <span className="font-semibold text-slate-700">4.9/5 Rating</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <Users className="h-5 w-5 text-[#05294E]" />
              <span className="font-semibold text-slate-700">500+ Universities</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesGuarantee;
