import React from 'react';
import { Target, Eye, Heart, Users, Award, Globe, Zap, Shield, TrendingUp, Sparkles, CheckCircle, Star } from 'lucide-react';

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
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-8">
              <Sparkles className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium text-white">Revolutionizing International Education</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-white">
                About
              </span>
              <br />
              <span className="text-[#D0151C]">Matrícula USA</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-200 max-w-4xl mx-auto leading-relaxed">
              We are the next-generation SaaS platform bridging the gap between international students and American educational opportunities through cutting-edge technology and personalized support.
            </p>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Our <span className="text-[#05294E]">Foundation</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Built on principles that drive innovation and student success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="bg-[#05294E] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Target className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Our Mission</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                To democratize access to American higher education by connecting qualified international students with universities and scholarship opportunities through revolutionary technology and comprehensive support.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-[#D0151C] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Eye className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Our Vision</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                To become the leading global platform for international education, creating a world where talented students can access quality education regardless of their geographic or economic background.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-green-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Heart className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Our Values</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                Excellence, integrity, and inclusivity guide everything we do. We believe in transparency, student-first approach, and building lasting partnerships with educational institutions worldwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
                <Sparkles className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-slate-700">Our Journey</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">
                Innovation Born from <span className="text-[#D0151C]">Experience</span>
              </h2>
              
              <div className="space-y-6 text-slate-600 text-lg leading-relaxed">
                <p>
                  Founded in 2020 by a team of international education experts and former international students, Matrícula USA was born from the recognition that talented students worldwide face significant barriers in accessing American higher education.
                </p>
                <p>
                  Having experienced these challenges firsthand, our founders set out to create a comprehensive SaaS platform that would not only connect students with opportunities but also provide the AI-powered support and guidance needed to navigate the complex process of studying abroad.
                </p>
                <p>
                  Today, we have revolutionized the industry by helping over 5,000 international students secure more than $50 million in scholarships, partnering with 150+ American institutions to create exclusive opportunities for our global community.
                </p>
              </div>
              
              {/* Key Achievements */}
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="bg-[#05294E]/10 p-6 rounded-2xl border border-[#05294E]/20">
                  <div className="text-3xl font-black text-[#05294E] mb-2">2020</div>
                  <div className="text-sm font-medium text-slate-700">Platform Launch</div>
                </div>
                <div className="bg-[#D0151C]/10 p-6 rounded-2xl border border-[#D0151C]/20">
                  <div className="text-3xl font-black text-[#D0151C] mb-2">AI</div>
                  <div className="text-sm font-medium text-slate-700">Powered Matching</div>
                </div>
              </div>
            </div>
            
            <div className="lg:pl-12">
              <div className="relative">
                <img
                  src="https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Team collaboration"
                  className="rounded-3xl shadow-2xl w-full"
                />
                <div className="absolute -bottom-6 -right-6 bg-[#05294E] p-6 rounded-2xl shadow-2xl">
                  <div className="text-white text-center">
                    <div className="text-2xl font-black">5K+</div>
                    <div className="text-sm font-medium">Students Helped</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Powered by <span className="text-[#05294E]">Technology</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our cutting-edge SaaS platform leverages AI and machine learning to deliver unprecedented results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200 group hover:-translate-y-2">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">AI Matching</h3>
              <p className="text-slate-600">Advanced algorithms that match students with perfect scholarship opportunities</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200 group hover:-translate-y-2">
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Secure Platform</h3>
              <p className="text-slate-600">Enterprise-grade security protecting student data and applications</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200 group hover:-translate-y-2">
              <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Real-time Analytics</h3>
              <p className="text-slate-600">Live tracking and insights for application progress and success rates</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200 group hover:-translate-y-2">
              <div className="bg-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Global Network</h3>
              <p className="text-slate-600">Connected ecosystem of universities, students, and education partners</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Meet Our <span className="text-[#D0151C]">Team</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Passionate professionals and former international students dedicated to your educational success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-[#05294E]/5 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 text-center group border border-[#05294E]/10">
              <div className="relative mb-8">
                <img
                  src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
                  alt="John Smith"
                  className="w-32 h-32 rounded-3xl mx-auto shadow-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">John Smith</h3>
              <p className="text-[#05294E] font-bold mb-4">CEO & Founder</p>
              <p className="text-slate-600 leading-relaxed">
                Former international student with 15+ years in educational consulting and SaaS technology. MIT alumnus passionate about democratizing education.
              </p>
            </div>

            <div className="bg-[#D0151C]/5 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 text-center group border border-[#D0151C]/10">
              <div className="relative mb-8">
                <img
                  src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
                  alt="Maria Rodriguez"
                  className="w-32 h-32 rounded-3xl mx-auto shadow-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#D0151C] w-8 h-8 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Maria Rodriguez</h3>
              <p className="text-[#D0151C] font-bold mb-4">Head of Student Success</p>
              <p className="text-slate-600 leading-relaxed">
                PhD in International Education with expertise in student counseling and AI-powered support services. Stanford graduate with a passion for student success.
              </p>
            </div>

            <div className="bg-green-50 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 text-center group border border-green-100">
              <div className="relative mb-8">
                <img
                  src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1"
                  alt="David Chen"
                  className="w-32 h-32 rounded-3xl mx-auto shadow-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-2 -right-2 bg-green-600 w-8 h-8 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">David Chen</h3>
              <p className="text-green-600 font-bold mb-4">Chief Technology Officer</p>
              <p className="text-slate-600 leading-relaxed">
                Software engineer and EdTech expert focused on creating seamless user experiences through cutting-edge AI and machine learning technologies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-24 bg-[#05294E] text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D0151C]/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Our <span className="text-[#D0151C]">Impact</span>
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Transforming international education through technology and innovation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-white/10 backdrop-blur-sm w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/20">
                <Users className="h-10 w-10" />
              </div>
              <div className="text-4xl font-black mb-2">5,000+</div>
              <div className="text-blue-100 font-medium">Students Transformed</div>
            </div>

            <div className="text-center group">
              <div className="bg-white/10 backdrop-blur-sm w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/20">
                <Award className="h-10 w-10" />
              </div>
              <div className="text-4xl font-black mb-2">$50M+</div>
              <div className="text-blue-100 font-medium">Scholarships Secured</div>
            </div>

            <div className="text-center group">
              <div className="bg-white/10 backdrop-blur-sm w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/20">
                <Globe className="h-10 w-10" />
              </div>
              <div className="text-4xl font-black mb-2">150+</div>
              <div className="text-blue-100 font-medium">Elite Universities</div>
            </div>

            <div className="text-center group">
              <div className="bg-white/10 backdrop-blur-sm w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/20">
                <TrendingUp className="h-10 w-10" />
              </div>
              <div className="text-4xl font-black mb-2">95%</div>
              <div className="text-blue-100 font-medium">Success Rate</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;