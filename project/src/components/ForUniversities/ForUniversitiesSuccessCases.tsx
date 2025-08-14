import React from 'react';
import { Star, TrendingUp, Users, Award, CheckCircle, Building2, Globe } from 'lucide-react';

const ForUniversitiesSuccessCases: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            Universities Already Growing with <span className="text-[#05294E]">MatriculaUSA</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            See how our partner universities are filling their classes with MatriculaUSA
          </p>
        </div>
        
        {/* Partner Logos */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-16">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 flex items-center justify-center">
              <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Success Cases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Case 1 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center mr-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">+15 International Enrollments</h3>
                <p className="text-slate-600 text-sm">in 12 months</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-700 text-sm">500% ROI without marketing investment</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-700 text-sm">35% higher conversion rate</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-slate-700 italic text-sm">
                "MatriculaUSA was the fastest and most efficient channel for international students."
              </p>
              <p className="text-slate-600 text-xs mt-2 font-semibold">— Admissions Director</p>
            </div>
          </div>
          
          {/* Case 2 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-[#D0151C] to-[#B01218] w-12 h-12 rounded-2xl flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">100% Scholarships Filled</h3>
                <p className="text-slate-600 text-sm">in 2 months</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-700 text-sm">35% higher conversion than previous channel</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-700 text-sm">Qualified students only</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-slate-700 italic text-sm">
                "We saved time and captured much more qualified students."
              </p>
              <p className="text-slate-600 text-xs mt-2 font-semibold">— Recruitment Coordinator</p>
            </div>
          </div>
          
          {/* Case 3 */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center mr-4">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Global Reach</h3>
                <p className="text-slate-600 text-sm">in 6 months</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-700 text-sm">Students from 25+ countries</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-slate-700 text-sm">Diverse cultural backgrounds</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-slate-700 italic text-sm">
                "Our international diversity increased significantly with MatriculaUSA."
              </p>
              <p className="text-slate-600 text-xs mt-2 font-semibold">— International Office</p>
            </div>
          </div>
        </div>
        
        {/* General Metrics */}
        <div className="bg-gradient-to-br from-[#05294E] to-[#D0151C] rounded-3xl p-8 text-white mb-12">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4">Overall Platform Results</h3>
            <p className="text-xl opacity-90">Proven success across all partner universities</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">85%</div>
              <div className="text-sm opacity-90">Average Acceptance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">3.2x</div>
              <div className="text-sm opacity-90">Faster Processing</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">92%</div>
              <div className="text-sm opacity-90">Student Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">45%</div>
              <div className="text-sm opacity-90">Cost Reduction</div>
            </div>
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center">
          <button className="bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-bold hover:scale-105 transition-all duration-300 shadow-2xl">
            Join Our Success Stories
          </button>
        </div>
      </div>
    </section>
  );
};

export default ForUniversitiesSuccessCases;
