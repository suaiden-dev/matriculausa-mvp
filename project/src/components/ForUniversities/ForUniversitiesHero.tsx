import React from 'react';
import { Building2, ArrowRight, TrendingUp, CheckCircle, Users } from 'lucide-react';

interface ForUniversitiesHeroProps {
  onButtonClick: () => void;
  onScheduleClick: () => void;
}

const ForUniversitiesHero: React.FC<ForUniversitiesHeroProps> = ({ onButtonClick, onScheduleClick }) => {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#05294E]/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#D0151C]/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-8 leading-tight">
            Increase Your International Enrollments with{' '}
            <span className="text-[#05294E]">Qualified Students</span>
            <br />
            <span className="text-2xl md:text-3xl lg:text-4xl font-normal text-slate-600">
              — No Fixed Costs & Exclusive AI Technology
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto mb-12 leading-relaxed">
            We connect your institution to thousands of candidates ready for enrollment in more than 50 countries. 
            Pay only for confirmed enrollments.
          </p>
          
          {/* Quick Highlights */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <TrendingUp className="h-5 w-5 text-[#D0151C]" />
              <span className="font-semibold text-slate-700">Up to <span className="text-[#D0151C] font-bold">+50%</span> international enrollments in 6 months</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <CheckCircle className="h-5 w-5 text-[#05294E]" />
              <span className="font-semibold text-slate-700"><span className="text-[#05294E] font-bold">85%</span> average conversion rate</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <Users className="h-5 w-5 text-[#D0151C]" />
              <span className="font-semibold text-slate-700">Up to <span className="text-[#D0151C] font-bold">70%</span> reduction in administrative costs</span>
            </div>
          </div>
          
          {/* Main CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button onClick={onButtonClick} className="group bg-gradient-to-r from-[#D0151C] to-[#B01218] text-white px-12 py-6 rounded-2xl text-xl font-bold hover:scale-105 transition-all duration-300 flex items-center justify-center shadow-lg">
              <Building2 className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
              I Want to Receive Qualified Students
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={onScheduleClick} className="group bg-transparent text-[#05294E] px-12 py-6 rounded-2xl text-xl font-bold hover:bg-[#05294E] hover:text-white transition-all duration-300 border-2 border-[#05294E] flex items-center justify-center">
              Schedule Your Meeting
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <CheckCircle className="h-5 w-5 text-[#05294E]" />
              <span className="font-semibold text-slate-700">500+ Partner Universities</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <TrendingUp className="h-5 w-5 text-[#D0151C]" />
              <span className="font-semibold text-slate-700">4.9/5 Rating</span>
            </div>
            <div className="flex items-center space-x-3 bg-slate-50 rounded-full px-6 py-3 border border-slate-200">
              <Users className="h-5 w-5 text-[#05294E]" />
              <span className="font-semibold text-slate-700">ISO 27001 Certified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesHero;
