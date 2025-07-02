import React, { useState, useMemo } from 'react';
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
  Users
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
  const { isAuthenticated, userProfile, user } = useAuth();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useCartStore();

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
    return scholarships.filter(scholarship => {
      const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scholarship.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (scholarship.universities?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = selectedLevel === 'all' || (scholarship.level && scholarship.level === selectedLevel);
      const matchesField = selectedField === 'all' || (scholarship.field_of_study || '').toLowerCase().includes(selectedField.toLowerCase());
      return matchesSearch && matchesLevel && matchesField;
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
  }, [scholarships, searchTerm, selectedLevel, selectedField, sortBy]);

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search scholarships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            />
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by academic level"
          >
            <option value="all">All Levels</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
            <option value="postgraduate">Postgraduate</option>
          </select>

          {/* Field Filter */}
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Filter by field of study"
          >
            <option value="all">All Fields</option>
            <option value="stem">STEM</option>
            <option value="business">Business</option>
            <option value="engineering">Engineering</option>
            <option value="any">Any Field</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            title="Sort scholarships by"
          >
            <option value="deadline">Sort by Deadline</option>
            <option value="amount">Sort by Amount</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            <span className="font-medium text-blue-600">{filteredScholarships.length}</span> scholarships found
          </span>
        </div>
      </div>

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleScholarships.map((scholarship) => {
          const deadlineStatus = getDeadlineStatus(scholarship.deadline);
          const alreadyApplied = appliedScholarshipIds.has(scholarship.id);
          const inCart = cartScholarshipIds.has(scholarship.id);
          return (
            <div key={scholarship.id} className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-200 hover:-translate-y-2 flex flex-col h-full">
              {/* Scholarship Image - Container com altura fixa para uniformidade */}
              <div className="relative h-48 overflow-hidden flex-shrink-0">
                {scholarship.image_url ? (
                  <>
                    <img
                      src={scholarship.image_url}
                      alt={scholarship.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </>
                ) : (
                  // Placeholder para cards sem imagem com mesmo tamanho
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-slate-400" />
                  </div>
                )}
                {/* Exclusive Badge sempre no mesmo lugar */}
                {scholarship.is_exclusive && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-[#D0151C] text-white px-3 py-1 rounded-xl text-xs font-bold shadow-lg">
                      Exclusive
                    </span>
                  </div>
                )}
              </div>
              
              {/* Card Content - Flexível para ocupar espaço disponível */}
              <div className="p-6 flex-1 flex flex-col">
                {/* Title and University - Seção fixa no topo */}
                <div className="mb-4">
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
                  <div className="flex items-center text-slate-600">
                    <Building className="h-4 w-4 mr-2 text-[#05294E]" />
                    <span className="text-xs font-semibold mr-1">University:</span>
                    <span className={`text-sm select-none ${!userProfile?.has_paid_selection_process_fee ? 'blur-sm' : ''}`}>{scholarship.universities?.name || 'Unknown University'}</span>
                  </div>
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

                {/* Details - Conteúdo flexível que ocupa espaço disponível */}
                <div className="space-y-2 flex-1">
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

                {/* Action Button - Sempre na parte inferior */}
                <div className="mt-6 pt-4 border-t border-slate-100">
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
          <p className="text-slate-500 text-lg mb-8">Try adjusting your search criteria to discover more opportunities</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedLevel('all');
              setSelectedField('all');
            }}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 transition-all duration-300 font-bold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ScholarshipBrowser;