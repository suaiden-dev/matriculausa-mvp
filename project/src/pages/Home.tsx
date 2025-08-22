import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Globe, Users, Award, ArrowRight, CheckCircle, Star, BookOpen, Zap, Shield, TrendingUp, Sparkles, DollarSign, Play, ChevronRight, Heart, Brain, Rocket, Clock, CreditCard, MapPin, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUniversities } from '../hooks/useUniversities';
import { StripeCheckout } from '../components/StripeCheckout';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../lib/supabase';
// Removido SmartChat pois não é utilizado
import { slugify } from '../utils/slugify';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { universities } = useUniversities();
  
  // Buscar universidades em destaque
  const [featuredSchools, setFeaturedSchools] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchFeaturedUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from('universities')
          .select('id, name, location, logo_url, programs, description, website, address, type')
          .eq('is_approved', true)
          .eq('is_featured', true)
          .order('featured_order');
        
        if (!error && data) {
          setFeaturedSchools(data);
        } else {
          // Fallback para as primeiras 6 universidades se não houver destaque
          setFeaturedSchools(universities.slice(0, 6));
        }
      } catch (error) {
        console.error('Erro ao carregar universidades em destaque:', error);
        // Fallback para as primeiras 6 universidades
        setFeaturedSchools(universities.slice(0, 6));
      }
    };

    if (universities.length > 0) {
      fetchFeaturedUniversities();
    }
  }, [universities]);
  const { isAuthenticated, user, userProfile } = useAuth();
  const { hasPaidProcess } = useSubscription();

  // Função para determinar o dashboard conforme a role (igual Header)
  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'student': return '/student/dashboard';
      case 'school': return '/school/dashboard';
      case 'admin': return '/admin/dashboard';
      case 'affiliate_admin': return '/affiliate-admin/dashboard';
      default: return '/';
    }
  };

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
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 mb-8 border border-[#05294E]/20 shadow-lg">
                <Sparkles className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-slate-700">{t('nav.scholarshipsPlatform')}</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight text-slate-900">
                {t('home.hero.title')}
              </h1>
              
              <p className="text-xl md:text-2xl mb-10 text-slate-600 leading-relaxed max-w-2xl">
                {t('home.hero.description')}
              </p>
              
              <div className="flex flex-col items-center sm:items-stretch sm:flex-row gap-4 mb-12 w-full">
                <Link
                  to="/register"
                  className={`group bg-[#D0151C] hover:bg-[#B01218] text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center border-0 ${isAuthenticated ? 'hidden' : ''}`}
                >
                  {t('home.hero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                {/* Lógica correta: só para estudante, usando userProfile?.has_paid_selection_process_fee */}
                {isAuthenticated && user && user.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee && (
                  <StripeCheckout 
                    feeType="selection_process"
                    paymentType="selection_process"
                    productId="selectionProcess"
                    buttonText={t('nav.startSelectionProcess')}
                    className="group bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center border-0"
                    onError={(error) => console.error('Checkout error:', error)}
                    successUrl={`${window.location.origin}/student/dashboard/selection-process-fee-success?session_id={CHECKOUT_SESSION_ID}`}
                    cancelUrl={`${window.location.origin}/student/dashboard/selection-process-fee-error`}
                  />
                )}
                {isAuthenticated && user && user.role === 'student' && userProfile && userProfile.has_paid_selection_process_fee && (
                  <Link
                    to={getDashboardPath()}
                    className="group bg-green-600 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center border-0"
                  >
                    {t('nav.goToDashboard')}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
                {/* Para admin e school, segue igual */}
                {isAuthenticated && user && (user.role === 'admin' || user.role === 'school') && (
                  <Link
                    to={getDashboardPath()}
                    className="group bg-[#05294E] hover:bg-[#02172B] text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center"
                  >
                    {t('nav.goToDashboard')}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
                <Link
                  to="/scholarships"
                  className="group bg-white border-2 border-[#05294E] text-[#05294E] px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#05294E] hover:text-white transition-all duration-300 flex items-center justify-center shadow-lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  {t('nav.viewScholarships')}
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
                  <span className="text-sm font-medium">5,000+ {t('home.trustIndicators.studentsEnrolled')}</span>
                </div>
                <div className="flex items-center">
                  <div className="flex mr-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{t('home.trustIndicators.rating')}</span>
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
              <span className="text-sm font-bold text-slate-700">{t('home.stats.universities')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              Featured <span className="text-[#05294E]">{t('universities.title')}</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('universities.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredSchools.map((school) => (
              <div key={school.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full min-h-[480px] relative">
                {/* Overlay de blur quando não autenticado ou não pagou */}
                {(!isAuthenticated || (user?.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee)) && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
                    <div className="text-center p-6">
                      <div className="bg-[#05294E]/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-[#05294E]" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">
                        {t('home.featuredUniversities.lockedTitle')}
                      </h4>
                      <p className="text-sm text-slate-600 mb-4">
                        {t('home.featuredUniversities.lockedDescription')}
                      </p>
                      <button
                        onClick={() => {
                          if (isAuthenticated) {
                            navigate('/student/dashboard');
                          } else {
                            navigate('/login');
                          }
                        }}
                        className="bg-[#05294E] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#05294E]/90 transition-colors"
                      >
                        {isAuthenticated ? t('home.featuredUniversities.goToDashboard') : t('home.featuredUniversities.loginToView')}
                      </button>
                    </div>
                  </div>
                )}

                {/* University Image */}
                <div className="relative h-48 overflow-hidden flex-shrink-0">
                  <img
                    src={school.image || school.logo_url || '/university-placeholder.png'}
                    alt={`${school.name} campus`}
                    className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${
                      (!isAuthenticated || (user?.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee)) 
                        ? 'blur-lg' 
                        : ''
                    }`}
                  />
                  
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
                  <h3 className={`text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors ${
                    (!isAuthenticated || (user?.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee)) 
                      ? 'blur-sm' 
                      : ''
                  }`}>
                    {school.name}
                  </h3>
                  
                  {/* Location */}
                  <div className={`flex items-center text-slate-600 mb-4 ${
                    (!isAuthenticated || (user?.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee)) 
                      ? 'blur-sm' 
                      : ''
                  }`}>
                    <MapPin className="h-4 w-4 mr-2 text-[#05294E]" />
                    <span className="text-sm">{school.location}</span>
                  </div>

                  {/* Programs Preview */}
                  <div className="mb-6 flex-1">
                    <div className={`flex flex-wrap gap-2 ${
                      (!isAuthenticated || (user?.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee)) 
                        ? 'blur-sm' 
                        : ''
                    }`}>
                      {school.programs && school.programs.length > 0 ? (
                        <>
                          {school.programs.slice(0, 3).map((program: string, index: number) => (
                            <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                              {program}
                            </span>
                          ))}
                          {school.programs.length > 3 && (
                            <span className="bg-[#05294E]/10 text-[#05294E] px-2 py-1 rounded-lg text-xs font-medium">
                              +{school.programs.length - 3} {t('common.showMore')}
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
                      to={`/schools/${slugify(school.name)}`}
                      className="w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-3 px-4 rounded-2xl hover:from-[#05294E]/90 hover:to-slate-600 transition-all duration-300 font-bold text-sm flex items-center justify-center group-hover:shadow-xl transform group-hover:scale-105"
                    >
                      {t('common.learnMore')}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All Schools Button */}
          <div className="text-center mb-24 mt-16">
            <Link
              to="/schools"
              className="inline-flex items-center bg-white border-2 border-[#05294E] text-[#05294E] px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#05294E] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <GraduationCap className="mr-3 h-5 w-5" />
              {t('universities.title')}
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
              <span className="text-sm font-bold text-slate-700">{t('features.whyChoose')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              {t('features.whyChoose')}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-white p-8 rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200">
              <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('features.smartMatching.title')}</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {t('features.smartMatching.description')}
              </p>
              <Link to="/schools" className="inline-flex items-center text-[#05294E] font-bold hover:text-[#05294E]/80 transition-colors">
                {t('universities.title')} <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="group bg-white p-8 rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200">
              <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('features.exclusiveScholarships.title')}</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {t('features.exclusiveScholarships.description')}
              </p>
              <Link to="/scholarships" className="inline-flex items-center text-[#D0151C] font-bold hover:text-[#D0151C]/80 transition-colors">
                {t('nav.viewScholarships')} <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="group bg-white p-8 rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200">
              <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{t('features.personalSupport.title')}</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {t('features.personalSupport.description')}
              </p>
              <Link to="/how-it-works" className="inline-flex items-center text-green-600 font-bold hover:text-green-700 transition-colors">
                {t('common.learnMore')} <ChevronRight className="ml-1 h-4 w-4" />
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
                <span className="text-sm font-bold text-slate-700">{t('home.threeSteps.subtitle')}</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">
                {t('home.threeSteps.title')}
              </h2>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-[#05294E] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-lg font-black text-white">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('home.threeSteps.step1.title')}</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t('home.threeSteps.step1.description')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-lg font-black text-white">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('home.threeSteps.step2.title')}</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t('home.threeSteps.step2.description')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-green-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-lg font-black text-white">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{t('home.threeSteps.step3.title')}</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {t('home.threeSteps.step3.description')}
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
                    <div className="font-bold text-slate-900">{t('home.enrollmentConfirmed.title')}</div>
                    <div className="text-sm text-slate-500">{t('home.enrollmentConfirmed.university')}</div>
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
              {t('home.successStories.title')}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('home.successStories.subtitle')}
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
                "{t('home.successStories.testimonial1.text')}"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt={t('home.successStories.testimonial1.author')}
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">{t('home.successStories.testimonial1.author')}</div>
                  <div className="text-sm text-[#05294E] font-medium">{t('home.successStories.testimonial1.field')}</div>
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
                "{t('home.successStories.testimonial2.text')}"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt={t('home.successStories.testimonial2.author')}
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">{t('home.successStories.testimonial2.author')}</div>
                  <div className="text-sm text-[#D0151C] font-medium">{t('home.successStories.testimonial2.field')}</div>
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
                "{t('home.successStories.testimonial3.text')}"
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1"
                  alt={t('home.successStories.testimonial3.author')}
                  className="w-14 h-14 rounded-2xl mr-4 shadow-lg"
                />
                <div>
                  <div className="font-bold text-slate-900">{t('home.successStories.testimonial3.author')}</div>
                  <div className="text-sm text-green-600 font-medium">{t('home.successStories.testimonial3.field')}</div>
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
              <span className="text-sm font-bold text-slate-700">{t('home.faq.title')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
              {t('home.faq.mainTitle')}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t('home.faq.subtitle')}
            </p>
          </div>
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                {t('home.faq.questions.q1.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q1.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#D0151C] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q2.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q2.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-green-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Award className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q3.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q3.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-yellow-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q4.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q4.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-purple-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q5.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q5.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q6.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q6.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-green-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q7.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q7.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q8.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q8.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-yellow-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q9.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q9.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-green-600 w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q10.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q10.answer')}
              </p>
            </div>
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-3xl border border-slate-200 hover:shadow-lg transition-all duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                <div className="bg-[#05294E] w-8 h-8 rounded-xl flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-white" />
                </div>
                {t('home.faq.questions.q11.question')}
              </h3>
              <p className="text-slate-600 leading-relaxed pl-11">
                {t('home.faq.questions.q11.answer')}
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
            <span className="text-sm font-medium">Join 5,000+ {t('home.trustIndicators.studentsEnrolled')}</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            {t('home.cta.title')}
          </h2>
          
          <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
            {t('home.cta.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/register"
              className="group bg-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
            >
              {t('home.cta.button')}
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/how-it-works"
              className="group bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-white hover:text-[#05294E] transition-all duration-300 flex items-center justify-center"
            >
              <BookOpen className="mr-3 h-6 w-6" />
              {t('home.cta.learnMore')}
            </Link>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center text-blue-100">
            <div className="flex items-center text-sm">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              <span>{t('home.cta.features.freeToStart')}</span>
            </div>
            <div className="flex items-center text-sm">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              <span>{t('home.cta.features.noHiddenFees')}</span>
            </div>
            <div className="flex items-center text-sm">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              <span>{t('home.cta.features.expertSupport')}</span>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
};

export default Home;