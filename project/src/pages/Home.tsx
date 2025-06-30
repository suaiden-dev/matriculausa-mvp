import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Globe, Users, Award, ArrowRight, CheckCircle, Star, BookOpen, Zap, Shield, TrendingUp, Sparkles, DollarSign, Play, ChevronRight, Heart, Brain, Rocket, Clock, CreditCard, MapPin } from 'lucide-react';
import { useUniversities } from '../hooks/useUniversities';
import { StripeCheckout } from '../components/StripeCheckout';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
import WhatsAppFloatingButton from '../components/WhatsAppFloatingButton';

const Home: React.FC = () => {
  const { universities, loading: universitiesLoading } = useUniversities();
  const featuredSchools = universities.slice(0, 6);
  const { isAuthenticated } = useAuth();
  const { hasPaidProcess, loading: subscriptionLoading } = useSubscription();

  return (
    <div className="bg-white">
      {/* Hero Section - Following Figma structure */}
      <section className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-red-50 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[#05294E]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#D0151C]/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 mb-8 border border-[#05294E]/20 shadow-lg">
                <Sparkles className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-slate-700">Scholarships Platform</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight text-slate-900">
                Your Gateway to
                <br />
                <span className="text-[#05294E]">
                  American Education
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl mb-10 text-slate-600 leading-relaxed max-w-2xl">
                MatriculaUSA connects international students with English schools and universities across the United States, 
                offering exclusive scholarships and streamlined enrollment processes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  to="/register"
                  className={`group bg-[#D0151C] text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center ${isAuthenticated ? 'hidden' : ''}`}
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                
                {isAuthenticated && !hasPaidProcess && (
                  <StripeCheckout 
                    feeType="selection_process"
                    paymentType="selection_process"
                    productId="SELECTION_PROCESS"
                    buttonText="Start Selection Process"
                    className="group px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center"
                    onError={(error) => console.error('Checkout error:', error)}
                    successUrl={`${window.location.origin}/student/dashboard/selection-process-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                    cancelUrl={`${window.location.origin}/student/dashboard/selection-process-fee-error`}
                  />
                )}
                
                {isAuthenticated && hasPaidProcess && (
                  <Link
                    to="/student/dashboard"
                    className="group bg-green-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
                
                <Link
                  to="/scholarships"
                  className="group bg-white border-2 border-[#05294E] text-[#05294E] px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#05294E] hover:text-white transition-all duration-300 flex items-center justify-center shadow-lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  View Scholarships
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-8 text-slate-500">
                <div className="flex items-center">
                  <div className="flex -space-x-2 mr-3">
                    <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1" alt="" />
                    <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1" alt="" />
                    <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1" alt="" />
                  </div>
                  <span className="text-sm font-medium">5,000+ students enrolled</span>
                </div>
                <div className="flex items-center">
                  <div className="flex mr-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm font-medium">4.9/5 rating</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative">
              <div className="relative bg-[#05294E] rounded-3xl p-8 shadow-2xl">
                <img
                  src="/47458.jpg"
                  alt="Students studying"
                  className="rounded-2xl w-full h-96 object-cover"
                />
                
                {/* Floating Cards */}
                <div className="absolute -top-4 -left-4 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-xl">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">95% Success Rate</div>
                      <div className="text-sm text-slate-500">Student enrollment</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#05294E]/10 p-2 rounded-xl">
                      <DollarSign className="h-6 w-6 text-[#05294E]" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">$50M+</div>
                      <div className="text-sm text-slate-500">In scholarships</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {/* Removed as per instructions */}

      {/* Featured Schools Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
              <GraduationCap className="h-4 w-4 mr-2 text-[#05294E]" />
              <span className="text-sm font-bold text-slate-700">Partner Universities</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Featured <span className="text-[#05294E]">Universities</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Discover world-class American institutions offering exceptional education and exclusive scholarship opportunities for international students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredSchools.map((school) => (
              <div key={school.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full min-h-[480px]">
                {/* University Image */}
                <div className="relative h-48 overflow-hidden flex-shrink-0">
                  <img
                    src={school.image || school.logo_url || '/university-placeholder.png'}
                    alt={`${school.name} campus`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Type Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold text-white shadow-lg ${
                      school.type === 'Private' ? 'bg-[#05294E]' : 'bg-green-600'
                    }`}>
                      {school.type || (school.is_public ? 'Public' : 'Private')}
                    </span>
                  </div>
                  
                  {/* Ranking Badge */}
                  {school.ranking && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-yellow-500 text-black px-3 py-1 rounded-xl text-xs font-bold shadow-lg">
                        #{school.ranking}
                      </span>
                    </div>
                  )}
                </div>

                {/* University Info */}
                <div className="flex flex-col flex-1 p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
                    {school.name}
                  </h3>
                  
                  {/* Location */}
                  <div className="flex items-center text-slate-600 mb-4">
                    <MapPin className="h-4 w-4 mr-2 text-[#05294E]" />
                    <span className="text-sm">{school.location}</span>
                  </div>

                  {/* Programs Preview */}
                  <div className="mb-6 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {school.programs && school.programs.length > 0 ? (
                        <>
                          {school.programs.slice(0, 3).map((program: string, index: number) => (
                            <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                              {program}
                            </span>
                          ))}
                          {school.programs.length > 3 && (
                            <span className="bg-[#05294E]/10 text-[#05294E] px-2 py-1 rounded-lg text-xs font-medium">
                              +{school.programs.length - 3} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                          No program info
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Learn More Button alinhado na base */}
                  <div className="mt-auto">
                    <Link
                      to={`/schools/${school.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                      className="w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-3 px-4 rounded-2xl hover:from-[#05294E]/90 hover:to-slate-600 transition-all duration-300 font-bold text-sm flex items-center justify-center group-hover:shadow-xl transform group-hover:scale-105"
                    >
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All Schools Button */}
          <div className="text-center">
            <Link
              to="/schools"
              className="inline-flex items-center bg-white border-2 border-[#05294E] text-[#05294E] px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <GraduationCap className="mr-3 h-5 w-5" />
              View All Universities
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-white rounded-full px-6 py-2 mb-6 shadow-lg border border-slate-200">
              <span className="text-sm font-bold text-slate-700">Why Choose MatriculaUSA</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Simplifying International
              <br />
              <span className="text-[#05294E]">Student Enrollment</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Our platform bridges the gap between international students and American educational institutions, 
              making the enrollment process seamless and accessible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-white p-8 rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Global Network</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Access to a comprehensive network of English schools and universities across the United States, 
                carefully vetted for quality and international student support.
              </p>
              <Link to="/schools" className="inline-flex items-center text-[#05294E] font-bold hover:text-[#05294E]/80 transition-colors">
                Explore Schools <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="group bg-white p-8 rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200">
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Exclusive Scholarships</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Unlock exclusive scholarship opportunities available only through our platform, 
                designed specifically for international students seeking American education.
              </p>
              <Link to="/scholarships" className="inline-flex items-center text-[#D0151C] font-bold hover:text-[#D0151C]/80 transition-colors">
                View Scholarships <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="group bg-white p-8 rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200">
              <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Complete Support</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                From initial application to enrollment completion, our dedicated team provides comprehensive support 
                throughout your entire educational journey.
              </p>
              <Link to="/how-it-works" className="inline-flex items-center text-green-600 font-bold hover:text-green-700 transition-colors">
                Learn More <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
                <Rocket className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-slate-700">Simple Process</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">
                Three Steps to Your
                <br />
                <span className="text-[#D0151C]">American Education</span>
              </h2>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-[#05294E] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-lg font-black text-white">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Create Your Profile</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Build your comprehensive student profile with academic history, goals, and preferences to help us find the perfect match.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-lg font-black text-white">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Discover Opportunities</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Browse through our curated selection of schools and exclusive scholarship opportunities tailored to your profile and interests.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-green-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-lg font-black text-white">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Complete Enrollment</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Apply with our streamlined process and receive comprehensive support until you're successfully enrolled in your chosen institution.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://images.pexels.com/photos/1595391/pexels-photo-1595391.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                alt="Student success"
                className="rounded-3xl shadow-2xl w-full"
              />
              
              {/* Floating Success Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Enrollment Confirmed!</div>
                    <div className="text-sm text-slate-500">Harvard University</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Success <span className="text-[#05294E]">Stories</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Real students, real results. See how MatriculaUSA transformed their educational journey to the United States.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "MatriculaUSA made my dream of studying in America a reality. The scholarship opportunities and support were incredible!"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Maria Silva"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Maria Silva</div>
                  <div className="text-sm text-[#05294E] font-medium">MIT, Computer Science</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "The enrollment process was seamless. From application to visa support, MatriculaUSA guided me every step of the way."
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Carlos Rodriguez"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Carlos Rodriguez</div>
                  <div className="text-sm text-[#D0151C] font-medium">Harvard Business School</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 text-lg leading-relaxed">
                "I found exclusive scholarships that weren't available anywhere else. MatriculaUSA truly opens doors to opportunities."
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt="Ana Chen"
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">Ana Chen</div>
                  <div className="text-sm text-green-600 font-medium">Stanford Engineering</div>
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
            <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
              <BookOpen className="h-4 w-4 mr-2 text-[#05294E]" />
              <span className="text-sm font-bold text-slate-700">Frequently Asked Questions</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Everything You Need to <span className="text-[#05294E]">Know</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Get answers to the most common questions about fees, payments, and the application process at MatriculaUSA.
            </p>
          </div>
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                What fees or payments are required to use MatriculaUSA?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                MatriculaUSA is free to create your profile and explore universities. However, once you start the application process and are approved for a scholarship, all fees associated with the admission and enrollment flow become mandatory. They are clearly presented before any payment.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#D0151C] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                What is the Selection Process Fee?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                The Selection Process Fee (US$350) is the first mandatory payment on the MatriculaUSA platform. It unlocks your full access to view all scholarships and start your application process.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-green-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Award className="h-4 w-4 text-white" />
                </div>
                What is the Scholarship Fee?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                The Scholarship Fee (US$550) is charged when you proceed with applications for exclusive scholarships through MatriculaUSA. This fee covers processing costs and personalized support for your scholarship applications.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-yellow-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                What is the University Enrollment Fee?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                The University Enrollment Fee (US$350) is a payment required by some universities to formally process your enrollment after you have been accepted. This amount confirms your intention to enroll and is managed directly by the platform.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-purple-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                What is the I-20 Control Fee?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                The I-20 Control Fee (US$900) is a mandatory payment for students who need to obtain the I-20 form, essential for applying for the F-1 student visa. This fee ensures fast and accurate processing of your visa documents.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                Are there any other fees I should be aware of?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                All mandatory fees for your application and enrollment process are listed in your dashboard before any payment. Some universities may have additional fees (e.g., housing deposits, orientation fees), but these will always be communicated directly by the university or by us in advance.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-green-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                How can I pay these fees?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                You can pay all fees directly through the MatriculaUSA platform using international credit or debit cards. Payments are securely processed via Stripe, and you will receive a confirmation for each transaction.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                Is my payment information secure?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                Yes. All payments are processed by Stripe, a global leader in payment security. MatriculaUSA does not store your card details, and all transactions are encrypted for your protection.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-yellow-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                Can I get a refund?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                You are entitled to a full refund of fees paid if your application is not successful or you are not approved for a scholarship. However, if you withdraw from the process or change your mind after starting the application, the fees paid are non-refundable, as processing and support will have already begun.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-green-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <DollarSign className="h-4 w-4 text-white" />
          </div>
                Do I have to pay all fees at once?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                No. The fees are separate purchases and are paid in stages as you progress through the process. You pay the Selection Process Fee first, then the Scholarship Fee (if applicable), followed by the University Enrollment Fee, and finally the I-20 Control Fee. All are mandatory for the complete flow, but do not need to be paid simultaneously.
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-white" />
              </div>
                Who can I contact if I have questions about fees or payments?
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                Our support team is available via chat or email at any time to answer any questions about fees, payments, or your application process. We are here to help you every step of the way!
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-24 bg-[#05294E] text-white relative overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-8">
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Join 5,000+ successful students</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Ready to Begin Your
            <br />
            <span className="text-[#D0151C]">American Dream?</span>
          </h2>
          
          <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Join thousands of international students who have found their path to American education through MatriculaUSA's comprehensive platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/register"
              className="group bg-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
            >
              Start Your Journey Today
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/how-it-works"
              className="group bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-white hover:text-[#05294E] transition-all duration-300 flex items-center justify-center"
            >
              <BookOpen className="mr-3 h-6 w-6" />
              Learn More
            </Link>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center text-blue-100">
            <div className="flex items-center text-sm">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              <span>Free to get started</span>
            </div>
            <div className="flex items-center text-sm">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              <span>No hidden fees</span>
            </div>
            <div className="flex items-center text-sm">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              <span>Expert support included</span>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Home;

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}