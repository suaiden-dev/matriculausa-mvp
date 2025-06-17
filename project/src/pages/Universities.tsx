import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Sparkles, Building, GraduationCap, ChevronRight, Globe, ArrowRight } from 'lucide-react';
import { mockSchools } from '../data/mockData';
import { supabase } from '../lib/supabase';

const Universities: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [realUniversities, setRealUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUniversities = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('is_approved', true);
      if (!error && data) {
        setRealUniversities(data);
      } else {
        setRealUniversities([]);
      }
      setLoading(false);
    };
    fetchUniversities();
  }, []);

  // Merge mock and real universities, prioritizing real if IDs overlap
  const realIds = new Set(realUniversities.map(u => u.id));
  const mergedUniversities = [
    ...realUniversities,
    ...mockSchools.filter(mock => !realIds.has(mock.id)),
  ];

  // Get unique locations for filter
  const locations = Array.from(new Set(mergedUniversities.map(school => school.location?.split(', ')[1]))).filter(Boolean).sort();

  const filteredSchools = mergedUniversities.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (school.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || school.type === selectedType;
    const matchesLocation = selectedLocation === 'all' || (school.location || '').includes(selectedLocation);
    return matchesSearch && matchesType && matchesLocation;
  });

  const handleAccept = async () => {
    // ... update terms_accepted to true ...
    window.location.href = '/school/dashboard';
  };

  return (
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
            >
              <option value="all">All Types</option>
              <option value="Private">Private</option>
              <option value="Public">Public</option>
            </select>

            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-300 text-sm"
            >
              <option value="all">All States</option>
              {locations.map((location: string) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center justify-center bg-white border border-slate-300 rounded-xl px-3 py-3">
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-[#05294E]">{filteredSchools.length}</span> universities
              </span>
            </div>
          </div>
        </div>

        {/* Universities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-500">Loading universities...</div>
          ) : filteredSchools.map((school) => (
            <div key={school.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2">
              {/* University Image */}
              <div className="relative h-48 overflow-hidden">
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
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors">
                  {school.name}
                </h3>
                
                {/* Location */}
                <div className="flex items-center text-slate-600 mb-4">
                  <MapPin className="h-4 w-4 mr-2 text-[#05294E]" />
                  <span className="text-sm">{school.location}</span>
                </div>

                {/* Programs Preview */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </div>

                {/* Learn More Button */}
                <Link
                  to={`/schools/${school.id}`}
                  className="w-full bg-gradient-to-r from-[#05294E] to-slate-700 text-white py-3 px-4 rounded-2xl hover:from-[#05294E]/90 hover:to-slate-600 transition-all duration-300 font-bold text-sm flex items-center justify-center group-hover:shadow-xl transform group-hover:scale-105"
                >
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default Universities;