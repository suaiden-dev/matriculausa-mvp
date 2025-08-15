import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ForUniversitiesFinalCTAProps {
  onScheduleClick: () => void;
  onButtonClick: () => void;
}

const ForUniversitiesFinalCTA: React.FC<ForUniversitiesFinalCTAProps> = ({ onScheduleClick, onButtonClick }) => {
  return (
    <section className="py-24 bg-gradient-to-br from-[#05294E] to-[#D0151C] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight">
            Ready to Transform Your <span className="text-yellow-300">International Student Recruitment</span>?
          </h2>
          
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto leading-relaxed">
            Join hundreds of universities that have already increased their international enrollments by up to 50% 
            while reducing costs and administrative burden. Start your journey today with our risk-free 3-month trial.
          </p>
        </div>
        
        {/* Final CTAs - Consolidated */}
        <div className="text-center">
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <button onClick={onButtonClick} className="group bg-yellow-300 text-slate-900 px-12 py-6 rounded-2xl text-2xl font-black hover:bg-yellow-200 transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center">
              Start My Free Trial Now
              <ArrowRight className="ml-3 h-7 w-7 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button onClick={onScheduleClick} className="group bg-transparent text-white px-12 py-6 rounded-2xl text-2xl font-bold hover:bg-white/10 transition-all duration-300 border-2 border-white/30 flex items-center justify-center">
              Schedule Your Meeting
              <ArrowRight className="ml-3 h-7 w-7 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <p className="text-white/70 text-lg">
            No credit card required • No long-term contracts • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesFinalCTA;
