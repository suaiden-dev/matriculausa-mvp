import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Award, 
  Building, 
  Calendar, 
  DollarSign, 
  Clock, 
  Target, 
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Eye,
  Heart,
  GraduationCap,
  Users,
  List,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useCartStore } from '../../stores/applicationStore';
import { supabase } from '../../lib/supabase';
import { STRIPE_PRODUCTS } from '../../stripe-config';

interface ScholarshipBrowserProps {
  scholarships: any[];
  applications: any[];
  onApplyScholarship: (scholarshipId: string) => void;
}

const ScholarshipBrowser: React.FC<ScholarshipBrowserProps> = ({
  scholarships,
  applications,
  onApplyScholarship
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { isAuthenticated, userProfile, user } = useAuth();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useCartStore();
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Refresh automático apenas uma vez após o pagamento
    if (!localStorage.getItem('scholarship_browser_refreshed')) {
      localStorage.setItem('scholarship_browser_refreshed', 'true');
      window.location.reload();
    }
  }, []);

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

  // Memoização dos filtros e ordenação
  const filteredScholarships = useMemo(() => {
    // Busca por múltiplas palavras-chave
    const searchWords = debouncedSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return scholarships.filter(scholarship => {
      // Busca por palavras-chave
      const text = `${scholarship.title} ${scholarship.description || ''} ${(scholarship.universities?.name || '')}`.toLowerCase();
      const matchesSearch = searchWords.every(word => text.includes(word));
      // Filtro de nível
      const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level === selectedLevel);
      // Filtro de área
      const matchesField = selectedField === 'all' || (scholarship.field_of_study || '').toLowerCase().includes(selectedField.toLowerCase());
      // Filtro de valor
      const value = scholarship.annual_value_with_scholarship ?? 0;
      const matchesMin = !minValue || value >= Number(minValue);
      const matchesMax = !maxValue || value <= Number(maxValue);
      // Filtro de deadline
      const daysLeft = getDaysUntilDeadline(scholarship.deadline);
      const matchesDeadline = !deadlineDays || daysLeft <= Number(deadlineDays);
      return matchesSearch && matchesLevel && matchesField && matchesMin && matchesMax && matchesDeadline;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [scholarships, debouncedSearch, selectedLevel, selectedField, minValue, maxValue, deadlineDays, sortBy]);

  // Memoização dos IDs aplicados e no carrinho
  const appliedScholarshipIds = useMemo(() => new Set(applications.map(app => app.scholarship_id)), [applications]);
  const cartScholarshipIds = useMemo(() => new Set(cart.map(s => s.scholarships.id)), [cart]);

  const handleAddToCart = (scholarship: any) => {
    if (user) {
      addToCart(scholarship, user.id);
    } else {
      console.error("User not authenticated to add items to cart");
    }
  };

  // Exibir apenas bolsas com deadline hoje ou futuro
  const today = new Date();
  today.setHours(0,0,0,0);
  const visibleScholarships = filteredScholarships.filter(s => {
    const deadlineDate = new Date(s.deadline);
    return deadlineDate >= today;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Find Scholarships</h2>
          <p className="text-slate-600">Discover opportunities tailored to your academic profile</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 items-center">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search scholarships..."
              value={searchTerm}
              aria-label="Search scholarships"
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
                debounceTimeout.current = setTimeout(() => setDebouncedSearch(e.target.value), 400);
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            />
          </div>
          {/* Level Filter */}
          <label htmlFor="level-filter" className="sr-only">Academic Level</label>
          <select
            id="level-filter"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by academic level"
            aria-label="Filter by academic level"
          >
            <option value="all">All Levels</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
            <option value="postgraduate">Postgraduate</option>
          </select>
          {/* Field Filter */}
          <label htmlFor="field-filter" className="sr-only">Field of Study</label>
          <select
            id="field-filter"
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by field of study"
            aria-label="Filter by field of study"
          >
            <option value="all">All Fields</option>
            <option value="stem">STEM</option>
            <option value="business">Business</option>
            <option value="engineering">Engineering</option>
            <option value="any">Any Field</option>
          </select>
          {/* Value Filter */}
          <label htmlFor="min-value" className="sr-only">Minimum Value</label>
          <input
            id="min-value"
            type="number"
            placeholder="Min value"
            value={minValue}
            onChange={e => setMinValue(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            aria-label="Minimum value"
          />
          <label htmlFor="max-value" className="sr-only">Maximum Value</label>
          <input
            id="max-value"
            type="number"
            placeholder="Max value"
            value={maxValue}
            onChange={e => setMaxValue(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            aria-label="Maximum value"
          />
          {/* Deadline Filter */}
          <label htmlFor="deadline-days" className="sr-only">Deadline in days</label>
          <input
            id="deadline-days"
            type="number"
            placeholder="Deadline (days)"
            value={deadlineDays}
            onChange={e => setDeadlineDays(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            aria-label="Deadline in days"
          />
          {/* View Mode Toggle */}
          <div className="flex gap-2 justify-end md:col-span-1">
            <button
              className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
              onClick={() => setViewMode('list')}
              title="List view"
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tags de filtros ativos */}
        <div className="flex flex-wrap gap-2 mb-2">
          {debouncedSearch && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">Search: {debouncedSearch}</span>}
          {selectedLevel !== 'all' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">Level: {selectedLevel}</span>}
          {selectedField !== 'all' && <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">Field: {selectedField}</span>}
          {minValue && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">Min: {minValue}</span>}
          {maxValue && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">Max: {maxValue}</span>}
          {deadlineDays && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs">Deadline: {deadlineDays} days</span>}
        </div>

        {/* Botão Clear Filters sempre visível se algum filtro ativo */}
        {(debouncedSearch || selectedLevel !== 'all' || selectedField !== 'all' || minValue || maxValue || deadlineDays) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearch('');
              setSelectedLevel('all');
              setSelectedField('all');
              setMinValue('');
              setMaxValue('');
              setDeadlineDays('');
            }}
            className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold mb-4 hover:bg-slate-300 transition-all duration-200"
          >
            Clear filters
          </button>
        )}

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            <span className="font-medium text-blue-600">{filteredScholarships.length}</span> scholarships found
          </span>
        </div>
      </div>

      {/* Scholarships Grid/List */}
      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-4"}>
        {visibleScholarships.map((scholarship) => {
          const deadlineStatus = getDeadlineStatus(scholarship.deadline);
          const alreadyApplied = appliedScholarshipIds.has(scholarship.id);
          const inCart = cartScholarshipIds.has(scholarship.id);
          return (
            <div
              key={scholarship.id}
              className={
                viewMode === 'grid'
                  ? "group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full"
                  : "group relative bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-200 flex flex-row items-center p-4"
              }
            >
              {/* Scholarship Image */}
              <div className={viewMode === 'grid' ? "relative h-48 overflow-hidden flex-shrink-0" : "w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden mr-6"}>
                {scholarship.image_url ? (
                  <img
                    src={scholarship.image_url}
                    alt={scholarship.title}
                    className={viewMode === 'grid' ? "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" : "w-full h-full object-cover"}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-slate-400" />
                  </div>
                )}
                {scholarship.is_exclusive && (
                  <div className={viewMode === 'grid' ? "absolute top-4 right-4" : "absolute top-2 right-2"}>
                    <span className="bg-[#D0151C] text-white px-3 py-1 rounded-xl text-xs font-bold shadow-lg">
                      Exclusive
                    </span>
                  </div>
                )}
              </div>
              {/* Card Content */}
              <div className={viewMode === 'grid' ? "p-6 flex-1 flex flex-col" : "flex-1 flex flex-col justify-between min-h-[120px]"}>
                {/* Title and University */}
                <div className={viewMode === 'grid' ? "mb-4" : "mb-2"}>
                  <h3 className={viewMode === 'grid' ? "text-xl font-bold text-slate-900 mb-3 leading-tight line-clamp-2 group-hover:text-[#05294E] transition-colors" : "text-lg font-bold text-slate-900 mb-1 leading-tight group-hover:text-[#05294E] transition-colors"}>
                    {scholarship.title}
                  </h3>
                  <div className="flex items-center mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${getFieldBadgeColor(scholarship.field_of_study)}`}>
                      {scholarship.field_of_study || 'Any Field'}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Building className="h-4 w-4 mr-2 text-[#05294E]" />
                    <span className="text-xs font-semibold mr-1">University:</span>
                    <span className={`text-sm select-none ${!userProfile?.has_paid_selection_process_fee ? 'blur-sm' : ''}`}>{scholarship.universities?.name || 'Unknown University'}</span>
                  </div>
                </div>
                {/* Financial Values Section */}
                <div className={viewMode === 'grid' ? "mb-4" : "mb-2"}>
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
                <div className={viewMode === 'grid' ? "space-y-2 flex-1" : "flex flex-row gap-6 mb-2"}>
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
                {/* Action Button */}
                <div className={viewMode === 'grid' ? "mt-6 pt-4 border-t border-slate-100" : "mt-2"}>
                  <button
                    className={`w-full py-3 px-4 rounded-xl transition-all duration-200 font-semibold flex items-center justify-center ${
                      inCart ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${alreadyApplied ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : ''}`}
                    onClick={async () => {
                      if (!userProfile?.has_paid_selection_process_fee) {
                        // Acionar StripeCheckout para selection_process com o price_id correto
                        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-selection-process-fee`;
                        const { data: sessionData } = await supabase.auth.getSession();
                        const token = sessionData.session?.access_token;
                        const response = await fetch(apiUrl, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            price_id: STRIPE_PRODUCTS.selectionProcess.priceId,
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
                      } else {
                        // Comportamento normal: adicionar/remover do carrinho
                        if (inCart) {
                          if (user) removeFromCart(scholarship.id, user.id);
                        } else {
                          handleAddToCart(scholarship);
                        }
                      }
                    }}
                    disabled={alreadyApplied}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    <span>{alreadyApplied ? 'Already Applied' : inCart ? 'Deselect' : 'Select Scholarship'}</span>
                    {!alreadyApplied && <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                  </button>
                </div>
              </div>
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
          <p className="text-slate-500 text-lg mb-8">Try adjusting your search criteria or clear filters to discover more opportunities.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearch('');
              setSelectedLevel('all');
              setSelectedField('all');
              setMinValue('');
              setMaxValue('');
              setDeadlineDays('');
            }}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 transition-all duration-300 font-bold"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ScholarshipBrowser;