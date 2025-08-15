import React from 'react';
import { ArrowRight } from 'lucide-react';

const ForUniversitiesProcess: React.FC = () => {
  const steps = [
    {
      number: "1",
      title: "Publish Opportunities",
      description: "Register courses and scholarships, defining admission criteria",
      imageAlt: "University administrator creating scholarship opportunity on MatriculaUSA platform",
      imagePlaceholder: "https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/step-by-step/scholarships_all.png",
      side: "left"
    },
    {
      number: "2", 
      title: "Global Promotion",
      description: "We promote to millions of qualified candidates ready to enroll",
      imageAlt: "Global network showing students from different countries accessing opportunities",
      imagePlaceholder: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800",
      side: "right"
    },
    {
      number: "3",
      title: "AI Filtering", 
      description: "Our exclusive AI eliminates candidates outside your profile",
      imageAlt: "AI system analyzing and filtering student applications automatically",
      imagePlaceholder: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800",
      side: "left"
    },
    {
      number: "4",
      title: "Ready Leads Delivery",
      description: "Your team selects only the best students",
      imageAlt: "University team reviewing pre-qualified student applications",
      imagePlaceholder: "https://images.pexels.com/photos/7688465/pexels-photo-7688465.jpeg?auto=compress&cs=tinysrgb&w=800",
      side: "right"
    },
    {
      number: "5",
      title: "Continuous Optimization",
      description: "ROI reports and automatic adjustments to increase conversion",
      imageAlt: "Analytics dashboard showing recruitment performance and ROI metrics",
      imagePlaceholder: "https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800",
      side: "left"
    }
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            How It Works - <span className="text-[#05294E]">5 Simple Steps</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Our proven process makes international student recruitment simple, efficient, and results-driven
          </p>
        </div>
        
        {/* Process Steps - Split Screen Layout with Timeline */}
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#05294E] via-slate-300 to-[#D0151C] transform -translate-x-1/2 z-0"></div>
          
          <div className="space-y-32">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`relative flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                  step.side === 'right' ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Timeline Node */}
                <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-white border-4 border-[#05294E] rounded-full shadow-lg">
                    <div className="w-full h-full bg-[#05294E] rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                  </div>
                </div>

                {/* Content Side */}
                <div className="flex-1 space-y-6">
                  {/* Step Number */}
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-[#05294E] text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
                      {step.number}
                    </div>
                    <div className="h-px bg-[#05294E] flex-1 max-w-20"></div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                    {step.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                    {step.description}
                  </p>
                </div>
                
                {/* Image Side */}
                <div className="flex-1">
                  <div className="relative group">
                    {/* Main Image Container */}
                    <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-slate-100">
                      <img
                        src={step.imagePlaceholder}
                        alt={step.imageAlt}
                        className="w-full h-80 md:h-96 object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://via.placeholder.com/600x400/${step.side === 'left' ? '05294E' : 'D0151C'}/ffffff?text=Step+${step.number}`;
                        }}
                      />
                      
                      {/* Overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    </div>
                    
                    {/* Floating Element */}
                    <div className={`absolute -bottom-6 ${step.side === 'left' ? '-right-6' : '-left-6'} bg-white rounded-2xl p-4 shadow-xl border border-slate-200 max-w-48`}>
                      <div className="text-sm font-semibold text-slate-900">
                        {step.title}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Automated Process
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Timeline Connection */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex items-center justify-center mt-16 mb-16">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-px h-12 bg-gradient-to-b from-[#05294E] to-slate-300"></div>
                      <div className="w-4 h-4 bg-[#05294E] rounded-full"></div>
                      <div className="w-px h-12 bg-gradient-to-b from-slate-300 to-[#D0151C]"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-24">
          <div className="bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-200 max-w-2xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Ready to Start Your Recruitment Journey?
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed text-lg">
              Join hundreds of universities already growing with our proven 5-step process
            </p>
            <button className="bg-[#05294E] hover:bg-[#D0151C] text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg flex items-center mx-auto group">
              Start My Free Trial
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesProcess;
