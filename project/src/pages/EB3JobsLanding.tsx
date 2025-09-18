import React, { useState } from 'react';
import { 
  MapPin, 
  DollarSign, 
  Calendar, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Briefcase, 
  Home, 
  Utensils, 
  Package,
  Star,
  Shield,
  FileText,
  Phone,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SEOHead from '../components/SEO/SEOHead';
import { supabase } from '../lib/supabase';

interface Job {
  id: string;
  title: string;
  location: string;
  wage: string;
  filing: string;
  category: 'healthcare' | 'hospitality' | 'warehouse';
  description?: string;
  requirements?: string[];
  code: string;
}

const jobs: Job[] = [
  // Healthcare
  {
    id: '0116',
    title: 'Home Health Aid',
    location: 'VA/DC/MD',
    wage: '$17/hour',
    filing: 'September 2025',
    category: 'healthcare',
    code: '0116',
    description: 'Assists persons in need with daily living activities at home or in a care facility. Duties include housekeeping, meal preparation, transfers, bathing, dressing, medication reminders, and general companion care.',
    requirements: [
      'Ability to drive',
      'Interview required',
      'Strong English-speaking ability',
      'Female applicants preferred',
      '2 years of service/experience'
    ]
  },
  // Hospitality & Food Service
  {
    id: '0118',
    title: 'Kitchen Helper',
    location: 'Atlanta, GA',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0118',
    description: 'Assist in cooking food, prepare ingredients (washing, cleaning, cutting, peeling), clean work area, and remove trash.'
  },
  {
    id: '0120',
    title: 'Hospitality Server',
    location: 'Cincinnati, OH',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0120',
    description: 'Prepare and serve food safely, maintain clean environment, assist with setup and takedown, provide a welcoming atmosphere for guests.'
  },
  {
    id: '0121',
    title: 'Kitchen Helper',
    location: 'Cincinnati, OH',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0121'
  },
  {
    id: '0130',
    title: 'Hospitality Server',
    location: 'Akron, OH',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0130'
  },
  {
    id: '0131',
    title: 'Hospitality Server',
    location: 'Detroit, MI',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0131'
  },
  {
    id: '0132',
    title: 'Kitchen Helper',
    location: 'Detroit, MI',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0132'
  },
  {
    id: '0133',
    title: 'Hospitality Server',
    location: 'North Las Vegas, NV',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0133'
  },
  {
    id: '0134',
    title: 'Kitchen Helper',
    location: 'North Las Vegas, NV',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0134'
  },
  {
    id: '0135',
    title: 'Hospitality Server',
    location: 'Glendale, AZ',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0135'
  },
  {
    id: '0136',
    title: 'Kitchen Helper',
    location: 'Glendale, AZ',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0136'
  },
  {
    id: '0137',
    title: 'Kitchen Helper',
    location: 'Chaska, MN',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0137'
  },
  {
    id: '0138',
    title: 'Hospitality Server',
    location: 'Chaska, MN',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0138'
  },
  {
    id: '0139',
    title: 'Kitchen Helper',
    location: 'Columbus, OH',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0139'
  },
  {
    id: '0140',
    title: 'Hospitality Server',
    location: 'Columbus, OH',
    wage: '$15/hour',
    filing: 'December 2025',
    category: 'hospitality',
    code: '0140'
  },
  // Warehouse & Logistics
  {
    id: '0122',
    title: 'Industrial Upshifter',
    location: 'Cincinnati, OH',
    wage: '$14/hour',
    filing: 'December 2025',
    category: 'warehouse',
    code: '0122',
    description: 'Pick customer order items and package them for shipping.'
  },
  {
    id: '0141',
    title: 'Order Picker',
    location: 'Anaheim, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0141',
    description: 'Verify and maintain records on shipments, prepare items for shipping, assemble/stamp/ship merchandise, receive/unpack/record materials, arrange transportation.',
    requirements: ['Interview required']
  },
  {
    id: '0142',
    title: 'Order Picker',
    location: 'Baldwin Park, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0142',
    requirements: ['Interview required']
  },
  {
    id: '0143',
    title: 'Order Picker',
    location: 'City of Industry, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0143',
    requirements: ['Interview required']
  },
  {
    id: '0144',
    title: 'Order Picker',
    location: 'Colton, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0144',
    requirements: ['Interview required']
  },
  {
    id: '0145',
    title: 'Order Picker',
    location: 'El Monte, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0145',
    requirements: ['Interview required']
  },
  {
    id: '0146',
    title: 'Order Picker',
    location: 'Fresno, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0146',
    requirements: ['Interview required']
  },
  {
    id: '0147',
    title: 'Order Picker',
    location: 'Madera, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0147',
    requirements: ['Interview required']
  },
  {
    id: '0148',
    title: 'Order Picker',
    location: 'Perris, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0148',
    requirements: ['Interview required']
  },
  {
    id: '0149',
    title: 'Order Picker',
    location: 'Santa Ana, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0149',
    requirements: ['Interview required']
  },
  {
    id: '0150',
    title: 'Order Picker',
    location: 'Sun Valley, CA',
    wage: '$17/hour',
    filing: 'November 2025',
    category: 'warehouse',
    code: '0150',
    requirements: ['Interview required']
  }
];

const categoryIcons = {
  healthcare: Home,
  hospitality: Utensils,
  warehouse: Package
};

const categoryColors = {
  healthcare: 'bg-green-100 text-green-800',
  hospitality: 'bg-orange-100 text-orange-800',
  warehouse: 'bg-blue-100 text-blue-800'
};

const EB3JobsLanding: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const scrollToOffer = () => {
    const element = document.getElementById('pre-candidatura');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handleStripeCheckout = async () => {
    try {
      // Busca o token de autenticação do Supabase (opcional)
      const { data: { session } } = await supabase.auth.getSession();
      
      // Prepara headers com ou sem autenticação
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Chama a Edge Function para criar a sessão de checkout
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-eb3`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          success_url: `${window.location.origin}/eb3-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/eb3-jobs`,
          metadata: {
            source: 'eb3_jobs_landing',
            timestamp: new Date().toISOString(),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating checkout session:', errorData);
        return;
      }

      const { session_url } = await response.json();
      
      // Redireciona para o checkout do Stripe
      window.location.href = session_url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesCategory = selectedCategory === 'all' || job.category === selectedCategory;
    const matchesLocation = selectedLocation === 'all' || job.location.toLowerCase().includes(selectedLocation.toLowerCase());
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesLocation && matchesSearch;
  });

  const categories = [
    { id: 'all', name: t('eb3Jobs.jobs.filters.allJobs'), count: jobs.length },
    { id: 'healthcare', name: t('eb3Jobs.jobs.filters.healthcare'), count: jobs.filter(j => j.category === 'healthcare').length },
    { id: 'hospitality', name: t('eb3Jobs.jobs.filters.hospitality'), count: jobs.filter(j => j.category === 'hospitality').length },
    { id: 'warehouse', name: t('eb3Jobs.jobs.filters.logistics'), count: jobs.filter(j => j.category === 'warehouse').length }
  ];

  // Extrair localidades únicas
  const locations = Array.from(new Set(jobs.map(job => job.location))).sort();
  const locationOptions = [
    { id: 'all', name: t('eb3Jobs.jobs.filters.allLocations'), count: jobs.length },
    ...locations.map(location => ({
      id: location,
      name: location,
      count: jobs.filter(j => j.location === location).length
    }))
  ];

  return (
    <>
      <SEOHead 
        title="EB-3 Jobs - Work and Live Legally in the USA | MatriculaUSA"
        description="EB-3 employment opportunities for permanent residence in the USA. Jobs in healthcare, hospitality, and logistics with Green Card for you and your family."
        keywords="EB-3, Green Card, USA jobs, permanent residence, employment opportunities, immigration"
      />
      
      <div className="bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-red-50 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-96 h-96 bg-[#05294E]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#D0151C]/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 mb-8 border border-[#05294E]/20 shadow-lg"
              >
                <Briefcase className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-slate-700">{t('eb3Jobs.hero.badge')}</span>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight text-slate-900"
                dangerouslySetInnerHTML={{ __html: t('eb3Jobs.hero.title') }}
              />
              
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl mb-10 text-slate-600 leading-relaxed max-w-4xl mx-auto"
                dangerouslySetInnerHTML={{ __html: t('eb3Jobs.hero.subtitle') }}
              />

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10 max-w-4xl mx-auto"
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-100 p-2 rounded-xl flex-shrink-0">
                    <Shield className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-amber-800 mb-2">{t('eb3Jobs.hero.importantInfo.title')}</h3>
                    <ul className="text-amber-700 space-y-1 text-sm">
                      {t('eb3Jobs.hero.importantInfo.items', { returnObjects: true }).map((item: string, index: number) => (
                        <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button 
                  onClick={scrollToOffer}
                  className="group bg-[#D0151C] hover:bg-[#B01218] text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center"
                >
                  {t('eb3Jobs.hero.applyNow')}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="group bg-white border-2 border-[#05294E] text-[#05294E] px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#05294E] hover:text-white transition-all duration-300 flex items-center justify-center shadow-lg">
                  <FileText className="mr-2 h-5 w-5" />
                  {t('eb3Jobs.hero.learnMore')}
                </button>
              </motion.div>
            </div>
          </div>
        </section>


        {/* What is EB-3 Section */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
                  <Shield className="h-4 w-4 mr-2 text-[#05294E]" />
                  <span className="text-sm font-bold text-slate-700">{t('eb3Jobs.whatIsEb3.badge')}</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8" dangerouslySetInnerHTML={{ __html: t('eb3Jobs.whatIsEb3.title') }} />
                
                <div className="space-y-6">
                  {t('eb3Jobs.whatIsEb3.benefits', { returnObjects: true }).map((benefit: any, index: number) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                        index === 0 ? 'bg-[#05294E]' : 
                        index === 1 ? 'bg-[#D0151C]' : 
                        'bg-green-600'
                      }`}>
                        {index === 0 ? <CheckCircle className="h-6 w-6 text-white" /> :
                         index === 1 ? <DollarSign className="h-6 w-6 text-white" /> :
                         <MapPin className="h-6 w-6 text-white" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{benefit.title}</h3>
                        <p className="text-slate-600 leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <img
                  src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Workers in the USA"
                  className="rounded-3xl shadow-2xl w-full"
                />
                
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{t('eb3Jobs.whatIsEb3.greenCardApproved')}</div>
                      <div className="text-sm text-slate-500">{t('eb3Jobs.whatIsEb3.permanentResidence')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Jobs Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
                <Briefcase className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-slate-700">{t('eb3Jobs.jobs.badge')}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6" dangerouslySetInnerHTML={{ __html: t('eb3Jobs.jobs.title') }} />
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {t('eb3Jobs.jobs.lastUpdated')}
              </p>
            </div>

            {/* Filters */}
            <div className="mb-8">
              <div className="flex flex-col gap-6">
                {/* Category Filters */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                        selectedCategory === category.id
                          ? 'bg-[#05294E] text-white shadow-lg'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {category.name} ({category.count})
                    </button>
                  ))}
                </div>

                {/* Location and Search Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Location Filter */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-slate-700 self-center">{t('eb3Jobs.jobs.filters.location')}</span>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white min-w-[200px]"
                    >
                      {locationOptions.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.count})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t('eb3Jobs.jobs.filters.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#05294E] focus:border-transparent min-w-[250px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Jobs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => {
                const IconComponent = categoryIcons[job.category];
                const isExpanded = expandedJob === job.id;
                
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[job.category]}`}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {categories.find(c => c.id === job.category)?.name}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">#{job.code}</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{job.title}</h3>
                      
                      <div className="flex items-center text-slate-600 mb-2">
                        <MapPin className="h-4 w-4 mr-2 text-[#05294E]" />
                        <span className="text-sm">{job.location}</span>
                      </div>
                      
                      <div className="flex items-center text-slate-600 mb-2">
                        <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">{job.wage}</span>
                      </div>
                      
                      <div className="flex items-center text-slate-600 mb-4">
                        <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm">Filing: {job.filing}</span>
                      </div>

                      {job.description && (
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                          {job.description}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                          className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center"
                        >
                          {isExpanded ? t('eb3Jobs.jobs.jobCard.lessDetails') : t('eb3Jobs.jobs.jobCard.moreDetails')}
                          {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                        </button>
                        <button 
                          onClick={scrollToOffer}
                          className="bg-[#05294E] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#05294E]/90 transition-colors"
                        >
                          {t('eb3Jobs.jobs.jobCard.apply')}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-slate-200 bg-slate-50 p-6"
                        >
                          {job.description && (
                            <div className="mb-4">
                              <h4 className="font-semibold text-slate-900 mb-2">{t('eb3Jobs.jobs.jobCard.description')}</h4>
                              <p className="text-slate-600 text-sm">{job.description}</p>
                            </div>
                          )}
                          
                          {job.requirements && job.requirements.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">{t('eb3Jobs.jobs.jobCard.requirements')}</h4>
                              <ul className="space-y-1">
                                {job.requirements.map((req, index) => (
                                  <li key={index} className="text-slate-600 text-sm flex items-start">
                                    <span className="text-[#05294E] mr-2">•</span>
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {filteredJobs.length === 0 && (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('eb3Jobs.jobs.noJobsFound.title')}</h3>
                <p className="text-slate-600">{t('eb3Jobs.jobs.noJobsFound.description')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-flex items-center bg-white rounded-full px-6 py-2 mb-6 shadow-lg border border-slate-200">
                <span className="text-sm font-bold text-slate-700">{t('eb3Jobs.benefits.badge')}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6" dangerouslySetInnerHTML={{ __html: t('eb3Jobs.benefits.title') }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {t('eb3Jobs.benefits.items', { returnObjects: true }).map((benefit: any, index: number) => (
                <div key={index} className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                    index === 0 ? 'bg-green-100' : 
                    index === 1 ? 'bg-blue-100' : 
                    index === 2 ? 'bg-orange-100' : 
                    'bg-purple-100'
                  }`}>
                    {index === 0 ? <CheckCircle className="h-8 w-8 text-green-600" /> :
                     index === 1 ? <DollarSign className="h-8 w-8 text-blue-600" /> :
                     index === 2 ? <MapPin className="h-8 w-8 text-orange-600" /> :
                     <Users className="h-8 w-8 text-purple-600" />}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                  <p className="text-slate-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6" dangerouslySetInnerHTML={{ __html: t('eb3Jobs.howItWorks.title') }} />
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {t('eb3Jobs.howItWorks.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {t('eb3Jobs.howItWorks.steps', { returnObjects: true }).map((step: any, index: number) => (
                <div key={index} className="text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${
                    index === 0 ? 'bg-[#05294E]' : 
                    index === 1 ? 'bg-[#D0151C]' : 
                    'bg-green-600'
                  }`}>
                    <span className="text-2xl font-bold text-white">{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Offer Section */}
        <section id="pre-candidatura" className="py-24 bg-gradient-to-br from-[#05294E] via-[#1E3A8A] to-[#1E40AF] relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/3 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Text Section */}
              <div className="lg:col-span-3 text-white">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-4"
                >
                  <div className="text-sm font-bold uppercase tracking-wider text-white/90">
                    {t('eb3Jobs.offer.title')}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black leading-tight">
                    {t('eb3Jobs.offer.subtitle')}
                  </h2>
                </motion.div>
              </div>

              {/* Central White Card */}
              <div className="lg:col-span-6">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-white rounded-3xl shadow-2xl p-8 relative border border-white/20 backdrop-blur-sm"
                >
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent rounded-3xl pointer-events-none"></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Logo/Header */}
                    <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#05294E] to-[#D0151C] rounded-2xl mb-4">
                      <Briefcase className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-[#05294E] mb-2">
                      {t('eb3Jobs.offer.card.title')}
                    </h3>
                    <div className="w-16 h-1 bg-[#05294E] mx-auto"></div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    {t('eb3Jobs.offer.card.features', { returnObjects: true }).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-[#05294E] flex-shrink-0" />
                        <span className="text-[#05294E] font-semibold">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-6">
                    <div className="text-gray-400 line-through text-lg mb-2">
                      {t('eb3Jobs.offer.card.pricing.originalPrice')}
                    </div>
                    <div className="text-4xl md:text-5xl font-black text-[#05294E] mb-2">
                      {t('eb3Jobs.offer.card.pricing.currentPrice')}
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-[#05294E] text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{t('eb3Jobs.offer.card.pricing.guarantee')}</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="text-center mb-6">
                    <button 
                      onClick={handleStripeCheckout}
                      className="bg-green-500 hover:bg-green-600 text-white font-black text-lg px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      {t('eb3Jobs.offer.card.signUpNow')}
                    </button>
                  </div>

                  {/* Security Icons */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-6 w-6 text-[#05294E]" />
                      </div>
                      <div className="text-xs text-gray-600 font-medium">{t('eb3Jobs.offer.card.security.secureCheckout')}</div>
                    </div>
                    <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Star className="h-6 w-6 text-[#05294E]" />
                      </div>
                      <div className="text-xs text-gray-600 font-medium">{t('eb3Jobs.offer.card.security.satisfactionGuaranteed')}</div>
                    </div>
                    <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-6 w-6 text-[#05294E]" />
                      </div>
                      <div className="text-xs text-gray-600 font-medium">{t('eb3Jobs.offer.card.security.protectedPrivacy')}</div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-3">{t('eb3Jobs.offer.card.paymentMethods')}</div>
                    <div className="flex flex-wrap justify-center items-center gap-3">
                      {t('eb3Jobs.offer.card.methods', { returnObjects: true }).map((method: string, index: number) => (
                        <div key={index} className="bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-700">{method}</div>
                      ))}
                    </div>
                  </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Dark Red Card */}
              <div className="lg:col-span-3">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-3xl shadow-2xl p-6 border border-white/10"
                >
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="bg-[#05294E] w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white">
                      {t('eb3Jobs.offer.guarantee.title')}
                    </h3>
                  </div>
                  
                  <p className="text-white text-sm leading-relaxed">
                    {t('eb3Jobs.offer.guarantee.description')}
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-[#05294E]/10 rounded-full px-6 py-2 mb-6">
                <FileText className="h-4 w-4 mr-2 text-[#05294E]" />
                <span className="text-sm font-bold text-slate-700">{t('eb3Jobs.faq.badge')}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6" dangerouslySetInnerHTML={{ __html: t('eb3Jobs.faq.title') }} />
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {t('eb3Jobs.faq.subtitle')}
              </p>
            </div>

            <div className="space-y-4">
              {t('eb3Jobs.faq.questions', { returnObjects: true }).map((faq: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedJob(expandedJob === `faq-${index}` ? null : `faq-${index}`)}
                    className="w-full p-6 text-left hover:bg-slate-50 transition-colors duration-200 flex items-center justify-between"
                  >
                    <h3 className="text-lg font-bold text-slate-900 pr-4">
                      {faq.question}
                    </h3>
                    <div className="flex-shrink-0">
                      {expandedJob === `faq-${index}` ? (
                        <ChevronUp className="h-5 w-5 text-[#05294E]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[#05294E]" />
                      )}
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedJob === `faq-${index}` && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-slate-200 bg-slate-50"
                      >
                        <div className="p-6">
                          <p className="text-slate-600 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-[#05294E] text-white relative overflow-hidden">
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-8">
              <Briefcase className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">{t('eb3Jobs.cta.badge')}</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight" dangerouslySetInnerHTML={{ __html: t('eb3Jobs.cta.title') }} />
            
            <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {t('eb3Jobs.cta.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={scrollToOffer}
                className="group bg-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              >
                {t('eb3Jobs.cta.applyNow')}
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => window.open('https://wa.me/12136762544', '_blank')}
                className="group bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-white hover:text-[#05294E] transition-all duration-300 flex items-center justify-center"
              >
                <Phone className="mr-3 h-6 w-6" />
                {t('eb3Jobs.cta.contactUs')}
              </button>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center text-blue-100">
              {t('eb3Jobs.cta.features', { returnObjects: true }).map((feature: string, index: number) => (
                <div key={index} className="flex items-center text-sm">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default EB3JobsLanding;
// EB3JobsLanding component
