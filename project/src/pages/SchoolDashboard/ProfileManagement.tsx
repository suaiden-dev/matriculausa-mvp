import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Edit, 
  Settings, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  Users,
  Award,
  CheckCircle,
  AlertCircle,
  Camera,
  Save,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';

const ProfileManagement: React.FC = () => {
  const { university, refreshData } = useUniversity();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(university?.image_url);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    name: university?.name || '',
    description: university?.description || '',
    website: university?.website || '',
    location: university?.location || '',
    contact: {
      phone: university?.contact?.phone || '',
      email: university?.contact?.email || '',
      admissionsEmail: university?.contact?.admissionsEmail || '',
      fax: university?.contact?.fax || ''
    },
    programs: university?.programs || []
  });

  // Academic programs editing state
  const [newProgram, setNewProgram] = useState('');
  const [programError, setProgramError] = useState<string | null>(null);

  // Refs for form elements
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const admissionsEmailRef = useRef<HTMLInputElement>(null);
  const faxRef = useRef<HTMLInputElement>(null);

  const profileCompleteness = university ? (
    (university.name ? 20 : 0) +
    (university.description ? 20 : 0) +
    (university.location ? 15 : 0) +
    (university.website ? 15 : 0) +
    (university.contact?.email ? 10 : 0) +
    (university.contact?.phone ? 10 : 0) +
    (university.programs && university.programs.length > 0 ? 10 : 0)
  ) : 0;

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !university) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `university_${university.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('university-profile-pictures')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage
        .from('university-profile-pictures')
        .getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error('Could not get image URL');
      // Update university record
      const { error: updateError } = await supabase
        .from('universities')
        .update({ image_url: publicUrl })
        .eq('id', university.id);
      if (updateError) throw updateError;
      setImageUrl(publicUrl);
    } catch (err: any) {
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddProgram = () => {
    if (!newProgram.trim()) {
      setProgramError('Program name cannot be empty');
      return;
    }

    // Check for duplicates (case insensitive)
    const normalizedNewProgram = newProgram.trim().toLowerCase();
    const isDuplicate = formData.programs.some(
      program => program.toLowerCase() === normalizedNewProgram
    );

    if (isDuplicate) {
      setProgramError('This program already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      programs: [...prev.programs, newProgram.trim()]
    }));
    setNewProgram('');
    setProgramError(null);
  };

  const handleRemoveProgram = (index: number) => {
    setFormData(prev => ({
      ...prev,
      programs: prev.programs.filter((_, i) => i !== index)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProgram();
    }
  };

  const resetFormData = () => {
    setFormData({
      name: university?.name || '',
      description: university?.description || '',
      website: university?.website || '',
      location: university?.location || '',
      contact: {
        phone: university?.contact?.phone || '',
        email: university?.contact?.email || '',
        admissionsEmail: university?.contact?.admissionsEmail || '',
        fax: university?.contact?.fax || ''
      },
      programs: university?.programs || []
    });
  };

  const handleCancel = () => {
    if (isEditing) {
      const hasChanges = (
        formData.name !== (university?.name || '') ||
        formData.description !== (university?.description || '') ||
        formData.website !== (university?.website || '') ||
        formData.location !== (university?.location || '') ||
        formData.contact.phone !== (university?.contact?.phone || '') ||
        formData.contact.email !== (university?.contact?.email || '') ||
        formData.contact.admissionsEmail !== (university?.contact?.admissionsEmail || '') ||
        formData.contact.fax !== (university?.contact?.fax || '') ||
        JSON.stringify(formData.programs) !== JSON.stringify(university?.programs || [])
      );

      if (hasChanges) {
        const confirmDiscard = window.confirm(
          'You have unsaved changes. Are you sure you want to discard them?'
        );
        if (!confirmDiscard) return;
      }
    }

    resetFormData();
    setIsEditing(false);
    setNewProgram('');
    setProgramError(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!university || !user) return;

    // Get current values from form inputs
    const currentFormData = {
      name: nameRef.current?.value || '',
      description: descriptionRef.current?.value || '',
      website: websiteRef.current?.value || '',
      location: locationRef.current?.value || '',
      contact: {
        phone: phoneRef.current?.value || '',
        email: emailRef.current?.value || '',
        admissionsEmail: admissionsEmailRef.current?.value || '',
        fax: faxRef.current?.value || ''
      },
      programs: formData.programs
    };

    // Basic validation
    if (!currentFormData.name.trim()) {
      setErrorMessage('University name is required');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updateData = {
        name: currentFormData.name.trim(),
        description: currentFormData.description.trim() || null,
        website: currentFormData.website.trim() || null,
        location: currentFormData.location.trim() || null,
        contact: currentFormData.contact,
        programs: currentFormData.programs,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('universities')
        .update(updateData)
        .eq('id', university.id);

      if (error) throw error;

      // Update local state
      setFormData(currentFormData);
      
      // Refresh university data
      await refreshData();
      
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!university) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Building className="h-12 w-12 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">University profile not found</h3>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          Create your university profile to showcase your institution to international students
        </p>
        <Link
          to="/school/setup-profile"
          className="bg-gradient-to-r from-[#05294E] to-blue-700 text-white px-8 py-4 rounded-xl hover:from-[#05294E]/90 hover:to-blue-600 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Create University Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#05294E] to-blue-700 rounded-2xl p-4 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 w-full">
              <div className="relative mb-4 sm:mb-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt="University Logo" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Building className="h-12 w-12 text-white" />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-[#05294E] rounded-lg flex items-center justify-center shadow-lg opacity-50 cursor-not-allowed"
                  disabled
                  title="Profile picture upload temporarily disabled"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  id="university-profile-pic-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePicChange}
                  disabled={uploading}
                  aria-label="Upload university profile picture"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05294E]"></div>
                  </div>
                )}
                {uploadError && (
                  <div className="absolute left-0 right-0 -bottom-8 text-red-200 text-xs mt-2 text-center">{uploadError}</div>
                )}
              </div>
              <div className="flex-1 w-full">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{university.name}</h1>
                <div className="flex flex-wrap items-center gap-2 text-blue-100 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {university.location}
                  </div>
                  {university.website && (
                    <a 
                      href={university.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-white transition-colors"
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Website
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    university.is_approved 
                      ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                      : 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
                  }`}>
                    {university.is_approved ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        University Approved
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Pending Approval
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={isEditing ? handleCancel : () => setIsEditing(true)}
                disabled={saving}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium flex items-center shadow-lg justify-center disabled:opacity-50"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </button>
              {!university.profile_completed && (
                <Link
                  to="/school/setup-profile"
                  className="bg-white text-[#05294E] px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-slate-100 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 text-center"
                >
                  <Settings className="h-4 w-4 mr-2 inline" />
                  Complete Profile
                </Link>
              )}
            </div>
          </div>
          {/* Profile Completeness */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-2 gap-2">
              <span className="font-medium">Profile Completeness</span>
              <span className="font-bold">{profileCompleteness}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${profileCompleteness}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Basic Information</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[#05294E] hover:text-[#05294E]/80 font-medium text-sm flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">University Name *</label>
                  <input
                    ref={nameRef}
                    type="text"
                    defaultValue={formData.name}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    ref={descriptionRef}
                    rows={4}
                    defaultValue={formData.description}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                    placeholder="Describe your university..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                    <input
                      ref={websiteRef}
                      type="url"
                      defaultValue={formData.website}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="https://university.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input
                      ref={locationRef}
                      type="text"
                      defaultValue={formData.location}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="City, State"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-500">University Name</label>
                  <p className="text-lg font-semibold text-slate-900">{university.name}</p>
                </div>

                {university.description && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Description</label>
                    <p className="text-slate-700 leading-relaxed mt-1">{university.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Website</label>
                    {university.website ? (
                      <a 
                        href={university.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[#05294E] hover:underline flex items-center mt-1"
                      >
                        {university.website}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    ) : (
                      <p className="text-slate-400 mt-1">Not provided</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-500">Location</label>
                    <p className="text-slate-900 mt-1">{university.location}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Contact Information</h3>
              {!isEditing && (
              <button
                onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                className="text-slate-500 hover:text-slate-700 flex items-center text-sm"
              >
                {showSensitiveInfo ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show
                  </>
                )}
              </button>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    <input
                      ref={phoneRef}
                      type="tel"
                      defaultValue={formData.contact.phone}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">General Email</label>
                    <input
                      ref={emailRef}
                      type="email"
                      defaultValue={formData.contact.email}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="info@university.edu"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Admissions Email</label>
                    <input
                      ref={admissionsEmailRef}
                      type="email"
                      defaultValue={formData.contact.admissionsEmail}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="admissions@university.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fax</label>
                    <input
                      ref={faxRef}
                      type="tel"
                      defaultValue={formData.contact.fax}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="+1 (555) 123-4568"
                    />
                  </div>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone
                  </label>
                  <p className="text-slate-900 mt-1">
                    {showSensitiveInfo 
                      ? university.contact?.phone || 'Not provided'
                      : '•••••••••••'
                    }
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    General Email
                  </label>
                  <p className="text-slate-900 mt-1">
                    {showSensitiveInfo 
                      ? university.contact?.email || 'Not provided'
                      : '•••••••••••@•••••••.com'
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-500 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Admissions Email
                  </label>
                  <p className="text-slate-900 mt-1">
                    {showSensitiveInfo 
                      ? university.contact?.admissionsEmail || 'Not provided'
                      : '•••••••••••@•••••••.com'
                    }
                  </p>
                </div>

                {university.contact?.fax && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Fax</label>
                    <p className="text-slate-900 mt-1">
                      {showSensitiveInfo 
                        ? university.contact.fax
                        : '•••••••••••'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Academic Programs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Academic Programs</h3>
              {!isEditing && formData.programs.length > 0 && (
                <span className="text-sm text-slate-500">{formData.programs.length} programs</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-6">
                {/* Add New Program */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Add New Program</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProgram}
                      onChange={(e) => {
                        setNewProgram(e.target.value);
                        setProgramError(null);
                      }}
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-all duration-200"
                      placeholder="Enter program name (e.g., Computer Science, Business Administration)"
                    />
                    <button
                      type="button"
                      onClick={handleAddProgram}
                      className="bg-[#05294E] text-white px-4 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors flex items-center"
                      aria-label="Add new academic program"
                      title="Add new academic program"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {programError && (
                    <p className="text-red-600 text-sm mt-2">{programError}</p>
                  )}
                </div>

                {/* Programs List */}
                {formData.programs.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Current Programs</label>
                    <div className="space-y-2">
                      {formData.programs.map((program, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl group hover:bg-slate-100 transition-colors"
                        >
                          <span className="text-slate-900 font-medium">{program}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProgram(index)}
                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove program"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.programs.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No programs added yet</p>
                    <p className="text-sm">Add your first academic program above</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {formData.programs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.programs.map((program: string, index: number) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 text-center hover:from-[#05294E]/5 hover:to-blue-50 hover:border-[#05294E]/20 transition-all duration-300"
                  >
                    {program}
                  </div>
                ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No academic programs listed</p>
                    <p className="text-sm">Edit your profile to add programs</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Save/Cancel Buttons */}
          {isEditing && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex space-x-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#05294E] text-white px-6 py-3 rounded-xl hover:bg-[#05294E]/90 transition-colors font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Stats</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-[#05294E] mr-3" />
                  <span className="font-medium text-slate-700">Scholarships Created</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">0</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium text-slate-700">Applicants</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">0</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium text-slate-700">Profile Views</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">0</span>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Account Status</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Profile Created</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Information Complete</span>
                {university.profile_completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Team Approval</span>
                {university.is_approved ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
              </div>
            </div>

            {(!university.profile_completed || !university.is_approved) && (
              <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <p className="text-sm font-medium text-orange-800 mb-2">
                  {!university.profile_completed 
                    ? 'Complete your profile to unlock all features'
                    : 'Your profile is being reviewed by our team'
                  }
                </p>
                {!university.profile_completed && (
                  <Link
                    to="/school/setup-profile"
                    className="text-sm font-bold text-orange-700 hover:text-orange-800 transition-colors"
                  >
                    Complete now →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Help & Support */}
          <div className="bg-gradient-to-br from-[#05294E] to-blue-700 rounded-2xl p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Need Help?</h3>
            <p className="text-blue-100 text-sm mb-4">
              Our team is ready to help you maximize your university's potential on our platform.
            </p>
            <button className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white py-3 px-4 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManagement;