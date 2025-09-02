import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Users, CheckCircle, Plus, X, Scroll } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTermsAcceptance } from '../hooks/useTermsAcceptance';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import '../styles/phone-input.css';

const SchoolProfileSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const { user } = useAuth();
  const { recordTermAcceptance, getLatestActiveTerm } = useTermsAcceptance();
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
    
    // Terms acceptance
    termsAccepted: false
  });

  const [newProgram, setNewProgram] = useState('');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasScrolledToBottomPrivacy, setHasScrolledToBottomPrivacy] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  
  const termsContentRef = useRef<HTMLDivElement>(null);
  const privacyContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has already completed profile setup
    checkExistingProfile();
  }, [user]);

  // Handle scroll in terms content
  const handleTermsScroll = () => {
    if (termsContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setHasScrolledToBottom(isAtBottom);
    }
  };

  // Handle scroll in privacy policy content
  const handlePrivacyScroll = () => {
    if (privacyContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = privacyContentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setHasScrolledToBottomPrivacy(isAtBottom);
    }
  };



  // Handle terms acceptance and show privacy policy
  const handleTermsAccept = () => {
    if (hasScrolledToBottom) {
      setShowPrivacyPolicy(true);
      setHasScrolledToBottomPrivacy(false);
      // Scroll to top when showing privacy policy
      setTimeout(() => {
        if (privacyContentRef.current) {
          privacyContentRef.current.scrollTop = 0;
        }
      }, 100);
    }
  };

  // Handle privacy policy acceptance
  const handlePrivacyAccept = async () => {
    if (hasScrolledToBottomPrivacy) {
      try {
        // Get the latest active university terms
        let universityTerms = await getLatestActiveTerm('university_terms');
        
        // If no active terms exist, create a default one
        if (!universityTerms) {
          console.log('No active university terms found, creating default term');
          const defaultTerm = {
            id: 'default-university-terms',
            title: 'University Terms and Privacy Policy',
            content: 'By accepting these terms, you agree to our university partnership terms and privacy policy.',
            term_type: 'university_terms' as const,
            version: 1,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          universityTerms = defaultTerm;
        }
        
        if (universityTerms) {
          // Record acceptance of university terms and privacy policy
          await recordTermAcceptance(universityTerms.id, 'university_terms');
        }
        
        setFormData(prev => ({ ...prev, termsAccepted: true }));
        setShowPrivacyPolicy(false);
      } catch (error) {
        console.error('Error recording terms acceptance:', error);
        // Still allow user to proceed even if recording fails
        setFormData(prev => ({ ...prev, termsAccepted: true }));
        setShowPrivacyPolicy(false);
      }
    }
  };

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
      case 5:
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the Terms of Use and Privacy Policy to continue';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(5) || !user) return;

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
        profile_completed: true,
        terms_accepted: true
      };

      const { error } = await supabase
        .from('universities')
        .update(universityData)
        .eq('user_id', user.id);

      if (error) throw error;

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
    { number: 4, title: 'Academic Info', icon: Users },
    { number: 5, title: 'Terms of Use', icon: Scroll }
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['address.city'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Boston"
                  />
                  {errors['address.city'] && <p className="text-red-600 text-xs mt-1">{errors['address.city']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['address.state'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Massachusetts"
                  />
                  {errors['address.state'] && <p className="text-red-600 text-xs mt-1">{errors['address.state']}</p>}
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

          {/* Step 5: Terms of Use */}
          {currentStep === 5 && (
            <div className="space-y-6">
                                            <div className="text-center mb-6">
                <Scroll className="h-12 w-12 text-[#05294E] mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">
                  {showPrivacyPolicy ? 'Privacy Policy' : 'Terms of Use'}
                </h2>
                <p className="text-gray-600">
                  {showPrivacyPolicy 
                    ? 'Please read the privacy policy below carefully before accepting'
                    : 'Please read the terms below carefully before accepting'
                  }
                </p>
                
                {/* Progress indicator */}
                <div className="flex items-center justify-center mt-4 space-x-4">
                  <div className={`flex items-center ${!showPrivacyPolicy ? 'text-[#05294E]' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2 ${
                      !showPrivacyPolicy ? 'border-[#05294E] bg-[#05294E] text-white' : 'border-gray-300'
                    }`}>
                      {!showPrivacyPolicy ? '1' : <CheckCircle className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium">Terms of Use</span>
                  </div>
                  
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  
                  <div className={`flex items-center ${showPrivacyPolicy ? 'text-[#05294E]' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-2 ${
                      showPrivacyPolicy ? 'border-[#05294E] bg-[#05294E] text-white' : 'border-gray-300'
                    }`}>
                      {showPrivacyPolicy ? (formData.termsAccepted ? <CheckCircle className="h-4 w-4" /> : '2') : '2'}
                    </div>
                    <span className="text-sm font-medium">Privacy Policy</span>
                  </div>
                </div>
              </div>

                                            {/* Content */}
              <div 
                ref={showPrivacyPolicy ? privacyContentRef : termsContentRef}
                onScroll={showPrivacyPolicy ? handlePrivacyScroll : handleTermsScroll}
                className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-96 overflow-y-auto"
              >
                <div className="prose prose-sm max-w-none">
                  {!showPrivacyPolicy ? (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms of Use</h3>
                      
                      {/* 1. ACCEPTANCE OF TERMS */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">1. ACCEPTANCE OF TERMS</h4>
                        <p className="text-gray-700 mb-4 text-sm">
                          By accessing and using the Matrícula USA platform, you agree to comply with and be bound by these Terms of Service. If you do not agree to any part of these terms, you should not use our services.
                        </p>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />

                      {/* 2. SERVICE DESCRIPTION */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">2. SERVICE DESCRIPTION</h4>
                        <p className="text-gray-700 mb-4 text-sm">
                          Matrícula USA is a SaaS (Software as a Service) platform that offers:
                        </p>
                        
                        <div className="space-y-4 mb-4">
                          <div className="border border-gray-200 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-900 mb-2">2.1 Email Hub for Universities</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Secure integration with Gmail accounts through OAuth 2.0</li>
                              <li>Professional interface for institutional email management</li>
                              <li>Organized tab system (Inbox, Sent, Starred, Drafts, Spam, Trash)</li>
                              <li>Real-time email counts</li>
                              <li>Smart forwarding functionality</li>
                              <li>Integrated composer for new emails</li>
                              <li>Advanced search and filters</li>
                              <li>Responsive interface for all devices</li>
                            </ul>
                          </div>

                          <div className="border border-gray-200 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-900 mb-2">2.2 Scholarship Management</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Creation and management of scholarships</li>
                              <li>Student application process</li>
                              <li>Document and application status management</li>
                              <li>Integrated payment system</li>
                            </ul>
                          </div>
                                                </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 3. LICENSE GRANT */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">3. LICENSE GRANT</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">3.1 Limited License</h5>
                            <p className="text-gray-700 text-sm">
                              We grant you a limited, non-exclusive, non-transferable, and revocable license to access and use the Matrícula USA platform in accordance with these Terms.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">3.2 Restrictions</h5>
                            <p className="text-gray-700 mb-2 text-sm">You agree not to:</p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                              <li>Use the platform for illegal or unauthorized purposes</li>
                              <li>Attempt to access unauthorized systems or data</li>
                              <li>Interfere with platform operation</li>
                              <li>Share access credentials</li>
                              <li>Use the platform for spam or malicious content</li>
                            </ul>
                          </div>
                                                </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 4. THIRD-PARTY DEPENDENCIES */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">4. THIRD-PARTY DEPENDENCIES</h4>
                        <div className="space-y-4">
                          <div className="border border-gray-300 p-4 bg-gray-50 rounded-lg">
                            <h5 className="font-semibold text-gray-900 mb-2">4.1 Google APIs</h5>
                            <p className="text-gray-700 mb-2 text-sm">
                              The "Email Hub" functionality depends on Google APIs and is subject to Google's Terms of Service. By using this functionality, you agree to comply with:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Google Terms of Service</li>
                              <li>Google Privacy Policy</li>
                              <li>Google API Services User Data Policy</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">4.2 Other Providers</h5>
                            <p className="text-gray-700 mb-2 text-sm">Our platform also uses:</p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                              <li>Supabase: For data storage and authentication</li>
                              <li>Stripe: For payment processing</li>
                              <li>Vercel/Netlify: For application hosting</li>
                            </ul>
                          </div>
                                                </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 5. INTELLECTUAL PROPERTY */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">5. INTELLECTUAL PROPERTY</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-900 mb-2">5.1 Platform Ownership</h5>
                            <p className="text-gray-700 text-sm">
                              The Matrícula USA platform, including its code, design, features, and content, is the exclusive property of Matrícula USA and is protected by intellectual property laws.
                            </p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-900 mb-2">5.2 Customer Data</h5>
                            <p className="text-gray-700 text-sm mb-2">All customer data, including:</p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Email content</li>
                              <li>Personal information</li>
                              <li>Submitted documents</li>
                              <li>Application history</li>
                            </ul>
                            <p className="text-gray-700 text-sm mt-2">
                              It is important to note that, although the data is customer property, Matrícula USA maintains the right to process and analyze this data to provide the contracted services, always in compliance with our Privacy Policy and applicable data protection laws.
                            </p>
                          </div>
                                                </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 6. RESPONSIBILITIES */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">6. RESPONSIBILITIES</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">6.1 User Responsibilities</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Provide true and accurate information</li>
                              <li>Maintain security of credentials</li>
                              <li>Use the platform responsibly</li>
                              <li>Comply with applicable laws</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">6.2 Matrícula USA Responsibilities</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Maintain platform operation</li>
                              <li>Protect user data according to our Privacy Policy</li>
                              <li>Provide adequate technical support</li>
                              <li>Notify about significant changes</li>
                            </ul>
                          </div>
                                                </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 7. LIMITATION OF LIABILITY */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">7. LIMITATION OF LIABILITY</h4>
                        <p className="text-gray-700 mb-2 text-sm">Matrícula USA will not be liable for:</p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                          <li>Data loss due to technical failures</li>
                          <li>Temporary service interruptions</li>
                          <li>Indirect or consequential damages</li>
                          <li>Actions of third parties (Google, Stripe, etc.)</li>
                        </ul>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 8. SUSPENSION AND TERMINATION */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">8. SUSPENSION AND TERMINATION</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">8.1 Suspension</h5>
                            <p className="text-gray-700 mb-2 text-sm">We may suspend your access if:</p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                              <li>You violate these Terms</li>
                              <li>You use the platform abusively</li>
                              <li>You fail to make due payments</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">8.2 Termination</h5>
                            <p className="text-gray-700 mb-2 text-sm">You may terminate your account at any time. After termination:</p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                              <li>Your data will be deleted according to our Privacy Policy</li>
                              <li>Gmail integrations will be disconnected</li>
                              <li>Platform access will be revoked</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 9. MODIFICATIONS */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">9. MODIFICATIONS</h4>
                        <p className="text-gray-700 text-sm">
                          We reserve the right to modify these Terms at any time. Significant changes will be communicated 30 days in advance.
                        </p>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 10. GOVERNING LAW */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">10. GOVERNING LAW</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">10.1 Jurisdiction</h5>
                            <p className="text-gray-700 text-sm">
                              These Terms are governed by the laws of the State of California, United States.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">10.2 Dispute Resolution</h5>
                            <p className="text-gray-700 text-sm">
                              Any disputes will be resolved in the courts of Los Angeles County, California, with express waiver of any other venue, no matter how privileged.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 11. ARBITRATION */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">11. ARBITRATION</h4>
                        <p className="text-gray-700 text-sm">
                          Any disputes arising from these Terms will be resolved through binding arbitration in accordance with the American Arbitration Association rules.
                        </p>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 12. GENERAL PROVISIONS */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">12. GENERAL PROVISIONS</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">12.1 Entire Agreement</h5>
                            <p className="text-gray-700 text-sm">
                              These Terms constitute the complete agreement between the parties.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">12.2 Waiver</h5>
                            <p className="text-gray-700 text-sm">
                              Failure to exercise any right does not constitute waiver.
                            </p>
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">12.3 Severability</h5>
                            <p className="text-gray-700 text-sm">
                              If any provision is found invalid, the remaining provisions will remain in effect.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 13. CONTACT */}
                      <div className="mb-6">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">13. CONTACT</h4>
                        <p className="text-gray-700 mb-2 text-sm">For questions about these Terms:</p>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-blue-800 text-sm"><strong>Email:</strong> info@matriculausa.com</p>
                          <p className="text-blue-800 text-sm"><strong>Phone:</strong> +1 (213) 676-2544</p>
                          <p className="text-blue-800 text-sm"><strong>Address:</strong> Los Angeles - CA - USA</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Privacy Policy</h3>
                      
                      {/* 1. INTRODUCTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">1. INTRODUCTION</h4>
                        <p className="text-gray-700 mb-4 text-sm">
                          Matrícula USA ("we", "our", "us") is committed to protecting the privacy and personal data of our users. This Privacy Policy describes how we collect, use, store, and protect your information when you use our Email Hub platform for universities.
                        </p>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 2. DATA COLLECTED AND ACCESSED */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">2. DATA COLLECTED AND ACCESSED</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">2.1 User Account Data</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                              <li>Full name</li>
                              <li>Email address</li>
                              <li>Phone number</li>
                              <li>Country of origin</li>
                              <li>Academic profile (study level, field of interest, GPA, English proficiency)</li>
                              <li>Payment information (through Stripe)</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">2.2 Gmail Data (Email Hub)</h5>
                            <p className="text-gray-700 mb-2 text-sm">
                              Based on our platform's code analysis, when you connect your Gmail account, we access the following data:
                            </p>
                            
                            <div className="border border-gray-200 p-4 mb-4">
                              <h6 className="font-semibold text-gray-900 mb-2">gmail.readonly Permission:</h6>
                              <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                                <li>Email list (ID, threadId, sender, recipient, subject)</li>
                                <li>Complete email content (text and HTML body)</li>
                                <li>Email metadata (date, priority, attachments, labels)</li>
                                <li>Email count by category (Inbox, Sent, Starred, Drafts, Spam, Trash)</li>
                                <li>Email read status</li>
                                <li>Thread/conversation information</li>
                              </ul>
                            </div>

                            <div className="border border-gray-200 p-4">
                              <h6 className="font-semibold text-gray-900 mb-2">gmail.send Permission:</h6>
                              <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                                <li>Ability to send emails through Gmail API</li>
                                <li>Ability to forward existing emails</li>
                                <li>Ability to reply to emails</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 3. HOW WE USE YOUR INFORMATION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">3. HOW WE USE YOUR INFORMATION</h4>
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">3.1 Primary Email Hub Functionality</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                              <li>Email Viewing: We display complete email content to facilitate institutional management</li>
                              <li>Category Organization: We organize emails into tabs (Inbox, Sent, Starred, etc.) with real-time counts</li>
                              <li>Smart Forwarding: We allow forwarding emails with complete content preserved</li>
                              <li>New Email Composition: Integrated interface for creating and sending new institutional emails</li>
                              <li>Search and Filters: Search functionality to locate specific emails</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">3.2 Other Uses</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm ml-4">
                              <li>Scholarship and application management</li>
                              <li>Payment processing</li>
                              <li>User communication</li>
                              <li>Platform improvement</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 4. DATA SECURITY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">4. DATA SECURITY</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="border border-gray-200 p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">4.1 Encryption and Storage</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>OAuth Tokens: We store Gmail access and refresh tokens encrypted using AES-GCM with PBKDF2-derived keys</li>
                              <li>Sensitive Data: All sensitive data is encrypted before storage in Supabase</li>
                              <li>Transmission: All communications are protected by HTTPS/TLS</li>
                            </ul>
                          </div>

                          <div className="border border-gray-200 p-4">
                            <h5 className="font-semibold text-gray-900 mb-2">4.2 Security Measures</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Secure OAuth 2.0 authentication</li>
                              <li>Access tokens with automatic expiration</li>
                              <li>Automatic token renewal for expired tokens</li>
                              <li>Detailed logs for security auditing</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 5. GOOGLE COMPLIANCE */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">5. GOOGLE COMPLIANCE</h4>
                        <div className="border border-gray-300 p-4 bg-gray-50 rounded-lg">
                          <h5 className="font-semibold text-gray-900 mb-2">IMPORTANT</h5>
                          <p className="text-gray-700 mb-2 text-sm">
                            The use and transfer of information received from Google APIs to any other app by Matrícula USA will adhere to the Google API Services User Data Policy, including the Limited Use requirements.
                          </p>
                          <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                            <li>We use only necessary permissions (gmail.readonly and gmail.send)</li>
                            <li>We do not share Gmail data with third parties</li>
                            <li>We do not use Gmail data for advertising or profile analysis</li>
                            <li>We respect all Google API usage policies</li>
                          </ul>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 6. YOUR RIGHTS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">6. YOUR RIGHTS (CCPA/State Laws)</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">6.1 Access and Portability</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Request access to all your personal data</li>
                              <li>Receive your data in a structured, machine-readable format</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">6.2 Correction and Update</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Correct inaccurate or incomplete personal data</li>
                              <li>Update your profile information at any time</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">6.3 Deletion</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Request deletion of your personal data</li>
                              <li>Disconnect your Gmail account at any time</li>
                              <li>Delete your platform account</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">6.4 Consent Withdrawal</h5>
                            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                              <li>Withdraw consent for Gmail data usage</li>
                              <li>Disconnect third-party integrations</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 7. DATA RETENTION */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">7. DATA RETENTION</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                          <li>Account Data: Kept while your account is active</li>
                          <li>OAuth Tokens: Stored until you disconnect or delete your account</li>
                          <li>Security Logs: Kept for 12 months for auditing</li>
                          <li>Payment Data: Kept as required by law</li>
                        </ul>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 8. DATA SHARING */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">8. DATA SHARING</h4>
                        <p className="text-gray-700 mb-2 text-sm">
                          We do not sell, rent, or share your personal data with third parties, except:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                          <li>Essential service providers (Supabase, Stripe, Google)</li>
                          <li>When required by law</li>
                          <li>With your explicit consent</li>
                        </ul>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 9. CHILDREN'S PRIVACY */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">9. CHILDREN'S PRIVACY</h4>
                        <p className="text-gray-700 text-sm">
                          Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
                        </p>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 10. INTERNATIONAL DATA TRANSFERS */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">10. INTERNATIONAL DATA TRANSFERS</h4>
                        <p className="text-gray-700 text-sm">
                          Your data may be processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
                        </p>
                      </div>
                      
                      <hr className="border-gray-200 my-6" />
                      
                      {/* 11. CONTACT */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">11. CONTACT</h4>
                        <p className="text-gray-700 mb-2 text-sm">
                          To exercise your rights or clarify questions about this policy:
                        </p>
                        <div className="border border-gray-200 p-4">
                          <p className="text-gray-700 text-sm"><strong>Email:</strong> info@matriculausa.com</p>
                          <p className="text-gray-700 text-sm"><strong>Phone:</strong> +1 (213) 676-2544</p>
                          <p className="text-gray-700 text-sm"><strong>Address:</strong> Los Angeles - CA - USA</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Scroll indicator */}
                {(!showPrivacyPolicy && !hasScrolledToBottom) && (
                  <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                    <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                    <span className="text-amber-800 font-medium">
                      Scroll down to read all terms
                    </span>
                  </div>
                )}
                {(showPrivacyPolicy && !hasScrolledToBottomPrivacy) && (
                  <div className="flex items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
                    <Scroll className="h-5 w-5 text-amber-600 mr-2" />
                    <span className="text-amber-800 font-medium">
                      Scroll down to read the entire policy
                    </span>
                  </div>
                )}
              </div>

              {/* Accept Button */}
              <div className="flex justify-center">
                {!showPrivacyPolicy ? (
                  <button
                    onClick={handleTermsAccept}
                    disabled={!hasScrolledToBottom}
                    className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                      hasScrolledToBottom
                        ? 'bg-[#05294E] text-white hover:bg-[#041f3a] shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {hasScrolledToBottom ? 'Accept Terms and Continue to Privacy Policy' : 'Read all terms first'}
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">
                        You've accepted the Terms of Use. Now please read and accept the Privacy Policy.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => {
                          setShowPrivacyPolicy(false);
                          // Scroll to top when going back to terms
                          setTimeout(() => {
                            if (termsContentRef.current) {
                              termsContentRef.current.scrollTop = 0;
                            }
                          }, 100);
                        }}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                      >
                        Back to Terms
                      </button>
                      <button
                        onClick={handlePrivacyAccept}
                        disabled={!hasScrolledToBottomPrivacy}
                        className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                          hasScrolledToBottomPrivacy
                            ? 'bg-[#05294E] text-white hover:bg-[#041f3a] shadow-lg'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {hasScrolledToBottomPrivacy ? 'Accept Privacy Policy' : 'Read the entire policy first'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {errors.termsAccepted && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                  <div className="font-medium text-red-800 mb-1">Action Required</div>
                  {errors.termsAccepted}
                </div>
              )}
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
              Step {currentStep} of 5
            </div>

            {currentStep < 5 ? (
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
                onClick={handleSubmit}
                disabled={loading || !formData.termsAccepted}
                className="bg-[#05294E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#05294E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : !formData.termsAccepted ? (
                  <>
                    <Scroll className="h-4 w-4 mr-2" />
                    Accept Terms to Continue
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolProfileSetup;