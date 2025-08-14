import React from 'react';
import { Target, Globe, Users, CheckCircle, TrendingUp } from 'lucide-react';

const ForUniversitiesRecruitment: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Comprehensive <span className="text-[#05294E]">Student Recruitment</span> & Marketing
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Our proven marketing strategies and recruitment campaigns help universities reach qualified international students worldwide
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Left Side - Marketing Strategies */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center mr-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Targeted Marketing Campaigns</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Digital Marketing</h4>
                    <p className="text-slate-600 text-sm">Social media campaigns, Google Ads, and SEO optimization targeting international students</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Content Marketing</h4>
                    <p className="text-slate-600 text-sm">Educational content, student testimonials, and university spotlights</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Email Marketing</h4>
                    <p className="text-slate-600 text-sm">Personalized email campaigns and newsletter distribution</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-br from-[#D0151C] to-[#B01218] w-12 h-12 rounded-2xl flex items-center justify-center mr-4">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Global Student Network</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">50+ Countries</h4>
                    <p className="text-slate-600 text-sm">Active student network across major international markets</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">10,000+ Students</h4>
                    <p className="text-slate-600 text-sm">Qualified international students actively seeking opportunities</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Multi-Language Support</h4>
                    <p className="text-slate-600 text-sm">Content and support available in 15+ languages</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Side - Recruitment Process */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center mr-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Student Recruitment Process</h3>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-[#05294E] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Student Discovery</h4>
                    <p className="text-slate-600 text-sm">AI-powered matching and targeted marketing campaigns</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-[#D0151C] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Application Support</h4>
                    <p className="text-slate-600 text-sm">Guided application process with document verification</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-[#05294E] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">University Matching</h4>
                    <p className="text-slate-600 text-sm">Intelligent matching based on academic profile and preferences</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="bg-[#D0151C] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Enrollment Support</h4>
                    <p className="text-slate-600 text-sm">Ongoing support through visa process and arrival</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-3xl p-8 text-white">
              <div className="flex items-center mb-6">
                <TrendingUp className="h-8 w-8 mr-4" />
                <h3 className="text-2xl font-bold">Proven Results</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">85%</div>
                  <div className="text-sm opacity-90">Acceptance Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">3x</div>
                  <div className="text-sm opacity-90">Faster Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">95%</div>
                  <div className="text-sm opacity-90">Student Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">50%</div>
                  <div className="text-sm opacity-90">Cost Reduction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesRecruitment;
