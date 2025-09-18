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
    { id: 'all', name: 'Todas as Vagas', count: jobs.length },
    { id: 'healthcare', name: 'Saúde', count: jobs.filter(j => j.category === 'healthcare').length },
    { id: 'hospitality', name: 'Hospitalidade', count: jobs.filter(j => j.category === 'hospitality').length },
    { id: 'warehouse', name: 'Logística', count: jobs.filter(j => j.category === 'warehouse').length }
  ];

  // Extrair localidades únicas
  const locations = Array.from(new Set(jobs.map(job => job.location))).sort();
  const locationOptions = [
    { id: 'all', name: 'Todas as Localidades', count: jobs.length },
    ...locations.map(location => ({
      id: location,
      name: location,
      count: jobs.filter(j => j.location === location).length
    }))
  ];

  return (
    <>
      <SEOHead 
        title="Vagas EB-3 - Trabalhe e Viva Legalmente nos EUA | MatriculaUSA"
        description="Oportunidades de emprego EB-3 para residência permanente nos EUA. Vagas em saúde, hospitalidade e logística com Green Card para você e sua família."
        keywords="EB-3, Green Card, trabalho EUA, residência permanente, vagas emprego, imigração"
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
                <span className="text-sm font-bold text-slate-700">Oportunidades de Emprego EB-3</span>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight text-slate-900"
              >
                Trabalhe e Viva <span className="text-[#05294E]">Legalmente</span> nos EUA
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl md:text-2xl mb-10 text-slate-600 leading-relaxed max-w-4xl mx-auto"
              >
                Múltiplas oportunidades de emprego em indústrias essenciais nos EUA através do programa <strong>EB-3</strong>, 
                que oferece <strong>residência permanente (Green Card)</strong> para você e sua família.
              </motion.p>

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
                    <h3 className="text-lg font-bold text-amber-800 mb-2">Informações Importantes</h3>
                    <ul className="text-amber-700 space-y-1 text-sm">
                      <li>• Estas vagas <strong>não são garantidas</strong> e a colocação só é confirmada após sermos contratados</li>
                      <li>• As posições preenchem rapidamente</li>
                      <li>• Todos os salários listados são os <strong>valores mínimos estabelecidos pelo PWD</strong></li>
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
                  Aplicar Agora
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="group bg-white border-2 border-[#05294E] text-[#05294E] px-8 py-4 rounded-2xl text-lg font-bold hover:bg-[#05294E] hover:text-white transition-all duration-300 flex items-center justify-center shadow-lg">
                  <FileText className="mr-2 h-5 w-5" />
                  Saiba Mais
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
                  <span className="text-sm font-bold text-slate-700">O que é EB-3?</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8">
                  Residência Permanente através do <span className="text-[#05294E]">Trabalho</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-[#05294E] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Green Card Permanente</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Residência permanente para você e sua família através de emprego qualificado.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-[#D0151C] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Salários Competitivos</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Remuneração estável e competitiva em indústrias essenciais dos EUA.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-green-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Nacional</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Oportunidades disponíveis em múltiplos estados dos Estados Unidos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <img
                  src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Trabalhadores nos EUA"
                  className="rounded-3xl shadow-2xl w-full"
                />
                
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-600 w-12 h-12 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Green Card Aprovado</div>
                      <div className="text-sm text-slate-500">Residência Permanente</div>
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
                <span className="text-sm font-bold text-slate-700">Vagas Disponíveis</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                Lista de <span className="text-[#05294E]">Oportunidades</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Última atualização: 8 de setembro de 2025
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
                    <span className="text-sm font-medium text-slate-700 self-center">Localidade:</span>
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
                      placeholder="Buscar vagas..."
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
                          {isExpanded ? 'Menos' : 'Mais'} Detalhes
                          {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                        </button>
                        <button 
                          onClick={scrollToOffer}
                          className="bg-[#05294E] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#05294E]/90 transition-colors"
                        >
                          Aplicar
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
                              <h4 className="font-semibold text-slate-900 mb-2">Descrição:</h4>
                              <p className="text-slate-600 text-sm">{job.description}</p>
                            </div>
                          )}
                          
                          {job.requirements && job.requirements.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">Requisitos:</h4>
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
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhuma vaga encontrada</h3>
                <p className="text-slate-600">Tente ajustar os filtros ou termo de busca.</p>
              </div>
            )}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <div className="inline-flex items-center bg-white rounded-full px-6 py-2 mb-6 shadow-lg border border-slate-200">
                <span className="text-sm font-bold text-slate-700">Benefícios do Programa EB-3</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                Por que escolher o <span className="text-[#05294E]">EB-3</span>?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 text-center">
                <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Residência Permanente</h3>
                <p className="text-slate-600">Green Card para você e sua família</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Salários Estáveis</h3>
                <p className="text-slate-600">Remuneração competitiva e estável</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MapPin className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Múltiplos Estados</h3>
                <p className="text-slate-600">Oportunidades em todo o país</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Crescimento Profissional</h3>
                <p className="text-slate-600">Estabilidade e crescimento de carreira</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                Como <span className="text-[#05294E]">Funciona</span>
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Processo simples e transparente para sua jornada rumo ao Green Card
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-[#05294E] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Aplicação</h3>
                <p className="text-slate-600">Preencha o formulário e nossa equipe entrará em contato para revisar seu perfil</p>
              </div>

              <div className="text-center">
                <div className="bg-[#D0151C] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Seleção</h3>
                <p className="text-slate-600">Avaliamos sua qualificação e conectamos você com as melhores oportunidades</p>
              </div>

              <div className="text-center">
                <div className="bg-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Processo</h3>
                <p className="text-slate-600">Guiaremos você através de todo o processo de obtenção do Green Card</p>
              </div>
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
                    NÃO ESPERE MAIS PELO SEU FUTURO
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black leading-tight">
                    Realize Seu Sonho de Trabalhar nos EUA!
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
                      Pré Candidatura Vagas EB3
                    </h3>
                    <div className="w-16 h-1 bg-[#05294E] mx-auto"></div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    {[
                      'Analise de Perfil',
                      'Consulta com Especialista', 
                      'Elaboração de estratégia',
                      'Garantia'
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-[#05294E] flex-shrink-0" />
                        <span className="text-[#05294E] font-semibold">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="text-center mb-6">
                    <div className="text-gray-400 line-through text-lg mb-2">
                      DE $ 1297,00
                    </div>
                    <div className="text-4xl md:text-5xl font-black text-[#05294E] mb-2">
                      $ 477,00
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-[#05294E] text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Reembolso Garantido em Caso de Inelegibilidade</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="text-center mb-6">
                    <button 
                      onClick={handleStripeCheckout}
                      className="bg-green-500 hover:bg-green-600 text-white font-black text-lg px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Inscreva-se Agora!
                    </button>
                  </div>

                  {/* Security Icons */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-6 w-6 text-[#05294E]" />
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Checkout Seguro</div>
                    </div>
                    <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Star className="h-6 w-6 text-[#05294E]" />
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Satisfação Garantida</div>
                    </div>
                    <div className="text-center">
                      <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-6 w-6 text-[#05294E]" />
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Privacidade Protegida</div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-3">Formas de Pagamento:</div>
                    <div className="flex flex-wrap justify-center items-center gap-3">
                      <div className="bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-700">PIX</div>
                      <div className="bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-700">VISA</div>
                      <div className="bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-700">Mastercard</div>
                      <div className="bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-700">PayPal</div>
                      <div className="bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-700">Hipercard</div>
                      <div className="bg-gray-100 px-3 py-1 rounded text-xs font-semibold text-gray-700">Boleto</div>
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
                      Garantia e Segurança
                    </h3>
                  </div>
                  
                  <p className="text-white text-sm leading-relaxed">
                    Se, após esta avaliação, for determinado que você não atende aos critérios necessários para a aplicação do visto EB-3, nós garantimos o reembolso total do valor investido no processo de pré-candidatura. Isso significa que você pode prosseguir sabendo que seu investimento está protegido.
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
                <span className="text-sm font-bold text-slate-700">Perguntas Frequentes</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
                Dúvidas sobre o <span className="text-[#05294E]">EB-3</span>?
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Encontre respostas para as principais dúvidas sobre o processo de obtenção do Green Card através do programa EB-3
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  question: "O que é o visto EB-3 e como funciona?",
                  answer: "O EB-3 é uma categoria de visto de imigração baseada em emprego que permite que trabalhadores qualificados, profissionais e trabalhadores não qualificados obtenham residência permanente (Green Card) nos Estados Unidos. O processo envolve uma oferta de trabalho permanente de um empregador americano e a comprovação de que não há trabalhadores americanos qualificados disponíveis para a posição."
                },
                {
                  question: "Quais são os requisitos para se qualificar ao EB-3?",
                  answer: "Os requisitos variam conforme a subcategoria: 1) Trabalhadores qualificados: Requerem pelo menos 2 anos de experiência ou treinamento; 2) Profissionais: Necessitam de bacharelado ou equivalente; 3) Trabalhadores não qualificados: Podem ter menos de 2 anos de experiência. Todos devem ter uma oferta de trabalho permanente de um empregador americano."
                },
                {
                  question: "Quanto tempo leva o processo do EB-3?",
                  answer: "O tempo total varia de 2 a 4 anos, dependendo do país de origem e da disponibilidade de vagas. O processo inclui: 1) Labor Certification (6-12 meses); 2) Petição I-140 (6-12 meses); 3) Ajuste de status ou processo consular (6-18 meses). Brasileiros geralmente têm tempos de espera menores comparados a outros países."
                },
                {
                  question: "Posso incluir minha família no processo EB-3?",
                  answer: "Sim! O EB-3 permite que você inclua seu cônjuge e filhos solteiros menores de 21 anos no processo. Todos receberão Green Cards e terão os mesmos direitos de residência permanente, incluindo permissão para trabalhar e estudar nos Estados Unidos."
                },
                {
                  question: "Qual é o custo total do processo EB-3?",
                  answer: "Os custos incluem: taxas governamentais (aproximadamente $2.000-3.000), honorários advocatícios ($5.000-15.000), traduções e documentação ($500-1.500), exames médicos ($200-500), e custos de viagem. O empregador geralmente paga as taxas principais, mas alguns custos podem ser compartilhados."
                },
                {
                  question: "Preciso falar inglês fluentemente para o EB-3?",
                  answer: "O nível de inglês necessário depende da posição específica. Para algumas posições, inglês básico é suficiente, especialmente em trabalhos não qualificados. Para posições profissionais, pode ser necessário inglês intermediário ou avançado. A MatriculaUSA oferece suporte para melhorar suas habilidades linguísticas."
                },
                {
                  question: "O que acontece se eu perder meu emprego após receber o Green Card?",
                  answer: "Após receber o Green Card, você tem mais flexibilidade. Se perder o emprego, pode procurar outro trabalho na mesma área ou similar. Após 5 anos, pode se naturalizar como cidadão americano. O Green Card EB-3 é permanente e não está vinculado a um empregador específico após a aprovação."
                },
                {
                  question: "Posso mudar de emprego durante o processo EB-3?",
                  answer: "Durante o processo, é possível mudar de emprego, mas requer uma nova petição I-140 com o novo empregador. Isso pode adicionar tempo ao processo. Após receber o Green Card, você tem total liberdade para mudar de emprego sem restrições."
                }
              ].map((faq, index) => (
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
              <span className="text-sm font-medium">Junte-se a milhares de brasileiros</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Pronto para começar sua <span className="text-[#D0151C]">jornada</span>?
            </h2>
            
            <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Preencha o formulário abaixo e nossa equipe entrará em contato para revisar seu perfil e guiá-lo através do processo.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button 
                onClick={scrollToOffer}
                className="group bg-[#D0151C] text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-[#B01218] transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center"
              >
                Aplicar Agora
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-white hover:text-[#05294E] transition-all duration-300 flex items-center justify-center">
                <Phone className="mr-3 h-6 w-6" />
                Falar Conosco
              </button>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center text-blue-100">
              <div className="flex items-center text-sm">
                <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                <span>Processo 100% legal</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                <span>Suporte especializado</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                <span>Green Card permanente</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default EB3JobsLanding;
// EB3JobsLanding component
