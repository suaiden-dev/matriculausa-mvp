import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ForUniversitiesFinalCTAProps {
  onScheduleClick: () => void;
  onButtonClick: () => void;
}

const ForUniversitiesFinalCTA: React.FC<ForUniversitiesFinalCTAProps> = ({ onScheduleClick, onButtonClick }) => {
  return (
    <section className="py-24 bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* Modern Background Pattern */}
      <div className="absolute inset-0">
        {/* Floating blur elements */}
        <div className="absolute top-20 left-10 w-80 h-80 bg-[#05294E]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#D0151C]/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-yellow-300/15 rounded-full blur-2xl"></div>
        
        {/* Geometric shapes */}
        <div className="absolute top-32 right-1/4 w-32 h-32 bg-gradient-to-br from-[#05294E]/20 to-transparent rounded-3xl rotate-45 blur-sm"></div>
        <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-gradient-to-br from-[#D0151C]/20 to-transparent rounded-2xl rotate-12 blur-sm"></div>
        
        {/* Subtle dots */}
        <div className="absolute top-1/4 right-1/3 w-3 h-3 bg-[#05294E]/30 rounded-full blur-sm"></div>
        <div className="absolute bottom-1/4 left-1/5 w-2 h-2 bg-[#D0151C]/40 rounded-full blur-sm"></div>
        <div className="absolute top-2/3 right-1/5 w-4 h-4 bg-yellow-300/50 rounded-full blur-sm"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-block bg-white/80 backdrop-blur-xl rounded-full px-8 py-4 mb-8 border border-slate-200/50 shadow-lg">
            <span className="text-[#05294E] font-bold text-sm tracking-wide uppercase">Take Action Now</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight">
            Ready to Transform Your <span className="text-[#05294E] relative">
              International Student Recruitment
              <div className="absolute -bottom-2 left-0 w-full h-2 bg-gradient-to-r from-[#05294E]/30 via-yellow-300/50 to-[#D0151C]/30 rounded-full blur-sm"></div>
            </span>?
          </h2>
          
          <p className="text-xl md:text-2xl mb-12 text-slate-700 max-w-4xl mx-auto leading-relaxed">
            Join hundreds of universities that have already increased their international enrollments by up to 50% 
            while reducing costs and administrative burden. Start your journey today with our risk-free 3-month trial.
          </p>
        </div>
        
        {/* Final CTAs - Enhanced Focus */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-8 justify-center mb-16">
            <div className="relative group">
              <div className="absolute -inset-3 bg-gradient-to-r from-[#05294E]/30 via-yellow-300/30 to-[#D0151C]/30 rounded-3xl blur-xl opacity-80 group-hover:opacity-100 transition duration-500"></div>
              <button 
                onClick={onButtonClick} 
                className="relative bg-[#05294E] text-white px-16 py-8 rounded-3xl text-3xl font-black hover:bg-[#05294E]/90 transition-all duration-300 transform hover:scale-105 shadow-2xl backdrop-blur-xl flex items-center justify-center w-full sm:w-auto"
              >
                Start My Free Trial Now
                <ArrowRight className="ml-4 h-8 w-8 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
            
            <button 
              onClick={onScheduleClick} 
              className="group bg-white/90 backdrop-blur-xl text-slate-900 px-16 py-8 rounded-3xl text-3xl font-bold hover:bg-white transition-all duration-300 border-2 border-[#05294E]/20 hover:border-[#05294E]/50 flex items-center justify-center shadow-2xl hover:scale-105 transform"
            >
              Schedule a Demo
              <ArrowRight className="ml-4 h-8 w-8 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
          
          {/* Subtle Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-16 text-slate-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#05294E] rounded-full"></div>
              <span className="text-sm font-medium">No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#05294E] rounded-full"></div>
              <span className="text-sm font-medium">No long-term contracts</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#05294E] rounded-full"></div>
              <span className="text-sm font-medium">Cancel anytime</span>
            </div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-10 max-w-4xl mx-auto border border-white/60 shadow-2xl">
            <p className="text-slate-800 text-2xl leading-relaxed text-center">
              <span className="font-black text-[#D0151C] text-3xl">Limited Time Offer:</span>
              <span className="block mt-4 text-xl">Get 3 months completely free when you start today. No hidden fees, no surprises - just measurable results for your university.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesFinalCTA;
