import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Users, CheckCircle, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import NotificationService from '../services/NotificationService';

import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../styles/phone-input.css';

// Lista de estados dos EUA
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const SchoolProfileSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const { user } = useAuth();

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    description: '',
    website: '',
    
    // Location
    location: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    
    // Contact Information
    contact: {
      phone: '',
      email: '',
      admissionsEmail: '',
      fax: ''
    },
    
    // Academic Information
    programs: [] as string[],
  });

  const [newProgram, setNewProgram] = useState('');

  // Função para buscar cidades baseadas no estado
  const fetchCitiesByState = async (state: string) => {
    if (!state) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      // Usando uma API gratuita para buscar cidades dos EUA
      const response = await fetch(`https://api.zippopotam.us/us/${getStateAbbreviation(state)}`);
      if (response.ok) {
        const data = await response.json();
        const uniqueCities = [...new Set(data.places?.map((place: any) => place['place name']) || [])].sort() as string[];
        setCities(uniqueCities);
      } else {
        // Fallback: usar uma lista básica de cidades principais por estado
        setCities(getFallbackCities(state));
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      // Fallback em caso de erro
      setCities(getFallbackCities(state));
    } finally {
      setLoadingCities(false);
    }
  };

  // Função para obter abreviação do estado
  const getStateAbbreviation = (stateName: string): string => {
    const stateAbbreviations: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH',
      'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
      'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
      'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN',
      'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
      'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    return stateAbbreviations[stateName] || '';
  };

  // Função fallback com cidades principais por estado
  const getFallbackCities = (stateName: string): string[] => {
    const fallbackCities: Record<string, string[]> = {
      'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim'],
      'Texas': ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock'],
      'Florida': ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Fort Lauderdale', 'Port St. Lucie', 'Cape Coral'],
      'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica'],
      'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem', 'Lancaster', 'Harrisburg', 'Altoona'],
      'Illinois': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville', 'Springfield', 'Peoria', 'Elgin', 'Waukegan', 'Cicero'],
      'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown', 'Lorain'],
      'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Sandy Springs', 'Roswell', 'Macon', 'Albany', 'Johns Creek'],
      'North Carolina': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington', 'High Point', 'Concord'],
      'Michigan': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing', 'Ann Arbor', 'Flint', 'Dearborn', 'Livonia', 'Westland']
    };
    return fallbackCities[stateName] || ['Please select a state first'];
  };

  useEffect(() => {
    // Check if user has already completed profile setup
    checkExistingProfile();
  }, [user]);

  const checkExistingProfile = async () => {
    if (!user) return;

    try {
      const { data: university, error } = await supabase
        .from('universities')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (university && university.profile_completed) {
        navigate('/school/dashboard');
      } else if (university && !university.terms_accepted) {
        navigate('/school/termsandconditions');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const newData = {
          ...prev,
          [parent]: {
            ...((prev[parent as keyof typeof prev] ?? {}) as object),
            [child]: value
          }
        };
        
        // Se o estado foi alterado, buscar cidades e limpar cidade selecionada
        if (parent === 'address' && child === 'state') {
          const address = newData.address as typeof formData.address;
          // Limpar cidade quando estado muda
          address.city = '';
          // Buscar cidades do novo estado
          fetchCitiesByState(value);
        }
        
        // Auto-populate location when city or state changes
        if (parent === 'address' && (child === 'city' || child === 'state')) {
          const address = newData.address as typeof formData.address;
          if (address.city && address.state) {
            newData.location = `${address.city}, ${address.state}`;
          }
        }
        
        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handler específico para PhoneInput
  const handlePhoneChange = (field: string, value: string | undefined) => {
    const phoneValue = value || '';
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const newData = {
          ...prev,
          [parent]: {
            ...((prev[parent as keyof typeof prev] ?? {}) as object),
            [child]: phoneValue
          }
        };
        return newData;
      });
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [field]: phoneValue
        };
        return newData;
      });
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addProgram = () => {
    if (newProgram.trim() && !formData.programs.includes(newProgram.trim())) {
      setFormData(prev => ({
        ...prev,
        programs: [...prev.programs, newProgram.trim()]
      }));
      setNewProgram('');
    }
  };

  const removeProgram = (index: number) => {
    setFormData(prev => ({
      ...prev,
      programs: prev.programs.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'University name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.website.trim()) newErrors.website = 'Website is required';
        break;
      case 2:
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        if (!formData.address.street.trim()) newErrors['address.street'] = 'Street address is required';
        if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required';
        if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required';
        if (!formData.address.zipCode.trim()) newErrors['address.zipCode'] = 'ZIP code is required';
        break;
      case 3:
        if (!formData.contact.phone || formData.contact.phone.length < 8) newErrors['contact.phone'] = 'Please enter a valid phone number with country code';
        if (!formData.contact.email.trim()) newErrors['contact.email'] = 'Email is required';
        if (!formData.contact.admissionsEmail.trim()) newErrors['contact.admissionsEmail'] = 'Admissions email is required';
        break;
      case 4:
        if (formData.programs.length === 0) newErrors.programs = 'At least one program is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 4) {
        // Se estiver no step 4, finalizar o processo
        handleSubmit();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4) || !user) return;

    setLoading(true);
    try {
      const universityData = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        website: formData.website,
        programs: formData.programs,
        address: formData.address,
        contact: formData.contact,
        profile_completed: true
      };

      const { error } = await supabase
        .from('universities')
        .update(universityData)
        .eq('user_id', user.id);

      if (error) throw error;

      // Enviar notificação para o admin sobre universidade pendente para aprovação
      try {
        const notificationPayload = NotificationService.createUniversityPendingApprovalPayload(
          formData.name,
          user.email || '',
          formData.contact.email || user.email || '',
          'University Contact', // Posição do contato
          formData.location,
          formData.website
        );

        const notificationResult = await NotificationService.sendUniversityNotification(notificationPayload);
        
        if (notificationResult.success) {
          console.log('✅ [SCHOOL PROFILE] Notificação enviada para admin com sucesso');
        } else {
          console.error('❌ [SCHOOL PROFILE] Erro ao enviar notificação para admin:', notificationResult.error);
        }
      } catch (notificationError) {
        console.error('❌ [SCHOOL PROFILE] Erro ao enviar notificação para admin:', notificationError);
        // Não bloquear o fluxo se a notificação falhar
      }

      navigate('/school/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Information', icon: Building },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Contact', icon: Phone },
    { number: 4, title: 'Academic Info', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your University Profile</h1>
          <p className="text-gray-600">Set up your university profile to start attracting international students</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted ? 'bg-green-600 border-green-600 text-white' :
                    isActive ? 'bg-[#05294E] border-[#05294E] text-white' :
                    'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-2 ${isActive ? 'text-[#05294E] font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building className="h-12 w-12 text-[#05294E] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                <p className="text-gray-600">Tell us about your university</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">University Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter university name"
                  />
                  {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Describe your university"
                  />
                  {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website *</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors.website ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="https://university.edu"
                  />
                  {errors.website && <p className="text-red-600 text-xs mt-1">{errors.website}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <MapPin className="h-12 w-12 text-[#05294E] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">Location Information</h2>
                <p className="text-gray-600">Where is your university located?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['address.street'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="123 University Avenue"
                  />
                  {errors['address.street'] && <p className="text-red-600 text-xs mt-1">{errors['address.street']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                  <select
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['address.state'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a state</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors['address.state'] && <p className="text-red-600 text-xs mt-1">{errors['address.state']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <select
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    disabled={!formData.address.state || loadingCities}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['address.city'] ? 'border-red-300' : 'border-gray-300'
                    } ${!formData.address.state || loadingCities ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {!formData.address.state 
                        ? 'Select a state first' 
                        : loadingCities 
                        ? 'Loading cities...' 
                        : 'Select a city'
                      }
                    </option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {errors['address.city'] && <p className="text-red-600 text-xs mt-1">{errors['address.city']}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location (City, State) *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] bg-gray-50 ${
                      errors.location ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Boston, Massachusetts"
                    readOnly
                  />
                  {errors.location && <p className="text-red-600 text-xs mt-1">{errors.location}</p>}
                  <p className="text-xs text-gray-500 mt-1">Este campo é preenchido automaticamente baseado na cidade e estado</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['address.zipCode'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="02139"
                  />
                  {errors['address.zipCode'] && <p className="text-red-600 text-xs mt-1">{errors['address.zipCode']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                    placeholder="United States"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Phone className="h-12 w-12 text-[#05294E] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
                <p className="text-gray-600">How can students reach your university?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <PhoneInput
                    international
                    defaultCountry="US"
                    addInternationalOption={false}
                    value={formData.contact.phone}
                    onChange={(value) => handlePhoneChange('contact.phone', value)}
                    style={{
                      '--PhoneInputCountryFlag-height': '1.2em',
                      '--PhoneInputCountrySelectArrow-opacity': '0.8',
                      '--PhoneInput-color--focus': '#05294E'
                    }}
                    className={`phone-input-school ${errors['contact.phone'] ? 'error' : ''}`}
                    placeholder="Enter your phone number"
                  />
                  {errors['contact.phone'] && <p className="text-red-600 text-xs mt-1">{errors['contact.phone']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fax Number</label>
                  <PhoneInput
                    international
                    defaultCountry="US"
                    addInternationalOption={false}
                    value={formData.contact.fax}
                    onChange={(value) => handlePhoneChange('contact.fax', value)}
                    style={{
                      '--PhoneInputCountryFlag-height': '1.2em',
                      '--PhoneInputCountrySelectArrow-opacity': '0.8',
                      '--PhoneInput-color--focus': '#05294E'
                    }}
                    className="fax-input-school"
                    placeholder="Enter fax number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">General Email *</label>
                  <input
                    type="email"
                    value={formData.contact.email}
                    onChange={(e) => handleInputChange('contact.email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['contact.email'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="info@university.edu"
                  />
                  {errors['contact.email'] && <p className="text-red-600 text-xs mt-1">{errors['contact.email']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admissions Email *</label>
                  <input
                    type="email"
                    value={formData.contact.admissionsEmail}
                    onChange={(e) => handleInputChange('contact.admissionsEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['contact.admissionsEmail'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="admissions@university.edu"
                  />
                  {errors['contact.admissionsEmail'] && <p className="text-red-600 text-xs mt-1">{errors['contact.admissionsEmail']}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Academic Information */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Users className="h-12 w-12 text-[#05294E] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">Academic Information</h2>
                <p className="text-gray-600">Tell us about your academic programs</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Programs *</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newProgram}
                        onChange={(e) => setNewProgram(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                        placeholder="Enter program name"
                        onKeyPress={(e) => e.key === 'Enter' && addProgram()}
                      />
                      <button
                        type="button"
                        onClick={addProgram}
                        className="bg-[#05294E] text-white px-4 py-2 rounded-lg hover:bg-[#05294E]/90 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {formData.programs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.programs.map((program, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                          >
                            {program}
                            <button
                              type="button"
                              onClick={() => removeProgram(index)}
                              className="ml-2 text-gray-500 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {errors.programs && <p className="text-red-600 text-xs">{errors.programs}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            <div className="text-sm text-gray-500">
              Step {currentStep} of 4
            </div>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="bg-[#05294E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#05294E]/90 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="bg-[#05294E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#05294E]/90 transition-colors"
              >
                Complete Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolProfileSetup;