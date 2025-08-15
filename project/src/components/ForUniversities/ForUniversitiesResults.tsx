import React from 'react';
import { XCircle, CheckCircle, TrendingUp, Users, Clock, Target } from 'lucide-react';

const ForUniversitiesResults: React.FC = () => {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            <span className="text-[#05294E]">Proven Results</span> Across All Partner Universities
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            See the dramatic transformation in international student recruitment with MatriculaUSA
          </p>
        </div>
        
        {/* Before vs After Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          {/* BEFORE Column */}
          <div className="space-y-8">
            <div className="bg-slate-100 rounded-3xl p-8 border-2 border-slate-300">
              <div className="flex items-center mb-6">
                <XCircle className="h-8 w-8 text-slate-600 mr-4" />
                <h3 className="text-2xl font-bold text-slate-800">BEFORE - Traditional Problems</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-slate-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800">High Marketing Costs</h4>
                    <p className="text-slate-600 text-sm">$50,000+ annually on international fairs and advertising</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-slate-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800">Poor Lead Quality</h4>
                    <p className="text-slate-600 text-sm">80% of leads don't match university criteria</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-slate-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800">Slow Response Times</h4>
                    <p className="text-slate-600 text-sm">3-5 days to respond to student inquiries</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-slate-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-800">Low Conversion Rates</h4>
                    <p className="text-slate-600 text-sm">Only 15% of leads convert to enrollments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* AFTER Column */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 border-2 border-[#05294E] shadow-lg">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-8 w-8 text-[#05294E] mr-4" />
                <h3 className="text-2xl font-bold text-[#05294E]">AFTER - MatriculaUSA Solutions</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#05294E] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Zero Marketing Costs</h4>
                    <p className="text-slate-700 text-sm">Pay only for confirmed enrollments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#05294E] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Premium Lead Quality</h4>
                    <p className="text-slate-700 text-sm">AI-filtered candidates matching your criteria</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#05294E] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Instant Responses</h4>
                    <p className="text-slate-700 text-sm">24/7 AI-powered student support</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-[#05294E] mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">High Conversion Rates</h4>
                    <p className="text-slate-700 text-sm">85%+ of leads convert to enrollments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesResults;
