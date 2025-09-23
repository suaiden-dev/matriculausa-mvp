import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserCheck, CheckCircle, X, Target, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useScholarshipPackages } from '../hooks/useScholarshipPackages';
import { supabase } from '../lib/supabase';
import PhoneInput from 'react-phone-number-input';

const SellerStudentRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sellerCode = searchParams.get('ref') || '';
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    sellerReferralCode: sellerCode,
    selectedPackage: '',
    dependents: 0
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [sellerReferralCodeValid, setSellerReferralCodeValid] = useState<boolean | null>(null);
  const [, setSellerReferralCodeLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Multi-step form states
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register } = useAuth();
  const { packages, loading: packagesLoading } = useScholarshipPackages();
  const navigate = useNavigate();

  // Validar código do vendedor ao carregar a página
  useEffect(() => {
    if (sellerCode) {
      validateSellerReferralCode(sellerCode);
    }
  }, [sellerCode]);

  const validateSellerReferralCode = async (code: string) => {
    if (!code.trim()) {
      setSellerReferralCodeValid(false);
      return;
    }

    setSellerReferralCodeLoading(true);
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id, name, referral_code, is_active')
        .eq('referral_code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setSellerReferralCodeValid(false);
      } else {
        setSellerReferralCodeValid(true);
      }
    } catch (err) {
      console.error('Error validating seller referral code:', err);
      setSellerReferralCodeValid(false);
    } finally {
      setSellerReferralCodeLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'dependents' ? Math.max(0, parseInt(value || '0', 10)) : value }));
  };

  const handlePackageSelect = (packageNumber: number) => {
    setFormData(prev => ({ ...prev, selectedPackage: packageNumber.toString() }));
  };

  // Validation function for each step
  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        if (!formData.password.trim()) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters long';
        if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
        else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!termsAccepted) newErrors.terms = 'You must accept the terms and conditions';
        if (!sellerReferralCodeValid) newErrors.sellerCode = 'Invalid seller referral code';
        if (formData.dependents < 0) newErrors.dependents = 'Dependents cannot be negative';
        break;
      case 2:
        if (!formData.selectedPackage) newErrors.package = 'Please select a scholarship package';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation functions
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      setError(''); // Clear any previous errors
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(''); // Clear any previous errors
  };

  const handleSubmit = async () => {
    // Final validation for step 2
    if (!validateStep(2)) return;
    
    setLoading(true);
    setError('');

    try {
      // Usar o hook useAuth para registrar o usuário
      const userData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        role: 'student' as const,
        status: 'active',
        seller_referral_code: formData.sellerReferralCode,
        scholarship_package_id: packages.find(p => p.package_number === parseInt(formData.selectedPackage))?.id,
        dependents: formData.dependents
      };

      
      // Também enviar a versão "plain" para o user_metadata esperada no trigger/backend
      await register(formData.email, formData.password, {
        ...userData,
        dependents: formData.dependents,
        scholarship_package_number: parseInt(formData.selectedPackage)
      });
      
      setShowVerificationModal(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const selectedPackage = packages.find(p => p.package_number === parseInt(formData.selectedPackage));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <UserCheck className="h-12 w-12 text-blue-600 mr-4" />
            <h1 className="text-4xl font-bold text-gray-900">Student Registration</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Complete your registration and choose your scholarship package
          </p>
          {sellerCode && (
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Target className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">
                <strong>Seller Code:</strong> {sellerCode}
              </p>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-400'
              }`}>
                {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="ml-2 text-sm font-medium">Personal Info</span>
            </div>
            
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-400'
              }`}>
                {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="ml-2 text-sm font-medium">Package Selection</span>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  {/* Seller Referral Code Display */}
                  {sellerCode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seller Referral Code
                      </label>
                      <div className="relative">
                        <div className="flex items-center">
                          <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                          <input
                            type="text"
                            value={sellerCode}
                            readOnly
                            className="w-full pl-10 pr-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800 font-medium cursor-not-allowed"
                            placeholder="Seller code will appear here"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-green-600">
                          This code was automatically applied from your referral link
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.full_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.full_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        defaultCountry="US"
                        addInternationalOption={false}
                        value={formData.phone}
                        onChange={(value) => {
                          setFormData(prev => {
                            const newData = { ...prev, phone: value || '' };
                            return newData;
                          });
                        }}
                        style={{
                          '--PhoneInputCountryFlag-height': '1.2em',
                          '--PhoneInputCountrySelectArrow-opacity': '0.8',
                          '--PhoneInput-color--focus': '#3B82F6'
                        }}
                        className={`w-full pl-4 pr-4 py-3 bg-white placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-base ${
                          errors.phone ? 'border border-red-300' : 'border border-gray-300'
                        }`}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  {/* Dependents Input - moved to Step 1 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dependents
                    </label>
                    <input
                      type="number"
                      name="dependents"
                      min={0}
                      value={formData.dependents}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.dependents ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {/* <p className="text-xs text-gray-500 mt-1">
                      $150 per dependent will be added and split between Selection Process Fee and I-20 Control Fee.
                    </p> */}
                    {errors.dependents && (
                      <p className="mt-1 text-sm text-red-600">{errors.dependents}</p>
                    )}
                  </div>
                </div>

                {/* Password Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Create a password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your password"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Terms and Privacy Policy Notice */}
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="terms-acceptance"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className={`h-4 w-4 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0 ${
                      errors.terms ? 'text-red-600 border-red-300' : 'text-blue-600'
                    }`}
                  />
                  <label htmlFor="terms-acceptance" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    By clicking Next, you agree to our{' '}
                    <a 
                      href="/terms-of-service" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500 font-medium underline"
                    >
                      Terms of Use
                    </a>
                    {' '}and{' '}
                    <a 
                      href="/privacy-policy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500 font-medium underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </label>
                </div>
                {errors.terms && (
                  <p className="text-sm text-red-600">{errors.terms}</p>
                )}
                {errors.sellerCode && (
                  <p className="text-sm text-red-600">{errors.sellerCode}</p>
                )}

                {/* Step 1 Navigation */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Package Selection */}
          {currentStep === 2 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Package</h2>
              <p className="text-lg text-gray-600 mb-6">Select the scholarship package that best fits your needs</p>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <X className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              {errors.package && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{errors.package}</p>
                </div>
              )}

              {packagesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading packages...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                        formData.selectedPackage === pkg.package_number.toString()
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => handlePackageSelect(pkg.package_number)}
                    >
                      <div className="text-center mb-4">
                        <h3 className="font-bold text-xl text-gray-900 mb-2">{pkg.name}</h3>
                        <div className="text-3xl font-bold text-blue-600 mb-1">${pkg.scholarship_amount}</div>
                        <p className="text-sm text-gray-500">Scholarships starting from</p>
                      </div>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Selection Process Fee:</span>
                          <span className="font-semibold">${(pkg.selection_process_fee + (formData.dependents * 150) / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Scholarship Fee:</span>
                          <span className="font-semibold">${pkg.scholarship_fee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">I-20 Control Fee:</span>
                          <span className="font-semibold">${(pkg.i20_control_fee + (formData.dependents * 150) / 2).toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between">
                          <span className="text-gray-600 font-medium">Total Paid:</span>
                          <span className="font-bold text-green-600 text-lg">${(pkg.total_paid + formData.dependents * 150).toFixed(2)}</span>
                        </div>
                      </div>

                      {pkg.description && (
                        <p className="mt-2 text-xs text-gray-500">{pkg.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Dependents input has been moved to Step 1 */}

              {selectedPackage && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Selected Package Summary</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Package:</strong> {selectedPackage.name}</p>
                    <p><strong>Total Investment:</strong> ${selectedPackage.total_paid}</p>
                    <p><strong>Scholarships starting from:</strong> ${selectedPackage.scholarship_amount}</p>
                    <p><strong>Net Savings:</strong> ${selectedPackage.scholarship_amount - selectedPackage.total_paid}</p>
                  </div>
                </div>
              )}

              {/* Step 2 Navigation */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="bg-gray-500 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !selectedPackage}
                  className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Account Created Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Please check your email and click the verification link to activate your account.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerStudentRegistration;