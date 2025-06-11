import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Mail, Globe, Users, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const SchoolProfileSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();

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
    programs: [] as string[]
  });

  const [newProgram, setNewProgram] = useState('');

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
        navigate('/school/terms');
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
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
        if (!formData.contact.phone.trim()) newErrors['contact.phone'] = 'Phone is required';
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
      setCurrentStep(prev => Math.min(prev + 1, 4));
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location (City, State) *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors.location ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Boston, Massachusetts"
                  />
                  {errors.location && <p className="text-red-600 text-xs mt-1">{errors.location}</p>}
                </div>

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
                  <input
                    type="tel"
                    value={formData.contact.phone}
                    onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] ${
                      errors['contact.phone'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors['contact.phone'] && <p className="text-red-600 text-xs mt-1">{errors['contact.phone']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fax Number</label>
                  <input
                    type="tel"
                    value={formData.contact.fax}
                    onChange={(e) => handleInputChange('contact.fax', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
                    placeholder="+1 (555) 123-4568"
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
                onClick={handleSubmit}
                disabled={loading}
                className="bg-[#05294E] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#05294E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
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