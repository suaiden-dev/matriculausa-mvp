import React from 'react';
import { Target, Globe, Bot, Users, TrendingUp, ArrowRight } from 'lucide-react';

const ForUniversitiesProcess: React.FC = () => {
  const steps = [
    {
      number: "1",
      title: "Publish Opportunities",
      description: "Register courses and scholarships, defining admission criteria",
      icon: Target
    },
    {
      number: "2",
      title: "Global Promotion",
      description: "We promote to millions of qualified candidates ready to enroll",
      icon: Globe
    },
    {
      number: "3",
      title: "AI Filtering",
      description: "Our exclusive AI eliminates candidates outside your profile",
      icon: Bot
    },
    {
      number: "4",
      title: "Ready Leads Delivery",
      description: "Your team selects only the best students",
      icon: Users
    },
    {
      number: "5",
      title: "Continuous Optimization",
      description: "ROI reports and automatic adjustments to increase conversion",
      icon: TrendingUp
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            How It Works - <span className="text-[#05294E]">5 Simple Steps</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Our proven process makes international student recruitment simple, efficient, and results-driven
          </p>
        </div>
        
        {/* Process Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#05294E] to-[#D0151C] transform -translate-y-1/2 z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative">
                  {/* Step Number Circle */}
                  <div className="w-20 h-20 bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-black shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#05294E]/10 transition-colors duration-300">
                    <step.icon className="h-8 w-8 text-[#05294E] group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-[#05294E] transition-colors duration-300">
                    {step.title}
                  </h3>
                  
                  <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-3xl p-8 border border-slate-200 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Ready to Start Your Recruitment Journey?
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Join hundreds of universities already growing with our proven 5-step process
            </p>
            <button className="bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all duration-300 shadow-lg flex items-center mx-auto">
              Start My Free Trial
              <ArrowRight className="ml-3 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesProcess;
