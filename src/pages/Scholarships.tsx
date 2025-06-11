import React, { useState } from 'react';
import { Search, DollarSign, Calendar, Award, Zap, Filter, Clock, GraduationCap, MapPin, Star, CheckCircle, Building, Users, ArrowRight, Sparkles, Target, Heart } from 'lucide-react';
import { mockScholarships } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Scholarships: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [needCPT, setNeedCPT] = useState(false);
  const [visaAssistance, setVisaAssistance] = useState('all');

  // Get min and max scholarship values from data
  const scholarshipValues = mockScholarships.map(s => s.scholarshipValue);
  const minScholarshipValue = Math.min(...scholarshipValues);
  const maxScholarshipValue = Math.max(...scholarshipValues);

  // Range state
  const [maxPrice, setMaxPrice] = useState(maxScholarshipValue);
  const [minPrice, setMinPrice] = useState(0);

  const levelOptions = [
    { value: 'all', label: 'All Levels' },
    { value: 'master', label: 'Master' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'undergraduate', label: 'Undergraduate' },
    { value: 'graduate', label: 'Graduate' },
  ];

  const visaOptions = [
    { value: 'all', label: 'All Visa Assistance' },
    { value: 'cos', label: 'COS' },
    { value: 'initial', label: 'Initial' },
  ];

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const filteredScholarships = mockScholarships.filter(scholarship => {
    const matchesSearch = scholarship.programName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRange = maxPrice > 0 ? scholarship.scholarshipValue <= maxPrice : false;
    const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level.toLowerCase() === selectedLevel);
    const matchesCPT = !needCPT || scholarship.needCPT === true;
    const matchesVisa = visaAssistance === 'all' || (scholarship.visaAssistance && scholarship.visaAssistance.toLowerCase() === visaAssistance);
    return matchesSearch && matchesRange && matchesLevel && matchesCPT && matchesVisa;
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getFieldBadgeColor = (field: string) => {
    switch (field.toLowerCase()) {
      case 'stem':
      case 'engineering':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'business':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'any':
        return 'bg-gradient-to-r from-purple-500 to-purple-600';
      default:
        return 'bg-gradient-to-r from-[#05294E] to-slate-700';
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

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-[#05294E] via-slate-800 to-[#05294E] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#D0151C]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-8">
              <Award className="h-4 w-4 mr-2 text-white" />
              <span className="text-sm font-medium text-white">Exclusive Opportunities</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              <span className="text-white">Scholarship</span>
              <br />
              <span className="text-[#D0151C]">Opportunities</span>
            </h1>
            
            <p className="text-xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              Discover exclusive funding opportunities crafted specifically for international students pursuing American education excellence.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center items-center gap-8 mt-12 text-slate-300">
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
            />
            <div className="flex-1 mx-2">
              <input
                type="range"
                min={0}
                max={maxScholarshipValue}
                value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#05294E]"
                step={1000}
                aria-label="Scholarship value range"
              />
            </div>
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] text-xs bg-slate-50 min-w-[110px]"
              aria-label="Level"
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
            >
              <option value="all">All Fields</option>
              <option value="stem">STEM</option>
              <option value="business">Business</option>
              <option value="engineering">Engineering</option>
              <option value="any">Any Field</option>
            </select>
            <select
              value={visaAssistance}
              onChange={(e) => setVisaAssistance(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] text-xs bg-slate-50 min-w-[110px]"
              aria-label="Visa Assistance"
            >
              {visaOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Checkbox Filters */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                id="need-cpt"
                type="checkbox"
                checked={needCPT}
                onChange={() => setNeedCPT(!needCPT)}
                className="accent-[#05294E]"
                aria-label="Need CPT/PT"
              />
              <span>Need CPT/PT</span>
            </label>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-end flex-1 min-w-[120px]">
            <span className="text-xs text-slate-600 bg-slate-100 rounded px-3 py-1 font-medium">{filteredScholarships.length} scholarships found</span>
          </div>
        </div>

        {/* Scholarships Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredScholarships.map((scholarship) => {
            return (
              <div key={scholarship.id} className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2">
                {/* Header/Background */}
                <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#05294E]/10 to-[#D0151C]/10"></div>
                  <div className="absolute top-4 left-4">
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg">
                      <Building className="h-6 w-6 text-[#05294E]" />
                    </div>
                  </div>
                  {/* Valor original anual */}
                  <div className="absolute bottom-4 left-4">
                    <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg">
                      <div className="text-xs font-medium text-slate-600 mb-1">Valor original anual</div>
                      <div className="text-lg font-black text-[#05294E]">
                        {formatAmount(scholarship.originalValue.annual)}
                      </div>
                      <div className="text-xs text-slate-500">({formatAmount(scholarship.originalValue.perCredit)} por crédito)</div>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  {/* Nome do Programa */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
                    {scholarship.programName}
                  </h3>
                  {/* Valor da Bolsa Anual */}
                  <div className="flex items-center mb-4">
                    <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                    <span className="text-lg font-bold text-green-700">{formatAmount(scholarship.scholarshipValue)} <span className="text-xs font-normal text-slate-500">/ ano</span></span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-6 pb-6">
                  <button
                    className="w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-4 px-6 rounded-2xl hover:from-[#05294E]/90 hover:to-slate-600 transition-all duration-300 font-bold text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-xl transform group-hover:scale-105"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login');
                      } else {
                        // TODO: Add normal apply logic here
                      }
                    }}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredScholarships.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <Award className="h-16 w-16 text-slate-400" />
            </div>
            <h3 className="text-3xl font-bold text-slate-600 mb-4">No scholarships found</h3>
            <p className="text-slate-500 text-lg mb-8">Try adjusting your search criteria to discover more opportunities</p>
            <button className="bg-[#05294E] text-white px-8 py-3 rounded-2xl hover:bg-[#05294E]/90 transition-all duration-300 font-bold">
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
              <button className="bg-[#D0151C] text-white px-10 py-5 rounded-2xl hover:bg-[#B01218] transition-all duration-300 font-bold text-lg shadow-2xl transform hover:scale-105 flex items-center justify-center">
                Get Started Today
                <ArrowRight className="ml-3 h-5 w-5" />
              </button>
              <button className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-10 py-5 rounded-2xl hover:bg-white/20 transition-all duration-300 font-bold text-lg flex items-center justify-center">
                <Award className="mr-3 h-5 w-5" />
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scholarships;