import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Building, GraduationCap, ArrowRight, Star, Lock, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SmartChat from '../components/SmartChat';
import { slugify } from '../utils/slugify';
import PaymentRequiredBlocker from '../components/PaymentRequiredBlocker';
import { useAuth } from '../hooks/useAuth';

const PAGE_SIZE = 20;

const Universities: React.FC = () => {
  const { t } = useTranslation(['school', 'scholarships', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, userProfile, loading } = useAuth();
  
  // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER LÓGICA CONDICIONAL
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [realUniversities, setRealUniversities] = useState<any[]>([]);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [allUniversities, setAllUniversities] = useState<any[]>([]);
  const [featuredUniversities, setFeaturedUniversities] = useState<any[]>([]);
  
  // TODOS OS useEffect DEVEM VIR ANTES DE QUALQUER LÓGICA CONDICIONAL
  useEffect(() => {
    const fetchUniversities = async () => {
      if (!hasLoadedData || searchTerm.trim() !== '' || selectedLocation !== 'all') {
        setIsLoadingUniversities(true);
      }
      // Se estiver pesquisando, buscar todas as universidades que correspondem ao termo
      if (searchTerm.trim() !== '') {
        let query = supabase
          .from('universities')
          .select('id, name, location, logo_url, image_url, programs, description, website, address, is_featured')
          .eq('is_approved', true)
          .eq('is_featured', false) // Exclude featured universities from search results
          .ilike('name', `%${searchTerm}%`);
        if (selectedLocation !== 'all') {
          // Filtro por estado usando o campo address.state padronizado
          query = query.eq('address->>state', selectedLocation);
        }
        const { data, error } = await query;
        if (!error && data) {
          setRealUniversities(data);
          setTotalCount(data.length);
        } else {
          setRealUniversities([]);
          setTotalCount(0);
        }
        setIsLoadingUniversities(false);
        return;
      }
      // Caso contrário, busca paginada normal ou filtrada por estado
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('universities')
        .select('id, name, location, logo_url, image_url, programs, description, website, address, is_featured, type', { count: 'exact' })
        .eq('is_approved', true)
        .eq('is_featured', false) // Exclude featured universities from paginated results
        .range(from, to);
      if (selectedLocation !== 'all') {
        query = query.eq('address->>state', selectedLocation);
      }
      const { data, error, count } = await query;
      if (!error && data) {
        setRealUniversities(data);
        setTotalCount(count || 0);
      } else {
        setRealUniversities([]);
        setTotalCount(0);
      }
      setIsLoadingUniversities(false);
      setHasLoadedData(true);
    };
    fetchUniversities();
  }, [page, searchTerm, hasLoadedData, selectedLocation]);

  useEffect(() => {
    // Effect for when realUniversities change
  }, [realUniversities]);

  // Buscar todas as universidades aprovadas para montar o filtro de estados
  useEffect(() => {
    const fetchAllUniversities = async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('location, address, type')
        .eq('is_approved', true); // Include all approved universities for states filter
      if (!error && data) {
        setAllUniversities(data);
      } else {
        setAllUniversities([]);
      }
    };
    fetchAllUniversities();
  }, []);

  // Fetch featured universities
  useEffect(() => {
    const fetchFeaturedUniversities = async () => {
      try {
        const { data, error } = await supabase
          .from('universities')
          .select('*')
          .eq('is_approved', true)
          .eq('is_featured', true)
          .order('featured_order', { ascending: true })
          .limit(6);

        if (error) throw error;
        setFeaturedUniversities(data || []);
      } catch (error) {
        // Error loading featured universities
      }
    };

    fetchFeaturedUniversities();
  }, []);
  
  
  // Se ainda está carregando, mostrar loading ou nada
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#05294E] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('universitiesPage.loading', 'Carregando...')}</p>
        </div>
      </div>
    );
  }
  
  // Check if user needs to pay selection process fee (only for authenticated students)
  if (isAuthenticated && user && user.role === 'student' && userProfile && !userProfile.has_paid_selection_process_fee) {
    return <PaymentRequiredBlocker pageType="universities" />;
  }

  // Get unique states for filter a partir de allUniversities
  const states = Array.from(new Set(allUniversities.map(school => {
    // Usar o campo address.state que já está padronizado
    return school.address?.state || null;
  }))).filter(Boolean).sort();

  // Função para filtrar universidades (aplicável tanto para normais quanto featured)
  const filterUniversities = (universities: any[]) => {
    return universities.filter(school => {
      const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (school.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || school.type === selectedType;
      // Usar o campo address.state que já está padronizado
      const schoolState = school.address?.state || '';
      const matchesLocation = selectedLocation === 'all' || schoolState === selectedLocation;
      return matchesSearch && matchesType && matchesLocation;
    });
  };

  // Verificar se deve aplicar blur (usuário não logado)

  const filteredSchools = filterUniversities(realUniversities);
  const filteredFeaturedUniversities = filterUniversities(featuredUniversities);

  // Paginação só para dados reais
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Skeleton loader
  const skeletonArray = Array.from({ length: PAGE_SIZE });


  return (
    <>
      <Header />
      <div className="bg-white min-h-screen">
        {/* Hero Section */}
        <section className="relative bg-[#05294E] min-h-[600px] flex items-center overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/20 to-transparent"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 py-20 lg:py-32">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">
              {/* Content Side (Right on Desktop) */}
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                    {t('universitiesPage.header.title')}
                  </h1>
                  <p className="text-lg md:text-xl text-blue-100/80 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    {t('universitiesPage.header.subtitle')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <button 
                      onClick={() => document.getElementById('university-search')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-[#D0151C] text-white px-8 py-4 rounded-2xl hover:bg-[#B01218] transition-all duration-300 text-lg font-black shadow-xl hover:scale-105 transform inline-flex items-center justify-center gap-2"
                    >
                      Explorar Agora
                      <ArrowDown className="w-5 h-5 animate-bounce" />
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Image Side (Left on Desktop) */}
              <div className="w-full lg:w-1/2 relative">
                <motion.div
                  initial={{ opacity: 0, x: -50, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 1 }}
                  className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 group"
                >
                  <img 
                    src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/university-library-white-columns.webp" 
                    alt="Biblioteca Universitária" 
                    className="w-full h-full object-cover aspect-[4/3] lg:aspect-square group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#05294E]/40 via-transparent to-transparent"></div>
                </motion.div>

                {/* Decorative elements */}
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#D0151C]/10 rounded-full blur-3xl animate-pulse"></div>
                

              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filters */}
          <div id="university-search" className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('universitiesPage.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm"
              title={t('universitiesPage.search.filterByType', 'Filtrar por tipo de universidade')}
            >
              <option value="all">{t('universitiesPage.search.allTypes')}</option>
              <option value="Private University">{t('universitiesPage.search.private')}</option>
              <option value="Public University">{t('universitiesPage.search.public')}</option>
            </select>

            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
              }}
              className="px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm"
              title="Filtrar por estado da universidade"
            >
              <option value="all">{t('universitiesPage.search.allStates')}</option>
              {states.map((state: string) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center justify-center bg-white border border-slate-300 rounded-xl px-3 py-3">
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-[#05294E]">{filteredSchools.length}</span> {t('universitiesPage.search.universitiesCount')}
                {filteredFeaturedUniversities.length > 0 && (
                  <span className="text-sm text-slate-500 ml-2">
                    + {filteredFeaturedUniversities.length} {t('universitiesPage.search.featured')}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>


        {/* Featured Universities Section */}
        {filteredFeaturedUniversities.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                <span className="text-[#05294E]">{t('universitiesPage.featured.subtitle')}</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-6 mb-8">
              {filteredFeaturedUniversities.map((school) => (
                <div key={school.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full min-h-[480px] relative">
                  {/* Overlay de blur quando não autenticado */}
                  {!isAuthenticated && (
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
                          onClick={() => navigate(`/login${location.search}`)}
                          className="bg-[#05294E] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#05294E]/90 transition-colors"
                        >
                          {t('home.featuredUniversities.loginToView')}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Featured Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {t('universitiesPage.featured.featured')}
                    </div>
                  </div>
                  
                  {/* University Image */}
                  <div className="relative h-48 overflow-hidden flex-shrink-0">
                    {(school.image_url || school.logo_url) ? (
                      <img
                        src={school.image_url || school.logo_url}
                        alt={`${school.name} campus`}
                        className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${
                          !isAuthenticated ? 'blur-lg' : ''
                        }`}
                        onError={(e) => {
                          // Fallback para div com ícone se a imagem falhar
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallbackDiv = target.nextElementSibling as HTMLElement;
                          if (fallbackDiv) {
                            fallbackDiv.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${(school.image_url || school.logo_url) ? 'hidden' : 'flex'}`}
                      style={{ display: (school.image_url || school.logo_url) ? 'none' : 'flex' }}
                    >
                      <Building className="h-16 w-16 text-slate-400" />
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
                    <h3 className={`text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors ${
                      !isAuthenticated ? 'blur-sm' : ''
                    }`}>
                      {school.name}
                    </h3>
                    
                    {/* Location */}
                    <div className={`flex items-center text-slate-600 mb-4 ${
                      !isAuthenticated ? 'blur-sm' : ''
                    }`}>
                      <MapPin className="h-4 w-4 mr-2 text-[#05294E]" />
                      <span className="text-sm">{school.location}</span>
                    </div>

                    {/* Programs Preview */}
                    <div className="mb-6 flex-1">
                      <div className={`flex flex-wrap gap-2 ${
                        !isAuthenticated ? 'blur-sm' : ''
                      }`}>
                        {school.programs?.slice(0, 3).map((program: string, index: number) => (
                          <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                            {program}
                          </span>
                        ))}
                        {school.programs && school.programs.length > 3 && (
                          <span className="bg-[#05294E]/10 text-[#05294E] px-2 py-1 rounded-lg text-xs font-medium">
                            +{school.programs.length - 3} {t('universitiesPage.featured.more')}
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
                        {t('universitiesPage.card.learnMore')}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Universities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingUniversities ? (
            skeletonArray.map((_, idx) => (
              <div key={idx} className="bg-slate-100 animate-pulse rounded-3xl h-80" />
            ))
          ) : filteredSchools.map((school) => (
            <div key={school.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full min-h-[480px] relative">
              {/* Overlay de blur quando não autenticado */}
              {!isAuthenticated && (
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
                      onClick={() => navigate(`/login${location.search}`)}
                      className="bg-[#05294E] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#05294E]/90 transition-colors"
                    >
                      {t('home.featuredUniversities.loginToView')}
                    </button>
                  </div>
                </div>
              )}
              {/* University Image */}
              <div className="relative h-48 overflow-hidden flex-shrink-0">
                {(school.image_url || school.logo_url) ? (
                  <img
                    src={school.image_url || school.logo_url}
                    alt={`${school.name} campus`}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                      !isAuthenticated ? 'blur-lg' : ''
                    }`}
                    onError={(e) => {
                      // Fallback para div com ícone se a imagem falhar
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallbackDiv = target.nextElementSibling as HTMLElement;
                      if (fallbackDiv) {
                        fallbackDiv.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className={`w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center ${(school.image_url || school.logo_url) ? 'hidden' : 'flex'}`}
                  style={{ display: (school.image_url || school.logo_url) ? 'none' : 'flex' }}
                >
                  <Building className="h-16 w-16 text-slate-400" />
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
                <h3 className={`text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors ${
                  !isAuthenticated ? 'blur-sm' : ''
                }`}>
                  {school.name}
                </h3>
                
                {/* Location */}
                <div className={`flex items-center text-slate-600 mb-4 ${
                  !isAuthenticated ? 'blur-sm' : ''
                }`}>
                  <MapPin className="h-4 w-4 mr-2 text-[#05294E]" />
                  <span className="text-sm">{school.location}</span>
                </div>

                {/* Programs Preview */}
                <div className="mb-6 flex-1">
                  <div className={`flex flex-wrap gap-2 ${
                    !isAuthenticated ? 'blur-sm' : ''
                  }`}>
                    {school.programs?.slice(0, 3).map((program: string, index: number) => (
                      <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                        {program}
                      </span>
                    ))}
                                            {school.programs && school.programs.length > 3 && (
                          <span className="bg-[#05294E]/10 text-[#05294E] px-2 py-1 rounded-lg text-xs font-medium">
                            +{school.programs.length - 3} {t('universitiesPage.featured.more')}
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
                    {t('universitiesPage.card.learnMore')}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Paginação */}
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-bold disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0 || isLoadingUniversities}
          >
            {t('universitiesPage.pagination.previous')}
          </button>
          <span className="text-slate-600 font-medium">{t('universitiesPage.pagination.page')} {page + 1} {t('universitiesPage.pagination.of')} {Math.max(1, totalPages)}</span>
          <button
            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-bold disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1 || isLoadingUniversities}
          >
            {t('universitiesPage.pagination.next')}
          </button>
        </div>

        {filteredSchools.length === 0 && filteredFeaturedUniversities.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-600 mb-2">{t('universitiesPage.noResults.title')}</h3>
            <p className="text-slate-500">{t('universitiesPage.noResults.description')}</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-20 bg-[#05294E] rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row items-stretch relative group">
          {/* Content Side */}
          <div className="flex-1 p-12 lg:p-16 flex flex-col justify-center text-left relative z-20 bg-[#05294E] rounded-t-[3.5rem] lg:rounded-tr-none lg:rounded-l-[3.5rem]">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
              {t('universitiesPage.callToAction.title')} <span className="text-blue-400">{t('universitiesPage.callToAction.titleHighlight')}</span>
            </h2>
            <p className="text-lg text-blue-100 mb-10 max-w-xl leading-relaxed">
              {t('universitiesPage.callToAction.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/scholarships"
                className="bg-[#D0151C] text-white px-8 py-4 rounded-2xl hover:bg-[#B01218] transition-all duration-300 text-lg font-black shadow-xl hover:scale-105 transform text-center"
              >
                {t('universitiesPage.callToAction.findScholarships')}
              </Link>
              <Link 
                to="/how-it-works"
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-2xl hover:bg-white/20 transition-all duration-300 text-lg font-bold text-center"
              >
                {t('universitiesPage.callToAction.learnMore')}
              </Link>
            </div>
          </div>

          {/* Image Side */}
          <div className="w-full lg:w-[40%] relative min-h-[350px] lg:min-h-full overflow-hidden -mt-12 lg:mt-0 z-10">
            <img 
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/students-walking-university-campus-autumn.webp" 
              alt="Estudantes no campus"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            {/* Overlay gradient to blend with context */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#05294E] via-[#05294E]/40 to-transparent lg:block hidden z-10"></div>
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#05294E] via-[#05294E] to-transparent lg:hidden z-10"></div>
            <div className="absolute inset-0 bg-[#05294E]/10 lg:hidden z-10"></div>
          </div>
        </div>
      </div>
      <SmartChat />
      <Footer />
    </div>
    </>
  );
};

export default Universities;