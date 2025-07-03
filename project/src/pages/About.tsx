import React from 'react';
import { Zap, Globe, Award, Users, Heart, BookOpen, CheckCircle, Sparkles } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-[#05294E] text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img src="/logo.png.png" alt="MatriculaUSA Logo" className="mx-auto h-16 mb-6 bg-white rounded-2xl shadow-lg p-2" />
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-white">Empowering International Education</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              MatriculaUSA is the leading digital platform connecting international students to American universities, scholarships, and life-changing opportunities. We simplify the journey to study in the United States with technology, expert guidance, and a student-first approach.
            </p>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#05294E]">Our Mission</h3>
              <p className="text-slate-700">To democratize access to U.S. higher education for talented students worldwide, providing a seamless, transparent, and supportive experience from application to enrollment.</p>
            </div>
            <div>
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#D0151C]">Our Vision</h3>
              <p className="text-slate-700">To be the most trusted global bridge between international students and American universities, fostering diversity, opportunity, and academic excellence.</p>
            </div>
            <div>
              <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-green-700">Our Values</h3>
              <p className="text-slate-700">Integrity, inclusion, innovation, and a relentless commitment to student success guide every decision we make.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story & Impact */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
                <Sparkles className="h-4 w-4 mr-2 text-[#05294E]" />
              <span className="text-sm font-bold text-slate-700">Our Story</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">
              Transforming Dreams into Reality
              </h2>
            <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
                <p>
                MatriculaUSA was founded by international education specialists who understand the unique challenges faced by students seeking to study in the United States. Our team has helped thousands of students from diverse backgrounds secure scholarships, admissions, and a smooth transition to American campus life.
                </p>
                <p>
                We partner with top U.S. universities and organizations to offer exclusive opportunities, transparent processes, and ongoing support—making the American dream accessible to all.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="bg-[#05294E]/10 p-6 rounded-2xl border border-[#05294E]/20 text-center">
                <div className="text-3xl font-black text-[#05294E] mb-2">$50M+</div>
                <div className="text-sm font-medium text-slate-700">in Scholarships Awarded</div>
              </div>
              <div className="bg-[#D0151C]/10 p-6 rounded-2xl border border-[#D0151C]/20 text-center">
                <div className="text-3xl font-black text-[#D0151C] mb-2">5,000+</div>
                <div className="text-sm font-medium text-slate-700">Students Supported</div>
              </div>
            </div>
          </div>
          <div className="lg:pl-12">
            <img
              src="https://images.unsplash.com/photo-1557064349-d835670beb60?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="International student with USA flag"
              className="rounded-3xl shadow-2xl w-full"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              How <span className="text-[#D0151C]">MatriculaUSA</span> Works
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We make the U.S. college application process simple, transparent, and student-friendly.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-4 text-[#05294E]" />
              <h3 className="font-bold text-lg mb-2">1. Explore</h3>
              <p className="text-slate-600">Browse partner universities and scholarship opportunities tailored to your profile.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <Users className="h-10 w-10 mx-auto mb-4 text-[#D0151C]" />
              <h3 className="font-bold text-lg mb-2">2. Apply</h3>
              <p className="text-slate-600">Submit your application and required documents through our secure digital platform.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <Award className="h-10 w-10 mx-auto mb-4 text-green-600" />
              <h3 className="font-bold text-lg mb-2">3. Get Matched</h3>
              <p className="text-slate-600">Our team and technology connect you with the best-fit universities and scholarships.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <CheckCircle className="h-10 w-10 mx-auto mb-4 text-[#05294E]" />
              <h3 className="font-bold text-lg mb-2">4. Succeed</h3>
              <p className="text-slate-600">Receive guidance on visa, enrollment, and your transition to U.S. campus life.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-[#05294E] mb-6">Ready to Start Your Journey?</h2>
          <p className="text-xl text-slate-700 mb-8">Join thousands of students who have made their American dream a reality with MatriculaUSA.</p>
          <a href="/register" className="inline-block bg-[#D0151C] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-[#B01218] transition-all duration-300">Get Started</a>
        </div>
      </section>
    </div>
  );
};

export default About;