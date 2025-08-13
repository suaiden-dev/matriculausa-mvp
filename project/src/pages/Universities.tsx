import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Sparkles, Building, GraduationCap, ChevronRight, Globe, ArrowRight, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import SmartChat from '../components/SmartChat';
import { slugify } from '../utils/slugify';

const PAGE_SIZE = 20;

const Universities: React.FC = () => {

  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [realUniversities, setRealUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [allUniversities, setAllUniversities] = useState<any[]>([]);
  const [featuredUniversities, setFeaturedUniversities] = useState<any[]>([]);

  useEffect(() => {
    const fetchUniversities = async () => {
      if (!hasLoadedData || searchTerm.trim() !== '' || selectedLocation !== 'all') {
        setLoading(true);
      }
      // Se estiver pesquisando, buscar todas as universidades que correspondem ao termo
      if (searchTerm.trim() !== '') {
        setSearching(true);
        let query = supabase
          .from('universities')
          .select('id, name, location, logo_url, programs, description, website, address, is_featured')
          .eq('is_approved', true)
          .eq('is_featured', false) // Exclude featured universities from search results
          .ilike('name', `%${searchTerm}%`);
        if (selectedLocation !== 'all') {
          // Filtro por estado no address.street ou location
          query = query.or(`address->>street.ilike.%${selectedLocation}%,location.ilike.%${selectedLocation}%`);
        }
        const { data, error } = await query;
        if (!error && data) {
          setRealUniversities(data);
          setTotalCount(data.length);
        } else {
          setRealUniversities([]);
          setTotalCount(0);
        }
        setLoading(false);
        setSearching(false);
        return;
      }
      // Caso contrário, busca paginada normal ou filtrada por estado
      setSearching(false);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('universities')
        .select('id, name, location, logo_url, programs, description, website, address, is_featured', { count: 'exact' })
        .eq('is_approved', true)
        .eq('is_featured', false) // Exclude featured universities from paginated results
        .range(from, to);
      if (selectedLocation !== 'all') {
        query = query.or(`address->>street.ilike.%${selectedLocation}%,location.ilike.%${selectedLocation}%`);
      }
      const { data, error, count } = await query;
      if (!error && data) {
        setRealUniversities(data);
        setTotalCount(count || 0);
      } else {
        setRealUniversities([]);
        setTotalCount(0);
      }
      setLoading(false);
      setHasLoadedData(true);
    };
    fetchUniversities();
  }, [page, searchTerm, hasLoadedData, selectedLocation]);

  useEffect(() => {
    console.log('Universidades carregadas:', realUniversities);
    console.log('Locations carregados:', realUniversities.map(u => u.location));
    console.log('Addresses carregados:', realUniversities.map(u => u.address));
  }, [realUniversities]);

  // Buscar todas as universidades aprovadas para montar o filtro de estados
  useEffect(() => {
    const fetchAllUniversities = async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('location, address')
        .eq('is_approved', true)
        .eq('is_featured', false); // Exclude featured universities from states filter
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
        console.error('Error loading featured universities:', error);
      }
    };

    fetchFeaturedUniversities();
  }, []);

  // Get unique states for filter a partir de allUniversities
  const states = Array.from(new Set(allUniversities.map(school => {
    // Tenta extrair o estado do address.street
    const street = school.address?.street || '';
    let state = null;
    if (street) {
      const parts = street.split(',');
      if (parts.length >= 3) {
        state = parts[parts.length - 2].trim();
      } else if (parts.length === 2) {
        state = parts[1].trim().split(' ')[0];
      }
    }
    if (!state) {
      const loc = school.location || '';
      const locParts = loc.split(',');
      state = locParts.length > 1 ? locParts[1].trim() : null;
    }
    return state;
  }))).filter(Boolean).sort();
  console.log('Estados disponíveis para filtro:', states);

  const filteredSchools = realUniversities.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (school.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || school.type === selectedType;
    // Extrai o estado do address.street para filtrar
    let schoolState = '';
    const street = school.address?.street || '';
    if (street) {
      const parts = street.split(',');
      if (parts.length >= 3) {
        schoolState = parts[parts.length - 2].trim().toLowerCase();
      } else if (parts.length === 2) {
        schoolState = parts[1].trim().split(' ')[0].toLowerCase();
      }
    }
    if (!schoolState) {
      const loc = school.location || '';
      const locParts = loc.split(',');
      schoolState = locParts.length > 1 ? locParts[1].trim().toLowerCase() : '';
    }
    const matchesLocation = selectedLocation === 'all' || schoolState === selectedLocation.toLowerCase();
    return matchesSearch && matchesType && matchesLocation;
  });

  // Paginação só para dados reais
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Skeleton loader
  const skeletonArray = Array.from({ length: PAGE_SIZE });

  const handleAccept = async () => {
    // ... update terms_accepted to true ...
    window.location.href = '/school/dashboard';
  };

  return (
    <>
      <Header />
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-[#05294E] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1 mb-6">
              <Sparkles className="h-3 w-3 mr-2 text-white" />
              <span className="text-xs font-medium text-white">Partner Universities</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              <span className="text-white">American</span>
              <br />
              <span className="text-[#D0151C]">Universities</span>
            </h1>
            
            <p className="text-lg text-slate-200 max-w-2xl mx-auto">
              Discover world-class institutions offering exceptional education and scholarship opportunities.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search universities..."
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
              title="Filtrar por tipo de universidade"
            >
              <option value="all">All Types</option>
              <option value="Private">Private</option>
              <option value="Public">Public</option>
            </select>

            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                console.log('Estado selecionado:', e.target.value);
              }}
              className="px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm"
              title="Filtrar por estado da universidade"
            >
              <option value="all">All States</option>
              {states.map((state: string) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center justify-center bg-white border border-slate-300 rounded-xl px-3 py-3">
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-[#05294E]">{filteredSchools.length}</span> universities
                {featuredUniversities.length > 0 && (
                  <span className="text-sm text-slate-500 ml-2">
                    + {featuredUniversities.length} featured
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Featured Universities Section */}
        {featuredUniversities.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-4">
                <Star className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-[#05294E]">Featured Universities</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                <span className="text-[#05294E]">Weekly</span> Highlights
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Discover the universities selected by our experts for you
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {featuredUniversities.map((school) => (
                <div key={school.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full min-h-[480px] relative">
                  {/* Featured Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Featured
                    </div>
                  </div>
                  
                  {/* University Image */}
                  <div className="relative h-48 overflow-hidden flex-shrink-0">
                    <img
                      src={school.logo_url || school.image || '/university-placeholder.png'}
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
                        {school.programs?.slice(0, 3).map((program: string, index: number) => (
                          <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                            {program}
                          </span>
                        ))}
                        {school.programs && school.programs.length > 3 && (
                          <span className="bg-[#05294E]/10 text-[#05294E] px-2 py-1 rounded-lg text-xs font-medium">
                            +{school.programs.length - 3} more
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
                        Learn More
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            skeletonArray.map((_, idx) => (
              <div key={idx} className="bg-slate-100 animate-pulse rounded-3xl h-80" />
            ))
          ) : filteredSchools.map((school) => (
            <div key={school.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full min-h-[480px]">
              {/* University Image */}
              <div className="relative h-48 overflow-hidden flex-shrink-0">
                <img
                  src={school.logo_url || school.image || '/university-placeholder.png'}
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
                    {school.programs?.slice(0, 3).map((program: string, index: number) => (
                      <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                        {program}
                      </span>
                    ))}
                    {school.programs && school.programs.length > 3 && (
                      <span className="bg-[#05294E]/10 text-[#05294E] px-2 py-1 rounded-lg text-xs font-medium">
                        +{school.programs.length - 3} more
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
                    Learn More
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
            disabled={page === 0 || loading}
          >
            Previous
          </button>
          <span className="text-slate-600 font-medium">Page {page + 1} of {Math.max(1, totalPages)}</span>
          <button
            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-bold disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || loading}
          >
            Next
          </button>
        </div>

        {filteredSchools.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-600 mb-2">No universities found</h3>
            <p className="text-slate-500">Try adjusting your search criteria</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 bg-[#05294E] rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">
            Ready to Apply to Your <span className="text-[#D0151C]">Dream University?</span>
          </h2>
          <p className="text-sm text-slate-200 mb-6 max-w-2xl mx-auto">
            Start your journey with our AI-powered platform and unlock exclusive scholarship opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              to="/scholarships"
              className="bg-[#D0151C] text-white px-6 py-2 rounded-lg hover:bg-[#B01218] transition-all duration-300 text-sm font-medium"
            >
              Find Scholarships
            </Link>
            <Link 
              to="/how-it-works"
              className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all duration-300 text-sm font-medium"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
      <SmartChat />
    </div>
    </>
  );
};

export default Universities;