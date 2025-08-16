import React from 'react';

const ForUniversitiesGuarantee: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Modern Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#05294E]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-yellow-300/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#D0151C]/5 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6">
            <span className="text-[#05294E]">3 Months Free.</span><br />
            <span className="text-slate-600">Zero Risk.</span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-700 max-w-3xl mx-auto leading-tight">
            Experience the full platform — continue only if you love the results.
          </p>
        </div>
        
        {/* Modern Glass Cards Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Main Benefit Card */}
          <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 border border-white/50 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl font-black text-[#05294E] mb-4">100%</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Complete Access</h3>
              <p className="text-slate-600 leading-relaxed">
                Full platform, AI tools, automations, and dedicated support from day one.
              </p>
            </div>
          </div>
          
          {/* Support Card */}
          <div className="bg-gradient-to-br from-[#05294E] to-[#05294E]/80 rounded-3xl p-8 text-white shadow-2xl">
            <div className="text-center">
              <div className="text-6xl font-black text-yellow-300 mb-4">24/7</div>
              <h3 className="text-xl font-bold mb-3">Expert Support</h3>
              <p className="text-white/90 leading-relaxed">
                Dedicated specialists to ensure your success throughout the trial.
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 shadow-lg text-center">
            <div className="text-2xl font-black text-[#05294E] mb-2">$0</div>
            <p className="text-slate-700 font-semibold text-sm">Setup Cost</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 shadow-lg text-center">
            <div className="text-2xl font-black text-[#05294E] mb-2">AI</div>
            <p className="text-slate-700 font-semibold text-sm">Custom Training</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 shadow-lg text-center">
            <div className="text-2xl font-black text-[#D0151C] mb-2">1-Click</div>
            <p className="text-slate-700 font-semibold text-sm">Easy Exit</p>
          </div>
        </div>
        
        {/* Final Statement */}
        <div className="text-center">
          <div className="bg-slate-50/80 backdrop-blur-xl rounded-3xl p-6 max-w-3xl mx-auto border border-slate-200/50 shadow-lg">
            <p className="text-lg text-slate-800 leading-relaxed">
              We're so confident in our results, we're giving early partners 
              <span className="font-black text-[#05294E]"> complete free access</span>. 
              Experience the transformation first-hand, then decide.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesGuarantee;
