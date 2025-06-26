import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Save,
  ArrowLeft,
  BookOpen,
  Target,
  Clock,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';

const MAX_IMAGE_SIZE_MB = 2;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const NewScholarship: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { university, loading: universityLoading, refreshData } = useUniversity();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: '',
    requirements: [''],
    field_of_study: '',
    level: 'undergraduate',
    eligibility: [''],
    benefits: [''],
    is_exclusive: false,
    is_active: true,
    original_annual_value: '',
    original_value_per_credit: '',
    annual_value_with_scholarship: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleArrayInputChange = (index: number, field: 'requirements' | 'eligibility' | 'benefits', value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const addArrayItem = (field: 'requirements' | 'eligibility' | 'benefits') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (index: number, field: 'requirements' | 'eligibility' | 'benefits') => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [field]: newArray.length ? newArray : ['']
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please select a JPG, PNG, or WEBP image file.');
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(`Image size must be less than ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    setImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImageToStorage = async (scholarshipId: string): Promise<string | null> => {
    if (!imageFile || !user) return null;

    try {
      setUploadingImage(true);
      
      // Create unique filename
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `scholarship-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to scholarship-images bucket
      const { data, error } = await supabase.storage
        .from('scholarship-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('scholarship-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!university?.id) {
      setError('University profile not found. Please complete your profile first.');
      setLoading(false);
      return;
    }

    // Validate form
    if (!formData.title.trim()) {
      setError('Scholarship title is required');
      setLoading(false);
      return;
    }

    if (!formData.original_annual_value.trim() || isNaN(Number(formData.original_annual_value))) {
      setError('Valid original annual value is required');
      setLoading(false);
      return;
    }
    if (!formData.original_value_per_credit.trim() || isNaN(Number(formData.original_value_per_credit))) {
      setError('Valid value per credit is required');
      setLoading(false);
      return;
    }
    if (!formData.annual_value_with_scholarship.trim() || isNaN(Number(formData.annual_value_with_scholarship))) {
      setError('Valid annual value with scholarship is required');
      setLoading(false);
      return;
    }

    if (!formData.deadline.trim()) {
      setError('Application deadline is required');
      setLoading(false);
      return;
    }

    // Filter out empty array items
    const requirements = formData.requirements.filter(item => item.trim());
    const eligibility = formData.eligibility.filter(item => item.trim());
    const benefits = formData.benefits.filter(item => item.trim());

    if (requirements.length === 0) {
      setError('At least one requirement is required');
      setLoading(false);
      return;
    }

    try {
      // 3. Prepare data for submission
      const scholarshipData = {
        title: formData.title,
        description: formData.description,
        amount: Number(formData.amount),
        deadline: formData.deadline,
        requirements,
        field_of_study: formData.field_of_study,
        level: formData.level,
        eligibility,
        benefits,
        is_exclusive: formData.is_exclusive,
        is_active: formData.is_active,
        university_id: university.id,
        image_url: null, // Will be updated after image upload
        original_annual_value: Number(formData.original_annual_value),
        original_value_per_credit: Number(formData.original_value_per_credit),
        annual_value_with_scholarship: Number(formData.annual_value_with_scholarship),
      };

      // 4. Insert scholarship first
      const { data: newScholarship, error: submitError } = await supabase
        .from('scholarships')
        .insert(scholarshipData)
        .select('id')
        .single();

      if (submitError) throw submitError;

      // 5. Upload image if provided
      if (imageFile && newScholarship) {
        try {
          const imageUrl = await uploadImageToStorage(newScholarship.id);
          if (imageUrl) {
            // Update scholarship with image URL
            const { error: updateError } = await supabase
              .from('scholarships')
              .update({ image_url: imageUrl })
              .eq('id', newScholarship.id);
            
            if (updateError) {
              console.error('Error updating scholarship with image URL:', updateError);
              // Don't fail the whole process if image update fails
            }
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          // Don't fail the whole process if image upload fails
        }
      }

      setSuccess(true);
      await refreshData(); // Refresh university data to include new scholarship
      navigate('/school/dashboard/scholarships');
    } catch (error: any) {
      console.error('Error creating scholarship:', error);
      setError(`Error creating scholarship: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen until university is available
  if (universityLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading university information...</p>
        </div>
      </div>
    );
  }

  // Show error if no university found
  if (!university) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">University Profile Not Found</h2>
          <p className="text-slate-600 mb-4">Please complete your university profile before creating scholarships.</p>
          <button
            onClick={() => navigate('/school/dashboard/profile')}
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors"
          >
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/school/dashboard/scholarships')}
            className="flex items-center text-slate-600 hover:text-[#05294E] mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scholarships
          </button>
          
          <h1 className="text-3xl font-bold text-slate-900">Create New Scholarship</h1>
          <p className="text-slate-600 mt-2">
            Define a new scholarship opportunity for international students
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <p className="text-green-700">Scholarship created successfully! Redirecting...</p>
            </div>
          </div>
        )}

        {/* Scholarship Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="space-y-8">
            {/* Image Upload Section */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <Award className="h-5 w-5 mr-2 text-[#05294E]" />
                Scholarship Image <span className="text-slate-400 ml-2">(optional)</span>
              </h2>
              
              {!imagePreview ? (
                <div className="flex flex-col items-start gap-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Upload Image (JPG, PNG, WEBP, max 2MB)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#05294E] file:text-white hover:file:bg-[#05294E]/90 transition-colors"
                  />
                  <p className="text-xs text-slate-500">
                    A good image helps attract more students to your scholarship opportunity.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Scholarship preview"
                      className="w-full max-w-md h-48 object-cover rounded-xl border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Image selected: {imageFile?.name}
                  </p>
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <Award className="h-5 w-5 mr-2 text-[#05294E]" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Scholarship Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., International Excellence Scholarship"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="Describe the scholarship, its purpose, and any special features"
                  />
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Financial Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Original Annual Value (USD) *
                  </label>
                  <input
                    type="number"
                    name="original_annual_value"
                    value={formData.original_annual_value}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 20000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Value Per Credit (USD) *
                  </label>
                  <input
                    type="number"
                    name="original_value_per_credit"
                    value={formData.original_value_per_credit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Annual Value With Scholarship (USD) *
                  </label>
                  <input
                    type="number"
                    name="annual_value_with_scholarship"
                    value={formData.annual_value_with_scholarship}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 12000"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application Deadline *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Eligibility & Requirements */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <Target className="h-5 w-5 mr-2 text-[#D0151C]" />
                Eligibility & Requirements
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Field of Study
                  </label>
                  <select
                    name="field_of_study"
                    value={formData.field_of_study}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  >
                    <option value="">Any Field</option>
                    <option value="STEM">STEM</option>
                    <option value="Business">Business</option>
                    <option value="Arts & Humanities">Arts & Humanities</option>
                    <option value="Social Sciences">Social Sciences</option>
                    <option value="Health Sciences">Health Sciences</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Law">Law</option>
                    <option value="Medicine">Medicine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Academic Level *
                  </label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    required
                  >
                    <option value="undergraduate">Undergraduate</option>
                    <option value="graduate">Graduate</option>
                    <option value="doctorate">Doctorate</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Requirements *
                    </label>
                    <button
                      type="button"
                      onClick={() => addArrayItem('requirements')}
                      className="text-sm text-[#05294E] hover:text-[#05294E]/80 font-medium"
                    >
                      + Add Requirement
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.requirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => handleArrayInputChange(index, 'requirements', e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                          placeholder="e.g., Minimum GPA 3.5"
                        />
                        {formData.requirements.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem(index, 'requirements')}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Eligibility Criteria
                    </label>
                    <button
                      type="button"
                      onClick={() => addArrayItem('eligibility')}
                      className="text-sm text-[#05294E] hover:text-[#05294E]/80 font-medium"
                    >
                      + Add Criterion
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.eligibility.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleArrayInputChange(index, 'eligibility', e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                          placeholder="e.g., International students only"
                        />
                        {formData.eligibility.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem(index, 'eligibility')}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits & Options */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                Benefits & Options
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Benefits
                    </label>
                    <button
                      type="button"
                      onClick={() => addArrayItem('benefits')}
                      className="text-sm text-[#05294E] hover:text-[#05294E]/80 font-medium"
                    >
                      + Add Benefit
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={benefit}
                          onChange={(e) => handleArrayInputChange(index, 'benefits', e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                          placeholder="e.g., Full tuition coverage"
                        />
                        {formData.benefits.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArrayItem(index, 'benefits')}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_exclusive"
                    name="is_exclusive"
                    checked={formData.is_exclusive}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 rounded border-slate-300 text-[#D0151C] focus:ring-[#D0151C]"
                  />
                  <div>
                    <label htmlFor="is_exclusive" className="font-medium text-slate-900">
                      Exclusive Scholarship
                    </label>
                    <p className="text-sm text-slate-500">
                      Mark this scholarship as exclusive to your university on our platform
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-600"
                  />
                  <div>
                    <label htmlFor="is_active" className="font-medium text-slate-900">
                      Active Scholarship
                    </label>
                    <p className="text-sm text-slate-500">
                      Make this scholarship immediately visible to students
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Important Information</h4>
                  <p className="text-sm text-blue-700">
                    All scholarships are subject to review by our team. Please ensure all information is accurate and up-to-date. 
                    You can edit or deactivate this scholarship at any time after creation.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={loading || uploadingImage || success}
                className="bg-[#05294E] text-white px-8 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || uploadingImage ? (
                  <>
                    <Clock className="animate-spin h-5 w-5 mr-2" />
                    {uploadingImage ? 'Uploading Image...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Create Scholarship
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewScholarship;