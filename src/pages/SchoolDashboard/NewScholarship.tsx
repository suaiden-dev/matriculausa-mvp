import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Award, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Save,
  BookOpen,
  Building,
  Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const NewScholarship: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [universityId, setUniversityId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    originalValuePerCredit: '',
    originalAnnualValue: '',
    amount: '', // Annual scholarship value
    scholarshipType: 'Especial',
    applicablePrograms: [] as string[],
    deadline: '',
    description: '',
    requirements: [] as string[],
    benefits: [] as string[],
    is_exclusive: false
  });

  const [newRequirement, setNewRequirement] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchUniversityId();
    }
  }, [user]);

  const fetchUniversityId = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('universities')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setUniversityId(data.id);
      }
    } catch (error) {
      console.error('Error fetching university ID:', error);
      setError('Unable to fetch university information. Please try again later.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleProgramChange = (program: string) => {
    setFormData(prev => {
      const updatedPrograms = prev.applicablePrograms.includes(program)
        ? prev.applicablePrograms.filter(p => p !== program)
        : [...prev.applicablePrograms, program];
      
      return {
        ...prev,
        applicablePrograms: updatedPrograms
      };
    });

    // Clear error when user makes a selection
    if (errors.applicablePrograms) {
      setErrors(prev => ({ ...prev, applicablePrograms: '' }));
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Scholarship name is required';
    }

    if (!formData.originalValuePerCredit.trim()) {
      newErrors.originalValuePerCredit = 'Original value per credit is required';
    } else if (isNaN(parseFloat(formData.originalValuePerCredit))) {
      newErrors.originalValuePerCredit = 'Must be a valid number';
    }

    if (!formData.originalAnnualValue.trim()) {
      newErrors.originalAnnualValue = 'Original annual value is required';
    } else if (isNaN(parseFloat(formData.originalAnnualValue))) {
      newErrors.originalAnnualValue = 'Must be a valid number';
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Annual scholarship value is required';
    } else if (isNaN(parseFloat(formData.amount))) {
      newErrors.amount = 'Must be a valid number';
    }

    if (formData.applicablePrograms.length === 0) {
      newErrors.applicablePrograms = 'At least one program must be selected';
    }

    if (!formData.deadline.trim()) {
      newErrors.deadline = 'Application deadline is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !universityId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare scholarship data
      const scholarshipData = {
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        deadline: formData.deadline,
        requirements: formData.requirements,
        field_of_study: formData.applicablePrograms.join(', '),
        level: formData.applicablePrograms.includes('Undergraduate') ? 'undergraduate' : 
               formData.applicablePrograms.includes('Master') ? 'graduate' : 'doctorate',
        eligibility: formData.applicablePrograms,
        benefits: formData.benefits,
        is_exclusive: formData.is_exclusive,
        is_active: true,
        university_id: universityId,
        // Additional fields for the new requirements
        original_value_per_credit: parseFloat(formData.originalValuePerCredit),
        original_annual_value: parseFloat(formData.originalAnnualValue),
        scholarship_type: formData.scholarshipType
      };

      // Insert into database
      const { error: insertError } = await supabase
        .from('scholarships')
        .insert(scholarshipData);

      if (insertError) throw insertError;

      // Show success message and redirect
      setSuccess(true);
      setTimeout(() => {
        navigate('/school/dashboard/scholarships');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating scholarship:', err);
      setError(err.message || 'Failed to create scholarship. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
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
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Scholarship</h1>
          <p className="text-slate-600">Define a new scholarship opportunity for international students</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-green-800">Scholarship Created Successfully</h3>
              <p className="text-green-700 text-sm mt-1">
                Your new scholarship has been created and is now available to students.
                Redirecting to scholarships page...
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800">Error Creating Scholarship</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Scholarship Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="space-y-8">
              {/* Basic Information Section */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <Award className="h-5 w-5 mr-2 text-[#D0151C]" />
                  Scholarship Information
                </h2>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                      Scholarship Program Name *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-slate-50 border ${errors.title ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200`}
                      placeholder="e.g., Academic Excellence Scholarship"
                    />
                    {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="originalValuePerCredit" className="block text-sm font-medium text-slate-700 mb-2">
                        Original Value Per Credit *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          id="originalValuePerCredit"
                          name="originalValuePerCredit"
                          value={formData.originalValuePerCredit}
                          onChange={handleInputChange}
                          className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${errors.originalValuePerCredit ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200`}
                          placeholder="e.g., 1000"
                        />
                      </div>
                      {errors.originalValuePerCredit && <p className="mt-1 text-sm text-red-600">{errors.originalValuePerCredit}</p>}
                    </div>

                    <div>
                      <label htmlFor="originalAnnualValue" className="block text-sm font-medium text-slate-700 mb-2">
                        Original Annual Program Value *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          id="originalAnnualValue"
                          name="originalAnnualValue"
                          value={formData.originalAnnualValue}
                          onChange={handleInputChange}
                          className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${errors.originalAnnualValue ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200`}
                          placeholder="e.g., 30000"
                        />
                      </div>
                      {errors.originalAnnualValue && <p className="mt-1 text-sm text-red-600">{errors.originalAnnualValue}</p>}
                    </div>

                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-2">
                        Annual Scholarship Value *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          id="amount"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${errors.amount ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200`}
                          placeholder="e.g., 15000"
                        />
                      </div>
                      {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="scholarshipType" className="block text-sm font-medium text-slate-700 mb-2">
                        Scholarship Type *
                      </label>
                      <div className="relative">
                        <Tag className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <select
                          id="scholarshipType"
                          name="scholarshipType"
                          value={formData.scholarshipType}
                          onChange={handleInputChange}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                        >
                          <option value="Especial">Especial</option>
                          <option value="Prata">Prata (Silver)</option>
                          <option value="Ouro">Ouro (Gold)</option>
                          <option value="Platina">Platina (Platinum)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 mb-2">
                        Application Deadline *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                          type="date"
                          id="deadline"
                          name="deadline"
                          value={formData.deadline}
                          onChange={handleInputChange}
                          className={`w-full pl-12 pr-4 py-3 bg-slate-50 border ${errors.deadline ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200`}
                        />
                      </div>
                      {errors.deadline && <p className="mt-1 text-sm text-red-600">{errors.deadline}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Applicable Programs *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['Undergraduate', 'Master', 'Doctor'].map((program) => (
                        <div key={program} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`program-${program}`}
                            checked={formData.applicablePrograms.includes(program)}
                            onChange={() => handleProgramChange(program)}
                            className="h-4 w-4 text-[#05294E] border-slate-300 rounded focus:ring-[#05294E]"
                          />
                          <label htmlFor={`program-${program}`} className="ml-2 text-sm text-slate-700">
                            {program}
                          </label>
                        </div>
                      ))}
                    </div>
                    {errors.applicablePrograms && <p className="mt-1 text-sm text-red-600">{errors.applicablePrograms}</p>}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="Describe this scholarship opportunity..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_exclusive"
                      name="is_exclusive"
                      checked={formData.is_exclusive}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-[#D0151C] border-slate-300 rounded focus:ring-[#D0151C]"
                    />
                    <label htmlFor="is_exclusive" className="ml-2 text-sm text-slate-700">
                      Mark as Exclusive Scholarship (only available through Matrícula USA)
                    </label>
                  </div>
                </div>
              </div>

              {/* Requirements Section */}
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Requirements & Benefits
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Requirements
                    </label>
                    <div className="flex mb-2">
                      <input
                        type="text"
                        value={newRequirement}
                        onChange={(e) => setNewRequirement(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                        placeholder="Add a requirement"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                      />
                      <button
                        type="button"
                        onClick={addRequirement}
                        className="px-4 py-2 bg-[#05294E] text-white rounded-r-xl hover:bg-[#05294E]/90 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      {formData.requirements.length > 0 ? (
                        formData.requirements.map((req, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-slate-700">{req}</span>
                            <button
                              type="button"
                              onClick={() => removeRequirement(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 italic">No requirements added yet</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Benefits
                    </label>
                    <div className="flex mb-2">
                      <input
                        type="text"
                        value={newBenefit}
                        onChange={(e) => setNewBenefit(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                        placeholder="Add a benefit"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                      />
                      <button
                        type="button"
                        onClick={addBenefit}
                        className="px-4 py-2 bg-[#05294E] text-white rounded-r-xl hover:bg-[#05294E]/90 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      {formData.benefits.length > 0 ? (
                        formData.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                            <span className="text-sm text-slate-700">{benefit}</span>
                            <button
                              type="button"
                              onClick={() => removeBenefit(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 italic">No benefits added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/school/dashboard/scholarships')}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#D0151C] text-white rounded-xl hover:bg-[#B01218] transition-colors font-bold shadow-lg flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Scholarship
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewScholarship;