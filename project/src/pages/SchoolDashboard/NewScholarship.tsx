import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';

const MAX_IMAGE_SIZE_MB = 2;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FORM_STORAGE_KEY = 'new_scholarship_form_data';

const NewScholarship: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editScholarshipId = searchParams.get('edit');
  const isEditMode = Boolean(editScholarshipId);
  
  const { user } = useAuth();
  const { university, loading: universityLoading, refreshData } = useUniversity();
  const [loading, setLoading] = useState(false);
  const [loadingScholarship, setLoadingScholarship] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDataRestored, setIsDataRestored] = useState(false);
  
  // Novos estados para gerenciar programas
  const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);
  const [showNewProgramInput, setShowNewProgramInput] = useState(false);
  const [newProgramInput, setNewProgramInput] = useState('');
  const [savingNewProgram, setSavingNewProgram] = useState(false);

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
    work_permissions: [] as string[],
  });

  // Helper texts for work permissions
  const WORK_PERMISSION_DESCRIPTIONS: Record<string, string> = {
    F1: 'F-1 student visa. On-campus work allowed (limited hours). Off-campus work usually requires CPT or OPT authorization.',
    OPT: 'Optional Practical Training. Temporary employment directly related to the student\'s major area of study (pre- or post-completion).',
    CPT: 'Curricular Practical Training. Work authorization as part of an academic program (e.g., internships/practicums) while enrolled.',
  };

  // Função para salvar dados no localStorage
  const saveFormDataToStorage = useCallback((data: any) => {
    try {
      const dataToSave = {
        ...data,
        timestamp: new Date().toISOString(),
        userId: user?.id
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error);
    }
  }, [user?.id]);

  // Função para carregar dados do localStorage
  const loadFormDataFromStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Verificar se os dados são do usuário atual e não são muito antigos (24 horas)
        const isCurrentUser = parsedData.userId === user?.id;
        const isNotTooOld = new Date().getTime() - new Date(parsedData.timestamp).getTime() < 24 * 60 * 60 * 1000;
        
        if (isCurrentUser && isNotTooOld) {
          const { userId, timestamp, ...formDataOnly } = parsedData;
          return formDataOnly;
        } else {
          // Limpar dados antigos ou de outro usuário
          localStorage.removeItem(FORM_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load form data from localStorage:', error);
      localStorage.removeItem(FORM_STORAGE_KEY);
    }
    return null;
  }, [user?.id]);

  // Função para limpar dados salvos
  const clearSavedFormData = useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY);
  }, []);

  // Função para carregar dados da bolsa existente
  const loadScholarshipData = useCallback(async () => {
    if (!editScholarshipId || !university) return;
    
    setLoadingScholarship(true);
    try {
      const { data: scholarship, error } = await supabase
        .from('scholarships')
        .select('*')
        .eq('id', editScholarshipId)
        .eq('university_id', university.id)
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
          eligibility: scholarship.eligibility?.length ? scholarship.eligibility : [''],
          benefits: scholarship.benefits?.length ? scholarship.benefits : [''],
          is_exclusive: scholarship.is_exclusive || false,
          is_active: scholarship.is_active !== undefined ? scholarship.is_active : true,
          original_annual_value: scholarship.original_annual_value?.toString() || '',
          original_value_per_credit: scholarship.original_value_per_credit?.toString() || '',
          annual_value_with_scholarship: scholarship.annual_value_with_scholarship?.toString() || '',
          work_permissions: Array.isArray(scholarship.work_permissions) ? scholarship.work_permissions : [],
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
      // Redirect back if scholarship not found or access denied
      navigate('/school/dashboard/scholarships');
    } finally {
      setLoadingScholarship(false);
    }
  }, [editScholarshipId, university, navigate]);

  // Carregar dados salvos quando o componente monta (apenas para modo criar)
  useEffect(() => {
    if (user && !isDataRestored && !isEditMode) {
      const savedData = loadFormDataFromStorage();
      if (savedData) {
        setFormData(savedData);
        setIsDataRestored(true);
      }
    }
  }, [user, loadFormDataFromStorage, isDataRestored, isEditMode]);

  // Carregar dados da bolsa existente quando estiver em modo de edição
  useEffect(() => {
    if (isEditMode && university && !isDataRestored) {
      loadScholarshipData();
    }
  }, [isEditMode, university, isDataRestored, loadScholarshipData]);

  // Auto-salvar dados quando formData muda (debounced)
  useEffect(() => {
    if (isDataRestored && user) {
      const timeoutId = setTimeout(() => {
        // Só salvar se há dados significativos no formulário
        const hasSignificantData = formData.title.length > 0 || 
                                  formData.description.length > 0 || 
                                  formData.amount.length > 0 ||
                                  formData.original_annual_value.length > 0;
        
        if (hasSignificantData) {
          saveFormDataToStorage(formData);
        }
      }, 1000); // Debounce de 1 segundo

      return () => clearTimeout(timeoutId);
    }
  }, [formData, saveFormDataToStorage, isDataRestored, user]);

  // Carregar programas da universidade
  useEffect(() => {
    if (university?.programs && Array.isArray(university.programs)) {
      setAvailablePrograms(university.programs);
    }
  }, [university]);

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

  // Funções para gerenciar programas acadêmicos
  const handleAddNewProgram = async () => {
    if (!newProgramInput.trim() || !university?.id) return;

    // Verificar se o programa já existe
    const normalizedInput = newProgramInput.trim();
    if (availablePrograms.some(program => 
      program.toLowerCase() === normalizedInput.toLowerCase()
    )) {
      setError('This program already exists in your university profile');
      return;
    }

    setSavingNewProgram(true);
    setError(null);

    try {
      // Atualizar programas na universidade
      const updatedPrograms = [...availablePrograms, normalizedInput];
      
      const { error: updateError } = await supabase
        .from('universities')
        .update({ programs: updatedPrograms })
        .eq('id', university.id);

      if (updateError) throw updateError;

      // Atualizar estados locais
      setAvailablePrograms(updatedPrograms);
      setFormData(prev => ({
        ...prev,
        field_of_study: normalizedInput
      }));
      
      // Limpar input e fechar modal
      setNewProgramInput('');
      setShowNewProgramInput(false);
      
      // Refresh university data
      await refreshData();
      
    } catch (error) {
      console.error('Error adding new program:', error);
      setError('Failed to add new program. Please try again.');
    } finally {
      setSavingNewProgram(false);
    }
  };

  const handleCancelNewProgram = () => {
    setNewProgramInput('');
    setShowNewProgramInput(false);
    setError(null);
  };

  const handleNewProgramInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewProgramInput(e.target.value);
    setError(null);
  };

  const handleNewProgramKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewProgram();
    } else if (e.key === 'Escape') {
      handleCancelNewProgram();
    }
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

  // Função para salvar como rascunho
  const saveDraft = async () => {
    saveFormDataToStorage(formData);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
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

    if (!formData.deadline.trim()) {
      setError('Application deadline is required');
      setLoading(false);
      return;
    }

    if (!formData.field_of_study.trim()) {
      setError('Program is required. Please select or add a program.');
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
      // Prepare data for submission
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
        work_permissions: formData.work_permissions,
      };

      let scholarshipId: string;
      
      if (isEditMode && editScholarshipId) {
        // Update existing scholarship
        const { error: updateError } = await supabase
          .from('scholarships')
          .update(scholarshipData)
          .eq('id', editScholarshipId)
          .eq('university_id', university.id);

        if (updateError) throw updateError;
        scholarshipId = editScholarshipId;
      } else {
        // Insert new scholarship
        const { data: newScholarship, error: submitError } = await supabase
          .from('scholarships')
          .insert(scholarshipData)
          .select('id')
          .single();

        if (submitError) throw submitError;
        scholarshipId = newScholarship.id;
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
              // Don't fail the whole process if image update fails
            }
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          // Don't fail the whole process if image upload fails
        }
      }

      // Limpar dados salvos após sucesso
      clearSavedFormData();
      
      setSuccess(true);
      await refreshData(); // Refresh university data to include new scholarship
      
      // Aguardar um pouco antes de navegar para mostrar a mensagem de sucesso
      setTimeout(() => {
        navigate('/school/dashboard/scholarships');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating scholarship:', error);
      setError(`Error creating scholarship: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen until university is available
  if (universityLoading || loadingScholarship) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E] mx-auto mb-4"></div>
          <p className="text-slate-600">
            {loadingScholarship ? 'Loading scholarship data...' : 'Loading university information...'}
          </p>
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
            
            {/* Draft save button */}
            <button
              onClick={saveDraft}
              type="button"
              className="flex items-center px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </button>
          </div>
        </div>

        {/* Data Restored Notification */}
        {isDataRestored && (formData.title || formData.description) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <RefreshCw className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-blue-700 font-medium">Previous data restored</p>
                <p className="text-blue-600 text-sm">Your previously entered data has been automatically restored.</p>
              </div>
            </div>
          </div>
        )}

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
                {loading ? 'Scholarship created successfully! Redirecting...' : 'Draft saved successfully!'}
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
                    Programs *
                  </label>
                  
                  {!showNewProgramInput ? (
                    <div className="space-y-3">
                      <select
                        name="field_of_study"
                        value={formData.field_of_study}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                        title="Select program"
                        required
                      >
                        <option value="">Select a program...</option>
                        {availablePrograms.length > 0 && (
                          <optgroup label="Your University Programs">
                            {availablePrograms.map((program, index) => (
                              <option key={index} value={program}>
                                {program}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="General Categories">
                          <option value="STEM">STEM</option>
                          <option value="Business">Business</option>
                          <option value="Arts & Humanities">Arts & Humanities</option>
                          <option value="Social Sciences">Social Sciences</option>
                          <option value="Health Sciences">Health Sciences</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Law">Law</option>
                          <option value="Medicine">Medicine</option>
                        </optgroup>
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => setShowNewProgramInput(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-[#05294E] hover:text-[#05294E] transition-all duration-200"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Program to Your University
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newProgramInput}
                          onChange={handleNewProgramInputChange}
                          onKeyDown={handleNewProgramKeyPress}
                          placeholder="Enter new academic program name..."
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                          disabled={savingNewProgram}
                          autoFocus
                          title="Enter new program name"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewProgram}
                          disabled={savingNewProgram || !newProgramInput.trim()}
                          className="px-4 py-3 bg-[#05294E] text-white rounded-xl hover:bg-[#05294E]/90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          title="Add new program"
                        >
                          {savingNewProgram ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          {savingNewProgram ? 'Saving...' : 'Add'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelNewProgram}
                          disabled={savingNewProgram}
                          className="px-4 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                          title="Cancel adding new program"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <p className="text-sm text-slate-500">
                        This will add the program to your university profile and can be used for future scholarships.
                      </p>
                    </div>
                  )}
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
                    title="Select academic level"
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
              {/* Work Permissions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Work Permission (F-1 / OPT / CPT)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {['F1','OPT','CPT'].map((wp) => (
                    <label
                      key={wp}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none"
                      title={WORK_PERMISSION_DESCRIPTIONS[wp]}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#05294E]"
                        checked={formData.work_permissions.includes(wp)}
                        onChange={(e) => {
                          setFormData(prev => {
                            const has = prev.work_permissions.includes(wp);
                            const next = has
                              ? prev.work_permissions.filter(x => x !== wp)
                              : [...prev.work_permissions, wp];
                            return { ...prev, work_permissions: next };
                          });
                        }}
                      />
                      <span className="text-sm text-slate-700 font-medium">{wp}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Select all work permissions allowed for this scholarship. Hover each option to see a brief explanation.</p>
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

export default NewScholarship;