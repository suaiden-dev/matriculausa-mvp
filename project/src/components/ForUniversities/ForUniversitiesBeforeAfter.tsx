import React from 'react';
import { XCircle, CheckCircle, TrendingUp, Users, Clock, Target } from 'lucide-react';

const ForUniversitiesBeforeAfter: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            <span className="text-[#05294E]">BEFORE</span> vs <span className="text-[#D0151C]">AFTER</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            See the dramatic transformation in international student recruitment with MatriculaUSA
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          {/* BEFORE Column */}
          <div className="space-y-8">
            <div className="bg-red-50 rounded-3xl p-8 border-2 border-red-200">
              <div className="flex items-center mb-6">
                <XCircle className="h-8 w-8 text-red-500 mr-4" />
                <h3 className="text-2xl font-bold text-red-900">BEFORE - Traditional Problems</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">High Marketing Costs</h4>
                    <p className="text-red-700 text-sm">$50,000+ annually on international fairs and advertising</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">Poor Lead Quality</h4>
                    <p className="text-red-700 text-sm">80% of leads don't match university criteria</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">Slow Response Times</h4>
                    <p className="text-red-700 text-sm">3-5 days to respond to student inquiries</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">Low Conversion Rates</h4>
                    <p className="text-red-700 text-sm">Only 15% of leads convert to enrollments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900">Manual Processes</h4>
                    <p className="text-red-700 text-sm">Hours spent on repetitive administrative tasks</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* BEFORE Metrics */}
            <div className="bg-red-100 rounded-3xl p-8 border border-red-200">
              <h4 className="text-xl font-bold text-red-900 mb-6 text-center">Traditional Results</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">15%</div>
                  <div className="text-red-700 text-sm">Conversion Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">$50K+</div>
                  <div className="text-red-700 text-sm">Annual Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">3-5 days</div>
                  <div className="text-red-700 text-sm">Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">20%</div>
                  <div className="text-red-700 text-sm">Lead Quality</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* AFTER Column */}
          <div className="space-y-8">
            <div className="bg-green-50 rounded-3xl p-8 border-2 border-green-200">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
                <h3 className="text-2xl font-bold text-green-900">AFTER - MatriculaUSA Solutions</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900">Zero Marketing Costs</h4>
                    <p className="text-green-700 text-sm">Pay only for confirmed enrollments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900">Premium Lead Quality</h4>
                    <p className="text-green-700 text-sm">AI-filtered candidates matching your criteria</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900">Instant Responses</h4>
                    <p className="text-green-700 text-sm">24/7 AI-powered student support</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900">High Conversion Rates</h4>
                    <p className="text-green-700 text-sm">85%+ of leads convert to enrollments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-green-900">Fully Automated</h4>
                    <p className="text-green-700 text-sm">AI handles repetitive tasks automatically</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AFTER Metrics */}
            <div className="bg-green-100 rounded-3xl p-8 border border-green-200">
              <h4 className="text-xl font-bold text-green-900 mb-6 text-center">MatriculaUSA Results</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">85%</div>
                  <div className="text-green-700 text-sm">Conversion Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">$0</div>
                  <div className="text-green-700 text-sm">Setup Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
                  <div className="text-green-700 text-sm">Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">95%</div>
                  <div className="text-green-700 text-sm">Lead Quality</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Transformation Summary */}
        <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-3xl p-8 text-white text-center">
          <h3 className="text-3xl font-bold mb-6">The Transformation Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-yellow-300">5.7x</div>
              <div className="text-sm opacity-90">Higher Conversion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-yellow-300">100%</div>
              <div className="text-sm opacity-90">Cost Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-yellow-300">∞</div>
              <div className="text-sm opacity-90">Faster Response Time</div>
            </div>
          </div>
          <p className="text-lg mt-8 opacity-90">
            Join hundreds of universities that have already transformed their international student recruitment
          </p>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesBeforeAfter;
