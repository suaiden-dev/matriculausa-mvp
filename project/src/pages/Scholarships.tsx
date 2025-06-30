import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Calendar, Award, Zap, Filter, Clock, GraduationCap, MapPin, Star, CheckCircle, Building, Users, ArrowRight, Sparkles, Target, Heart, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useScholarships } from '../hooks/useScholarships';
import type { Scholarship } from '../types';
import { StripeCheckout } from '../components/StripeCheckout';

const Scholarships: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [needCPT, setNeedCPT] = useState(false);
  const [visaAssistance, setVisaAssistance] = useState('all');
  const { scholarships, loading, error } = useScholarships();

  // Get min and max scholarship values from data
  const scholarshipValues = scholarships.map((s: Scholarship) => s.amount);
  const minScholarshipValue = Math.min(...scholarshipValues);
  const maxScholarshipValue = Math.max(...scholarshipValues);

  // Range state
  const [maxPrice, setMaxPrice] = useState(() => maxScholarshipValue);
  const [minPrice, setMinPrice] = useState(0);

  // Sempre que o valor máximo das bolsas mudar, atualize o filtro
  useEffect(() => {
    setMaxPrice(maxScholarshipValue);
  }, [maxScholarshipValue]);

  const levelOptions = [
    { value: 'all', label: 'All Levels' },
    { value: 'graduate', label: 'Graduate' },
    { value: 'doctorate', label: 'Doctorate' },
    { value: 'undergraduate', label: 'Undergraduate' },
  ];

  const visaOptions = [
    { value: 'all', label: 'All Visa Assistance' },
    { value: 'cos', label: 'COS' },
    { value: 'initial', label: 'Initial' },
  ];

  const { isAuthenticated, userProfile } = useAuth();
  const navigate = useNavigate();

  const isLocked = !userProfile?.has_paid_selection_process_fee;

  const filteredScholarships = scholarships.filter((scholarship: Scholarship) => {
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRange = maxPrice > 0 ? (scholarship.annual_value_with_scholarship ?? 0) <= maxPrice : false;
    const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level.toLowerCase() === selectedLevel);
    const matchesField = selectedField === 'all' || (scholarship.field_of_study && scholarship.field_of_study.toLowerCase().includes(selectedField.toLowerCase()));
    return matchesSearch && matchesRange && matchesLevel && matchesField;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getFieldBadgeColor = (field: string | undefined) => {
    switch (field?.toLowerCase()) {
      case 'stem':
        return 'bg-blue-600';
      case 'business':
        return 'bg-green-600';
      case 'engineering':
        return 'bg-purple-600';
      default:
        return 'bg-slate-600';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'undergraduate':
        return <GraduationCap className="h-4 w-4" />;
      case 'graduate':
        return <Users className="h-4 w-4" />;
      case 'doctorate':
        return <Award className="h-4 w-4" />;
      default:
        return <GraduationCap className="h-4 w-4" />;
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (deadline: string) => {
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Atualizar totalCount sempre que scholarships mudar
  useEffect(() => {
    setTotalCount(filteredScholarships.length);
  }, [filteredScholarships]);

  // Paginação dos resultados filtrados
  const paginatedScholarships = filteredScholarships.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] text-white py-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-5 left-10 w-56 h-56 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-5 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-4">
              <Award className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium text-white">Exclusive Opportunities</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight">
              <span className="text-white">Scholarship</span>
              <br />
              <span className="text-[#D0151C]">Opportunities</span>
            </h1>
            
            <p className="text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed mb-6">
              Discover exclusive funding opportunities crafted specifically for international students pursuing American education excellence.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-slate-300">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <DollarSign className="h-5 w-5 mr-2 text-green-400" />
                <span className="text-sm font-medium">$50M+ Available</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Star className="h-5 w-5 mr-2 text-yellow-400" />
                <span className="text-sm font-medium">95% Success Rate</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-400" />
                <span className="text-sm font-medium">150+ Universities</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Modern Filter Bar */}
        <div className="bg-white shadow-lg rounded-2xl border border-slate-200 p-6 mb-10 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          {/* Search Input */}
          <div className="flex items-center flex-1 min-w-[220px] max-w-sm bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 focus-within:ring-2 focus-within:ring-[#05294E]">
            <Search className="h-5 w-5 text-slate-400 mr-2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search scholarships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none border-none text-sm text-slate-900 placeholder-slate-400"
              aria-label="Search scholarships"
              disabled={loading}
            />
          </div>

          {/* Price Range Filter */}
          <div className="flex items-center gap-2 min-w-[260px]">
            <label htmlFor="min-price" className="text-xs text-slate-500">Min</label>
            <input
              id="min-price"
              type="number"
              min={0}
              max={maxScholarshipValue}
              value={minPrice}
              onChange={e => setMinPrice(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] bg-slate-50"
              placeholder="$0"
              aria-label="Minimum scholarship value"
              disabled={loading}
            />
            <span className="text-xs text-slate-400">-</span>
            <label htmlFor="max-price" className="text-xs text-slate-500">Max</label>
            <input
              id="max-price"
              type="number"
              min={0}
              max={maxScholarshipValue}
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-20 px-2 py-1 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] bg-slate-50"
              placeholder={formatAmount(maxScholarshipValue)}
              aria-label="Maximum scholarship value"
              disabled={loading}
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] text-xs bg-slate-50 min-w-[110px]"
              aria-label="Level"
              disabled={loading}
            >
              {levelOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] text-xs bg-slate-50 min-w-[110px]"
              aria-label="Field"
              disabled={loading}
            >
              <option value="all">All Fields</option>
              <option value="stem">STEM</option>
              <option value="business">Business</option>
              <option value="engineering">Engineering</option>
              <option value="any">Any Field</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-end flex-1 min-w-[120px]">
            <span className="text-xs text-slate-600 bg-slate-100 rounded px-3 py-1 font-medium">
              {loading ? 'Loading...' : `${filteredScholarships.length} scholarships found`}
            </span>
          </div>
        </div>

        {/* Scholarships Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            // Skeleton cards durante o carregamento
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
                <div className="space-y-3">
                  <div className="h-10 bg-slate-200 rounded"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
                <div className="mt-6 h-12 bg-slate-200 rounded-xl"></div>
              </div>
            ))
          ) : error ? (
            <div className="col-span-full text-center text-slate-500 py-12">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <p>{error}</p>
            </div>
          ) : paginatedScholarships.length === 0 ? (
            <div className="col-span-full text-center text-slate-500 py-12">No scholarships found.</div>
          ) : (
            paginatedScholarships.map((scholarship: Scholarship) => {
              const deadlineStatus = getDeadlineStatus(scholarship.deadline);
              
              return (
                <div key={scholarship.id} className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2">
                  {/* Scholarship Image */}
                  {scholarship.image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={scholarship.image_url}
                        alt={scholarship.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      {/* Exclusive Badge on Image */}
                      {scholarship.is_exclusive && (
                        <div className="absolute top-4 right-4">
                          <span className="bg-[#D0151C] text-white px-3 py-1 rounded-xl text-xs font-bold shadow-lg">
                            Exclusive
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Card Content */}
                  <div className={`p-6 ${scholarship.image_url ? '' : ''}`}>
                    {/* Title and Badges */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
                          {scholarship.title}
                        </h3>
                        
                        {/* Programs */}
                        <div className="flex items-center mb-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                            {scholarship.field_of_study || 'Any Field'}
                          </span>
                        </div>
                        
                        {/* University */}
                        <div className="flex items-center text-slate-600 mb-4">
                          <Building className="h-4 w-4 mr-2 text-[#05294E]" />
                          <span className="text-xs font-semibold mr-1">University:</span>
                          <span className={`text-sm select-none ${!userProfile?.has_paid_selection_process_fee ? 'blur-sm' : ''}`}>{scholarship.universities?.name || 'Unknown University'}</span>
                        </div>
                      </div>
                      
                      {/* Exclusive Badge - only show when no image */}
                      {scholarship.is_exclusive && !scholarship.image_url && (
                        <span className="bg-[#D0151C] text-white px-3 py-1 rounded-xl text-xs font-bold shadow-lg">
                          Exclusive
                        </span>
                      )}
                    </div>

                    {/* Financial Values Section */}
                    <div className="mb-4">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">Original Annual Value</span>
                          <span className="font-bold text-blue-700">{formatAmount(scholarship.original_annual_value ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">Value Per Credit</span>
                          <span className="font-bold text-blue-700">{formatAmount(scholarship.original_value_per_credit ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">Annual Value With Scholarship</span>
                          <span className="font-bold text-green-700">{formatAmount(scholarship.annual_value_with_scholarship ?? 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Level</span>
                        <div className="flex items-center">
                          {getLevelIcon(scholarship.level || 'undergraduate')}
                          <span className="ml-1 capitalize text-slate-700">{scholarship.level}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Deadline</span>
                        <div className="flex items-center">
                          <Clock className={`h-3 w-3 mr-1 ${getDeadlineStatus(scholarship.deadline).color}`} />
                          <span className="text-slate-700">{getDaysUntilDeadline(scholarship.deadline)} days left</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6">
                    {(!isAuthenticated) ? (
                      <button
                        className={`w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-xl transform group-hover:scale-105 transition-all duration-300`}
                        onClick={() => navigate('/login')}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Apply Now
                      </button>
                    ) : (
                      <button
                        className={`w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-4 px-6 rounded-2xl font-bold text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-xl transform group-hover:scale-105 transition-all duration-300 hover:from-[#05294E]/90 hover:to-slate-600`}
                        onClick={async () => {
                          if (!userProfile?.has_paid_selection_process_fee) {
                            // Acionar StripeCheckout para selection_process com o price_id correto
                            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
                            const { data: sessionData } = await import('../lib/supabase').then(m => m.supabase.auth.getSession());
                            const token = sessionData.session?.access_token;
                            const response = await fetch(apiUrl, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                price_id: 'price_1Rb5w8KdCh3y3bmYqSmUyW2Z',
                                success_url: `${window.location.origin}/student/dashboard/selection-process-fee-success?session_id={CHECKOUT_SESSION_ID}`,
                                cancel_url: `${window.location.origin}/student/dashboard/selection-process-fee-error`,
                                mode: 'payment',
                                payment_type: 'selection_process',
                                fee_type: 'selection_process',
                              })
                            });
                            const data = await response.json();
                            if (data.session_url) {
                              window.location.href = data.session_url;
                              return;
                            }
                            return;
                          }
                          navigate('/student/dashboard/scholarships');
                        }}
                      >
                        <Award className="h-4 w-4 mr-2" />
                        Apply Now
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                  
                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              );
            })
          )}
        </div>

        {/* No Results */}
        {filteredScholarships.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <Award className="h-16 w-16 text-slate-400" />
            </div>
            <h3 className="text-3xl font-bold text-slate-600 mb-4">No scholarships found</h3>
            <p className="text-slate-500 text-lg mb-8">Try adjusting your search criteria to discover more opportunities</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedLevel('all');
                setSelectedField('all');
                setMaxPrice(() => maxScholarshipValue);
                setMinPrice(0);
              }}
              className="bg-[#05294E] text-white px-8 py-3 rounded-2xl hover:bg-[#05294E]/90 transition-all duration-300 font-bold"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-20 bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] rounded-3xl p-12 text-white text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-6">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Ready to Start?</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Ready to <span className="text-[#D0151C]">Transform</span> Your Future?
            </h2>
            <p className="text-xl text-slate-200 mb-10 max-w-3xl mx-auto leading-relaxed">
              Join thousands of international students who have secured their educational dreams through our exclusive scholarship opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={() => navigate('/register')}
                className="bg-[#D0151C] text-white px-10 py-5 rounded-2xl hover:bg-[#B01218] transition-all duration-300 font-bold text-lg shadow-2xl transform hover:scale-105 flex items-center justify-center"
              >
                Get Started Today
                <ArrowRight className="ml-3 h-5 w-5" />
              </button>
              <button 
                onClick={() => navigate('/how-it-works')}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-2xl hover:bg-white/20 transition-all duration-300 font-bold text-lg flex items-center justify-center"
              >
                <Award className="mr-3 h-5 w-5" />
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Paginação */}
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            className="px-4 py-2 rounded bg-slate-200 text-slate-700 font-semibold disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </button>
          <span className="text-slate-600 font-medium">
            Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE) || 1}
          </span>
          <button
            className="px-4 py-2 rounded bg-[#05294E] text-white font-semibold disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= totalCount}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scholarships;