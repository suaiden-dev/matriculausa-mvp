import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Award, Clock, GraduationCap, Star, CheckCircle, Building, Users, ArrowRight, Sparkles, AlertTriangle, Monitor, MapPin, Briefcase, Globe, Eye } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useScholarships } from '../hooks/useScholarships';
import type { Scholarship } from '../types';
import { supabase } from '../lib/supabase';

import SmartChat from '../components/SmartChat';
import ScholarshipDetailModal from '../components/ScholarshipDetailModal';

const Scholarships: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('all');
  const [selectedWorkPermission, setSelectedWorkPermission] = useState('all');
  const { scholarships, loading, error } = useScholarships();
  const [featuredUniversities, setFeaturedUniversities] = useState<any[]>([]);
  const [featuredScholarships, setFeaturedScholarships] = useState<Scholarship[]>([]);

  // Estados para o modal de detalhes
  const [selectedScholarshipForModal, setSelectedScholarshipForModal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get min and max scholarship values from data
  const scholarshipValues = scholarships.map((s: Scholarship) => s.amount).filter(val => val && val > 0);
  const maxScholarshipValue = scholarshipValues.length > 0 ? Math.max(...scholarshipValues) : 100000;

  // Range state
  const [maxPrice, setMaxPrice] = useState(() => maxScholarshipValue);
  const [minPrice, setMinPrice] = useState(0);

  // Sempre que o valor máximo das bolsas mudar, atualize o filtro
  useEffect(() => {
    setMaxPrice(maxScholarshipValue);
  }, [maxScholarshipValue]);

  // Salvar filtros no localStorage quando mudarem
  useEffect(() => {
    const filters = {
      searchTerm,
      selectedLevel,
      selectedField,
      selectedDeliveryMode,
      selectedWorkPermission,
      minPrice,
      maxPrice
    };
    localStorage.setItem('scholarshipsPageFilters', JSON.stringify(filters));
  }, [searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, minPrice, maxPrice]);

  // Restaurar filtros do localStorage ao carregar
  useEffect(() => {
    const savedFilters = localStorage.getItem('scholarshipsPageFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.searchTerm) setSearchTerm(filters.searchTerm);
        if (filters.selectedLevel) setSelectedLevel(filters.selectedLevel);
        if (filters.selectedField) setSelectedField(filters.selectedField);
        if (filters.selectedDeliveryMode) setSelectedDeliveryMode(filters.selectedDeliveryMode);
        if (filters.selectedWorkPermission) setSelectedWorkPermission(filters.selectedWorkPermission);
        if (filters.minPrice !== undefined) setMinPrice(filters.minPrice);
        // maxPrice será definido pelo useEffect do maxScholarshipValue
      } catch (error) {
        console.log('Error loading saved filters:', error);
      }
    }
  }, []);

  // Fetch featured scholarships directly from the scholarships table
  useEffect(() => {
    const fetchFeaturedScholarships = async () => {
      try {
        // Fetch scholarships marked as featured
        const { data: scholarshipsData, error: scholarshipsError } = await supabase
          .from('scholarships')
          .select(`
            *,
            universities (id, name, location, logo_url)
          `)
          .eq('is_active', true)
          .eq('is_highlighted', true)
          .order('featured_order', { ascending: true });
        
        if (!scholarshipsError && scholarshipsData) {
          setFeaturedScholarships(scholarshipsData);
          
          // Fetch universities of featured scholarships to display information
          const universityIds = scholarshipsData.map(s => s.university_id).filter(Boolean);
          if (universityIds.length > 0) {
            const { data: universitiesData, error: universitiesError } = await supabase
              .from('universities')
              .select('id, name, location, logo_url')
              .in('id', universityIds);
            
            if (!universitiesError && universitiesData) {
              setFeaturedUniversities(universitiesData);
            }
          }
        }
      } catch (error) {
        console.error('Error loading featured scholarships:', error);
      }
    };

    fetchFeaturedScholarships();
  }, []);

  const levelOptions = [
    { value: 'all', label: 'All Levels' },
    { value: 'graduate', label: 'Graduate' },
    { value: 'doctorate', label: 'Doctorate' },
    { value: 'undergraduate', label: 'Undergraduate' },
  ];

  const { isAuthenticated, userProfile, refetchUserProfile } = useAuth();
  const navigate = useNavigate();

  const filteredScholarships = scholarships.filter((scholarship: Scholarship) => {
    // Exclude featured scholarships from the general list to avoid duplication
    if (scholarship.is_highlighted) {
      return false;
    }
    
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase());
    const value = scholarship.annual_value_with_scholarship ?? 0;
    const matchesRange = (minPrice === 0 || value >= minPrice) && (maxPrice === 0 || value <= maxPrice);
    const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level.toLowerCase() === selectedLevel);
    const matchesField = selectedField === 'all' || (scholarship.field_of_study && scholarship.field_of_study.toLowerCase().includes(selectedField.toLowerCase()));
    const matchesDeliveryMode = selectedDeliveryMode === 'all' || (scholarship.delivery_mode && scholarship.delivery_mode === selectedDeliveryMode);
    const matchesWorkPermission = selectedWorkPermission === 'all' || (scholarship.work_permissions && scholarship.work_permissions.includes(selectedWorkPermission));
    return matchesSearch && matchesRange && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission;
  });

  // Apply the same filter logic to featured scholarships so the featureds respect the page filters
  const matchesFilters = (scholarship: Scholarship) => {
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase());
    const value = scholarship.annual_value_with_scholarship ?? 0;
    const matchesRange = (minPrice === 0 || value >= minPrice) && (maxPrice === 0 || value <= maxPrice);
    const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level.toLowerCase() === selectedLevel);
    const matchesField = selectedField === 'all' || (scholarship.field_of_study && scholarship.field_of_study.toLowerCase().includes(selectedField.toLowerCase()));
    const matchesDeliveryMode = selectedDeliveryMode === 'all' || (scholarship.delivery_mode && scholarship.delivery_mode === selectedDeliveryMode);
    const matchesWorkPermission = selectedWorkPermission === 'all' || (scholarship.work_permissions && scholarship.work_permissions.includes(selectedWorkPermission));
    return matchesSearch && matchesRange && matchesLevel && matchesField && matchesDeliveryMode && matchesWorkPermission;
  };

  const filteredFeaturedScholarships = featuredScholarships.filter(matchesFilters);

  // Polling para atualizar o perfil do usuário apenas enquanto o pagamento está pendente
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (userProfile && !userProfile.has_paid_selection_process_fee) {
      interval = setInterval(() => {
        refetchUserProfile && refetchUserProfile();
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [refetchUserProfile, userProfile]);

  // Refetch imediato após pagamento do selection process fee
  useEffect(() => {
    if (userProfile && userProfile.has_paid_selection_process_fee) {
      refetchUserProfile && refetchUserProfile();
    }
  }, [userProfile?.has_paid_selection_process_fee, refetchUserProfile]);

  const formatAmount = (amount: any) => {
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number') return amount.toLocaleString('en-US');
    return amount;
  };

  const getFieldBadgeColor = (field: string | undefined) => {
    switch (field?.toLowerCase()) {
      case 'stem':
        return 'bg-gradient-to-r from-blue-600 to-indigo-600';
      case 'business':
        return 'bg-gradient-to-r from-green-600 to-emerald-600';
      case 'engineering':
        return 'bg-gradient-to-r from-purple-600 to-violet-600';
      case 'arts':
        return 'bg-gradient-to-r from-pink-600 to-rose-600';
      case 'medicine':
        return 'bg-gradient-to-r from-red-600 to-pink-600';
      case 'law':
        return 'bg-gradient-to-r from-amber-600 to-orange-600';
      default:
        return 'bg-gradient-to-r from-slate-600 to-slate-700';
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

  const getDeliveryModeIcon = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return <Monitor className="h-3 w-3" />;
      case 'in_person':
        return <Building className="h-3 w-3" />;
      case 'hybrid':
        return <Globe className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  };

  const getDeliveryModeColor = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return 'bg-blue-100 text-blue-700';
      case 'in_person':
        return 'bg-green-100 text-green-700';
      case 'hybrid':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDeliveryModeLabel = (mode: string) => {
    switch (mode?.toLowerCase()) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'On Campus';
      case 'hybrid':
        return 'Hybrid';
      default:
        return 'Mixed';
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

  // Funções para controlar o modal
  const openScholarshipModal = (scholarship: any) => {
    setSelectedScholarshipForModal(scholarship);
    setIsModalOpen(true);
  };

  const closeScholarshipModal = () => {
    setIsModalOpen(false);
    setSelectedScholarshipForModal(null);
  };

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Atualizar totalCount sempre que scholarships mudar
  useEffect(() => {
    setTotalCount(filteredScholarships.length);
  }, [filteredScholarships]);

  // Display all filtered scholarships
  const visibleScholarships = filteredScholarships;
  const paginatedScholarships = visibleScholarships.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedLevel, selectedField, selectedDeliveryMode, selectedWorkPermission, minPrice, maxPrice]);

  // Debug: check how many scholarships we have (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Total scholarships:', scholarships.length);
    console.log('Filtered scholarships:', filteredScholarships.length);
    
    console.log('Paginated scholarships:', paginatedScholarships.length);
  }

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
            <select
              value={selectedDeliveryMode}
              onChange={(e) => setSelectedDeliveryMode(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] text-xs bg-slate-50 min-w-[110px]"
              aria-label="Study Mode"
              disabled={loading}
            >
              <option value="all">All Modes</option>
              <option value="online">Online</option>
              <option value="in_person">On Campus</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select
              value={selectedWorkPermission}
              onChange={(e) => setSelectedWorkPermission(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#05294E] focus:border-[#05294E] text-xs bg-slate-50 min-w-[110px]"
              aria-label="Work Authorization"
              disabled={loading}
            >
              <option value="all">All Permissions</option>
              <option value="OPT">OPT</option>
              <option value="CPT">CPT</option>
              <option value="F1">F1</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-end flex-1 min-w-[120px]">
            <span className="text-xs text-slate-600 bg-slate-100 rounded px-3 py-1 font-medium">
              {loading ? 'Loading...' : `${filteredScholarships.length} scholarships found`}
            </span>
          </div>
        </div>

        {/* Featured Scholarships Section */}
  {filteredFeaturedScholarships.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full px-6 py-2 mb-4">
                <Star className="h-4 w-4 mr-2 fill-current" />
                <span className="text-sm font-bold">Featured Scholarships</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                <span className="text-[#05294E]">Weekly</span> Highlights
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Scholarships selected by our experts for you
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {filteredFeaturedScholarships.slice(0, 6).map((scholarship) => {
                const deadlineStatus = getDeadlineStatus(scholarship.deadline);
                const daysLeft = getDaysUntilDeadline(scholarship.deadline);
                const originalValue = scholarship.original_annual_value ?? 0;
                const scholarshipValue = scholarship.annual_value_with_scholarship ?? 0;
                const savings = originalValue - scholarshipValue;
                const savingsPercentage = originalValue > 0 ? Math.round((savings / originalValue) * 100) : 0;
                
                return (
                  <article key={scholarship.id} className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-3 hover:border-[#05294E]/20 focus-within:ring-2 focus-within:ring-[#05294E]/50 flex flex-col h-full" role="article" aria-labelledby={`featured-scholarship-title-${scholarship.id}`}>
                    {/* Featured Badge - Top Right */}
                    <div className="absolute top-4 right-4 z-10">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </div>
                    </div>

                    {/* Deadline Urgency Indicator */}
                    {daysLeft <= 7 && daysLeft > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 z-10"></div>
                    )}
                    {daysLeft <= 3 && daysLeft > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 z-10 animate-pulse"></div>
                    )}

                    {/* Scholarship Image */}
                    <div className="relative h-48 w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                      {scholarship.image_url && isAuthenticated && userProfile?.has_paid_selection_process_fee ? (
                        <img
                          src={scholarship.image_url}
                          alt={scholarship.title}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-slate-400 bg-gradient-to-br from-[#05294E]/5 to-slate-100">
                          <Building className="h-16 w-16 text-[#05294E]/30" />
                        </div>
                      )}
                      
                      {/* Gradient Overlay for better text contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                      
                                             {/* Top Left Badges */}
                       <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                         {/* Exclusive Badge */}
                         {scholarship.is_exclusive && (
                           <div className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1">
                             <Star className="h-3 w-3" />
                             Exclusive
                           </div>
                         )}
                       </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      {/* Header Section */}
                      <div className="mb-4 flex-1">
                        <h3 id={`featured-scholarship-title-${scholarship.id}`} className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors duration-300">
                          {scholarship.title}
                        </h3>
                        
                        {/* Field and Level Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm ${getFieldBadgeColor(scholarship.field_of_study)} flex items-center gap-1`}>
                            <GraduationCap className="h-3 w-3 flex-shrink-0" />
                            <span className="hidden sm:inline">{scholarship.field_of_study || 'Any Field'}</span>
                            <span className="sm:hidden">{(scholarship.field_of_study || 'Any').slice(0, 4)}</span>
                          </span>
                          <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1">
                            {getLevelIcon(scholarship.level || 'undergraduate')}
                            <span className="hidden sm:inline">{levelOptions.find(option => option.value === scholarship.level)?.label || 'Undergraduate'}</span>
                            <span className="sm:hidden">{(levelOptions.find(option => option.value === scholarship.level)?.label || 'Undergraduate').slice(0, 5)}</span>
                          </span>
                        </div>
                        
                        {/* University Info */}
                        <div className="flex items-center text-slate-600 mb-4 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                          <Building className="h-4 w-4 mr-2 text-[#05294E] flex-shrink-0" />
                          <span className="text-xs font-semibold mr-2 text-slate-500">University:</span>
                          <span className={`text-sm font-medium ${!isAuthenticated || !userProfile?.has_paid_selection_process_fee ? 'blur-sm text-slate-400' : 'text-slate-700'}`}>
                            {isAuthenticated && userProfile?.has_paid_selection_process_fee
                              ? (featuredUniversities.find(u => u.id === scholarship.university_id)?.name || 'Unknown University')
                              : '********'}
                          </span>
                        </div>
                        
                        {/* Program Details */}
                        <div className="grid grid-cols-1 gap-3 mb-4">
                          {/* Delivery Mode */}
                          {scholarship.delivery_mode && (
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                              <div className="flex items-center">
                                {getDeliveryModeIcon(scholarship.delivery_mode)}
                                <span className="text-xs font-medium text-slate-600 ml-2">Study Mode</span>
                              </div>
                              <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getDeliveryModeColor(scholarship.delivery_mode)}`}>
                                {getDeliveryModeLabel(scholarship.delivery_mode)}
                              </span>
                            </div>
                          )}

                          {/* Work Permissions */}
                          {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                            <div className="p-3 bg-white rounded-lg border border-slate-200">
                              <div className="flex items-center mb-2">
                                <Briefcase className="h-3 w-3 text-emerald-600" />
                                <span className="text-xs font-medium text-slate-600 ml-2">Work Authorization</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {scholarship.work_permissions.map((permission, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Financial Impact Section */}
                      <div className="mb-6">
                        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                          <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Financial Overview
                          </h4>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Original Price</span>
                              <span className={`font-bold ${savingsPercentage > 0 ? 'line-through text-slate-400' : 'text-blue-700'}`}>
                                ${formatAmount(originalValue)}
                              </span>
                            </div>
                            {savingsPercentage > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">With Scholarship</span>
                                <span className="font-bold text-green-700">${formatAmount(scholarshipValue)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                              <span>Per Credit</span>
                              <span>${formatAmount(scholarship.original_value_per_credit ?? 0)}</span>
                            </div>
                            
                            {/* Subtle discount indicator */}
                            {savingsPercentage > 0 && (
                              <div className="pt-3 border-t border-slate-200">
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                  <span>Scholarship Discount</span>
                                  <span className="font-semibold text-green-600">{savingsPercentage}% OFF</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Agora sempre na parte inferior */}
                    <div className="px-6 pb-6 mt-auto">
                      <div className="flex gap-3">
                        {/* View Details Button */}
                        <button
                          onClick={() => openScholarshipModal(scholarship)}
                          className="w-32 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                          aria-label={`View details for ${scholarship.title} scholarship`}
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          <span>Details</span>
                        </button>
                        
                        {/* Apply Now Button - Maior */}
                        {(!isAuthenticated) ? (
                          <button
                            className="flex-1 bg-gradient-to-r from-[#05294E] via-[#05294E] to-slate-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-2xl transform group-hover:scale-105 transition-all duration-300 hover:from-[#041f3a] hover:to-slate-600 relative overflow-hidden active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#05294E]/50 focus:ring-offset-2"
                            onClick={() => navigate('/login')}
                            aria-label={`Apply for ${scholarship.title} scholarship - Login required`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" aria-hidden="true" />
                            <span className="relative z-10">Apply Now</span>
                          </button>
                        ) : (
                          <button
                            className="flex-1 bg-gradient-to-r from-[#05294E] via-[#05294E] to-slate-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-2xl transform group-hover:scale-105 transition-all duration-300 hover:from-[#041f3a] hover:to-slate-600 relative overflow-hidden active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#05294E]/50 focus:ring-offset-2"
                            onClick={async () => {
                              if (!userProfile?.has_paid_selection_process_fee) {
                                navigate('/student/dashboard');
                                return;
                              }
                              navigate('/student/dashboard/scholarships');
                            }}
                            aria-label={`Apply for ${scholarship.title} scholarship`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" aria-hidden="true" />
                            <span className="relative z-10">Apply Now</span>
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2 group-hover:translate-x-1 transition-transform relative z-10" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

                 {/* All Scholarships Section */}
         <div className="mb-12">
           <div className="text-center mb-8">
             <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
               <span className="text-[#05294E]">All</span> Scholarships
             </h2>
             <p className="text-lg text-slate-600 max-w-2xl mx-auto">
               Explore all available scholarship opportunities for international students
             </p>
           </div>
           
           {/* Scholarships Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {loading ? (
               // Skeleton cards during loading
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
               <div className="col-span-full text-center text-slate-500 py-12">
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
                     setSelectedDeliveryMode('all');
                     setSelectedWorkPermission('all');
                     setMaxPrice(() => maxScholarshipValue);
                     setMinPrice(0);
                     localStorage.removeItem('scholarshipsPageFilters');
                   }}
                   className="bg-[#05294E] text-white px-8 py-3 rounded-2xl hover:bg-[#05294E]/90 transition-all duration-300 font-bold"
                 >
                   Clear Filters
                 </button>
               </div>
             ) : (
               paginatedScholarships.map((scholarship: Scholarship) => {
                 const deadlineStatus = getDeadlineStatus(scholarship.deadline);
                 const daysLeft = getDaysUntilDeadline(scholarship.deadline);
                 const originalValue = scholarship.original_annual_value ?? 0;
                 const scholarshipValue = scholarship.annual_value_with_scholarship ?? 0;
                 const savings = originalValue - scholarshipValue;
                 const savingsPercentage = originalValue > 0 ? Math.round((savings / originalValue) * 100) : 0;
                 
                 return (
                   <article key={scholarship.id} className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-3 hover:border-[#05294E]/20 focus-within:ring-2 focus-within:ring-[#05294E]/50 flex flex-col h-full" role="article" aria-labelledby={`scholarship-title-${scholarship.id}`}>
                     {/* Deadline Urgency Indicator */}
                     {daysLeft <= 7 && daysLeft > 0 && (
                       <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 z-10"></div>
                     )}
                     {daysLeft <= 3 && daysLeft > 0 && (
                       <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600 z-10 animate-pulse"></div>
                     )}

                     {/* Scholarship Image */}
                     <div className="relative h-48 w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                       {scholarship.image_url ? (
                         <img
                           src={scholarship.image_url}
                           alt={scholarship.title}
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                         />
                       ) : (
                         <div className="flex items-center justify-center w-full h-full text-slate-400 bg-gradient-to-br from-[#05294E]/5 to-slate-100">
                           <Building className="h-16 w-16 text-[#05294E]/30" />
                         </div>
                       )}
                       
                       {/* Gradient Overlay for better text contrast */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                       
                       {/* Top Right Badges */}
                       <div className="absolute top-4 right-4 flex flex-col gap-2">
                         {/* Exclusive Badge */}
                         {scholarship.is_exclusive && (
                           <div className="bg-gradient-to-r from-[#D0151C] to-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1">
                             <Star className="h-3 w-3" />
                             Exclusive
                           </div>
                         )}
                         
                         {/* Savings Badge */}
                         {savingsPercentage > 0 && (
                           <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1">
                             <DollarSign className="h-3 w-3" />
                             {savingsPercentage}% OFF
                           </div>
                         )}
                       </div>

                       {/* Deadline Badge - Top Left */}
                       <div className="absolute top-4 left-4">
                         <div className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 flex items-center gap-1 ${deadlineStatus.bg} ${deadlineStatus.color}`}>
                           <Clock className="h-3 w-3" />
                           {daysLeft <= 0 ? 'Expired' : `${daysLeft} days`}
                         </div>
                       </div>
                     </div>
                     
                     {/* Card Content */}
                     <div className="p-6 flex-1 flex flex-col">
                       {/* Header Section */}
                       <div className="mb-4 flex-1">
                         <h3 id={`scholarship-title-${scholarship.id}`} className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors duration-300">
                           {scholarship.title}
                         </h3>
                         
                         {/* Field and Level Badges */}
                         <div className="flex flex-wrap items-center gap-2 mb-3">
                           <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm ${getFieldBadgeColor(scholarship.field_of_study)} flex items-center gap-1`}>
                             <GraduationCap className="h-3 w-3 flex-shrink-0" />
                             <span className="hidden sm:inline">{scholarship.field_of_study || 'Any Field'}</span>
                             <span className="sm:hidden">{(scholarship.field_of_study || 'Any').slice(0, 4)}</span>
                           </span>
                           <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 flex items-center gap-1">
                             {getLevelIcon(scholarship.level || 'undergraduate')}
                             <span className="hidden sm:inline">{levelOptions.find(option => option.value === scholarship.level)?.label || 'Undergraduate'}</span>
                             <span className="sm:hidden">{(levelOptions.find(option => option.value === scholarship.level)?.label || 'Undergraduate').slice(0, 5)}</span>
                           </span>
                         </div>
                         
                         {/* University Info */}
                         <div className="flex items-center text-slate-600 mb-4 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                           <Building className="h-4 w-4 mr-2 text-[#05294E] flex-shrink-0" />
                           <span className="text-xs font-semibold mr-2 text-slate-500">University:</span>
                           <span className={`text-sm font-medium ${!isAuthenticated || !userProfile?.has_paid_selection_process_fee ? 'blur-sm text-slate-400' : 'text-slate-700'}`}>
                             {isAuthenticated && userProfile?.has_paid_selection_process_fee
                               ? (scholarship.university_name || scholarship.universities?.name || 'Unknown University')
                               : '********'}
                           </span>
                         </div>
                         {/* Program Details */}
                         <div className="grid grid-cols-1 gap-3 mb-4">
                           {/* Delivery Mode */}
                           {scholarship.delivery_mode && (
                             <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                               <div className="flex items-center">
                                 {getDeliveryModeIcon(scholarship.delivery_mode)}
                                 <span className="text-xs font-medium text-slate-600 ml-2">Study Mode</span>
                               </div>
                               <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getDeliveryModeColor(scholarship.delivery_mode)}`}>
                                 {getDeliveryModeLabel(scholarship.delivery_mode)}
                               </span>
                             </div>
                           )}

                           {/* Work Permissions */}
                           {scholarship.work_permissions && scholarship.work_permissions.length > 0 && (
                             <div className="p-3 bg-white rounded-lg border border-slate-200">
                               <div className="flex items-center mb-2">
                                 <Briefcase className="h-3 w-3 text-emerald-600" />
                                 <span className="text-xs font-medium text-slate-600 ml-2">Work Authorization</span>
                               </div>
                               <div className="flex flex-wrap gap-1">
                                 {scholarship.work_permissions.map((permission, index) => (
                                   <span
                                     key={index}
                                     className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold"
                                   >
                                     {permission}
                                   </span>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       </div>

                       {/* Financial Impact Section */}
                       <div className="mb-6">
                         <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
                           <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                             <DollarSign className="h-4 w-4 text-green-600" />
                             Financial Overview
                           </h4>
                           

                           
                           <div className="space-y-2">
                             <div className="flex items-center justify-between text-sm">
                               <span className="text-slate-600">Original Price</span>
                               <span className={`font-bold ${savingsPercentage > 0 ? 'line-through text-slate-400' : 'text-blue-700'}`}>
                                 ${formatAmount(originalValue)}
                               </span>
                             </div>
                             {savingsPercentage > 0 && (
                               <div className="flex items-center justify-between text-sm">
                                 <span className="text-slate-600">With Scholarship</span>
                                 <span className="font-bold text-green-700">${formatAmount(scholarshipValue)}</span>
                               </div>
                             )}
                             <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                               <span>Per Credit</span>
                               <span>${formatAmount(scholarship.original_value_per_credit ?? 0)}</span>
                             </div>
                             
                             {/* Subtle discount indicator */}
                             {savingsPercentage > 0 && (
                               <div className="pt-3 border-t border-slate-200">
                                 <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                   <span>Scholarship Discount</span>
                                   <span className="font-semibold text-green-600">{savingsPercentage}% OFF</span>
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       </div>


                     </div>

                     {/* Action Buttons - Agora sempre na parte inferior */}
                     <div className="px-6 pb-6 mt-auto">
                       <div className="flex gap-3">
                         {/* View Details Button */}
                         <button
                           onClick={() => openScholarshipModal(scholarship)}
                           className="w-32 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                           aria-label={`View details for ${scholarship.title} scholarship`}
                         >
                           <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                           <span>Details</span>
                         </button>
                         
                         {/* Apply Now Button - Maior */}
                         {(!isAuthenticated) ? (
                           <button
                             className="flex-1 bg-gradient-to-r from-[#05294E] via-[#05294E] to-slate-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-2xl transform group-hover:scale-105 transition-all duration-300 hover:from-[#041f3a] hover:to-slate-600 relative overflow-hidden active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#05294E]/50 focus:ring-offset-2"
                             onClick={() => navigate('/login')}
                             aria-label={`Apply for ${scholarship.title} scholarship - Login required`}
                           >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                             <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" aria-hidden="true" />
                             <span className="relative z-10">Apply Now</span>
                           </button>
                         ) : (
                           <button
                             className="flex-1 bg-gradient-to-r from-[#05294E] via-[#05294E] to-slate-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-2xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center group-hover:shadow-2xl transform group-hover:scale-105 transition-all duration-300 hover:from-[#041f3a] hover:to-slate-600 relative overflow-hidden active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#05294E]/50 focus:ring-offset-2"
                             onClick={async () => {
                               if (!userProfile?.has_paid_selection_process_fee) {
                                 navigate('/student/dashboard');
                                 return;
                               }
                               navigate('/student/dashboard/scholarships');
                             }}
                             aria-label={`Apply for ${scholarship.title} scholarship`}
                           >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                             <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" aria-hidden="true" />
                             <span className="relative z-10">Apply Now</span>
                             <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2 group-hover:translate-x-1 transition-transform relative z-10" aria-hidden="true" />
                           </button>
                         )}
                       </div>
                     </div>
                     
                     {/* Enhanced Hover Effect Overlay */}
                     <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                     
                     {/* Subtle Border Animation */}
                     <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                       <div className="absolute inset-0 rounded-3xl border-2 border-[#05294E]/20 animate-pulse"></div>
                     </div>
                   </article>
                 );
               })
             )}
           </div>
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
                setSelectedDeliveryMode('all');
                setSelectedWorkPermission('all');
                setMaxPrice(() => maxScholarshipValue);
                setMinPrice(0);
                localStorage.removeItem('scholarshipsPageFilters');
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
      
      {/* Modal de Detalhes da Bolsa */}
      <ScholarshipDetailModal
        scholarship={selectedScholarshipForModal}
        isOpen={isModalOpen}
        onClose={closeScholarshipModal}
        userProfile={userProfile}
      />
      
      <SmartChat />
    </div>
  );
};

export default Scholarships;