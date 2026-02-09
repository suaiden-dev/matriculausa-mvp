import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Info,
  RefreshCw,
  Plus,
  X,
  FileText,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const MAX_IMAGE_SIZE_MB = 2;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const AdminScholarshipEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingScholarship, setLoadingScholarship] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDataRestored, setIsDataRestored] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: '',
    requirements: [''],
    field_of_study: '',
    level: 'undergraduate',
    delivery_mode: 'in_person',
    eligibility: [''],
    benefits: [''],
    is_exclusive: false,
    is_active: true,
    original_annual_value: '',
    original_value_per_credit: '',
    annual_value_with_scholarship: '',
    work_permissions: [] as string[],
    application_fee_amount: '350.00',
    scholarship_fee_amount: '',
    scholarship_type: '',
    visaassistance: '',
    needcpt: false,
    university_id: '',
    internal_fees: [] as { category: string; amount: string; details: string; }[],
  });

  // Helper texts for work permissions
  const WORK_PERMISSION_DESCRIPTIONS: Record<string, string> = {
    F1: 'F-1 student visa. On-campus work allowed (limited hours). Off-campus work usually requires CPT or OPT authorization.',
    OPT: 'Optional Practical Training. Temporary employment directly related to the student\'s major area of study (pre- or post-completion).',
    CPT: 'Curricular Practical Training. Work authorization as part of an academic program (e.g., internships/practicums) while enrolled.',
  };

  const toggleWorkPermission = (wp: string) => {
    setFormData(prev => {
      const has = prev.work_permissions.includes(wp);
      const next = has ? prev.work_permissions.filter(x => x !== wp) : [...prev.work_permissions, wp];
      return { ...prev, work_permissions: next };
    });
  };



  const addInternalFee = () => {
    setFormData(prev => ({
      ...prev,
      internal_fees: [...prev.internal_fees, { category: '', amount: '', details: '' }]
    }));
  };

  const removeInternalFee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      internal_fees: prev.internal_fees.filter((_, i) => i !== index)
    }));
  };

  const handleInternalFeeChange = (index: number, field: 'category' | 'amount' | 'details', value: string) => {
    setFormData(prev => {
      const newFees = [...prev.internal_fees];
      newFees[index] = { ...newFees[index], [field]: value };
      return { ...prev, internal_fees: newFees };
    });
  };

  // Função para carregar dados da bolsa existente
  const loadScholarshipData = useCallback(async () => {
    if (!id) return;
    
    setLoadingScholarship(true);
    try {
      const { data: scholarship, error } = await supabase
        .from('scholarships')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (scholarship) {
        setFormData({
          title: scholarship.title || '',
          description: scholarship.description || '',
          amount: scholarship.amount?.toString() || '',
          deadline: scholarship.deadline || '',
          requirements: scholarship.requirements?.length ? scholarship.requirements : [''],
          field_of_study: scholarship.field_of_study || '',
          level: scholarship.level || 'undergraduate',
          delivery_mode: scholarship.delivery_mode || 'in_person',
          eligibility: scholarship.eligibility?.length ? scholarship.eligibility : [''],
          benefits: scholarship.benefits?.length ? scholarship.benefits : [''],
          is_exclusive: scholarship.is_exclusive || false,
          is_active: scholarship.is_active !== undefined ? scholarship.is_active : true,
          original_annual_value: scholarship.original_annual_value?.toString() || '',
          original_value_per_credit: scholarship.original_value_per_credit?.toString() || '',
          annual_value_with_scholarship: scholarship.annual_value_with_scholarship?.toString() || '',
          work_permissions: Array.isArray(scholarship.work_permissions) ? scholarship.work_permissions : [],
          application_fee_amount: scholarship.application_fee_amount?.toString() || '350.00',
          scholarship_fee_amount: scholarship.scholarship_fee_amount?.toString() || '',
          scholarship_type: scholarship.scholarship_type || '',
          visaassistance: scholarship.visaassistance || '',
          needcpt: scholarship.needcpt || false,
          university_id: scholarship.university_id || '',
          internal_fees: Array.isArray(scholarship.internal_fees) 
            ? scholarship.internal_fees.map((f: any) => ({
                category: f.category || f.name || '',
                amount: f.amount?.toString() || '',
                details: f.details || f.frequency || ''
              }))
            : typeof scholarship.internal_fees === 'string'
              ? (() => {
                  try {
                    const parsed = JSON.parse(scholarship.internal_fees);
                    return Array.isArray(parsed) ? parsed.map((f: any) => ({
                       category: f.category || f.name || '',
                       amount: f.amount?.toString() || '',
                       details: f.details || f.frequency || ''
                    })) : [];
                  } catch { return []; }
                })()
              : [],
        });

        // Set image preview if exists
        if (scholarship.image_url) {
          setImagePreview(scholarship.image_url);
        }

        setIsDataRestored(true);
      }
    } catch (error: any) {
      console.error('Error loading scholarship:', error);
      setError(`Error loading scholarship: ${error.message}`);
      // Redirect back if scholarship not found
      setTimeout(() => {
        navigate('/admin/dashboard/scholarships');
      }, 2000);
    } finally {
      setLoadingScholarship(false);
    }
  }, [id, navigate]);

  // Carregar dados da bolsa existente quando estiver em modo de edição
  useEffect(() => {
    if (isEditMode && !isDataRestored) {
      loadScholarshipData();
    }
  }, [isEditMode, isDataRestored, loadScholarshipData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validação específica para o campo deadline
    if (name === 'deadline' && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        return;
      }
    }
    
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
    
    // Validate form
    if (!formData.title.trim()) {
      setError('Scholarship title is required');
      setLoading(false);
      return;
    }

    if (
      formData.original_annual_value && isNaN(Number(formData.original_annual_value))
    ) {
      setError('Only numbers are allowed in Original Annual Value');
      setLoading(false);
      return;
    }
    if (
      formData.original_value_per_credit && isNaN(Number(formData.original_value_per_credit))
    ) {
      setError('Only numbers are allowed in Value Per Credit');
      setLoading(false);
      return;
    }
    if (
      formData.annual_value_with_scholarship && isNaN(Number(formData.annual_value_with_scholarship))
    ) {
      setError('Only numbers are allowed in Annual Value With Scholarship');
      setLoading(false);
      return;
    }

    // Validação para campos de taxa dinâmica
    if (!formData.application_fee_amount || isNaN(Number(formData.application_fee_amount)) || Number(formData.application_fee_amount) < 0) {
      setError('Application fee amount must be a valid positive number');
      setLoading(false);
      return;
    }

    if (!formData.deadline.trim()) {
      setError('Application deadline is required');
      setLoading(false);
      return;
    }

    // Validar se a data não é anterior a hoje
    const selectedDate = new Date(formData.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setError('Application deadline cannot be in the past');
      setLoading(false);
      return;
    }

    if (!formData.field_of_study.trim()) {
      setError('Program is required.');
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

    if (!formData.university_id) {
      setError('University ID is required');
      setLoading(false);
      return;
    }

    try {
      // Helper to build payload
      const buildPayload = (includeWP: boolean, includeDM: boolean, preserveImage: boolean = false) => {
        const payload: any = {
          title: formData.title,
          description: formData.description,
          amount: Number(formData.amount) || 0,
          deadline: formData.deadline,
          requirements,
          field_of_study: formData.field_of_study,
          level: formData.level,
          eligibility,
          benefits,
          is_exclusive: formData.is_exclusive,
          is_active: formData.is_active,
          university_id: formData.university_id,
          original_annual_value: formData.original_annual_value ? Number(formData.original_annual_value) : null,
          original_value_per_credit: formData.original_value_per_credit ? Number(formData.original_value_per_credit) : null,
          annual_value_with_scholarship: formData.annual_value_with_scholarship ? Number(formData.annual_value_with_scholarship) : null,
          application_fee_amount: Number(formData.application_fee_amount),
          scholarship_type: formData.scholarship_type || null,
          visaassistance: formData.visaassistance || null,
          needcpt: formData.needcpt,
          internal_fees: formData.internal_fees
            .filter(fee => fee.category.trim() !== '' && fee.amount.trim() !== '')
            .map(fee => ({
              category: fee.category,
              amount: Number(fee.amount),
              details: fee.details
            })),
        };
        
        if (formData.scholarship_fee_amount) {
          payload.scholarship_fee_amount = Number(formData.scholarship_fee_amount);
        }
        
        // Only set image_url to null if we're not preserving the existing image
        if (!preserveImage) {
          payload.image_url = null; // Will be updated after image upload
        }
        
        if (includeWP) payload.work_permissions = formData.work_permissions.filter((wp) => wp !== 'F1');
        if (includeDM) payload.delivery_mode = formData.delivery_mode;
        return payload;
      };

      let scholarshipId: string;

      if (isEditMode && id) {
        // Update existing scholarship (try with WP first, fallback without)
        const preserveImage = !imageFile;
        let { error: updateErr } = await supabase
          .from('scholarships')
          .update(buildPayload(true, true, preserveImage))
          .eq('id', id);

        if (updateErr && (String(updateErr.message || '').includes('work_permissions') || String(updateErr.message || '').includes('delivery_mode'))) {
          const res2 = await supabase
            .from('scholarships')
            .update(buildPayload(false, false, preserveImage))
            .eq('id', id);
          updateErr = res2.error || null;
        }
        if (updateErr) throw updateErr;
        scholarshipId = id;
      } else {
        // Insert new scholarship (try with WP first, fallback without)
        let insertResp = await supabase
          .from('scholarships')
          .insert(buildPayload(true, true, false))
          .select('id')
          .single();

        if (insertResp.error && (String(insertResp.error.message || '').includes('work_permissions') || String(insertResp.error.message || '').includes('delivery_mode'))) {
          insertResp = await supabase
            .from('scholarships')
            .insert(buildPayload(false, false, false))
            .select('id')
            .single();
        }

        if (insertResp.error) throw insertResp.error;
        scholarshipId = insertResp.data!.id;
      }

      // Upload image if provided
      if (imageFile && scholarshipId) {
        try {
          const imageUrl = await uploadImageToStorage(scholarshipId);
          if (imageUrl) {
            // Update scholarship with image URL
            const { error: updateError } = await supabase
              .from('scholarships')
              .update({ image_url: imageUrl })
              .eq('id', scholarshipId);
            
            if (updateError) {
              console.error('Error updating scholarship with image URL:', updateError);
            }
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
        }
      }

      setSuccess(true);
      
      // Aguardar um pouco antes de navegar para mostrar a mensagem de sucesso
      setTimeout(() => {
        navigate('/admin/dashboard/scholarships');
      }, 2000);
    } catch (error: any) {
      console.error('Error saving scholarship:', error);
      setError(`Error saving scholarship: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen until scholarship is loaded
  if (loadingScholarship) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading scholarship data...</p>
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
            onClick={() => navigate('/admin/dashboard/scholarships')}
            className="flex items-center text-slate-600 hover:text-[#05294E] mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scholarships
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {isEditMode ? 'Edit Scholarship' : 'Create New Scholarship'}
              </h1>
              <p className="text-slate-600 mt-2">
                {isEditMode 
                  ? 'Update scholarship details and requirements'
                  : 'Define a new scholarship opportunity for international students'
                }
              </p>
            </div>
          </div>
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
              <p className="text-green-700">
                {loading ? 'Scholarship saved successfully! Redirecting...' : 'Scholarship saved successfully!'}
              </p>
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
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    University ID *
                  </label>
                  <input
                    type="text"
                    name="university_id"
                    value={formData.university_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="Enter university ID"
                    required
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
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 20000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Original Annual Value (USD)
                  </label>
                  <input
                    type="number"
                    name="original_annual_value"
                    value={formData.original_annual_value}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 20000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Value Per Credit (USD)
                  </label>
                  <input
                    type="number"
                    name="original_value_per_credit"
                    value={formData.original_value_per_credit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Annual Value With Scholarship (USD)
                  </label>
                  <input
                    type="number"
                    name="annual_value_with_scholarship"
                    value={formData.annual_value_with_scholarship}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 12000"
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
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* University Internal Fees Configuration */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-[#05294E]" />
                  University Internal Fees
                </h2>
                <button
                  type="button"
                  onClick={addInternalFee}
                  className="text-sm bg-[#05294E]/10 text-[#05294E] hover:bg-[#05294E]/20 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Fee
                </button>
              </div>

              {formData.internal_fees.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                  <p className="text-slate-500 mb-2">No internal fees configured.</p>
                  <p className="text-sm text-slate-400">Add fees like registration, technology fee, or student services fee.</p>
                  <button
                    type="button"
                    onClick={addInternalFee}
                    className="mt-4 text-[#05294E] font-medium hover:underline"
                  >
                    Add your first fee
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.internal_fees.map((fee, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                      <button
                        type="button"
                        onClick={() => removeInternalFee(index)}
                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove fee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Fee Name
                          </label>
                          <input
                            type="text"
                            value={fee.category}
                            onChange={(e) => handleInternalFeeChange(index, 'category', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                            placeholder="e.g. Registration Fee"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Amount (USD)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400">$</span>
                            <input
                              type="number"
                              value={fee.amount}
                              onChange={(e) => handleInternalFeeChange(index, 'amount', e.target.value)}
                              className="w-full pl-6 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Frequency / Detail
                          </label>
                          <input
                            type="text"
                            value={fee.details}
                            onChange={(e) => handleInternalFeeChange(index, 'details', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E]/20 focus:border-[#05294E]"
                            placeholder="e.g. One-time fee"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 text-xs text-slate-500 flex gap-2 items-center">
                 <Info className="h-3 w-3" />
                 <span>These fees will be displayed to the student in the program breakdown.</span>
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
                    Programs *
                  </label>
                  <input
                    type="text"
                    name="field_of_study"
                    value={formData.field_of_study}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., STEM, Business, Engineering"
                    required
                  />
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Course Modality
                  </label>
                  <select
                    name="delivery_mode"
                    value={formData.delivery_mode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  >
                    <option value="in_person">In-person</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="online">Online</option>
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
                            <X className="h-4 w-4" />
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
                            <X className="h-4 w-4" />
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
                {/* Work Permissions */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      Work Permission (OPT / CPT)
                    </label>
                    <div className="relative group">
                      <Info className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                      <div className="pointer-events-none absolute left-1/2 z-10 hidden -translate-x-1/2 translate-y-2 whitespace-normal rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block w-80 text-left">
                        <p className="font-semibold mb-1">What each option means</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><span className="font-semibold">OPT</span>: {WORK_PERMISSION_DESCRIPTIONS['OPT']}</li>
                          <li><span className="font-semibold">CPT</span>: {WORK_PERMISSION_DESCRIPTIONS['CPT']}</li>
                        </ul>
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-slate-900"></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {['OPT','CPT'].map((wp) => {
                      const checked = formData.work_permissions.includes(wp);
                      return (
                        <label
                          key={wp}
                          className={`flex items-center gap-2 px-3 py-1.5 border rounded-md w-fit min-w-[150px] cursor-pointer transition-colors ${
                            checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#05294E]"
                            checked={checked}
                            onChange={() => toggleWorkPermission(wp)}
                          />
                          <span className="text-sm text-slate-700 font-medium leading-none">{wp}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

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
                            <X className="h-4 w-4" />
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
                      Mark this scholarship as exclusive
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
                    className="h-5 w-5 rounded border-slate-300 text-[#05294E] focus:ring-[#05294E]"
                  />
                  <div>
                    <label htmlFor="is_active" className="font-medium text-slate-900">
                      Active Scholarship
                    </label>
                    <p className="text-sm text-slate-500">
                      Make this scholarship visible to students
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="needcpt"
                    name="needcpt"
                    checked={formData.needcpt}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5 rounded border-slate-300 text-[#05294E] focus:ring-[#05294E]"
                  />
                  <div>
                    <label htmlFor="needcpt" className="font-medium text-slate-900">
                      Requires CPT
                    </label>
                    <p className="text-sm text-slate-500">
                      This scholarship requires Curricular Practical Training
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Fee Configuration Section */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-purple-600" />
                Application Fee Configuration
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Application Fee Amount (USD) *
                  </label>
                  <input
                    type="number"
                    name="application_fee_amount"
                    value={formData.application_fee_amount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 350.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Scholarship Fee Amount (USD)
                  </label>
                  <input
                    type="number"
                    name="scholarship_fee_amount"
                    value={formData.scholarship_fee_amount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., 500.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Scholarship Type
                  </label>
                  <select
                    name="scholarship_type"
                    value={formData.scholarship_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  >
                    <option value="">Select type...</option>
                    <option value="Especial">Especial</option>
                    <option value="Prata">Prata</option>
                    <option value="Ouro">Ouro</option>
                    <option value="Platina">Platina</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Visa Assistance
                  </label>
                  <input
                    type="text"
                    name="visaassistance"
                    value={formData.visaassistance}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="e.g., F1 visa support"
                  />
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
                    {uploadingImage ? 'Uploading Image...' : (isEditMode ? 'Updating...' : 'Creating...')}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    {isEditMode ? 'Update Scholarship' : 'Create Scholarship'}
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

export default AdminScholarshipEdit;
