import React from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Brain, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Target, 
  Shield, 
  Award, 
  Clock, 
  Users,
  FileText,
  Search,
  Heart,
  Star,
  TrendingUp,
  Rocket,
  BookOpen,
  DollarSign
} from 'lucide-react';

const HowItWorks: React.FC = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-8">
              <Sparkles className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium text-white">Revolutionary Process</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-white">
                How It
              </span>
              <br />
              <span className="text-[#D0151C]">Works</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-200 max-w-4xl mx-auto leading-relaxed">
              Discover how our AI-powered platform transforms your educational dreams into reality 
              through a simple, intelligent, and comprehensive process designed for international students.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 mt-12 text-slate-300">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Clock className="h-5 w-5 mr-2 text-green-400" />
                <span className="text-sm font-medium">5 Minutes Setup</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <TrendingUp className="h-5 w-5 mr-2 text-yellow-400" />
                <span className="text-sm font-medium">95% Success Rate</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Shield className="h-5 w-5 mr-2 text-blue-400" />
                <span className="text-sm font-medium">100% Secure</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Process Steps */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-white rounded-full px-6 py-2 mb-6 shadow-lg border border-slate-200">
              <Target className="h-4 w-4 mr-2 text-[#05294E]" />
              <span className="text-sm font-bold text-slate-700">Simple 3-Step Process</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Your Journey to
              <br />
              <span className="text-[#05294E]">Academic Excellence</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From profile creation to university enrollment, we guide you through every step with cutting-edge technology and personalized support.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="relative group">
              <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200 group-hover:-translate-y-2">
                <div className="absolute -top-6 left-8">
                  <div className="bg-[#05294E] w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-black text-white">1</span>
                  </div>
                </div>
                
                <div className="pt-8">
                  <div className="bg-[#05294E]/10 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <User className="h-10 w-10 text-[#05294E]" />
                  </div>
                  
                  <h3 className="text-3xl font-black text-slate-900 mb-6">Create Your Smart Profile</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-8">
                    Build a comprehensive academic profile using our intelligent form system. Our AI analyzes your background, achievements, and goals to create a unique student fingerprint.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Academic history & achievements</span>
                    </div>
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Career goals & preferences</span>
                    </div>
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Financial requirements</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Connector Arrow */}
              <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                <ArrowRight className="h-8 w-8 text-[#05294E]" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200 group-hover:-translate-y-2">
                <div className="absolute -top-6 left-8">
                  <div className="bg-[#D0151C] w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-black text-white">2</span>
                  </div>
                </div>
                
                <div className="pt-8">
                  <div className="bg-[#D0151C]/10 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <Brain className="h-10 w-10 text-[#D0151C]" />
                  </div>
                  
                  <h3 className="text-3xl font-black text-slate-900 mb-6">AI-Powered Matching</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-8">
                    Our advanced machine learning algorithms instantly analyze thousands of scholarship opportunities and university programs to find your perfect matches.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Personalized scholarship matches</span>
                    </div>
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">University program recommendations</span>
                    </div>
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Exclusive opportunity access</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Connector Arrow */}
              <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                <ArrowRight className="h-8 w-8 text-[#D0151C]" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200 group-hover:-translate-y-2">
                <div className="absolute -top-6 left-8">
                  <div className="bg-green-600 w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl font-black text-white">3</span>
                  </div>
                </div>
                
                <div className="pt-8">
                  <div className="bg-green-100 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <Rocket className="h-10 w-10 text-green-600" />
                  </div>
                  
                  <h3 className="text-3xl font-black text-slate-900 mb-6">Apply & Succeed</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-8">
                    Submit applications with confidence using our guided process. Receive comprehensive support from application to visa processing and enrollment.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Guided application process</span>
                    </div>
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Legal & visa support</span>
                    </div>
                    <div className="flex items-center text-slate-700">
                      <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                      <span className="font-medium">Enrollment assistance</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Process Flow */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Behind the <span className="text-[#D0151C]">Technology</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Discover the advanced features and intelligent systems that power your success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-[#05294E] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Search className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Smart Discovery</h3>
              <p className="text-slate-600 leading-relaxed">
                Our AI scans thousands of opportunities daily, finding hidden scholarships that match your unique profile.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-[#D0151C] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Document Management</h3>
              <p className="text-slate-600 leading-relaxed">
                Secure cloud storage and intelligent organization of all your academic documents and applications.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-green-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <Heart className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Personal Support</h3>
              <p className="text-slate-600 leading-relaxed">
                Dedicated counselors and AI assistants provide 24/7 support throughout your entire journey.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-purple-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <TrendingUp className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Success Tracking</h3>
              <p className="text-slate-600 leading-relaxed">
                Real-time analytics and progress tracking to optimize your application success rate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Preview */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center bg-white rounded-full px-6 py-2 mb-6 shadow-lg border border-slate-200">
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                <span className="text-sm font-bold text-slate-700">Success Stories</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">
                Real Results from
                <br />
                <span className="text-[#05294E]">Real Students</span>
              </h2>
              
              <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                  <div className="flex items-center mb-4">
                    <img
                      src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                      alt="Maria Silva"
                      className="w-12 h-12 rounded-xl mr-4"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Maria Silva</div>
                      <div className="text-sm text-[#05294E] font-medium">MIT, Computer Science</div>
                    </div>
                  </div>
                  <p className="text-slate-700 italic">
                    "The AI matching found me a full scholarship I never would have discovered. The process was seamless!"
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                  <div className="flex items-center mb-4">
                    <img
                      src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                      alt="Carlos Rodriguez"
                      className="w-12 h-12 rounded-xl mr-4"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Carlos Rodriguez</div>
                      <div className="text-sm text-[#D0151C] font-medium">Harvard, MBA</div>
                    </div>
                  </div>
                  <p className="text-slate-700 italic">
                    "From application to visa approval in just 3 months. The support team was incredible!"
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                alt="Students celebrating"
                className="rounded-3xl shadow-2xl w-full"
              />
              
              {/* Floating Stats */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
                <div className="text-center">
                  <div className="text-3xl font-black text-[#05294E] mb-2">95%</div>
                  <div className="text-sm font-medium text-slate-600">Success Rate</div>
                </div>
              </div>
              
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
                <div className="text-center">
                  <div className="text-3xl font-black text-[#D0151C] mb-2">$50M+</div>
                  <div className="text-sm font-medium text-slate-600">Secured</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Frequently Asked <span className="text-[#05294E]">Questions</span>
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need to know about our revolutionary platform
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">How long does the entire process take?</h3>
              <p className="text-slate-600 leading-relaxed">
                The initial profile setup takes just 5 minutes. Our AI provides instant matches, and most students receive scholarship offers within 2-4 weeks. The complete process from application to enrollment typically takes 3-6 months.
              </p>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">What makes your AI matching different?</h3>
              <p className="text-slate-600 leading-relaxed">
                Our proprietary algorithm analyzes over 200 data points including academic performance, extracurricular activities, career goals, and personal preferences. It continuously learns from successful placements to improve match accuracy.
              </p>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Is there a cost to use the platform?</h3>
              <p className="text-slate-600 leading-relaxed">
                Basic access is free and includes standard scholarship matching. Premium membership unlocks exclusive opportunities, personalized counseling, and comprehensive application support with a 95% success guarantee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#05294E] text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D0151C]/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-8">
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Ready to Start?</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Begin Your Journey to
            <br />
            <span className="text-[#D0151C]">Academic Success</span>
          </h2>
          
          <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Join thousands of international students who have transformed their educational dreams into reality through our revolutionary platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/register"
              className="group bg-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
            >
              Create Your Profile Now
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/scholarships"
              className="group bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-white hover:text-[#05294E] transition-all duration-300 flex items-center justify-center"
            >
              <BookOpen className="mr-3 h-6 w-6" />
              Explore Scholarships
            </Link>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 mt-12 text-slate-300">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-400" />
              <span className="text-sm font-medium">5,000+ Students</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-yellow-400" />
              <span className="text-sm font-medium">$50M+ Secured</span>
            </div>
            <div className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-[#D0151C]" />
              <span className="text-sm font-medium">95% Success Rate</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;